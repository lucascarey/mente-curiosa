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
PERSONAJES = {
    "neuron": ("neuron-3-iapetus.mp3", None,
               "Nada de eso. Esa noche no pasaría nada dramático. Los cambios vendrían de a poco. "
               "Primero, las mareas: sin la Luna serían un tercio de lo que son."),
    "nyx": ("nyx-2-despina.mp3", None,
            "Ajá. ¿Y eso quién lo dijo? Mostrame la fuente y después hablamos."),
    # la muestra de Glip ya tiene el tono subido: se baja para clonar y se vuelve a subir al final
    "glip": ("glip-1-puck.mp3", "asetrate=24000/1.35,aresample=24000,atempo=1.1111",
             "¿Qué pasaría si mañana la Luna desapareciera? Pregunto para mi informe sobre los humanos."),
    "bruno": ("bruno-3-achird.mp3", None,
              "Fin del mundo. Tsunamis gigantes, el mar se sale, todo. ¿Y las olas? ¿Se termina el surf?"),
}
SUBIR_GLIP = "asetrate=24000*1.35,aresample=24000,atempo=0.9"
EXAGERACION = (0.5, 0.8)


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
