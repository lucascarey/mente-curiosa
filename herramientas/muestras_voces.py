"""Genera la misma frase con cada voz femenina en español de edge-tts, para elegir una de oído.

Uso: python herramientas/muestras_voces.py carpeta_destino
"""

import asyncio
import sys
from pathlib import Path

import edge_tts

FRASE = ("¿Sabías que en Venus un día dura más que un año? Gira tan lento sobre sí mismo "
         "que una vuelta le lleva unos doscientos cuarenta y tres días. Seguime para más datos raros.")
ACENTOS = ("es-AR", "es-MX", "es-US", "es-ES", "es-CO", "es-UY", "es-CL")


async def main(destino: Path) -> None:
    destino.mkdir(parents=True, exist_ok=True)
    voces = [v for v in await edge_tts.list_voices() if v["Gender"] == "Female"
             and (v["Locale"].startswith(ACENTOS) or "Multilingual" in v["ShortName"])]
    for v in voces:
        nombre = v["ShortName"]
        await edge_tts.Communicate(FRASE, nombre).save(str(destino / f"{nombre}.mp3"))
        print(nombre)


asyncio.run(main(Path(sys.argv[1])))
