"""Calcula cuándo empieza y termina cada línea del guion dentro del audio de Gemini (que viene en un solo
archivo por diálogo), transcribiendo con faster-whisper y repartiendo las palabras en orden.

Uso: python herramientas/tiempos_whisper.py audio.mp3 tiempos.json
"""

import json
import re
import sys
from pathlib import Path

from faster_whisper import WhisperModel

sys.path.insert(0, str(Path(__file__).parent))
from prototipo_video import ESCENA  # noqa: E402


def contar(texto: str) -> int:
    return len(re.findall(r"[\wáéíóúüñÁÉÍÓÚÜÑ]+", texto))


def main(audio: Path, salida: Path) -> None:
    modelo = WhisperModel("small", device="cpu", compute_type="int8")
    segmentos, _ = modelo.transcribe(str(audio), language="es", word_timestamps=True)
    palabras = [p for s in segmentos for p in s.words]
    print(len(palabras), "palabras reconocidas", flush=True)
    por_linea = [contar(texto) for _, texto, _, _ in ESCENA]
    total = sum(por_linea)
    tiempos, acumulado = [], 0
    for n in por_linea:
        i = round(acumulado * len(palabras) / total)
        j = max(i, round((acumulado + n) * len(palabras) / total) - 1)
        tiempos.append([round(palabras[i].start, 3), round(palabras[j].end, 3)])
        acumulado += n
    tiempos[0][0] = 0.0
    for k, (ini, fin) in enumerate(tiempos):
        print(k + 1, ini, fin, " ".join(p.word.strip() for p in palabras if ini <= p.start < fin)[:80], flush=True)
    salida.write_text(json.dumps(tiempos))


main(Path(sys.argv[1]), Path(sys.argv[2]))
