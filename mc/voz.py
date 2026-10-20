"""Voz IA gratuita con edge-tts. Devuelve el audio y el tiempo de cada palabra."""

import asyncio
import re
import subprocess
from dataclasses import dataclass
from pathlib import Path

from . import config
from .guion import PALABRA, Parte, normalizar


@dataclass
class Palabra:
    texto: str
    inicio: float  # segundos desde el comienzo del video
    fin: float
    destacada: bool
    corte: bool = False  # termina una frase: el subtítulo cambia de pantalla


def duracion(ruta: Path) -> float:
    salida = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(ruta)],
        capture_output=True, text=True, check=True,
    )
    return float(salida.stdout.strip())


async def _sintetizar(texto: str, destino: Path) -> list[tuple[str, float, float]]:
    import edge_tts

    com = edge_tts.Communicate(texto, config.VOZ, rate=config.VELOCIDAD_VOZ, pitch=config.TONO_VOZ,
                                 boundary="WordBoundary")
    tiempos = []
    with destino.open("wb") as f:
        async for trozo in com.stream():
            if trozo["type"] == "audio":
                f.write(trozo["data"])
            elif trozo["type"] == "WordBoundary":
                inicio = trozo["offset"] / 10_000_000
                tiempos.append((trozo["text"], inicio, inicio + trozo["duration"] / 10_000_000))
    return tiempos


def _sintetizar_mock(texto: str, destino: Path) -> list[tuple[str, float, float]]:
    palabras = PALABRA.findall(texto)
    paso = 0.33
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono",
         "-t", f"{len(palabras) * paso + 0.2:.2f}", "-c:a", "libmp3lame", str(destino)],
        check=True,
    )
    return [(p, i * paso, (i + 1) * paso) for i, p in enumerate(palabras)]


def _cortes(texto: str) -> list[str]:
    """Palabras que van justo antes de un signo de puntuación, en orden."""
    return [normalizar(m.group(1)) for m in re.finditer(r"([\wáéíóúüñÁÉÍÓÚÜÑ]+)[.,;:!?]", texto)]


def generar(partes: list[Parte], carpeta: Path) -> tuple[Path, list[Palabra], list[float]]:
    """Genera la voz de cada parte, las une y devuelve (audio, palabras, duración de cada parte)."""
    carpeta.mkdir(parents=True, exist_ok=True)
    palabras: list[Palabra] = []
    duraciones: list[float] = []
    archivos: list[Path] = []
    silencio = carpeta / "silencio.mp3"
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono",
         "-t", str(config.PAUSA_ENTRE_PARTES), "-c:a", "libmp3lame", str(silencio)],
        check=True,
    )
    reloj = 0.0
    for i, parte in enumerate(partes):
        audio = carpeta / f"parte{i}.mp3"
        if config.MOCK:
            tiempos = _sintetizar_mock(parte.texto_limpio, audio)
        else:
            tiempos = asyncio.run(_sintetizar(parte.texto_limpio, audio))
        destacadas = parte.destacadas
        cortes = _cortes(parte.texto_limpio)
        for texto, ini, fin in tiempos:
            corte = bool(cortes) and cortes[0] == normalizar(texto)
            if corte:
                cortes.pop(0)
            palabras.append(Palabra(texto, reloj + ini, reloj + fin, normalizar(texto) in destacadas, corte))
        if palabras:
            palabras[-1].corte = True
        largo = duracion(audio) + config.PAUSA_ENTRE_PARTES
        duraciones.append(largo)
        archivos += [audio, silencio]
        reloj += largo

    lista = carpeta / "lista.txt"
    lista.write_text("".join(f"file '{a.resolve()}'\n" for a in archivos))
    final = carpeta / "voz.m4a"
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(lista),
         "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-ac", "2", str(final)],
        check=True,
    )
    return final, palabras, duraciones
