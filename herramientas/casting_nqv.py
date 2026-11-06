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


SINTY_NEUTRA = [
    ("doblaje", "Actuá como una presentadora de noticiero joven, cálida y profesional. Hablá en español latino NEUTRO de "
     "doblaje, el que se usa en series dobladas para toda Latinoamérica: sin acento argentino, sin voseo, sin 'sh' en la "
     "ll ni en la y, sin entonación rioplatense; pronunciación clara y estándar. Ritmo de noticiero moderno. Decí:"),
    ("cnn", "Actuá como una conductora de un noticiero internacional en español para toda Latinoamérica, como las de "
     "las cadenas de noticias de Miami o México: voz femenina joven, cálida y creíble, acento latino neutro y "
     "estándar, nada regional, ni argentino ni español de España. Dicción impecable, ritmo ágil. Decí:"),
    ("mexico", "Actuá como una presentadora de noticias joven de la Ciudad de México, con acento mexicano suave y neutro, "
     "el más estándar posible, cálida, amable y profesional, ritmo de noticiero moderno. Decí:"),
]


def ronda2(destino: Path) -> None:
    """Ronda 2 (Lucas 2026-11-06): Neurón = Charon. Sinty: Erinome pero en español neutro, no argentino."""
    destino.mkdir(parents=True, exist_ok=True)
    base.FRASE = SINTY["frase"]
    for n, (nombre, estilo) in enumerate(SINTY_NEUTRA, 1):
        base.ESTILO = estilo
        try:
            base.sintetizar("Erinome", destino / f"sinty-erinome-{n}-{nombre}.mp3")
            print("erinome", nombre, "ok", flush=True)
        except Exception as e:
            print("erinome", nombre, "FALLÓ:", e, flush=True)
        if n < len(SINTY_NEUTRA):
            time.sleep(base.PAUSA)


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


# Ronda 3 (Lucas 2026-11-06: "demasiado IA"): dirección HUMANA, que funcionó con el elenco viejo.
HUMANO = ("Sos una periodista joven de 27 años, real, contando las noticias de la semana a la cámara como si le "
          "hablaras a una amiga, no leyendo un guion. Sonás humana: respirás antes de arrancar las frases, el ritmo "
          "es irregular (a veces más rápido, a veces frenás para remarcar algo), sonreís un poco al decir tu nombre, "
          "hay micro pausas naturales y una leve emoción genuina cuando contás el dato. Nada de voz de locutora, nada "
          "de entonación de comercial ni de asistente virtual. Español latinoamericano neutro, sin acento regional, "
          "sin voseo. Decí:")
FRASE_HUMANA = ("Hola, ¿qué tal? Soy Sinty Wave, y estas son las tres noticias de la semana. La primera... es "
                "increíble: un telescopio encontró agua en un planeta que está fuera del sistema solar. Sí, agua. "
                "Vamos con los detalles.")
VOCES_R3 = ["Aoede", "Callirrhoe", "Achernar", "Erinome"]


def ronda3(destino: Path) -> None:
    destino.mkdir(parents=True, exist_ok=True)
    base.ESTILO, base.FRASE = HUMANO, FRASE_HUMANA
    for n, voz in enumerate(VOCES_R3, 1):
        try:
            base.sintetizar(voz, destino / f"sinty-r3-{n}-{voz.lower()}.mp3")
            print(voz, "ok", flush=True)
        except Exception as e:
            print(voz, "FALLÓ:", e, flush=True)
        if n < len(VOCES_R3):
            time.sleep(base.PAUSA)


# Ronda 4 (Lucas 2026-11-06): Achernar pero argentina, a ver si suena más natural.
ARGENTINA = [
    ("portena", "Sos una periodista porteña de 27 años, de Buenos Aires, contando las noticias de la semana a la cámara "
     "como si le hablaras a una amiga, no leyendo. Acento rioplatense natural, con voseo y la 'sh' típica en la ll y la "
     "y, pero sin exagerar. Sonás humana: respirás, el ritmo es irregular, remarcás lo importante, sonreís al decir tu "
     "nombre. Nada de voz de locutora ni de asistente virtual. Decí:"),
    ("suave", "Sos una conductora argentina joven de un canal de noticias de streaming, cercana y canchera pero "
     "creíble. Acento argentino suave y natural, con voseo, como se habla en la tele argentina actual. Ritmo de "
     "charla real, con respiraciones y micro pausas, nada de locutora. Decí:"),
]
FRASE_AR = ("Hola, ¿qué tal? Soy Sinty Wave, y estas son las tres noticias de la semana. La primera... es increíble: "
            "un telescopio encontró agua en un planeta que está fuera del sistema solar. Sí, agua. Vamos con los detalles.")


def ronda4(destino: Path) -> None:
    destino.mkdir(parents=True, exist_ok=True)
    base.FRASE = FRASE_AR
    for n, (nombre, estilo) in enumerate(ARGENTINA, 1):
        base.ESTILO = estilo
        try:
            base.sintetizar("Achernar", destino / f"sinty-achernar-ar-{n}-{nombre}.mp3")
            print(nombre, "ok", flush=True)
        except Exception as e:
            print(nombre, "FALLÓ:", e, flush=True)
        if n < len(ARGENTINA):
            time.sleep(base.PAUSA)


if __name__ == "__main__":
    ronda4(Path(sys.argv[1]))
