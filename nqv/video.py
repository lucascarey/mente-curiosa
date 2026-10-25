"""Arma un video de Nada Que Ver a partir de un guion (nqv/guion.py), sus fotos y el audio de las voces.

Uso: python -m nqv.video guion.json carpeta_fotos audio.mp3 tiempos.json salida.mp4
`tiempos.json` es una lista con [inicio, fin] en segundos de cada línea, en orden (sale de nqv.tiempos, que deja
también palabras.json al lado). Arriba va la foto de lo que se dice (de Wikimedia Commons), en el medio el
subtítulo y abajo los personajes: el que habla adelante, a color y moviéndose con su voz; el que le contesta,
más chico y apagado.
"""

import json
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFont

from .guion import Guion, Linea, cargar

RAIZ = Path(__file__).resolve().parent.parent
ELENCO = RAIZ / "assets" / "elenco"
FUENTE = RAIZ / "assets" / "fonts" / "Inter.ttf"
ANCHO, ALTO, FPS = 1080, 1920, 30
FONDO = (14, 12, 32)
COLORES = {"neuron": (110, 210, 235), "nyx": (190, 120, 255), "glip": (190, 235, 70), "bruno": (255, 90, 80)}
NOMBRES = {"neuron": "NEURÓN", "nyx": "NYX", "glip": "GLIP", "bruno": "BRUNO"}
# Hacia dónde mira o gesticula cada pose ("der"/"izq" de quien ve el video; las que no figuran miran al frente).
# Cuando hay dos en pantalla, cada uno se espeja si hace falta para mirar al otro.
MIRA = {
    "neuron": {1: "der", 3: "der", 6: "der", 9: "der", 11: "der"},
    "bruno": {1: "der", 2: "der", 3: "izq", 4: "der", 5: "der", 10: "der", 11: "der", 12: "der"},
    "glip": {1: "der", 2: "der", 5: "der", 11: "der", 12: "der"},
    "nyx": {1: "der", 3: "der", 12: "der"},
}
NO_ESPEJAR: set[str] = set()  # personajes con letras o logos que quedarían al revés
ORDEN = ["bruno", "nyx", "neuron", "glip"]  # de izquierda a derecha

# Todo lo importante queda entre y=200 e y=1510: más abajo lo tapan el texto y los comentarios de Reels/TikTok.
FOTO_CAJA = (60, 215, ANCHO - 60, 760)  # x0, y0, x1, y1
SUB_Y = 800
PISO = 1650  # base de los personajes; lo de abajo (panza y piernas) puede quedar tapado sin problema
TRANSICION = 0.3  # segundos que tarda un personaje en entrar o salir


def en_pantalla(lineas: list[Linea], i: int) -> dict[str, int]:
    """Quién se ve en la línea i y dónde: el que habla y, si le está contestando a la línea anterior, ese otro.
    Nunca más de dos."""
    quien = lineas[i].quien
    presentes = [quien]
    if i > 0 and lineas[i - 1].quien != quien:
        presentes.append(lineas[i - 1].quien)
    presentes.sort(key=ORDEN.index)
    xs = (540,) if len(presentes) == 1 else (320, 760)
    return dict(zip(presentes, xs))


def suave(x: float) -> float:
    x = min(1.0, max(0.0, x))
    return x * x * (3 - 2 * x)


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


DEBILES = {"a", "al", "con", "de", "del", "el", "en", "la", "las", "lo", "los", "me", "no", "o", "para", "por", "que",
           "se", "si", "sin", "su", "un", "una", "y"}  # palabras con las que no conviene cortar una frase


def frases(texto: str) -> list[list[int]]:
    """Parte la línea en frases cortas (índices de palabras) que se leen de un vistazo. Cada oración se corta
    en pedazos parejos de hasta ~32 caracteres, de preferencia en las comas y nunca dejando una palabra sola
    ni cortando después de un artículo o preposición."""
    palabras, grupos, oracion = texto.split(), [], []
    for j, w in enumerate(palabras):
        oracion.append(j)
        if w[-1] in ".?!:" or j == len(palabras) - 1:
            grupos += partir(palabras, oracion)
            oracion = []
    return grupos


def partir(palabras: list[str], oracion: list[int]) -> list[list[int]]:
    largo = lambda a, b: len(" ".join(palabras[j] for j in oracion[a:b]))  # noqa: E731
    total = largo(0, len(oracion))
    if total <= 32:
        return [oracion]
    partes = -(-total // 30)
    meta = total / partes
    # programación dinámica: costo[b] = mejor forma de partir las primeras b palabras
    costo, corte = [0.0] + [float("inf")] * len(oracion), [0] * (len(oracion) + 1)
    for b in range(1, len(oracion) + 1):
        for a in range(b):
            n = largo(a, b)
            if n > 34 and b - a > 1:
                continue
            c = costo[a] + (n - meta) ** 2
            if b - a == 1 and len(oracion) > 1:
                c += 400
            fin = palabras[oracion[b - 1]]
            if b < len(oracion):
                if fin[-1] in ",;":
                    c -= 60
                elif fin.lower().strip("¿¡") in DEBILES:
                    c += 300
            if c < costo[b]:
                costo[b], corte[b] = c, a
    grupos, b = [], len(oracion)
    while b:
        grupos.insert(0, oracion[corte[b]:b])
        b = corte[b]
    return grupos


def main(guion: Guion, carpeta_fotos: Path, audio: Path, tiempos_json: Path, salida: Path) -> None:
    lineas = guion.lineas
    tiempos = json.loads(tiempos_json.read_text())
    # inicio de cada palabra; sin el archivo se reparten parejas en la línea
    archivo_palabras = tiempos_json.parent / "palabras.json"
    if archivo_palabras.exists():
        inicios = json.loads(archivo_palabras.read_text())
    else:
        inicios = [[a + (b - a) * j / len(texto.split()) for j in range(len(texto.split()))]
                   for (a, b), texto in zip(tiempos, (l.texto for l in lineas))]
    duracion = tiempos[-1][1] + 1.2
    total = int(duracion * FPS)
    vol = volumen(audio, total)
    fotos = {n: Image.open(carpeta_fotos / f"{n}.jpg").convert("RGB") for l in lineas for n in l.fotos}
    poses = {}
    for linea in lineas:
        for p, ks in linea.poses.items():
            for k in ks:
                im = Image.open(ELENCO / p / f"{k:02d}.png").convert("RGBA")
                poses[(p, k, False)] = im
                poses[(p, k, True)] = im.transpose(Image.FLIP_LEFT_RIGHT)

    fw, fh = FOTO_CAJA[2] - FOTO_CAJA[0], FOTO_CAJA[3] - FOTO_CAJA[1]
    mascara_foto = esquinas(fw, fh, 36)
    f_marca = fuente(30, 700)
    f_sub, f_nombre, f_credito = fuente(64, 850), fuente(34, 900), fuente(18, 500)

    # fondo fijo: degradé con el título
    base = Image.new("RGB", (ANCHO, ALTO), FONDO)
    grad = np.linspace(0, 1, ALTO)[:, None, None]
    base = Image.fromarray((np.array(FONDO) * (1 - grad * 0.6) + np.array((40, 20, 70)) * grad * 0.6).astype(np.uint8)
                           .repeat(ANCHO, axis=1))
    d = ImageDraw.Draw(base)
    # el título en uno o dos renglones, achicando la letra si no entra
    for tam in (46, 42, 38, 34):
        f_titulo = fuente(tam, 900)
        palabras, renglones = guion.titulo.split(), [""]
        for w in palabras:
            prueba = f"{renglones[-1]} {w}".strip()
            if f_titulo.getlength(prueba) > ANCHO - 40 and renglones[-1]:
                renglones.append(w)
            else:
                renglones[-1] = prueba
        if len(renglones) <= 2:
            break
    for r, renglon in enumerate(renglones):
        y = 120 if len(renglones) == 1 else 86 + r * (tam + 4)
        d.text((ANCHO // 2, y), renglon, font=f_titulo, fill="white", anchor="mm")
    d.text((ANCHO // 2, 185), "NADA QUE VER", font=f_marca, fill=(190, 120, 255), anchor="mm")

    piso = Image.new("RGBA", (ANCHO, 140))
    piso.putalpha(Image.fromarray((np.linspace(0, 255, 140)[:, None] * np.ones((1, ANCHO))).astype(np.uint8)))
    piso_color = Image.new("RGBA", (ANCHO, 140), tuple(base.getpixel((0, PISO))) + (255,))
    piso_color.putalpha(piso.getchannel("A"))
    piso = piso_color
    base.paste(Image.new("RGB", (ANCHO, ALTO - PISO), base.getpixel((0, PISO))), (0, PISO))

    ff = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{ANCHO}x{ALTO}",
                           "-r", str(FPS), "-i", "-", "-i", str(audio), "-map", "0:v", "-map", "1:a",
                           "-af", "dynaudnorm=f=250:g=15:p=0.9,loudnorm=I=-14:TP=-1.5,apad",
                           "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
                           "-c:a", "aac", "-b:a", "160k", "-t", f"{total / FPS:.3f}", "-movflags", "+faststart", str(salida)],
                          stdin=subprocess.PIPE)
    for n in range(total):
        t = n / FPS
        i = max([k for k, (ini, _) in enumerate(tiempos) if ini <= t + 0.05] or [0])
        ini, fin = tiempos[i]
        quien, texto, nombres_foto, ps = lineas[i].quien, lineas[i].texto, lineas[i].fotos, lineas[i].poses
        fin = tiempos[i + 1][0] if i + 1 < len(tiempos) else fin
        avance = min(1, max(0, (t - ini) / max(0.1, fin - ini)))
        cuadro = base.copy()

        # foto: si hay dos, la segunda entra en la mitad de la línea; zoom lento
        idx = min(len(nombres_foto) - 1, int(avance * len(nombres_foto)))
        nombre = nombres_foto[idx]
        local = (avance * len(nombres_foto)) - idx
        if nombre in guion.diagramas:  # los diagramas se ven enteros, sin recortar
            foto = Image.new("RGB", (fw, fh), (0, 0, 0))
            d_im = fotos[nombre].copy()
            d_im.thumbnail((fw, fh))
            d_im = d_im.resize((int(d_im.width * (1 + 0.04 * local)), int(d_im.height * (1 + 0.04 * local))))
            foto.paste(d_im, ((fw - d_im.width) // 2, (fh - d_im.height) // 2))
        else:
            foto = cubrir(fotos[nombre], fw, fh, 1.0 + 0.06 * local)
        cuadro.paste(foto, FOTO_CAJA[:2], mascara_foto)
        dc = ImageDraw.Draw(cuadro)
        credito = guion.fotos[nombre].removeprefix("File:").rsplit(".", 1)[0]
        dc.text((FOTO_CAJA[2] - 16, FOTO_CAJA[3] - 14), f"Wikimedia Commons · {credito[:45]}",
                font=f_credito, fill=(230, 230, 230), anchor="rd", stroke_width=2, stroke_fill="black")
        if rotulo := guion.rotulos.get(nombre):
            ancho_rotulo = f_nombre.getlength(rotulo) + 48
            dc.rounded_rectangle((FOTO_CAJA[0] + 24, FOTO_CAJA[1] + 24, FOTO_CAJA[0] + 24 + ancho_rotulo,
                                  FOTO_CAJA[1] + 90), 18, fill=(0, 0, 0))
            dc.text((FOTO_CAJA[0] + 24 + ancho_rotulo / 2, FOTO_CAJA[1] + 57), rotulo, font=f_nombre, fill="white",
                    anchor="mm")

        # personajes: entra el que habla; si contesta a la línea anterior queda también el otro, apagado
        # whisper a veces corta el final de la línea: el subtítulo sigue hasta que arranca la siguiente
        hablando = i + 1 < len(tiempos) or t < fin + 0.5
        ahora, antes = en_pantalla(lineas, i), en_pantalla(lineas, i - 1) if i else {}
        k = suave((t - ini) / TRANSICION) if i else 1.0
        for p in sorted(set(ahora) | set(antes), key=lambda p: p == quien):
            x = antes.get(p, ahora.get(p)) * (1 - k) + ahora.get(p, antes.get(p)) * k
            opacidad = (1.0 if p in antes else 0.0) * (1 - k) + (1.0 if p in ahora else 0.0) * k
            if opacidad <= 0.02:
                continue
            ks = ps.get(p) or lineas[i - 1].poses[p]  # el que se va conserva la pose que tenía
            # en las líneas largas el que habla cambia de pose a mitad de camino
            k_pose = ks[min(len(ks) - 1, int(avance * len(ks)))] if p == quien else ks[0]
            lugar = ahora.get(p, antes.get(p))
            hacia = None if len(ahora) == 1 and p in ahora else ("der" if lugar < 540 else "izq")
            mira = MIRA.get(p, {}).get(k_pose, "frente")
            espejo = hacia is not None and mira != "frente" and mira != hacia and p not in NO_ESPEJAR
            pose = poses[(p, k_pose, espejo)]
            habla = p == quien and hablando
            alto = 650 if p == quien else 580
            rebote = 1 + (0.035 * vol[n] if habla else 0.008 * np.sin(t * 2 + ORDEN.index(p)))
            h = int(alto * rebote)
            w = int(pose.width * h / pose.height)
            im = pose.resize((w, h), Image.LANCZOS)
            alfa = im.getchannel("A")
            if p != quien:
                im = ImageEnhance.Brightness(im.convert("RGB")).enhance(0.7)
            if opacidad < 1:
                alfa = alfa.point(lambda v: int(v * opacidad))
            im.putalpha(alfa)
            subida = int(60 * (1 - opacidad))  # entra subiendo un poco
            cuadro.paste(im, (int(x) - w // 2, PISO - h + subida), im)
        # tapa la base de los personajes con un degradé hacia el fondo
        cuadro.paste(piso, (0, PISO - piso.height), piso)

        # subtítulo con el nombre de quien habla
        if hablando:
            # la frase que se está diciendo, con la palabra actual del color de quien habla
            palabras = texto.split()
            ws = inicios[i]
            actual = max([j for j in range(len(palabras)) if ws[j] <= t + 0.05] or [0])
            grupo = next(g for g in frases(texto) if actual in g)
            color = COLORES[quien]
            dc = ImageDraw.Draw(cuadro)
            dc.rounded_rectangle((ANCHO // 2 - 110, SUB_Y - 30, ANCHO // 2 + 110, SUB_Y + 26), 28, fill=color)
            dc.text((ANCHO // 2, SUB_Y), NOMBRES[quien], font=f_nombre, fill=FONDO, anchor="mm")
            renglones, renglon = [], []
            for j in grupo:
                if renglon and len(" ".join(palabras[x] for x in renglon + [j])) > 20:
                    renglones.append(renglon)
                    renglon = []
                renglon.append(j)
            renglones.append(renglon)
            espacio = f_sub.getlength(" ")
            alto_renglon = 78
            y = SUB_Y + 105 - alto_renglon * (len(renglones) - 1) / 2
            for renglon in renglones:
                ancho = sum(f_sub.getlength(palabras[j]) for j in renglon) + espacio * (len(renglon) - 1)
                x = ANCHO / 2 - ancho / 2
                for j in renglon:
                    relleno = color if j == actual else "white"
                    dc.text((x, y), palabras[j], font=f_sub, fill=relleno, anchor="lm", stroke_width=7,
                            stroke_fill="black")
                    x += f_sub.getlength(palabras[j]) + espacio
                y += alto_renglon
        ff.stdin.write(cuadro.tobytes())
    ff.stdin.close()
    ff.wait()


if __name__ == "__main__":
    main(cargar(Path(sys.argv[1])), Path(sys.argv[2]), Path(sys.argv[3]), Path(sys.argv[4]), Path(sys.argv[5]))
