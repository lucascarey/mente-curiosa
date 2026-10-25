"""Genera las voces de un guion de Nada Que Ver con Gemini.

Usa diálogo multi-speaker (2 voces por pedido) para gastar poca cuota gratis. Necesita la variable GEMINI_API_KEY.
Uso: python -m nqv.voces guion.json carpeta_destino [carpeta_anterior]
Si se pasa la carpeta de una corrida anterior, los bloques con el mismo texto se reutilizan sin gastar cuota.
"""

import base64
import json
import os
import subprocess
import sys
import time
from pathlib import Path

import requests

MODELOS = ("gemini-3.1-flash-tts-preview", "gemini-2.5-flash-preview-tts")
URL = "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent"
PAUSA = 22  # segundos entre pedidos, para no pasar el límite gratis por minuto

# Lucas (2026-10-22): los tonos están bien, pero tienen que sonar más humanos y menos IA. Neurón queda como está.
HUMANO = (" Que suene a una persona real grabada hablando, no a un locutor ni a una voz sintética: ritmo irregular, "
          "respiraciones, pausas cortas donde se piensa, alguna palabra estirada o atropellada, y la entonación "
          "de una charla casual entre amigos. ")

ESTILOS = {
    "neuron": ("Actuá como el protagonista carismático de una película: un profesor genio, seguro de sí mismo y canchero, "
               "con energía y entusiasmo exagerado, voz masculina firme y clara de tono medio (no demasiado grave), "
               "proyectada y fuerte, con un toque de ironía simpática. Ritmo ágil, un poco rápido, sin pausas largas. "
               "Español latinoamericano neutro, sin ningún acento regional. Decí:"),
    "nyx": ("Actuá como una chica punk de 20 años, aburrida, sobradora y burlona, nada impresionada. "
            "Voz joven y natural, español latinoamericano neutro, sin ningún acento regional, arrastrando un poco las palabras." + HUMANO + "Decí:"),
    "glip": ("Actuá como un extraterrestre pequeño y curioso, con voz muy aguda, rápida y entusiasta, "
             "que habla español latinoamericano neutro pero con un tono raro de otro planeta. Exagerado y caricaturesco." + HUMANO + "Decí:"),
    "bruno": ("Actuá como un adolescente de 16 años en pánico: alarmado, acelerado y nervioso, que se hace el valiente. "
              "Habla rápido y agudo, con energía alta, como si fuera una emergencia; NUNCA triste, quejoso ni llorón. "
              "Voz joven que se quiebra cuando grita, español latinoamericano neutro, sin ningún acento regional, "
              "MUY exagerado y teatral, como dibujito animado: grita, chilla y se le escapan gallitos en los momentos de "
              "susto, y cuando se calma se ríe nervioso." + HUMANO + "Decí:"),
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
        texto = f"Leé esta conversación como una charla real entre personas, no como una lectura. Cómo habla cada uno:\n{reglas}\n\nConversación:\n{guion}"
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


VOCES = {"neuron": "Algenib", "nyx": "Despina", "glip": "Puck", "bruno": "Achird"}

def generar(escena: list[tuple[str, str]], destino: Path, anterior: Path | None = None) -> Path:
    """Genera las voces de la escena en destino/voces.mp3. Si un bloque falla, corta: un video sin una parte
    del diálogo no sirve."""
    destino.mkdir(parents=True, exist_ok=True)
    partes = []
    bloques = agrupar(escena)
    print(len(bloques), "pedidos a Gemini", flush=True)
    for i, bloque in enumerate(bloques, 1):
        parte = destino / f"{i:02d}-{'-'.join(dict.fromkeys(p for p, _ in bloque))}.mp3"
        texto = json.dumps([bloque, configurar(bloque)], ensure_ascii=False)  # cambia si cambia el texto o el estilo
        previo = anterior / parte.name if anterior else None
        if previo and previo.exists() and previo.with_suffix(".txt").exists() \
                and previo.with_suffix(".txt").read_text() == texto:
            parte.write_bytes(previo.read_bytes())
            parte.with_suffix(".txt").write_text(texto)
            partes.append(parte)
            print(i, parte.name, "reutilizado", flush=True)
            continue
        sintetizar(bloque, parte)
        parte.with_suffix(".txt").write_text(texto)
        partes.append(parte)
        print(i, parte.name, "ok", flush=True)
        if i < len(bloques):
            time.sleep(PAUSA)
    lista = destino / "_lista.txt"
    lista.write_text("".join(f"file '{p.name}'\n" for p in partes))
    salida = destino / "voces.mp3"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lista),
                    "-b:a", "96k", str(salida)], check=True, cwd=destino)
    lista.unlink()
    return salida


if __name__ == "__main__":
    from .guion import cargar
    generar(cargar(Path(sys.argv[1])).escena_voz, Path(sys.argv[2]), Path(sys.argv[3]) if len(sys.argv) > 3 else None)
