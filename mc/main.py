"""Toma el próximo guion pendiente, arma el video y lo publica.

Uso:
    python -m mc.main               # arma y publica el próximo guion
    python -m mc.main --solo-video  # arma el video sin publicar (para probar)
    python -m mc.main --validar     # revisa que todos los guiones pendientes estén bien
    python -m mc.main --renovar     # renueva el token de Instagram
"""

import argparse
import json
import os
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

from . import config, guion, instagram, tiktok, video


def _guardar_token(nombre: str, valor: str) -> None:
    """Deja el token nuevo en un archivo para que el workflow actualice el secreto de GitHub."""
    carpeta = os.environ.get("MC_TOKENS_DIR")
    if carpeta and valor and valor != os.environ.get(nombre):
        Path(carpeta).mkdir(parents=True, exist_ok=True)
        (Path(carpeta) / nombre).write_text(valor)


def validar() -> int:
    archivos = sorted(config.PENDIENTES.glob("*.json"))
    malos = 0
    for archivo in archivos:
        try:
            guion.cargar(archivo)
        except (ValueError, json.JSONDecodeError) as e:
            malos += 1
            print(f"ERROR {e}")
    print(f"{len(archivos) - malos} guiones válidos, {malos} con errores")
    return 1 if malos else 0


def publicar(solo_video: bool) -> int:
    actual = guion.siguiente(config.PENDIENTES)
    if not actual:
        print("::error::No quedan guiones pendientes en guiones/pendientes")
        return 1
    if os.environ.get("IG_ACCESS_TOKEN"):
        # Comprueba el token y usa el usuario real de Instagram en la marca de agua
        cuenta = instagram.usuario()
        config.USUARIO = f"@{cuenta['username']}"
        print(f"Cuenta de Instagram conectada: {config.USUARIO}")
    print(f"Armando {actual.id}")
    archivo = video.armar(actual)
    print(f"Video listo: {archivo} ({archivo.stat().st_size / 1e6:.1f} MB)")
    if solo_video:
        return 0

    resultado = {"publicado_en": datetime.now(timezone.utc).isoformat(timespec="seconds")}
    resultado["instagram"] = instagram.publicar_reel(archivo, actual.caption)
    print(f"Publicado en Instagram: {resultado['instagram']}")

    if tiktok.configurado():
        try:
            tokens = tiktok.renovar_tokens()
            _guardar_token("TIKTOK_REFRESH_TOKEN", tokens.get("refresh_token", ""))
            resultado["tiktok"] = tiktok.publicar(archivo, actual.caption, tokens["access_token"])
            print(f"Publicado en TikTok: {resultado['tiktok']}")
        except tiktok.ErrorTikTok as e:
            # Instagram ya salió: se registra el error y se sigue
            resultado["tiktok_error"] = str(e)
            print(f"::warning::TikTok falló: {e}")

    datos = json.loads(actual.ruta.read_text(encoding="utf-8"))
    datos["resultado"] = resultado
    config.PUBLICADOS.mkdir(parents=True, exist_ok=True)
    (config.PUBLICADOS / actual.ruta.name).write_text(json.dumps(datos, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    actual.ruta.unlink()
    shutil.rmtree(config.CACHE / actual.id, ignore_errors=True)
    print(f"Quedan {len(list(config.PENDIENTES.glob('*.json')))} guiones pendientes")
    return 0


def renovar() -> int:
    _guardar_token("IG_ACCESS_TOKEN", instagram.renovar_token())
    print("Token de Instagram renovado")
    return 0


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--solo-video", action="store_true")
    p.add_argument("--validar", action="store_true")
    p.add_argument("--renovar", action="store_true")
    args = p.parse_args()
    if args.validar:
        return validar()
    if args.renovar:
        return renovar()
    return publicar(args.solo_video)


if __name__ == "__main__":
    sys.exit(main())
