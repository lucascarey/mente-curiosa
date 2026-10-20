"""Tonalidad de la música de cada tema. La estética es una sola: negro, blanco y celeste."""

COLOR = "#4FC3F7"  # celeste de los acentos
FONDO = "#000000"

TEMAS = {"animales": 0, "cuerpo humano": 3, "historia": 5, "espacio": 2, "comida": 7, "ciencia": 4}


def tema(nombre: str) -> dict:
    clave = nombre.lower().strip()
    tonalidad = next((t for nombre_tema, t in TEMAS.items() if clave.startswith(nombre_tema)), 0)
    return {"nombre": nombre, "color": COLOR, "oscuro": FONDO, "tonalidad": tonalidad}
