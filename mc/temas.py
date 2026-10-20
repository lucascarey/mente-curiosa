"""Color, ícono y música de cada tema. Un tema desconocido usa el amarillo de la marca."""

TEMAS = {
    "animales": {"color": "#3DDC84", "oscuro": "#06210f", "emoji": "🐾", "tonalidad": 0},
    "cuerpo humano": {"color": "#FF5A6E", "oscuro": "#2a0710", "emoji": "🫀", "tonalidad": 3},
    "historia": {"color": "#F2A541", "oscuro": "#2a1804", "emoji": "🏛️", "tonalidad": 5},
    "espacio": {"color": "#A77BFF", "oscuro": "#120830", "emoji": "🪐", "tonalidad": 2},
    "comida": {"color": "#FFB703", "oscuro": "#2a1d00", "emoji": "🍯", "tonalidad": 7},
    "ciencia": {"color": "#33C4FF", "oscuro": "#03202e", "emoji": "🧪", "tonalidad": 4},
}
POR_DEFECTO = {"color": "#FFD60A", "oscuro": "#1a1600", "emoji": "🧠", "tonalidad": 0}


def tema(nombre: str) -> dict:
    clave = nombre.lower().strip()
    for nombre_tema, datos in TEMAS.items():
        if clave.startswith(nombre_tema):
            return {"nombre": nombre.upper(), **datos}
    return {"nombre": nombre.upper(), **POR_DEFECTO}
