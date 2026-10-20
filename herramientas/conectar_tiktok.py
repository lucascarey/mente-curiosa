"""Cambia el código que da TikTok al autorizar la app por un refresh token y lo deja en
MC_TOKENS_DIR/TIKTOK_REFRESH_TOKEN, para que el workflow lo guarde como secreto.

Uso (en GitHub Actions, workflow "Conectar TikTok"): python herramientas/conectar_tiktok.py <dirección o código>
"""

import os
import sys
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

import requests

REDIRECCION = "https://github.com/lucascarey/mente-curiosa"


def main() -> int:
    entrada = sys.argv[1].strip()
    # Acepta la dirección completa a la que volvió el navegador o solo el código
    codigo = parse_qs(urlparse(entrada).query).get("code", [entrada])[0]
    r = requests.post(
        "https://open.tiktokapis.com/v2/oauth/token/",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        data={"client_key": os.environ["TIKTOK_CLIENT_KEY"],
              "client_secret": os.environ["TIKTOK_CLIENT_SECRET"],
              "code": unquote(codigo),
              "grant_type": "authorization_code",
              "redirect_uri": REDIRECCION},
        timeout=30,
    )
    datos = r.json() if r.content else {}
    if not r.ok or "refresh_token" not in datos:
        print(f"TikTok no aceptó el código: {r.status_code} {datos.get('error')} {datos.get('error_description')}")
        return 1
    print(f"TikTok conectado. Permisos: {datos.get('scope')}")
    destino = Path(os.environ["MC_TOKENS_DIR"])
    destino.mkdir(parents=True, exist_ok=True)
    (destino / "TIKTOK_REFRESH_TOKEN").write_text(datos["refresh_token"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
