"""Fotos gratis desde Pixabay (https://pixabay.com/api/docs/) o Pexels.

Es el respaldo de las ilustraciones cuando no hay credenciales de Cloudflare.
Usa Pixabay si está PIXABAY_API_KEY; si no, Pexels.
"""

import os
from pathlib import Path

import requests

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


def descargar(url: str, destino: Path) -> Path:
    r = requests.get(url, timeout=60)
    r.raise_for_status()
    destino.write_bytes(r.content)
    return destino
