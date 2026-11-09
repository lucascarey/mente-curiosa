"""Tiempos por palabra de cada voz (faster-whisper). Uso: python herramientas/palabras_nqv.py carpeta_mp3 destino"""

import json
import subprocess
import sys
from pathlib import Path

import numpy as np
from faster_whisper import WhisperModel

origen, destino = Path(sys.argv[1]), Path(sys.argv[2])
destino.mkdir(parents=True, exist_ok=True)
modelo = WhisperModel("medium", compute_type="int8")
for mp3 in sorted(origen.glob("*.mp3")):
    crudo = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(mp3), "-f", "s16le", "-ac", "1", "-ar", "16000", "-"],
                           check=True, capture_output=True).stdout
    audio = np.frombuffer(crudo, np.int16).astype(np.float32) / 32768.0
    segs, _ = modelo.transcribe(audio, language="es", word_timestamps=True, vad_filter=False)
    palabras = [{"w": w.word.strip(), "d": round(w.start, 3), "h": round(w.end, 3)} for s in segs for w in s.words]
    (destino / f"{mp3.stem}.json").write_text(json.dumps(palabras, ensure_ascii=False, indent=0))
    print(mp3.name, len(palabras), "palabras", flush=True)
