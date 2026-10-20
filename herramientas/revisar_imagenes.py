"""Hoja de revisión: qué imagen le toca a cada frase de cada guion, sin armar el video.

Uso: python herramientas/revisar_imagenes.py carpeta_destino [prefijo_de_guion]
Deja un JPG por guion con cada toma: la imagen (o el dibujo pedido, o el gráfico) y la frase que se dice.
"""

import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from mc import config, guion, imagenes  # noqa: E402
from mc.guion import normalizar  # noqa: E402

ANCHO, ALTO_IMG, ALTO_TEXTO, COLUMNAS = 420, 300, 150, 4


def frases(parte: guion.Parte) -> list[str]:
    """El pedazo de texto que se dice durante cada toma."""
    palabras = parte.texto_limpio.split()
    normales = [normalizar(w) for w in palabras]
    cortes, j = [0], 0
    for plano in parte.planos[1:]:
        desde = normalizar(plano["desde"])
        j = next((k for k in range(j + 1, len(normales)) if normales[k] == desde), j)
        cortes.append(j)
    cortes.append(len(palabras))
    return [" ".join(palabras[a:b]) for a, b in zip(cortes, cortes[1:])]


def envolver(texto: str, fuente, ancho: int) -> list[str]:
    lineas, actual = [], ""
    for palabra in texto.split():
        prueba = f"{actual} {palabra}".strip()
        if fuente.getlength(prueba) > ancho and actual:
            lineas.append(actual)
            actual = palabra
        else:
            actual = prueba
    return lineas + [actual] if actual else lineas


def hoja(g: guion.Guion, destino: Path) -> None:
    articulo = imagenes.del_articulo(g.fuente)
    usados: set[str] = set()
    tomas = [(plano, frase) for parte in g.partes for plano, frase in zip(parte.planos, frases(parte))]
    filas = (len(tomas) + COLUMNAS - 1) // COLUMNAS
    lienzo = Image.new("RGB", (ANCHO * COLUMNAS, (ALTO_IMG + ALTO_TEXTO) * filas), "black")
    dibujo = ImageDraw.Draw(lienzo)
    letra = ImageFont.truetype(str(config.FUENTES / "Inter.ttf"), 22)
    chica = ImageFont.truetype(str(config.FUENTES / "JetBrainsMono.ttf"), 16)
    with tempfile.TemporaryDirectory() as tmp:
        for n, (plano, frase) in enumerate(tomas):
            x, y = (n % COLUMNAS) * ANCHO, (n // COLUMNAS) * (ALTO_IMG + ALTO_TEXTO)
            tipo = plano["visual"].get("tipo", "ilustracion")
            nota = ""
            if tipo not in ("ilustracion", "foto", "emoji"):
                nota = f"GRÁFICO {tipo}"
            elif plano.get("foto") and (encontrada := imagenes.foto(plano["foto"], usados, articulo)):
                usados.add(encontrada[0])
                archivo = Path(tmp) / f"{n}.jpg"
                imagenes.descargar(encontrada[0], archivo)
                img = Image.open(archivo).convert("RGB")
                img.thumbnail((ANCHO - 10, ALTO_IMG - 10))
                lienzo.paste(img, (x + 5, y + 5))
                nota = f"FOTO {plano['foto']} | {encontrada[0].split('/')[-1][:60]}"
            else:
                nota = f"DIBUJO {plano['dibujo']}"
                if plano.get("foto"):
                    nota = f"SIN FOTO para '{plano['foto']}' -> " + nota
            if not nota.startswith("FOTO"):
                for k, linea in enumerate(envolver(nota, chica, ANCHO - 30)[:12]):
                    dibujo.text((x + 15, y + 15 + k * 22), linea, font=chica, fill="#4FC3F7")
            else:
                dibujo.text((x + 8, y + ALTO_IMG - 22), nota[:52], font=chica, fill="#4FC3F7")
            for k, linea in enumerate(envolver(f"{n + 1}. {frase}", letra, ANCHO - 20)[:5]):
                dibujo.text((x + 10, y + ALTO_IMG + 8 + k * 28), linea, font=letra, fill="white")
    lienzo.save(destino, quality=85)
    print(destino)


if __name__ == "__main__":
    carpeta = Path(sys.argv[1])
    carpeta.mkdir(parents=True, exist_ok=True)
    prefijo = sys.argv[2] if len(sys.argv) > 2 else ""
    for archivo in sorted(config.PENDIENTES.glob(f"{prefijo}*.json")):
        hoja(guion.cargar(archivo), carpeta / f"{archivo.stem}.jpg")
