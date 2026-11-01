// Escenas de "Un millón de segundos vs mil millones". Barras de tiempo, cuadrícula de 1000 y una línea de pasos.

const miles = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const aparece = (t, t0) => ({ escala: salto((t - t0) / 0.4), alfa: clamp((t - t0) / 0.2) });

// "Un millón de segundos son unos once días. Mil millones de segundos son casi treinta y dos años."
ESCENAS.hook = (inf) => {
  const t = inf.t;
  const tO = inf.cuando("once") - 0.3, tM = inf.cuando("mil", 7) - 0.3, tT = inf.cuando("treinta") - 0.3;
  texto("1.000.000 s", 540, 450, { tam: 64, color: CELESTE, alfa: entre(t, 0, 0.4) });
  // reloj de días para el millón
  const kd = entre(t, tO, tO + 0.6);
  texto("11 días", 540, 540, { tam: 56, color: "#fff", alfa: kd });
  texto("1.000.000.000 s", 540, 720, { tam: 64, color: NARANJA, alfa: entre(t, tM, tM + 0.4) });
  const ka = entre(t, tT, tT + 0.6);
  texto("32 años", 540, 810, { tam: 90, color: AMARILLO, alfa: ka });
  chip([["Segundos", "#fff"], ["vs", "#9aa3c7"], ["años", AMARILLO]], 540, 300, { tam: 42, ...aparece(t, 0.2) });
};

// calendario de 14 días con los primeros n pintados
function calendario(x, y, n, t) {
  for (let d = 0; d < 14; d++) {
    const cx = x + (d % 7) * 110, cy = y + Math.floor(d / 7) * 120;
    const k = clamp(n - d);
    caja(cx, cy, 96, 100, 14, k > 0 ? `rgba(110,210,235,${0.25 + 0.55 * k})` : "rgba(255,255,255,0.06)", "#5a6390");
    texto(String(d + 1), cx + 48, cy + 50, { tam: 36, color: k > 0.5 ? FONDO : "#cfd6ff" });
  }
}

// "Un millón suena a muchísimo. Pero en segundos, es poco más de una semana y media."
ESCENAS.millon = (inf) => {
  const t = inf.t;
  const tS = inf.cuando("segundos") - 0.3, tM = inf.cuando("media") - 0.3;
  const n = 11.6 * entre(t, tS, tM + 0.6);
  calendario(155, 520, n, t);
  texto(`${n.toFixed(1).replace(".", ",")} días`, 540, 850, { tam: 60, color: CELESTE, alfa: clamp((t - tS) * 3) });
  chip([["1 millón de segundos", "#fff"]], 540, 300, { tam: 42, ...aparece(t, 0.2) });
  chip([["Semana", "#fff"], ["y media", AMARILLO]], 540, 420, { tam: 40, ...aparece(t, tM) });
};

// "Mil millones es mil veces un millón. No el doble ni el triple: mil veces."
ESCENAS.mil = (inf) => {
  const t = inf.t;
  const tV = inf.cuando("veces") - 0.4, tD = inf.cuando("doble") - 0.3, tT = inf.cuando("triple") - 0.3;
  // cuadrícula de 1000 cuadraditos (40 x 25); el primero en celeste es "un millón"
  const k = entre(t, tV, tV + 1.6);
  const n = Math.floor(1000 * k), lado = 20, x0 = 540 - 20 * lado, y0 = 470;
  for (let j = 0; j < n; j++) {
    const cx = x0 + (j % 40) * lado, cy = y0 + Math.floor(j / 40) * lado;
    ctx.fillStyle = j === 0 ? CELESTE : "rgba(255,122,69,0.75)"; ctx.fillRect(cx + 1, cy + 1, lado - 2, lado - 2);
  }
  // el doble y el triple tachados
  chip("x2", 330, 400, { tam: 40, ...aparece(t, tD) }); tachar(330, 400, 80, 60, entre(t, tD + 0.3, tD + 0.7));
  chip("x3", 540, 400, { tam: 40, ...aparece(t, tT) }); tachar(540, 400, 80, 60, entre(t, tT + 0.3, tT + 0.7));
  chip("x1000", 760, 400, { tam: 40, color: AMARILLO, ...aparece(t, tT + 0.8) });
  chip([["Mil veces", AMARILLO], ["un millón", CELESTE]], 540, 300, { tam: 42, ...aparece(t, tV) });
  texto("cada cuadradito = 1 millón", 540, 1000, { tam: 28, color: "#9aa3c7", alfa: clamp(k * 3) });
};

// "Si un millón de segundos fuera un paso, mil millones serían mil pasos."
ESCENAS.pasos = (inf) => {
  const t = inf.t;
  const tP = inf.cuando("paso") - 0.3, tM = inf.cuando("mil", 6) - 0.3;
  // un camino que se aleja en zigzag con huellas
  const huella = (x, y, k, c) => { ctx.save(); ctx.globalAlpha *= k; ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, 13, 20, 0, 0, 7); ctx.fill(); ctx.restore(); };
  huella(140, 900, entre(t, tP, tP + 0.3), CELESTE);
  texto("1 paso", 140, 960, { tam: 36, color: CELESTE, alfa: entre(t, tP, tP + 0.3) });
  const k = entre(t, tM, tM + 2);
  const n = Math.floor(60 * k);
  for (let j = 1; j < n; j++) {
    const s = j / 60;
    const x = 140 + s * 800 * 0.98, y = 900 - Math.pow(s, 0.7) * 520 + (j % 2) * 22;
    huella(x, y, 1, NARANJA);
  }
  chip([["Mil millones =", "#fff"], ["1.000 pasos", AMARILLO]], 540, 300, { tam: 42, ...aparece(t, tM) });
  texto("(dibujamos solo 60)", 760, 960, { tam: 26, color: "#9aa3c7", alfa: clamp(k * 3) });
};

// "Y si sigues: un billón de segundos son unos treinta y un mil setecientos años. Más tiempo del que llevamos escribiendo."
ESCENAS.billon = (inf) => {
  const t = inf.t;
  const tB = inf.cuando("billon") - 0.3, tT = inf.cuando("treinta") - 0.3, tE = inf.cuando("escribiendo") - 0.4;
  texto("1.000.000.000.000 s", 540, 460, { tam: 58, color: VIOLETA, alfa: entre(t, tB, tB + 0.4) });
  const kn = entre(t, tT, tT + 1);
  texto(miles(Math.round(31700 * kn)) + " años", 540, 580, { tam: 80, color: AMARILLO, alfa: clamp(kn * 4) });
  // línea de tiempo: escritura hace unos 5.000 años vs 31.700
  const ke = entre(t, tE, tE + 0.6);
  const x0 = 140, x1 = 940, y = 800;
  caja(x0, y, x1 - x0, 30, 15, "rgba(166,107,255,0.55)");
  caja(x1 - (x1 - x0) * 5000 / 31700, y, (x1 - x0) * 5000 / 31700, 30, 15, `rgba(255,209,102,${ke})`);
  texto("escritura: unos 5.000 años", 700, y + 80, { tam: 30, color: AMARILLO, alfa: ke });
  chip("Un billón de segundos", 540, 300, { tam: 42, ...aparece(t, tB) });
};

// "Nuestro cerebro no está hecho para imaginar estas cantidades, por eso las comparaciones ayudan tanto."
ESCENAS.cerebro = (inf) => {
  const t = inf.t;
  const tI = inf.cuando("imaginar") - 0.3, tC = inf.cuando("comparaciones") - 0.3;
  // tres números que se achican al lado de sus comparaciones
  const filas = [["1 millón", "11 días", CELESTE], ["1.000 millones", "32 años", NARANJA], ["1 billón", "31.700 años", VIOLETA]];
  filas.forEach(([a, b, c], j) => {
    const y = 480 + j * 160;
    texto(a, 330, y, { tam: 48, color: c, alfa: entre(t, tI + j * 0.2, tI + j * 0.2 + 0.4) });
    const kc = entre(t, tC + j * 0.25, tC + j * 0.25 + 0.4);
    flecha(560, y, 640, y, "#fff", 5, kc);
    texto(b, 820, y, { tam: 48, color: AMARILLO, alfa: kc });
  });
  chip([["Comparar", AMARILLO], ["ayuda", "#fff"]], 540, 300, { tam: 42, ...aparece(t, tC) });
};

// "Así que la próxima vez que escuches millones o miles de millones, acuérdate: la diferencia es enorme."
ESCENAS.cierre = (inf) => {
  const t = inf.t;
  const tD = inf.cuando("diferencia") - 0.3;
  // dos barras: 11 días vs 32 años (proporción 1 a 1000, la chica casi no se ve)
  const k = entre(t, 0.2, tD + 0.5);
  caja(170, 900 - 2, 200, 4, 2, CELESTE);
  caja(710, 900 - 520 * k, 200, 520 * k, 14, NARANJA);
  texto("millón", 270, 950, { tam: 34, color: CELESTE });
  texto("mil millones", 810, 950, { tam: 34, color: NARANJA });
  chip([["La diferencia es", "#fff"], ["enorme", AMARILLO]], 540, 300, { tam: 42, ...aparece(t, tD) });
};
