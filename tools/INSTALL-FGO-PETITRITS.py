#!/usr/bin/env python3
from pathlib import Path
import json, shutil, sys

ENTRIES = [
  {
    "id": "FGO-PETITRITS-MUSASHI",
    "designation": "Petitrits",
    "name": "Saber / Miyamoto Musashi",
    "summary": "Fate/Grand Order Petitrits model kit.",
    "franchise": "Fate/Grand Order",
    "series": "Fate/Grand Order",
    "subseries": "Petitrits",
    "family": "FGO Petitrits",
    "archive_folder": "fate-grand-order/petitrits",
    "source": "bandai",
    "custom": False,
    "grade": "Petitrits",
    "scale": "Non-scale",
    "image": "assets/images/fantasy/fate-grand-order/petitrits/FGO-PETITRITS-MUSASHI.png",
    "file": "fate-grand-order/petitrits/FGO-PETITRITS-MUSASHI.json",
    "release_date": "2020-02-29",
    "build_date": "2018-01-01",
    "build_status": "completed"
  },
  {
    "id": "FGO-PETITRITS-ALTRIA",
    "designation": "Petitrits",
    "name": "Saber / Altria Pendragon",
    "summary": "Fate/Grand Order Petitrits model kit.",
    "franchise": "Fate/Grand Order",
    "series": "Fate/Grand Order",
    "subseries": "Petitrits",
    "family": "FGO Petitrits",
    "archive_folder": "fate-grand-order/petitrits",
    "source": "bandai",
    "custom": False,
    "grade": "Petitrits",
    "scale": "Non-scale",
    "image": "assets/images/fantasy/fate-grand-order/petitrits/FGO-PETITRITS-ALTRIA.png",
    "file": "fate-grand-order/petitrits/FGO-PETITRITS-ALTRIA.json",
    "release_date": "2020-08-08",
    "build_date": "2018-01-01",
    "build_status": "completed"
  }
]

def find_repo(start: Path):
    for p in [start, *start.parents]:
        if (p / "data" / "fantasy" / "index.json").is_file():
            return p
    return None

def main():
    repo = find_repo(Path.cwd().resolve()) or find_repo(Path(__file__).resolve().parent)
    if not repo:
        typed = input("Path to collection-archive folder: ").strip().strip('"')
        repo = Path(typed).expanduser().resolve()

    index_path = repo / "data" / "fantasy" / "index.json"
    if not index_path.is_file():
        raise SystemExit(f"Could not find: {index_path}")

    backup = index_path.with_name("index.before-fgo-petitrits.json")
    if not backup.exists():
        shutil.copy2(index_path, backup)

    data = json.loads(index_path.read_text(encoding="utf-8"))
    items = data.setdefault("items", [])

    by_id = {str(item.get("id")): i for i, item in enumerate(items)}
    added = 0
    replaced = 0

    for entry in ENTRIES:
        idx = by_id.get(entry["id"])
        if idx is None:
            items.append(entry)
            by_id[entry["id"]] = len(items) - 1
            added += 1
        else:
            items[idx] = entry
            replaced += 1

    index_path.write_text(
        json.dumps(data, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8"
    )

    print("FGO Petitrits index update complete.")
    print(f"Added:    {added}")
    print(f"Replaced: {replaced}")
    print(f"Backup:   {backup.relative_to(repo)}")
    print()
    print("The individual JSON files and images are already stored in their final folders.")

if __name__ == "__main__":
    main()
