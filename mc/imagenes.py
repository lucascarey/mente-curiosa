"""Fotos reales de la web: Wikimedia Commons, Pixabay (https://pixabay.com/api/docs/) o Pexels.

`foto()` busca la foto de una toma: primero en Wikimedia Commons, que tiene fotos exactas
de lugares, animales y objetos puntuales, y después en Pixabay. `buscar()` es el respaldo
de las ilustraciones cuando Cloudflare no responde.
"""

import html
import os
import re
from pathlib import Path

import requests

RESPALDO = "abstract texture"


AGENTE = "mente-curiosa/1.0 (https://github.com/lucascarey/mente-curiosa)"


def _buscar_pixabay(consulta: str, usados: set[str], clave: str, orientaciones=("vertical", "all")) -> str | None:
    for orientacion in orientaciones:
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


def _sin_html(texto: str) -> str:
    return " ".join(html.unescape(re.sub(r"<[^>]+>", " ", texto)).split())


def _buscar_wikimedia(consulta: str, usados: set[str]) -> tuple[str, str] | None:
    """(url, crédito) de la mejor foto de Wikimedia Commons para la consulta, apaisada y grande."""
    r = requests.get(
        "https://commons.wikimedia.org/w/api.php",
        params={"action": "query", "format": "json", "generator": "search", "gsrnamespace": 6,
                "gsrsearch": f"{consulta} filetype:bitmap", "gsrlimit": 12,
                "prop": "imageinfo", "iiprop": "url|mime|size|extmetadata", "iiurlwidth": 1280},
        headers={"User-Agent": AGENTE},
        timeout=30,
    )
    r.raise_for_status()
    paginas = sorted(r.json().get("query", {}).get("pages", {}).values(), key=lambda p: p.get("index", 99))
    for pagina in paginas:
        info = (pagina.get("imageinfo") or [{}])[0]
        url = info.get("thumburl") or info.get("url")
        ancho, alto = info.get("width", 0), info.get("height", 0)
        if info.get("mime") not in ("image/jpeg", "image/png") or not url or url in usados:
            continue
        if ancho < 900 or not 0.8 <= ancho / max(1, alto) <= 2.2:
            continue
        meta = info.get("extmetadata", {})
        autor = _sin_html(meta.get("Artist", {}).get("value", ""))[:60] or "autor desconocido"
        licencia = _sin_html(meta.get("LicenseShortName", {}).get("value", ""))
        return url, f"{autor} ({licencia}, Wikimedia Commons)"
    return None


def foto(consulta: str, usados: set[str]) -> tuple[str, str] | None:
    """(url, crédito) de una foto real para la consulta, o None si no aparece ninguna."""
    try:
        if encontrada := _buscar_wikimedia(consulta, usados):
            return encontrada
    except requests.RequestException as e:
        print(f"::warning::Wikimedia Commons falló: {e}")
    if clave := os.environ.get("PIXABAY_API_KEY"):
        if url := _buscar_pixabay(consulta, usados, clave, ("horizontal", "all")):
            return url, "Pixabay"
    return None


def descargar(url: str, destino: Path) -> Path:
    r = requests.get(url, timeout=60, headers={"User-Agent": AGENTE})
    r.raise_for_status()
    destino.write_bytes(r.content)
    return destino
