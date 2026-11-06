"""Casting de voces de Gemini para el relanzamiento de NQV: 4 candidatas para Neurón y 4 para Sinty Wave.

Necesita la variable GEMINI_API_KEY. Uso: python herramientas/casting_nqv.py carpeta_destino
"""

import base64
import os
import subprocess
import sys
import time
from pathlib import Path
from types import SimpleNamespace

import requests

MODELOS = ("gemini-3.1-flash-tts-preview", "gemini-2.5-flash-preview-tts")
URL = "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent"
PAUSA = 22


def sintetizar(voz: str, destino: Path) -> None:
    cuerpo = {
        "contents": [{"parts": [{"text": f"{base.ESTILO} {base.FRASE}"}]}],
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



base = SimpleNamespace(ESTILO="", FRASE="", PAUSA=PAUSA, sintetizar=sintetizar)

NEURON = dict(
    estilo=("Actuá como un científico joven de unos 28 años, superinteligente y un poco soberbio pero buena persona, "
            "apasionado por enseñar. Voz masculina de adulto joven, seria pero carismática, segura y clara, con "
            "entusiasmo contenido cuando cuenta el dato. Ritmo ágil y natural, como un buen divulgador, sin sonar "
            "a locutor. Español latinoamericano neutro, sin ningún acento regional. Decí:"),
    frase=("Si el Sol desapareciera ahora mismo, no te enterarías. Durante ocho minutos y veinte segundos, todo "
           "seguiría igual. Porque la luz, y también la gravedad, tardan eso en llegar hasta acá."),
    voces=["Sadaltager", "Charon", "Rasalgethi", "Iapetus"],
)
SINTY = dict(
    estilo=("Actuá como una periodista joven de unos 27 años que presenta un noticiero: cálida, amable y agradable, "
            "pero profesional y creíble, con la firmeza justa para temas serios. Voz femenina de adulta joven, clara "
            "y cercana, con buena dicción. Ritmo de noticiero moderno, ágil, sin sonar robótica ni exagerada. "
            "Español latinoamericano neutro, sin ningún acento regional. Decí:"),
    frase=("Buenas noches, soy Sinty Wave y estas son las tres noticias de la semana. Primero: un telescopio "
           "detectó agua en un planeta fuera del sistema solar. Vamos con los detalles."),
    voces=["Sulafat", "Kore", "Erinome", "Autonoe"],
)


def main(destino: Path) -> None:
    destino.mkdir(parents=True, exist_ok=True)
    pedidos = [("neuron", NEURON, v) for v in NEURON["voces"]] + [("sinty", SINTY, v) for v in SINTY["voces"]]
    for n, (pj, cfg, voz) in enumerate(pedidos, 1):
        base.ESTILO, base.FRASE = cfg["estilo"], cfg["frase"]
        i = cfg["voces"].index(voz) + 1
        try:
            base.sintetizar(voz, destino / f"{pj}-{i}-{voz.lower()}.mp3")
            print(pj, voz, "ok", flush=True)
        except Exception as e:
            print(pj, voz, "FALLÓ:", e, flush=True)
        if n < len(pedidos):
            time.sleep(base.PAUSA)


if __name__ == "__main__":
    main(Path(sys.argv[1]))
