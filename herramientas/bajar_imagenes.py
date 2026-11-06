"""Baja imágenes reales de fuentes libres para los videos NQV (corre en GitHub Actions; el sandbox no llega).

Wikimedia Commons: busca y guarda las primeras N con su licencia y autor (creditos.json).
URLs directas: material de la NASA (dominio público).
Uso: python herramientas/bajar_imagenes.py destino
"""
import json
import sys
import time
from pathlib import Path

import requests

UA = {"User-Agent": "NQV-bot/1.0 (https://github.com/lucascarey/mente-curiosa)"}
API = "https://commons.wikimedia.org/w/api.php"
BUSQUEDAS = {
    "ronaldo": ["Cristiano Ronaldo Portugal national team", "Cristiano Ronaldo Portugal 2018 World Cup",
                "Cristiano Ronaldo Euro 2016", "Cristiano Ronaldo Portugal celebrating"],
    "iss": ["International Space Station roll-out solar array iROSA", "ISS 2023 view from Crew Dragon"],
}
DIRECTAS = {
    "iss/nasa-irosa-final.jpg": "https://www.nasa.gov/wp-content/uploads/2026/11/blog-useva101-110526h.jpg",
    "x70/nasa-x70.png": "https://www.nasa.gov/wp-content/uploads/2026/11/nasa-x-70-image.png",
}
LICENCIAS_OK = ("cc-by", "cc by", "cc0", "public domain", "pd", "cc-by-sa", "cc by-sa")


def main(dest: Path) -> None:
    dest.mkdir(parents=True, exist_ok=True)
    creditos = {}
    for ruta, url in DIRECTAS.items():
        r = requests.get(url, headers=UA, timeout=120)
        print(ruta, r.status_code, len(r.content), flush=True)
        if r.ok:
            (dest / ruta).parent.mkdir(parents=True, exist_ok=True)
            (dest / ruta).write_bytes(r.content)
            creditos[ruta] = {"fuente": url, "licencia": "NASA (dominio público)", "autor": "NASA"}
    for tema, qs in BUSQUEDAS.items():
        n = 0
        for q in qs:
            p = {"action": "query", "format": "json", "generator": "search", "gsrnamespace": 6, "gsrsearch": q,
                 "gsrlimit": 12, "prop": "imageinfo", "iiprop": "url|extmetadata|size|mime", "iiurlwidth": 1600}
            try:
                datos = requests.get(API, params=p, headers=UA, timeout=60).json()
            except Exception as e:
                print(q, "ERROR", e, flush=True)
                continue
            for pg in (datos.get("query", {}).get("pages", {}) or {}).values():
                ii = (pg.get("imageinfo") or [{}])[0]
                if ii.get("mime") not in ("image/jpeg", "image/png"):
                    continue
                meta = ii.get("extmetadata", {})
                lic = meta.get("LicenseShortName", {}).get("value", "")
                if not any(lic.lower().startswith(x) for x in LICENCIAS_OK):
                    continue
                nombre = f"{tema}/{pg['pageid']}.jpg"
                if nombre in creditos:
                    continue
                r = requests.get(ii.get("thumburl") or ii["url"], headers=UA, timeout=120)
                if not r.ok:
                    continue
                (dest / nombre).parent.mkdir(parents=True, exist_ok=True)
                (dest / nombre).write_bytes(r.content)
                autor = meta.get("Artist", {}).get("value", "")
                creditos[nombre] = {"fuente": ii.get("descriptionurl"), "titulo": pg.get("title"), "licencia": lic,
                                    "autor": autor[:300], "busqueda": q}
                n += 1
                time.sleep(0.3)
        print(tema, n, "imágenes", flush=True)
    (dest / "creditos.json").write_text(json.dumps(creditos, ensure_ascii=False, indent=1))


main(Path(sys.argv[1]))
