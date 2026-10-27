"""Maak van een foto een archiefplaatje in één stap.

Gebruik:
    py tools/new-image.py foto.jpg ZGMF-X10A-HGCE
    py tools/new-image.py foto.jpg FGO-PETITRITS-ALTRIA --category fantasy
    py tools/new-image.py foto.png ZGMF-X10A-HGCE --force      (bestaand plaatje vervangen)

Stappen: achtergrond weg (overgeslagen als de foto al transparant is), bijsnijden
met 8% ruimte rondom, upscalen als hij kleiner is dan 1254 px, schalen naar
1254x1254, en opslaan als <ID>.png op de plek die index.json voor die ID noemt.
Staat de ID nog niet in index.json, dan komt hij in assets/images/<categorie>/;
draai daarna tools/organize-archive-folders.py.
"""
import argparse
import json
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageOps

from remove_bg import pad
from upscale import upscale

ROOT = Path(__file__).resolve().parent.parent
SIZE = 1254


def is_transparent(img):
    """Al uitgeknipt als minstens 5% van de pixels doorzichtig is."""
    alpha = np.asarray(img.getchannel("A"))
    return (alpha < 16).mean() >= 0.05


def destination(category, item_id):
    index = json.loads((ROOT / "data" / category / "index.json").read_text(encoding="utf-8"))
    item = next((i for i in index.get("items", []) if i.get("id") == item_id), None)
    if item and item.get("image"):
        return ROOT / item["image"], None
    if item and item.get("file"):
        # record bestaat maar heeft nog geen plaatje: zelfde map als de JSON
        folder = Path(item["file"]).parent
        return ROOT / "assets" / "images" / category / folder / f"{item_id}.png", "zet dit pad als \"image\" in index.json en in het record"
    return ROOT / "assets" / "images" / category / f"{item_id}.png", "ID staat nog niet in index.json: voeg het record toe en draai tools/organize-archive-folders.py"


def main():
    parser = argparse.ArgumentParser(description="Maak een archiefplaatje van een foto.")
    parser.add_argument("input", type=Path, help="foto of plaatje")
    parser.add_argument("id", help="archief-ID, bv. ZGMF-X10A-HGCE")
    parser.add_argument("--category", default="gundam", choices=["gundam", "digimon", "mecha", "fantasy"])
    parser.add_argument("--model", default="edsr", help="upscale-model: edsr, espcn, fsrcnn, lapsrn")
    parser.add_argument("--force", action="store_true", help="bestaand plaatje overschrijven")
    args = parser.parse_args()

    if not args.input.is_file():
        sys.exit(f"Niet gevonden: {args.input}")
    dst, hint = destination(args.category, args.id)
    if dst.suffix.lower() != ".png":
        sys.exit(f"index.json noemt {dst.name}; archiefplaatjes moeten .png zijn")
    if dst.exists() and not args.force:
        sys.exit(f"Bestaat al: {dst.relative_to(ROOT)}  (gebruik --force om te vervangen)")

    img = ImageOps.exif_transpose(Image.open(args.input)).convert("RGBA")
    if is_transparent(img):
        print("Achtergrond is al transparant, overgeslagen")
    else:
        from rembg import remove  # pas laden als het nodig is; eerste keer downloadt het model
        print("Achtergrond weghalen...")
        img = remove(img).convert("RGBA")

    img = pad(img)
    if img.width < SIZE:
        print(f"Upscalen ({img.width} px, {args.model})...")
        bgra = cv2.cvtColor(np.asarray(img), cv2.COLOR_RGBA2BGRA)
        img = Image.fromarray(cv2.cvtColor(upscale(bgra, args.model), cv2.COLOR_BGRA2RGBA))
    img = img.resize((SIZE, SIZE), Image.LANCZOS)

    dst.parent.mkdir(parents=True, exist_ok=True)
    img.save(dst, optimize=True)
    print(f"Opgeslagen: {dst.relative_to(ROOT)}  ({SIZE}x{SIZE})")
    if hint:
        print(hint)


if __name__ == "__main__":
    main()
