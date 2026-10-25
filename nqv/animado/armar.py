"""Arma un video animado de Nada Que Ver: Neurón solo, explicando con gráficos programados (sin fotos).

Cada video vive en una carpeta de nqv/animados/ con:
  guion.json   título, caption y líneas: {"dice", "escena", "chip", "poses"} (las poses como en nqv/guion.py)
  escenas.js   una función por escena: ESCENAS.nombre = (inf) => {...} que dibuja con las utilidades de
               plantilla.html; inf.t son los segundos desde que arrancó la línea, inf.p el avance de 0 a 1 e
               inf.cuando("palabra") el segundo en que Neurón dice esa palabra, para sincronizar.

Uso:
    python -m nqv.animado.armar nqv/animados/cielo-azul [carpeta_voces_anterior]
    python -m nqv.animado.armar nqv/animados/cielo-azul --sin-voz [--cuadros 1,5.5,12]
--sin-voz estima los tiempos por la cantidad de letras y no gasta cuota de Gemini (para revisar las animaciones);
--cuadros guarda solo esas capturas (segundos) en vez del video.
El video queda en salida/animado-<nombre>.mp4.
"""

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

import numpy as np

from ..guion import GESTOS, pantalla
from ..video import FPS, frases, volumen

RAIZ = Path(__file__).resolve().parent.parent.parent
PLANTILLA = Path(__file__).resolve().parent / "plantilla.html"
SALIDA = RAIZ / "salida"


def cargar(carpeta: Path) -> dict:
    g = json.loads((carpeta / "guion.json").read_text(encoding="utf-8"))
    for k, l in enumerate(g["lineas"]):
        poses = l["poses"] if isinstance(l["poses"], list) else [l["poses"]]
        l["poses"] = [p if isinstance(p, int) else GESTOS["neuron"][p] for p in poses]
        l["texto"] = pantalla(l["dice"])
        l["grupos"] = frases(l["texto"])
    return g


def estimar(lineas: list[dict]) -> tuple[list, list]:
    """Tiempos aproximados sin audio: ~15 letras por segundo y una pausa corta entre líneas."""
    tiempos, palabras, t = [], [], 0.0
    for l in lineas:
        ws = l["texto"].split()
        inicio = t
        ini_ws = []
        for w in ws:
            ini_ws.append(round(t, 3))
            t += (len(w) + 1) / 15
        tiempos.append([round(inicio, 3), round(t, 3)])
        palabras.append(ini_ws)
        t += 0.35
    return tiempos, palabras


def renderizar(g: dict, duracion: float, vol: np.ndarray, salida: Path, audio: Path | None,
               solo: list[float] | None = None) -> None:
    from playwright.sync_api import sync_playwright

    escenas = PLANTILLA.parent.parent / "animados" / g["_carpeta"] / "escenas.js"
    datos = {"fps": FPS, "vol": [round(float(v), 3) for v in vol],
             "lineas": [{k: l[k] for k in ("texto", "escena", "chip", "poses", "grupos", "ini", "fin", "palabras")}
                        for l in g["lineas"]]}
    with sync_playwright() as pw:
        # NQV_CHROMIUM: para usar un Chromium ya instalado en vez del que baja Playwright
        nav = pw.chromium.launch(executable_path=os.environ.get("NQV_CHROMIUM"), args=["--allow-file-access-from-files"])
        pagina = nav.new_page(viewport={"width": 1080, "height": 1920})
        pagina.on("console", lambda m: print("consola:", m.text, flush=True))
        pagina.on("pageerror", lambda e: (_ for _ in ()).throw(RuntimeError(f"error en la página: {e}")))
        pagina.goto(PLANTILLA.as_uri())
        pagina.add_script_tag(path=str(escenas))
        pagina.evaluate("d => preparar(d)", datos)
        if solo is not None:
            salida.mkdir(parents=True, exist_ok=True)
            for t in solo:
                pagina.evaluate(f"dibujar({t})")
                pagina.screenshot(path=str(salida / f"cuadro-{t:05.1f}.jpg"), type="jpeg", quality=85)
            nav.close()
            return
        total = int(duracion * FPS)
        entrada = ["-i", str(audio)] if audio else ["-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono"]
        ff = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "image2pipe", "-framerate", str(FPS), "-i", "-",
                               *entrada, "-map", "0:v", "-map", "1:a",
                               "-af", "dynaudnorm=f=250:g=15:p=0.9,loudnorm=I=-14:TP=-1.5,apad",
                               "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p",
                               "-c:a", "aac", "-b:a", "160k", "-t", f"{total / FPS:.3f}", "-movflags", "+faststart",
                               str(salida)], stdin=subprocess.PIPE)
        for n in range(total):
            pagina.evaluate(f"dibujar({n / FPS})")
            ff.stdin.write(pagina.screenshot(type="jpeg", quality=95))
            if n % (FPS * 10) == 0:
                print(f"cuadro {n}/{total}", flush=True)
        ff.stdin.close()
        ff.wait()
        nav.close()
        if ff.returncode:
            raise RuntimeError("ffmpeg falló")


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("carpeta", type=Path)
    p.add_argument("anterior", type=Path, nargs="?")
    p.add_argument("--sin-voz", action="store_true")
    p.add_argument("--cuadros")
    args = p.parse_args()
    carpeta = args.carpeta.resolve()
    g = cargar(carpeta)
    g["_carpeta"] = carpeta.name
    trabajo = SALIDA / f"animado-{carpeta.name}"
    trabajo.mkdir(parents=True, exist_ok=True)
    lineas = g["lineas"]

    if args.sin_voz:
        audio = None
        tiempos, palabras = estimar(lineas)
    else:
        from .. import tiempos as alinear, voces
        audio = voces.generar([("neuron", l["dice"]) for l in lineas], trabajo / "voces", args.anterior)
        alinear.main([l["texto"] for l in lineas], audio, trabajo / "tiempos.json")
        tiempos = json.loads((trabajo / "tiempos.json").read_text())
        palabras = json.loads((trabajo / "palabras.json").read_text())
    for l, (ini, fin), ws in zip(lineas, tiempos, palabras):
        l.update(ini=ini, fin=fin, palabras=ws)
    duracion = tiempos[-1][1] + 1.5
    vol = volumen(audio, int(duracion * FPS)) if audio else np.zeros(int(duracion * FPS))

    if args.cuadros:
        renderizar(g, duracion, vol, trabajo / "cuadros", audio, [float(x) for x in args.cuadros.split(",")])
        print("Cuadros en", trabajo / "cuadros")
        return 0
    video = SALIDA / f"animado-{carpeta.name}.mp4"
    renderizar(g, duracion, vol, video, audio)
    print(f"Video listo: {video} ({video.stat().st_size / 1e6:.1f} MB, {duracion:.1f} s)", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
