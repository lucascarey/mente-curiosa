"""Publicación con la API oficial de TikTok (Content Posting API, publicación directa).

Docs: https://developers.tiktok.com/doc/content-posting-api-reference-direct-post
Hasta que TikTok apruebe la app, solo se puede publicar en privado (SELF_ONLY).
Necesita TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET y TIKTOK_REFRESH_TOKEN.
"""

import os
import time
from pathlib import Path

import requests

API = "https://open.tiktokapis.com/v2"


class ErrorTikTok(RuntimeError):
    pass


def configurado() -> bool:
    return all(os.environ.get(v) for v in ("TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET", "TIKTOK_REFRESH_TOKEN"))


def _revisar(r: requests.Response) -> dict:
    datos = r.json() if r.content else {}
    error = datos.get("error", {})
    if not r.ok or (error and error.get("code") not in (None, "ok")):
        raise ErrorTikTok(f"{r.status_code}: {r.text[:500]}")
    return datos


def renovar_tokens() -> dict:
    """Devuelve access_token y refresh_token nuevos (el access token dura 24 horas)."""
    r = requests.post(
        f"{API}/oauth/token/",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        data={"client_key": os.environ["TIKTOK_CLIENT_KEY"],
              "client_secret": os.environ["TIKTOK_CLIENT_SECRET"],
              "grant_type": "refresh_token",
              "refresh_token": os.environ["TIKTOK_REFRESH_TOKEN"]},
        timeout=30,
    )
    return _revisar(r)


def publicar(video: Path, titulo: str, access_token: str) -> str:
    cabeceras = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json; charset=UTF-8"}
    privacidad = os.environ.get("TIKTOK_PRIVACIDAD", "SELF_ONLY")

    creador = _revisar(requests.post(f"{API}/post/publish/creator_info/query/", headers=cabeceras, timeout=30))
    opciones = creador["data"].get("privacy_level_options", [])
    if privacidad not in opciones:
        raise ErrorTikTok(f"Privacidad {privacidad} no permitida; opciones: {opciones}")

    tamano = video.stat().st_size
    inicio = _revisar(requests.post(
        f"{API}/post/publish/video/init/",
        headers=cabeceras,
        json={
            "post_info": {"title": titulo[:2200], "privacy_level": privacidad,
                          "disable_comment": False, "disable_duet": False, "disable_stitch": False,
                          "is_aigc": True},
            "source_info": {"source": "FILE_UPLOAD", "video_size": tamano,
                            "chunk_size": tamano, "total_chunk_count": 1},
        },
        timeout=60,
    ))
    publish_id = inicio["data"]["publish_id"]

    r = requests.put(
        inicio["data"]["upload_url"],
        headers={"Content-Type": "video/mp4", "Content-Length": str(tamano),
                 "Content-Range": f"bytes 0-{tamano - 1}/{tamano}"},
        data=video.read_bytes(),
        timeout=600,
    )
    if not r.ok:
        raise ErrorTikTok(f"Falló la subida: {r.status_code} {r.text[:300]}")

    for _ in range(60):
        estado = _revisar(requests.post(f"{API}/post/publish/status/fetch/", headers=cabeceras,
                                        json={"publish_id": publish_id}, timeout=30))
        status = estado["data"].get("status")
        if status == "PUBLISH_COMPLETE":
            return publish_id
        if status == "FAILED":
            raise ErrorTikTok(f"TikTok rechazó el video: {estado['data']}")
        time.sleep(10)
    raise ErrorTikTok("TikTok tardó más de 10 minutos en procesar el video")
