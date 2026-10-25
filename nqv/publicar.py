"""Publica un video en Instagram (y en TikTok, que sale privado o falla mientras la app no esté auditada).

Usa las mismas funciones y secretos que la publicación vieja (mc/instagram.py y mc/tiktok.py).
"""

import os
from pathlib import Path

from mc import instagram, tiktok


def _guardar_token(nombre: str, valor: str) -> None:
    """Igual que en mc/main.py (no se importa para no traer las dependencias del armado de videos viejo)."""
    carpeta = os.environ.get("MC_TOKENS_DIR")
    if carpeta and valor and valor != os.environ.get(nombre):
        Path(carpeta).mkdir(parents=True, exist_ok=True)
        (Path(carpeta) / nombre).write_text(valor)


def publicar(video: Path, caption: str) -> dict:
    print("Cuenta:", instagram.usuario().get("username"), flush=True)
    resultado = {"instagram": instagram.publicar_reel(video, caption)}
    print("Publicado en Instagram:", resultado["instagram"], flush=True)
    if tiktok.configurado():
        try:
            tokens = tiktok.renovar_tokens()
            _guardar_token("TIKTOK_REFRESH_TOKEN", tokens.get("refresh_token", ""))
            resultado["tiktok"] = tiktok.publicar(video, caption, tokens["access_token"])
            print("Publicado en TikTok:", resultado["tiktok"], flush=True)
        except tiktok.ErrorTikTok as e:  # Instagram ya salió: se anota y se sigue
            resultado["tiktok_error"] = str(e)[:300]
            print("::warning::TikTok falló:", e, flush=True)
    return resultado
