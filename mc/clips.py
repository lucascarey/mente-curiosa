"""Clips de video gratis desde Pixabay (https://pixabay.com/api/docs/) o Pexels.

Usa Pixabay si está PIXABAY_API_KEY; si no, Pexels con PEXELS_API_KEY.
"""

import os
import subprocess
from pathlib import Path

import requests

from . import config

RESPALDO = "abstract background"


def _vertical(ancho: int, alto: int) -> bool:
    return alto > ancho


def _buscar_pixabay(consulta: str, usados: set[str], clave: str) -> tuple[str, str] | None:
    r = requests.get(
        "https://pixabay.com/api/videos/",
        params={"key": clave, "q": consulta, "per_page": 30, "safesearch": "true"},
        timeout=30,
    )
    r.raise_for_status()
    candidatos = []
    for video in r.json().get("hits", []):
        vid = f"pixabay-{video['id']}"
        if vid in usados or video.get("duration", 0) < 3:
            continue
        versiones = [v for v in video.get("videos", {}).values() if v.get("url") and v.get("width")]
        # La más chica que siga siendo nítida en 1080x1920
        nitidas = [v for v in versiones if max(v["width"], v["height"]) >= 1280]
        if not nitidas:
            continue
        elegida = min(nitidas, key=lambda v: v["width"] * v["height"])
        candidatos.append((not _vertical(elegida["width"], elegida["height"]), vid, elegida["url"]))
    if not candidatos:
        return None
    # Primero los verticales, después los horizontales (se recortan al centro)
    candidatos.sort(key=lambda c: c[0])
    _, vid, url = candidatos[0]
    return vid, url


def _buscar_pexels(consulta: str, usados: set[str], clave: str) -> tuple[str, str] | None:
    r = requests.get(
        "https://api.pexels.com/videos/search",
        headers={"Authorization": clave},
        params={"query": consulta, "orientation": "portrait", "per_page": 15},
        timeout=30,
    )
    r.raise_for_status()
    for video in r.json().get("videos", []):
        vid = f"pexels-{video['id']}"
        if vid in usados or video.get("duration", 0) < 3:
            continue
        verticales = [f for f in video.get("video_files", [])
                      if f.get("width") and f.get("height") and _vertical(f["width"], f["height"]) and f["height"] >= 1280]
        if verticales:
            return vid, min(verticales, key=lambda f: abs(f["height"] - config.ALTO))["link"]
    return None


def buscar(consulta: str, usados: set[str]) -> tuple[str, str] | None:
    if clave := os.environ.get("PIXABAY_API_KEY"):
        return _buscar_pixabay(consulta, usados, clave)
    if clave := os.environ.get("PEXELS_API_KEY"):
        return _buscar_pexels(consulta, usados, clave)
    raise RuntimeError("Falta PIXABAY_API_KEY (o PEXELS_API_KEY)")


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
    usados: set[str] = set()
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
