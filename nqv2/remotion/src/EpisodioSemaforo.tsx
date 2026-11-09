import React, {useMemo} from 'react';
import {AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame, interpolate} from 'remotion';
import {Audio} from '@remotion/media';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {C, E, ip, kf, rnd, useFuentes} from './lib';
import {Logo} from './ReelCiencia';
import {PALABRAS_SEMAFORO} from './palabras-semaforo';

// Ciencia: "¿Cómo sabe el semáforo que llegaste?" (voz de Neurón, Charon).
// Estilo de la referencia madre: UN mundo 3D low-poly con sombreado de dibujo (toon), cámara de dron siempre en
// movimiento, datos 2D pegados a los objetos y subtítulos karaoke. Neurón solo en gancho, revelación, sorpresa y cierre.

const FPS = 60;
const s = (x: number) => Math.round(x * FPS);
export const DUR_SEMAFORO = s(60.2);

// ---------- tiempos (s), medidos en la voz palabra por palabra ----------
type W = {w: string; d: number; h: number};
const PAL: W[] = PALABRAS_SEMAFORO;
const norm = (x: string) => x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ]/g, '');
// momento en que se dice la n-ésima aparición de una palabra
const T = (palabra: string, n = 1, fin = false) => {
  let k = 0;
  for (const p of PAL) if (norm(p.w) === norm(palabra) && ++k === n) return fin ? p.h : p.d;
  throw new Error(`no encuentro "${palabra}" #${n}`);
};

// Cortes de la historia
const K = {
  tres: 0,
  rojo: T('semaforo'),
  verde: T('verde'),
  como: T('como'),
  camara: T('nadie'),
  chivato: T('chivato'),
  asfalto: T('mira'),
  rectangulo: T('rectangulo'),
  abajo: T('abajo'),
  corriente: T('corriente'),
  campo: T('campo'),
  frenas: T('cuando'),
  deforma: T('deforma'),
  nota: T('nota'),
  verde2: T('verde', 2),
  bici: T('pero'),
  ni: T('detecta'),
  boton: T('boton'),
  ny: T('nueva'),
  dosmil: T('2.500'),
  nada: T('nada'),
  asique: T('asi', 1),
  frena: T('frena'),
  rect2: T('rectangulo', 2),
  sigueme: T('para', 3),
  fin: PAL[PAL.length - 1].h,
};

// ---------- paleta del mundo (Ciencia NQV + rojo/verde de semáforo) ----------
const M = {
  cielo: '#0F1D24',
  piso: '#16262E',
  calle: '#1E3540',
  vereda: '#2B4B57',
  linea: '#C9DCD8',
  edif: ['#1F4F5E', '#185669', '#235F70', '#2A6B7B'],
  rojo: '#FF5468',
  ambar: '#FFB547',
  verde: '#3BE08A',
  cobre: '#E8956B',
  campo: '#7FE3F0',
};

// ---------- utilidades 3D ----------
const useTonos = () =>
  useMemo(() => {
    const d = new Uint8Array([90, 170, 255]);
    const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat);
    t.minFilter = t.magFilter = THREE.NearestFilter;
    t.needsUpdate = true;
    return t;
  }, []);
const TonosCtx = React.createContext<THREE.Texture | null>(null);
const Toon: React.FC<{color: string; emissive?: string; ei?: number; map?: THREE.Texture; emissiveMap?: THREE.Texture; transparent?: boolean; opacity?: number}> = ({color, emissive, ei = 0, map, emissiveMap, transparent, opacity}) => {
  const tonos = React.useContext(TonosCtx)!;
  return <meshToonMaterial color={color} gradientMap={tonos} emissive={emissive ?? '#000000'} emissiveIntensity={ei} map={map} emissiveMap={emissiveMap} transparent={transparent} opacity={opacity ?? 1} />;
};

const L = THREE.MathUtils.lerp;
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// ---------- posiciones del mundo (1 unidad = 1 metro). Nuestro carril va hacia -z ----------
const BOBINA = {x0: 1.3, x1: 3.7, z0: 10.2, z1: 12.2}; // el rectángulo en el asfalto
const PARADO_Z = 11.2; // centro del auto cuando frena encima de la bobina
const POSTE = v3(5.9, 0, 8.6);
const LUZ = v3(2.6, 5.4, 8.6); // caja del semáforo sobre el carril
const GABINETE = v3(7.6, 0, 11.8);

// ---------- cámara: tomas encadenadas, siempre en movimiento ----------
type Toma = {t: number; pos: THREE.Vector3; mira: THREE.Vector3; fov?: number};
const TOMAS: Toma[] = [
  {t: 0, pos: v3(-14, 34, 52), mira: v3(0, 0, 4)}, // dron alto sobre la ciudad
  {t: K.rojo - 0.2, pos: v3(-6, 13, 30), mira: v3(2.2, 1.5, 8)}, // baja hacia el cruce
  {t: K.verde - 0.1, pos: v3(-1.5, 4.2, 21), mira: v3(2.6, 3.8, 8.6)}, // detrás del auto mirando el semáforo
  {t: K.como, pos: v3(0.8, 4.6, 15.5), mira: v3(2.6, 5.2, 8.6)}, // pegada a la luz
  {t: K.camara - 0.15, pos: v3(-2.5, 5.5, 13), mira: v3(-5.6, 5.2, 7.2)}, // gira a la cámara de seguridad
  {t: K.chivato - 0.1, pos: v3(8.5, 1.0, 19.5), mira: v3(2.5, 0.25, PARADO_Z)}, // al ras del piso, debajo del auto
  {t: K.asfalto - 0.1, pos: v3(2.5, 9.5, 17.5), mira: v3(2.5, 0, 11.2)}, // desde arriba, el auto ya se fue
  {t: K.abajo - 0.1, pos: v3(6.5, 5.2, 17), mira: v3(2.5, -0.6, 11.2)}, // corte: se levanta el asfalto
  {t: K.campo - 0.1, pos: v3(8.5, 3.6, 15.5), mira: v3(2.5, 0.6, 11.2)}, // campo magnético de costado
  {t: K.frenas - 0.1, pos: v3(9.5, 4.2, 17.5), mira: v3(2.5, 0.8, 11.2)}, // llega el auto
  {t: K.nota - 0.1, pos: v3(13, 7.5, 18.5), mira: v3(4.6, 2.2, 9.8)}, // se abre: bobina -> gabinete -> semáforo
  {t: K.verde2 - 0.25, pos: v3(5.5, 5.4, 16.5), mira: v3(2.6, 5.2, 8.6)}, // la luz cambia
  {t: K.bici - 0.1, pos: v3(9, 2.8, 17), mira: v3(2.5, 0.8, 11.2)}, // la bici sobre la bobina
  {t: K.boton - 0.1, pos: v3(8.2, 1.6, 10.6), mira: v3(5.9, 1.15, 8.6)}, // el botón para cruzar
  {t: K.ny - 0.1, pos: v3(9.5, 2.6, 13.5), mira: v3(5.9, 1.3, 8.6)},
  {t: K.asique - 0.1, pos: v3(-6, 13, 30), mira: v3(2.2, 1.5, 8)}, // vuelve al plano del principio
  {t: K.frena, pos: v3(1.5, 7.5, 19.5), mira: v3(2.5, 0.4, 11.2)},
  {t: K.sigueme - 0.2, pos: v3(-12, 26, 44), mira: v3(0, 0, 6)},
  {t: K.fin + 1, pos: v3(-16, 32, 52), mira: v3(0, 0, 4)},
];
const TRANS = 0.75; // segundos que tarda en pasar de una toma a la otra
export const poseCamara = (f: number) => {
  const t = f / FPS;
  let i = 0;
  while (i + 1 < TOMAS.length && t >= TOMAS[i + 1].t) i++;
  const a = TOMAS[i];
  const b = TOMAS[Math.min(i + 1, TOMAS.length - 1)];
  // deriva lenta dentro de la toma (hacia la siguiente) + transición rápida al cambiar
  const prev = TOMAS[Math.max(i - 1, 0)];
  const k = i === 0 ? 1 : ip(t, [a.t, a.t + TRANS], [0, 1], E.inOut);
  const dur = Math.max(0.5, b.t - a.t);
  const deriva = ip(t, [a.t, a.t + dur], [0, 1], E.lin) * 0.12;
  const pos = prev.pos.clone().lerp(a.pos, k).lerp(b.pos, i === TOMAS.length - 1 ? 0 : deriva);
  const mira = prev.mira.clone().lerp(a.mira, k).lerp(b.mira, i === TOMAS.length - 1 ? 0 : deriva);
  return {pos, mira};
};
const FOV = 42;
const camRef = new THREE.PerspectiveCamera(FOV, 1080 / 1920, 0.1, 400);
// proyecta un punto 3D a la pantalla (para pegar los datos 2D a los objetos)
const aPantalla = (f: number, p: THREE.Vector3) => {
  const {pos, mira} = poseCamara(f);
  camRef.position.copy(pos);
  camRef.lookAt(mira);
  camRef.updateMatrixWorld();
  camRef.updateProjectionMatrix();
  const q = p.clone().project(camRef);
  return {x: (q.x + 1) * 540, y: (1 - q.y) * 960, delante: q.z < 1};
};

const Camara: React.FC = () => {
  const f = useCurrentFrame();
  const {camera} = useThree();
  const {pos, mira} = poseCamara(f);
  camera.position.copy(pos);
  camera.lookAt(mira);
  return null;
};

// ---------- estado del auto protagonista ----------
const VERDE3 = () => K.rect2 + 0.2; // tercer verde: cuando dice "rectángulo" por segunda vez
const autoZ = (t: number) => {
  // llega y frena (gancho), se va (asfalto), vuelve y frena (deforma), se va (bici), vuelve al final
  // se queda parado hasta el "chivato" (está debajo de tu auto) y arranca cuando miramos el asfalto
  if (t < K.asfalto - 0.5) return kf(s(t), [[0, 40], [s(K.rojo + 0.3), PARADO_Z, E.snap]]);
  if (t < K.asfalto + 1.5) return kf(s(t), [[s(K.asfalto - 0.5), PARADO_Z], [s(K.asfalto + 1.3), -40, E.in]]);
  if (t < K.frenas) return 999; // fuera de escena
  if (t < K.verde2 + 0.4) return kf(s(t), [[s(K.frenas), 30], [s(K.frenas + 1.1), PARADO_Z, E.snap]]);
  if (t < K.bici) return kf(s(t), [[s(K.verde2 + 0.4), PARADO_Z], [s(K.verde2 + 2.4), -40, E.in]]);
  if (t < K.asique) return 999;
  if (t < VERDE3()) return kf(s(t), [[s(K.asique), 40], [s(K.frena + 0.6), PARADO_Z, E.snap]]);
  return kf(s(t), [[s(VERDE3()), PARADO_Z], [s(VERDE3() + 2.6), -40, E.in]]);
};
// luz del semáforo: 'r' | 'a' | 'v'
const luzEn = (t: number): 'r' | 'v' => {
  if (t >= K.verde && t < K.asfalto) return 'v';
  if (t >= K.verde2 && t < K.bici) return 'v';
  if (t >= K.rect2 + 0.2) return 'v';
  return 'r';
};
// el auto está sobre la bobina
const autoEncima = (t: number) => Math.abs(autoZ(t) - PARADO_Z) < 1.2;

// ---------- piezas del mundo ----------
const Auto: React.FC<{z: number; x: number; color: string; luces?: number; giro?: number}> = ({z, x, color, luces = 1, giro = 0}) => (
  <group position={[x, 0, z]} rotation={[0, giro, 0]}>
    <mesh position={[0, 0.62, 0]}>
      <boxGeometry args={[1.9, 0.7, 4.2]} />
      <Toon color={color} />
    </mesh>
    <mesh position={[0, 1.22, 0.35]}>
      <boxGeometry args={[1.6, 0.55, 2.1]} />
      <Toon color={color} />
    </mesh>
    <mesh position={[0, 1.24, 0.35]}>
      <boxGeometry args={[1.64, 0.4, 1.7]} />
      <Toon color={'#183039'} emissive={'#6CB6B9'} ei={0.15} />
    </mesh>
    {[-0.8, 0.8].map((dx) => (
      <React.Fragment key={dx}>
        <mesh position={[dx * 1.02, 0.36, 1.35]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.36, 0.36, 0.3, 20]} />
          <Toon color={'#0E191E'} />
        </mesh>
        <mesh position={[dx * 1.02, 0.36, -1.35]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.36, 0.36, 0.3, 20]} />
          <Toon color={'#0E191E'} />
        </mesh>
        {/* faros (adelante = -z) y luces traseras */}
        <mesh position={[dx * 0.85, 0.72, -2.11]}>
          <boxGeometry args={[0.38, 0.18, 0.04]} />
          <meshBasicMaterial color={'#FFF6D8'} />
        </mesh>
        <mesh position={[dx * 0.85, 0.72, 2.11]}>
          <boxGeometry args={[0.38, 0.16, 0.04]} />
          <meshBasicMaterial color={M.rojo} />
        </mesh>
      </React.Fragment>
    ))}
    {luces > 0 && (
      <mesh position={[0, 0.03, -5.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.4, 6]} />
        <meshBasicMaterial color={'#FFF1C9'} transparent opacity={0.1 * luces} depthWrite={false} />
      </mesh>
    )}
  </group>
);

const Bici: React.FC<{z: number; x: number}> = ({z, x}) => (
  <group position={[x, 0, z]}>
    {[-0.55, 0.55].map((dz) => (
      <mesh key={dz} position={[0, 0.36, dz]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.33, 0.05, 10, 32]} />
        <Toon color={'#0E191E'} />
      </mesh>
    ))}
    <mesh position={[0, 0.62, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.04, 0.04, 1.1, 8]} />
      <Toon color={C.acento} />
    </mesh>
    <mesh position={[0, 0.5, -0.25]} rotation={[0.9, 0, 0]}>
      <cylinderGeometry args={[0.04, 0.04, 0.7, 8]} />
      <Toon color={C.acento} />
    </mesh>
    <mesh position={[0, 0.5, 0.3]} rotation={[-0.6, 0, 0]}>
      <cylinderGeometry args={[0.04, 0.04, 0.6, 8]} />
      <Toon color={C.acento} />
    </mesh>
    <mesh position={[0, 1.05, 0.08]} rotation={[-0.25, 0, 0]}>
      <capsuleGeometry args={[0.18, 0.45, 6, 12]} />
      <Toon color={C.suave} />
    </mesh>
    <mesh position={[0, 1.42, -0.05]}>
      <sphereGeometry args={[0.17, 16, 16]} />
      <Toon color={'#F2C6A8'} />
    </mesh>
  </group>
);

// textura de fachada con ventanas (algunas encendidas)
const useFachadas = () =>
  useMemo(
    () =>
      [0, 1, 2, 3].map((v) => {
        const c = document.createElement('canvas');
        c.width = 128;
        c.height = 256;
        const g = c.getContext('2d')!;
        g.fillStyle = '#000';
        g.fillRect(0, 0, 128, 256);
        for (let y = 0; y < 10; y++)
          for (let x = 0; x < 4; x++) {
            const on = rnd(v * 100 + y * 7 + x, 31) > 0.62;
            g.fillStyle = on ? (rnd(v + y + x, 32) > 0.5 ? '#FFE3A8' : '#BFF3F6') : '#000';
            g.fillRect(14 + x * 28, 12 + y * 24, 16, 12);
          }
        const t = new THREE.CanvasTexture(c);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.colorSpace = THREE.SRGBColorSpace;
        return t;
      }),
    [],
  );

const Ciudad: React.FC = () => {
  const fachadas = useFachadas();
  const edificios = useMemo(() => {
    const out: Array<{x: number; z: number; w: number; d: number; h: number; c: number; v: number}> = [];
    // manzanas a los costados de las dos calles (dejando libres las calles)
    for (let i = 0; i < 260; i++) {
      const x = (rnd(i, 41) - 0.5) * 140;
      const z = (rnd(i, 42) - 0.5) * 140 - 10;
      if (Math.abs(x) < 9.5 || Math.abs(z) < 8.5) continue; // calles + veredas
      if (Math.abs(x) < 15 && Math.abs(z) < 20) continue;
      if (x > -20 && x < 16 && z > 8) continue; // por donde vuela la cámara
      const w = 4 + rnd(i, 43) * 5;
      const d = 4 + rnd(i, 44) * 5;
      const lejos = Math.min(1, Math.hypot(x, z) / 60);
      out.push({x, z, w, d, h: 4 + rnd(i, 45) * (8 + 18 * lejos), c: i % 4, v: i % 4});
    }
    return out;
  }, []);
  return (
    <>
      {edificios.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2, b.z]}>
          <boxGeometry args={[b.w, b.h, b.d]} />
          <Toon color={M.edif[b.c]} emissive={'#FFFFFF'} ei={0.75} emissiveMap={fachadas[b.v]} />
        </mesh>
      ))}
    </>
  );
};

// plano horizontal (x,z) con un agujero rectangular donde está la bobina
const PlanoConAgujero: React.FC<{x0: number; x1: number; z0: number; z1: number; y: number; color: string}> = ({x0, x1, z0, z1, y, color}) => {
  const g = useMemo(() => {
    const sh = new THREE.Shape([new THREE.Vector2(x0, -z0), new THREE.Vector2(x1, -z0), new THREE.Vector2(x1, -z1), new THREE.Vector2(x0, -z1)]);
    const h = new THREE.Path([new THREE.Vector2(BOBINA.x0, -BOBINA.z0), new THREE.Vector2(BOBINA.x0, -BOBINA.z1), new THREE.Vector2(BOBINA.x1, -BOBINA.z1), new THREE.Vector2(BOBINA.x1, -BOBINA.z0)]);
    sh.holes.push(h);
    return new THREE.ShapeGeometry(sh);
  }, [x0, x1, z0, z1]);
  return (
    <mesh geometry={g} rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]}>
      <Toon color={color} />
    </mesh>
  );
};

const Calles: React.FC = () => (
  <>
    <PlanoConAgujero x0={-200} x1={200} z0={-200} z1={200} y={-0.02} color={M.piso} />
    {/* calle principal (z) y transversal (x) */}
    <PlanoConAgujero x0={-5} x1={5} z0={-200} z1={200} y={0} color={M.calle} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
      <planeGeometry args={[400, 10]} />
      <Toon color={M.calle} />
    </mesh>
    {/* veredas */}
    {[
      [7.5, 7.5],
      [-7.5, 7.5],
      [7.5, -7.5],
      [-7.5, -7.5],
    ].map(([sx, sz], i) => (
      <mesh key={i} position={[Math.sign(sx) * 52.5, 0.1, Math.sign(sz) * 52.5]}>
        <boxGeometry args={[95, 0.2, 95]} />
        <Toon color={M.vereda} />
      </mesh>
    ))}
    {/* línea del medio (discontinua) */}
    {Array.from({length: 40}).map((_, i) => {
      const z = 9 + i * 4;
      return (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, z]}>
          <planeGeometry args={[0.18, 2]} />
          <meshBasicMaterial color={M.linea} />
        </mesh>
      );
    })}
    {Array.from({length: 40}).map((_, i) => (
      <mesh key={`b${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -9 - i * 4]}>
        <planeGeometry args={[0.18, 2]} />
        <meshBasicMaterial color={M.linea} />
      </mesh>
    ))}
    {/* senda peatonal + línea de frenado */}
    {Array.from({length: 9}).map((_, i) => (
      <mesh key={`p${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[-4 + i * 1, 0.012, 7.1]}>
        <planeGeometry args={[0.55, 2.4]} />
        <meshBasicMaterial color={M.linea} />
      </mesh>
    ))}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[2.5, 0.012, 8.9]}>
      <planeGeometry args={[5, 0.35]} />
      <meshBasicMaterial color={M.linea} />
    </mesh>
  </>
);

// rectángulo cortado en el asfalto (sellado), y el trazo de neón que lo dibuja
const rectPath = (x0: number, x1: number, z0: number, z1: number, y = 0.02, r = 0.12) => {
  const p = new THREE.CurvePath<THREE.Vector3>();
  const pts = [v3(x0 + r, y, z0), v3(x1 - r, y, z0), v3(x1, y, z0 + r), v3(x1, y, z1 - r), v3(x1 - r, y, z1), v3(x0 + r, y, z1), v3(x0, y, z1 - r), v3(x0, y, z0 + r), v3(x0 + r, y, z0)];
  for (let i = 0; i < pts.length - 1; i++) p.add(new THREE.LineCurve3(pts[i], pts[i + 1]));
  return p;
};

const Corte: React.FC<{traza: number; brillo: number}> = ({traza, brillo}) => {
  const base = useMemo(() => new THREE.TubeGeometry(rectPath(BOBINA.x0, BOBINA.x1, BOBINA.z0, BOBINA.z1, 0.015) as unknown as THREE.Curve<THREE.Vector3>, 200, 0.035, 6, true), []);
  const neon = useMemo(() => new THREE.TubeGeometry(rectPath(BOBINA.x0, BOBINA.x1, BOBINA.z0, BOBINA.z1, 0.05) as unknown as THREE.Curve<THREE.Vector3>, 400, 0.06, 8, false), []);
  const cuenta = Math.floor(neon.index!.count * traza / 6) * 6;
  return (
    <>
      <mesh geometry={base}>
        <meshBasicMaterial color={'#0B1418'} />
      </mesh>
      {traza > 0 && brillo > 0 && (
        <mesh geometry={neon} onUpdate={(m) => m.geometry.setDrawRange(0, cuenta)}>
          <meshBasicMaterial color={C.acento} transparent opacity={brillo} />
        </mesh>
      )}
    </>
  );
};

// la bobina: 4 vueltas de cable de cobre, con la corriente corriendo
const Bobina: React.FC<{f: number; ver: number; corriente: number; aviso: number}> = ({f, ver, corriente, aviso}) => {
  const vueltas = useMemo(
    () => [0, 1, 2, 3].map((i) => new THREE.TubeGeometry(rectPath(BOBINA.x0 + 0.1 + i * 0.09, BOBINA.x1 - 0.1 - i * 0.09, BOBINA.z0 + 0.1 + i * 0.09, BOBINA.z1 - 0.1 - i * 0.09, -0.22 - i * 0.025) as unknown as THREE.Curve<THREE.Vector3>, 160, 0.04, 8, true)),
    [],
  );
  const camino = useMemo(() => rectPath(BOBINA.x0 + 0.1, BOBINA.x1 - 0.1, BOBINA.z0 + 0.1, BOBINA.z1 - 0.1, -0.12), []);
  if (ver <= 0) return null;
  return (
    <group scale={[1, 1, 1]}>
      {/* pozo oscuro debajo del asfalto */}
      <mesh position={[(BOBINA.x0 + BOBINA.x1) / 2, -0.32, (BOBINA.z0 + BOBINA.z1) / 2]}>
        <boxGeometry args={[BOBINA.x1 - BOBINA.x0 + 0.1, 0.6, BOBINA.z1 - BOBINA.z0 + 0.1]} />
        <meshBasicMaterial color={'#08262E'} side={THREE.BackSide} />
      </mesh>
      {vueltas.map((g, i) => (
        <mesh key={i} geometry={g}>
          <Toon color={M.cobre} emissive={aviso > 0 ? '#FFFFFF' : M.cobre} ei={0.25 + aviso * 0.6} />
        </mesh>
      ))}
      {corriente > 0 &&
        Array.from({length: 14}).map((_, i) => {
          const u = ((f / 140 + i / 14) % 1 + 1) % 1;
          const p = camino.getPointAt(u);
          return (
            <mesh key={i} position={[p.x, p.y, p.z]} scale={0.08 * corriente}>
              <sphereGeometry args={[1, 12, 12]} />
              <meshBasicMaterial color={'#FFF4C2'} />
            </mesh>
          );
        })}
    </group>
  );
};

// tapa de asfalto que se levanta para mostrar la bobina
const Tapa: React.FC<{abre: number}> = ({abre}) => (
  <group position={[BOBINA.x1 + 0.05, 0, (BOBINA.z0 + BOBINA.z1) / 2]} rotation={[0, 0, abre * 1.9]}>
    <mesh position={[-(BOBINA.x1 - BOBINA.x0) / 2 - 0.05, -0.07, 0]}>
      <boxGeometry args={[BOBINA.x1 - BOBINA.x0 + 0.1, 0.16, BOBINA.z1 - BOBINA.z0 + 0.1]} />
      <Toon color={M.calle} />
    </mesh>
  </group>
);

// líneas del campo magnético: arcos que laten; "aplasta" las deforma cuando hay metal encima
const Campo: React.FC<{f: number; ver: number; aplasta: number; poco: number}> = ({f, ver, aplasta, poco}) => {
  const arcos = useMemo(
    () =>
      [0.25, 0.5, 0.75, 1.0].map((r) => {
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i <= 40; i++) {
          const a = (i / 40) * Math.PI;
          pts.push(v3(0, Math.sin(a) * r * 1.25, Math.cos(a) * (r + 0.6)));
        }
        return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.03, 6, false);
      }),
    [],
  );
  if (ver <= 0) return null;
  const xs = [1.7, 2.5, 3.3];
  return (
    <group position={[0, 0.05, (BOBINA.z0 + BOBINA.z1) / 2]}>
      {xs.map((x, j) =>
        arcos.map((g, i) => {
          const late = 1 + Math.sin(f / 10 - i * 0.8 + j) * 0.05;
          const def = aplasta * (1 - poco);
          const sy = ver * late * (1 - def * 0.55) * (1 - poco * aplasta * 0.08);
          const sz = ver * late * (1 + def * 0.25);
          return (
            <mesh key={`${j}-${i}`} geometry={g} position={[x, 0, 0]} scale={[1, sy, sz]}>
              <meshBasicMaterial color={def > 0.2 ? '#FFFFFF' : M.campo} transparent opacity={(0.35 + 0.15 * Math.sin(f / 8 + i)) * ver + def * 0.3} />
            </mesh>
          );
        }),
      )}
    </group>
  );
};

// cable que va de la bobina al gabinete y al semáforo, con un pulso que viaja
const CABLE = new THREE.CatmullRomCurve3([v3(BOBINA.x1, -0.15, 11.2), v3(5.2, -0.15, 11.4), v3(GABINETE.x - 0.5, -0.1, GABINETE.z), v3(GABINETE.x, 0.9, GABINETE.z), v3(GABINETE.x - 0.4, 0.05, 10.3), v3(POSTE.x, 0.1, POSTE.z + 0.4), v3(POSTE.x, 5.4, POSTE.z), v3(LUZ.x + 0.6, 5.4, LUZ.z)], false, 'catmullrom', 0.1);
const Cable: React.FC<{ver: number; pulso: number}> = ({ver, pulso}) => {
  const g = useMemo(() => new THREE.TubeGeometry(CABLE, 200, 0.05, 8, false), []);
  if (ver <= 0) return null;
  const p = CABLE.getPointAt(Math.min(1, Math.max(0, pulso)));
  return (
    <>
      <mesh geometry={g}>
        <meshBasicMaterial color={C.suave} transparent opacity={0.55 * ver} />
      </mesh>
      {pulso > 0 && pulso < 1 && (
        <mesh position={[p.x, p.y, p.z]} scale={0.22}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial color={'#FFFFFF'} />
        </mesh>
      )}
    </>
  );
};

const Semaforo: React.FC<{luz: 'r' | 'v'; cambio: number; boton: number}> = ({luz, cambio, boton}) => (
  <group>
    {/* poste y brazo */}
    <mesh position={[POSTE.x, 2.8, POSTE.z]}>
      <cylinderGeometry args={[0.13, 0.16, 5.6, 14]} />
      <Toon color={'#33515B'} />
    </mesh>
    <mesh position={[(POSTE.x + LUZ.x) / 2, 5.55, POSTE.z]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.08, 0.08, POSTE.x - LUZ.x, 10]} />
      <Toon color={'#33515B'} />
    </mesh>
    {/* caja con las tres luces, mirando a los autos (+z) */}
    <group position={[LUZ.x, LUZ.y - 0.9, LUZ.z]} scale={1 + cambio * 0.08}>
      <mesh>
        <boxGeometry args={[0.75, 2.1, 0.55]} />
        <Toon color={'#1A2B31'} />
      </mesh>
      {[
        ['r', 0.62, M.rojo],
        ['a', 0, M.ambar],
        ['v', -0.62, M.verde],
      ].map(([k, y, col]) => {
        const on = k === luz;
        return (
          <React.Fragment key={k as string}>
            <mesh position={[0, y as number, 0.29]}>
              <sphereGeometry args={[0.24, 20, 20]} />
              <meshBasicMaterial color={on ? (col as string) : '#22343A'} />
            </mesh>
            {on && (
              <mesh position={[0, y as number, 0.33]}>
                <circleGeometry args={[0.6 + cambio * 0.3, 32]} />
                <meshBasicMaterial color={col as string} transparent opacity={0.22} depthWrite={false} />
              </mesh>
            )}
          </React.Fragment>
        );
      })}
    </group>
    {/* botón para cruzar, en el poste */}
    <group position={[POSTE.x + 0.18, 1.15, POSTE.z]}>
      <mesh>
        <boxGeometry args={[0.16, 0.42, 0.3]} />
        <Toon color={M.ambar} />
      </mesh>
      <mesh position={[0.1 - boton * 0.05, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.08, 0.08, 0.06, 18]} />
        <Toon color={C.claro} emissive={C.claro} ei={boton * 0.5} />
      </mesh>
    </group>
    {/* gabinete del controlador */}
    <mesh position={[GABINETE.x, 0.8, GABINETE.z]}>
      <boxGeometry args={[0.9, 1.4, 0.6]} />
      <Toon color={'#2E5562'} />
    </mesh>
  </group>
);

// cámara de seguridad (la que NO está mirando)
const CamaraSeg: React.FC<{f: number}> = ({f}) => (
  <group position={[-5.6, 0, 7.2]}>
    <mesh position={[0, 2.6, 0]}>
      <cylinderGeometry args={[0.1, 0.12, 5.2, 10]} />
      <Toon color={'#33515B'} />
    </mesh>
    <group position={[0.3, 5.2, 0]} rotation={[0.25, 0.6 + Math.sin(f / 50) * 0.5, 0]}>
      <mesh>
        <boxGeometry args={[0.45, 0.4, 0.95]} />
        <Toon color={C.claro} />
      </mesh>
      <mesh position={[0, 0, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.12, 16]} />
        <Toon color={'#0E191E'} />
      </mesh>
    </group>
  </group>
);

const Trafico: React.FC<{f: number}> = ({f}) => (
  // autos lejanos en la transversal y en el otro sentido, para que la ciudad viva (no en la madrugada del gancho)
  <>
    {Array.from({length: 6}).map((_, i) => {
      const x = ((f / FPS) * 9 + i * 23) % 140 - 70;
      return <Auto key={i} z={-2.5} x={x} color={i % 2 ? C.suave : C.claro} giro={-Math.PI / 2} luces={0.6} />;
    })}
  </>
);

const Escena: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const tonos = useTonos();
  const z = autoZ(t);
  const luz = luzEn(t);
  // momentos
  const traza = ip(f, [s(K.rectangulo - 0.6), s(K.rectangulo + 0.4)], [0, 1], E.inOut);
  const debajo = t >= K.chivato && t < K.asfalto + 0.3 ? 0.55 + 0.45 * Math.sin(f / 6) : 0;
  const brilloCorte = debajo > 0 ? debajo : t < K.abajo + 0.6 ? traza : t > K.asique ? ip(f, [s(K.rect2 - 0.4), s(K.rect2)], [0, 1]) : 0;
  const abre = t >= K.abajo - 0.2 && t < K.bici + 4.5 ? kf(f, [[s(K.abajo - 0.2), 0], [s(K.abajo + 0.5), 1, E.backFuerte]]) * (1 - ip(f, [s(K.boton - 0.6), s(K.boton)], [0, 1], E.inOut)) : 0;
  const verBobina = abre > 0.02 ? 1 : 0;
  const corriente = ip(f, [s(K.corriente - 0.2), s(K.corriente + 0.2)], [0, 1]);
  const verCampo = t >= K.campo - 0.3 && t < K.boton ? kf(f, [[s(K.campo - 0.3), 0], [s(K.campo + 0.4), 1, E.backFuerte]]) : 0;
  const encima = autoEncima(t) && t > K.frenas ? 1 : 0;
  const aplastaAuto = encima ? ip(f, [s(K.frenas + 0.8), s(K.frenas + 1.3)], [0, 1], E.backFuerte) : 0;
  const biciZ = t >= K.bici - 0.1 && t < K.boton ? kf(f, [[s(K.bici - 0.1), 26], [s(K.bici + 1.6), PARADO_Z - 0.4, E.snap]]) : 999;
  const aplastaBici = biciZ < 50 && Math.abs(biciZ - PARADO_Z) < 1 ? 1 : 0;
  const aviso = t >= K.nota && t < K.verde2 + 0.6 ? Math.max(0, Math.sin(ip(f, [s(K.nota), s(K.nota + 0.5)], [0, Math.PI], E.lin))) : 0;
  const pulso = ip(f, [s(K.nota + 0.1), s(K.verde2)], [0, 1], E.inOut);
  const verCable = t >= K.nota - 0.3 && t < K.bici ? ip(f, [s(K.nota - 0.3), s(K.nota)], [0, 1]) : 0;
  const ultimoCambio = [K.verde, K.verde2, K.rect2 + 0.2].reduce((a, c) => (t >= c ? c : a), -9);
  const cambio = Math.max(0, 1 - (t - ultimoCambio) / 0.35);
  const boton = t >= K.boton + 0.6 && t < K.ny ? Math.abs(Math.sin((t - K.boton - 0.6) * 9)) : 0;
  const madrugada = t < K.camara || t > K.asique;
  return (
    <TonosCtx.Provider value={tonos}>
      <color attach="background" args={[M.cielo]} />
      <fog attach="fog" args={[M.cielo, 40, 130]} />
      <Camara />
      <ambientLight intensity={0.55} color={'#9FC7CF'} />
      <directionalLight position={[-20, 40, 25]} intensity={1.6} color={'#DDF2F2'} />
      {/* luz del semáforo sobre el piso */}
      <pointLight position={[LUZ.x, 3.5, LUZ.z + 1.5]} intensity={18} distance={14} decay={1.4} color={luz === 'v' ? M.verde : M.rojo} />
      <Ciudad />
      <Calles />
      <Corte traza={debajo > 0 ? 1 : traza} brillo={brilloCorte} />
      <Bobina f={f} ver={verBobina} corriente={corriente} aviso={aviso} />
      <Tapa abre={abre} />
      <Campo f={f} ver={verCampo} aplasta={Math.max(aplastaAuto, aplastaBici)} poco={aplastaBici && !encima ? 1 : 0} />
      <Cable ver={verCable} pulso={pulso} />
      <Semaforo luz={luz} cambio={cambio} boton={boton} />
      <CamaraSeg f={f} />
      {!madrugada && <Trafico f={f} />}
      {z < 50 && z > -45 && <Auto z={z} x={2.5} color={C.acento} luces={1} />}
      {biciZ < 50 && <Bici z={biciZ} x={2.5} />}
    </TonosCtx.Provider>
  );
};

// ---------- capa 2D: datos pegados al mundo ----------
const Chip: React.FC<{x: number; y: number; ent: number; children: React.ReactNode; color?: string; fondo?: string; tam?: number}> = ({x, y, ent, children, color = C.oscuro, fondo = C.claro, tam = 46}) => {
  if (ent <= 0.001) return null;
  return (
    <div style={{position: 'absolute', left: x, top: y, translate: '-50% -50%', scale: `${ent}`, background: fondo, color, fontFamily: 'Titulo', fontSize: tam, letterSpacing: 2,
      padding: `${tam * 0.12}px ${tam * 0.42}px`, borderRadius: tam * 0.5, whiteSpace: 'nowrap', boxShadow: '0 8px 0 rgba(0,0,0,0.25)', textTransform: 'uppercase'}}>
      {children}
    </div>
  );
};

const aparece = (f: number, d: number, h: number) => kf(f, [[s(d), 0], [s(d) + 14, 1, E.backFuerte], [s(h) - 8, 1], [s(h), 0, E.in]]);

const Datos: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const pegado = (p: THREE.Vector3, dx = 0, dy = 0) => {
    const q = aPantalla(f, p);
    return {x: q.x + dx, y: q.y + dy};
  };
  const luz = pegado(v3(LUZ.x, LUZ.y + 0.6, LUZ.z));
  const camS = pegado(v3(-5.3, 5.9, 7.2));
  const rect = pegado(v3(2.5, 0, BOBINA.z1 + 0.3));
  const rectLado = pegado(v3(BOBINA.x0 - 0.2, 0, (BOBINA.z0 + BOBINA.z1) / 2));
  const bob = pegado(v3(2.5, -0.2, 11.2));
  const campo = pegado(v3(2.5, 1.9, 11.2));
  const gab = pegado(v3(GABINETE.x, 1.9, GABINETE.z));
  const bici = pegado(v3(2.5, 2.0, PARADO_Z));
  const boton = pegado(v3(POSTE.x + 0.2, 1.75, POSTE.z));
  // reloj de madrugada
  const reloj = aparece(f, 0.15, K.camara - 0.3) || aparece(f, K.asique, K.sigueme - 0.2);
  // medida de la bobina
  const medida = aparece(f, K.rectangulo + 0.1, K.abajo);
  return (
    <>
      <Chip x={860} y={1180} ent={reloj} fondo={C.oscuro} color={C.claro} tam={64}>
        <span style={{fontFamily: 'Destaque', textTransform: 'none'}}>3:00</span> AM
      </Chip>
      <Chip x={luz.x} y={luz.y - 70} ent={aparece(f, K.como, K.camara - 0.2)} fondo={C.acento} color={C.blanco} tam={88}>?</Chip>
      {/* la cámara no está mirando */}
      {(() => {
        const e = aparece(f, K.camara + 0.25, K.chivato - 0.1);
        if (e <= 0) return null;
        return (
          <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
            <g transform={`translate(${camS.x} ${camS.y}) scale(${e})`}>
              <circle r={95} fill="none" stroke={M.rojo} strokeWidth={14} />
              <line x1={-60} y1={-60} x2={60} y2={60} stroke={M.rojo} strokeWidth={16} strokeLinecap="round" />
            </g>
          </svg>
        );
      })()}
      <Chip x={rect.x} y={rect.y + 70} ent={medida} fondo={C.acento} color={C.blanco} tam={64}>≈ 2 metros</Chip>
      <Chip x={rectLado.x - 40} y={rectLado.y} ent={aparece(f, K.asfalto + 0.3, K.rectangulo)} fondo={C.claro} tam={62}>corte</Chip>
      <Chip x={bob.x} y={bob.y + 120} ent={aparece(f, K.abajo + 0.6, K.campo - 0.1)} fondo={M.cobre} color={C.oscuro} tam={64}>bobina</Chip>
      <Chip x={campo.x} y={campo.y - 120} ent={aparece(f, K.campo + 0.4, K.frenas - 0.1)} fondo={M.campo} color={C.oscuro} tam={58}>campo magnético</Chip>
      <Chip x={campo.x} y={campo.y - 170} ent={aparece(f, K.deforma, K.nota)} fondo={C.blanco} color={C.oscuro} tam={60}>el metal lo deforma</Chip>
      <Chip x={gab.x} y={gab.y - 60} ent={aparece(f, K.nota + 0.4, K.verde2 + 0.5)} fondo={C.claro} tam={56}>controlador</Chip>
      <Chip x={luz.x} y={luz.y - 80} ent={aparece(f, K.verde2, K.bici)} fondo={M.verde} color={C.oscuro} tam={64}>¡verde!</Chip>
      <Chip x={bici.x} y={bici.y - 90} ent={aparece(f, K.bici + 1.4, K.boton - 0.1)} fondo={M.rojo} color={C.blanco} tam={62}>poco metal</Chip>
      <Chip x={boton.x - 10} y={boton.y - 110} ent={aparece(f, K.boton + 0.5, K.ny)} fondo={M.ambar} color={C.oscuro} tam={62}>¿sirve?</Chip>
    </>
  );
};

// Nueva York: botones de cruce, la mayoría no hace nada
const BotonesNY: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const ent = ip(f, [s(K.ny - 0.15), s(K.ny + 0.25)], [0, 1]);
  const sal = ip(f, [s(K.asique - 0.25), s(K.asique)], [0, 1], E.in);
  if (ent <= 0 || sal >= 1) return null;
  const cols = 8;
  const filas = 6;
  const total = cols * filas; // 48 ≈ 3.250 botones; 37 de 48 ≈ 2.500 no andan
  const mueren = ip(f, [s(K.dosmil), s(K.nada)], [0, 37], E.inOut);
  const orden = Array.from({length: total}).map((_, i) => i).sort((a, b) => rnd(a, 51) - rnd(b, 51));
  const muerto = new Set(orden.slice(0, Math.floor(mueren)));
  const cuenta = Math.round(ip(f, [s(K.dosmil), s(K.nada)], [0, 2500], E.inOut));
  return (
    <AbsoluteFill style={{opacity: 1 - sal}}>
      <AbsoluteFill style={{background: 'rgba(15,29,36,0.82)', opacity: ent}} />
      <div style={{position: 'absolute', top: 520, left: 0, width: 1080, textAlign: 'center', fontFamily: 'Titulo', fontSize: 58, letterSpacing: 4, color: C.claro, opacity: ent}}>
        NUEVA YORK
      </div>
      <div style={{position: 'absolute', top: 640, left: 140, width: 800, display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 18}}>
        {Array.from({length: total}).map((_, i) => {
          const k = ip(f, [s(K.ny) + i * 0.6, s(K.ny) + i * 0.6 + 10], [0, 1], E.backFuerte);
          const m = muerto.has(i);
          return (
            <div key={i} style={{width: 82, height: 82, borderRadius: 16, background: m ? '#2A3A40' : M.ambar, scale: `${k}`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'}}>
              <div style={{width: 34, height: 34, borderRadius: 17, background: m ? '#41545A' : C.claro}} />
              {m && <div style={{position: 'absolute', fontFamily: 'Titulo', fontSize: 64, color: M.rojo, lineHeight: 1}}>×</div>}
            </div>
          );
        })}
      </div>
      <div style={{position: 'absolute', top: 1200, left: 0, width: 1080, textAlign: 'center', opacity: ip(f, [s(K.dosmil) - 6, s(K.dosmil) + 6], [0, 1])}}>
        <span style={{fontFamily: 'Destaque', fontSize: 150, color: M.rojo}}>+{cuenta.toLocaleString('es-AR')}</span>
        <div style={{fontFamily: 'Titulo', fontSize: 52, color: C.claro, letterSpacing: 3}}>BOTONES QUE NO HACÍAN NADA</div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- subtítulos karaoke ----------
const CLAVES = new Set(['verde', 'chivato', 'debajo', 'rectangulo', 'bobina', 'campo', 'magnetico', 'metal', 'deforma', 'bici', 'boton', 'nada', 'frena', 'sigueme', 'tres', 'llegaste', 'rojo']);
// bloques: se corta en puntos/pausas largas o cada ~6 palabras
const BLOQUES = (() => {
  const out: W[][] = [];
  let cur: W[] = [];
  PAL.forEach((p, i) => {
    cur.push(p);
    const sig = PAL[i + 1];
    const pausa = sig ? sig.d - p.h : 9;
    if (/[.?!:…]$/.test(p.w) || pausa > 0.35 || cur.length >= 6 || (/,$/.test(p.w) && cur.length >= 3)) {
      out.push(cur);
      cur = [];
    }
  });
  if (cur.length) out.push(cur);
  return out;
})();

const Karaoke: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  let i = -1;
  for (let k = 0; k < BLOQUES.length; k++) if (t >= BLOQUES[k][0].d - 0.06) i = k;
  if (i < 0) return null;
  const b = BLOQUES[i];
  const fin = i + 1 < BLOQUES.length ? Math.min(BLOQUES[i + 1][0].d - 0.06, b[b.length - 1].h + 0.6) : b[b.length - 1].h + 0.6;
  if (t > fin) return null;
  const ent = ip(f, [s(b[0].d - 0.06), s(b[0].d - 0.06) + 6], [0, 1]);
  return (
    <div style={{position: 'absolute', top: 300, left: 60, width: 960, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: 20, rowGap: 4, opacity: ent, translate: `0px ${(1 - ent) * 18}px`}}>
      {b.map((p, j) => {
        const dicha = t >= p.d;
        const sonando = dicha && t < (b[j + 1]?.d ?? fin);
        const clave = CLAVES.has(norm(p.w));
        const caja = clave ? ip(f, [s(p.d), s(p.d) + 8], [0, 1]) : 0;
        const k = ip(f, [s(p.d), s(p.d) + 6], [0, 1]);
        return (
          <span key={j} style={{position: 'relative', display: 'inline-block', fontFamily: 'Titulo', fontSize: 86, lineHeight: 1.12, letterSpacing: 2, textTransform: 'uppercase',
            color: !dicha ? 'rgba(234,244,242,0.32)' : clave || sonando ? C.blanco : 'rgba(234,244,242,0.68)', scale: `${1 + (sonando ? 0.05 * (1 - k) : 0)}`,
            textShadow: '0 4px 0 rgba(0,0,0,0.35)'}}>
            {caja > 0 && (
              <span style={{position: 'absolute', left: -10, right: -10, top: 6, bottom: 0, background: C.acento, borderRadius: 6, transformOrigin: 'left center', scale: `${caja} 1`, zIndex: -1}}>
                <span style={{position: 'absolute', left: -7, top: -7, width: 14, height: 14, borderRadius: 7, background: C.blanco}} />
                <span style={{position: 'absolute', right: -7, bottom: -7, width: 14, height: 14, borderRadius: 7, background: C.blanco}} />
              </span>
            )}
            {p.w.replace(/\.\.\.$|…$/, '…')}
          </span>
        );
      })}
    </div>
  );
};

// ---------- Neurón: solo en 4 momentos, entra de costado ----------
const Neuron: React.FC<{pose: string; d: number; h: number; lado: 'izq' | 'der'; alto?: number; y?: number}> = ({pose, d, h, lado, alto = 620, y = 1920}) => {
  const f = useCurrentFrame();
  if (f < s(d) || f > s(h) + 14) return null;
  const ent = kf(f, [[s(d), 0], [s(d) + 16, 1, E.backFuerte]]);
  const sal = ip(f, [s(h), s(h) + 12], [0, 1], E.in);
  const ancho = alto * 0.72;
  const fuera = (1 - ent + sal) * (ancho + 80);
  const x = lado === 'izq' ? -40 - fuera : 1080 - ancho + 40 + fuera;
  const balanceo = Math.sin(f / 13) * 1.5;
  return (
    <Img src={staticFile(`neuron/${pose}.png`)} style={{position: 'absolute', left: x, top: y - alto, width: ancho, height: alto, objectFit: 'contain', objectPosition: 'bottom',
      rotate: `${balanceo + (lado === 'izq' ? 6 : -6) * (1 - ent)}deg`, transformOrigin: '50% 100%', scale: lado === 'der' ? '-1 1' : undefined}} />
  );
};

export type Cue = {f: number; src: string; vol?: number};
const c = (t: number, n: string, vol = 0.5): Cue => ({f: s(t), src: `sfx/${n}.mp3`, vol});
export const CUES_SEMAFORO: Cue[] = [
  c(0.05, 'vuelo1', 0.3), c(K.rojo + 0.2, 'llega', 0.35), c(K.verde, 'blip', 0.6), c(K.como, 'pop', 0.4),
  c(K.camara + 0.25, 'corte', 0.45), c(K.chivato - 0.1, 'zoom', 0.5), c(K.rectangulo - 0.6, 'arco', 0.35),
  c(K.abajo - 0.2, 'rompe', 0.4), c(K.corriente, 'puntos', 0.25), c(K.campo, 'subida', 0.35), c(K.frenas + 0.9, 'golpe', 0.4),
  c(K.nota + 0.1, 'viaje', 0.35), c(K.verde2, 'blip', 0.6), c(K.bici + 1.4, 'tic', 0.4), c(K.boton + 0.6, 'tic', 0.5), c(K.boton + 0.95, 'tic', 0.5),
  c(K.ny - 0.1, 'wipe', 0.4), c(K.dosmil, 'puntos', 0.35), c(K.nada, 'grave', 0.55), c(K.asique - 0.1, 'wipe2', 0.4),
  c(K.rect2 + 0.2, 'blip', 0.6), c(K.sigueme, 'aparece', 0.45),
];

export const EpisodioSemaforo: React.FC<{cues: Cue[]}> = ({cues}) => {
  useFuentes();
  const f = useCurrentFrame();
  const logo = ip(f, [s(K.como - 0.1), s(K.como + 0.5)], [0, 1]);
  return (
    <AbsoluteFill style={{background: M.cielo}}>
      <ThreeCanvas width={1080} height={1920} camera={{fov: FOV, near: 0.1, far: 400, position: [0, 30, 50]}} gl={{antialias: true}}>
        <Escena />
      </ThreeCanvas>
      {/* sombra arriba para leer los subtítulos */}
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(15,29,36,0.85) 0%, rgba(15,29,36,0) 30%)'}} />
      <Datos />
      <BotonesNY />
      <Neuron pose="01" d={0.35} h={K.como - 0.05} lado="izq" />
      <Neuron pose="03" d={K.como - 0.05} h={K.camara - 0.2} lado="izq" />
      <Neuron pose="11" d={K.chivato - 0.15} h={K.asfalto - 0.25} lado="der" alto={680} />
      <Neuron pose="03" d={K.boton - 0.1} h={K.ny - 0.15} lado="izq" />
      <Neuron pose="08" d={K.sigueme - 0.2} h={K.fin + 2} lado="izq" alto={820} />
      {logo > 0 && (
        <div style={{position: 'absolute', left: 0, top: 0, opacity: logo}}>
          <Logo f={f} armado={1} />
        </div>
      )}
      <Karaoke />
      <Audio src={staticFile('voz/neuron-semaforo.mp3')} />
      <Audio src={staticFile('musica/ciencia-chill.mp3')} volume={(x) => interpolate(x, [0, 30, DUR_SEMAFORO - 60, DUR_SEMAFORO], [0, 0.12, 0.12, 0], {extrapolateRight: 'clamp'})} />
      {cues.map((q, i) => (
        <Sequence key={i} from={q.f} durationInFrames={150}>
          <Audio src={staticFile(q.src)} volume={q.vol ?? 0.5} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
