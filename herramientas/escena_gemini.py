"""Genera el audio del primer \"¿Qué pasaría si...?\" (la Luna) con las voces elegidas de Gemini.

Necesita la variable GEMINI_API_KEY. Uso: python herramientas/escena_gemini.py carpeta_destino
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
PAUSA = 22  # segundos entre pedidos, para no pasar el límite gratis por minuto

ESTILOS = {
    "neuron": ("Actuá como un profesor de unos 40 años, muy humano y natural, cansado y sarcástico, "
               "que ya explicó esto mil veces. Español latinoamericano neutro, sin ningún acento regional, ritmo conversado, con suspiros. Decí:"),
    "nyx": ("Actuá como una chica punk de 20 años, aburrida, sobradora y burlona, nada impresionada. "
            "Voz joven y natural, español latinoamericano neutro, sin ningún acento regional, arrastrando un poco las palabras. Decí:"),
    "glip": ("Actuá como un extraterrestre pequeño y curioso, con voz muy aguda, rápida y entusiasta, "
             "que habla español latinoamericano neutro pero con un tono raro de otro planeta. Exagerado y caricaturesco. Decí:"),
    "bruno": ("Actuá como un adolescente de 16 años muy nervioso y asustadizo que se hace el valiente. "
              "Voz joven que se quiebra cuando grita, español latinoamericano neutro, sin ningún acento regional, muy exagerado, como dibujito animado. Decí:"),
}

# Glip se pasa por un filtro que le sube el tono, para que suene marciano.
FILTROS = {"glip": "asetrate=24000*1.35,aresample=24000,atempo=0.9"}


def sintetizar(personaje: str, texto: str, voz: str, destino: Path) -> None:
    cuerpo = {
        "contents": [{"parts": [{"text": f"{ESTILOS[personaje]} {texto}"}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voz}}},
        },
    }
    ultimo = None
    for modelo in MODELOS:
        for intento in range(2):
            r = requests.post(URL.format(modelo), json=cuerpo, timeout=120,
                              headers={"x-goog-api-key": os.environ["GEMINI_API_KEY"]})
            if r.status_code == 429:
                print(modelo, "429:", r.text[:500], flush=True)
                if "PerDay" in r.text:
                    break  # se acabó la cuota del día de este modelo
                time.sleep(40)
                continue
            if r.ok:
                datos = r.json()["candidates"][0]["content"]["parts"][0]["inlineData"]["data"]
                pcm = destino.with_suffix(".pcm")
                pcm.write_bytes(base64.b64decode(datos))
                filtro = ["-af", FILTROS[personaje]] if personaje in FILTROS else []
                subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "s16le", "-ar", "24000", "-ac", "1",
                                "-i", str(pcm), *filtro, "-b:a", "96k", str(destino)], check=True)
                pcm.unlink()
                return
            ultimo = f"{modelo}: {r.status_code} {r.text[:300]}"
            break
    raise RuntimeError(ultimo)


VOCES = {"neuron": "Iapetus", "nyx": "Despina", "glip": "Puck", "bruno": "Achird"}

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


def main(destino: Path) -> None:
    destino.mkdir(parents=True, exist_ok=True)
    partes = []
    for i, (personaje, linea) in enumerate(ESCENA, 1):
        parte = destino / f"{i:02d}-{personaje}.mp3"
        try:
            sintetizar(personaje, linea, VOCES[personaje], parte)
            partes.append(parte)
            print(i, personaje, "ok")
        except Exception as e:  # una línea que falla no frena al resto
            print(i, personaje, "FALLÓ:", e)
        time.sleep(PAUSA)
    if partes:
        lista = destino / "_lista.txt"
        lista.write_text("".join(f"file '{p.name}'\n" for p in partes))
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lista),
                        "-b:a", "96k", str(destino / "escena-luna.mp3")], check=True, cwd=destino)
        lista.unlink()


main(Path(sys.argv[1]))
