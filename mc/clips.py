"""Clips de video gratis desde Pexels (https://www.pexels.com/api/)."""

import os
import subprocess
from pathlib import Path

import requests

from . import config

API = "https://api.pexels.com/videos/search"
RESPALDO = "abstract background"


def _elegir_archivo(video: dict) -> dict | None:
    verticales = [f for f in video.get("video_files", [])
                  if f.get("width") and f.get("height") and f["height"] > f["width"] and f["height"] >= 1280]
    if not verticales:
        return None
    # El más cercano a 1920 de alto, para no bajar archivos 4K enormes
    return min(verticales, key=lambda f: abs(f["height"] - config.ALTO))


def buscar(consulta: str, usados: set[int]) -> tuple[int, str] | None:
    clave = os.environ.get("PEXELS_API_KEY")
    if not clave:
        raise RuntimeError("Falta PEXELS_API_KEY")
    r = requests.get(
        API,
        headers={"Authorization": clave},
        params={"query": consulta, "orientation": "portrait", "per_page": 15},
        timeout=30,
    )
    r.raise_for_status()
    for video in r.json().get("videos", []):
        if video["id"] in usados or video.get("duration", 0) < 3:
            continue
        archivo = _elegir_archivo(video)
        if archivo:
            return video["id"], archivo["link"]
    return None


def descargar(url: str, destino: Path) -> Path:
    with requests.get(url, stream=True, timeout=120) as r:
        r.raise_for_status()
        with destino.open("wb") as f:
            for trozo in r.iter_content(1 << 20):
                f.write(trozo)
    return destino


def _mock(i: int, destino: Path) -> Path:
    colores = ["0x1f3b4d", "0x3d1f4d", "0x1f4d2b", "0x4d3a1f", "0x4d1f1f"]
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-f", "lavfi",
         "-i", f"color=c={colores[i % len(colores)]}:s=720x1280:d=4,format=yuv420p",
         "-c:v", "libx264", str(destino)],
        check=True,
    )
    return destino


def conseguir(consultas: list[str], carpeta: Path) -> list[Path]:
    """Un clip distinto por cada parte del guion."""
    carpeta.mkdir(parents=True, exist_ok=True)
    usados: set[int] = set()
    rutas = []
    for i, consulta in enumerate(consultas):
        destino = carpeta / f"clip{i}.mp4"
        if config.MOCK:
            rutas.append(_mock(i, destino))
            continue
        encontrado = buscar(consulta, usados) or buscar(RESPALDO, usados)
        if not encontrado:
            raise RuntimeError(f"No encontré clips para '{consulta}'")
        video_id, url = encontrado
        usados.add(video_id)
        rutas.append(descargar(url, destino))
    return rutas
