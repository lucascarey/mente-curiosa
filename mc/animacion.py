"""Arma la línea de tiempo del video y la renderiza cuadro por cuadro con Chromium.

La animación vive en mc/plantilla (HTML + motor.js + personaje.js). Este módulo
calcula los momentos clave de cada escena (las "marcas") y los efectos de sonido,
así imagen y sonido usan exactamente los mismos tiempos.
"""

import json
import os
import shutil
import subprocess
from pathlib import Path

from . import config, ilustraciones
from .guion import Guion, normalizar
from .voz import Palabra

PLANTILLA = Path(__file__).parent / "plantilla"
TRANSICION = 0.4  # entrada y salida de cada tarjeta
ADELANTO = 0.12  # la imagen nueva entra apenas antes de la palabra
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
        m = {"cuenta_inicio": 0.3, "cuenta_fin": 1.4}
        sonidos += [(1.4, "nota")]
    elif tipo == "comparacion":
        m = {"fila_a": 0.35, "fila_b": 1.1}
        sonidos += [(0.35, "clic"), (1.1, "clic"), (1.9, "nota")]
    elif tipo == "linea":
        fechas = [h["anio"] for h in visual["hitos"]]
        menor, mayor = min(fechas), max(fechas)
        posiciones = [0.06 + 0.88 * (f - menor) / ((mayor - menor) or 1) for f in fechas]
        inicio, fin = 0.2, 1.8
        hitos = [inicio + (fin - inicio) * _invertir_curva(p) for p in posiciones]
        m = {"linea_inicio": inicio, "linea_fin": fin, "posiciones": posiciones, "hitos": hitos}
        sonidos += [(h, "clic") for h in hitos]
    elif tipo == "seguir":
        m = {"toque": min(1.4, max(0.8, duracion - 0.8))}
        sonidos += [(m["toque"], "clic"), (m["toque"] + 0.08, "nota")]
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


def _visual(visual: dict) -> dict:
    """Copia del visual con los íconos de línea ya resueltos a SVG."""
    v = dict(visual)
    if v.get("tipo") == "comparacion":
        for lado in ("a", "b"):
            v[lado] = {**v[lado], "svg": ilustraciones.icono(v[lado]["icono"]) if v[lado].get("icono") else ""}
    return v


def _inicios(planos: list[dict], palabras: list[Palabra], inicio: float) -> list[float]:
    """Segundo en que arranca cada toma: la primera con la parte, las demás un poco antes de su palabra `desde`."""
    inicios, k = [inicio], 0
    for plano in planos[1:]:
        desde = normalizar(plano["desde"])
        while k < len(palabras) and normalizar(palabras[k].texto) != desde:
            k += 1
        if k == len(palabras):
            raise ValueError(f"No encontré la palabra '{plano['desde']}' en la voz")
        inicios.append(max(inicios[-1] + 0.5, palabras[k].inicio - ADELANTO))
        k += 1
    return inicios


def linea_de_tiempo(guion: Guion, tema: dict, palabras: list[Palabra], duraciones: list[float],
                    dibujos: list[str | None]) -> tuple[dict, list[tuple[float, str]]]:
    """Una escena por toma. Las imágenes cambian cada uno o dos segundos, al ritmo de lo que se dice."""
    escenas, sonidos = [], []
    reloj, n = 0.0, 0
    for parte, dur in zip(guion.partes, duraciones):
        planos = parte.planos
        propias = [p for p in palabras if reloj <= p.inicio < reloj + dur]
        inicios = _inicios(planos, propias, reloj) + [reloj + dur]
        for k, plano in enumerate(planos):
            ini, fin = inicios[k], inicios[k + 1]
            visual = _visual(plano["visual"])
            m, sonidos_escena = marcas(visual, fin - ini)
            escenas.append({"inicio": round(ini, 3), "fin": round(fin, 3), "dibujo": dibujos[n],
                            "visual": visual, "marcas": m})
            if n > 0:
                sonidos.append((ini - 0.1, "swoosh"))
            sonidos += [(ini + t, nombre) for t, nombre in sonidos_escena]
            n += 1
        reloj += dur
    datos = {
        "duracion": round(reloj, 3),
        "fps": config.FPS,
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
    for fuente in config.FUENTES.glob("*.ttf"):
        shutil.copy(fuente, trabajo / fuente.name)
    shutil.copytree(config.PERSONAJE, trabajo / "personaje", dirs_exist_ok=True, ignore=shutil.ignore_patterns("planilla.*"))
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
