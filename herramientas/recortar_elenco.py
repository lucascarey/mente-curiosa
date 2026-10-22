"""Recorta cada pose de las planillas del elenco (fondo claro) en PNG con transparencia.

Uso: python herramientas/recortar_elenco.py carpeta_planillas assets/elenco
Busca los dibujos como manchas grandes sobre el fondo, de arriba hacia abajo y de izquierda a derecha,
y les quita el fondo con un relleno desde el borde (así no se borra la ropa blanca de adentro).
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

CARPETAS = {"neuron": "profesor", "nyx": "punk", "glip": "alien", "bruno": "gallo"}
ALTO = 720  # alto máximo de cada pose, alcanza para el video vertical
UMBRAL = 38  # diferencia con el color del fondo para considerar que hay dibujo


def recortar(planilla: Path, destino: Path) -> int:
    im = np.asarray(Image.open(planilla).convert("RGB")).astype(np.int16)
    fondo = np.median(np.concatenate([im[:8].reshape(-1, 3), im[-8:].reshape(-1, 3)]), axis=0)
    dibujo = np.abs(im - fondo).max(axis=2) > UMBRAL
    grueso = ndimage.binary_closing(dibujo, iterations=6)
    etiquetas, n = ndimage.label(grueso)
    cajas = ndimage.find_objects(etiquetas)
    areas = ndimage.sum(grueso, etiquetas, range(1, n + 1))
    grandes = [i for i in range(n) if areas[i] > 0.15 * areas.max()]
    # orden de lectura: filas por el centro vertical, después izquierda a derecha
    centros = {i: ((cajas[i][0].start + cajas[i][0].stop) / 2, cajas[i][1].start) for i in grandes}
    alto_fila = np.median([cajas[i][0].stop - cajas[i][0].start for i in grandes])
    grandes.sort(key=lambda i: (round(centros[i][0] / alto_fila), centros[i][1]))
    destino.mkdir(parents=True, exist_ok=True)
    for k, i in enumerate(grandes, 1):
        ys, xs = cajas[i]
        y0, y1 = max(0, ys.start - 12), min(im.shape[0], ys.stop + 12)
        x0, x1 = max(0, xs.start - 12), min(im.shape[1], xs.stop + 12)
        propio = ndimage.binary_fill_holes(etiquetas[y0:y1, x0:x1] == i + 1)
        # el fondo es lo claro conectado al borde de la caja; lo demás de la mancha es dibujo
        claro = ~dibujo[y0:y1, x0:x1]
        semillas = np.zeros_like(claro)
        semillas[0, :] = semillas[-1, :] = semillas[:, 0] = semillas[:, -1] = True
        afuera = ndimage.binary_propagation(semillas & claro, mask=claro)
        alfa = (~afuera & ndimage.binary_dilation(propio, iterations=3)).astype(np.float32)
        alfa = ndimage.gaussian_filter(alfa, 0.8)
        rgba = np.dstack([im[y0:y1, x0:x1].astype(np.uint8), (alfa * 255).astype(np.uint8)])
        pose = Image.fromarray(rgba, "RGBA")
        pose.thumbnail((ALTO, ALTO))
        pose.save(destino / f"{k:02d}.png", optimize=True)
    return len(grandes)


def main(origen: Path, destino: Path) -> None:
    for personaje, carpeta in CARPETAS.items():
        print(personaje, recortar(origen / carpeta / "planilla.png", destino / personaje), "poses")


main(Path(sys.argv[1]), Path(sys.argv[2]))
