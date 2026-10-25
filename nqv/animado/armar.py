"""Videos animados de Nada Que Ver: Neurón solo, explicando con gráficos programados (sin fotos).

Cada video es una carpeta en nqv/animados/pendientes/ (se publican en orden de nombre, NNN-tema) con:
  guion.json   título, caption y líneas: {"dice", "escena", "chip", "poses"} (poses como en nqv/guion.py)
  escenas.js   una función por escena: ESCENAS.nombre = (inf) => {...} que dibuja con las utilidades de
               plantilla.html; inf.t son los segundos desde que arrancó la línea, inf.p el avance de 0 a 1 e
               inf.cuando("palabra") el segundo en que Neurón dice esa palabra, para sincronizar.
Cómo escribir uno nuevo: nqv/animados/COMO-ESCRIBIR.md.

Uso:
    python -m nqv.animado.armar --publicar [vista_previa]    arma y publica el próximo pendiente (reusando las voces
                                                             de la carpeta de la rama nqv-animado, si se pasa)
    python -m nqv.animado.armar --validar                    prueba todos los pendientes sin voz (sin gastar cuota)
    python -m nqv.animado.armar CARPETA [voces_anteriores]   solo arma el video
    python -m nqv.animado.armar CARPETA --sin-voz [--cuadros 1,5.5,12]
--sin-voz estima los tiempos por la cantidad de letras y no gasta cuota de Gemini (para revisar las animaciones);
--cuadros guarda solo esas capturas (segundos) en vez del video.
El video queda en salida/animado-<nombre>.mp4 y su portada (título + hook + Neurón) en salida/animado-<nombre>.jpg.
"""

import argparse
import json
import os
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

from ..guion import GESTOS, pantalla
from ..video import FPS, frases, volumen

RAIZ = Path(__file__).resolve().parent.parent.parent
PLANTILLA = Path(__file__).resolve().parent / "plantilla.html"
ANIMADOS = RAIZ / "nqv" / "animados"
PENDIENTES = ANIMADOS / "pendientes"
PUBLICADOS = ANIMADOS / "publicados"
SALIDA = RAIZ / "salida"
CAMPOS = ("dice", "escena", "chip", "poses")


def cargar(carpeta: Path) -> dict:
    g = json.loads((carpeta / "guion.json").read_text(encoding="utf-8"))
    for campo in ("titulo", "caption", "lineas"):
        if not g.get(campo):
            raise ValueError(f"{carpeta.name}: falta {campo!r} en guion.json")
    for k, l in enumerate(g["lineas"]):
        faltan = [c for c in CAMPOS if c not in l]
        if faltan:
            raise ValueError(f"{carpeta.name} línea {k + 1}: faltan {faltan}")
        poses = l["poses"] if isinstance(l["poses"], list) else [l["poses"]]
        try:
            l["poses"] = [p if isinstance(p, int) else GESTOS["neuron"][p] for p in poses]
        except KeyError as e:
            raise ValueError(f"{carpeta.name} línea {k + 1}: pose desconocida {e} "
                             f"(válidas: {sorted(GESTOS['neuron'])})") from None
        l["texto"] = pantalla(l["dice"])
        l["grupos"] = frases(l["texto"])
    g["_escenas"] = carpeta / "escenas.js"
    return g


def estimar(lineas: list[dict]) -> tuple[list, list]:
    """Tiempos aproximados sin audio: ~15 letras por segundo y una pausa corta entre líneas."""
    tiempos, palabras, t = [], [], 0.0
    for l in lineas:
        inicio, ini_ws = t, []
        for w in l["texto"].split():
            ini_ws.append(round(t, 3))
            t += (len(w) + 1) / 15
        tiempos.append([round(inicio, 3), round(t, 3)])
        palabras.append(ini_ws)
        t += 0.35
    return tiempos, palabras


def renderizar(g: dict, duracion: float, vol: np.ndarray, salida: Path, audio: Path | None,
               solo: list[float] | None = None) -> None:
    """Abre la plantilla en Chromium y graba un cuadro por captura. Un error de JavaScript corta todo."""
    import subprocess
    from playwright.sync_api import sync_playwright

    datos = {"fps": FPS, "titulo": g["titulo"], "vol": [round(float(v), 3) for v in vol],
             "lineas": [{k: l[k] for k in ("texto", "escena", "chip", "poses", "grupos", "ini", "fin", "palabras")}
                        for l in g["lineas"]]}
    with sync_playwright() as pw:
        # NQV_CHROMIUM: para usar un Chromium ya instalado en vez del que baja Playwright
        nav = pw.chromium.launch(executable_path=os.environ.get("NQV_CHROMIUM"), args=["--allow-file-access-from-files"])
        pagina = nav.new_page(viewport={"width": 1080, "height": 1920})
        pagina.on("console", lambda m: print("consola:", m.text, flush=True))
        if solo is not None:
            salida.mkdir(parents=True, exist_ok=True)
        pagina.goto(PLANTILLA.as_uri())
        pagina.add_script_tag(path=str(g["_escenas"]))
        sin_escena = pagina.evaluate("ns => ns.filter(n => typeof ESCENAS[n] !== 'function')",
                                     [l["escena"] for l in g["lineas"]])
        if sin_escena:
            raise ValueError(f"escenas.js no define: {sorted(set(sin_escena))}")
        pagina.evaluate("d => preparar(d)", datos)
        # la portada (miniatura del Reel) va al lado del video, o junto a los cuadros
        pagina.evaluate("portada()")
        pagina.screenshot(path=str(salida / "portada.jpg" if solo is not None else salida.with_suffix(".jpg")),
                          type="jpeg", quality=92)
        if solo is not None:
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


def armar(carpeta: Path, anterior: Path | None = None, sin_voz: bool = False,
          cuadros: list[float] | None = None) -> Path:
    g = cargar(carpeta)
    trabajo = SALIDA / f"animado-{carpeta.name}"
    trabajo.mkdir(parents=True, exist_ok=True)
    lineas = g["lineas"]
    if sin_voz:
        audio = None
        tiempos, palabras = estimar(lineas)
    else:
        from .. import tiempos as alinear, voces
        audio = voces.generar([("neuron", l["dice"]) for l in lineas], trabajo / "voces", anterior)
        alinear.main([l["texto"] for l in lineas], audio, trabajo / "tiempos.json")
        tiempos = json.loads((trabajo / "tiempos.json").read_text())
        palabras = json.loads((trabajo / "palabras.json").read_text())
    for l, (ini, fin), ws in zip(lineas, tiempos, palabras):
        l.update(ini=ini, fin=fin, palabras=ws)
    duracion = tiempos[-1][1] + 1.5
    vol = volumen(audio, int(duracion * FPS)) if audio else np.zeros(int(duracion * FPS))
    if cuadros is not None:
        renderizar(g, duracion, vol, trabajo / "cuadros", audio, cuadros)
        return trabajo / "cuadros"
    video = SALIDA / f"animado-{carpeta.name}.mp4"
    renderizar(g, duracion, vol, video, audio)
    print(f"Video listo: {video} ({video.stat().st_size / 1e6:.1f} MB, {duracion:.1f} s)", flush=True)
    return video


def validar() -> int:
    """Carga cada pendiente y dibuja un cuadro por línea (más el comienzo y el final) con tiempos estimados."""
    malos = 0
    carpetas = sorted(c for c in PENDIENTES.iterdir() if c.is_dir()) if PENDIENTES.exists() else []
    for c in carpetas:
        try:
            g = cargar(c)
            tiempos, _ = estimar(g["lineas"])
            momentos = [0.0] + [round(a + (b - a) * k, 2) for a, b in tiempos for k in (0.1, 0.5, 0.95)]
            armar(c, sin_voz=True, cuadros=momentos + [tiempos[-1][1] + 1.4])
        except Exception as e:  # noqa: BLE001 — cualquier falla del guion o del JavaScript cuenta como error
            malos += 1
            print(f"ERROR {c.name}: {e}", flush=True)
    print(f"{len(carpetas) - malos} videos animados válidos, {malos} con errores")
    return 1 if malos or not carpetas else 0


def publicar(anterior: Path | None = None) -> int:
    carpetas = sorted(c for c in PENDIENTES.iterdir() if c.is_dir()) if PENDIENTES.exists() else []
    if not carpetas:
        print("::error::No quedan videos animados en nqv/animados/pendientes")
        return 1
    carpeta = carpetas[0]
    print("Video:", carpeta.name, flush=True)
    # si el video ya se armó en la vista previa (rama nqv-animado), se reusa esa voz: es la que se revisó y no gasta cuota
    video = armar(carpeta, anterior / carpeta.name / "voces" if anterior else None)
    from ..publicar import publicar as subir
    caption = json.loads((carpeta / "guion.json").read_text(encoding="utf-8"))["caption"]
    resultado = {"publicado_en": datetime.now(timezone.utc).isoformat(timespec="seconds"), **subir(video, caption, video.with_suffix(".jpg"))}
    (carpeta / "resultado.json").write_text(json.dumps(resultado, ensure_ascii=False, indent=1) + "\n")
    PUBLICADOS.mkdir(parents=True, exist_ok=True)
    shutil.move(str(carpeta), PUBLICADOS / carpeta.name)
    print(f"Quedan {len(carpetas) - 1} videos animados pendientes", flush=True)
    return 0


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("carpeta", type=Path, nargs="?")
    p.add_argument("anterior", type=Path, nargs="?")
    p.add_argument("--publicar", action="store_true")
    p.add_argument("--validar", action="store_true")
    p.add_argument("--sin-voz", action="store_true")
    p.add_argument("--cuadros")
    args = p.parse_args()
    if args.publicar:
        return publicar(args.carpeta)
    if args.validar:
        return validar()
    if not args.carpeta:
        p.error("falta la carpeta del video")
    cuadros = [float(x) for x in args.cuadros.split(",")] if args.cuadros else None
    armar(args.carpeta.resolve(), args.anterior, args.sin_voz, cuadros)
    return 0


if __name__ == "__main__":
    sys.exit(main())
