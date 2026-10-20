"""Fotos reales de la web: Wikimedia Commons, Pixabay (https://pixabay.com/api/docs/) o Pexels.

`del_articulo()` junta las fotos del artículo de Wikipedia que respalda el dato (la `fuente`
del guion, en su idioma y en inglés): son las más fieles al tema. `foto()` busca la foto de
una toma: primero entre esas, después en Wikimedia Commons y por último en Pixabay, siempre
pidiendo que la foto tenga que ver con la búsqueda. `buscar()` es el último respaldo.
"""

import html
import os
import re
from urllib.parse import unquote, urlparse
from pathlib import Path

import requests

RESPALDO = "abstract texture"


AGENTE = "mente-curiosa/1.0 (https://github.com/lucascarey/mente-curiosa)"


def _buscar_pixabay(consulta: str, usados: set[str], clave: str, orientaciones=("vertical", "all"),
                    relevante: bool = False) -> str | None:
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
            if relevante and not claves(consulta) & claves(foto.get("tags", "")):
                continue
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


COMUNES = set("""a an and the of on in at to with from for by into over under near its his her their this that
these those some many few one two three small large big tiny old new view photo image picture close closeup
up side front back top showing shows shown made very file jpg png""".split())


def claves(texto: str) -> set[str]:
    """Palabras que importan de un texto en inglés, sin plurales simples."""
    palabras = re.findall(r"[a-záéíóúüñ0-9]+", texto.lower())
    return {p[:-1] if len(p) > 4 and p.endswith("s") else p for p in palabras if len(p) > 2 and p not in COMUNES}


def _info(api: str, archivos: list[str]) -> list[dict]:
    """Datos (url, tamaño, autor, licencia, descripción) de archivos de imagen, de a 40."""
    salida = []
    for k in range(0, len(archivos), 40):
        r = requests.get(api, params={"action": "query", "format": "json", "titles": "|".join(archivos[k:k + 40]),
                                      "prop": "imageinfo", "iiprop": "url|mime|size|extmetadata", "iiurlwidth": 1280},
                         headers={"User-Agent": AGENTE}, timeout=30)
        r.raise_for_status()
        salida += r.json().get("query", {}).get("pages", {}).values()
    return salida


def _candidata(pagina: dict, usados: set[str]) -> dict | None:
    info = (pagina.get("imageinfo") or [{}])[0]
    url = info.get("thumburl") or info.get("url")
    ancho, alto = info.get("width", 0), info.get("height", 0)
    if info.get("mime") not in ("image/jpeg", "image/png") or not url or url in usados:
        return None
    if ancho < 700 or not 0.6 <= ancho / max(1, alto) <= 2.4:
        return None
    meta = info.get("extmetadata", {})
    autor = _sin_html(meta.get("Artist", {}).get("value", ""))[:60] or "autor desconocido"
    licencia = _sin_html(meta.get("LicenseShortName", {}).get("value", ""))
    texto = pagina.get("title", "") + " " + _sin_html(meta.get("ImageDescription", {}).get("value", ""))[:300]
    return {"url": url, "credito": f"{autor} ({licencia}, Wikimedia Commons)", "claves": claves(texto)}


def del_articulo(fuente: str) -> list[dict]:
    """Fotos del artículo de Wikipedia de la fuente y de su versión en inglés. Lista vacía si no es Wikipedia."""
    partes = urlparse(fuente)
    if not partes.netloc.endswith("wikipedia.org") or "/wiki/" not in partes.path:
        return []
    articulos = [(partes.netloc.split(".")[0], unquote(partes.path.split("/wiki/", 1)[1]))]
    try:
        api = f"https://{articulos[0][0]}.wikipedia.org/w/api.php"
        r = requests.get(api, params={"action": "query", "format": "json", "titles": articulos[0][1], "redirects": 1,
                                      "prop": "langlinks", "lllang": "en"}, headers={"User-Agent": AGENTE}, timeout=30)
        paginas = list(r.json().get("query", {}).get("pages", {}).values())
        if not paginas or "missing" in paginas[0]:
            # La dirección no existe tal cual (por ejemplo le falta un acento): busco el artículo más parecido
            r = requests.get(api, params={"action": "query", "format": "json", "generator": "search", "gsrlimit": 1,
                                          "gsrsearch": articulos[0][1].replace("_", " "), "prop": "langlinks",
                                          "lllang": "en"}, headers={"User-Agent": AGENTE}, timeout=30)
            paginas = list(r.json().get("query", {}).get("pages", {}).values())
            if paginas:
                articulos[0] = (articulos[0][0], paginas[0]["title"])
        for pagina in paginas:
            for enlace in pagina.get("langlinks", []):
                articulos.append(("en", enlace["*"]))
        fotos, vistas = [], set()
        for idioma, titulo in articulos:
            api = f"https://{idioma}.wikipedia.org/w/api.php"
            r = requests.get(api, params={"action": "query", "format": "json", "titles": titulo, "redirects": 1,
                                          "prop": "images", "imlimit": 60}, headers={"User-Agent": AGENTE}, timeout=30)
            archivos = [i["title"] for p in r.json().get("query", {}).get("pages", {}).values() for i in p.get("images", [])]
            datos = _info(api, [a for a in archivos if a not in vistas])
            for pagina in datos:
                vistas.add(pagina.get("title"))
                if c := _candidata(pagina, set()):
                    fotos.append(c)
        print(f"Fotos de {', '.join(t for _, t in articulos)}: {len(fotos)}")
        return fotos
    except (requests.RequestException, ValueError, KeyError) as e:
        print(f"::warning::No pude leer las fotos de {fuente}: {e}")
        return []


def _mejor(fotos: list[dict], consulta: str, usados: set[str], minimo: int) -> dict | None:
    """La foto que más palabras comparte con la consulta (al menos `minimo`)."""
    buscadas = claves(consulta)
    puntaje = lambda f: len(buscadas & f["claves"])
    libres = [f for f in fotos if f["url"] not in usados and puntaje(f) >= minimo]
    return max(libres, key=puntaje) if libres else None


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
    candidatas = [c for p in paginas if (c := _candidata(p, usados))]
    # Respeta el orden de relevancia del buscador, pero pide que comparta al menos una palabra
    buscadas = claves(consulta)
    for c in candidatas:
        if buscadas & c["claves"]:
            return c["url"], c["credito"]
    return None


def foto(consulta: str, usados: set[str], articulo: list[dict] = ()) -> tuple[str, str] | None:
    """(url, crédito) de una foto real para la consulta, o None si no aparece ninguna."""
    if elegida := _mejor(list(articulo), consulta, usados, minimo=2 if len(claves(consulta)) > 2 else 1):
        return elegida["url"], elegida["credito"]
    try:
        if encontrada := _buscar_wikimedia(consulta, usados):
            return encontrada
    except requests.RequestException as e:
        print(f"::warning::Wikimedia Commons falló: {e}")
    if clave := os.environ.get("PIXABAY_API_KEY"):
        if url := _buscar_pixabay(consulta, usados, clave, ("horizontal", "all"), relevante=True):
            return url, "Pixabay"
    return None


def del_tema(articulo: list[dict], consulta: str, usados: set[str]) -> tuple[str, str] | None:
    """Respaldo: la foto del artículo que más se parece a la consulta, aunque no comparta palabras."""
    if elegida := _mejor(articulo, consulta, usados, minimo=0):
        return elegida["url"], elegida["credito"]
    return None


def descargar(url: str, destino: Path) -> Path:
    r = requests.get(url, timeout=60, headers={"User-Agent": AGENTE})
    r.raise_for_status()
    destino.write_bytes(r.content)
    return destino
