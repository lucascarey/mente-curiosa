"""Genera el audio del primer \"¿Qué pasaría si...?\" (la Luna) con las voces elegidas de Gemini.

Usa diálogo multi-speaker (2 voces por pedido) para gastar poca cuota gratis. Necesita la variable GEMINI_API_KEY. Uso: python herramientas/escena_gemini.py carpeta_destino
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


NOMBRES = {"neuron": "Neuron", "nyx": "Nyx", "glip": "Glip", "bruno": "Bruno"}


def configurar(bloque: list) -> dict:
    """Arma el pedido: una voz sola, o diálogo multi-speaker si hay dos personajes (un solo pedido de cuota)."""
    hablan = list(dict.fromkeys(p for p, _ in bloque))
    if len(hablan) == 1:
        texto = f"{ESTILOS[hablan[0]]} " + " ".join(linea for _, linea in bloque)
        voz = {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": VOCES[hablan[0]]}}}
    else:
        reglas = "\n".join(f"{NOMBRES[p]}: {ESTILOS[p].removesuffix(' Decí:')}" for p in hablan)
        guion = "\n".join(f"{NOMBRES[p]}: {linea}" for p, linea in bloque)
        texto = f"Leé esta conversación. Cómo habla cada uno:\n{reglas}\n\nConversación:\n{guion}"
        voz = {"multiSpeakerVoiceConfig": {"speakerVoiceConfigs": [
            {"speaker": NOMBRES[p], "voiceConfig": {"prebuiltVoiceConfig": {"voiceName": VOCES[p]}}} for p in hablan]}}
    return {
        "contents": [{"parts": [{"text": texto}]}],
        "generationConfig": {"responseModalities": ["AUDIO"], "speechConfig": voz},
    }


def sintetizar(bloque: list, destino: Path) -> None:
    cuerpo = configurar(bloque)
    ultimo = None
    for modelo in MODELOS:
        for intento in range(2):
            r = requests.post(URL.format(modelo), json=cuerpo, timeout=300,
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
                personaje = bloque[0][0]
                filtro = ["-af", FILTROS[personaje]] if personaje in FILTROS else []
                subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "s16le", "-ar", "24000", "-ac", "1",
                                "-i", str(pcm), *filtro, "-b:a", "96k", str(destino)], check=True)
                pcm.unlink()
                return
            ultimo = f"{modelo}: {r.status_code} {r.text[:300]}"
            print(ultimo, flush=True)
            break
    raise RuntimeError(ultimo)


def agrupar(escena: list) -> list:
    """Junta líneas seguidas en bloques de hasta 2 personajes. Glip va siempre solo, porque su filtro de tono
    se aplica a todo el audio del pedido."""
    bloques = []
    for personaje, linea in escena:
        actual = bloques[-1] if bloques else None
        hablan = {p for p, _ in actual} if actual else set()
        if (actual and personaje not in FILTROS and not hablan & FILTROS.keys()
                and len(hablan | {personaje}) <= 2):
            actual.append((personaje, linea))
        else:
            bloques.append([(personaje, linea)])
    return bloques


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
    bloques = agrupar(ESCENA)
    print(len(bloques), "pedidos a Gemini", flush=True)
    for i, bloque in enumerate(bloques, 1):
        parte = destino / f"{i:02d}-{'-'.join(dict.fromkeys(p for p, _ in bloque))}.mp3"
        try:
            sintetizar(bloque, parte)
            partes.append(parte)
            print(i, parte.name, "ok", flush=True)
        except Exception as e:  # un bloque que falla no frena al resto
            print(i, parte.name, "FALLÓ:", e, flush=True)
        if i < len(bloques):
            time.sleep(PAUSA)
    if partes:
        lista = destino / "_lista.txt"
        lista.write_text("".join(f"file '{p.name}'\n" for p in partes))
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lista),
                        "-b:a", "96k", str(destino / "escena-luna.mp3")], check=True, cwd=destino)
        lista.unlink()


main(Path(sys.argv[1]))
