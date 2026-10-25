"""Fotos de Wikimedia Commons para los guiones.

python -m nqv.fotos bajar guion.json carpeta     baja las fotos elegidas ("File:...") a carpeta/<clave>.jpg
python -m nqv.fotos buscar carpeta_guiones salida busca candidatas para las fotos que todavía dicen
                                                  {"buscar": "..."} y arma una hoja de contacto por guion
"""

import json
import sys
from pathlib import Path

import requests
from PIL import Image, ImageDraw

API = "https://commons.wikimedia.org/w/api.php"
AGENTE = "nada-que-ver/1.0 (https://github.com/lucascarey/mente-curiosa)"
ANCHO = 1600
CANDIDATAS = 6


def _consultar(**params) -> dict:
    r = requests.get(API, headers={"User-Agent": AGENTE}, timeout=60, params={"action": "query", "format": "json", **params})
    r.raise_for_status()
    return r.json().get("query", {})


def _bajar(url: str, destino: Path) -> None:
    r = requests.get(url, headers={"User-Agent": AGENTE}, timeout=120)
    r.raise_for_status()
    destino.write_bytes(r.content)
    Image.open(destino).convert("RGB").save(destino, quality=92)  # PNG o JPG: siempre queda en JPG


def bajar(fotos: dict[str, str], carpeta: Path) -> dict[str, str]:
    """Devuelve {clave: título en Commons} para los créditos."""
    carpeta.mkdir(parents=True, exist_ok=True)
    pendientes = {k: v for k, v in fotos.items() if not isinstance(v, str)}
    if pendientes:
        raise ValueError(f"fotos sin elegir: {sorted(pendientes)}")
    respuesta = _consultar(titles="|".join(set(fotos.values())), prop="imageinfo", iiprop="url", iiurlwidth=ANCHO)
    por_titulo = {p["title"]: p for p in respuesta["pages"].values()}
    normalizados = {n["from"]: n["to"] for n in respuesta.get("normalized", [])}
    for clave, titulo in fotos.items():
        pagina = por_titulo.get(normalizados.get(titulo, titulo))
        if not pagina or "imageinfo" not in pagina:
            raise ValueError(f"no existe en Commons: {titulo}")
        info = pagina["imageinfo"][0]
        _bajar(info.get("thumburl", info["url"]), carpeta / f"{clave}.jpg")
        print("foto", clave, titulo, flush=True)
    return dict(fotos)


def buscar(guiones: Path, salida: Path) -> None:
    salida.mkdir(parents=True, exist_ok=True)
    for ruta in sorted(guiones.glob("*.json")):
        datos = json.loads(ruta.read_text(encoding="utf-8"))
        pedidas = {k: v["buscar"] for k, v in datos["fotos"].items() if isinstance(v, dict)}
        if not pedidas:
            continue
        indice, filas = {}, []
        for clave, consulta in pedidas.items():
            paginas = _consultar(generator="search", gsrsearch=f"{consulta} filetype:bitmap", gsrnamespace=6,
                                 gsrlimit=CANDIDATAS * 2, prop="imageinfo", iiprop="url|size", iiurlwidth=400)
            paginas = sorted(paginas.get("pages", {}).values(), key=lambda p: p.get("index", 0))
            paginas = [p for p in paginas if p.get("imageinfo") and p["imageinfo"][0]["width"] >= 800][:CANDIDATAS]
            fila = []
            for n, p in enumerate(paginas, 1):
                info = p["imageinfo"][0]
                archivo = salida / ruta.stem / f"{clave}-{n}.jpg"
                archivo.parent.mkdir(parents=True, exist_ok=True)
                try:
                    _bajar(info["thumburl"], archivo)
                except Exception as e:  # una miniatura que falla no frena al resto
                    print("falló", p["title"], e, flush=True)
                    continue
                indice[f"{clave}-{n}"] = p["title"]
                fila.append((f"{clave}-{n}", archivo))
            filas.append((clave, consulta, fila))
        (salida / ruta.stem / "indice.json").write_text(json.dumps(indice, ensure_ascii=False, indent=1))
        _hoja(filas, salida / f"{ruta.stem}.jpg")
        print(ruta.stem, len(pedidas), "fotos buscadas", flush=True)


def _hoja(filas: list, destino: Path) -> None:
    """Una fila por foto pedida, con las candidatas numeradas, para elegir mirando."""
    w, h, rotulo = 300, 200, 34
    hoja = Image.new("RGB", (w * CANDIDATAS, (h + rotulo) * len(filas)), (20, 20, 30))
    d = ImageDraw.Draw(hoja)
    for i, (clave, consulta, fila) in enumerate(filas):
        y = i * (h + rotulo)
        d.text((8, y + 8), f"{clave}: {consulta}", fill="white")
        for j, (nombre, archivo) in enumerate(fila):
            im = Image.open(archivo)
            im.thumbnail((w - 6, h - 6))
            hoja.paste(im, (j * w + 3, y + rotulo))
            d.text((j * w + 8, y + rotulo + 4), nombre.rsplit("-", 1)[1], fill="yellow", stroke_width=2, stroke_fill="black")
    hoja.save(destino, quality=85)


if __name__ == "__main__":
    if sys.argv[1] == "bajar":
        from .guion import cargar
        bajar(cargar(Path(sys.argv[2])).fotos, Path(sys.argv[3]))
    else:
        buscar(Path(sys.argv[2]), Path(sys.argv[3]))
