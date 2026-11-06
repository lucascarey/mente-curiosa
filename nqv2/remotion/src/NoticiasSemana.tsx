import React from 'react';
import {AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame, interpolate} from 'remotion';
import {Audio} from '@remotion/media';
import {E, ip, kf, Golpe, useFuentes} from './lib';
import {Lienzo, Logo} from './ReelCiencia';
import {Frase, Personaje, Subtitulo, s2f} from './episodio';

// Noticias "Las 3 noticias de la semana" con Sinty Wave (Achernar porteña). Tiempos medidos en la voz.
const N = {fondo: '#F2F2F4', texto: '#1D1F25', rojo: '#D7263D', bordo: '#751E3E', vino: '#451529', plata: '#BDC0CC', blanco: '#FFFFFF'};
export const FRASES_SEMANA: Frase[] = [
  {d: 0.26, h: 4.38, texto: '¡Hola! Soy Sinty Wave, y estas son las tres noticias de la semana.', clave: ['tres', 'noticias']},
  {d: 5.52, h: 5.97, texto: 'Primera:'},
  {d: 6.72, h: 9.75, texto: 'Cristiano Ronaldo se despide de la selección de Portugal.', clave: ['cristiano', 'ronaldo']},
  {d: 10.56, h: 15.5, texto: 'Lo anunció el jueves en un video: a los 41 años, devuelve la camiseta 7.', clave: ['41', '7']},
  {d: 16.48, h: 20.55, texto: 'Se va con 146 goles en 234 partidos.', clave: ['146', '234']},
  {d: 21.64, h: 22.2, texto: 'Segunda:'},
  {d: 23.12, h: 26.54, texto: 'La Estación Espacial Internacional terminó de renovar su energía.', clave: ['energía']},
  {d: 27.53, h: 32.84, texto: 'Dos astronautas pasaron casi siete horas afuera, para instalar el último panel solar nuevo.', clave: ['siete', 'horas']},
  {d: 33.8, h: 36.45, texto: 'Con eso, la estación tiene un tercio más de energía.', clave: ['tercio']},
  {d: 37.64, h: 38.12, texto: 'Tercera:'},
  {d: 39.22, h: 43.76, texto: 'La NASA presentó el X-70 Fractal, su nuevo avión experimental.', clave: ['x-70', 'fractal']},
  {d: 44.82, h: 49.79, texto: 'Es tripulado, y sus controles se pueden reconfigurar para probar tecnologías nuevas.', clave: ['tripulado']},
  {d: 51.21, h: 52.77, texto: 'Esas fueron las noticias de la semana.'},
  {d: 53.39, h: 54.98, texto: 'Seguime para no perderte nada.', clave: ['seguime']},
];
const F = FRASES_SEMANA;
export const DUR_SEMANA = s2f(56.6);
const fr = s2f;

type Foto = {d: number; h: number; src: string; credito: string; pos?: string};
type Chip = {d: number; arriba: string; abajo: string; num?: number};
type Noticia = {n: number; d: number; h: number; seccion: string; titular: string; fuente: string; fecha: string; fotos: Foto[]; chips: Chip[]; frases: number[]};
const NOTICIAS: Noticia[] = [
  {n: 1, d: 5.3, h: 21.3, seccion: 'DEPORTES', titular: 'CRISTIANO RONALDO SE DESPIDE DE PORTUGAL', fuente: 'FUENTE: EURONEWS · INFOBAE', fecha: '5 NOV 2026', frases: [2, 3, 4],
    fotos: [
      {d: 6.4, h: 10.4, src: 'fotos/ronaldo-capitan.jpg', pos: '50% 8%', credito: 'FOTO: YANTSIMAGES / WIKIMEDIA COMMONS · CC BY-SA 4.0'},
      {d: 10.4, h: 16.3, src: 'fotos/ronaldo-siete.jpg', pos: '50% 5%', credito: 'FOTO: АННА НЭССИ / WIKIMEDIA COMMONS · CC BY-SA 3.0'},
      {d: 16.3, h: 21.3, src: 'fotos/ronaldo-patea.jpg', credito: 'FOTO: MAHDI ZARE / FARS NEWS AGENCY · CC BY 4.0'},
    ],
    chips: [{d: 13.0, arriba: '41', abajo: 'AÑOS'}, {d: 14.6, arriba: '#7', abajo: 'CAMISETA'}, {d: 17.6, arriba: '146', abajo: 'GOLES', num: 146}, {d: 19.0, arriba: '234', abajo: 'PARTIDOS', num: 234}]},
  {n: 2, d: 21.3, h: 37.3, seccion: 'ESPACIO', titular: 'LA ESTACIÓN ESPACIAL COMPLETA SU MEJORA DE ENERGÍA', fuente: 'FUENTE: NASA', fecha: '5 NOV 2026', frases: [6, 7, 8],
    fotos: [
      {d: 22.4, h: 27.3, src: 'fotos/iss-panel.jpg', credito: 'FOTO: NASA · EL PANEL NUEVO ABRIÉNDOSE, 5 DE NOVIEMBRE'},
      {d: 27.3, h: 33.6, src: 'fotos/iss-caminata.jpg', credito: 'FOTO DE ARCHIVO: NASA / THOMAS PESQUET (2021)'},
      {d: 33.6, h: 37.3, src: 'fotos/iss-entera.jpg', credito: 'ILUSTRACIÓN: NASA'},
    ],
    chips: [{d: 28.4, arriba: '2', abajo: 'ASTRONAUTAS'}, {d: 30.0, arriba: '6 H 59', abajo: 'MINUTOS AFUERA'}]},
  {n: 3, d: 37.3, h: 50.6, seccion: 'TECNOLOGÍA', titular: 'LA NASA PRESENTA EL AVIÓN X-70 FRACTAL', fuente: 'FUENTE: NASA', fecha: '4 NOV 2026', frases: [10, 11],
    fotos: [{d: 38.4, h: 50.6, src: 'fotos/x70.png', credito: 'IMAGEN GENERADA POR NASA'}],
    chips: [{d: 45.1, arriba: 'TRIPULADO', abajo: 'CON PILOTO'}, {d: 46.9, arriba: 'CONTROLES', abajo: 'RECONFIGURABLES'}]},
];

const FOTO = {x: 60, y: 270, w: 960, h: 660};

const Tarjeta: React.FC<{noti: Noticia}> = ({noti}) => {
  const f = useCurrentFrame();
  const sal = ip(f, [fr(noti.h) - 12, fr(noti.h)], [0, 1], E.in);
  return (
    <>
      {/* bloque plano detrás (sombra dura) */}
      <div style={{position: 'absolute', left: FOTO.x + 16, top: FOTO.y + 16, width: FOTO.w, height: FOTO.h, background: N.bordo, opacity: 1 - sal}} />
      <div style={{position: 'absolute', left: FOTO.x, top: FOTO.y, width: FOTO.w, height: FOTO.h, overflow: 'hidden', background: N.texto, opacity: 1 - sal}}>
        {noti.fotos.map((p, i) => {
          if (f < fr(p.d) - 2 || f > fr(p.h) + 14) return null;
          const ent = ip(f, [fr(p.d), fr(p.d) + 14], [0, 1], E.snap);
          const kb = interpolate(f, [fr(p.d), fr(p.h) + 14], [1.04, 1.14]);
          return (
            <div key={i} style={{position: 'absolute', inset: 0, clipPath: `inset(0 ${(1 - ent) * 100}% 0 0)`}}>
              <Img src={staticFile(p.src)} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: p.pos ?? '50% 50%', scale: `${kb}`, transformOrigin: p.pos ?? '50% 50%'}} />
            </div>
          );
        })}
        {/* barrido rojo al cambiar de foto */}
        {noti.fotos.map((p, i) => {
          const k = ip(f, [fr(p.d) - 2, fr(p.d) + 14], [0, 1], E.snap);
          if (k <= 0 || k >= 1) return null;
          return <div key={'b' + i} style={{position: 'absolute', top: 0, bottom: 0, left: `${k * 100 - 4}%`, width: 26, background: N.rojo}} />;
        })}
      </div>
      {noti.fotos.map((p, i) =>
        f >= fr(p.d) && f < fr(p.h) ? (
          <div key={'c' + i} style={{position: 'absolute', left: FOTO.x, top: FOTO.y + FOTO.h + 26, width: FOTO.w, fontFamily: 'Mono', fontSize: 19, color: '#6B6E78', letterSpacing: 2, opacity: (1 - sal) * ip(f, [fr(p.d), fr(p.d) + 10], [0, 1])}}>{p.credito}</div>
        ) : null,
      )}
      {/* datos */}
      {noti.chips.map((c, i) => {
        const k = kf(f, [[fr(c.d), 0], [fr(c.d) + 14, 1, E.backFuerte]]);
        if (k <= 0) return null;
        const valor = c.num ? Math.round(ip(f, [fr(c.d), fr(c.d) + 40], [0, c.num], E.snap)) : c.arriba;
        return (
          <div key={i} style={{position: 'absolute', right: 1080 - FOTO.x - FOTO.w + 24, top: FOTO.y + 24 + (i % 2) * 168, minWidth: 230, padding: '14px 26px', background: i % 2 ? N.blanco : N.rojo,
            color: i % 2 ? N.texto : N.blanco, scale: `${k * (1 - sal)}`, transformOrigin: '100% 0', textAlign: 'right'}}>
            <div style={{fontFamily: 'Titulo', fontSize: String(c.arriba).length > 6 ? 60 : 88, lineHeight: 1}}>{valor}</div>
            <div style={{fontFamily: 'Mono', fontSize: 22, letterSpacing: 3}}>{c.abajo}</div>
          </div>
        );
      })}
      {/* zócalo */}
      <Zocalo noti={noti} />
    </>
  );
};

const Zocalo: React.FC<{noti: Noticia}> = ({noti}) => {
  const f = useCurrentFrame();
  const d = fr(noti.d) + 60;
  const barra = ip(f, [d, d + 16], [0, 1], E.snap);
  const tag = kf(f, [[d - 6, 0], [d + 8, 1, E.backFuerte]]);
  const sal = ip(f, [fr(noti.h) - 12, fr(noti.h)], [0, 1], E.in);
  const Y = 990;
  return (
    <div style={{opacity: 1 - sal}}>
      <div style={{position: 'absolute', left: 60, top: Y, height: 54, padding: '0 22px', background: N.rojo, color: N.blanco, fontFamily: 'Titulo', fontSize: 40, lineHeight: '54px', letterSpacing: 4, scale: `${tag}`, transformOrigin: '0 50%'}}>
        {noti.seccion}
      </div>
      <div style={{position: 'absolute', left: 60 + 0, top: Y + 54, width: 960 * barra, height: 120, background: N.bordo, overflow: 'hidden'}}>
        <div style={{position: 'absolute', left: 26, top: 0, width: 910, height: 120, display: 'flex', alignItems: 'center', fontFamily: 'Titulo', fontSize: noti.titular.length > 40 ? 52 : 60, lineHeight: 1.02, color: N.blanco, letterSpacing: 1,
          clipPath: `inset(0 ${(1 - ip(f, [d + 8, d + 26], [0, 1], E.snap)) * 100}% 0 0)`}}>
          {noti.titular}
        </div>
      </div>
      <div style={{position: 'absolute', left: 60, top: Y + 186, width: 960, display: 'flex', justifyContent: 'space-between', fontFamily: 'Mono', fontSize: 22, color: N.vino, letterSpacing: 3, opacity: ip(f, [d + 20, d + 30], [0, 1])}}>
        <span>{noti.fuente}</span>
        <span>{noti.fecha}</span>
      </div>
    </div>
  );
};

// cortina con el número de la noticia
const Cortina: React.FC<{noti: Noticia}> = ({noti}) => {
  const f = useCurrentFrame();
  const d = fr(noti.d);
  const entra = ip(f, [d, d + 14], [0, 1], E.snap);
  const sale = ip(f, [d + 46, d + 62], [0, 1], E.in);
  if (f < d || sale >= 1) return null;
  const x = -1080 + entra * 1080 + sale * 1080;
  return (
    <div style={{position: 'absolute', left: x, top: 0, width: 1080, height: 1920, background: N.rojo, overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 0, top: 560, width: 1080, textAlign: 'center', fontFamily: 'Titulo', fontSize: 560, lineHeight: 1, color: N.blanco, scale: `${kf(f, [[d + 6, 1.6], [d + 18, 1, E.snap]])}`}}>{noti.n}</div>
      <div style={{position: 'absolute', left: 0, top: 1140, width: 1080, textAlign: 'center', fontFamily: 'Mono', fontSize: 36, color: N.blanco, letterSpacing: 10}}>NOTICIA {noti.n} DE 3</div>
    </div>
  );
};

// ---------- intro ----------
const Intro: React.FC = () => {
  const f = useCurrentFrame();
  if (f > fr(5.6)) return null;
  return (
    <>
      <Golpe texto="LAS 3" desde={8} y={330} tam={250} color={N.rojo} paso={3} salida={fr(5.2)} />
      <Golpe texto="NOTICIAS" desde={22} y={510} tam={170} color={N.texto} paso={2} salida={fr(5.2)} espaciado={6} />
      <div style={{position: 'absolute', top: 610, width: 1080, display: 'flex', justifyContent: 'center', opacity: ip(f, [40, 50], [0, 1]) * (1 - ip(f, [fr(5.1), fr(5.3)], [0, 1]))}}>
        <div style={{background: N.bordo, color: N.blanco, fontFamily: 'Mono', fontSize: 28, letterSpacing: 6, padding: '10px 24px'}}>DE LA SEMANA · 1 AL 6 DE NOVIEMBRE</div>
      </div>
      <Subtitulo frase={F[0]} hasta={5.1} y={690} tam={64} color={N.texto} acento={N.rojo} />
    </>
  );
};

// ---------- cierre ----------
const Cierre: React.FC = () => {
  const f = useCurrentFrame();
  const d = fr(50.6);
  if (f < d) return null;
  return (
    <>
      {NOTICIAS.map((n, i) => {
        const k = ip(f, [d + 10 + i * 10, d + 24 + i * 10], [0, 1], E.snap);
        return (
          <div key={i} style={{position: 'absolute', left: 60, top: 230 + i * 150, width: 960, height: 128, display: 'flex', background: N.blanco, translate: `${(1 - k) * -1100}px 0px`}}>
            <div style={{width: 200, height: 128, overflow: 'hidden'}}>
              <Img src={staticFile(n.fotos[0].src)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
            </div>
            <div style={{width: 70, background: N.rojo, color: N.blanco, fontFamily: 'Titulo', fontSize: 70, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{n.n}</div>
            <div style={{flex: 1, padding: '0 22px', display: 'flex', alignItems: 'center', fontFamily: 'Titulo', fontSize: 36, color: N.texto, lineHeight: 1.05}}>{n.titular}</div>
          </div>
        );
      })}
      <Golpe texto="SEGUIME" desde={fr(53.4)} y={800} tam={190} color={N.rojo} paso={2} espaciado={8} />
      <div style={{position: 'absolute', top: 905, width: 1080, textAlign: 'center', fontFamily: 'Mono', fontSize: 34, color: N.texto, letterSpacing: 8, opacity: ip(f, [fr(53.9), fr(54.2)], [0, 1])}}>@NQV.TV</div>
    </>
  );
};

// ---------- capa fija: logo, fecha, ticker ----------
const TICKER = 'RONALDO DEJA LA SELECCIÓN DE PORTUGAL: 146 GOLES EN 234 PARTIDOS   ✦   LA ESTACIÓN ESPACIAL SUMA SU ÚLTIMO PANEL SOLAR NUEVO: DE 160 A 215 KILOVATIOS   ✦   LA NASA PRESENTA EL X-70 FRACTAL, UN AVIÓN EXPERIMENTAL TRIPULADO   ✦   FUENTES: EURONEWS · INFOBAE · NASA   ✦   ';
const Capa: React.FC = () => {
  const f = useCurrentFrame();
  const ent = ip(f, [0, 16], [0, 1], E.snap);
  const tick = ip(f, [fr(5.3), fr(5.8)], [0, 1], E.snap) * (1 - ip(f, [fr(50.4), fr(50.8)], [0, 1], E.in));
  const x = -((f * 3.2) % 3400);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <Lienzo>
        <g transform={`translate(126,108) scale(${0.26 * ent})`}><Logo f={9999} armado={0} /></g>
      </Lienzo>
      <div style={{position: 'absolute', left: 210, top: 88, fontFamily: 'Titulo', fontSize: 44, color: N.texto, letterSpacing: 4, opacity: ent}}>NOTICIAS</div>
      <div style={{position: 'absolute', right: 60, top: 80, display: 'flex', gap: 12, alignItems: 'center', opacity: ent}}>
        <div style={{width: 16, height: 16, borderRadius: 8, background: N.rojo, opacity: Math.floor(f / 30) % 2 ? 0.3 : 1}} />
        <div style={{fontFamily: 'Mono', fontSize: 24, color: N.texto, letterSpacing: 4}}>6 NOV 2026</div>
      </div>
      <div style={{position: 'absolute', left: 0, top: 1800, width: 1080, height: 64, background: N.bordo, overflow: 'hidden', translate: `0px ${(1 - tick) * 140}px`}}>
        <div style={{position: 'absolute', left: 0, top: 0, height: 64, display: 'flex', alignItems: 'center', translate: `${x + 200}px 0px`, whiteSpace: 'pre', fontFamily: 'Mono', fontSize: 26, color: N.blanco, letterSpacing: 3}}>
          {TICKER + TICKER + TICKER}
        </div>
        <div style={{position: 'absolute', left: 0, top: 0, width: 190, height: 64, background: N.rojo, color: N.blanco, fontFamily: 'Titulo', fontSize: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', letterSpacing: 3}}>RESUMEN</div>
      </div>
      <div style={{position: 'absolute', left: 0, top: 0, width: 1080 * (f / DUR_SEMANA), height: 8, background: N.rojo}} />
    </AbsoluteFill>
  );
};

export type Cue = {f: number; src: string; vol?: number};
const c = (s: number, n: string, vol = 0.5): Cue => ({f: fr(s), src: `sfx/${n}.mp3`, vol});
export const CUES_SEMANA: Cue[] = [
  c(0.1, 'letra', 0.5), c(0.4, 'letra2', 0.4), c(0.7, 'aparece', 0.4),
  ...NOTICIAS.flatMap((n) => [c(n.d, 'zoom', 0.5), c(n.d + 0.15, 'grave', 0.55), c(n.d + 0.78, 'wipe', 0.4), c(n.d + 1.0, 'vuelo1', 0.3),
    ...n.fotos.slice(1).map((p) => c(p.d, 'vuelo2', 0.3)), ...n.chips.map((q) => c(q.d, 'pop', 0.4))]),
  c(50.6, 'wipe2', 0.4), c(50.8, 'pop', 0.3), c(51.0, 'pop', 0.3), c(51.2, 'pop', 0.3), c(53.4, 'grave', 0.55), c(53.4, 'letra', 0.5),
];

export const NoticiasSemana: React.FC<{cues: Cue[]}> = ({cues}) => {
  useFuentes();
  const f = useCurrentFrame();
  const noti = NOTICIAS.find((n) => f >= fr(n.d) + 40 && f < fr(n.h));
  // poses de Sinty: grande en la intro y el cierre, chica abajo a la izquierda en las noticias
  return (
    <AbsoluteFill style={{background: N.fondo}}>
      <Intro />
      {noti && <Tarjeta noti={noti} />}
      {NOTICIAS.map((n) => n.frases.map((i) => <Subtitulo key={i} frase={F[i]} hasta={Math.min(F[i].h + 0.8, (F[i + 1]?.d ?? 99) - 0.1)} y={1260} tam={F[i].texto.length > 70 ? 60 : 68} color={N.texto} acento={N.rojo} ancho={640} x={380} alinear="left" />))}
      <Cierre />
      {f >= fr(50.6) && f < fr(53.3) && <Subtitulo frase={F[12]} hasta={53.2} y={720} tam={64} color={N.texto} acento={N.rojo} />}
      <Personaje carpeta="sinty" poses={[[0, '02']]} desde={10} hasta={fr(5.0)} x={540} base={1930} alto={960} ancho={0.85} frases={F} aura={N.plata} aura2={N.bordo} />
      <Personaje carpeta="sinty" poses={[[fr(6), '07'], [fr(10.4), '03'], [fr(16.3), '02'], [fr(22.3), '10'], [fr(27.3), '11'], [fr(33.6), '03'], [fr(38.4), '06'], [fr(44.8), '11']]}
        desde={fr(6.2)} hasta={fr(50.3)} x={190} base={1770} alto={500} ancho={0.62} frases={F} aura={N.plata} aura2={N.bordo} />
      <Personaje carpeta="sinty" poses={[[0, '11'], [fr(53.3), '02']]} desde={fr(51.0)} x={540} base={1790} alto={820} ancho={0.85} frases={F} aura={N.plata} aura2={N.bordo} />
      {NOTICIAS.map((n) => <Cortina key={n.n} noti={n} />)}
      <Capa />
      <Audio src={staticFile('voz/sinty-semana.mp3')} volume={1} />
      <Audio src={staticFile('musica/noticias-ambient.mp3')} volume={(x) => interpolate(x, [0, 30, fr(53.2), fr(53.6), DUR_SEMANA - 40, DUR_SEMANA], [0, 0.12, 0.12, 0.28, 0.28, 0], {extrapolateRight: 'clamp'})} />
      {cues.map((q, i) => (
        <Sequence key={i} from={q.f} durationInFrames={150}>
          <Audio src={staticFile(q.src)} volume={q.vol ?? 0.5} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
