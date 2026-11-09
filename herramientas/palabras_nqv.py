"""Tiempos por palabra de cada voz (faster-whisper). Uso: python herramientas/palabras_nqv.py carpeta_mp3 destino"""

import json
import sys
from pathlib import Path

from faster_whisper import WhisperModel

origen, destino = Path(sys.argv[1]), Path(sys.argv[2])
destino.mkdir(parents=True, exist_ok=True)
modelo = WhisperModel("medium", compute_type="int8")
for mp3 in sorted(origen.glob("*.mp3")):
    segs, _ = modelo.transcribe(str(mp3), language="es", word_timestamps=True, vad_filter=False)
    palabras = [{"w": w.word.strip(), "d": round(w.start, 3), "h": round(w.end, 3)} for s in segs for w in s.words]
    (destino / f"{mp3.stem}.json").write_text(json.dumps(palabras, ensure_ascii=False, indent=0))
    print(mp3.name, len(palabras), "palabras", flush=True)
