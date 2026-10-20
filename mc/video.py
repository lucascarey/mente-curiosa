"""Arma el video final: un clip por parte, subtítulos y voz."""

import subprocess
from pathlib import Path

from . import clips, config, subtitulos, voz
from .guion import Guion


def _segmento(clip: Path, segundos: float, destino: Path) -> Path:
    filtro = (
        f"scale={config.ANCHO}:{config.ALTO}:force_original_aspect_ratio=increase,"
        f"crop={config.ANCHO}:{config.ALTO},setsar=1,fps={config.FPS},"
        "eq=brightness=-0.06:saturation=1.1,format=yuv420p"
    )
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-stream_loop", "-1", "-i", str(clip), "-t", f"{segundos:.3f}",
         "-vf", filtro, "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", str(destino)],
        check=True,
    )
    return destino


def armar(guion: Guion) -> Path:
    trabajo = config.CACHE / guion.id
    trabajo.mkdir(parents=True, exist_ok=True)
    config.SALIDA.mkdir(parents=True, exist_ok=True)

    audio, palabras, duraciones = voz.generar(guion.partes, trabajo / "voz")
    rutas_clips = clips.conseguir([p.busqueda for p in guion.partes], trabajo / "clips")

    segmentos = [_segmento(c, d, trabajo / f"seg{i}.mp4")
                 for i, (c, d) in enumerate(zip(rutas_clips, duraciones))]
    lista = trabajo / "segmentos.txt"
    lista.write_text("".join(f"file '{s.resolve()}'\n" for s in segmentos))

    total = sum(duraciones)
    ass = subtitulos.escribir(palabras, total, trabajo / "subs.ass")
    final = config.SALIDA / f"{guion.id}.mp4"
    filtro = f"ass={ass.as_posix()}:fontsdir={config.FUENTE.parent.as_posix()}"
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(lista), "-i", str(audio),
         "-vf", filtro, "-map", "0:v", "-map", "1:a", "-t", f"{total:.3f}",
         "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-profile:v", "high", "-pix_fmt", "yuv420p",
         "-r", str(config.FPS), "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", str(final)],
        check=True,
    )
    return final
