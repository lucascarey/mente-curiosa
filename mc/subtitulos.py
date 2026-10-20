"""Subtítulos grandes estilo TikTok en formato ASS, con palabras clave en amarillo."""

from pathlib import Path

from . import config
from .voz import Palabra

PALABRAS_POR_PANTALLA = 3


def _tiempo(s: float) -> str:
    h, resto = divmod(max(s, 0), 3600)
    m, seg = divmod(resto, 60)
    return f"{int(h)}:{int(m):02d}:{seg:05.2f}"


def _agrupar(palabras: list[Palabra]) -> list[list[Palabra]]:
    grupos, actual = [], []
    for p in palabras:
        actual.append(p)
        if len(actual) == PALABRAS_POR_PANTALLA or p.corte:
            grupos.append(actual)
            actual = []
    if actual:
        grupos.append(actual)
    return grupos


def escribir(palabras: list[Palabra], duracion_total: float, destino: Path) -> Path:
    cabecera = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {config.ANCHO}
PlayResY: {config.ALTO}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,Montserrat ExtraBold,96,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,7,3,5,80,80,0,1
Style: Marca,Montserrat ExtraBold,40,&H66FFFFFF,&H66FFFFFF,&H66000000,&H00000000,0,0,0,0,100,100,0,0,1,2,0,2,40,40,170,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lineas = []
    grupos = _agrupar(palabras)
    for i, grupo in enumerate(grupos):
        inicio = grupo[0].inicio
        # Cada pantalla dura hasta que empieza la siguiente, así no parpadea
        fin = grupos[i + 1][0].inicio if i + 1 < len(grupos) else grupo[-1].fin + 0.4
        texto = " ".join(
            (f"{{\\c{config.AMARILLO}}}{p.texto.upper()}{{\\c{config.BLANCO}}}" if p.destacada else p.texto.upper())
            for p in grupo
        )
        animacion = r"{\fscx85\fscy85\t(0,90,\fscx100\fscy100)}"
        lineas.append(f"Dialogue: 1,{_tiempo(inicio)},{_tiempo(fin)},Sub,,0,0,0,,{animacion}{texto}")
    lineas.append(f"Dialogue: 0,{_tiempo(0)},{_tiempo(duracion_total)},Marca,,0,0,0,,{config.USUARIO}")
    destino.write_text(cabecera + "\n".join(lineas) + "\n", encoding="utf-8")
    return destino
