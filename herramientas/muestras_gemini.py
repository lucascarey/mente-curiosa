"""Genera voces candidatas para cada personaje con las voces de Gemini, para elegir de oído.

Necesita la variable GEMINI_API_KEY. Uso: python herramientas/muestras_gemini.py carpeta_destino
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
               "que ya explicó esto mil veces. Español latino neutro, ritmo conversado, con suspiros. Decí:"),
    "nyx": ("Actuá como una chica punk de 20 años, aburrida, sobradora y burlona, nada impresionada. "
            "Voz joven y natural, español latino neutro, arrastrando un poco las palabras. Decí:"),
    "glip": ("Actuá como un extraterrestre pequeño y curioso, con voz muy aguda, rápida y entusiasta, "
             "que pronuncia el español con acento raro de otro planeta. Exagerado y caricaturesco. Decí:"),
    "bruno": ("Actuá como un adolescente de 16 años muy nervioso y asustadizo que se hace el valiente. "
              "Voz joven que se quiebra cuando grita, español latino neutro, muy exagerado, como dibujito animado. Decí:"),
}

FRASES = {
    "neuron": "[suspira] Uno, Glip. Uno. Pero el pulpo tiene tres corazones. Les juro que es simple: "
              "dos mueven la sangre por las branquias y uno por el resto del cuerpo.",
    "nyx": "Ajá. ¿Y eso quién lo dijo? [se ríe con burla] Tranqui, Bruno, que los pulpos no muerden. Bueno, algunos sí.",
    "glip": "¡Pregunta para mi informe! ¿Cuántos corazones tienen los humanos? "
            "Anoto: los humanos se asustan de la sangre azul.",
    "bruno": "¿Tres? ¿Y si se le rompen los tres juntos? [grita] ¡¿SANGRE AZUL?! "
             "[nervioso] ¡Yo no me asusté! Tranqui, yo no tengo miedo.",
}

CANDIDATAS = {
    "neuron": ["Charon", "Algieba", "Iapetus"],
    "nyx": ["Leda", "Despina", "Laomedeia"],
    "glip": ["Puck", "Zephyr", "Fenrir"],
    "bruno": ["Fenrir", "Puck", "Achird"],
}

# Glip se pasa por un filtro que le sube el tono, para que suene marciano.
FILTROS = {"glip": "asetrate=24000*1.35,aresample=24000,atempo=0.9"}

ESCENA = [
    ("glip", "¡Pregunta para mi informe! ¿Cuántos corazones tienen los humanos?"),
    ("neuron", "[suspira] Uno, Glip. Uno. Pero el pulpo tiene tres."),
    ("bruno", "¿Tres? ¿Y si se le rompen los tres juntos?"),
    ("neuron", "Dos mueven la sangre por las branquias y uno por el resto del cuerpo."),
    ("neuron", "Ah, y su sangre es azul."),
    ("bruno", "[grita] ¡¿AZUL?!"),
    ("glip", "Anoto: los humanos se asustan de la sangre azul."),
    ("bruno", "[ofendido] ¡Yo no me asusté!"),
    ("neuron", "Mandáselo a alguien con el corazón roto. El pulpo tiene repuesto."),
]


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
        for intento in range(3):
            r = requests.post(URL.format(modelo), json=cuerpo, timeout=120,
                              headers={"x-goog-api-key": os.environ["GEMINI_API_KEY"]})
            if r.status_code == 429:
                time.sleep(60)
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


def main(destino: Path) -> None:
    destino.mkdir(parents=True, exist_ok=True)
    for personaje, voces in CANDIDATAS.items():
        for i, voz in enumerate(voces, 1):
            try:
                sintetizar(personaje, FRASES[personaje], voz, destino / f"{personaje}-{i}-{voz.lower()}.mp3")
                print(personaje, i, voz)
            except Exception as e:  # una voz que falla no frena al resto
                print(personaje, i, voz, "FALLÓ:", e)
            time.sleep(PAUSA)
    partes = []
    for i, (personaje, linea) in enumerate(ESCENA):
        parte = destino / f"_escena{i}.mp3"
        try:
            sintetizar(personaje, linea, CANDIDATAS[personaje][0], parte)
            partes.append(parte)
        except Exception as e:
            print("escena", i, "FALLÓ:", e)
        time.sleep(PAUSA)
    if partes:
        lista = destino / "_lista.txt"
        lista.write_text("".join(f"file '{p.name}'\n" for p in partes))
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lista),
                        "-b:a", "96k", str(destino / "escena-pulpos.mp3")], check=True, cwd=destino)
        for p in [*partes, lista]:
            p.unlink()


main(Path(sys.argv[1]))
