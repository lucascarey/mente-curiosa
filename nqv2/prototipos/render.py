"""Prototipos de estilo NQV (sin voz): renderiza proto.html cuadro por cuadro a mp4.
Uso: python nqv2/prototipos/render.py <estilo: plano|contorno> <salida.mp4> [--cuadros 1,5,9]"""
import subprocess, sys, os
from pathlib import Path
from playwright.sync_api import sync_playwright

FPS = 30
AQUI = Path(__file__).resolve().parent

def main():
    estilo, salida = sys.argv[1], Path(sys.argv[2])
    cuadros = None
    if '--cuadros' in sys.argv:
        cuadros = [float(x) for x in sys.argv[sys.argv.index('--cuadros') + 1].split(',')]
    with sync_playwright() as p:
        nav = p.chromium.launch(executable_path=os.environ.get('NQV_CHROMIUM') or None, args=['--allow-file-access-from-files'])
        pag = nav.new_page(viewport={'width': 1080, 'height': 1920})
        pag.goto((AQUI / 'proto.html').as_uri())
        pag.evaluate('e => preparar(e)', estilo)
        dur = pag.evaluate('DUR')
        def cuadro(t):
            pag.evaluate(f'dibujar({t})')
            pag.evaluate('() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))')
            return pag.screenshot(type='jpeg', quality=94)
        if cuadros:
            salida.mkdir(parents=True, exist_ok=True)
            for t in cuadros:
                (salida / f'{estilo}-{t:05.2f}.jpg').write_bytes(cuadro(t))
            return
        ff = subprocess.Popen(['ffmpeg', '-y', '-v', 'error', '-f', 'image2pipe', '-framerate', str(FPS), '-i', '-',
                               '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
                               '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium',
                               '-c:a', 'aac', '-shortest', '-t', str(dur), '-movflags', '+faststart', str(salida)],
                              stdin=subprocess.PIPE)
        for n in range(int(dur * FPS)):
            ff.stdin.write(cuadro(n / FPS))
        ff.stdin.close(); ff.wait()
        nav.close()

if __name__ == '__main__':
    main()
