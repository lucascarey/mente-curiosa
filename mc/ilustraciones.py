"""Ilustraciones de línea generadas con IA (Cloudflare Workers AI, modelo Flux) e íconos de línea.

Cada escena con ilustración usa el campo `dibujo` de la parte (o su `busqueda`)
y le suma un estilo fijo, así todos los videos se ven de la misma familia.
Sin las credenciales de Cloudflare usa una foto de Pixabay como respaldo.
"""

import base64
import os
import subprocess
import time
from pathlib import Path

import requests

from . import config, imagenes

MODELO = "@cf/black-forest-labs/flux-1-schnell"
ESTILO = (
    "Minimal technical illustration: thin clean white line art on a pure black background, "
    "light blue (#4FC3F7) accent highlights, blueprint and scientific diagram style, precise simple geometric shapes, "
    "lots of negative space, one centered subject, no text, no letters, no numbers, no watermark"
)
CON_ILUSTRACION = {"foto", "ilustracion", "emoji"}
ICONOS = "https://raw.githubusercontent.com/lucide-icons/lucide/0.460.0/icons/{}.svg"


def _credenciales() -> tuple[str, str] | None:
    cuenta, token = os.environ.get("CLOUDFLARE_ACCOUNT_ID"), os.environ.get("CLOUDFLARE_API_TOKEN")
    return (cuenta, token) if cuenta and token else None


def prompt(sujeto: str, protagonista: str = "") -> str:
    texto = f"{sujeto.rstrip('. ')}. "
    if protagonista:
        texto += f"The main character looks exactly like this: {protagonista.rstrip('. ')}. "
    return texto + ESTILO


def _generar(texto: str, destino: Path, cuenta: str, token: str) -> None:
    for intento in range(3):
        r = requests.post(
            f"https://api.cloudflare.com/client/v4/accounts/{cuenta}/ai/run/{MODELO}",
            headers={"Authorization": f"Bearer {token}"},
            json={"prompt": texto, "steps": 8},
            timeout=120,
        )
        if r.ok and r.json().get("result", {}).get("image"):
            destino.write_bytes(base64.b64decode(r.json()["result"]["image"]))
            return
        print(f"Cloudflare respondió {r.status_code}: {r.text[:200]}")
        time.sleep(3 * (intento + 1))
    raise RuntimeError("No pude generar la ilustración con Cloudflare Workers AI")


def _mock(i: int, destino: Path) -> None:
    colores = ["0x2e6b8a", "0x8a2e6b", "0x2e8a4f", "0x8a6b2e", "0x6b2e8a"]
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-f", "lavfi",
         "-i", f"gradients=s=1024x1024:c0={colores[i % 5]}:c1=0x101018:x0=0:y0=0:x1=1024:y1=1024:d=1",
         "-frames:v", "1", str(destino)],
        check=True,
    )


def conseguir(guion, carpeta: Path) -> list[str | None]:
    """Devuelve, por escena, el nombre del archivo de la ilustración dentro de `carpeta` (o None)."""
    carpeta.mkdir(parents=True, exist_ok=True)
    credenciales = _credenciales()
    if not credenciales and not config.MOCK:
        print("::warning::Faltan CLOUDFLARE_ACCOUNT_ID y CLOUDFLARE_API_TOKEN: uso fotos de Pixabay")
    usados: set[str] = set()
    resultado: list[str | None] = []
    for i, parte in enumerate(guion.partes):
        if (parte.visual or {}).get("tipo", "foto") not in CON_ILUSTRACION:
            resultado.append(None)
            continue
        destino = carpeta / f"ilustracion{i}.jpg"
        if config.MOCK:
            _mock(i, destino)
        elif credenciales:
            texto = prompt(parte.dibujo or parte.busqueda, guion.protagonista)
            print(f"Ilustración {i + 1}: {parte.dibujo or parte.busqueda}")
            _generar(texto, destino, *credenciales)
        else:
            url = imagenes.buscar(parte.busqueda, usados) or imagenes.buscar(imagenes.RESPALDO, usados)
            if not url:
                raise RuntimeError(f"No encontré fotos para '{parte.busqueda}'")
            usados.add(url)
            imagenes.descargar(url, destino)
        resultado.append(destino.name)
    return resultado


def icono(nombre: str) -> str:
    """SVG de un ícono de línea de Lucide (https://lucide.dev, licencia ISC), guardado en caché."""
    cache = config.CACHE / "iconos"
    cache.mkdir(parents=True, exist_ok=True)
    archivo = cache / f"{nombre}.svg"
    if not archivo.exists():
        r = requests.get(ICONOS.format(nombre), timeout=30)
        if r.status_code == 404:
            print(f"::warning::El ícono '{nombre}' no existe en Lucide")
            return ""
        r.raise_for_status()
        archivo.write_text(r.text)
    return archivo.read_text()
