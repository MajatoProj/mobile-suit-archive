#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
from pathlib import Path

KNOWN_GUNDAM_SERIES = {
    "Mobile Suit Gundam 00 Second Season": "00-second-season",
    "Mobile Suit Gundam 00 the Movie: A Wakening of the Trailblazer": "trailblazer",
    "Mobile Suit Gundam SEED": "seed",
    "Mobile Suit Gundam SEED Destiny": "seed-destiny",
    "Mobile Suit Gundam SEED Freedom": "seed-freedom",
    "Mobile Suit Gundam SEED Astray": "seed-astray",
    "Mobile Suit Gundam IRON-BLOODED ORPHANS": "ibo",
    "Mobile Suit Gundam IRON-BLOODED ORPHANS Gekko": "gekko",
    "Gundam Build Fighters: GM's Counterattack": "gm-counterattack",
    "Gundam Build Fighters Try": "build-fighters-try",
    "Gundam Build Fighters Honoo Try": "honoo-try",
    "Gundam Build Fighters Try: Island Wars": "build-fighters-try-island-wars",
    "Gundam Reconguista in G": "reconguista-in-g",
    "Mobile Suit Gundam SEED Destiny Astray R": "seed-destiny-astray-r",
    "Mobile Suit Gundam SEED C.E. 73: Stargazer": "stargazer",
    "Mobile Suit Gundam Unicorn": "gundam-unicorn",
    "Gundam Build Fighters": "build-fighters",
    "Gundam Build Divers": "build-divers",
    "Mobile Suit Gundam: The Witch from Mercury": "witch-from-mercury",
}

KNOWN_GUNDAM_CONTINUITIES = {
    "Anno Domini": "anno-domini",
    "Cosmic Era": "cosmic-era",
    "Post Disaster": "post-disaster",
    "Build Series": "build-series",
    "Regild Century": "regild-century",
    "Universal Century": "universal-century",
    "Ad Stella": "ad-stella",
}

CATEGORIES = ("gundam", "digimon", "mecha", "fantasy")
IMAGE_EXTS = (".png", ".jpg", ".jpeg", ".webp")

def slugify(value: str) -> str:
    value = (value or "").strip().lower()
    value = value.replace("&", " and ").replace("'", "")
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-") or "unsorted"

def find_repo_root(start: Path) -> Path | None:
    for candidate in [start, *start.parents]:
        if (candidate / "data").is_dir() and (candidate / "assets").is_dir():
            return candidate
    return None

def choose_repo_root(arg: str | None) -> Path:
    if arg:
        root = Path(arg).expanduser().resolve()
        if (root / "data").is_dir():
            return root
        raise SystemExit(f"Geen data-map gevonden in:\n{root}")

    root = find_repo_root(Path(__file__).resolve().parent) or find_repo_root(Path.cwd().resolve())
    if root:
        return root

    typed = input("Pad naar Collection Archive repository: ").strip().strip('"')
    root = Path(typed).expanduser().resolve()
    if not (root / "data").is_dir():
        raise SystemExit(f"Geen data-map gevonden in:\n{root}")
    return root

def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))

def first_nonempty(obj: dict, keys: tuple[str, ...]) -> str:
    for key in keys:
        value = obj.get(key)
        if value is not None and str(value).strip():
            return str(value).strip()
    return ""

def merge_meta(meta: dict, record: dict | None) -> dict:
    merged = dict(meta)
    if record:
        merged.update(record)
    return merged

def target_parts(category: str, item: dict) -> list[str]:
    # Optional explicit override for future edge cases.
    override = str(item.get("archive_folder") or "").strip().strip("/\\")
    if override:
        return [slugify(part) for part in re.split(r"[/\\]+", override) if part.strip()]

    if category == "gundam":
        continuity = first_nonempty(item, ("continuity",))
        series = first_nonempty(item, ("series",))
        return [
            KNOWN_GUNDAM_CONTINUITIES.get(continuity, slugify(continuity)),
            KNOWN_GUNDAM_SERIES.get(series, slugify(series)),
        ]

    if category == "digimon":
        group = first_nonempty(item, ("series", "franchise", "universe", "family", "line"))
        return [slugify(group)]

    if category == "mecha":
        primary = first_nonempty(item, ("franchise", "brand", "manufacturer", "series", "line"))
        series = first_nonempty(item, ("series",))
        parts = [slugify(primary)]
        if series and slugify(series) != parts[0]:
            parts.append(slugify(series))
        return parts

    if category == "fantasy":
        primary = first_nonempty(item, ("franchise", "universe", "collection", "series", "family"))
        series = first_nonempty(item, ("series",))
        parts = [slugify(primary)]
        if series and slugify(series) != parts[0]:
            parts.append(slugify(series))
        return parts

    return ["unsorted"]

def find_record(data_root: Path, item: dict) -> Path | None:
    item_id = str(item.get("id") or "").strip()
    current = str(item.get("file") or "").replace("\\", "/").strip("/")
    candidates = []
    if current:
        candidates.append(data_root / current)
    candidates.append(data_root / f"{item_id}.json")

    for p in candidates:
        if p.is_file():
            return p

    # Fallback: find exact ID-named JSON anywhere below category folder.
    found = list(data_root.rglob(f"{item_id}.json"))
    return found[0] if found else None

def find_image(image_root: Path, item: dict) -> Path | None:
    item_id = str(item.get("id") or "").strip()
    current = str(item.get("image") or "").replace("\\", "/")
    marker = "assets/images/"
    candidates = []

    if current.startswith(marker):
        rel = current[len(marker):]
        # rel may include category already.
        parts = Path(rel).parts
        if parts and parts[0] == image_root.name:
            rel = Path(*parts[1:])
        else:
            rel = Path(rel)
        candidates.append(image_root / rel)

    for ext in IMAGE_EXTS:
        candidates.append(image_root / f"{item_id}{ext}")

    for p in candidates:
        if p.is_file():
            return p

    for ext in IMAGE_EXTS:
        found = list(image_root.rglob(f"{item_id}{ext}"))
        if found:
            return found[0]
    return None

def process_category(root: Path, category: str, dry_run: bool) -> dict:
    data_root = root / "data" / category
    image_root = root / "assets" / "images" / category
    index_path = data_root / "index.json"

    result = {
        "category": category,
        "records_moved": 0,
        "images_moved": 0,
        "records_updated": 0,
        "missing_records": [],
        "missing_images": [],
        "skipped": False,
    }

    if not index_path.is_file():
        result["skipped"] = True
        return result

    image_root.mkdir(parents=True, exist_ok=True)
    index = load_json(index_path)
    items = index.get("items", [])

    backup = data_root / "index.before-folder-organize.json"
    if not dry_run and not backup.exists():
        shutil.copy2(index_path, backup)

    for meta in items:
        item_id = str(meta.get("id") or "").strip()
        if not item_id:
            continue

        record_path = find_record(data_root, meta)
        record = None
        if record_path:
            try:
                record = load_json(record_path)
            except Exception:
                record = None

        combined = merge_meta(meta, record)
        parts = target_parts(category, combined)

        target_record = data_root.joinpath(*parts, f"{item_id}.json")
        image_path = find_image(image_root, meta)
        image_ext = image_path.suffix.lower() if image_path else ".png"
        target_image = image_root.joinpath(*parts, f"{item_id}{image_ext}")

        if record_path:
            if record_path.resolve() != target_record.resolve():
                if dry_run:
                    result["records_moved"] += 1
                else:
                    target_record.parent.mkdir(parents=True, exist_ok=True)
                    if not target_record.exists():
                        shutil.move(str(record_path), str(target_record))
                        result["records_moved"] += 1
                    else:
                        # Never overwrite automatically.
                        target_record = record_path
        else:
            result["missing_records"].append(item_id)

        if image_path:
            if image_path.resolve() != target_image.resolve():
                if dry_run:
                    result["images_moved"] += 1
                else:
                    target_image.parent.mkdir(parents=True, exist_ok=True)
                    if not target_image.exists():
                        shutil.move(str(image_path), str(target_image))
                        result["images_moved"] += 1
                        # The card and item-page WebPs travel with their image.
                        for kind in ("card", "item"):
                            thumb = image_path.with_name(f"{image_path.stem}-{kind}.webp")
                            if thumb.is_file():
                                shutil.move(str(thumb), str(target_image.with_name(thumb.name)))
                    else:
                        target_image = image_path
        else:
            result["missing_images"].append(item_id)

        rel_record = target_record.relative_to(data_root).as_posix()
        rel_image = target_image.relative_to(image_root).as_posix()

        meta["file"] = rel_record
        meta["image"] = f"assets/images/{category}/{rel_image}"

        if target_record.exists() and not dry_run:
            try:
                record_obj = load_json(target_record)
                new_image = meta["image"]
                if record_obj.get("image") != new_image:
                    record_obj["image"] = new_image
                    target_record.write_text(
                        json.dumps(record_obj, indent=2, ensure_ascii=False) + "\n",
                        encoding="utf-8",
                    )
                    result["records_updated"] += 1
            except Exception:
                pass

    if not dry_run:
        index_path.write_text(
            json.dumps(index, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )

    return result

def main():
    parser = argparse.ArgumentParser(
        description="Organize all Collection Archive vaults into subfolders."
    )
    parser.add_argument("repo", nargs="?", help="Repository root (optional)")
    parser.add_argument(
        "--category",
        choices=("all", *CATEGORIES),
        default="all",
        help="Only organize one vault",
    )
    parser.add_argument("--dry-run", action="store_true", help="Preview without moving or editing files")
    args = parser.parse_args()

    root = choose_repo_root(args.repo)
    categories = CATEGORIES if args.category == "all" else (args.category,)

    print(f"Repository: {root}")
    if args.dry_run:
        print("MODE: DRY RUN (niets wordt gewijzigd)")
    print()

    for category in categories:
        result = process_category(root, category, args.dry_run)
        if result["skipped"]:
            print(f"[{category.upper()}] overgeslagen — geen data/{category}/index.json")
            continue

        print(f"[{category.upper()}]")
        print(f"  JSONs verplaatst:          {result['records_moved']}")
        print(f"  Images verplaatst:         {result['images_moved']}")
        print(f"  JSON image-paths bijgewerkt:{result['records_updated']}")
        if result["missing_records"]:
            print("  Ontbrekende JSONs: " + ", ".join(result["missing_records"]))
        if result["missing_images"]:
            print("  Ontbrekende images: " + ", ".join(result["missing_images"]))
        print()

    if not args.dry_run:
        print("Klaar. Bestaande doelbestanden worden nooit automatisch overschreven.")
        print("Elke vault houdt zijn eigen index.json in de root.")

if __name__ == "__main__":
    main()
