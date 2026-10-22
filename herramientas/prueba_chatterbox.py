"""Prueba Chatterbox (código abierto, sin límite diario) clonando las voces de Gemini elegidas por Lucas.

Uso: python herramientas/prueba_chatterbox.py carpeta_referencias carpeta_destino
La carpeta de referencias tiene los mp3 de la rama voces-gemini.
"""

import inspect
import subprocess
import sys
from pathlib import Path

import torchaudio as ta
from chatterbox.mtl_tts import ChatterboxMultilingualTTS

# personaje: (muestra de Gemini elegida, filtro para "deshacer" efectos antes de clonar, frase)
FRASE_NYX = ("Ajá. ¿Y eso quién lo dijo? Mostrame la fuente y después hablamos. "
             "Igual, no me sorprende nada.")
# Segunda ronda: Lucas eligió Neurón 0.5, Glip 0.8 y Bruno 0.5. Nyx sonó poco joven: se prueban
# otras muestras de Gemini como base, una de ellas con el tono un poco más agudo.
JOVEN = "asetrate=24000*1.08,aresample=24000,atempo=0.926"
PERSONAJES = {
    "nyx-leda": ("nyx-1-leda.mp3", None, FRASE_NYX),
    "nyx-laomedeia": ("nyx-3-laomedeia.mp3", None, FRASE_NYX),
    "nyx-despina-aguda": ("nyx-2-despina.mp3", JOVEN, FRASE_NYX),
}
SUBIR_GLIP = "asetrate=24000*1.35,aresample=24000,atempo=0.9"
EXAGERACION = (0.5, 0.7)


def ffmpeg(*args: str) -> None:
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", *args], check=True)


def cargar_modelo() -> ChatterboxMultilingualTTS:
    try:
        return ChatterboxMultilingualTTS.from_pretrained(device="cpu", t3_model="v3")
    except TypeError:
        return ChatterboxMultilingualTTS.from_pretrained(device="cpu")


def main(refs: Path, destino: Path) -> None:
    destino.mkdir(parents=True, exist_ok=True)
    modelo = cargar_modelo()
    acepta = inspect.signature(modelo.generate).parameters
    for personaje, (muestra, filtro, frase) in PERSONAJES.items():
        ref = destino / f"_ref-{personaje}.wav"
        ffmpeg("-i", str(refs / muestra), *(["-af", filtro] if filtro else []), "-ar", "24000", "-ac", "1", str(ref))
        for exa in EXAGERACION:
            extra = {}
            if "exaggeration" in acepta:
                extra["exaggeration"] = exa
            if "cfg_weight" in acepta:
                extra["cfg_weight"] = 0.3 if exa > 0.5 else 0.5
            try:
                wav = modelo.generate(frase, language_id="es", audio_prompt_path=str(ref), **extra)
                crudo = destino / f"_{personaje}.wav"
                ta.save(str(crudo), wav, modelo.sr)
                salida = destino / f"{personaje}-exageracion-{exa}.mp3"
                ffmpeg("-i", str(crudo), *(["-af", SUBIR_GLIP] if personaje == "glip" else []), "-b:a", "96k", str(salida))
                crudo.unlink()
                print(personaje, exa, "ok", flush=True)
            except Exception as e:  # una prueba que falla no frena al resto
                print(personaje, exa, "FALLÓ:", e, flush=True)
        ref.unlink()


main(Path(sys.argv[1]), Path(sys.argv[2]))
