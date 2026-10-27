"""Upscale een afbeelding 4x met OpenCV Super Resolution (dnn_superres).

Vereist: py -m pip install opencv-contrib-python

Gebruik:
    py tools/upscale.py foto.png                   -> foto-x4.png
    py tools/upscale.py foto.png -o groot.png
    py tools/upscale.py foto.png --model fsrcnn    (sneller, iets minder scherp)

De modellen staan in tools/models/, dus er wordt niets gedownload.
Transparantie (PNG met alfakanaal) blijft behouden.
"""
import argparse
import sys
from pathlib import Path

import cv2
import numpy as np

SCALE = 4
# Kopieën van Saafke/EDSR_Tensorflow, fannymonori/TF-ESPCN, Saafke/FSRCNN_Tensorflow, fannymonori/TF-LapSRN
MODELS = {
    "edsr": "EDSR_x4.pb",
    "espcn": "ESPCN_x4.pb",
    "fsrcnn": "FSRCNN_x4.pb",
    "lapsrn": "LapSRN_x4.pb",
}
MODEL_DIR = Path(__file__).parent / "models"


def model_path(name):
    path = MODEL_DIR / MODELS[name]
    if not path.is_file():
        sys.exit(f"Model ontbreekt: {path}")
    return path


def upscale(img, model="edsr"):
    """Vergroot een OpenCV-afbeelding (BGR of BGRA) 4x; alfa wordt apart bicubisch vergroot."""
    if img.ndim == 2:
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    sr = cv2.dnn_superres.DnnSuperResImpl_create()
    sr.readModel(str(model_path(model)))
    sr.setModel(model, SCALE)

    # Het model werkt alleen op 3 kanalen; het alfakanaal wordt apart (bicubisch) vergroot
    result = sr.upsample(img[:, :, :3])
    if img.shape[2] == 4:
        alpha = cv2.resize(img[:, :, 3], (result.shape[1], result.shape[0]), interpolation=cv2.INTER_CUBIC)
        result = np.dstack([result, alpha])
    return result


def main():
    parser = argparse.ArgumentParser(description="Upscale een afbeelding 4x met OpenCV Super Resolution.")
    parser.add_argument("input", type=Path, help="afbeelding om te upscalen")
    parser.add_argument("-o", "--output", type=Path, help="uitvoerbestand (standaard <naam>-x4.png)")
    parser.add_argument("--model", choices=MODELS, default="edsr", help="edsr = beste kwaliteit maar traag (standaard)")
    args = parser.parse_args()

    if not args.input.is_file():
        sys.exit(f"Niet gevonden: {args.input}")

    # imdecode/imencode i.p.v. imread/imwrite, zodat paden met speciale tekens werken op Windows
    img = cv2.imdecode(np.fromfile(args.input, np.uint8), cv2.IMREAD_UNCHANGED)
    if img is None:
        sys.exit(f"Kan afbeelding niet lezen: {args.input}")

    result = upscale(img, args.model)

    dst = args.output or args.input.with_name(f"{args.input.stem}-x4.png")
    ok, buf = cv2.imencode(dst.suffix or ".png", result)
    if not ok:
        sys.exit(f"Kan niet opslaan als {dst.suffix}")
    buf.tofile(dst)
    print(f"{args.input} ({img.shape[1]}x{img.shape[0]}) -> {dst} ({result.shape[1]}x{result.shape[0]})")


if __name__ == "__main__":
    main()
