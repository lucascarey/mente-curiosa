"""Lectura y validación de guiones (archivos JSON en guiones/pendientes)."""

import json
import re
from dataclasses import dataclass, field
from pathlib import Path

PALABRA = re.compile(r"[\wáéíóúüñÁÉÍÓÚÜÑ]+", re.UNICODE)


@dataclass
class Parte:
    texto: str  # puede marcar palabras a destacar con *asteriscos*
    busqueda: str  # búsqueda de la foto en Pixabay, en inglés
    visual: dict = field(default_factory=dict)  # gráfico animado de la escena (ver README)

    @property
    def texto_limpio(self) -> str:
        return self.texto.replace("*", "")

    @property
    def destacadas(self) -> set[str]:
        marcadas = re.findall(r"\*([^*]+)\*", self.texto)
        return {normalizar(p) for frase in marcadas for p in PALABRA.findall(frase)}


@dataclass
class Guion:
    id: str
    tema: str
    partes: list[Parte]
    descripcion: str
    hashtags: list[str]
    fuente: str
    ruta: Path

    @property
    def caption(self) -> str:
        return f"{self.descripcion}\n\n{' '.join(self.hashtags)}"


def normalizar(palabra: str) -> str:
    return palabra.lower().strip(".,;:!?¡¿\"'()")


def cargar(ruta: Path) -> Guion:
    datos = json.loads(ruta.read_text(encoding="utf-8"))
    errores = validar(datos)
    if errores:
        raise ValueError(f"{ruta.name}: " + "; ".join(errores))
    return Guion(
        id=datos["id"],
        tema=datos["tema"],
        partes=[Parte(p["texto"], p["busqueda"], p.get("visual") or {}) for p in datos["partes"]],
        descripcion=datos["descripcion"],
        hashtags=datos["hashtags"],
        fuente=datos["fuente"],
        ruta=ruta,
    )


def validar(datos: dict) -> list[str]:
    errores = []
    for campo in ("id", "tema", "partes", "descripcion", "hashtags", "fuente"):
        if campo not in datos:
            errores.append(f"falta '{campo}'")
    if errores:
        return errores
    if not 3 <= len(datos["partes"]) <= 8:
        errores.append("tiene que tener entre 3 y 8 partes")
    for i, p in enumerate(datos["partes"]):
        if not p.get("texto") or not p.get("busqueda"):
            errores.append(f"la parte {i + 1} necesita 'texto' y 'busqueda'")
        errores += [f"parte {i + 1}: {e}" for e in validar_visual(p.get("visual") or {})]
    palabras = sum(len(PALABRA.findall(p.get("texto", ""))) for p in datos["partes"])
    if not 50 <= palabras <= 160:
        errores.append(f"tiene {palabras} palabras (entre 50 y 160 da 20 a 60 segundos)")
    if len(datos["descripcion"]) + sum(len(h) + 1 for h in datos["hashtags"]) > 2000:
        errores.append("descripción y hashtags superan 2000 caracteres")
    return errores


def validar_visual(v: dict) -> list[str]:
    if not v:
        return []
    requeridos = {
        "foto": [],
        "emoji": ["emoji"],
        "numero": ["valor"],
        "comparacion": ["a", "b"],
        "linea": ["hitos"],
        "seguir": [],
    }
    tipo = v.get("tipo")
    if tipo not in requeridos:
        return [f"visual.tipo '{tipo}' no existe (usar {', '.join(requeridos)})"]
    errores = [f"visual {tipo} necesita '{c}'" for c in requeridos[tipo] if c not in v]
    if tipo == "numero" and not isinstance(v.get("valor"), (int, float)):
        errores.append("visual.valor tiene que ser un número")
    if tipo == "comparacion":
        for lado in ("a", "b"):
            item = v.get(lado, {})
            if not isinstance(item.get("valor"), (int, float)) or not item.get("etiqueta"):
                errores.append(f"visual.{lado} necesita 'etiqueta' y 'valor' numérico")
    if tipo == "linea":
        hitos = v.get("hitos", [])
        if not 2 <= len(hitos) <= 4 or any(not isinstance(h.get("anio"), (int, float)) or not h.get("fecha") or not h.get("etiqueta") for h in hitos):
            errores.append("visual.hitos: entre 2 y 4, cada uno con 'anio' (número), 'fecha' y 'etiqueta'")
    return errores


def siguiente(pendientes: Path) -> Guion | None:
    archivos = sorted(pendientes.glob("*.json"))
    return cargar(archivos[0]) if archivos else None
