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
    ("bruno", "¡Fin del mundo! ¡Tsunamis gigantes que inundan todo!", ["ola-gigante-5"],
     {"glip": 7, "bruno": [7, 1], "neuron": 7}),
    ("neuron", "Nada de eso. Esa noche no pasaría nada dramático. Los cambios vendrían de a poco.", ["luna-6"],
     {"glip": 4, "bruno": 6, "neuron": [6, 2]}),
    ("neuron", "Primero, las mareas. Hoy las mueve sobre todo la Luna. Sin ella quedaría solo el Sol, "
               "y serían un tercio de lo que son.", ["mareas-1", "mareas-2"],
     {"glip": 11, "bruno": 6, "neuron": [1, 11]}),
    ("bruno", "¿Y las olas? ¿Se termina el surf?", ["surf-1"],
     {"glip": 5, "bruno": 11, "neuron": 4}),
    ("neuron", "No, las olas las hace el viento. Eso sigue igual.", ["surf-6"],
     {"glip": 2, "bruno": 6, "neuron": 2}),
    ("neuron", "Segundo, las noches serían mucho más oscuras, y los animales que se guían por la Luna se "
               "desorientarían. Hay corales que se reproducen todos a la vez después de la luna llena.",
     ["noche-oscura-2", "corales-3"], {"glip": 7, "bruno": 5, "neuron": [3, 10]}),
    ("neuron", "Y lo más importante: la Luna mantiene estable la inclinación de la Tierra. Sin ella, el eje se "
               "tambalearía y las estaciones y el clima cambiarían por completo. Eso sí, en millones de años.",
     ["eje-3", "estaciones-6"], {"glip": 11, "bruno": 12, "neuron": [11, 9]}),
    ("bruno", "O sea que me asusté con millones de años de anticipación.", ["luna-2"],
     {"glip": 10, "bruno": 10, "neuron": 7}),
    ("neuron", "La Luna no es decoración. Es lo que mantiene estable al planeta.", ["tierra-luna-1"],
     {"glip": 9, "bruno": 3, "neuron": 9}),
]
DIAGRAMAS = {"eje-3", "estaciones-6"}
# Hacia dónde mira o gesticula cada pose ("der"/"izq" de quien ve el video; las que no figuran miran al frente).
# Cuando hay dos en pantalla, cada uno se espeja si hace falta para mirar al otro.
MIRA = {
    "neuron": {1: "der", 3: "der", 6: "der", 9: "der", 11: "der"},
    "bruno": {1: "der", 2: "der", 3: "izq", 4: "der", 5: "der", 10: "der", 11: "der", 12: "der"},
    "glip": {1: "der", 2: "der", 5: "der", 11: "der", 12: "der"},
    "nyx": {1: "der", 3: "der", 12: "der"},
}
NO_ESPEJAR: set[str] = set()  # personajes con letras o logos que quedarían al revés
ORDEN = ["bruno", "neuron", "glip"]  # de izquierda a derecha

# Todo lo importante queda entre y=200 e y=1510: más abajo lo tapan el texto y los comentarios de Reels/TikTok.
FOTO_CAJA = (60, 215, ANCHO - 60, 760)  # x0, y0, x1, y1
SUB_Y = 800
PISO = 1650  # base de los personajes; lo de abajo (panza y piernas) puede quedar tapado sin problema
TRANSICION = 0.3  # segundos que tarda un personaje en entrar o salir


def en_pantalla(i: int) -> dict[str, int]:
    """Quién se ve en la línea i y dónde: el que habla y, si le está contestando a la línea anterior, ese otro.
    Nunca más de dos."""
    quien = ESCENA[i][0]
    presentes = [quien]
    if i > 0 and ESCENA[i - 1][0] != quien:
        presentes.append(ESCENA[i - 1][0])
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


def main(audio: Path, tiempos_json: Path, salida: Path) -> None:
    tiempos = json.loads(tiempos_json.read_text())
    # inicio de cada palabra; sin el archivo se reparten parejas en la línea
    archivo_palabras = tiempos_json.parent / "palabras.json"
    if archivo_palabras.exists():
        inicios = json.loads(archivo_palabras.read_text())
    else:
        inicios = [[a + (b - a) * j / len(texto.split()) for j in range(len(texto.split()))]
                   for (a, b), (_, texto, _, _) in zip(tiempos, ESCENA)]
    duracion = tiempos[-1][1] + 1.2
    total = int(duracion * FPS)
    vol = volumen(audio, total)
    creditos = json.loads((FOTOS / "creditos.json").read_text())

    fotos = {n: Image.open(FOTOS / f"{n}.jpg").convert("RGB") for _, _, fs, _ in ESCENA for n in fs}
    poses = {}
    for _, _, _, ps in ESCENA:
        for p, ks in ps.items():
            for k in ks if isinstance(ks, list) else [ks]:
                im = Image.open(ELENCO / p / f"{k:02d}.png").convert("RGBA")
                poses[(p, k, False)] = im
                poses[(p, k, True)] = im.transpose(Image.FLIP_LEFT_RIGHT)

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

        # personajes: entra el que habla; si contesta a la línea anterior queda también el otro, apagado
        # whisper a veces corta el final de la línea: el subtítulo sigue hasta que arranca la siguiente
        hablando = i + 1 < len(tiempos) or t < fin + 0.5
        ahora, antes = en_pantalla(i), en_pantalla(i - 1) if i else {}
        k = suave((t - ini) / TRANSICION) if i else 1.0
        for p in sorted(set(ahora) | set(antes), key=lambda p: p == quien):
            x = antes.get(p, ahora.get(p)) * (1 - k) + ahora.get(p, antes.get(p)) * k
            opacidad = (1.0 if p in antes else 0.0) * (1 - k) + (1.0 if p in ahora else 0.0) * k
            if opacidad <= 0.02:
                continue
            ks = ps[p] if isinstance(ps[p], list) else [ps[p]]
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
    main(Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]))
