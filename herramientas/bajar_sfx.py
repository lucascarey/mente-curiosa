"""Baja una biblioteca de efectos de sonido grabados y de uso libre para los videos de NQV.

- Kenney (CC0, dominio público): packs de interfaz, impactos y audio digital.
- Mixkit (Mixkit Sound Effects Free License: uso comercial permitido, sin atribución): whooshes, transiciones, pops, impactos.
Uso: python herramientas/bajar_sfx.py carpeta_destino
"""

import io
import re
import sys
import time
import zipfile
from pathlib import Path

import requests

UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"}
KENNEY = ["interface-sounds", "ui-audio", "impact-sounds", "digital-audio", "casino-audio"]
MIXKIT = ["whoosh", "transition", "swoosh", "pop", "click", "impact", "glitch", "notification", "magic", "bubbles",
          "camera", "tick-tock", "typing", "pen", "paper", "falling", "hit", "boing", "slide", "cinematic",
          "glass", "wood", "bass", "drum", "riser", "sweep", "explosion", "laser", "beep", "game"]
MUSICA = ["electronic", "upbeat", "tech", "energetic", "hip-hop", "dance",
          # tranquilos (pedido de Lucas 2026-11-06: música mucho más lenta)
          "ambient", "chill", "lo-fi", "lofi", "chill-out", "relaxing", "calm", "documentary", "corporate", "piano", "inspiring"]


def kenney(dest: Path, log: list) -> None:
    for pack in KENNEY:
        try:
            html = requests.get(f"https://kenney.nl/assets/{pack}", headers=UA, timeout=60).text
            m = re.search(r'href="([^"]+\.zip)"', html)
            if not m:
                log.append(f"kenney {pack}: sin zip"); continue
            url = m.group(1) if m.group(1).startswith("http") else "https://kenney.nl" + m.group(1)
            z = zipfile.ZipFile(io.BytesIO(requests.get(url, headers=UA, timeout=120).content))
            n = 0
            for nombre in z.namelist():
                if nombre.lower().endswith((".ogg", ".wav", ".mp3")):
                    out = dest / "kenney" / pack / Path(nombre).name
                    out.parent.mkdir(parents=True, exist_ok=True)
                    out.write_bytes(z.read(nombre)); n += 1
            log.append(f"kenney {pack}: {n} archivos ({url})")
        except Exception as e:
            log.append(f"kenney {pack}: ERROR {e}")


def mixkit(dest: Path, log: list) -> None:
    vistos = set()
    for cat in MIXKIT:
        try:
            html = requests.get(f"https://mixkit.co/free-sound-effects/{cat}/", headers=UA, timeout=60).text
            urls = sorted(set(re.findall(r'https://assets\.mixkit\.co/[^"\']+?\.(?:mp3|wav)', html)))
            # títulos para nombrar los archivos
            n = 0
            for u in urls:
                if u in vistos:
                    continue
                vistos.add(u)
                ident = re.search(r"/(\d+)/", u)
                nombre = f"{cat}-{ident.group(1) if ident else n}.mp3"
                r = requests.get(u, headers=UA, timeout=60)
                if r.ok and len(r.content) > 1000:
                    out = dest / "mixkit" / cat / nombre
                    out.parent.mkdir(parents=True, exist_ok=True)
                    out.write_bytes(r.content); n += 1
                time.sleep(0.2)
            log.append(f"mixkit {cat}: {n} archivos")
        except Exception as e:
            log.append(f"mixkit {cat}: ERROR {e}")


def musica(dest: Path, log: list) -> None:
    vistos = set()
    for tag in MUSICA:
        try:
            html = requests.get(f"https://mixkit.co/free-stock-music/tag/{tag}/", headers=UA, timeout=60).text
            urls = sorted(set(re.findall(r'https://assets\.mixkit\.co/[^"\']+?\.mp3', html)))
            n = 0
            for u in urls[:20]:
                if u in vistos:
                    continue
                vistos.add(u)
                r = requests.get(u, headers=UA, timeout=120)
                if r.ok and len(r.content) > 10000:
                    out = dest / "musica" / tag / Path(u).name
                    out.parent.mkdir(parents=True, exist_ok=True)
                    out.write_bytes(r.content); n += 1
                time.sleep(0.2)
            log.append(f"musica {tag}: {n} temas")
        except Exception as e:
            log.append(f"musica {tag}: ERROR {e}")


def main(dest: Path) -> None:
    dest.mkdir(parents=True, exist_ok=True)
    log: list[str] = []
    mixkit(dest, log)
    musica(dest, log)
    (dest / "LICENCIAS.txt").write_text(
        "kenney/: Kenney (kenney.nl), licencia CC0 1.0 (dominio público).\n"
        "mixkit/: Mixkit (mixkit.co), Mixkit Sound Effects Free License: uso comercial permitido, sin atribución.\n"
        "musica/: Mixkit (mixkit.co), Mixkit Stock Music Free License: uso en videos, también comerciales, sin atribución.\n\n"
        + "\n".join(log) + "\n", encoding="utf-8")
    print("\n".join(log))


if __name__ == "__main__":
    main(Path(sys.argv[1]))
