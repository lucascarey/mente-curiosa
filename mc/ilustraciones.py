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


def a_paleta(ruta: Path) -> None:
    """Lleva la imagen a la paleta de la cuenta: grises sobre negro y solo los azules quedan en celeste."""
    import numpy as np
    from PIL import Image

    img = Image.open(ruta).convert("RGB")
    hsv = np.asarray(img.convert("HSV")).astype(np.float32) / 255
    rgb = np.asarray(img).astype(np.float32) / 255
    luz = rgb @ np.array([0.299, 0.587, 0.114], np.float32)
    luz = np.clip((luz - 0.06) / 0.94, 0, 1)  # el fondo queda negro puro
    tono, sat = hsv[..., 0] * 360, hsv[..., 1]
    azul = np.clip((sat - 0.2) / 0.3, 0, 1) * np.clip(1 - np.abs(tono - 200) / 40, 0, 1)
    celeste = np.array([0x4F, 0xC3, 0xF7], np.float32) / 255
    gris = np.repeat(luz[..., None], 3, axis=2)
    salida = gris * (1 - azul[..., None]) + np.clip(celeste * luz[..., None] * 1.6, 0, 1) * azul[..., None]
    Image.fromarray((salida * 255).astype(np.uint8)).save(ruta, quality=92)


def conseguir(guion, carpeta: Path) -> list[str | None]:
    """Devuelve, por toma (en orden, todas las partes seguidas), el archivo de su ilustración dentro de `carpeta` (o None)."""
    carpeta.mkdir(parents=True, exist_ok=True)
    credenciales = _credenciales()
    if not credenciales and not config.MOCK:
        print("::warning::Faltan CLOUDFLARE_ACCOUNT_ID y CLOUDFLARE_API_TOKEN: uso fotos de Pixabay")
    usados: set[str] = set()
    resultado: list[str | None] = []
    planos = [(parte, plano) for parte in guion.partes for plano in parte.planos]
    for i, (parte, plano) in enumerate(planos):
        if plano["visual"].get("tipo", "ilustracion") not in CON_ILUSTRACION:
            resultado.append(None)
            continue
        destino = carpeta / f"ilustracion{i}.jpg"
        encontrada = None
        if plano.get("foto") and not config.MOCK:
            # Foto real de la web: solo si aparece una; si no, se dibuja
            encontrada = imagenes.foto(plano["foto"], usados)
            print(f"Foto {i + 1}: {plano['foto']} -> {encontrada[0] if encontrada else 'no encontrada, la dibujo'}")
        if encontrada:
            usados.add(encontrada[0])
            imagenes.descargar(encontrada[0], destino)
            if encontrada[1] not in guion.creditos:
                guion.creditos.append(encontrada[1])
        elif config.MOCK:
            _mock(i, destino)
        elif credenciales:
            print(f"Ilustración {i + 1}: {plano['dibujo']}")
            try:
                _generar(prompt(plano["dibujo"], guion.protagonista), destino, *credenciales)
            except RuntimeError:
                # Por ejemplo si se acabó la cuota gratis del día: mejor una foto que no publicar
                print("::warning::Cloudflare no respondió: uso una foto de Pixabay para esta toma")
                credenciales = None
        if not encontrada and not config.MOCK and not credenciales:
            url = imagenes.buscar(parte.busqueda, usados) or imagenes.buscar(imagenes.RESPALDO, usados)
            if not url:
                raise RuntimeError(f"No encontré fotos para '{parte.busqueda}'")
            usados.add(url)
            imagenes.descargar(url, destino)
        a_paleta(destino)
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
