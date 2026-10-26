"""Música de fondo y efectos de sonido de los videos animados, sintetizados acá mismo (sin derechos de autor).

Cada tema tiene su clima: tonalidad, tempo e instrumentos. La música se arma nota por nota con numpy, se suaviza
con filtros de ffmpeg y baja sola cuando Neurón habla. Los efectos marcan los cambios de escena (whoosh), los
carteles nuevos (pop) y el botón Seguir (clic + campanita).
"""

import subprocess
import wave
import zlib
from pathlib import Path

import numpy as np

SR = 48000
MAYOR = [0, 2, 4, 5, 7, 9, 11]
MENOR = [0, 2, 3, 5, 7, 8, 10]

# escala, nota base (MIDI), grados de los acordes, tempo, compases por acorde e instrumentos
TEMAS = {
    "espacio":    dict(escala=MENOR, base=57, acordes=[0, 5, 2, 6], bpm=64, compases=2,
                       partes=["pad", "campana", "sub"]),
    "ciencia":    dict(escala=MAYOR, base=60, acordes=[0, 4, 5, 3], bpm=96, compases=1,
                       partes=["pad", "pluck", "bajo", "bombo", "hat"]),
    "historia":   dict(escala=MENOR, base=50, acordes=[0, 5, 6, 0], bpm=72, compases=2,
                       partes=["pad", "pluck_lento", "sub", "tambor"]),
    "naturaleza": dict(escala=MAYOR, base=55, acordes=[0, 3, 5, 4], bpm=88, compases=1,
                       partes=["pad", "marimba", "bajo"]),
    "tecnologia": dict(escala=MENOR, base=52, acordes=[0, 5, 2, 6], bpm=108, compases=1,
                       partes=["pad", "pluck", "bajo", "bombo", "hat"]),
}
# si el guion no dice "musica", se adivina por los hashtags del caption
PISTAS = {"espacio": ["#espacio", "#astronomia", "#universo", "#luna", "#sol"],
          "historia": ["#historia"],
          "naturaleza": ["#animales", "#naturaleza", "#biologia", "#plantas"],
          "tecnologia": ["#tecnologia", "#internet", "#computacion"]}


def elegir_tema(guion: dict) -> str:
    if guion.get("musica") in TEMAS:
        return guion["musica"]
    caption = guion.get("caption", "").lower()
    for tema, tags in PISTAS.items():
        if any(t in caption for t in tags):
            return tema
    return "ciencia"


def _hz(midi: float) -> float:
    return 440.0 * 2 ** ((midi - 69) / 12)


def _env(n: int, ataque: float, caida: float | None = None, soltar: float = 0.0) -> np.ndarray:
    t = np.arange(n) / SR
    e = np.minimum(1.0, t / max(ataque, 1e-4))
    if caida:
        e *= np.exp(-t * caida)
    if soltar:
        k = int(soltar * SR)
        if 0 < k < n:
            e[-k:] *= np.linspace(1, 0, k)
    return e


def _nota(tipo: str, f: float, dur: float, rng: np.random.Generator) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = lambda k: np.sin(2 * np.pi * f * k * t + rng.uniform(0, 6.28))  # noqa: E731
    if tipo == "pad":  # tres voces apenas desafinadas, entrada y salida lentas
        x = sum(np.sin(2 * np.pi * f * 2 ** (c / 1200) * t) + 0.3 * np.sin(4 * np.pi * f * 2 ** (c / 1200) * t)
                for c in (-8, 0, 8)) / 3
        return 0.10 * x * _env(n, 1.2, soltar=1.2)
    if tipo in ("pluck", "pluck_lento"):
        x = s(1) + 0.5 * s(2) * np.exp(-t * 8) + 0.25 * s(3) * np.exp(-t * 14)
        return 0.13 * x * _env(n, 0.005, 4.5 if tipo == "pluck" else 2.5, 0.05)
    if tipo == "campana":
        x = s(1) + 0.35 * s(2.76) * np.exp(-t * 6) + 0.2 * s(5.4) * np.exp(-t * 10)
        return 0.07 * x * _env(n, 0.004, 1.6, 0.1)
    if tipo == "marimba":
        x = s(1) + 0.4 * s(4) * np.exp(-t * 25)
        return 0.15 * x * _env(n, 0.003, 6, 0.05)
    if tipo in ("bajo", "sub"):
        x = s(1) + (0.3 * s(2) if tipo == "bajo" else 0)
        return (0.16 if tipo == "bajo" else 0.12) * x * _env(n, 0.02, 1.5 if tipo == "bajo" else 0.3, 0.1)
    if tipo in ("bombo", "tambor"):
        f0, f1, caida = (120, 45, 18) if tipo == "bombo" else (95, 62, 7)
        fase = 2 * np.pi * np.cumsum(f1 + (f0 - f1) * np.exp(-t * 30)) / SR
        x = np.sin(fase) + (0.15 * rng.standard_normal(n) * np.exp(-t * 40) if tipo == "tambor" else 0)
        return 0.32 * x * _env(n, 0.002, caida)
    if tipo == "hat":
        x = np.diff(rng.standard_normal(n + 1))
        return 0.025 * x * _env(n, 0.001, 70)
    raise ValueError(tipo)


def musica(tema: str, dur: float, semilla: str) -> np.ndarray:
    cfg = TEMAS[tema]
    rng = np.random.default_rng(zlib.crc32(semilla.encode()))
    base = cfg["base"] + int(rng.integers(-2, 3))  # cada video en otra tonalidad cercana
    giro = int(rng.integers(0, len(cfg["acordes"])))
    acordes = cfg["acordes"][giro:] + cfg["acordes"][:giro]
    esc = cfg["escala"]
    negra = 60 / cfg["bpm"]
    compas = 4 * negra
    total = int((dur + 3) * SR)
    out = np.zeros(total)

    def poner(x: np.ndarray, t: float) -> None:
        i = int(t * SR)
        if i < total:
            out[i:i + len(x)] += x[:total - i]

    def triada(g: int) -> list[int]:
        return [base + esc[(g + k) % 7] + 12 * ((g + k) // 7) for k in (0, 2, 4)]

    t, k = 0.0, 0
    while t < dur + 1:
        notas = triada(acordes[k % len(acordes)])
        largo = compas * cfg["compases"]
        intro = t < compas * 2  # los primeros compases, solo el colchón
        for parte in cfg["partes"]:
            if parte == "pad":
                for m in notas:
                    poner(_nota("pad", _hz(m), largo + 1.0, rng), t)
            elif intro:
                continue
            elif parte in ("pluck", "marimba", "campana", "pluck_lento"):
                paso = negra / 2 if parte != "pluck_lento" else negra
                arpegio = [notas[0] + 12, notas[1] + 12, notas[2] + 12, notas[1] + 24]
                for j in range(int(largo / paso)):
                    if parte == "campana" and j % 2:  # la campana deja aire
                        continue
                    poner(_nota(parte, _hz(arpegio[j % len(arpegio)]), paso * 3, rng), t + j * paso)
            elif parte in ("bajo", "sub"):
                paso = negra if parte == "bajo" else compas
                for j in range(int(largo / paso)):
                    poner(_nota(parte, _hz(notas[0] - 12), paso * 0.95, rng), t + j * paso)
            elif parte == "bombo":
                for j in range(0, int(largo / negra), 2):
                    poner(_nota("bombo", 0, 0.5, rng), t + j * negra)
            elif parte == "tambor":
                for j in range(0, int(largo / negra), 4):
                    poner(_nota("tambor", 0, 1.2, rng), t + j * negra)
                    poner(0.5 * _nota("tambor", 0, 1.2, rng), t + (j + 2.5) * negra)
            elif parte == "hat":
                for j in range(int(largo / negra)):
                    poner(_nota("hat", 0, 0.1, rng), t + (j + 0.5) * negra)
        t += largo
        k += 1
    out = out[:int(dur * SR)]
    return 0.5 * out / (np.abs(out).max() + 1e-9)


def efectos(dur: float, eventos: list[tuple[float, str]]) -> np.ndarray:
    """eventos: (segundo, "whoosh" | "pop" | "seguir")."""
    rng = np.random.default_rng(7)
    out = np.zeros(int((dur + 1) * SR))
    for t0, tipo in eventos:
        if tipo == "whoosh":  # ruido que sube y baja, con un filtro que se abre
            n = int(0.45 * SR)
            ruido = rng.standard_normal(n)
            x, y = np.zeros(n), np.zeros(n)
            corte = 0.01 + 0.12 * np.sin(np.linspace(0, np.pi, n)) ** 2
            for i in range(1, n):  # pasabajos de dos polos con el corte variando: suena a aire, no a siseo
                x[i] = x[i - 1] + corte[i] * (ruido[i] - x[i - 1])
                y[i] = y[i - 1] + corte[i] * (x[i] - y[i - 1])
            x = y * np.sin(np.linspace(0, np.pi, n)) ** 2
            x *= 0.35 / (np.abs(x).max() + 1e-9)
        elif tipo == "pop":
            n = int(0.09 * SR)
            t = np.arange(n) / SR
            x = 0.45 * np.sin(2 * np.pi * np.cumsum(500 + 700 * t / t[-1]) / SR) * np.exp(-t * 45)
        elif tipo == "seguir":  # clic del botón y una campanita
            n = int(0.9 * SR)
            t = np.arange(n) / SR
            x = 0.3 * rng.standard_normal(n) * np.exp(-t * 400)
            x += 0.25 * (np.sin(2 * np.pi * 1318.5 * t) + 0.5 * np.sin(2 * np.pi * 1975.5 * t)) * np.exp(-t * 5) * (t > 0.06)
        else:
            raise ValueError(tipo)
        i = max(0, int(t0 * SR))
        out[i:i + len(x)] += x[:len(out) - i]
    return out[:int(dur * SR)]


def _wav(x: np.ndarray, ruta: Path) -> None:
    with wave.open(str(ruta), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype("<i2").tobytes())


def mezclar(voz: Path | None, dur: float, tema: str, semilla: str, eventos: list[tuple[float, str]],
            salida: Path) -> Path:
    """Voz normalizada + música (que baja cuando hay voz) + efectos, en un wav de dur segundos."""
    carpeta = salida.parent
    _wav(musica(tema, dur, semilla), carpeta / "musica.wav")
    _wav(efectos(dur, eventos), carpeta / "efectos.wav")
    entrada_voz = ["-i", str(voz)] if voz else ["-f", "lavfi", "-t", f"{dur:.3f}", "-i", f"anullsrc=r={SR}:cl=mono"]
    filtro = (
        f"[0:a]aresample={SR},dynaudnorm=f=250:g=15:p=0.9,loudnorm=I=-15:TP=-2,asplit=2[v][vs];"
        f"[1:a]lowpass=f=5500,aecho=0.8:0.55:90|170:0.22|0.12,volume=0.9,"
        f"afade=t=in:d=1.5,afade=t=out:st={max(0.0, dur - 2.5):.2f}:d=2.5[m];"
        f"[m][vs]sidechaincompress=threshold=0.02:ratio=6:attack=15:release=450[md];"
        f"[2:a]volume=0.55[s];"
        f"[v][md][s]amix=inputs=3:normalize=0:duration=longest,alimiter=limit=0.95,atrim=0:{dur:.3f}[out]"
    )
    subprocess.run(["ffmpeg", "-y", "-v", "error", *entrada_voz, "-i", str(carpeta / "musica.wav"),
                    "-i", str(carpeta / "efectos.wav"), "-filter_complex", filtro, "-map", "[out]",
                    "-ac", "1", "-ar", str(SR), str(salida)], check=True)
    return salida
