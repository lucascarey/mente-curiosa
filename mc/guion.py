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
    dibujo: str = ""  # qué ilustrar en la escena, en inglés (si falta se usa `busqueda`)
    tomas: list[dict] = field(default_factory=list)  # varias imágenes seguidas dentro de la parte (ver README)

    @property
    def texto_limpio(self) -> str:
        return self.texto.replace("*", "")

    @property
    def planos(self) -> list[dict]:
        """Las tomas de la parte: cada una con la palabra donde arranca, su visual y qué dibujar."""
        if not self.tomas:
            return [{"desde": "", "visual": self.visual or {"tipo": "ilustracion"}, "foto": "",
                     "dibujo": self.dibujo or self.busqueda}]
        planos = []
        for t in self.tomas:
            visual = t.get("visual") or {"tipo": "ilustracion", **({"texto": t["texto"]} if t.get("texto") else {})}
            planos.append({"desde": t.get("desde", ""), "visual": visual, "foto": t.get("foto", ""),
                           "dibujo": t.get("dibujo") or t.get("foto") or self.busqueda})
        return planos

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
    creditos: list[str] = field(default_factory=list)  # autores de las fotos usadas (se completa al armar el video)
    protagonista: str = ""  # cómo se ve el protagonista de las ilustraciones, en inglés (igual en todas)
    gancho: str = ""  # texto grande en pantalla los primeros segundos, para quien mira sin sonido

    @property
    def caption(self) -> str:
        texto = f"{self.descripcion}\n\n{' '.join(self.hashtags)}"
        if self.creditos:
            texto += "\n\nFotos: " + "; ".join(self.creditos)
        return texto


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
        partes=[Parte(p["texto"], p["busqueda"], p.get("visual") or {}, p.get("dibujo", ""), p.get("tomas") or []) for p in datos["partes"]],
        descripcion=datos["descripcion"],
        hashtags=datos["hashtags"],
        fuente=datos["fuente"],
        ruta=ruta,
        protagonista=datos.get("protagonista", ""),
        gancho=datos.get("gancho", ""),
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
        errores += [f"parte {i + 1}: {e}" for e in validar_tomas(p.get("tomas") or [], p.get("texto", ""))]
    palabras = sum(len(PALABRA.findall(p.get("texto", ""))) for p in datos["partes"])
    if not 50 <= palabras <= 160:
        errores.append(f"tiene {palabras} palabras (entre 50 y 160 da 20 a 60 segundos)")
    gancho = PALABRA.findall(datos.get("gancho", ""))
    if datos.get("gancho") and not 2 <= len(gancho) <= 7:
        errores.append(f"el gancho tiene {len(gancho)} palabras (entre 2 y 7, se lee en 2 segundos)")
    if len(datos["hashtags"]) > 5:
        errores.append("Instagram acepta hasta 5 hashtags")
    if len(datos["descripcion"]) + sum(len(h) + 1 for h in datos["hashtags"]) > 2000:
        errores.append("descripción y hashtags superan 2000 caracteres")
    return errores


def validar_tomas(tomas: list[dict], texto: str) -> list[str]:
    errores = []
    palabras = [normalizar(w) for w in PALABRA.findall(texto)]
    posicion = 0
    for k, t in enumerate(tomas):
        if not t.get("dibujo") and not t.get("foto") and not t.get("visual"):
            errores.append(f"la toma {k + 1} necesita 'foto', 'dibujo' o 'visual'")
        errores += [f"toma {k + 1}: {e}" for e in validar_visual(t.get("visual") or {})]
        if k == 0:
            continue
        desde = normalizar(t.get("desde", ""))
        if desde not in palabras[posicion + 1:]:
            errores.append(f"la toma {k + 1} arranca en '{t.get('desde')}', que no está en el texto después de la toma anterior")
            continue
        posicion = palabras.index(desde, posicion + 1)
    return errores


def validar_visual(v: dict) -> list[str]:
    if not v:
        return []
    requeridos = {
        "ilustracion": [],
        "foto": [],
        "emoji": [],
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
