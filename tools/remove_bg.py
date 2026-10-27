"""Verwijder de achtergrond van een of meer afbeeldingen.

Gebruik:
    py tools/remove_bg.py foto.jpg                 -> foto-nobg.png
    py tools/remove_bg.py foto.jpg -o uitvoer.png
    py tools/remove_bg.py a.jpg b.jpg c.webp       -> a-nobg.png, b-nobg.png, ...

Het model wordt bijgesneden en gecentreerd op een vierkant canvas met 8% ruimte rondom.
"""
import argparse
import sys
from pathlib import Path

from PIL import Image
from rembg import new_session, remove

PADDING = 0.08


def pad(img):
    """Snijd bij tot het zichtbare model en centreer het op een vierkant met ruimte rondom."""
    box = img.getchannel("A").point(lambda a: 255 if a > 16 else 0).getbbox()
    if not box:
        return img
    model = img.crop(box)
    side = round(max(model.size) * (1 + 2 * PADDING))
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(model, ((side - model.width) // 2, (side - model.height) // 2))
    return canvas


def main():
    parser = argparse.ArgumentParser(description="Verwijder de achtergrond van afbeeldingen.")
    parser.add_argument("inputs", nargs="+", type=Path, help="afbeelding(en) om te bewerken")
    parser.add_argument("-o", "--output", type=Path, help="uitvoerbestand (alleen bij één invoer)")
    args = parser.parse_args()

    if args.output and len(args.inputs) > 1:
        parser.error("-o kan alleen met één invoerbestand")

    session = new_session()  # model wordt bij eerste gebruik eenmalig gedownload
    for src in args.inputs:
        if not src.is_file():
            print(f"Overgeslagen, niet gevonden: {src}", file=sys.stderr)
            continue
        dst = args.output or src.with_name(f"{src.stem}-nobg.png")
        pad(remove(Image.open(src), session=session).convert("RGBA")).save(dst)
        print(f"{src} -> {dst}")


if __name__ == "__main__":
    main()
