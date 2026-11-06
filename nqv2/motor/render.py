"""Renderiza una animación del motor NQV (página con window.preparar() y window.seek(t)) a mp4 60 fps con efectos.
Uso: python nqv2/motor/render.py <pagina.html> <salida.mp4> [--cuadros 1,5,9] [--fps 60]"""
import os, subprocess, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ))


def main():
    pagina, salida = Path(sys.argv[1]).resolve(), Path(sys.argv[2])
    fps = int(sys.argv[sys.argv.index('--fps') + 1]) if '--fps' in sys.argv else 60
    cuadros = [float(x) for x in sys.argv[sys.argv.index('--cuadros') + 1].split(',')] if '--cuadros' in sys.argv else None
    with sync_playwright() as p:
        nav = p.chromium.launch(executable_path=os.environ.get('NQV_CHROMIUM') or None,
                                args=['--allow-file-access-from-files'])
        pag = nav.new_page(viewport={'width': 1080, 'height': 1920})
        errores = []
        pag.on('pageerror', lambda e: errores.append(str(e)))
        pag.goto(pagina.as_uri())
        info = pag.evaluate('preparar()')
        if errores:
            raise SystemExit('Error en la página: ' + errores[0])
        dur = info['dur']

        def cuadro(t):
            pag.evaluate(f'seek({t})')
            return pag.screenshot(type='jpeg', quality=93)

        if cuadros:
            salida.mkdir(parents=True, exist_ok=True)
            for t in cuadros:
                (salida / f'{t:05.2f}.jpg').write_bytes(cuadro(t))
            return
        from nqv.animado.sonido import efectos, _wav
        wav = salida.with_suffix('.efectos.wav')
        _wav(efectos(dur, [(t, k) for t, k in info['sonidos']]) * 0.8, wav)
        ff = subprocess.Popen(['ffmpeg', '-y', '-v', 'error', '-f', 'image2pipe', '-framerate', str(fps), '-i', '-',
                               '-i', str(wav), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '17', '-preset', 'medium',
                               '-c:a', 'aac', '-b:a', '160k', '-t', str(dur), '-movflags', '+faststart', str(salida)],
                              stdin=subprocess.PIPE)
        for n in range(int(dur * fps)):
            ff.stdin.write(cuadro(n / fps))
        ff.stdin.close(); ff.wait(); wav.unlink()
        nav.close()


if __name__ == '__main__':
    main()
