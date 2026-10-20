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

    # 1. Crear el contenedor del Reel. Con el inicio de sesión de Instagram la API solo acepta
    # el video desde una dirección pública, así que primero va a un alojamiento temporal.
    contenedor_id = _revisar(requests.post(
        f"{GRAPH}/{ig_id}/media",
        data={"media_type": "REELS", "video_url": _alojar(video), "caption": caption,
              "share_to_feed": "true", "access_token": token},
        timeout=60,
    ))["id"]

    # 2. Esperar a que Instagram termine de procesarlo
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

    # 3. Publicar
    publicado = _revisar(requests.post(
        f"{GRAPH}/{ig_id}/media_publish",
        data={"creation_id": contenedor_id, "access_token": token},
        timeout=60,
    ))
    return publicado["id"]


def _alojar(video: Path) -> str:
    """Sube el video a Litterbox (gratis, sin cuenta), que lo borra a las 24 h."""
    for intento in range(3):
        with video.open("rb") as f:
            r = requests.post(
                "https://litterbox.catbox.moe/resources/internals/api.php",
                data={"reqtype": "fileupload", "time": "24h"},
                files={"fileToUpload": (video.name, f, "video/mp4")},
                timeout=600,
            )
        url = r.text.strip()
        if r.ok and url.startswith("https://"):
            print(f"Video alojado en {url}")
            return url
        time.sleep(10 * (intento + 1))
    raise ErrorInstagram(f"No pude alojar el video: {r.status_code} {url[:200]}")


def renovar_token() -> str:
    """Los tokens duran 60 días; renovarlo seguido lo mantiene vivo."""
    r = requests.get(
        "https://graph.instagram.com/refresh_access_token",
        params={"grant_type": "ig_refresh_token", "access_token": _token()},
        timeout=30,
    )
    return _revisar(r)["access_token"]
