"""Arma el video prototipo de "¿Qué pasaría si la Luna desapareciera?" con el elenco de Nada Que Ver.

Uso: python herramientas/prototipo_video.py audio.mp3 tiempos.json salida.mp4
`tiempos.json` es una lista con [inicio, fin] en segundos de cada línea de ESCENA, en orden.
Arriba va la foto de lo que se dice (sacada de Wikimedia Commons), en el medio el subtítulo y abajo los
personajes: el que habla adelante, a color y moviéndose con su voz; los demás más chicos y apagados.
Es un prototipo aparte: no toca el pipeline de publicación (mc/).
"""

import json
import subprocess
import sys
import textwrap
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

RAIZ = Path(__file__).resolve().parent.parent
ELENCO = RAIZ / "assets" / "elenco"
FOTOS = RAIZ / "assets" / "prototipo-luna"
FUENTE = RAIZ / "assets" / "fonts" / "Inter.ttf"
ANCHO, ALTO, FPS = 1080, 1920, 30
FONDO = (14, 12, 32)
COLORES = {"neuron": (110, 210, 235), "nyx": (190, 120, 255), "glip": (190, 235, 70), "bruno": (255, 90, 80)}
NOMBRES = {"neuron": "NEURÓN", "nyx": "NYX", "glip": "GLIP", "bruno": "BRUNO"}
TITULO = "¿QUÉ PASARÍA SI LA LUNA DESAPARECIERA?"

# (quién habla, texto en pantalla, fotos, poses {personaje: número de pose})
ESCENA = [
    ("glip", "¿Qué pasaría si mañana la Luna desapareciera?", ["luna-1"],
     {"glip": 5, "bruno": 6, "neuron": 4}),
    ("bruno", "Fin del mundo. Tsunamis gigantes, el mar se sale, todo.", ["ola-gigante-5"],
     {"glip": 7, "bruno": 7, "neuron": 7}),
    ("neuron", "Nada de eso. Esa noche no pasaría nada dramático. Los cambios vendrían de a poco.", ["luna-6"],
     {"glip": 4, "bruno": 6, "neuron": 6}),
    ("neuron", "Primero, las mareas. Hoy las mueve sobre todo la Luna. Sin ella quedaría solo el Sol, "
               "y serían un tercio de lo que son.", ["mareas-1", "mareas-2"],
     {"glip": 11, "bruno": 6, "neuron": 1}),
    ("bruno", "¿Y las olas? ¿Se termina el surf?", ["surf-1"],
     {"glip": 5, "bruno": 11, "neuron": 4}),
    ("neuron", "No, las olas las hace el viento. Eso sigue igual.", ["surf-6"],
     {"glip": 2, "bruno": 6, "neuron": 2}),
    ("neuron", "Segundo, las noches serían mucho más oscuras, y los animales que se guían por la Luna se "
               "desorientarían. Hay corales que se reproducen todos a la vez después de la luna llena.",
     ["noche-oscura-2", "corales-3"], {"glip": 7, "bruno": 5, "neuron": 3}),
    ("neuron", "Y lo más importante: la Luna mantiene estable la inclinación de la Tierra. Sin ella, el eje se "
               "tambalearía y las estaciones y el clima cambiarían por completo. Eso sí, en millones de años.",
     ["eje-3", "estaciones-6"], {"glip": 11, "bruno": 12, "neuron": 11}),
    ("bruno", "O sea que me asusté con millones de años de anticipación.", ["luna-2"],
     {"glip": 10, "bruno": 10, "neuron": 7}),
    ("neuron", "La Luna no es decoración. Es lo que mantiene estable al planeta.", ["tierra-luna-1"],
     {"glip": 9, "bruno": 3, "neuron": 9}),
]
DIAGRAMAS = {"eje-3", "estaciones-6"}
ORDEN = ["bruno", "neuron", "glip"]  # de izquierda a derecha

FOTO_CAJA = (60, 250, ANCHO - 60, 1050)  # x0, y0, x1, y1
SUB_Y = 1110
PISO = ALTO + 40  # los pies quedan apenas fuera de cuadro


def fuente(tam: int, peso: int = 800) -> ImageFont.FreeTypeFont:
    f = ImageFont.truetype(str(FUENTE), tam)
    try:
        f.set_variation_by_axes([32, peso])  # tamaño óptico, peso
    except Exception:
        pass
    return f


def cubrir(im: Image.Image, w: int, h: int, zoom: float) -> Image.Image:
    escala = max(w / im.width, h / im.height) * zoom
    im = im.resize((round(im.width * escala), round(im.height * escala)), Image.LANCZOS)
    x, y = (im.width - w) // 2, (im.height - h) // 2
    return im.crop((x, y, x + w, y + h))


def esquinas(w: int, h: int, r: int) -> Image.Image:
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, w - 1, h - 1), r, fill=255)
    return m


def volumen(audio: Path, total: int) -> np.ndarray:
    crudo = subprocess.run(["ffmpeg", "-v", "error", "-i", str(audio), "-f", "s16le", "-ac", "1", "-ar", "24000", "-"],
                           capture_output=True, check=True).stdout
    s = np.frombuffer(crudo, np.int16).astype(np.float32) / 32768
    paso = 24000 // FPS
    rms = np.array([np.sqrt(np.mean(s[i * paso:(i + 1) * paso] ** 2)) if i * paso < len(s) else 0 for i in range(total)])
    rms = np.convolve(rms, np.ones(3) / 3, mode="same")
    return np.clip(rms / (np.percentile(rms[rms > 0], 95) + 1e-6), 0, 1)


def trozos(texto: str) -> list[str]:
    """Parte el texto en pantallas de hasta dos renglones."""
    renglones = textwrap.wrap(texto, 26)
    return ["\n".join(renglones[i:i + 2]) for i in range(0, len(renglones), 2)]


def main(audio: Path, tiempos_json: Path, salida: Path) -> None:
    tiempos = json.loads(tiempos_json.read_text())
    duracion = tiempos[-1][1] + 1.2
    total = int(duracion * FPS)
    vol = volumen(audio, total)
    creditos = json.loads((FOTOS / "creditos.json").read_text())

    fotos = {n: Image.open(FOTOS / f"{n}.jpg").convert("RGB") for _, _, fs, _ in ESCENA for n in fs}
    poses = {}
    for _, _, _, ps in ESCENA:
        for p, k in ps.items():
            poses.setdefault((p, k), Image.open(ELENCO / p / f"{k:02d}.png").convert("RGBA"))

    fw, fh = FOTO_CAJA[2] - FOTO_CAJA[0], FOTO_CAJA[3] - FOTO_CAJA[1]
    mascara_foto = esquinas(fw, fh, 36)
    f_titulo, f_marca = fuente(46, 900), fuente(30, 700)
    f_sub, f_nombre, f_credito = fuente(64, 850), fuente(34, 900), fuente(18, 500)

    # fondo fijo: degradé con el título
    base = Image.new("RGB", (ANCHO, ALTO), FONDO)
    grad = np.linspace(0, 1, ALTO)[:, None, None]
    base = Image.fromarray((np.array(FONDO) * (1 - grad * 0.6) + np.array((40, 20, 70)) * grad * 0.6).astype(np.uint8)
                           .repeat(ANCHO, axis=1))
    d = ImageDraw.Draw(base)
    d.text((ANCHO // 2, 120), TITULO, font=f_titulo, fill="white", anchor="mm")
    d.text((ANCHO // 2, 185), "NADA QUE VER", font=f_marca, fill=(190, 120, 255), anchor="mm")

    ff = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{ANCHO}x{ALTO}",
                           "-r", str(FPS), "-i", "-", "-i", str(audio), "-map", "0:v", "-map", "1:a", "-af", "apad",
                           "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
                           "-c:a", "aac", "-b:a", "160k", "-t", f"{total / FPS:.3f}", "-movflags", "+faststart", str(salida)],
                          stdin=subprocess.PIPE)
    for n in range(total):
        t = n / FPS
        i = max([k for k, (ini, _) in enumerate(tiempos) if ini <= t + 0.05] or [0])
        ini, fin = tiempos[i]
        quien, texto, nombres_foto, ps = ESCENA[i]
        fin = tiempos[i + 1][0] if i + 1 < len(tiempos) else fin
        avance = min(1, max(0, (t - ini) / max(0.1, fin - ini)))
        cuadro = base.copy()

        # foto: si hay dos, la segunda entra en la mitad de la línea; zoom lento
        idx = min(len(nombres_foto) - 1, int(avance * len(nombres_foto)))
        nombre = nombres_foto[idx]
        local = (avance * len(nombres_foto)) - idx
        if nombre in DIAGRAMAS:  # los diagramas se ven enteros, sin recortar
            foto = Image.new("RGB", (fw, fh), (0, 0, 0))
            d_im = fotos[nombre].copy()
            d_im.thumbnail((fw, fh))
            d_im = d_im.resize((int(d_im.width * (1 + 0.04 * local)), int(d_im.height * (1 + 0.04 * local))))
            foto.paste(d_im, ((fw - d_im.width) // 2, (fh - d_im.height) // 2))
        else:
            foto = cubrir(fotos[nombre], fw, fh, 1.0 + 0.06 * local)
        cuadro.paste(foto, FOTO_CAJA[:2], mascara_foto)
        dc = ImageDraw.Draw(cuadro)
        credito = creditos[f"{nombre}.jpg"].removeprefix("File:").rsplit(".", 1)[0]
        dc.text((FOTO_CAJA[2] - 16, FOTO_CAJA[3] - 14), f"Wikimedia Commons · {credito[:45]}",
                font=f_credito, fill=(230, 230, 230), anchor="rd", stroke_width=2, stroke_fill="black")
        if nombre.startswith("mareas"):
            rotulo = "MAREA ALTA" if nombre.endswith("1") else "MAREA BAJA"
            dc.rounded_rectangle((FOTO_CAJA[0] + 24, FOTO_CAJA[1] + 24, FOTO_CAJA[0] + 300, FOTO_CAJA[1] + 90), 18,
                                 fill=(0, 0, 0))
            dc.text((FOTO_CAJA[0] + 162, FOTO_CAJA[1] + 57), rotulo, font=f_nombre, fill="white", anchor="mm")

        # personajes: oyentes atrás y apagados, el que habla adelante y rebotando con la voz
        # whisper a veces corta el final de la línea: el subtítulo sigue hasta que arranca la siguiente
        hablando = i + 1 < len(tiempos) or t < fin + 0.5
        lugares = {p: x for p, x in zip(ORDEN, (230, 540, 850))}
        for p in sorted(ps, key=lambda p: p == quien):
            pose = poses[(p, ps[p])]
            habla = p == quien and hablando
            alto = 640 if p == quien else 540
            rebote = 1 + (0.035 * vol[n] if habla else 0.008 * np.sin(t * 2 + ORDEN.index(p)))
            h = int(alto * rebote)
            w = int(pose.width * h / pose.height)
            im = pose.resize((w, h), Image.LANCZOS)
            if p != quien:
                rgb = ImageEnhance.Brightness(im.convert("RGB")).enhance(0.55)
                rgb.putalpha(im.getchannel("A"))
                im = rgb
            cuadro.paste(im, (lugares[p] - w // 2, PISO - h), im)

        # subtítulo con el nombre de quien habla
        if hablando:
            pantallas = trozos(texto)
            sub = pantallas[min(len(pantallas) - 1, int(avance * len(pantallas)))]
            color = COLORES[quien]
            dc = ImageDraw.Draw(cuadro)
            dc.rounded_rectangle((ANCHO // 2 - 110, SUB_Y - 30, ANCHO // 2 + 110, SUB_Y + 26), 28, fill=color)
            dc.text((ANCHO // 2, SUB_Y), NOMBRES[quien], font=f_nombre, fill=FONDO, anchor="mm")
            dc.multiline_text((ANCHO // 2, SUB_Y + 120), sub, font=f_sub, fill="white", anchor="mm", align="center",
                              spacing=10, stroke_width=7, stroke_fill="black")
        ff.stdin.write(cuadro.tobytes())
    ff.stdin.close()
    ff.wait()


if __name__ == "__main__":
    main(Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]))
