"""Guiones de Nada Que Ver: un JSON por video en nqv/guiones/pendientes, que se publican en orden.

Formato:
{
  "titulo": "¿QUÉ PASARÍA SI LA LUNA DESAPARECIERA?",   (va arriba, en mayúsculas)
  "caption": "texto de la publicación con #hashtags",
  "fotos": {"luna": "File:Full Moon Luc Viatour.jpg", ...},  (archivos de Wikimedia Commons)
  "diagramas": ["eje"],              (fotos que se muestran enteras, sin recortar)
  "rotulos": {"mareas-alta": "MAREA ALTA"},   (cartel sobre la foto, opcional)
  "lineas": [
    {"quien": "glip", "dice": "[curioso] ¿Qué pasaría si...?", "fotos": ["luna"],
     "poses": {"glip": "duda", "bruno": "escucha"}},
    ...
  ]
}
"dice" es lo que lee la voz: lo que va entre corchetes son indicaciones de actuación y no sale en pantalla.
Las poses se nombran con GESTOS (o con el número de la planilla); una lista cambia de pose a mitad de la línea.
En cada línea tiene que figurar la pose de quien habla y de quien habló justo antes (si es otro).
"""

import json
import re
from dataclasses import dataclass
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CARPETA = RAIZ / "nqv" / "guiones"
PENDIENTES = CARPETA / "pendientes"
PUBLICADOS = CARPETA / "publicados"
PERSONAJES = ("neuron", "nyx", "glip", "bruno")

# Número de pose en la planilla de cada personaje (assets/elenco/<personaje>/NN.png) para cada gesto.
GESTOS = {
    "neuron": {"habla": 1, "canchero": 2, "explica": 3, "escucha": 4, "piensa": 5, "duda": 5, "atento": 6,
               "susto": 6, "frustrado": 7, "festeja": 8, "rie": 8, "senala": 9, "listo": 10, "idea": 11,
               "camara": 4},
    "nyx": {"habla": 1, "escucha": 2, "senala": 3, "canchero": 4, "duda": 5, "camara": 6, "susto": 7,
            "frustrado": 8, "festeja": 9, "rie": 10, "piensa": 11, "idea": 12, "explica": 1, "atento": 2},
    "glip": {"habla": 1, "anota": 2, "explica": 3, "escucha": 4, "duda": 5, "camara": 6, "susto": 7,
             "frustrado": 8, "festeja": 9, "rie": 10, "piensa": 11, "idea": 12, "senala": 12, "atento": 4},
    "bruno": {"habla": 1, "canchero": 2, "senala": 3, "escucha": 4, "duda": 5, "camara": 6, "susto": 7,
              "frustrado": 8, "festeja": 9, "rie": 10, "piensa": 11, "idea": 12, "explica": 1, "atento": 4},
}


@dataclass
class Linea:
    quien: str
    dice: str            # para la voz, con indicaciones entre corchetes
    texto: str           # para el subtítulo
    fotos: list[str]
    poses: dict[str, list[int]]


@dataclass
class Guion:
    id: str
    ruta: Path
    titulo: str
    caption: str
    fotos: dict[str, str]
    diagramas: set[str]
    rotulos: dict[str, str]
    lineas: list[Linea]

    @property
    def escena_voz(self) -> list[tuple[str, str]]:
        return [(l.quien, l.dice) for l in self.lineas]


def pantalla(dice: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"\[[^\]]*\]", " ", dice)).strip()


def _pose(personaje: str, valor) -> list[int]:
    valores = valor if isinstance(valor, list) else [valor]
    numeros = []
    for v in valores:
        n = v if isinstance(v, int) else GESTOS[personaje].get(str(v).lower().replace("ñ", "n"))
        if n is None:
            raise ValueError(f"gesto desconocido para {personaje}: {v!r} (válidos: {sorted(GESTOS[personaje])})")
        numeros.append(n)
    return numeros


def cargar(ruta: Path) -> Guion:
    datos = json.loads(ruta.read_text(encoding="utf-8"))
    fotos = datos["fotos"]
    lineas = []
    for k, l in enumerate(datos["lineas"]):
        donde = f"{ruta.name} línea {k + 1}"
        if l["quien"] not in PERSONAJES:
            raise ValueError(f"{donde}: personaje desconocido {l['quien']!r}")
        faltan = [f for f in l["fotos"] if f not in fotos]
        if faltan or not l["fotos"]:
            raise ValueError(f"{donde}: fotos sin definir {faltan or '(ninguna)'}")
        necesarias = {l["quien"]} | ({datos["lineas"][k - 1]["quien"]} if k else set())
        if necesarias - l["poses"].keys():
            raise ValueError(f"{donde}: faltan poses de {sorted(necesarias - l['poses'].keys())}")
        lineas.append(Linea(l["quien"], l["dice"], pantalla(l["dice"]), l["fotos"],
                            {p: _pose(p, v) for p, v in l["poses"].items()}))
    en_escena = {l.quien for l in lineas}
    if len(en_escena) > 3:
        raise ValueError(f"{ruta.name}: máximo 3 personajes por video ({sorted(en_escena)})")
    return Guion(ruta.stem, ruta, datos["titulo"], datos["caption"], fotos, set(datos.get("diagramas", [])),
                 datos.get("rotulos", {}), lineas)


def siguiente() -> Guion | None:
    archivos = sorted(PENDIENTES.glob("*.json"))
    return cargar(archivos[0]) if archivos else None
