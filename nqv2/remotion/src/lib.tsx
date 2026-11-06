import React from 'react';
import {Easing, interpolate, useCurrentFrame, continueRender, delayRender, staticFile} from 'remotion';

// ---------- Paleta de Ciencia (regla: fondo liso, texto de un color, un acento) ----------
export const C = {
  oscuro: '#14252C',
  claro: '#EAF4F2',
  petroleo: '#27879B',
  profundo: '#185669',
  suave: '#6CB6B9',
  acento: '#EF6F8E', // la burbuja
  blanco: '#FFFFFF',
};

export const FPS = 60;
export const BPM = 128;
export const BEAT = (60 / BPM) * FPS; // 28.125 cuadros
export const B = (n: number) => Math.round(n * BEAT);

// ---------- easing ----------
export const E = {
  snap: Easing.bezier(0.16, 1, 0.3, 1), // rapidísimo y frena
  in: Easing.bezier(0.7, 0, 0.84, 0),
  inOut: Easing.bezier(0.87, 0, 0.13, 1),
  back: Easing.bezier(0.34, 1.56, 0.64, 1),
  backFuerte: Easing.bezier(0.3, 2.2, 0.5, 1),
  lin: Easing.linear,
};

// interpolación con clamp
export const ip = (f: number, i: [number, number], o: [number, number], ease = E.snap) =>
  interpolate(f, i, o, {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});

// varios tramos encadenados: [[f0,v0],[f1,v1,ease],...]
export const kf = (f: number, pts: Array<[number, number, ((t: number) => number)?]>) => {
  if (f <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [a, va] = pts[i - 1];
    const [b, vb, ease] = pts[i];
    if (f <= b) return ip(f, [a, b], [va, vb], ease ?? E.snap);
  }
  return pts[pts.length - 1][1];
};

// pseudoaleatorio determinístico
export const rnd = (i: number, s = 1) => {
  const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// ---------- fuentes ----------
let fuentesListas = false;
export const useFuentes = () => {
  const [h] = React.useState(() => (fuentesListas ? null : delayRender('fuentes')));
  React.useEffect(() => {
    if (h === null) return;
    const fs = [
      new FontFace('Titulo', `url(${staticFile('fuentes/SquadaOne.ttf')})`),
      new FontFace('Destaque', `url(${staticFile('fuentes/Shrikhand.ttf')})`),
      new FontFace('Mono', `url(${staticFile('fuentes/JetBrainsMono.ttf')})`),
    ];
    Promise.all(fs.map((x) => x.load())).then((cargadas) => {
      cargadas.forEach((x) => document.fonts.add(x));
      fuentesListas = true;
      continueRender(h);
    });
  }, [h]);
};

// ---------- texto que golpea letra por letra ----------
export const Golpe: React.FC<{
  texto: string;
  desde: number;
  y: number;
  tam: number;
  color: string;
  fuente?: string;
  paso?: number;
  salida?: number; // cuadro en que se va
  corte?: {f: number; color: string}; // un tajo que separa las mitades
  espaciado?: number;
}> = ({texto, desde, y, tam, color, fuente = 'Titulo', paso = 2, salida, corte, espaciado = 4}) => {
  const f = useCurrentFrame();
  if (f < desde) return null;
  const letras = texto.split('');
  const sal = salida !== undefined ? ip(f, [salida, salida + 7], [0, 1], E.in) : 0;
  if (sal >= 1) return null;
  // tajo: las mitades se separan y vuelven
  let sep = 0;
  let linea = 0;
  if (corte) {
    linea = ip(f, [corte.f, corte.f + 5], [0, 1], E.snap) * (1 - ip(f, [corte.f + 14, corte.f + 18], [0, 1]));
    sep = kf(f, [[corte.f + 3, 0], [corte.f + 8, 1, E.snap], [corte.f + 14, 1], [corte.f + 19, 0, E.backFuerte]]);
  }
  const fila = (mitad: 'arriba' | 'abajo' | 'todo') => (
    <div
      style={{
        position: 'absolute', left: 0, width: 1080, top: y - tam * 0.6, height: tam * 1.2,
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        fontFamily: fuente, fontSize: tam, color, letterSpacing: espaciado, lineHeight: 1, whiteSpace: 'pre',
        clipPath: mitad === 'todo' ? undefined : mitad === 'arriba' ? 'inset(0 0 50% 0)' : 'inset(50% 0 0 0)',
        translate: mitad === 'arriba' ? `${-90 * sep}px ${-6 * sep}px` : mitad === 'abajo' ? `${90 * sep}px ${6 * sep}px` : undefined,
      }}
    >
      {letras.map((l, i) => {
        const t0 = desde + i * paso;
        const k = ip(f, [t0, t0 + 6], [0, 1], E.snap);
        const ks = salida !== undefined ? ip(f, [salida + i * 0.6, salida + i * 0.6 + 6], [0, 1], E.in) : 0;
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity: f < t0 ? 0 : 1 - ks,
              scale: `${interpolate(k, [0, 1], [2.6, 1])}`,
              translate: `0px ${interpolate(k, [0, 1], [-tam * 0.25, 0]) + ks * -tam * 0.8}px`,
            }}
          >
            {l}
          </span>
        );
      })}
    </div>
  );
  return (
    <>
      {corte && sep > 0 ? (
        <>
          {fila('arriba')}
          {fila('abajo')}
        </>
      ) : (
        fila('todo')
      )}
      {corte && linea > 0 && (
        <div style={{position: 'absolute', left: 0, top: y - 3, height: 6, width: 1080 * linea, background: corte.color, rotate: '-4deg', transformOrigin: '0 50%'}} />
      )}
    </>
  );
};

// ---------- texto que se tipea (mono) ----------
export const Tipeo: React.FC<{texto: string; desde: number; y: number; tam: number; color: string; cps?: number; fuente?: string; espaciado?: number}> = ({
  texto, desde, y, tam, color, cps = 1.2, fuente = 'Mono', espaciado = 6,
}) => {
  const f = useCurrentFrame();
  if (f < desde) return null;
  const n = Math.min(texto.length, Math.floor((f - desde) / cps));
  const cursor = n < texto.length || Math.floor(f / 15) % 2 === 0;
  return (
    <div style={{position: 'absolute', left: 0, width: 1080, top: y - tam * 0.6, textAlign: 'center', fontFamily: fuente, fontSize: tam, color, letterSpacing: espaciado, whiteSpace: 'pre'}}>
      {texto.slice(0, n)}
      <span style={{opacity: cursor ? 1 : 0}}>▍</span>
    </div>
  );
};
