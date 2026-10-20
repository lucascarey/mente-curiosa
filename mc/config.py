"""Configuración general. Casi todo se puede cambiar con variables de entorno."""

import os
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PENDIENTES = RAIZ / "guiones" / "pendientes"
PUBLICADOS = RAIZ / "guiones" / "publicados"
SALIDA = RAIZ / "salida"
CACHE = RAIZ / ".cache"
FUENTES = RAIZ / "assets" / "fonts"
PERSONAJE = RAIZ / "assets" / "personaje"  # los 12 dibujos de la conductora

ANCHO, ALTO, FPS = 1080, 1920, 30

USUARIO = os.environ.get("MC_USUARIO", "@mente.curiosatv")
VOZ = os.environ.get("MC_VOZ", "es-AR-ElenaNeural")
VELOCIDAD_VOZ = os.environ.get("MC_VELOCIDAD_VOZ", "+5%")
TONO_VOZ = os.environ.get("MC_TONO_VOZ", "+0Hz")
PAUSA_ENTRE_PARTES = 0.25  # segundos de silencio entre partes del guion

# Modo de prueba sin internet: voz silenciosa e imágenes de color
MOCK = os.environ.get("MC_MOCK") == "1"
