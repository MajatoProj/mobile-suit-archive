"""Verwijder de achtergrond van een of meer afbeeldingen.

Gebruik:
    py tools/remove_bg.py foto.jpg                 -> foto-nobg.png
    py tools/remove_bg.py foto.jpg -o uitvoer.png
    py tools/remove_bg.py a.jpg b.jpg c.webp       -> a-nobg.png, b-nobg.png, ...
"""
import argparse
import sys
from pathlib import Path

from PIL import Image
from rembg import new_session, remove


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
        remove(Image.open(src), session=session).save(dst)
        print(f"{src} -> {dst}")


if __name__ == "__main__":
    main()
