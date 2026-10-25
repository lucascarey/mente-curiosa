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

try:
    from rembg import new_session, remove
except ImportError:  # sin rembg se recorta por color, con los límites de siempre
    remove = new_session = None

CARPETAS = {"neuron": "profesor", "nyx": "punk", "glip": "alien", "bruno": "dino"}  # Bruno era un gallo; desde 2026-10-22 es un dinosaurio
ALTO = 900  # alto máximo de cada pose, alcanza para el video vertical
UMBRAL = 38  # diferencia con el color del fondo para considerar que hay dibujo
UMBRALES = {"neuron": 18}  # el borde de vidrio de la pecera es casi del color del fondo
# Las medidas en pixeles están pensadas para planillas de ~1300 px de ancho y se escalan con la planilla.
CERCA = 90  # distancia máxima para que un trazo suelto cuente como parte de un personaje


def recortar(planilla: Path, destino: Path, umbral: int = UMBRAL, sesion=None) -> int:
    im = np.asarray(Image.open(planilla).convert("RGB")).astype(np.int16)
    fondo = np.median(np.concatenate([im[:8].reshape(-1, 3), im[-8:].reshape(-1, 3)]), axis=0)
    dibujo = np.abs(im - fondo).max(axis=2) > umbral
    f = max(1, round(im.shape[1] / 1300))
    grueso = ndimage.binary_closing(dibujo, iterations=6 * f)
    etiquetas, n = ndimage.label(grueso)
    cajas = ndimage.find_objects(etiquetas)
    areas = ndimage.sum(grueso, etiquetas, range(1, n + 1))
    grandes = [i for i in range(n) if areas[i] > 0.15 * areas.max()]
    # orden de lectura: filas por el centro vertical, después izquierda a derecha
    centros = {i: ((cajas[i][0].start + cajas[i][0].stop) / 2, cajas[i][1].start) for i in grandes}
    alto_fila = np.median([cajas[i][0].stop - cajas[i][0].start for i in grandes])
    grandes.sort(key=lambda i: (round(centros[i][0] / alto_fila), centros[i][1]))
    # cada pixel de dibujo va con el personaje más cercano: así no se pierden gotitas, signos ni manos sueltas
    solo_grandes = np.zeros_like(etiquetas)
    for k, i in enumerate(grandes, 1):
        solo_grandes[etiquetas == i + 1] = k
    distancia, (iy, ix) = ndimage.distance_transform_edt(solo_grandes == 0, return_indices=True)
    duenio = np.where(distancia < CERCA * f, solo_grandes[iy, ix], 0)
    destino.mkdir(parents=True, exist_ok=True)
    for k in range(1, len(grandes) + 1):
        ys, xs = np.nonzero((duenio == k) & dibujo)
        y0, y1 = max(0, ys.min() - 6 * f), min(im.shape[0], ys.max() + 7 * f)
        x0, x1 = max(0, xs.min() - 6 * f), min(im.shape[1], xs.max() + 7 * f)
        recorte = im[y0:y1, x0:x1]
        mio = duenio[y0:y1, x0:x1] == k
        trazos = mio & dibujo[y0:y1, x0:x1]
        if sesion is not None:
            # La figura la separa una IA de recorte (isnet-anime): distingue el blanco de un ojo del fondo blanco.
            # Lo que es de otro personaje se pinta del color del fondo para que no lo tome.
            limpio = np.where((duenio[y0:y1, x0:x1] != k)[..., None] & (duenio[y0:y1, x0:x1] != 0)[..., None],
                              fondo, recorte).astype(np.uint8)
            alfa = np.asarray(remove(Image.fromarray(limpio), session=sesion, only_mask=True)).astype(np.float32) / 255
            # los trazos sueltos (gotitas, plumas, signos) los agrega el recorte por color si la IA los dejó afuera
            sueltos, n_sueltos = ndimage.label(trazos)
            cuerpo = alfa > 0.5
            for j, caja in enumerate(ndimage.find_objects(sueltos), 1):
                pieza = sueltos[caja] == j
                if not (cuerpo[caja] & pieza).any():
                    zona = alfa[caja]
                    zona[pieza] = np.maximum(zona[pieza], ndimage.gaussian_filter(pieza.astype(np.float32), 0.6 * f)[pieza])
            alfa *= ndimage.binary_dilation(mio, iterations=2 * f)
            # sin sombras tenues ni motitas sueltas de pocos pixeles
            alfa[alfa < 0.12] = 0
            motas, n_motas = ndimage.label(alfa > 0.15)
            if n_motas:
                tam = ndimage.sum(np.ones_like(motas), motas, range(1, n_motas + 1))
                chicas = np.isin(motas, [j + 1 for j in range(n_motas) if tam[j] < 80 * f * f])
                alfa[ndimage.binary_dilation(chicas, iterations=2 * f)] = 0
        else:
            propio = ndimage.binary_closing(trazos, iterations=2 * f)
            propio = ndimage.binary_fill_holes(propio)
            # huecos encerrados (entre brazo y cuerpo, entre manos): si son del color liso del fondo, se vacían.
            diferencia = np.abs(recorte - fondo).max(axis=2)
            huecos, n_huecos = ndimage.label(propio & (diferencia < 14))
            if n_huecos:
                tam = ndimage.sum(np.ones_like(huecos), huecos, range(1, n_huecos + 1))
                media = ndimage.mean(diferencia, huecos, range(1, n_huecos + 1))
                vaciar = [j + 1 for j in range(n_huecos) if tam[j] > 30 * f * f and media[j] < 7]
                propio &= ~np.isin(huecos, vaciar)
            # borde suave sin halo claro: se achica un pixel y se difumina
            alfa = ndimage.binary_erosion(propio, iterations=f).astype(np.float32)
            alfa = ndimage.gaussian_filter(alfa, 0.7 * f)
        rgba = np.dstack([recorte.astype(np.uint8), (alfa * 255).astype(np.uint8)])
        pose = Image.fromarray(rgba, "RGBA")
        pose.thumbnail((ALTO, ALTO))
        pose.save(destino / f"{k:02d}.png", optimize=True)
    return len(grandes)


def main(origen: Path, destino: Path) -> None:
    sesion = new_session("isnet-anime") if remove else None
    print("recorte con IA" if sesion else "recorte por color (falta rembg)", flush=True)
    for personaje, carpeta in CARPETAS.items():
        planilla = origen / f"{carpeta}.png"
        if not planilla.exists():
            planilla = origen / carpeta / "planilla.png"
        print(personaje, recortar(planilla, destino / personaje, UMBRALES.get(personaje, UMBRAL), sesion), "poses")


main(Path(sys.argv[1]), Path(sys.argv[2]))
