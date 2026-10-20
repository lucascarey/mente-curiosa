"""Genera la misma frase con cada voz femenina en español de edge-tts, para elegir una de oído.

Uso: python herramientas/muestras_voces.py carpeta_destino
Además arma variantes (VARIANTES) de las voces candidatas con otra velocidad y tono.
"""

import asyncio
import sys
from pathlib import Path

import edge_tts

FRASE = ("¿Sabías que en Venus un día dura más que un año? Gira tan lento sobre sí mismo "
         "que una vuelta le lleva unos doscientos cuarenta y tres días. Seguime para más datos raros.")
# (archivo, voz, velocidad, tono): más rápido y más agudo suena más joven
VARIANTES = [
    ("ava-rapida", "en-US-AvaMultilingualNeural", "+10%", "+0Hz"),
    ("ava-joven", "en-US-AvaMultilingualNeural", "+8%", "+8Hz"),
    ("ava-muy-joven", "en-US-AvaMultilingualNeural", "+12%", "+15Hz"),
    ("emma-joven", "en-US-EmmaMultilingualNeural", "+8%", "+10Hz"),
    ("ximena-joven", "es-ES-XimenaNeural", "+8%", "+10Hz"),
    ("elena-joven", "es-AR-ElenaNeural", "+8%", "+10Hz"),
]
ACENTOS = ("es-AR", "es-MX", "es-US", "es-ES", "es-CO", "es-UY", "es-CL")


async def main(destino: Path) -> None:
    destino.mkdir(parents=True, exist_ok=True)
    voces = [v for v in await edge_tts.list_voices() if v["Gender"] == "Female"
             and (v["Locale"].startswith(ACENTOS) or "Multilingual" in v["ShortName"])]
    for v in voces:
        nombre = v["ShortName"]
        await edge_tts.Communicate(FRASE, nombre).save(str(destino / f"{nombre}.mp3"))
        print(nombre)
    for archivo, nombre, velocidad, tono in VARIANTES:
        await edge_tts.Communicate(FRASE, nombre, rate=velocidad, pitch=tono).save(str(destino / f"variante-{archivo}.mp3"))
        print(archivo)


asyncio.run(main(Path(sys.argv[1])))
