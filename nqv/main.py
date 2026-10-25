"""Toma el próximo guion de nqv/guiones/pendientes, arma el video de Nada Que Ver y lo publica.

Uso:
    python -m nqv.main                      arma y publica el próximo guion
    python -m nqv.main --vista [guion.json] solo arma el video (el próximo o el indicado), sin publicar
    python -m nqv.main --validar            revisa que todos los guiones pendientes estén bien
El video y los archivos intermedios quedan en salida/.
"""

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from . import fotos, guion, video, voces

SALIDA = guion.RAIZ / "salida"


def armar(g: guion.Guion) -> Path:
    carpeta = SALIDA / g.id
    fotos.bajar(g.fotos, carpeta / "fotos")
    audio = voces.generar(g.escena_voz, carpeta / "voces", carpeta / "voces")
    from . import tiempos  # importa faster-whisper, que solo hace falta acá
    tiempos.main([l.texto for l in g.lineas], audio, carpeta / "tiempos.json")
    salida = SALIDA / f"{g.id}.mp4"
    video.main(g, carpeta / "fotos", audio, carpeta / "tiempos.json", salida)
    print(f"Video listo: {salida} ({salida.stat().st_size / 1e6:.1f} MB)", flush=True)
    return salida


def validar() -> int:
    malos = 0
    for ruta in sorted(guion.PENDIENTES.glob("*.json")):
        try:
            g = guion.cargar(ruta)
            sin_elegir = [k for k, v in g.fotos.items() if not isinstance(v, str)]
            if sin_elegir:
                raise ValueError(f"{ruta.name}: fotos sin elegir {sin_elegir}")
        except (ValueError, KeyError, json.JSONDecodeError) as e:
            malos += 1
            print(f"ERROR {ruta.name}: {e}")
    print(f"{len(list(guion.PENDIENTES.glob('*.json'))) - malos} guiones válidos, {malos} con errores")
    return 1 if malos else 0


def publicar() -> int:
    g = guion.siguiente()
    if not g:
        print("::error::No quedan guiones pendientes en nqv/guiones/pendientes")
        return 1
    print("Guion:", g.id, flush=True)
    archivo = armar(g)
    from .publicar import publicar as subir
    resultado = {"publicado_en": datetime.now(timezone.utc).isoformat(timespec="seconds"), **subir(archivo, g.caption)}
    datos = json.loads(g.ruta.read_text(encoding="utf-8"))
    datos["resultado"] = resultado
    guion.PUBLICADOS.mkdir(parents=True, exist_ok=True)
    (guion.PUBLICADOS / g.ruta.name).write_text(json.dumps(datos, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    g.ruta.unlink()
    print(f"Quedan {len(list(guion.PENDIENTES.glob('*.json')))} guiones pendientes", flush=True)
    return 0


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--vista", nargs="?", const="", default=None)
    p.add_argument("--validar", action="store_true")
    args = p.parse_args()
    if args.validar:
        return validar()
    if args.vista is not None:
        g = guion.cargar(Path(args.vista)) if args.vista else guion.siguiente()
        armar(g)
        return 0
    return publicar()


if __name__ == "__main__":
    sys.exit(main())
