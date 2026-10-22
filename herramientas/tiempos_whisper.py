"""Calcula cuándo empieza y termina cada línea del guion dentro del audio de Gemini (que viene en un solo
archivo por diálogo), transcribiendo con faster-whisper y repartiendo las palabras en orden.

Uso: python herramientas/tiempos_whisper.py audio.mp3 tiempos.json
"""

import json
import difflib
import re
import subprocess
import sys
from pathlib import Path

import numpy as np
from faster_whisper import WhisperModel

sys.path.insert(0, str(Path(__file__).parent))
from prototipo_video import ESCENA  # noqa: E402


def normalizar(palabra: str) -> str:
    tabla = str.maketrans("áéíóúü", "aeiouu")
    return re.sub(r"[^a-zñ0-9]", "", palabra.lower().translate(tabla))


def palabras_de(texto: str) -> list[str]:
    return [normalizar(p) for p in re.findall(r"[\wáéíóúüñÁÉÍÓÚÜÑ]+", texto)]


def alinear(lineas: list[str], reconocidas: list[tuple[str, float, float]]) -> list[list[float]]:
    """Empareja las palabras del guion con las que reconoció whisper (en orden) y saca inicio y fin de cada línea.
    Las líneas sin ninguna palabra emparejada se reparten entre sus vecinas."""
    guion = [(k, w) for k, texto in enumerate(lineas) for w in palabras_de(texto)]
    oidas = [normalizar(w) for w, _, _ in reconocidas]
    pareo = difflib.SequenceMatcher(None, [w for _, w in guion], oidas, autojunk=False)
    tiempos: list[list[float | None]] = [[None, None] for _ in lineas]
    for bloque in pareo.get_matching_blocks():
        for d in range(bloque.size):
            k = guion[bloque.a + d][0]
            _, ini, fin = reconocidas[bloque.b + d]
            if tiempos[k][0] is None or ini < tiempos[k][0]:
                tiempos[k][0] = ini
            if tiempos[k][1] is None or fin > tiempos[k][1]:
                tiempos[k][1] = fin
    final = reconocidas[-1][2] if reconocidas else 0.0
    for k in range(len(lineas)):  # huecos: desde el fin de la anterior hasta el inicio de la siguiente
        if tiempos[k][0] is None:
            tiempos[k][0] = tiempos[k - 1][1] if k else 0.0
        if tiempos[k][1] is None:
            siguiente = next((t[0] for t in tiempos[k + 1:] if t[0] is not None), final)
            tiempos[k][1] = siguiente
    for k in range(1, len(lineas)):  # cada línea arranca justo cuando termina la anterior si se pisan
        tiempos[k][0] = max(tiempos[k][0], tiempos[k - 1][1])
        tiempos[k][1] = max(tiempos[k][1], tiempos[k][0] + 0.3)
    tiempos[0][0] = 0.0
    return [[round(a, 3), round(b, 3)] for a, b in tiempos]


def main(audio: Path, salida: Path) -> None:
    modelo = WhisperModel("small", device="cpu", compute_type="int8")
    # se decodifica con ffmpeg: la versión de PyAV que trae faster-whisper a veces no abre el mp3
    crudo = subprocess.run(["ffmpeg", "-v", "error", "-i", str(audio), "-f", "s16le", "-ac", "1", "-ar", "16000", "-"],
                           capture_output=True, check=True).stdout
    muestras = np.frombuffer(crudo, np.int16).astype(np.float32) / 32768
    segmentos, _ = modelo.transcribe(muestras, language="es", word_timestamps=True)
    palabras = [p for s in segmentos for p in s.words]
    print(len(palabras), "palabras reconocidas", flush=True)
    reconocidas = [(p.word, p.start, p.end) for p in palabras]
    tiempos = alinear([texto for _, texto, _, _ in ESCENA], reconocidas)
    for k, (ini, fin) in enumerate(tiempos):
        print(k + 1, ini, fin, " ".join(p.word.strip() for p in palabras if ini <= p.start < fin)[:80], flush=True)
    salida.write_text(json.dumps(tiempos))


main(Path(sys.argv[1]), Path(sys.argv[2]))
