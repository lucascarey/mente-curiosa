"""Baja candidatas de Wikimedia Commons para cada toma del prototipo de la Luna, para elegirlas a mano.

Uso: python herramientas/buscar_fotos_prototipo.py carpeta_destino
"""

import json
import sys
from pathlib import Path

import requests

AGENTE = "mente-curiosa/1.0 (https://github.com/lucascarey/mente-curiosa)"
BUSQUEDAS = {
    "luna": "full moon photograph",
    "ola-gigante": "Nazaré big wave surfer",
    "mareas": "Bay of Fundy high tide low tide",
    "surf": "surfer riding wave",
    "noche-oscura": "Milky Way night sky dark",
    "corales": "coral spawning",
    "eje": "axial tilt Earth obliquity",
    "estaciones": "Earth seasons orbit diagram",
    "tierra-luna": "Earth and Moon DSCOVR",
}


def main(destino: Path) -> None:
    destino.mkdir(parents=True, exist_ok=True)
    indice = {}
    for clave, consulta in BUSQUEDAS.items():
        r = requests.get("https://commons.wikimedia.org/w/api.php", headers={"User-Agent": AGENTE}, timeout=60, params={
            "action": "query", "format": "json", "generator": "search", "gsrsearch": f"{consulta} filetype:bitmap",
            "gsrnamespace": 6, "gsrlimit": 6, "prop": "imageinfo", "iiprop": "url|size", "iiurlwidth": 900})
        paginas = sorted(r.json().get("query", {}).get("pages", {}).values(), key=lambda p: p.get("index", 0))
        for n, p in enumerate(paginas, 1):
            info = p["imageinfo"][0]
            foto = requests.get(info["thumburl"], headers={"User-Agent": AGENTE}, timeout=60)
            if foto.ok:
                nombre = f"{clave}-{n}.jpg"
                (destino / nombre).write_bytes(foto.content)
                indice[nombre] = {"archivo": p["title"], "original": info["url"], "ancho": info["width"],
                                  "alto": info["height"]}
                print(nombre, p["title"], flush=True)
    (destino / "indice.json").write_text(json.dumps(indice, ensure_ascii=False, indent=1))


main(Path(sys.argv[1]))
