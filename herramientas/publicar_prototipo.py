"""Publica el video de la rama prototipo-video en Instagram (y en TikTok, privado mientras la app esté en Sandbox).

Uso: python herramientas/publicar_prototipo.py video.mp4 caption.txt
Usa las mismas funciones y secretos que la publicación automática (mc/).
"""

import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from mc import instagram, tiktok  # noqa: E402


def _guardar_token(nombre: str, valor: str) -> None:
    """Igual que en mc/main.py (no se importa para no traer las dependencias del armado de videos)."""
    carpeta = os.environ.get("MC_TOKENS_DIR")
    if carpeta and valor and valor != os.environ.get(nombre):
        Path(carpeta).mkdir(parents=True, exist_ok=True)
        (Path(carpeta) / nombre).write_text(valor)


def main(video: Path, caption: Path) -> None:
    texto = caption.read_text(encoding="utf-8").strip()
    print("Cuenta:", instagram.usuario().get("username"), flush=True)
    resultado = {"instagram": instagram.publicar_reel(video, texto)}
    print("Publicado en Instagram:", resultado["instagram"], flush=True)
    if tiktok.configurado():
        try:
            tokens = tiktok.renovar_tokens()
            _guardar_token("TIKTOK_REFRESH_TOKEN", tokens.get("refresh_token", ""))
            resultado["tiktok"] = tiktok.publicar(video, texto, tokens["access_token"])
            print("Publicado en TikTok:", resultado["tiktok"], flush=True)
        except tiktok.ErrorTikTok as e:  # Instagram ya salió: se avisa y se sigue
            print("::warning::TikTok falló:", e, flush=True)
    print(json.dumps(resultado))


main(Path(sys.argv[1]), Path(sys.argv[2]))
