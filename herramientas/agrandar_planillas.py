"""Agranda las planillas del elenco x4 con Real-ESRGAN (modelo anime_6B, pensado para dibujos) y las deja x2,
para que las poses no se vean pixeladas al ponerlas grandes en el video.

Uso: python herramientas/agrandar_planillas.py carpeta_planillas modelo.pth carpeta_destino
"""

import sys
from pathlib import Path

import numpy as np
import torch
from PIL import Image
from spandrel import ModelLoader

TROZO, BORDE = 256, 16  # se procesa por partes para no llenar la memoria


def agrandar(modelo, im: Image.Image) -> Image.Image:
    a = np.asarray(im.convert("RGB")).astype(np.float32) / 255
    alto, ancho = a.shape[:2]
    escala = modelo.scale
    salida = np.zeros((alto * escala, ancho * escala, 3), np.float32)
    for y in range(0, alto, TROZO):
        for x in range(0, ancho, TROZO):
            y0, x0 = max(0, y - BORDE), max(0, x - BORDE)
            y1, x1 = min(alto, y + TROZO + BORDE), min(ancho, x + TROZO + BORDE)
            t = torch.from_numpy(a[y0:y1, x0:x1].transpose(2, 0, 1)).unsqueeze(0)
            with torch.no_grad():
                r = modelo(t)[0].clamp(0, 1).numpy().transpose(1, 2, 0)
            dy, dx = (y - y0) * escala, (x - x0) * escala
            h, w = (min(y + TROZO, alto) - y) * escala, (min(x + TROZO, ancho) - x) * escala
            salida[y * escala:y * escala + h, x * escala:x * escala + w] = r[dy:dy + h, dx:dx + w]
    grande = Image.fromarray((salida * 255).round().astype(np.uint8))
    return grande.resize((ancho * 2, alto * 2), Image.LANCZOS)


def main(origen: Path, pesos: Path, destino: Path) -> None:
    modelo = ModelLoader().load_from_file(str(pesos)).eval()
    destino.mkdir(parents=True, exist_ok=True)
    for planilla in sorted(origen.glob("*.png")):
        agrandar(modelo.model, Image.open(planilla)).save(destino / planilla.name)
        print(planilla.name, "ok", flush=True)


main(Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]))
