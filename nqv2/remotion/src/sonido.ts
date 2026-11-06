import type {Cue} from './ReelCiencia';
// Música: Mixkit (licencia libre), entra en el primer rebote (cuadro 30).
export const MUSICA: string | undefined = 'musica/ciencia-517.mp3';

const c = (f: number, n: string, vol = 0.8): Cue => ({f, src: `sfx/${n}.mp3`, vol});
const minutos = Array.from({length: 9}).map((_, i) => c(Math.round(587 + i * 17.28), 'madera', 0.9));
const tics = Array.from({length: 24}).map((_, i) => c(587 + i * 6, 'tic', 0.35));

export const CUES: Cue[] = [
  // 1. gancho
  c(12, 'mover', 0.4), c(30, 'rebote', 1), c(62, 'rebote', 0.7), c(80, 'rebote', 0.4),
  c(40, 'letra', 0.9), c(94, 'pop', 0.8), c(100, 'rayo', 0.3), c(104, 'rayo', 0.3), c(108, 'rayo', 0.3),
  c(112, 'letra2', 0.9), c(124, 'corte', 0.9), c(150, 'blip', 0.8), c(152, 'letra', 0.8), c(166, 'letra3', 1),
  c(168, 'aparece', 0.6), c(196, 'zoom', 0.9),
  // 2. marca
  c(237, 'burbuja', 0.9), c(245, 'vuelo1', 0.6), c(248, 'vuelo2', 0.6), c(251, 'vuelo3', 0.6), c(259, 'esquirlas', 0.5),
  c(269, 'letra', 0.7), c(309, 'mover', 0.6),
  // 3. la luz
  c(338, 'pop', 0.6), c(342, 'puntos', 0.35), c(346, 'letra', 0.8), c(352, 'aparece', 0.4), c(368, 'letra3', 0.9),
  c(430, 'junta', 0.7), c(462, 'letra2', 0.8), c(466, 'viaje', 0.8), c(528, 'llega', 0.9), c(534, 'wipe', 0.7),
  // 4. el viaje (afiche de datos: tic que sigue al contador, madera en cada minuto, subida y golpe grave)
  ...tics, ...minutos, c(505, 'subida', 0.45), c(563, 'pop', 0.3),
  c(731, 'grave', 1), c(731, 'golpe', 0.9), c(735, 'letra', 0.8), c(745, 'letra2', 0.8), c(767, 'wipe2', 0.7),
  // 5. la órbita
  c(788, 'pop', 0.3), c(792, 'orbita', 0.6), c(802, 'letra', 0.8), c(814, 'letra2', 0.8),
  c(892, 'letra', 0.8), c(902, 'letra2', 0.8), c(916, 'corte', 0.9), c(938, 'tunel', 0.8), c(944, 'tunel2', 0.6), c(972, 'colapso', 0.9),
  // 6. cierre (silencio corto, arco, se rompe, SEGUIME)
  c(1002, 'arco', 0.6), c(1044, 'rompe', 0.8), c(1066, 'grave', 1), c(1066, 'golpe', 0.8), c(1068, 'pop', 0.6),
  c(1084, 'puntos', 0.4), c(1102, 'aparece', 0.6),
];
