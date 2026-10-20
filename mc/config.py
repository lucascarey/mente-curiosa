"""Configuración general. Casi todo se puede cambiar con variables de entorno."""

import os
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PENDIENTES = RAIZ / "guiones" / "pendientes"
PUBLICADOS = RAIZ / "guiones" / "publicados"
SALIDA = RAIZ / "salida"
CACHE = RAIZ / ".cache"
FUENTE = RAIZ / "assets" / "fonts" / "Montserrat-ExtraBold.ttf"

ANCHO, ALTO, FPS = 1080, 1920, 30

USUARIO = os.environ.get("MC_USUARIO", "@mentecuriosa.tv")
VOZ = os.environ.get("MC_VOZ", "es-MX-JorgeNeural")
VELOCIDAD_VOZ = os.environ.get("MC_VELOCIDAD_VOZ", "+8%")
PAUSA_ENTRE_PARTES = 0.25  # segundos de silencio entre partes del guion

# Colores en formato ASS (&HBBGGRR&)
AMARILLO = "&H0AD6FF&"  # #FFD60A
BLANCO = "&HFFFFFF&"

# Modo de prueba sin internet: voz silenciosa y clips de color
MOCK = os.environ.get("MC_MOCK") == "1"
