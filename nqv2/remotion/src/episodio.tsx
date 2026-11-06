import React from 'react';
import {Img, staticFile, useCurrentFrame, interpolate} from 'remotion';
import {E, ip, kf} from './lib';

// Piezas compartidas de los episodios con voz: la voz marca el tiempo.
export const s2f = (s: number) => Math.round(s * 60);
export type Frase = {d: number; h: number; texto: string; clave?: string[]}; // d/h en segundos

const limpia = (w: string) => w.toLowerCase().replace(/[¿?¡!.,:;…"]/g, '');

// Subtítulo integrado: las palabras aparecen al ritmo de la voz (proporcional a las letras dentro de la frase).
export const Subtitulo: React.FC<{
  frase: Frase; hasta?: number; y: number; tam?: number; color: string; acento: string; ancho?: number; fuente?: string; alinear?: 'center' | 'left'; x?: number;
}> = ({frase, hasta, y, tam = 84, color, acento, ancho = 920, fuente = 'Titulo', alinear = 'center', x}) => {
  const f = useCurrentFrame();
  const d = s2f(frase.d) - 3;
  const h = s2f(frase.h);
  const fin = hasta !== undefined ? s2f(hasta) : h + 18;
  if (f < d || f > fin + 8) return null;
  const palabras = frase.texto.split(' ');
  const total = palabras.reduce((a, w) => a + w.length + 1, 0);
  let acum = 0;
  const clave = new Set((frase.clave ?? []).map(limpia));
  const sal = ip(f, [fin, fin + 8], [0, 1], E.in);
  return (
    <div style={{position: 'absolute', left: x ?? (1080 - ancho) / 2, top: y, width: ancho, display: 'flex', flexWrap: 'wrap', justifyContent: alinear === 'center' ? 'center' : 'flex-start', columnGap: tam * 0.28, rowGap: tam * 0.05, opacity: 1 - sal, translate: `0px ${-sal * 30}px`}}>
      {palabras.map((w, i) => {
        const t0 = d + ((h - d) * acum) / total;
        acum += w.length + 1;
        const k = ip(f, [t0, t0 + 7], [0, 1], E.snap);
        const esClave = clave.has(limpia(w));
        return (
          <span key={i} style={{fontFamily: fuente, fontSize: esClave ? tam * 1.12 : tam, lineHeight: 1.08, color: esClave ? acento : color, letterSpacing: 2, textTransform: 'uppercase',
            opacity: f < t0 ? 0.0 : 1, scale: `${interpolate(k, [0, 1], [1.35, 1])}`, translate: `0px ${interpolate(k, [0, 1], [-14, 0])}px`, display: 'inline-block'}}>
            {w}
          </span>
        );
      })}
    </div>
  );
};

export const hablando = (f: number, frases: Frase[]) => frases.some((p) => f >= s2f(p.d) && f <= s2f(p.h));

// Personaje recortado con aura plana que brilla más cuando habla, entrada con rebote y golpecito al cambiar de pose.
export const Personaje: React.FC<{
  carpeta: string; poses: Array<[number, string]>; // [cuadro, pose]
  desde: number; hasta?: number; x: number; base: number; alto: number; ancho?: number;
  frases: Frase[]; aura: string; aura2: string; voltear?: boolean;
}> = ({carpeta, poses, desde, hasta, x, base, alto, ancho = 0.7, frases, aura, aura2, voltear}) => {
  const f = useCurrentFrame();
  if (f < desde || (hasta !== undefined && f > hasta + 12)) return null;
  let pose = poses[0][1];
  let cambio = -999;
  for (const [c, p] of poses) if (f >= c) {
    pose = p;
    cambio = c;
  }
  const ent = kf(f, [[desde, 0], [desde + 16, 1, E.backFuerte]]);
  const sal = hasta !== undefined ? ip(f, [hasta, hasta + 12], [0, 1], E.in) : 0;
  const tc = f - cambio;
  const golpe = tc >= 0 && tc < 12 && cambio > desde ? Math.sin((tc / 12) * Math.PI) * 0.06 : 0;
  const habla = hablando(f, frases);
  // brillo suavizado
  let brillo = 0;
  for (let k = 0; k < 10; k++) brillo += hablando(f - k, frases) ? 0.1 : 0;
  const resp = 1 + Math.sin(f / 11) * 0.01 + (habla ? Math.abs(Math.sin(f / 4)) * 0.006 : 0);
  const dy = (1 - ent) * (alto + 300) + sal * (alto + 300);
  const W = alto * ancho;
  return (
    <div style={{position: 'absolute', left: x - W / 2, top: base - alto + dy, width: W, height: alto}}>
      <svg width={alto * 1.4} height={alto * 1.4} style={{position: 'absolute', left: W / 2 - alto * 0.7, top: -alto * 0.32, overflow: 'visible'}}>
        {[0, 1, 2].map((i) => {
          const p = ((f - desde) / 70 + i / 3) % 1;
          return <circle key={i} cx={alto * 0.7} cy={alto * 0.62} r={alto * (0.3 + p * 0.32)} fill="none" stroke={aura} strokeWidth={8} opacity={(1 - p) * (0.15 + brillo * 0.55)} />;
        })}
        <circle cx={alto * 0.7} cy={alto * 0.62} r={alto * (0.36 + brillo * 0.03) * ent} fill={aura2} opacity={0.55 + brillo * 0.45} />
      </svg>
      <Img src={staticFile(`${carpeta}/${pose}.png`)} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'bottom', scale: `${(voltear ? -1 : 1) * (resp + golpe)} ${resp + golpe}`, transformOrigin: '50% 100%'}} />
    </div>
  );
};
