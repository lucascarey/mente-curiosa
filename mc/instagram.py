"""Publicación de Reels con la API oficial de Instagram (inicio de sesión con Instagram).

Docs: https://developers.facebook.com/docs/instagram-platform/content-publishing
Necesita IG_ACCESS_TOKEN de una cuenta profesional (creador o empresa).
"""

import os
import time
from pathlib import Path

import requests

VERSION = os.environ.get("IG_API_VERSION", "v23.0")
GRAPH = f"https://graph.instagram.com/{VERSION}"
RUPLOAD = f"https://rupload.facebook.com/ig-api-upload/{VERSION}"


class ErrorInstagram(RuntimeError):
    pass


def _token() -> str:
    token = os.environ.get("IG_ACCESS_TOKEN")
    if not token:
        raise ErrorInstagram("Falta IG_ACCESS_TOKEN")
    return token


def _revisar(r: requests.Response) -> dict:
    if not r.ok:
        raise ErrorInstagram(f"{r.status_code}: {r.text[:500]}")
    return r.json()


def usuario() -> dict:
    return _revisar(requests.get(f"{GRAPH}/me", params={"fields": "user_id,username", "access_token": _token()}, timeout=30))


def publicar_reel(video: Path, caption: str) -> str:
    token = _token()
    ig_id = usuario()["user_id"]

    # 1. Crear el contenedor del Reel con subida directa del archivo
    contenedor = _revisar(requests.post(
        f"{GRAPH}/{ig_id}/media",
        # Instagram lee upload_type solo de la dirección, no del cuerpo
        params={"media_type": "REELS", "upload_type": "resumable", "caption": caption,
                "share_to_feed": "true", "access_token": token},
        timeout=60,
    ))
    contenedor_id = contenedor["id"]
    destino = contenedor.get("uri") or f"{RUPLOAD}/{contenedor_id}"

    # 2. Subir el video
    datos = video.read_bytes()
    _revisar(requests.post(
        destino,
        headers={"Authorization": f"OAuth {token}", "offset": "0", "file_size": str(len(datos))},
        data=datos,
        timeout=600,
    ))

    # 3. Esperar a que Instagram termine de procesarlo
    for _ in range(60):
        estado = _revisar(requests.get(
            f"{GRAPH}/{contenedor_id}",
            params={"fields": "status_code,status", "access_token": token},
            timeout=30,
        ))
        if estado.get("status_code") == "FINISHED":
            break
        if estado.get("status_code") in ("ERROR", "EXPIRED"):
            raise ErrorInstagram(f"Instagram rechazó el video: {estado}")
        time.sleep(10)
    else:
        raise ErrorInstagram("Instagram tardó más de 10 minutos en procesar el video")

    # 4. Publicar
    publicado = _revisar(requests.post(
        f"{GRAPH}/{ig_id}/media_publish",
        data={"creation_id": contenedor_id, "access_token": token},
        timeout=60,
    ))
    return publicado["id"]


def renovar_token() -> str:
    """Los tokens duran 60 días; renovarlo seguido lo mantiene vivo."""
    r = requests.get(
        "https://graph.instagram.com/refresh_access_token",
        params={"grant_type": "ig_refresh_token", "access_token": _token()},
        timeout=30,
    )
    return _revisar(r)["access_token"]
