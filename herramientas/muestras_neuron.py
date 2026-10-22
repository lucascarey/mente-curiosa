"""Candidatas de voz de Gemini para Neurón: más grave y fuerte, de profesor/villano.

Necesita la variable GEMINI_API_KEY. Uso: python herramientas/muestras_neuron.py carpeta_destino
"""

import base64
import os
import subprocess
import sys
import time
from pathlib import Path

import requests

MODELOS = ("gemini-3.1-flash-tts-preview", "gemini-2.5-flash-preview-tts")
URL = "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent"
PAUSA = 22

ESTILO = ("Actuá como un profesor genio con aire de villano de película: voz MUY grave, profunda y potente, "
          "proyectada y segura, con autoridad, un poco teatral y sarcástica, disfrutando de saber más que todos. "
          "Hablá fuerte y claro, sin susurrar. Español latinoamericano neutro, sin ningún acento regional. Decí:")
FRASE = ("Nada de eso. Esa noche no pasaría nada dramático. Los cambios vendrían de a poco. "
         "La Luna no es decoración. Es lo que mantiene estable al planeta.")
CANDIDATAS = ["Iapetus", "Charon", "Algenib", "Orus"]


def sintetizar(voz: str, destino: Path) -> None:
    cuerpo = {
        "contents": [{"parts": [{"text": f"{ESTILO} {FRASE}"}]}],
        "generationConfig": {"responseModalities": ["AUDIO"],
                             "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voz}}}},
    }
    for modelo in MODELOS:
        for intento in range(2):
            r = requests.post(URL.format(modelo), json=cuerpo, timeout=120,
                              headers={"x-goog-api-key": os.environ["GEMINI_API_KEY"]})
            if r.status_code == 429:
                print(modelo, "429:", r.text[:300], flush=True)
                if "PerDay" in r.text:
                    break
                time.sleep(40)
                continue
            if r.ok:
                datos = r.json()["candidates"][0]["content"]["parts"][0]["inlineData"]["data"]
                pcm = destino.with_suffix(".pcm")
                pcm.write_bytes(base64.b64decode(datos))
                subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "s16le", "-ar", "24000", "-ac", "1",
                                "-i", str(pcm), "-af", "loudnorm=I=-16", "-ar", "24000", "-b:a", "96k", str(destino)],
                               check=True)
                pcm.unlink()
                return
            print(modelo, r.status_code, r.text[:300], flush=True)
            break
    raise RuntimeError(f"no se pudo generar {voz}")


def main(destino: Path) -> None:
    destino.mkdir(parents=True, exist_ok=True)
    for n, voz in enumerate(CANDIDATAS, 1):
        try:
            sintetizar(voz, destino / f"neuron-{n}-{voz.lower()}.mp3")
            print(voz, "ok", flush=True)
        except Exception as e:
            print(voz, "FALLÓ:", e, flush=True)
        if n < len(CANDIDATAS):
            time.sleep(PAUSA)


main(Path(sys.argv[1]))
