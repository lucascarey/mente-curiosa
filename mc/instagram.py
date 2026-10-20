"""Publicación de Reels con la API oficial de Instagram (inicio de sesión con Instagram).

Docs: https://developers.facebook.com/docs/instagram-platform/content-publishing
Necesita IG_ACCESS_TOKEN de una cuenta profesional (creador o empresa).
"""

import os
import shutil
import subprocess
import tempfile
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
    # el video desde una dirección pública, así que primero va a una rama del repo.
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
    """Deja el video solo en la rama `video-publico` del repo (público) y devuelve su dirección.
    Cada publicación pisa la anterior, así que la rama nunca crece."""
    repo, token = os.environ.get("GITHUB_REPOSITORY"), os.environ.get("GH_TOKEN")
    if not repo or not token:
        raise ErrorInstagram("Faltan GITHUB_REPOSITORY o GH_TOKEN para alojar el video")
    with tempfile.TemporaryDirectory() as tmp:
        shutil.copy(video, Path(tmp) / video.name)
        git = ["git", "-C", tmp, "-c", "user.name=mente-curiosa-bot",
               "-c", "user.email=github-actions[bot]@users.noreply.github.com"]
        for paso in (["init", "-q", "-b", "video-publico"], ["add", video.name],
                     ["commit", "-qm", f"Video {video.name}"],
                     ["push", "-qf", f"https://x-access-token:{token}@github.com/{repo}.git", "video-publico"]):
            subprocess.run(git + paso, check=True)
    url = f"https://raw.githubusercontent.com/{repo}/video-publico/{video.name}"
    for _ in range(12):  # el CDN de GitHub tarda unos segundos en servirlo
        r = requests.head(url, timeout=30)
        if r.ok:
            print(f"Video alojado en {url}")
            return url
        time.sleep(5)
    raise ErrorInstagram(f"El video no quedó público ({r.status_code}): ¿el repo es público?")


def renovar_token() -> str:
    """Los tokens duran 60 días; renovarlo seguido lo mantiene vivo."""
    r = requests.get(
        "https://graph.instagram.com/refresh_access_token",
        params={"grant_type": "ig_refresh_token", "access_token": _token()},
        timeout=30,
    )
    return _revisar(r)["access_token"]
