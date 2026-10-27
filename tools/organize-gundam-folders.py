#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import shutil
import sys
from pathlib import Path

KNOWN_SERIES = {
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
    "Gundam Reconguista in G": "reconguista-in-g",
}

KNOWN_CONTINUITIES = {
    "Anno Domini": "anno-domini",
    "Cosmic Era": "cosmic-era",
    "Post Disaster": "post-disaster",
    "Build Series": "build-series",
    "Regild Century": "regild-century",
}

def slugify(value: str) -> str:
    value = (value or "").strip().lower()
    value = value.replace("&", " and ")
    value = value.replace("'", "")
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-") or "unsorted"

def find_repo_root(start: Path) -> Path | None:
    for candidate in [start, *start.parents]:
        if (candidate / "data" / "gundam" / "index.json").is_file():
            return candidate
    return None

def choose_repo_root() -> Path:
    if len(sys.argv) > 1:
        root = Path(sys.argv[1]).expanduser().resolve()
        if (root / "data" / "gundam" / "index.json").is_file():
            return root
        raise SystemExit(f"Geen data/gundam/index.json gevonden in:\n{root}")

    script_dir = Path(__file__).resolve().parent
    root = find_repo_root(script_dir) or find_repo_root(Path.cwd().resolve())
    if root:
        return root

    print("Ik kon de repository-map niet automatisch vinden.")
    typed = input("Plak hier het pad naar je Collection Archive map: ").strip().strip('"')
    root = Path(typed).expanduser().resolve()
    if not (root / "data" / "gundam" / "index.json").is_file():
        raise SystemExit(f"Geen data/gundam/index.json gevonden in:\n{root}")
    return root

def main() -> None:
    root = choose_repo_root()
    data_root = root / "data" / "gundam"
    image_root = root / "assets" / "images" / "gundam"
    index_path = data_root / "index.json"

    index = json.loads(index_path.read_text(encoding="utf-8"))
    items = index.get("items", [])

    backup = data_root / "index.before-folder-organize.json"
    if not backup.exists():
        shutil.copy2(index_path, backup)

    moved_records = 0
    moved_images = 0
    updated_records = 0
    missing_records = []
    missing_images = []

    for item in items:
        item_id = str(item.get("id") or "").strip()
        if not item_id:
            continue

        continuity = str(item.get("continuity") or "")
        series = str(item.get("series") or "")
        continuity_dir = KNOWN_CONTINUITIES.get(continuity, slugify(continuity))
        series_dir = KNOWN_SERIES.get(series, slugify(series))

        rel_record = Path(continuity_dir) / series_dir / f"{item_id}.json"
        rel_image = Path(continuity_dir) / series_dir / f"{item_id}.png"
        target_record = data_root / rel_record
        flat_record = data_root / f"{item_id}.json"
        target_image = image_root / rel_image
        flat_image = image_root / f"{item_id}.png"

        target_record.parent.mkdir(parents=True, exist_ok=True)
        target_image.parent.mkdir(parents=True, exist_ok=True)

        if flat_record.exists() and flat_record.resolve() != target_record.resolve() and not target_record.exists():
            shutil.move(str(flat_record), str(target_record))
            moved_records += 1

        if not target_record.exists():
            old_file = str(item.get("file") or "").replace("\\", "/").strip("/")
            if old_file:
                old_record = data_root / Path(old_file)
                if old_record.exists() and old_record.resolve() != target_record.resolve():
                    shutil.move(str(old_record), str(target_record))
                    moved_records += 1

        if flat_image.exists() and flat_image.resolve() != target_image.resolve() and not target_image.exists():
            shutil.move(str(flat_image), str(target_image))
            moved_images += 1

        if not target_image.exists():
            old_image_value = str(item.get("image") or "").replace("\\", "/")
            prefix = "assets/images/gundam/"
            if old_image_value.startswith(prefix):
                old_rel = old_image_value[len(prefix):]
                old_image = image_root / Path(old_rel)
                if old_image.exists() and old_image.resolve() != target_image.resolve():
                    shutil.move(str(old_image), str(target_image))
                    moved_images += 1

        item["file"] = rel_record.as_posix()
        item["image"] = "assets/images/gundam/" + rel_image.as_posix()

        if target_record.exists():
            record = json.loads(target_record.read_text(encoding="utf-8"))
            new_image = item["image"]
            if record.get("image") != new_image:
                record["image"] = new_image
                target_record.write_text(json.dumps(record, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
                updated_records += 1
        else:
            missing_records.append(item_id)

        if not target_image.exists():
            missing_images.append(item_id)

    index_path.write_text(json.dumps(index, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print("\nGundam folder organization klaar.")
    print(f"Repository: {root}")
    print(f"JSONs verplaatst: {moved_records}")
    print(f"Images verplaatst: {moved_images}")
    print(f"JSON image-paths bijgewerkt: {updated_records}")
    print(f"Backup: {backup.relative_to(root)}")

    if missing_records:
        print("\nNiet gevonden JSONs (niets verwijderd):")
        for item_id in missing_records:
            print(f"  - {item_id}")
    if missing_images:
        print("\nNiet gevonden afbeeldingen (niets verwijderd):")
        for item_id in missing_images:
            print(f"  - {item_id}")

    print("\nKlaar. Geen conflicterende bestanden zijn automatisch verwijderd.")

if __name__ == "__main__":
    main()
