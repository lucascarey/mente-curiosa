"""Genera el audio del "¿Qué pasaría si...?" de la Luna con Chatterbox y las voces aprobadas por Lucas.

Uso: python herramientas/escena_chatterbox.py carpeta_referencias carpeta_destino
La carpeta de referencias tiene los mp3 de la rama voces-gemini. Nyx no aparece en esta escena
(su voz queda en Gemini).
"""

import re
import subprocess
import sys
from pathlib import Path

import torchaudio as ta
from chatterbox.mtl_tts import ChatterboxMultilingualTTS

# mismo guion que herramientas/escena_gemini.py
ESCENA = [
    ("glip", "¿Qué pasaría si mañana la Luna desapareciera?"),
    ("bruno", "[aterrado] Fin del mundo. Tsunamis gigantes, el mar se sale, todo."),
    ("neuron", "Nada de eso. Esa noche no pasaría nada dramático. Los cambios vendrían de a poco."),
    ("neuron", "Primero, las mareas. Hoy las mueve sobre todo la Luna. Sin ella quedaría solo el Sol, y serían un tercio de lo que son."),
    ("bruno", "[preocupado] ¿Y las olas? ¿Se termina el surf?"),
    ("neuron", "No, las olas las hace el viento. Eso sigue igual."),
    ("neuron", "Segundo, las noches serían mucho más oscuras, y los animales que se guían por la Luna se desorientarían. Hay corales que se reproducen todos a la vez después de la luna llena."),
    ("neuron", "Y lo más importante: la Luna mantiene estable la inclinación de la Tierra. Sin ella, el eje se tambalearía y las estaciones y el clima cambiarían por completo. [pausa] Eso sí, en millones de años."),
    ("bruno", "[aliviado] O sea que me asusté con millones de años de anticipación."),
    ("neuron", "La Luna no es decoración. Es lo que mantiene estable al planeta."),
]

# personaje: (muestra de Gemini, filtro para "deshacer" efectos antes de clonar, exageración elegida)
VOCES = {
    "neuron": ("neuron-3-iapetus.mp3", None, 0.5),
    # la muestra de Glip ya tiene el tono subido: se baja para clonar y se vuelve a subir al final
    "glip": ("glip-1-puck.mp3", "asetrate=24000/1.35,aresample=24000,atempo=1.1111", 0.8),
    "bruno": ("bruno-3-achird.mp3", None, 0.5),
}
SUBIR_GLIP = "asetrate=24000*1.35,aresample=24000,atempo=0.9"
SILENCIO = 0.35  # segundos entre líneas


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
    ref = {}
    for personaje, (muestra, filtro, _) in VOCES.items():
        ref[personaje] = destino / f"_ref-{personaje}.wav"
        ffmpeg("-i", str(refs / muestra), *(["-af", filtro] if filtro else []), "-ar", "24000", "-ac", "1",
               str(ref[personaje]))

    partes = []
    for i, (personaje, texto) in enumerate(ESCENA, 1):
        # Chatterbox no entiende las marcas de Gemini como [aterrado]: se sacan; [pausa] pasa a puntos suspensivos
        texto = re.sub(r"\s*\[[^\]]+\]\s*", " ", texto.replace("[pausa]", "...")).strip()
        exa = VOCES[personaje][2]
        wav = modelo.generate(texto, language_id="es", audio_prompt_path=str(ref[personaje]),
                              exaggeration=exa, cfg_weight=0.3 if exa > 0.5 else 0.5)
        crudo = destino / f"_{i:02d}.wav"
        ta.save(str(crudo), wav, modelo.sr)
        salida = destino / f"{i:02d}-{personaje}.wav"
        ffmpeg("-i", str(crudo), "-af", (SUBIR_GLIP + "," if personaje == "glip" else "") + "aresample=24000",
               "-ac", "1", str(salida))
        crudo.unlink()
        partes.append(salida)
        print(i, personaje, "ok", flush=True)

    silencio = destino / "_silencio.wav"
    ffmpeg("-f", "lavfi", "-t", str(SILENCIO), "-i", "anullsrc=r=24000:cl=mono", str(silencio))
    lista = destino / "_lista.txt"
    lista.write_text("".join(f"file '{p}'\nfile '{silencio}'\n" for p in partes))
    ffmpeg("-f", "concat", "-safe", "0", "-i", str(lista), "-b:a", "96k", str(destino / "escena-luna-chatterbox.mp3"))
    for p in partes:
        ffmpeg("-i", str(p), "-b:a", "96k", str(p.with_suffix(".mp3")))
        p.unlink()
    for f in (silencio, lista, *ref.values()):
        f.unlink()


main(Path(sys.argv[1]), Path(sys.argv[2]))
