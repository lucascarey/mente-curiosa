import React from 'react';
import {AbsoluteFill, Sequence, staticFile, useCurrentFrame, interpolate} from 'remotion';
import {Audio} from '@remotion/media';
import {C, E, ip, kf, rnd, Golpe, useFuentes} from './lib';
import {Lienzo, Logo, LOGO_ESQUINA, temblor, puntos} from './ReelCiencia';
import {Frase, Personaje, Subtitulo, s2f} from './episodio';

// Ciencia #001 "¿Y si el Sol desapareciera?" con la voz de Neurón (Charon). Tiempos medidos en la voz.
export const FRASES_SOL: Frase[] = [
  {d: 0.24, h: 3.53, texto: 'Si el Sol desapareciera ahora mismo... no te enterarías.', clave: ['sol', 'enterarías']},
  {d: 4.23, h: 6.97, texto: 'Durante ocho minutos, todo seguiría igual.', clave: ['ocho', 'minutos']},
  {d: 7.93, h: 10.93, texto: 'El Sol está a 150 millones de kilómetros.', clave: ['150', 'millones']},
  {d: 11.8, h: 18.37, texto: 'Y su luz, aunque es lo más rápido del universo, tarda 8 minutos y 20 segundos en llegar hasta acá.', clave: ['luz', '8', 'minutos', '20', 'segundos']},
  {d: 19.86, h: 22.93, texto: 'Así que seguirías viendo un Sol... que ya no existe.', clave: ['ya', 'no', 'existe']},
  {d: 24.24, h: 24.82, texto: '¿Y la Tierra?', clave: ['tierra']},
  {d: 25.95, h: 27.78, texto: 'Seguiría girando, como si nada.', clave: ['girando']},
  {d: 28.78, h: 31.56, texto: 'Porque la gravedad también viaja a la velocidad de la luz.', clave: ['gravedad', 'luz']},
  {d: 32.8, h: 38.65, texto: 'Recién después de esos ocho minutos, saldríamos disparados en línea recta, hacia la oscuridad.', clave: ['línea', 'recta', 'oscuridad']},
  {d: 40.31, h: 42.69, texto: 'Mirar el cielo es mirar el pasado.', clave: ['pasado']},
  {d: 43.88, h: 46.0, texto: 'Para más datos curiosos, sígueme.', clave: ['sígueme']},
];
export const DUR_SOL = s2f(47.6);
const F = FRASES_SOL;
// cortes de escena (s)
const K = {gancho: 0, marca: 7.0, dist: 8.15, viaje: 11.45, fantasma: 19.3, orbita: 23.6, grav: 28.35, escape: 32.35, cielo: 39.6, cierre: 43.4};
const fr = (s: number) => s2f(s);

const Fondo: React.FC<{d: number; h: number; color: string; children: React.ReactNode}> = ({d, h, color, children}) => {
  const f = useCurrentFrame();
  if (f < fr(d) || f >= fr(h)) return null;
  return <AbsoluteFill style={{background: color}}>{children}</AbsoluteFill>;
};

const Sub: React.FC<{i: number; hasta?: number; color?: string; y?: number}> = ({i, hasta, color = C.claro, y = 250}) => (
  <Subtitulo frase={F[i]} hasta={hasta} y={y} tam={F[i].texto.length > 70 ? 70 : 84} color={color} acento={C.acento} />
);

// ---------- 1. gancho ----------
const Gancho: React.FC = () => {
  const f = useCurrentFrame();
  const sol = kf(f, [[6, 0], [24, 1, E.backFuerte]]);
  const apaga = ip(f, [fr(2.2), fr(2.45)], [0, 1], E.in);
  const fantasma = ip(f, [fr(4.2), fr(4.6)], [0, 1], E.snap);
  const reloj = ip(f, [fr(4.4), fr(6.9)], [0, 1], E.lin);
  const r = 170 * sol * (1 - apaga) + 18 * apaga;
  const zoom = ip(f, [fr(6.75), fr(7.0)], [0, 1], E.in);
  return (
    <AbsoluteFill style={{translate: temblor(f, [fr(2.45)], 14)}}>
      <Lienzo>
        {Array.from({length: 14}).map((_, i) => {
          const a = (i / 14) * Math.PI * 2 + f / 90;
          const k = ip(f, [14 + i, 26 + i], [0, 1]) * (1 - apaga);
          if (k <= 0) return null;
          const r0 = r + 30;
          const r1 = r + 30 + 80 * k;
          return <line key={i} x1={540 + Math.cos(a) * r0} y1={880 + Math.sin(a) * r0} x2={540 + Math.cos(a) * r1} y2={880 + Math.sin(a) * r1} stroke={C.acento} strokeWidth={16} strokeLinecap="round" />;
        })}
        {/* el Sol que todavía ves: contorno fantasma + reloj de 8 minutos */}
        <circle cx={540} cy={880} r={170 * fantasma} fill="none" stroke={C.acento} strokeWidth={6} strokeDasharray="18 16" transform={`rotate(${f * 0.5} 540 880)`} opacity={fantasma} />
        <circle cx={540} cy={880} r={230} fill="none" stroke={C.claro} strokeWidth={10} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - reloj} transform="rotate(-90 540 880)" opacity={fantasma} />
        <circle cx={540} cy={880} r={Math.max(r, 0) + zoom * 1500} fill={C.acento} />
      </Lienzo>
      {fantasma > 0 && zoom < 0.3 && (
        <div style={{position: 'absolute', top: 840, width: 1080, textAlign: 'center', fontFamily: 'Titulo', fontSize: 80, color: C.claro, opacity: fantasma}}>
          {`0${Math.floor(reloj * 8)}:00`}
        </div>
      )}
      {zoom < 0.5 && (
        <>
          <Sub i={0} hasta={3.9} />
          <Sub i={1} hasta={6.75} />
          <Personaje carpeta="neuron" poses={[[0, '03']]} desde={fr(0.6)} hasta={fr(6.6)} x={540} base={1960} alto={700} frases={F} aura={C.petroleo} aura2={C.profundo} />
        </>
      )}
    </AbsoluteFill>
  );
};

// ---------- 2. marca (1 s) ----------
const Marca: React.FC = () => {
  const f = useCurrentFrame() - fr(K.marca);
  const wipe = ip(f, [0, 16], [0, 1], E.snap);
  const mv = ip(f, [52, 74], [0, 1], E.inOut);
  const x = interpolate(mv, [0, 1], [540, LOGO_ESQUINA.x]);
  const y = interpolate(mv, [0, 1], [900, LOGO_ESQUINA.y]);
  const s = interpolate(mv, [0, 1], [1.45, LOGO_ESQUINA.s]);
  return (
    <AbsoluteFill style={{background: C.acento}}>
      <Lienzo>
        <circle cx={540} cy={960} r={1200 * wipe} fill={C.claro} />
        <g transform={`translate(${x},${y}) scale(${s})`}>
          <Logo f={f} armado={6} />
        </g>
      </Lienzo>
    </AbsoluteFill>
  );
};

// ---------- 3. distancia ----------
const Distancia: React.FC = () => {
  const f = useCurrentFrame() - fr(K.dist);
  const SOL = {x: 200, y: 980};
  const TI = {x: 880, y: 980};
  const sol = kf(f, [[0, 0], [16, 1, E.backFuerte]]);
  const ti = kf(f, [[10, 0], [26, 1, E.backFuerte]]);
  const linea = ip(f, [24, 150], [0, 1], E.inOut);
  const km = Math.round(ip(f, [24, 150], [0, 150000000], E.inOut) / 1000000) * 1000000;
  const wipe = ip(f, [fr(11.2) - fr(K.dist), fr(11.45) - fr(K.dist)], [0, 1], E.in);
  return (
    <AbsoluteFill>
      <Lienzo>
        <circle cx={SOL.x} cy={SOL.y} r={110 * sol} fill={C.acento} />
        <circle cx={TI.x} cy={TI.y} r={44 * ti} fill={C.profundo} />
        <path d={`M${TI.x - 44 * ti},${TI.y} A${44 * ti},${44 * ti} 0 0 0 ${TI.x + 44 * ti},${TI.y} Z`} fill={C.petroleo} />
        <line x1={SOL.x + 130} x2={SOL.x + 130 + (TI.x - 60 - SOL.x - 130) * linea} y1={980} y2={980} stroke={C.oscuro} strokeWidth={5} strokeDasharray="2 14" strokeLinecap="round" />
        {[0, 1].map((i) => <line key={i} x1={i ? TI.x - 60 : SOL.x + 130} x2={i ? TI.x - 60 : SOL.x + 130} y1={950} y2={1010} stroke={C.oscuro} strokeWidth={5} opacity={i ? linea : sol} />)}
        <circle cx={TI.x} cy={TI.y} r={2100 * wipe} fill={C.petroleo} />
      </Lienzo>
      {wipe < 0.3 && (
        <>
          <div style={{position: 'absolute', top: 1120, width: 1080, textAlign: 'center', fontFamily: 'Titulo', fontSize: 130, color: C.oscuro, letterSpacing: 3, opacity: ip(f, [20, 26], [0, 1])}}>
            {puntos(km)}<span style={{color: C.acento}}> KM</span>
          </div>
          <div style={{position: 'absolute', top: 1270, width: 1080, textAlign: 'center', fontFamily: 'Mono', fontSize: 28, color: C.profundo, letterSpacing: 6, opacity: ip(f, [30, 40], [0, 1])}}>DISTANCIA SOL — TIERRA</div>
          <Sub i={2} hasta={11.2} color={C.oscuro} />
        </>
      )}
    </AbsoluteFill>
  );
};

// ---------- 4. el viaje de la luz (gráfico que corre con la voz) ----------
const Viaje: React.FC = () => {
  const f = useCurrentFrame();
  const ini = fr(13.3); // "tarda..." arranca el reloj
  const fin = fr(18.0);
  const X0 = 140;
  const X1 = 940;
  const Y = 1260;
  const t = ip(f, [ini, fin], [0, 1], E.lin);
  const seg = Math.round(t * 500);
  const x = X0 + (X1 - X0) * t;
  const llega = f >= fin;
  const flash = llega ? kf(f, [[fin, 1.5], [fin + 14, 1, E.snap]]) : 1;
  const local = f - fr(K.viaje);
  const eje = ip(local, [0, 20], [0, 1]);
  const cierra = ip(f, [fr(19.05), fr(19.3)], [0, 1], E.in);
  return (
    <AbsoluteFill style={{translate: temblor(f, [fin], 18)}}>
      <div style={{position: 'absolute', top: 820, width: 1080, textAlign: 'center', fontFamily: 'Mono', fontSize: 30, color: C.claro, letterSpacing: 8, opacity: eje * (1 - cierra)}}>LA LUZ VIAJANDO HACIA LA TIERRA</div>
      <div style={{position: 'absolute', top: 870, width: 1080, textAlign: 'center', fontFamily: 'Titulo', fontSize: 230, lineHeight: 1, color: llega ? C.acento : C.blanco, scale: `${flash * (1 - cierra)}`, opacity: eje}}>
        {String(Math.floor(seg / 60)).padStart(2, '0')}:{String(seg % 60).padStart(2, '0')}
      </div>
      <Lienzo>
        <rect x={X0} y={Y - 80} width={Math.max(0, x - X0) * (1 - cierra)} height={80} fill={C.profundo} />
        <line x1={X0} x2={X0 + (X1 - X0) * eje} y1={Y + 2} y2={Y + 2} stroke={C.claro} strokeWidth={4} opacity={1 - cierra} />
        {Array.from({length: 9}).map((_, i) => {
          const tx = X0 + ((X1 - X0) * i * 60) / 500;
          const tf = ini + ((fin - ini) * i * 60) / 500;
          const k = ip(f, [tf, tf + 5], [0, 1], E.snap);
          return (
            <g key={i} opacity={1 - cierra}>
              <line x1={tx} x2={tx} y1={Y + 2} y2={Y + 2 + 24 * eje} stroke={C.claro} strokeWidth={4} />
              <line x1={tx} x2={tx} y1={Y - 80 * k} y2={Y} stroke={C.claro} strokeWidth={3} opacity={0.5} />
              <text x={tx} y={Y + 70} textAnchor="middle" fontFamily="Mono" fontSize={30} fill={C.claro} opacity={0.3 + 0.7 * k}>{i}</text>
            </g>
          );
        })}
        <text x={X0} y={Y + 125} fontFamily="Mono" fontSize={24} fill={C.claro} letterSpacing={4} opacity={(1 - cierra) * 0.8}>MINUTOS</text>
        <line x1={X0} x2={x} y1={Y - 80} y2={Y - 80} stroke={C.blanco} strokeWidth={8} opacity={1 - cierra} />
        <circle cx={X0} cy={Y - 80} r={40 * eje * (1 - cierra)} fill={C.acento} />
        <circle cx={X1} cy={Y - 80} r={30 * eje * (1 - cierra) * flash} fill={C.profundo} stroke={C.claro} strokeWidth={6} />
        {llega && <circle cx={X1} cy={Y - 80} r={30 + (f - fin) * 8} fill="none" stroke={C.acento} strokeWidth={6} opacity={Math.max(0, 1 - (f - fin) / 22)} />}
        <circle cx={x} cy={Y - 80} r={t > 0 ? 18 : 0} fill={C.blanco} />
        <circle cx={X1} cy={Y - 80} r={2200 * cierra} fill={C.oscuro} />
      </Lienzo>
      {cierra < 0.3 && <Sub i={3} hasta={19.05} />}
    </AbsoluteFill>
  );
};

// ---------- 5. el Sol fantasma ----------
const Fantasma: React.FC = () => {
  const f = useCurrentFrame();
  const l = f - fr(K.fantasma);
  const sol = kf(l, [[0, 0], [18, 1, E.backFuerte]]);
  const borra = ip(f, [fr(21.4), fr(21.8)], [0, 1], E.snap);
  return (
    <AbsoluteFill>
      <Lienzo>
        {/* rayos de luz que siguen viajando */}
        {Array.from({length: 7}).map((_, i) => {
          const p = ((l / 70 + i / 7) % 1);
          const x = 330 + p * 560;
          return <line key={i} x1={x} x2={x + 60} y1={980 + (i - 3) * 6} y2={980 + (i - 3) * 6} stroke={C.acento} strokeWidth={8} strokeLinecap="round" opacity={sol * 0.9} />;
        })}
        <circle cx={220} cy={980} r={120 * sol} fill={C.acento} opacity={1 - borra} />
        <circle cx={220} cy={980} r={120 * sol} fill="none" stroke={C.acento} strokeWidth={6} strokeDasharray="16 14" opacity={borra} transform={`rotate(${l * 0.6} 220 980)`} />
        <circle cx={900} cy={980} r={40 * sol} fill={C.profundo} />
        <path d={`M${860},980 A40,40 0 0 0 940,980 Z`} fill={C.petroleo} opacity={sol} />
      </Lienzo>
      {borra > 0 && (
        <div style={{position: 'absolute', left: 60, top: 1140, width: 320, textAlign: 'center', fontFamily: 'Mono', fontSize: 30, color: C.acento, letterSpacing: 4, opacity: borra}}>YA NO ESTÁ</div>
      )}
      <div style={{position: 'absolute', left: 760, top: 1060, width: 280, textAlign: 'center', fontFamily: 'Mono', fontSize: 28, color: C.claro, letterSpacing: 4, opacity: sol}}>TIERRA</div>
      <Sub i={4} hasta={23.4} />
    </AbsoluteFill>
  );
};

// ---------- 6. la órbita ----------
const Orbita: React.FC = () => {
  const f = useCurrentFrame();
  const l = f - fr(K.orbita);
  const cx = 540;
  const cy = 1000;
  const RX = 360;
  const RY = 140;
  const t = -Math.PI / 2 + l * 0.022;
  const p = {x: cx + RX * Math.cos(t), y: cy + RY * Math.sin(t)};
  return (
    <AbsoluteFill>
      <Lienzo>
        <g transform={`rotate(-10 ${cx} ${cy})`}>
          {[[0, C.claro], [18, C.suave], [36, C.petroleo]].map(([o, col], i) => (
            <ellipse key={i} cx={cx} cy={cy} rx={RX + (o as number)} ry={RY + (o as number) * 0.5} fill="none" stroke={col as string} strokeWidth={5}
              pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - ip(l, [2 + i * 5, 36 + i * 5], [0, 1], E.inOut)} />
          ))}
          <circle cx={cx} cy={cy} r={90 * ip(l, [0, 16], [0, 1], E.backFuerte)} fill="none" stroke={C.acento} strokeWidth={6} strokeDasharray="16 14" transform={`rotate(${l * 0.6} ${cx} ${cy})`} />
          {Array.from({length: 12}).map((_, i) => {
            const tt = t - (i + 1) * 0.05;
            return l > 30 ? <circle key={i} cx={cx + RX * Math.cos(tt)} cy={cy + RY * Math.sin(tt)} r={22 - i * 1.5} fill={C.suave} opacity={0.5 - i * 0.04} /> : null;
          })}
          <circle cx={p.x} cy={p.y} r={30 * ip(l, [14, 30], [0, 1], E.backFuerte) * (1 + 0.25 * Math.sin(t))} fill={C.petroleo} stroke={C.claro} strokeWidth={5} />
        </g>
      </Lienzo>
      <Sub i={5} hasta={25.7} />
      <Sub i={6} hasta={28.1} />
    </AbsoluteFill>
  );
};

// ---------- 7. la gravedad también tarda ----------
const Gravedad: React.FC = () => {
  const f = useCurrentFrame();
  const l = f - fr(K.grav);
  const ondas = Array.from({length: 6});
  return (
    <AbsoluteFill>
      <Lienzo>
        {ondas.map((_, i) => {
          const p = ((l / 80 + i / 6) % 1);
          return <circle key={i} cx={200} cy={1000} r={40 + p * 720} fill="none" stroke={C.claro} strokeWidth={5} opacity={(1 - p) * ip(l, [0, 20], [0, 1])} />;
        })}
        <circle cx={200} cy={1000} r={70 * ip(l, [0, 14], [0, 1], E.backFuerte)} fill="none" stroke={C.acento} strokeWidth={6} strokeDasharray="16 14" />
        <circle cx={900} cy={1000} r={40 * ip(l, [6, 22], [0, 1], E.backFuerte)} fill={C.profundo} stroke={C.claro} strokeWidth={5} />
        <line x1={300} x2={300 + 520 * ip(l, [20, 120], [0, 1], E.inOut)} y1={1180} y2={1180} stroke={C.acento} strokeWidth={6} />
      </Lienzo>
      <div style={{position: 'absolute', top: 1210, width: 1080, textAlign: 'center', fontFamily: 'Mono', fontSize: 30, color: C.claro, letterSpacing: 6, opacity: ip(l, [40, 50], [0, 1])}}>
        VELOCIDAD = <span style={{color: C.acento}}>LUZ</span>
      </div>
      <Sub i={7} hasta={32.1} />
    </AbsoluteFill>
  );
};

// ---------- 8. la Tierra sale disparada ----------
const Escape: React.FC = () => {
  const f = useCurrentFrame();
  const l = f - fr(K.escape);
  const suelta = fr(36.3) - fr(K.escape); // "en línea recta"
  const cx = 540;
  const cy = 1000;
  const RX = 360;
  const RY = 140;
  const t0 = -Math.PI / 2 + Math.min(l, suelta) * 0.022 + 1.2;
  const base = {x: cx + RX * Math.cos(t0), y: cy + RY * Math.sin(t0)};
  const tx = -RX * Math.sin(t0);
  const ty = RY * Math.cos(t0);
  const n = Math.hypot(tx, ty);
  const vuela = Math.max(0, l - suelta);
  const dist = vuela * vuela * 0.06 + vuela * 3;
  const px = base.x + (tx / n) * dist;
  const py = base.y + (ty / n) * dist;
  const orbOp = 1 - ip(l, [suelta, suelta + 20], [0, 1]);
  const oscuro = ip(f, [fr(37.6), fr(39.4)], [0, 1], E.inOut);
  return (
    <AbsoluteFill>
      <Lienzo>
        <g transform={`rotate(-10 ${cx} ${cy})`}>
          <ellipse cx={cx} cy={cy} rx={RX} ry={RY} fill="none" stroke={C.suave} strokeWidth={5} strokeDasharray="10 12" opacity={orbOp * 0.6} />
          {vuela > 0 && <line x1={base.x} y1={base.y} x2={px} y2={py} stroke={C.acento} strokeWidth={5} strokeDasharray="4 12" strokeLinecap="round" />}
          <circle cx={vuela > 0 ? px : base.x} cy={vuela > 0 ? py : base.y} r={30} fill={C.petroleo} stroke={C.claro} strokeWidth={5} />
        </g>
        {/* 8 minutos que pasan */}
        <circle cx={540} cy={1000} r={80} fill="none" stroke={C.claro} strokeWidth={8} pathLength={1} strokeDasharray="1 1"
          strokeDashoffset={1 - ip(l, [10, suelta], [0, 1], E.lin)} transform="rotate(-90 540 1000)" opacity={orbOp} />
        <rect x={0} y={0} width={1080} height={1920} fill="#000" opacity={oscuro * 0.65} />
      </Lienzo>
      <div style={{position: 'absolute', top: 970, width: 1080, textAlign: 'center', fontFamily: 'Titulo', fontSize: 52, color: C.claro, opacity: orbOp}}>
        {`0${Math.min(8, Math.floor(ip(l, [10, suelta], [0, 8.33], E.lin)))}:${ip(l, [10, suelta], [0, 1]) >= 1 ? '20' : '00'}`}
      </div>
      <Sub i={8} hasta={39.3} />
    </AbsoluteFill>
  );
};

// ---------- 9. mirar el cielo es mirar el pasado ----------
const ESTRELLAS = [
  {x: 300, y: 820, nombre: 'SOL', t: '8 MIN', s: 40.7},
  {x: 760, y: 900, nombre: 'ALFA CENTAURI', t: '4 AÑOS', s: 41.4},
  {x: 520, y: 1180, nombre: 'ANDRÓMEDA', t: '2.500.000 AÑOS', s: 42.1},
];
const Cielo: React.FC = () => {
  const f = useCurrentFrame();
  const l = f - fr(K.cielo);
  return (
    <AbsoluteFill>
      <Lienzo>
        {Array.from({length: 70}).map((_, i) => {
          const k = ip(l, [i * 0.4, i * 0.4 + 10], [0, 1]);
          const tw = 0.5 + 0.5 * Math.sin(f / 13 + i);
          return <circle key={i} cx={rnd(i, 8) * 1080} cy={420 + rnd(i, 9) * 1100} r={(1.5 + rnd(i, 3) * 3) * k} fill={C.claro} opacity={0.3 + tw * 0.5} />;
        })}
        {ESTRELLAS.map((e, i) => {
          const k = kf(f, [[fr(e.s), 0], [fr(e.s) + 14, 1, E.backFuerte]]);
          return (
            <g key={i}>
              <circle cx={e.x} cy={e.y} r={22 * k} fill={i === 0 ? C.acento : C.claro} />
              <circle cx={e.x} cy={e.y} r={44 * k} fill="none" stroke={C.suave} strokeWidth={3} />
            </g>
          );
        })}
      </Lienzo>
      {ESTRELLAS.map((e, i) => {
        const k = ip(f, [fr(e.s) + 6, fr(e.s) + 14], [0, 1]);
        return (
          <div key={i} style={{position: 'absolute', left: e.x - 200, top: e.y + 58, width: 400, textAlign: 'center', opacity: k}}>
            <div style={{fontFamily: 'Mono', fontSize: 24, color: C.suave, letterSpacing: 4}}>{e.nombre}</div>
            <div style={{fontFamily: 'Titulo', fontSize: 52, color: C.claro}}>HACE <span style={{color: C.acento}}>{e.t}</span></div>
          </div>
        );
      })}
      <Sub i={9} hasta={43.2} />
    </AbsoluteFill>
  );
};

// ---------- 10. cierre ----------
const Cierre: React.FC = () => {
  const f = useCurrentFrame();
  const l = f - fr(K.cierre);
  const reglas = ip(l, [30, 50], [0, 1], E.inOut);
  return (
    <AbsoluteFill>
      <Golpe texto="SÍGUEME" desde={fr(45.1)} y={560} tam={200} color={C.claro} paso={2} espaciado={8} />
      <Lienzo>
        <line x1={540 - 300 * reglas} x2={540 + 300 * reglas} y1={420} y2={420} stroke={C.acento} strokeWidth={3} />
        <line x1={540 - 300 * reglas} x2={540 + 300 * reglas} y1={700} y2={700} stroke={C.acento} strokeWidth={3} />
      </Lienzo>
      <div style={{position: 'absolute', top: 440, width: 1080, textAlign: 'center', fontFamily: 'Mono', fontSize: 34, color: C.claro, letterSpacing: 8, opacity: ip(l, [34, 44], [0, 1])}}>PARA MÁS DATOS CURIOSOS</div>
      <div style={{position: 'absolute', top: 720, width: 1080, textAlign: 'center', fontFamily: 'Mono', fontSize: 34, color: C.acento, letterSpacing: 6, opacity: ip(f, [fr(45.6), fr(45.9)], [0, 1])}}>@NQV.TV</div>
      <Personaje carpeta="neuron" poses={[[0, '08']]} desde={fr(K.cierre) + 4} x={540} base={1900} alto={860} frases={F} aura={C.petroleo} aura2={C.profundo} />
    </AbsoluteFill>
  );
};

// ---------- capa: logo en la esquina, barra de progreso ----------
const Capa: React.FC = () => {
  const f = useCurrentFrame();
  const claro = f >= fr(K.dist) && f < fr(K.viaje);
  const col = claro ? C.oscuro : C.claro;
  const prog = f / DUR_SOL;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <Lienzo>
        {f >= fr(K.dist) && (
          <g transform={`translate(${LOGO_ESQUINA.x},${LOGO_ESQUINA.y}) scale(${LOGO_ESQUINA.s})`}>
            <Logo f={9999} armado={0} />
          </g>
        )}
        <rect x={0} y={0} width={1080 * prog} height={8} fill={C.acento} />
      </Lienzo>
      {f >= fr(K.dist) && <div style={{position: 'absolute', right: 70, top: 92, fontFamily: 'Mono', fontSize: 26, color: col, letterSpacing: 4}}>CIENCIA</div>}
    </AbsoluteFill>
  );
};

const NeuronChico: React.FC = () => (
  <Personaje carpeta="neuron" poses={[[fr(K.dist), '01'], [fr(K.viaje), '11'], [fr(K.fantasma), '03'], [fr(K.grav), '11'], [fr(K.cielo), '01']]}
    desde={fr(K.dist) + 10} hasta={fr(K.cierre) - 14} x={170} base={1850} alto={380} frases={F} aura={C.suave} aura2={C.profundo} />
);

export type Cue = {f: number; src: string; vol?: number};
const c = (s: number, n: string, vol = 0.5): Cue => ({f: fr(s), src: `sfx/${n}.mp3`, vol});
export const CUES_SOL: Cue[] = [
  c(0.1, 'pop', 0.5), c(2.4, 'blip', 0.6), c(4.2, 'arco', 0.4), c(6.75, 'zoom', 0.6), c(7.1, 'burbuja', 0.6), c(7.2, 'vuelo1', 0.35), c(7.3, 'vuelo3', 0.35), c(7.9, 'mover', 0.4),
  c(8.2, 'pop', 0.35), c(8.6, 'junta', 0.3), c(11.2, 'wipe', 0.45),
  ...Array.from({length: 9}).map((_, i) => c(13.3 + (4.7 * i * 60) / 500, 'madera', 0.45)),
  c(18.0, 'grave', 0.7), c(18.0, 'llega', 0.4), c(19.05, 'wipe2', 0.45),
  c(19.4, 'pop', 0.3), c(21.4, 'blip', 0.45), c(23.6, 'orbita', 0.35), c(28.4, 'arco', 0.35),
  c(32.4, 'pop', 0.3), c(36.3, 'tunel2', 0.45), c(39.6, 'puntos', 0.2), c(40.7, 'pop', 0.35), c(41.4, 'pop', 0.35), c(42.1, 'pop', 0.35),
  c(43.4, 'aparece', 0.45), c(45.1, 'grave', 0.6), c(45.1, 'letra', 0.5),
];

export const EpisodioSol: React.FC<{cues: Cue[]}> = ({cues}) => {
  useFuentes();
  return (
    <AbsoluteFill style={{background: C.oscuro}}>
      <Fondo d={K.gancho} h={K.marca} color={C.oscuro}><Gancho /></Fondo>
      <Fondo d={K.marca} h={K.dist} color={C.acento}><Marca /></Fondo>
      <Fondo d={K.dist} h={K.viaje} color={C.claro}><Distancia /></Fondo>
      <Fondo d={K.viaje} h={K.fantasma} color={C.petroleo}><Viaje /></Fondo>
      <Fondo d={K.fantasma} h={K.orbita} color={C.oscuro}><Fantasma /></Fondo>
      <Fondo d={K.orbita} h={K.grav} color={C.oscuro}><Orbita /></Fondo>
      <Fondo d={K.grav} h={K.escape} color={C.profundo}><Gravedad /></Fondo>
      <Fondo d={K.escape} h={K.cielo} color={C.oscuro}><Escape /></Fondo>
      <Fondo d={K.cielo} h={K.cierre} color={C.oscuro}><Cielo /></Fondo>
      <Fondo d={K.cierre} h={60} color={C.oscuro}><Cierre /></Fondo>
      <NeuronChico />
      <Capa />
      <Audio src={staticFile('voz/neuron-sol.mp3')} volume={1} />
      <Audio src={staticFile('musica/ciencia-chill.mp3')} volume={(x) => interpolate(x, [0, 30, fr(45), fr(45.6), DUR_SOL - 40, DUR_SOL], [0, 0.13, 0.13, 0.32, 0.32, 0], {extrapolateRight: 'clamp'})} />
      {cues.map((q, i) => (
        <Sequence key={i} from={q.f} durationInFrames={150}>
          <Audio src={staticFile(q.src)} volume={q.vol ?? 0.5} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
