import React, {useMemo} from 'react';
import {AbsoluteFill, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {C, E, ip, kf, rnd, useFuentes} from './lib';

// Prueba del estilo "escena 3D" (2026-11-09): UN objeto protagonista en 3D que se transforma con la voz,
// cámara siempre en movimiento, datos pegados al objeto y subtítulos karaoke arriba. Paleta y tipografías NQV.
// Usa el gancho del episodio del Sol (voz Charon, 0 a 7.2 s).

export const FPS3 = 60;
const s = (x: number) => Math.round(x * FPS3);
export const DUR_P3 = s(7.6);

// Palabras con su tiempo (s). Medidas en la voz.
type Palabra = {w: string; t: number; clave?: boolean};
export const PALABRAS_GANCHO: Palabra[][] = [
  [
    {w: 'Si', t: 0.25}, {w: 'el', t: 0.42}, {w: 'Sol', t: 0.55, clave: true}, {w: 'desapareciera', t: 1.04},
    {w: 'ahora', t: 1.62}, {w: 'mismo...', t: 1.85},
  ],
  [{w: 'no', t: 2.56}, {w: 'te', t: 2.7}, {w: 'enterarías.', t: 2.82, clave: true}],
  [{w: 'Durante', t: 4.23}, {w: 'ocho', t: 4.59, clave: true}, {w: 'minutos,', t: 4.9, clave: true}],
  [{w: 'todo', t: 5.86}, {w: 'seguiría', t: 6.08}, {w: 'igual.', t: 6.5}],
];
export const FIN_GANCHO = 7.0;

// ---------- Subtítulos karaoke ----------
// Línea por bloque: las palabras ya dichas quedan tenues, la que suena va en blanco, la palabra clave se marca con un recuadro rosa.
const Karaoke: React.FC<{bloques: Palabra[][]; fin: number}> = ({bloques, fin}) => {
  const f = useCurrentFrame();
  const t = f / FPS3;
  let i = -1;
  for (let k = 0; k < bloques.length; k++) if (t >= bloques[k][0].t - 0.08) i = k;
  if (i < 0) return null;
  const bloque = bloques[i];
  const finBloque = i + 1 < bloques.length ? bloques[i + 1][0].t - 0.08 : fin;
  if (t > finBloque + 0.25) return null;
  const sal = ip(f, [s(finBloque), s(finBloque) + 8], [0, 1], E.in);
  const ent = ip(f, [s(bloque[0].t - 0.08), s(bloque[0].t - 0.08) + 8], [0, 1]);
  return (
    <div style={{position: 'absolute', top: 300, left: 70, width: 940, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: 22, rowGap: 6,
      opacity: ent * (1 - sal), translate: `0px ${(1 - ent) * 24 - sal * 24}px`}}>
      {bloque.map((p, j) => {
        const sig = j + 1 < bloque.length ? bloque[j + 1].t : finBloque;
        const dicha = t >= p.t;
        const sonando = dicha && t < sig;
        const k = ip(f, [s(p.t), s(p.t) + 6], [0, 1]);
        const caja = p.clave ? ip(f, [s(p.t), s(p.t) + 9], [0, 1]) : 0;
        return (
          <span key={j} style={{position: 'relative', display: 'inline-block', fontFamily: 'Titulo', fontSize: 92, lineHeight: 1.1, letterSpacing: 2, textTransform: 'uppercase',
            color: !dicha ? 'rgba(234,244,242,0.28)' : p.clave ? C.blanco : sonando ? C.blanco : 'rgba(234,244,242,0.62)',
            scale: `${1 + (sonando ? 0.06 * (1 - k) : 0)}`}}>
            {caja > 0 && (
              <span style={{position: 'absolute', left: -10, right: -10, top: 4, bottom: 0, background: C.acento, borderRadius: 6, transformOrigin: 'left center', scale: `${caja} 1`, zIndex: -1}}>
                <span style={{position: 'absolute', left: -7, top: -7, width: 14, height: 14, borderRadius: 7, background: C.blanco, opacity: caja}} />
                <span style={{position: 'absolute', right: -7, bottom: -7, width: 14, height: 14, borderRadius: 7, background: C.blanco, opacity: caja}} />
              </span>
            )}
            {p.w}
          </span>
        );
      })}
    </div>
  );
};

// ---------- texturas ----------
const useResplandor = () =>
  useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d')!;
    const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(0.25, 'rgba(255,255,255,0.55)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }, []);

const useTonos = () =>
  useMemo(() => {
    // 3 escalones de luz: sombreado plano estilo NQV pero con volumen
    const d = new Uint8Array([70, 160, 255]);
    const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat);
    t.minFilter = t.magFilter = THREE.NearestFilter;
    t.needsUpdate = true;
    return t;
  }, []);

// superficie del Sol: manchas suaves en la geometría (vértices desplazados), determinístico
const useSolGeo = () =>
  useMemo(() => {
    const g = new THREE.IcosahedronGeometry(1, 24);
    const p = g.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).normalize();
      const n = Math.sin(v.x * 7.1 + 1.3) * Math.sin(v.y * 6.3) * Math.sin(v.z * 7.7 + 0.4);
      v.multiplyScalar(1 + n * 0.004);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
  }, []);

// ---------- cámara: plano continuo ----------
const Camara: React.FC = () => {
  const f = useCurrentFrame();
  const {camera} = useThree();
  // tramo 1: pegada al Sol; tramo 2: se abre y muestra la Tierra; tramo 3: viaja con la luz hacia la Tierra
  const abre = ip(f, [s(2.45), s(3.45)], [0, 1], E.inOut);
  const viaja = ip(f, [s(4.2), s(7.4)], [0, 1], E.inOut);
  const orbita = Math.sin(f / 90) * 0.12;
  const L = THREE.MathUtils.lerp;
  const pos = new THREE.Vector3(
    L(L(Math.sin(orbita) * 8.5, 2.2, abre), 2.6, viaja),
    L(L(0.4, -2.6, abre), -4.6, viaja),
    L(L(Math.cos(orbita) * 8.5, 21, abre), 15, viaja),
  );
  const mira = new THREE.Vector3(L(L(0, 0.5, abre), 0.9, viaja), L(L(-0.2, -3.0, abre), -4.6, viaja), 0);
  camera.position.copy(pos);
  camera.lookAt(mira);
  // empujón de cámara cuando el Sol se apaga
  const golpe = Math.max(0, 1 - Math.abs(f - s(2.38)) / 10);
  camera.position.x += Math.sin(f * 2.3) * 0.06 * golpe;
  camera.position.y += Math.cos(f * 3.1) * 0.06 * golpe;
  return null;
};

const TIERRA = new THREE.Vector3(1.3, -7.2, 1.2);

const Escena: React.FC = () => {
  const f = useCurrentFrame();
  const resplandor = useResplandor();
  const tonos = useTonos();
  const solGeo = useSolGeo();
  const mapa = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 512;
    const g = c.getContext('2d')!;
    g.fillStyle = C.petroleo; g.fillRect(0, 0, 1024, 512);
    g.fillStyle = C.suave;
    // continentes estilizados: grupos de óvalos
    const grupos = [[180, 170, 9], [300, 330, 7], [560, 160, 10], [600, 320, 6], [820, 210, 9], [900, 380, 4]];
    grupos.forEach(([x, y, n], gi) => {
      for (let i = 0; i < n; i++) {
        g.beginPath();
        g.ellipse(x + (rnd(gi * 20 + i, 4) - 0.5) * 150, y + (rnd(gi * 20 + i, 5) - 0.5) * 90, 30 + rnd(gi * 20 + i, 6) * 45, 18 + rnd(gi * 20 + i, 7) * 30, rnd(i, 8) * 3, 0, Math.PI * 2);
        g.fill();
      }
    });
    g.fillStyle = C.claro; g.fillRect(0, 0, 1024, 28); g.fillRect(0, 484, 1024, 28);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  // superficie del Sol pintada (mismo lenguaje que los continentes de la Tierra)
  const mapaSol = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 512;
    const g = c.getContext('2d')!;
    g.fillStyle = C.acento; g.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 70; i++) {
      g.fillStyle = i % 3 === 0 ? '#F89AB0' : '#E25578';
      g.beginPath();
      g.ellipse(rnd(i, 11) * 1024, 40 + rnd(i, 12) * 432, 18 + rnd(i, 13) * 46, 12 + rnd(i, 14) * 26, rnd(i, 15) * 3, 0, Math.PI * 2);
      g.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  const nace = kf(f, [[s(0.05), 0], [s(0.55), 1, E.backFuerte]]);
  const apaga = ip(f, [s(2.2), s(2.42)], [0, 1], E.in);
  const sol = nace * (1 - apaga);
  const destello = Math.max(0, 1 - Math.abs(f - s(2.42)) / 9);
  const fantasma = ip(f, [s(2.6), s(3.0)], [0, 1]);
  // frente de luz que viaja hasta la Tierra (los 8 minutos)
  const frente = ip(f, [s(4.25), s(6.95)], [0, 1], E.lin);
  const llega = f >= s(6.95);
  const sombra = ip(f, [s(6.95), s(7.25)], [0, 1], E.in);
  const dist = TIERRA.length();
  const luz = 1 - sombra;
  const tierraNace = ip(f, [s(2.9), s(3.5)], [0, 1], E.backFuerte);

  const estrellas = useMemo(() => {
    const n = 500;
    const a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const th = rnd(i, 1) * Math.PI * 2;
      const ph = Math.acos(2 * rnd(i, 2) - 1);
      const r = 40 + rnd(i, 3) * 20;
      a.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th)], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(a, 3));
    return g;
  }, []);

  return (
    <>
      <color attach="background" args={[C.oscuro]} />
      <fog attach="fog" args={[C.oscuro, 18, 60]} />
      <Camara />
      <ambientLight intensity={0.18} color={C.suave} />
      {/* la luz que sigue llegando aunque el Sol ya no esté */}
      <pointLight position={[0, 0, 0]} intensity={luz * 160} distance={40} decay={1.6} color={'#FFE3EA'} />
      <points geometry={estrellas}>
        <pointsMaterial size={0.12} color={C.suave} transparent opacity={0.55} sizeAttenuation />
      </points>

      {/* luz de modelado solo para el Sol (no llega a la Tierra) */}
      <pointLight position={[-2.2, 2.4, 4.2]} intensity={40} distance={7.5} decay={1.2} color={'#FFFFFF'} />
      {/* el Sol: esfera con sombreado plano, gira */}
      {sol > 0.001 && (
        <group scale={sol} rotation={[0.25, f / 70, 0.15]}>
          <mesh>
            <sphereGeometry args={[1, 64, 64]} />
            <meshToonMaterial map={mapaSol} gradientMap={tonos} emissive={C.acento} emissiveIntensity={0.25} />
          </mesh>
        </group>
      )}
      {sol > 0.001 && (
        <sprite scale={[4.2 * sol, 4.2 * sol, 1]}>
          <spriteMaterial map={resplandor} color={C.acento} transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} />
        </sprite>
      )}
      {/* llamaradas: conos 3D que giran alrededor */}
      {sol > 0.001 &&
        Array.from({length: 10}).map((_, i) => {
          const a = (i / 10) * Math.PI * 2 + f / 100;
          const k = kf(f, [[s(0.25) + i * 2, 0], [s(0.6) + i * 2, 1, E.backFuerte]]) * sol;
          const lat = Math.sin(i * 1.7) * 0.5;
          const dir = new THREE.Vector3(Math.cos(a) * Math.cos(lat), Math.sin(lat) + Math.sin(a) * 0.35, Math.sin(a) * Math.cos(lat)).normalize();
          const largo = 0.32 + 0.08 * Math.sin(f / 9 + i);
          return (
            <mesh key={i} position={dir.clone().multiplyScalar(1.12 + largo * 0.5).toArray()}
              quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)} scale={[k, k * (largo / 0.32), k]}>
              <coneGeometry args={[0.13, 0.32, 24]} />
              <meshToonMaterial color={'#F7869F'} gradientMap={tonos} emissive={C.acento} emissiveIntensity={0.2} />
            </mesh>
          );
        })}
      {/* al apagarse: se rompe en pedazos 3D que salen girando */}
      {f >= s(2.3) && f < s(3.6) &&
        Array.from({length: 16}).map((_, i) => {
          const t = ip(f, [s(2.3), s(3.6)], [0, 1], E.snap);
          const dir = new THREE.Vector3(rnd(i, 21) - 0.5, rnd(i, 22) - 0.5, rnd(i, 23) - 0.5).normalize();
          const sc = (0.16 + rnd(i, 24) * 0.14) * (1 - ip(f, [s(2.9), s(3.6)], [0, 1], E.in));
          return (
            <mesh key={i} position={dir.multiplyScalar(0.4 + t * (2.6 + rnd(i, 25) * 2.2)).toArray()} rotation={[f / 8 + i, f / 11, i]} scale={sc}>
              <icosahedronGeometry args={[1, 0]} />
              <meshToonMaterial color={i % 2 ? C.acento : '#F89AB0'} gradientMap={tonos} emissive={C.acento} emissiveIntensity={0.3} />
            </mesh>
          );
        })}
      {destello > 0 && (
        <sprite scale={[7 * destello, 7 * destello, 1]}>
          <spriteMaterial map={resplandor} color={'#FFE3EA'} transparent opacity={destello * 0.8} blending={THREE.AdditiveBlending} depthWrite={false} />
        </sprite>
      )}
      {/* el Sol que todavía ves: el mismo Sol, transparente, que late */}
      {fantasma > 0 && (
        <group scale={fantasma * (1 + Math.sin(f / 7) * 0.03)} rotation={[0.25, f / 70, 0.15]}>
          <mesh>
            <sphereGeometry args={[1, 48, 48]} />
            <meshToonMaterial map={mapaSol} gradientMap={tonos} emissive={C.acento} emissiveIntensity={0.25} transparent opacity={0.32 * (1 - sombra * 0.7)} depthWrite={false} />
          </mesh>
        </group>
      )}
      {/* la luz viajando: una bola de luz con su estela, del Sol a la Tierra */}
      {frente > 0 && !llega &&
        Array.from({length: 12}).map((_, i) => {
          const q = Math.max(0, frente - i * 0.022);
          if (q <= 0) return null;
          const pos = TIERRA.clone().multiplyScalar(q * 0.88);
          pos.x += Math.sin(q * 9) * 0.25;
          const sc = i === 0 ? 0.26 + Math.sin(f / 4) * 0.02 : 0.15 * (1 - i / 12);
          return (
            <mesh key={i} position={pos.toArray()} scale={sc} rotation={[f / 10, f / 13, 0]}>
              <sphereGeometry args={[1, 32, 32]} />
              <meshToonMaterial color={'#FFF1F4'} gradientMap={tonos} emissive={'#FFC2D1'} emissiveIntensity={i === 0 ? 0.9 : 0.6} transparent opacity={i === 0 ? 1 : 0.85} />
            </mesh>
          );
        })}
      {frente > 0 && !llega && (
        <sprite position={TIERRA.clone().multiplyScalar(frente * 0.88).toArray()} scale={[1.4, 1.4, 1]}>
          <spriteMaterial map={resplandor} color={'#FFE3EA'} transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} />
        </sprite>
      )}
      {/* la Tierra */}
      {tierraNace > 0 && (
        <group position={TIERRA.toArray()} scale={0.95 * tierraNace} rotation={[0.4, f / 90, 0]}>
          <mesh>
            <sphereGeometry args={[1, 64, 64]} />
            <meshToonMaterial map={mapa} gradientMap={tonos} />
          </mesh>
          <sprite scale={[2.9, 2.9, 1]}>
            <spriteMaterial map={resplandor} color={C.suave} transparent opacity={0.22 * (1 - sombra * 0.8)} blending={THREE.AdditiveBlending} depthWrite={false} />
          </sprite>
        </group>
      )}
    </>
  );
};

// Contador pegado a la Tierra: 8:20 que baja hasta 0:00 mientras viaja la luz
const Contador: React.FC = () => {
  const f = useCurrentFrame();
  const k = ip(f, [s(4.25), s(6.95)], [0, 1], E.lin);
  const ent = kf(f, [[s(4.6), 0], [s(4.9), 1, E.backFuerte]]);
  const sal = ip(f, [s(7.15), s(7.35)], [0, 1], E.in);
  if (ent <= 0) return null;
  const quedan = Math.round(500 * (1 - k));
  const mm = Math.floor(quedan / 60);
  const ss = String(quedan % 60).padStart(2, '0');
  const cero = quedan === 0;
  return (
    <div style={{position: 'absolute', left: 70, top: 1080, scale: `${ent * (1 - sal) * (cero ? 1 + 0.12 * Math.max(0, 1 - (f - s(6.95)) / 8) : 1)}`, transformOrigin: 'left center',
      display: 'flex', alignItems: 'baseline', gap: 10}}>
      <span style={{fontFamily: 'Destaque', fontSize: 120, color: cero ? C.blanco : C.acento, letterSpacing: 2, textShadow: '0 6px 0 rgba(0,0,0,0.25)'}}>
        {mm}:{ss}
      </span>
      <span style={{fontFamily: 'Titulo', fontSize: 52, color: C.claro, letterSpacing: 3}}>MIN</span>
    </div>
  );
};

export const Prueba3D: React.FC = () => {
  useFuentes();
  const {width, height} = useVideoConfig();
  return (
    <AbsoluteFill style={{background: C.oscuro}}>
      <ThreeCanvas width={width} height={height} camera={{fov: 38, near: 0.1, far: 200, position: [0, 0.5, 4.2]}} gl={{antialias: true}}>
        <Escena />
      </ThreeCanvas>
      {/* viñeta suave para que el texto se lea */}
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(20,37,44,0.85) 0%, rgba(20,37,44,0) 32%, rgba(20,37,44,0) 78%, rgba(20,37,44,0.6) 100%)'}} />
      <Contador />
      <Karaoke bloques={PALABRAS_GANCHO} fin={FIN_GANCHO} />
      <Audio src={staticFile('voz/neuron-sol.mp3')} trimAfter={s(7.4)} />
      <Audio src={staticFile('musica/ciencia-chill.mp3')} volume={0.13} trimAfter={s(7.6)} />
      <Sequence from={s(0.05)} durationInFrames={120}><Audio src={staticFile('sfx/pop.mp3')} volume={0.45} /></Sequence>
      <Sequence from={s(2.4)} durationInFrames={120}><Audio src={staticFile('sfx/grave.mp3')} volume={0.6} /></Sequence>
      <Sequence from={s(4.25)} durationInFrames={200}><Audio src={staticFile('sfx/vuelo1.mp3')} volume={0.3} /></Sequence>
      <Sequence from={s(6.95)} durationInFrames={120}><Audio src={staticFile('sfx/llega.mp3')} volume={0.45} /></Sequence>
    </AbsoluteFill>
  );
};
