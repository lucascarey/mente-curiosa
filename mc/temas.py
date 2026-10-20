"""Color, paleta de las ilustraciones y música de cada tema. Un tema desconocido usa el amarillo de la marca."""

TEMAS = {
    "animales": {"color": "#3DDC84", "oscuro": "#071a14", "paleta": "teal, emerald green and warm orange palette", "tonalidad": 0},
    "cuerpo humano": {"color": "#FF5A6E", "oscuro": "#1f0a14", "paleta": "coral red, pink and deep purple palette", "tonalidad": 3},
    "historia": {"color": "#F2A541", "oscuro": "#1e1308", "paleta": "amber, gold and deep brown palette", "tonalidad": 5},
    "espacio": {"color": "#A77BFF", "oscuro": "#0e0a24", "paleta": "violet, deep indigo and cyan palette", "tonalidad": 2},
    "comida": {"color": "#FFB703", "oscuro": "#1f1606", "paleta": "honey yellow, orange and warm cream palette", "tonalidad": 7},
    "ciencia": {"color": "#33C4FF", "oscuro": "#06172a", "paleta": "sky blue, cyan and navy palette", "tonalidad": 4},
}
POR_DEFECTO = {"color": "#FFD60A", "oscuro": "#14121f", "paleta": "yellow, purple and navy palette", "tonalidad": 0}


def tema(nombre: str) -> dict:
    clave = nombre.lower().strip()
    for nombre_tema, datos in TEMAS.items():
        if clave.startswith(nombre_tema):
            return {"nombre": nombre, **datos}
    return {"nombre": nombre, **POR_DEFECTO}
