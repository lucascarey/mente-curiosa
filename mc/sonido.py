"""Efectos de sonido y música de fondo sintetizados con numpy (sin archivos con licencia).

Mezcla final: voz + música (que baja sola cuando habla la voz) + efectos.
"""

import subprocess
from pathlib import Path

import numpy as np

SR = 48000
rng = np.random.default_rng()


def _t(dur: float) -> np.ndarray:
    return np.arange(int(dur * SR)) / SR


def _paso_bajo(x: np.ndarray, corte: np.ndarray | float) -> np.ndarray:
    """Filtro paso bajo de un polo; `corte` puede variar en el tiempo (Hz)."""
    a = np.exp(-2 * np.pi * np.broadcast_to(corte, x.shape) / SR)
    y = np.empty_like(x)
    acum = 0.0
    for i in range(len(x)):
        acum = a[i] * acum + (1 - a[i]) * x[i]
        y[i] = acum
    return y


def whoosh(dur: float = 0.42) -> np.ndarray:
    t = _t(dur)
    ruido = rng.standard_normal(len(t))
    barrido = 300 + 5200 * np.sin(np.pi * t / dur) ** 2
    sonido = _paso_bajo(ruido, barrido) - _paso_bajo(ruido, 180)
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5
    return 0.9 * sonido * env / (np.abs(sonido).max() + 1e-9)


def subida(dur: float = 0.7) -> np.ndarray:
    t = _t(dur)
    frec = 220 * (4 ** (t / dur))
    fase = 2 * np.pi * np.cumsum(frec) / SR
    tono = np.sin(fase) + 0.3 * np.sin(2 * fase)
    ruido = _paso_bajo(rng.standard_normal(len(t)), 800 + 4000 * t / dur)
    env = (t / dur) ** 1.5 * np.exp(-((t - dur) ** 2) * 60)
    return 0.35 * (tono * 0.5 + ruido * 2) * env


def pop() -> np.ndarray:
    t = _t(0.12)
    frec = 1100 * np.exp(-t * 30) + 260
    fase = 2 * np.pi * np.cumsum(frec) / SR
    return 0.8 * np.sin(fase) * np.exp(-t * 38)


def tic() -> np.ndarray:
    t = _t(0.03)
    return 0.35 * np.sin(2 * np.pi * 2400 * t) * np.exp(-t * 180)


def ding() -> np.ndarray:
    t = _t(0.9)
    tono = sum(a * np.sin(2 * np.pi * f * t) for f, a in ((1318.5, 1), (1975.5, 0.5), (2637, 0.25)))
    return 0.35 * tono * np.exp(-t * 5.5)


def clic() -> np.ndarray:
    t = _t(0.06)
    golpe = np.sin(2 * np.pi * 140 * t) * np.exp(-t * 70)
    return 0.7 * (golpe + 0.4 * rng.standard_normal(len(t)) * np.exp(-t * 400))


def impacto() -> np.ndarray:
    t = _t(1.1)
    frec = 110 * np.exp(-t * 3) + 38
    grave = np.sin(2 * np.pi * np.cumsum(frec) / SR) * np.exp(-t * 3.2)
    brillo = _paso_bajo(rng.standard_normal(len(t)), 2500) * np.exp(-t * 9)
    return 0.9 * grave + 0.5 * brillo


EFECTOS = {"whoosh": (whoosh, 0.55), "subida": (subida, 0.5), "pop": (pop, 0.4), "tic": (tic, 0.35),
           "ding": (ding, 0.45), "clic": (clic, 0.6), "impacto": (impacto, 0.7)}


def musica(dur: float, tonalidad: int = 0, bpm: int = 112) -> np.ndarray:
    """Base electrónica suave: acordes, arpegio, bombo y hi-hat."""
    total = int(dur * SR)
    salida = np.zeros(total)
    negra = 60 / bpm
    raiz = 57 + tonalidad  # La + tonalidad, en MIDI
    # Progresión vi-IV-I-V en grados de la escala mayor (semitonos desde la tónica)
    progresion = [[9, 12, 16], [5, 9, 12], [0, 4, 7], [7, 11, 14]]
    hz = lambda nota: 440 * 2 ** ((nota - 69) / 12)

    compas = 4 * negra
    n_compases = int(np.ceil(dur / compas))
    for c in range(n_compases):
        acorde = progresion[c % 4]
        ini = int(c * compas * SR)
        t = _t(compas)
        # Colchón de acordes
        colchon = sum(np.sin(2 * np.pi * hz(raiz + n) * t) + 0.3 * np.sin(4 * np.pi * hz(raiz + n) * t) for n in acorde)
        env = np.minimum(1, t / 0.25) * np.minimum(1, (compas - t) / 0.2)
        trozo = 0.07 * colchon * env
        # Bajo
        trozo += 0.18 * np.sin(2 * np.pi * hz(raiz - 12 + acorde[0]) * t) * (0.6 + 0.4 * np.exp(-(t % negra) * 6))
        fin = min(total, ini + len(trozo))
        salida[ini:fin] += trozo[: fin - ini]
        # Arpegio en corcheas
        for k in range(8):
            nota = raiz + 12 + acorde[k % 3] + (12 if k in (3, 7) else 0)
            ti = _t(negra / 2)
            pluck = np.sin(2 * np.pi * hz(nota) * ti) * np.exp(-ti * 9)
            a = ini + int(k * negra / 2 * SR)
            b = min(total, a + len(pluck))
            if a < total:
                salida[a:b] += 0.06 * pluck[: b - a]
        # Bombo en cada negra y hi-hat a contratiempo
        for k in range(4):
            tb = _t(0.25)
            bombo = np.sin(2 * np.pi * np.cumsum(55 + 90 * np.exp(-tb * 30)) / SR) * np.exp(-tb * 14)
            a = ini + int(k * negra * SR)
            b = min(total, a + len(bombo))
            if a < total:
                salida[a:b] += 0.32 * bombo[: b - a]
            th = _t(0.05)
            hat = rng.standard_normal(len(th)) * np.exp(-th * 90)
            hat -= _paso_bajo(hat, 6000)
            a = ini + int((k + 0.5) * negra * SR)
            b = min(total, a + len(hat))
            if a < total:
                salida[a:b] += 0.08 * hat[: b - a]
    # Entrada y salida suaves
    env = np.minimum(1, _t(dur) / 0.4)[:total]
    env *= np.minimum(1, (dur - _t(dur)) / 1.2)[:total]
    return salida * env


def _leer(ruta: Path) -> np.ndarray:
    crudo = subprocess.run(["ffmpeg", "-v", "error", "-i", str(ruta), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                           capture_output=True, check=True).stdout
    return np.frombuffer(crudo, dtype=np.float32).astype(np.float64)


def mezclar(voz: Path, duracion: float, eventos: list[tuple[float, str]], tonalidad: int, destino: Path) -> Path:
    total = int(duracion * SR)
    v = _leer(voz)[:total]
    v = np.pad(v, (0, total - len(v)))

    # La música baja cuando habla la voz
    energia = np.convolve(np.abs(v), np.ones(4800) / 4800, mode="same")
    energia /= energia.max() + 1e-9
    agache = 1 - 0.55 * np.clip(energia * 3, 0, 1)
    mus = musica(duracion, tonalidad)[:total] * agache

    fx = np.zeros(total)
    for t, nombre in eventos:
        generador, volumen = EFECTOS[nombre]
        sonido = generador() * volumen
        a = max(0, int(t * SR))
        b = min(total, a + len(sonido))
        if a < total:
            fx[a:b] += sonido[: b - a]

    mezcla = 1.0 * v + 0.55 * mus + 0.6 * fx
    mezcla *= 0.89 / (np.abs(mezcla).max() + 1e-9)
    estereo = np.repeat(mezcla.astype(np.float32)[:, None], 2, axis=1)
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-",
                    "-c:a", "aac", "-b:a", "192k", str(destino)], input=estereo.tobytes(), check=True)
    return destino
