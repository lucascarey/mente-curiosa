"""Fotos gratis desde Pixabay (https://pixabay.com/api/docs/) o Pexels.

Por cada escena deja dos archivos: la foto nítida (cuadrada) y el fondo
desenfocado (vertical). Usa Pixabay si está PIXABAY_API_KEY; si no, Pexels.
"""

import os
import subprocess
from pathlib import Path

import requests

from . import config

RESPALDO = "abstract texture"


def _buscar_pixabay(consulta: str, usados: set[str], clave: str) -> str | None:
    for orientacion in ("vertical", "all"):
        r = requests.get(
            "https://pixabay.com/api/",
            params={"key": clave, "q": consulta, "image_type": "photo", "orientation": orientacion,
                    "per_page": 30, "safesearch": "true", "order": "popular"},
            timeout=30,
        )
        r.raise_for_status()
        for foto in r.json().get("hits", []):
            url = foto.get("largeImageURL")
            if url and url not in usados and min(foto.get("imageWidth", 0), foto.get("imageHeight", 0)) >= 900:
                return url
    return None


def _buscar_pexels(consulta: str, usados: set[str], clave: str) -> str | None:
    r = requests.get(
        "https://api.pexels.com/v1/search",
        headers={"Authorization": clave},
        params={"query": consulta, "per_page": 15},
        timeout=30,
    )
    r.raise_for_status()
    for foto in r.json().get("photos", []):
        url = foto["src"]["large2x"]
        if url not in usados:
            return url
    return None


def buscar(consulta: str, usados: set[str]) -> str | None:
    if clave := os.environ.get("PIXABAY_API_KEY"):
        return _buscar_pixabay(consulta, usados, clave)
    if clave := os.environ.get("PEXELS_API_KEY"):
        return _buscar_pexels(consulta, usados, clave)
    raise RuntimeError("Falta PIXABAY_API_KEY (o PEXELS_API_KEY)")


def _descargar(url: str, destino: Path) -> Path:
    r = requests.get(url, timeout=60)
    r.raise_for_status()
    destino.write_bytes(r.content)
    return destino


def _mock(i: int, destino: Path) -> Path:
    colores = ["0x2e6b8a", "0x8a2e6b", "0x2e8a4f", "0x8a6b2e", "0x6b2e8a"]
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-f", "lavfi",
         "-i", f"gradients=s=1200x1200:c0={colores[i % 5]}:c1=0x101010:x0=0:y0=0:x1=1200:y1=1200:d=1",
         "-frames:v", "1", str(destino)],
        check=True,
    )
    return destino


def _preparar(original: Path, foto: Path, fondo: Path) -> None:
    ffmpeg = ["ffmpeg", "-y", "-v", "error", "-i", str(original)]
    subprocess.run(ffmpeg + ["-vf", "scale=900:900:force_original_aspect_ratio=increase,crop=900:900",
                             "-q:v", "3", str(foto)], check=True)
    subprocess.run(ffmpeg + ["-vf", "scale=1200:2040:force_original_aspect_ratio=increase,crop=1200:2040,"
                                    "gblur=sigma=28,eq=brightness=-0.08:saturation=1.25",
                             "-q:v", "4", str(fondo)], check=True)


def conseguir(consultas: list[str], carpeta: Path) -> list[tuple[str, str]]:
    """Devuelve, por escena, los nombres de archivo (foto, fondo) dentro de `carpeta`."""
    carpeta.mkdir(parents=True, exist_ok=True)
    usados: set[str] = set()
    resultado = []
    for i, consulta in enumerate(consultas):
        original = carpeta / f"original{i}.jpg"
        if config.MOCK:
            _mock(i, original)
        else:
            url = buscar(consulta, usados) or buscar(RESPALDO, usados)
            if not url:
                raise RuntimeError(f"No encontré fotos para '{consulta}'")
            usados.add(url)
            _descargar(url, original)
        foto, fondo = f"foto{i}.jpg", f"fondo{i}.jpg"
        _preparar(original, carpeta / foto, carpeta / fondo)
        resultado.append((foto, fondo))
    return resultado
