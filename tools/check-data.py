"""Controleer alle archiefdata voordat je pusht.

Gebruik:
    py tools/check-data.py

Fouten (exit-code 1): ontbrekende JSON of plaatjes, ongeldige JSON, dubbele ID's,
ID's die niet kloppen met de bestandsnaam, en velden die in index.json anders zijn
dan in het losse record (de itempagina toont het losse record, de lijst de index).
Waarschuwingen: records zonder plaatje, ongebruikte JSON of plaatjes, en
verwijzingen naar onbekende ID's.
"""
import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VAULTS = ["gundam", "digimon", "mecha", "fantasy"]
IMAGE_KEYS = ["image", "project_image"]
IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp"}
# Same keys as the entry builders and the site filter.
SOURCES = {"bandai", "p-bandai", "base", "3rd-party", "custom"}


def load(path, errors):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        errors.append(f"ongeldige JSON {path.relative_to(ROOT)}: {e}")
        return None


def check():
    errors, warnings = [], []
    used = set()

    for vault in VAULTS:
        index_path = ROOT / "data" / vault / "index.json"
        index = load(index_path, errors)
        if index is None:
            continue
        items = index.get("items", [])
        ids = Counter(item.get("id") for item in items)
        errors += [f"{vault}: dubbele id {i} ({n}x)" for i, n in ids.items() if n > 1]

        for item in items:
            iid = item.get("id") or "?"
            where = f"{vault}/{iid}"
            for key in ["id", "name", "file"]:
                if not item.get(key):
                    errors.append(f"{where}: '{key}' ontbreekt in index.json")

            if item.get("source") and item["source"] not in SOURCES:
                warnings.append(f"{where}: onbekende source '{item['source']}' (kies uit {', '.join(sorted(SOURCES))})")

            for key in IMAGE_KEYS:
                rel = item.get(key)
                if not rel:
                    if key == "image":
                        warnings.append(f"{where}: geen plaatje")
                    continue
                path = ROOT / rel
                used.add(path.resolve())
                if not path.is_file():
                    errors.append(f"{where}: {key} bestaat niet: {rel}")
                elif key == "image" and path.stem != iid:
                    errors.append(f"{where}: plaatje heet {path.name}, verwacht {iid}{path.suffix}")

            for rel in (item.get("relationships") or []) + (item.get("design_origins") or []):
                if rel.get("id") and rel["id"] not in ids:
                    warnings.append(f"{where}: verwijst naar onbekende id {rel['id']}")

            if not item.get("file"):
                continue
            path = ROOT / "data" / vault / item["file"]
            used.add(path.resolve())
            if not path.is_file():
                errors.append(f"{where}: record bestaat niet: {item['file']}")
                continue
            if path.stem != iid:
                errors.append(f"{where}: record heet {path.name}, verwacht {iid}.json")
            record = load(path, errors)
            if record is None:
                continue
            for key in sorted(set(item) & set(record) - {"file"}):
                if item[key] != record[key]:
                    errors.append(f"{where}: '{key}' verschilt: index={item[key]!r:.60} record={record[key]!r:.60}")

    for path in (ROOT / "data").rglob("*.json"):
        if path.name != "index.json" and path.name != "gundam-template.json" and path.resolve() not in used:
            warnings.append(f"ongebruikt record: {path.relative_to(ROOT)}")
    for path in (ROOT / "assets" / "images").rglob("*"):
        if path.suffix.lower() in IMAGE_EXTS and path.resolve() not in used:
            warnings.append(f"ongebruikt plaatje: {path.relative_to(ROOT)}")
    return errors, warnings


def main():
    errors, warnings = check()
    for w in warnings:
        print(f"waarschuwing  {w}")
    for e in errors:
        print(f"FOUT          {e}")
    print(f"\n{len(errors)} fouten, {len(warnings)} waarschuwingen")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
