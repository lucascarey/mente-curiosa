import React from 'react';
import {AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame, interpolate} from 'remotion';
import {Audio} from '@remotion/media';
import {C, E, ip, kf, rnd, Golpe, Tipeo, useFuentes} from './lib';

// Reel de estilo Ciencia v2: "Si el Sol desapareciera". 60 fps, 20 s.
// Hilo conductor: la burbuja rosa (acento) lidera cada transición.
export const DURACION = 1200;
const CAP = [
  {d: 0, h: 225, nombre: 'EL GANCHO', fondo: C.oscuro},
  {d: 225, h: 338, nombre: 'NQV', fondo: C.claro},
  {d: 338, h: 563, nombre: 'LA LUZ', fondo: C.claro},
  {d: 563, h: 788, nombre: 'EL VIAJE', fondo: C.petroleo},
  {d: 788, h: 984, nombre: 'LA ÓRBITA', fondo: C.oscuro},
  {d: 984, h: 1200, nombre: 'CIERRE', fondo: C.oscuro},
];

const W = 1080;
const H = 1920;
const Lienzo: React.FC<{children: React.ReactNode}> = ({children}) => (
  <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
    {children}
  </svg>
);

// temblor que decae
const temblor = (f: number, golpes: number[], fuerza = 18) => {
  let x = 0;
  let y = 0;
  for (const g of golpes) {
    const t = f - g;
    if (t >= 0 && t < 16) {
      const a = fuerza * Math.pow(1 - t / 16, 2);
      x += (rnd(t, g) - 0.5) * 2 * a;
      y += (rnd(t + 50, g) - 0.5) * 2 * a;
    }
  }
  return `${x}px ${y}px`;
};

const puntos = (n: number) => n.toLocaleString('es-AR').replace(/,/g, '.');

// ---------- Neurón ----------
const Neuron: React.FC<{pose: string; desde: number; x: number; base: number; alto: number; hasta?: number; aura?: boolean}> = ({
  pose, desde, x, base, alto, hasta, aura,
}) => {
  const f = useCurrentFrame();
  if (f < desde) return null;
  const ent = kf(f, [[desde, 0], [desde + 14, 1, E.backFuerte]]);
  const sal = hasta !== undefined ? ip(f, [hasta, hasta + 10], [0, 1], E.in) : 0;
  const resp = 1 + Math.sin((f - desde) / 9) * 0.012;
  const dy = (1 - ent) * (alto + 200) + sal * (alto + 200);
  return (
    <div style={{position: 'absolute', left: x - alto * 0.35, top: base - alto + dy, width: alto * 0.7, height: alto}}>
      {aura && (
        <svg width={alto * 1.6} height={alto * 1.6} style={{position: 'absolute', left: -alto * 0.45, top: -alto * 0.45}}>
          {[0, 1, 2].map((i) => {
            const p = ((f - desde) / 50 + i / 3) % 1;
            return <circle key={i} cx={alto * 0.8} cy={alto * 0.72} r={alto * (0.3 + p * 0.5)} fill="none" stroke={C.petroleo} strokeWidth={10} opacity={(1 - p) * 0.6} />;
          })}
          <circle cx={alto * 0.8} cy={alto * 0.72} r={alto * 0.42 * ent} fill={C.profundo} />
        </svg>
      )}
      <Img src={staticFile(`neuron/${pose}.png`)} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'bottom', scale: `${resp}`, transformOrigin: '50% 100%'}} />
    </div>
  );
};

// ================= 1. GANCHO =================
const Gancho: React.FC = () => {
  const f = useCurrentFrame();
  const suelo = 1100;
  // caída y rebotes con squash & stretch
  const y = kf(f, [[8, -120], [30, suelo - 46, E.in], [46, 820, E.snap], [62, suelo - 46, E.in], [72, 1000, E.snap], [80, suelo - 46, E.in]]);
  const sq = (t0: number, k: number) => {
    const t = f - t0;
    if (t < 0 || t > 12) return 0;
    return Math.sin((t / 12) * Math.PI) * k;
  };
  const caida = f > 20 && f < 30 ? 0.25 : f > 54 && f < 62 ? 0.18 : 0;
  const s = sq(30, 0.45) + sq(62, 0.3) + sq(80, 0.15);
  let sx = 1 + s - caida * 0.5;
  let sy = 1 - s * 0.8 + caida;
  // crece a sol
  const sol = ip(f, [92, 108], [0, 1], E.backFuerte) * (1 - ip(f, [150, 158], [0, 1], E.in));
  const r = 46 + sol * 140 - ip(f, [150, 158], [0, 1], E.in) * 30;
  const cy = kf(f, [[84, suelo - 46], [104, 900, E.snap]]);
  const yy = f < 84 ? y : cy;
  const lineaW = ip(f, [0, 16], [0, 1]) * (1 - ip(f, [146, 156], [0, 1], E.in));
  // zoom final: la burbuja llena la pantalla
  const zoom = ip(f, [196, 222], [0, 1], E.in);
  const rr = Math.max(r, 16) + zoom * 1400;
  if (f >= 84) {
    sx = 1;
    sy = 1;
  }
  return (
    <AbsoluteFill style={{background: C.oscuro, translate: temblor(f, [30, 104])}}>
      <Lienzo>
        <line x1={540 - 470 * lineaW} x2={540 + 470 * lineaW} y1={suelo} y2={suelo} stroke={C.suave} strokeWidth={5} />
        {Array.from({length: 12}).map((_, i) => {
          const a = (i / 12) * Math.PI * 2 + f / 60;
          const k = ip(f, [100 + i, 110 + i], [0, 1], E.snap) * (1 - ip(f, [144, 152], [0, 1], E.in));
          if (k <= 0) return null;
          const r0 = r + 26;
          const r1 = r + 26 + 70 * k;
          return <line key={i} x1={540 + Math.cos(a) * r0} y1={yy + Math.sin(a) * r0} x2={540 + Math.cos(a) * r1} y2={yy + Math.sin(a) * r1} stroke={C.acento} strokeWidth={16} strokeLinecap="round" />;
        })}
        {f >= 8 && <ellipse cx={540} cy={yy + (f < 84 ? 46 * (1 - sy) : 0)} rx={rr * sx} ry={rr * sy} fill={C.acento} />}
      </Lienzo>
      {zoom < 0.5 && (
        <>
          <Golpe texto="SI EL SOL" desde={38} y={400} tam={180} color={C.claro} salida={140} />
          <Golpe texto="DESAPARECIERA" desde={110} y={580} tam={128} color={C.acento} salida={142} paso={1.5} corte={{f: 124, color: C.claro}} />
          <Golpe texto="NO TE ENTERARÍAS" desde={150} y={400} tam={118} color={C.claro} paso={1.5} />
          <Golpe texto="POR 8 MINUTOS" desde={164} y={560} tam={112} color={C.acento} fuente="Destaque" espaciado={0} paso={2} />
          <Neuron pose="03" desde={166} x={540} base={1900} alto={760} />
        </>
      )}
    </AbsoluteFill>
  );
};

// ================= 2. MARCA =================
const LOGO = {
  burbuja: 'M-262,-102 H262 V34 L196,96 H48 L0,150 L-48,96 H-262 Z',
  n: 'M-236,-78 L-180,-80 L-122,-2 L-124,-78 L-84,-78 L-86,64 L-126,63 L-186,-20 L-190,64 L-232,63 Z',
  q: 'M-74,-79 L76,-82 L75,64 L28,64 L33,86 L-4,89 L-14,63 L-76,64 Z M-42,-44 L-44,30 L-6,30 L-9,12 L24,10 L30,30 L42,30 L43,-46 Z',
  v: 'M88,-79 L136,-81 L181,24 L222,-77 L262,-74 L205,64 L156,64 Z',
};
const Logo: React.FC<{f: number; armado: number}> = ({f, armado}) => {
  const b = kf(f, [[armado, 0], [armado + 14, 1, E.backFuerte]]);
  const n = ip(f, [armado + 8, armado + 18], [1, 0], E.snap);
  const q = ip(f, [armado + 11, armado + 21], [1, 0], E.snap);
  const v = ip(f, [armado + 14, armado + 24], [1, 0], E.snap);
  return (
    <g>
      <path d={LOGO.burbuja} fill="#EEA513" transform={`scale(${b})`} />
      <path d={LOGO.n} fill="#8E0028" transform={`translate(${-500 * n},0) rotate(${-40 * n})`} opacity={n < 1 ? 1 : 0} />
      <path d={LOGO.q} fill="#2BB191" fillRule="evenodd" transform={`translate(0,${600 * q}) rotate(${30 * q})`} opacity={q < 1 ? 1 : 0} />
      <path d={LOGO.v} fill="#DD4111" transform={`translate(${500 * v},0) rotate(${40 * v})`} opacity={v < 1 ? 1 : 0} />
    </g>
  );
};
export const LOGO_ESQUINA = {x: 120, y: 112, s: 0.26};
const Marca: React.FC = () => {
  const f = useCurrentFrame();
  const wipe = ip(f, [0, 20], [0, 1], E.snap);
  const mv = ip(f, [84, 108], [0, 1], E.inOut);
  const x = interpolate(mv, [0, 1], [540, LOGO_ESQUINA.x]);
  const y = interpolate(mv, [0, 1], [880, LOGO_ESQUINA.y]);
  const s = interpolate(mv, [0, 1], [1.45, LOGO_ESQUINA.s]);
  const golpe = kf(f, [[34, 1], [38, 1.08, E.snap], [48, 1, E.back]]);
  return (
    <AbsoluteFill style={{background: C.acento}}>
      <Lienzo>
        <circle cx={540} cy={960} r={1200 * wipe} fill={C.claro} />
        {/* esquirlas al cerrar */}
        {Array.from({length: 14}).map((_, i) => {
          const k = ip(f, [34, 56], [0, 1], E.snap);
          if (k <= 0 || k >= 1) return null;
          const a = (i / 14) * Math.PI * 2 + rnd(i) * 0.4;
          const d = 300 + 260 * k + rnd(i, 2) * 80;
          const col = [C.acento, C.petroleo, C.oscuro][i % 3];
          return <rect key={i} x={540 + Math.cos(a) * d - 10} y={880 + Math.sin(a) * d - 10} width={20 * (1 - k)} height={20 * (1 - k)} fill={col} transform={`rotate(${k * 300 + i * 20} ${540 + Math.cos(a) * d} ${880 + Math.sin(a) * d})`} />;
        })}
        <g transform={`translate(${x},${y}) scale(${s * golpe})`}>
          <Logo f={f} armado={12} />
        </g>
      </Lienzo>
      <Golpe texto="CIENCIA" desde={44} y={1180} tam={110} color={C.oscuro} salida={80} paso={2} espaciado={18} />
      <div style={{position: 'absolute', top: 1260, left: 0, width: W, textAlign: 'center', fontFamily: 'Mono', fontSize: 30, color: C.petroleo, letterSpacing: 8, opacity: ip(f, [56, 62], [0, 1]) * (1 - ip(f, [80, 86], [0, 1]))}}>
        CON NEURÓN
      </div>
    </AbsoluteFill>
  );
};

// ================= 3. LA LUZ =================
const NP = 240;
const ESFERA = Array.from({length: NP}).map((_, i) => {
  const y = 1 - (2 * (i + 0.5)) / NP;
  const r = Math.sqrt(1 - y * y);
  const p = i * 2.399963;
  return {x: Math.cos(p) * r, y, z: Math.sin(p) * r};
});
const Luz: React.FC = () => {
  const f = useCurrentFrame();
  const SOL = {x: 220, y: 1020};
  const TIERRA = {x: 860, y: 1020};
  const cx = 540;
  const cy = 1020;
  const anillo = ip(f, [92, 118], [0, 1], E.inOut); // esfera -> anillo (el Sol)
  const ang = f / 40;
  const viaje = ip(f, [128, 190], [0, 1], E.inOut);
  const bx = kf(f, [[100, cx], [122, SOL.x, E.inOut], [128, SOL.x], [190, TIERRA.x, E.inOut]]);
  const by = f < 128 ? cy : SOL.y - Math.sin(viaje * Math.PI) * 120;
  const bolaR = kf(f, [[0, 0], [10, 34, E.backFuerte]]);
  const tierra = ip(f, [118, 132], [0, 1], E.backFuerte);
  const wipe = ip(f, [196, 224], [0, 1], E.in);
  const km = Math.round(ip(f, [128, 190], [0, 150000000], E.inOut) / 1000000) * 1000000;
  // estela con líneas paralelas
  const estela = (off: number, col: string, w: number) => {
    const pts: string[] = [];
    for (let k = 0; k <= 40; k++) {
      const v = (k / 40) * viaje;
      const x = SOL.x + (TIERRA.x - SOL.x) * v;
      const y = SOL.y - Math.sin(v * Math.PI) * 120 + off;
      pts.push(`${x},${y}`);
    }
    return <polyline points={pts.join(' ')} fill="none" stroke={col} strokeWidth={w} strokeLinecap="round" />;
  };
  return (
    <AbsoluteFill style={{background: C.claro, translate: temblor(f, [190])}}>
      <Golpe texto="LA LUZ DEL SOL" desde={8} y={380} tam={140} color={C.oscuro} salida={196} />
      <Golpe texto="VIAJA" desde={30} y={520} tam={140} color={C.acento} fuente="Destaque" espaciado={0} salida={120} />
      <Golpe texto="150 MILLONES DE KM" desde={124} y={520} tam={96} color={C.acento} salida={196} paso={1.2} />
      <Lienzo>
        {ESFERA.map((p, i) => {
          const k = ip(f, [4 + (i % 40) * 0.6, 14 + (i % 40) * 0.6], [0, 1]);
          if (k <= 0) return null;
          const tilt = 0.4;
          let x = p.x * Math.cos(ang) + p.z * Math.sin(ang);
          let z = -p.x * Math.sin(ang) + p.z * Math.cos(ang);
          const y = p.y * Math.cos(tilt) - z * Math.sin(tilt);
          z = p.y * Math.sin(tilt) + z * Math.cos(tilt);
          const R = 290;
          const sx = cx + x * R;
          const sy = cy + y * R;
          const a = (i / NP) * Math.PI * 2 + f / 50;
          const tx = SOL.x + Math.cos(a) * 110;
          const ty = SOL.y + Math.sin(a) * 110;
          const prof = (z + 1) / 2;
          const rr = interpolate(anillo, [0, 1], [3 + prof * 6, 7]) * k;
          return (
            <circle key={i} cx={interpolate(anillo, [0, 1], [sx, tx])} cy={interpolate(anillo, [0, 1], [sy, ty])} r={rr}
              fill={anillo > 0.5 ? C.petroleo : C.oscuro} opacity={interpolate(anillo, [0, 1], [0.3 + prof * 0.7, 1])} />
          );
        })}
        {f > 128 && estela(-18, C.suave, 6)}
        {f > 128 && estela(0, C.petroleo, 6)}
        {f > 128 && estela(18, C.profundo, 6)}
        <circle cx={TIERRA.x} cy={TIERRA.y} r={70 * tierra} fill={C.profundo} />
        <path d={`M${TIERRA.x - 70 * tierra},${TIERRA.y} A${70 * tierra},${70 * tierra} 0 0 0 ${TIERRA.x + 70 * tierra},${TIERRA.y} Z`} fill={C.petroleo} />
        <circle cx={bx} cy={by} r={bolaR} fill={C.acento} />
        <circle cx={TIERRA.x} cy={TIERRA.y} r={1900 * wipe} fill={C.petroleo} />
      </Lienzo>
      {f >= 126 && wipe < 0.4 && (
        <div style={{position: 'absolute', top: 1260, left: 0, width: W, textAlign: 'center', fontFamily: 'Titulo', fontSize: 150, color: C.oscuro, letterSpacing: 4}}>
          {puntos(km)}
          <span style={{color: C.acento}}> KM</span>
        </div>
      )}
      {f >= 140 && wipe < 0.4 && (
        <div style={{position: 'absolute', top: 1180, left: 120, fontFamily: 'Mono', fontSize: 28, color: C.profundo, letterSpacing: 6}}>DISTANCIA SOL — TIERRA</div>
      )}
    </AbsoluteFill>
  );
};

// ================= 4. EL VIAJE (gráfico que se arma, estilo afiche de datos) =================
export const VIAJE = {inicio: 24, fin: 168};
const Viaje: React.FC = () => {
  const f = useCurrentFrame();
  const X0 = 140;
  const X1 = 940;
  const Y = 1080;
  const segs = 500;
  const t = ip(f, [VIAJE.inicio, VIAJE.fin], [0, 1], E.lin);
  const seg = Math.round(t * segs);
  const mm = String(Math.floor(seg / 60)).padStart(2, '0');
  const ss = String(seg % 60).padStart(2, '0');
  const x = X0 + (X1 - X0) * t;
  const llega = f >= VIAJE.fin;
  const flash = llega ? kf(f, [[VIAJE.fin, 1.6], [VIAJE.fin + 14, 1, E.snap]]) : 1;
  const salida = ip(f, [200, 218], [0, 1], E.in);
  const cierra = ip(f, [204, 224], [0, 1], E.in);
  const ejeW = ip(f, [0, 18], [0, 1]);
  return (
    <AbsoluteFill style={{background: C.petroleo, translate: temblor(f, [VIAJE.fin], 22)}}>
      <div style={{position: 'absolute', top: 250, width: W, textAlign: 'center', fontFamily: 'Mono', fontSize: 30, color: C.claro, letterSpacing: 8, opacity: ip(f, [6, 12], [0, 1]) * (1 - salida)}}>
        TIEMPO DE VIAJE DE LA LUZ
      </div>
      <div style={{position: 'absolute', top: 300, width: W, textAlign: 'center', fontFamily: 'Titulo', fontSize: 280, lineHeight: 1, color: llega ? C.acento : C.blanco, letterSpacing: 6, scale: `${flash * (1 - salida)}`, opacity: ip(f, [10, 16], [0, 1])}}>
        {mm}:{ss}
      </div>
      <Lienzo>
        {/* relleno que crece bajo la línea */}
        <rect x={X0} y={Y - 90} width={Math.max(0, x - X0) * (1 - cierra)} height={90} fill={C.profundo} />
        <line x1={X0} x2={X0 + (X1 - X0) * ejeW} y1={Y + 2} y2={Y + 2} stroke={C.claro} strokeWidth={4} opacity={1 - cierra} />
        {Array.from({length: 9}).map((_, i) => {
          const tx = X0 + ((X1 - X0) * i * 60) / segs;
          const k = ip(f, [VIAJE.inicio + (i * 60 * (VIAJE.fin - VIAJE.inicio)) / segs, VIAJE.inicio + (i * 60 * (VIAJE.fin - VIAJE.inicio)) / segs + 5], [0, 1], E.snap);
          return (
            <g key={i} opacity={1 - cierra}>
              <line x1={tx} x2={tx} y1={Y + 2} y2={Y + 2 + 26 * ejeW} stroke={C.claro} strokeWidth={4} />
              <line x1={tx} x2={tx} y1={Y - 90 * k} y2={Y} stroke={C.claro} strokeWidth={3} opacity={0.5} />
              <text x={tx} y={Y + 72} textAnchor="middle" fontFamily="Mono" fontSize={30} fill={C.claro} opacity={0.3 + 0.7 * k}>{i}</text>
            </g>
          );
        })}
        <text x={X0} y={Y + 130} fontFamily="Mono" fontSize={24} fill={C.claro} letterSpacing={4} opacity={(1 - cierra) * 0.8}>MINUTOS</text>
        {/* línea de luz */}
        <line x1={X0} x2={x} y1={Y - 90} y2={Y - 90} stroke={C.blanco} strokeWidth={8} opacity={1 - cierra} />
        {/* Sol (aro) y Tierra */}
        <circle cx={X0} cy={Y - 90} r={44 * ejeW * (1 - cierra)} fill="none" stroke={C.claro} strokeWidth={10} />
        <circle cx={X1} cy={Y - 90} r={30 * ejeW * (1 - cierra) * (llega ? flash : 1)} fill={C.profundo} stroke={C.claro} strokeWidth={6} />
        {llega && <circle cx={X1} cy={Y - 90} r={30 + (f - VIAJE.fin) * 8} fill="none" stroke={C.acento} strokeWidth={6} opacity={Math.max(0, 1 - (f - VIAJE.fin) / 22)} />}
        <circle cx={x} cy={Y - 90} r={22} fill={C.acento} />
        <circle cx={X1} cy={Y - 90} r={2200 * cierra} fill={C.oscuro} />
      </Lienzo>
      {cierra < 0.3 && (
        <>
          <Golpe texto="8 MINUTOS" desde={VIAJE.fin + 4} y={730} tam={170} color={C.blanco} salida={198} />
          <Golpe texto="Y 20 SEGUNDOS" desde={VIAJE.fin + 14} y={880} tam={110} color={C.acento} salida={200} paso={1.5} />
        </>
      )}
    </AbsoluteFill>
  );
};

// ================= 5. LA ÓRBITA =================
const Orbita: React.FC = () => {
  const f = useCurrentFrame();
  const cx = 540;
  const cy = 1040;
  const RX = 380;
  const RY = 150;
  const dib = ip(f, [4, 34], [0, 1], E.inOut);
  const t0 = -Math.PI / 2;
  const ta = (fr: number) => t0 + Math.min(fr, 150) * 0.045;
  const pos = (t: number) => ({x: cx + RX * Math.cos(t), y: cy + RY * Math.sin(t)});
  const t = ta(f);
  const p = pos(t);
  const escape = ip(f, [150, 170], [0, 1], E.in);
  // tangente
  const tx = -RX * Math.sin(ta(150));
  const ty = RY * Math.cos(ta(150));
  const n = Math.hypot(tx, ty);
  const bx = interpolate(escape, [0, 1], [p.x, p.x + (tx / n) * 300]);
  const by = interpolate(escape, [0, 1], [p.y, p.y + (ty / n) * 300]);
  const tunel = ip(f, [158, 172], [0, 1], E.snap);
  const colapso = ip(f, [184, 195], [0, 1], E.in);
  const centrar = ip(f, [160, 178], [0, 1], E.inOut);
  const ballX = interpolate(centrar, [0, 1], [bx, 540]);
  const ballY = interpolate(centrar, [0, 1], [by, 960]);
  const prof = Math.sin(t);
  const orbOp = 1 - ip(f, [152, 166], [0, 1]);
  return (
    <AbsoluteFill style={{background: C.oscuro}}>
      <Lienzo>
        <g opacity={orbOp} transform={`rotate(-10 ${cx} ${cy})`}>
          {[[0, C.claro], [18, C.suave], [36, C.petroleo]].map(([o, col], i) => (
            <ellipse key={i} cx={cx} cy={cy} rx={RX + (o as number)} ry={RY + (o as number) * 0.5} fill="none" stroke={col as string} strokeWidth={5}
              pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - ip(f, [4 + i * 5, 34 + i * 5], [0, 1], E.inOut)} />
          ))}
          {/* Sol fantasma */}
          <circle cx={cx} cy={cy} r={86 * dib} fill="none" stroke={C.suave} strokeWidth={6} strokeDasharray="14 14" transform={`rotate(${f} ${cx} ${cy})`} />
          {/* estela */}
          {Array.from({length: 14}).map((_, i) => {
            const q = pos(ta(f - (i + 1) * 2));
            return f > 34 + i * 2 ? <circle key={i} cx={q.x} cy={q.y} r={(26 - i * 1.6) * (1 + 0.3 * Math.sin(ta(f - (i + 1) * 2)))} fill={C.acento} opacity={0.5 - i * 0.035} /> : null;
          })}
        </g>
        {/* túnel de aros segmentados */}
        {tunel > 0 &&
          Array.from({length: 9}).map((_, i) => {
            const z = ((f - 158) / 26 + i / 9) % 1;
            const r = (40 + Math.pow(z, 2.2) * 1300) * tunel * (1 - colapso);
            return <circle key={i} cx={540} cy={960} r={r} fill="none" stroke={i % 3 === 0 ? C.acento : C.suave} strokeWidth={4 + z * 22} strokeDasharray={`${20 + z * 120} ${14 + z * 60}`}
              transform={`rotate(${(i % 2 ? 1 : -1) * f * 1.4} 540 960)`} opacity={Math.min(1, z * 4)} />;
          })}
        <circle cx={ballX} cy={ballY} r={f > 34 ? 30 * (1 + 0.3 * prof) * (1 - escape * 0.2) : 30 * ip(f, [20, 34], [0, 1], E.backFuerte)} fill={C.acento} />
      </Lienzo>
      {tunel < 0.3 && (
        <>
          <Golpe texto="Y LA TIERRA" desde={14} y={380} tam={150} color={C.claro} salida={96} />
          <Golpe texto="SEGUIRÍA GIRANDO" desde={26} y={530} tam={104} color={C.acento} salida={98} paso={1.4} />
          <Golpe texto="LA GRAVEDAD" desde={104} y={380} tam={150} color={C.claro} salida={150} />
          <Golpe texto="TAMBIÉN TARDA" desde={114} y={530} tam={120} color={C.acento} salida={152} corte={{f: 128, color: C.claro}} />
        </>
      )}
    </AbsoluteFill>
  );
};

// ================= 6. CIERRE =================
const Cierre: React.FC = () => {
  const f = useCurrentFrame();
  const arco = ip(f, [18, 46], [0, 1], E.inOut);
  const rompe = ip(f, [60, 74], [0, 1], E.snap);
  const vuelve = ip(f, [74, 84], [0, 1], E.in);
  const bola = f < 60 ? kf(f, [[0, 0], [8, 30, E.backFuerte], [50, 30], [58, 40, E.snap]]) : 0;
  const punto = kf(f, [[82, 0], [92, 1, E.backFuerte]]);
  const reglas = ip(f, [96, 116], [0, 1], E.inOut);
  return (
    <AbsoluteFill style={{background: C.oscuro, translate: temblor(f, [82], 20)}}>
      <Lienzo>
        <circle cx={540} cy={960} r={96} fill="none" stroke={C.claro} strokeWidth={6} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - arco}
          transform="rotate(-90 540 960)" opacity={1 - ip(f, [58, 64], [0, 1])} />
        {bola > 0 && <circle cx={540} cy={960} r={bola} fill={C.acento} />}
        {/* esquirlas */}
        {rompe > 0 &&
          vuelve < 1 &&
          Array.from({length: 18}).map((_, i) => {
            const a = (i / 18) * Math.PI * 2 + rnd(i, 4);
            const d = 40 + rompe * (180 + rnd(i, 5) * 160);
            const destX = 180 + (i / 17) * 720;
            const x = interpolate(vuelve, [0, 1], [540 + Math.cos(a) * d, destX]);
            const y = interpolate(vuelve, [0, 1], [960 + Math.sin(a) * d, 780]);
            const s = 16 + rnd(i, 6) * 18;
            return <polygon key={i} points={`0,${-s} ${s * 0.9},${s * 0.7} ${-s * 0.9},${s * 0.6}`} fill={i % 4 === 0 ? C.claro : C.acento}
              transform={`translate(${x} ${y}) rotate(${rompe * 400 * (rnd(i, 7) - 0.5)})`} />;
          })}
        <line x1={540 - 330 * reglas} x2={540 + 330 * reglas} y1={880} y2={880} stroke={C.acento} strokeWidth={3} />
        <line x1={540 - 330 * reglas} x2={540 + 330 * reglas} y1={980} y2={980} stroke={C.acento} strokeWidth={3} />
      </Lienzo>
      <Golpe texto="SEGUIME  " desde={80} y={780} tam={190} color={C.claro} paso={1.5} espaciado={8} />
      <div style={{position: 'absolute', left: 864, top: 815, width: 44, height: 44, borderRadius: 22, background: C.acento, scale: `${punto}`}} />
      <Tipeo texto="PARA MÁS DATOS" desde={100} y={950} tam={44} color={C.claro} cps={1.4} />
      <Neuron pose="08" desde={118} x={540} base={1860} alto={720} aura />
    </AbsoluteFill>
  );
};

// ================= capa técnica =================
const Capa: React.FC = () => {
  const f = useCurrentFrame();
  const i = CAP.findIndex((c) => f >= c.d && f < c.h);
  const cap = CAP[Math.max(0, i)];
  const claro = cap.fondo === C.claro;
  const col = claro ? C.oscuro : C.claro;
  const local = f - cap.d;
  const nombreK = ip(local, [4, 12], [0, 1]);
  const seg = Math.floor(f / 60);
  const cuadro = f % 60;
  const tc = `00:${String(seg).padStart(2, '0')}:${String(cuadro).padStart(2, '0')}`;
  const L = 56;
  const m = 44;
  const esq = (x: number, y: number, dx: number, dy: number) => (
    <path d={`M${x},${y + dy * L} L${x},${y} L${x + dx * L},${y}`} fill="none" stroke={col} strokeWidth={4} />
  );
  const logoVis = f >= 333;
  const ent = ip(f, [0, 14], [0, 1], E.snap);
  return (
    <AbsoluteFill style={{pointerEvents: 'none', opacity: ent}}>
      <Lienzo>
        {esq(m, m, 1, 1)}
        {esq(W - m, m, -1, 1)}
        {esq(m, H - m, 1, -1)}
        {esq(W - m, H - m, -1, -1)}
        {logoVis && (
          <g transform={`translate(${LOGO_ESQUINA.x},${LOGO_ESQUINA.y}) scale(${LOGO_ESQUINA.s})`}>
            <Logo f={9999} armado={0} />
          </g>
        )}
      </Lienzo>
      {!logoVis && i !== 1 && (
        <div style={{position: 'absolute', left: 84, top: 84, fontFamily: 'Mono', fontSize: 26, color: col, letterSpacing: 4}}>NQV / CIENCIA</div>
      )}
      <div style={{position: 'absolute', right: 84, top: 84, fontFamily: 'Mono', fontSize: 26, color: col, letterSpacing: 4}}>
        <span style={{color: claro ? C.petroleo : C.acento}}>{String(i + 1).padStart(2, '0')}</span> / 06
      </div>
      <div style={{position: 'absolute', left: 84, top: H - 118, fontFamily: 'Mono', fontSize: 26, color: col, letterSpacing: 4, whiteSpace: 'pre'}}>
        {cap.nombre.slice(0, Math.round(cap.nombre.length * nombreK))}
      </div>
      <div style={{position: 'absolute', right: 84, top: H - 118, fontFamily: 'Mono', fontSize: 26, color: col, letterSpacing: 4}}>{tc}</div>
    </AbsoluteFill>
  );
};

// ================= Neurón chico abajo a la izquierda (cap. 3 a 5) =================
const NeuronChico: React.FC = () => {
  const f = useCurrentFrame();
  const pose = f < 563 ? '01' : f < 788 ? '11' : '01';
  // golpecito al cambiar de pose
  const cambio = [563, 788].reduce((acc, c) => acc + (f >= c && f < c + 10 ? Math.sin(((f - c) / 10) * Math.PI) * 0.08 : 0), 0);
  const ent = kf(f, [[352, 0], [366, 1, E.backFuerte]]);
  const sal = ip(f, [940, 952], [0, 1], E.in);
  if (f < 352 || sal >= 1) return null;
  const alto = 330;
  return (
    <div style={{position: 'absolute', left: 60, top: H - 150 - alto + (1 - ent) * 500 + sal * 500, width: alto * 0.7, height: alto, scale: `${1 + cambio}`, transformOrigin: '50% 100%'}}>
      <Img src={staticFile(`neuron/${pose}.png`)} style={{width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'bottom'}} />
    </div>
  );
};

// ================= sonido =================
export type Cue = {f: number; src: string; vol?: number};
export const ReelCiencia: React.FC<{cues: Cue[]; musica?: string}> = ({cues, musica}) => {
  useFuentes();
  return (
    <AbsoluteFill style={{background: C.oscuro}}>
      <Sequence from={CAP[0].d} durationInFrames={CAP[0].h - CAP[0].d}><Gancho /></Sequence>
      <Sequence from={CAP[1].d} durationInFrames={CAP[1].h - CAP[1].d}><Marca /></Sequence>
      <Sequence from={CAP[2].d} durationInFrames={CAP[2].h - CAP[2].d}><Luz /></Sequence>
      <Sequence from={CAP[3].d} durationInFrames={CAP[3].h - CAP[3].d}><Viaje /></Sequence>
      <Sequence from={CAP[4].d} durationInFrames={CAP[4].h - CAP[4].d}><Orbita /></Sequence>
      <Sequence from={CAP[5].d} durationInFrames={CAP[5].h - CAP[5].d}><Cierre /></Sequence>
      <NeuronChico />
      <Capa />
      {musica && (
        <Sequence from={30}>
          <Audio src={staticFile(musica)} volume={(fr) => interpolate(fr, [0, 3, 940, 952, 1030, 1040], [0, 0.34, 0.34, 0, 0, 0.3], {extrapolateRight: 'clamp'})} />
        </Sequence>
      )}
      {cues.map((c, i) => (
        <Sequence key={i} from={c.f} durationInFrames={180}>
          <Audio src={staticFile(c.src)} volume={c.vol ?? 0.8} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
