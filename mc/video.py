"""Arma el video final: voz, ilustraciones, animación y sonido."""

import subprocess

from . import animacion, config, ilustraciones, sonido, temas, voz
from .guion import Guion


def armar(guion: Guion):
    trabajo = config.CACHE / guion.id
    trabajo.mkdir(parents=True, exist_ok=True)
    config.SALIDA.mkdir(parents=True, exist_ok=True)
    tema = temas.tema(guion.tema)

    audio_voz, palabras, duraciones = voz.generar(guion.partes, trabajo / "voz")
    dibujos = ilustraciones.conseguir(guion, trabajo / "escena")
    datos, eventos = animacion.linea_de_tiempo(guion, tema, palabras, duraciones, dibujos)

    mudo = animacion.renderizar(datos, trabajo / "escena", trabajo / "mudo.mp4")
    audio = sonido.mezclar(audio_voz, datos["duracion"], eventos, tema["tonalidad"], trabajo / "audio.m4a")

    final = config.SALIDA / f"{guion.id}.mp4"
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-i", str(mudo), "-i", str(audio), "-map", "0:v", "-map", "1:a",
         "-c:v", "copy", "-c:a", "copy", "-shortest", "-movflags", "+faststart", str(final)],
        check=True,
    )
    return final
