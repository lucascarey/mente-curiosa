"""Arma la línea de tiempo del video y la renderiza cuadro por cuadro con Chromium.

La animación vive en mc/plantilla (HTML + motor.js). Este módulo calcula los
momentos clave de cada escena (las "marcas") y los efectos de sonido, así
imagen y sonido usan exactamente los mismos tiempos.
"""

import json
import os
import shutil
import subprocess
from pathlib import Path

from . import config
from .guion import Guion
from .voz import Palabra

PLANTILLA = Path(__file__).parent / "plantilla"
TRANSICION = 0.32
PALABRAS_POR_PANTALLA = 3


def _invertir_curva(objetivo: float) -> float:
    """Tiempo relativo en el que la curva inOutCubic llega a `objetivo` (para la línea de tiempo)."""
    bajo, alto = 0.0, 1.0
    for _ in range(30):
        medio = (bajo + alto) / 2
        valor = 4 * medio**3 if medio < 0.5 else 1 - (-2 * medio + 2) ** 3 / 2
        bajo, alto = (medio, alto) if valor < objetivo else (bajo, medio)
    return bajo


def marcas(visual: dict, duracion: float) -> tuple[dict, list[tuple[float, str]]]:
    """Momentos clave (en segundos desde el inicio de la escena) y sonidos de esa escena."""
    tipo = visual.get("tipo", "foto")
    sonidos: list[tuple[float, str]] = []
    m: dict = {}
    if tipo == "numero":
        m = {"cuenta_inicio": 0.25, "cuenta_fin": 1.15}
        sonidos += [(0.25 + k * 0.1, "tic") for k in range(9)] + [(1.15, "ding")]
    elif tipo == "comparacion":
        m = {"fila_a": 0.35, "fila_b": 1.1}
        sonidos += [(0.2, "pop"), (0.35, "subida"), (0.95, "pop"), (1.1, "subida"), (1.85, "ding")]
    elif tipo == "linea":
        fechas = [h["anio"] for h in visual["hitos"]]
        menor, mayor = min(fechas), max(fechas)
        posiciones = [0.06 + 0.88 * (f - menor) / ((mayor - menor) or 1) for f in fechas]
        inicio, fin = 0.2, 1.6
        hitos = [inicio + (fin - inicio) * _invertir_curva(p) for p in posiciones]
        m = {"linea_inicio": inicio, "linea_fin": fin, "posiciones": posiciones, "hitos": hitos}
        sonidos += [(0.2, "subida")] + [(h, "pop") for h in hitos]
    elif tipo == "seguir":
        m = {"toque": min(1.1, max(0.7, duracion - 0.6))}
        sonidos += [(0.05, "pop"), (m["toque"], "clic"), (m["toque"] + 0.05, "ding")]
    elif tipo == "emoji":
        sonidos += [(0.1, "pop")] + ([(0.45, "pop")] if visual.get("texto") else [])
    else:
        sonidos += [(0.05, "pop")] + ([(0.35, "pop")] if visual.get("emoji") else [])
    return m, sonidos


def agrupar(palabras: list[Palabra]) -> list[dict]:
    grupos, actual = [], []
    for p in palabras:
        actual.append(p)
        if len(actual) == PALABRAS_POR_PANTALLA or p.corte:
            grupos.append(actual)
            actual = []
    if actual:
        grupos.append(actual)
    salida = []
    for i, g in enumerate(grupos):
        fin = grupos[i + 1][0].inicio if i + 1 < len(grupos) else g[-1].fin + 0.5
        salida.append({
            "inicio": round(g[0].inicio, 3),
            "fin": round(fin, 3),
            "palabras": [{"texto": p.texto, "inicio": round(p.inicio, 3), "destacada": p.destacada} for p in g],
        })
    return salida


def linea_de_tiempo(guion: Guion, tema: dict, palabras: list[Palabra], duraciones: list[float],
                    imagenes: list[tuple[str, str]]) -> tuple[dict, list[tuple[float, str]]]:
    escenas, sonidos = [], [(0.0, "impacto")]
    reloj = 0.0
    for i, (parte, dur, (foto, fondo)) in enumerate(zip(guion.partes, duraciones, imagenes)):
        visual = parte.visual or {"tipo": "foto"}
        m, sonidos_escena = marcas(visual, dur)
        escenas.append({"inicio": round(reloj, 3), "fin": round(reloj + dur, 3), "foto": foto, "fondo": fondo,
                        "visual": visual, "marcas": m})
        if i > 0:
            sonidos.append((reloj - 0.08, "whoosh"))
        sonidos += [(reloj + t, nombre) for t, nombre in sonidos_escena]
        reloj += dur
    datos = {
        "duracion": round(reloj, 3),
        "transicion": TRANSICION,
        "tema": tema,
        "usuario": config.USUARIO,
        "escenas": escenas,
        "grupos": agrupar(palabras),
    }
    return datos, sorted(sonidos)


def _chromium() -> dict:
    ruta = os.environ.get("MC_CHROMIUM")
    return {"executable_path": ruta} if ruta else {}


def renderizar(datos: dict, carpeta_imagenes: Path, destino: Path) -> Path:
    """Captura cada cuadro del HTML y lo codifica en un video mudo."""
    from playwright.sync_api import sync_playwright

    trabajo = carpeta_imagenes
    for archivo in PLANTILLA.iterdir():
        shutil.copy(archivo, trabajo / archivo.name)
    shutil.copy(config.FUENTE, trabajo / config.FUENTE.name)
    (trabajo / "datos.js").write_text("window.DATOS = " + json.dumps(datos, ensure_ascii=False) + ";", encoding="utf-8")

    cuadros = int(datos["duracion"] * config.FPS)
    ffmpeg = subprocess.Popen(
        ["ffmpeg", "-y", "-v", "error", "-f", "image2pipe", "-framerate", str(config.FPS), "-c:v", "mjpeg", "-i", "-",
         "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", str(destino)],
        stdin=subprocess.PIPE,
    )
    with sync_playwright() as p:
        navegador = p.chromium.launch(**_chromium())
        pagina = navegador.new_page(viewport={"width": config.ANCHO, "height": config.ALTO})
        errores: list[str] = []
        pagina.on("pageerror", lambda e: errores.append(str(e)))
        pagina.goto((trabajo / "index.html").as_uri())
        pagina.evaluate("window.listo")
        if errores:
            raise RuntimeError(f"Error en la plantilla: {errores[0]}")
        for n in range(cuadros):
            pagina.evaluate(f"render({n / config.FPS})")
            ffmpeg.stdin.write(pagina.screenshot(type="jpeg", quality=92))
        navegador.close()
        if errores:
            raise RuntimeError(f"Error en la plantilla: {errores[0]}")
    ffmpeg.stdin.close()
    if ffmpeg.wait() != 0:
        raise RuntimeError("ffmpeg falló al codificar los cuadros")
    return destino
