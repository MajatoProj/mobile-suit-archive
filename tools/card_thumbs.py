"""Maak kleine kaart-plaatjes (<naam>-card.webp) en itempagina-plaatjes
(<naam>-item.webp) naast elk archiefplaatje.

Gebruik:
    py tools/card_thumbs.py

De kaarten in de lijst tonen een plaatje van ~140 px breed en de itempagina
een van ~430 px; het volle PNG (1254x1254, ~1 MB) blijft het origineel. Dit script
maakt voor elk 'image' en 'project_image' in de index.json-bestanden een WebP van
320 px (duo-plaatjes 640 px) en voor elk 'image' een WebP van 900 px voor de
itempagina, en slaat bestaande, actuele plaatjes over.
new-image.py roept make_thumb() zelf aan; menu-optie 6 draait dit script voor het pushen.
"""
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
VAULTS = ["gundam", "digimon", "mecha", "fantasy"]
SIZES = {"image": 320, "project_image": 640}
ITEM_SIZE = 900


def thumb_path(image_path, kind="card"):
    return image_path.with_name(f"{image_path.stem}-{kind}.webp")


def make_thumb(image_path, size=320, kind="card"):
    """Schrijf de WebP als hij ontbreekt of ouder is dan het plaatje. Geeft True als hij is gemaakt."""
    image_path = Path(image_path)
    out = thumb_path(image_path, kind)
    if out.is_file() and out.stat().st_mtime >= image_path.stat().st_mtime:
        return False
    img = Image.open(image_path).convert("RGBA")
    img.thumbnail((size, size), Image.LANCZOS)
    img.save(out, "WEBP", quality=82 if kind == "card" else 86, method=6)
    return True


def make_item_image(image_path):
    return make_thumb(image_path, ITEM_SIZE, "item")


def main():
    made = 0
    for vault in VAULTS:
        index = ROOT / "data" / vault / "index.json"
        if not index.is_file():
            continue
        for item in json.loads(index.read_text(encoding="utf-8")).get("items", []):
            for key, size in SIZES.items():
                rel = item.get(key)
                path = ROOT / rel if rel else None
                if path and path.is_file() and path.suffix.lower() == ".png":
                    if make_thumb(path, size):
                        made += 1
                        print(f"gemaakt: {thumb_path(path).relative_to(ROOT)}")
                    if key == "image" and make_item_image(path):
                        made += 1
                        print(f"gemaakt: {thumb_path(path, 'item').relative_to(ROOT)}")
    print(f"{made} WebP-plaatjes gemaakt")


if __name__ == "__main__":
    main()
