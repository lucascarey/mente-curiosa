"""Cambia el código que da TikTok al autorizar la app por un refresh token y lo deja en
MC_TOKENS_DIR/TIKTOK_REFRESH_TOKEN, para que el workflow lo guarde como secreto.

Uso (en GitHub Actions, workflow "Conectar TikTok"): python herramientas/conectar_tiktok.py <dirección o código>
"""

import os
import sys
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import requests

REDIRECCION = "https://lucascarey.github.io/mente-curiosa/conectar.html"


def main() -> int:
    entrada = sys.argv[1].strip()
    # Acepta la dirección completa a la que volvió el navegador o solo el código
    codigo = parse_qs(urlparse(entrada).query).get("code", [entrada])[0]  # parse_qs ya lo decodifica
    clave, secreto = os.environ.get("TIKTOK_CLIENT_KEY", ""), os.environ.get("TIKTOK_CLIENT_SECRET", "")
    # Diagnóstico sin mostrar el secreto: el client key no es secreto
    print(f"Client key: {clave[:4]}... ({len(clave)} caracteres); client secret: {len(secreto)} caracteres; "
          f"código: {len(codigo)} caracteres")
    if not clave or not secreto:
        print("Faltan los secretos TIKTOK_CLIENT_KEY o TIKTOK_CLIENT_SECRET en GitHub")
        return 1
    r = requests.post(
        "https://open.tiktokapis.com/v2/oauth/token/",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        data={"client_key": clave,
              "client_secret": secreto,
              "code": codigo,
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
