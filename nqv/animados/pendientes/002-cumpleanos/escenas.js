// Escenas de "La paradoja del cumpleaños". Las 23 personas son puntos en un círculo; las parejas, líneas entre ellos.

const N = 23, CENTRO = [540, 630], RADIO = 300;
const PAR = [4, 15];  // la pareja que cumple el mismo día
const punto = k => [CENTRO[0] + RADIO * Math.cos(k / N * 2 * Math.PI - Math.PI / 2),
                    CENTRO[1] + RADIO * Math.sin(k / N * 2 * Math.PI - Math.PI / 2)];
const PAREJAS = [];
for (let a = 0; a < N; a++) for (let b = a + 1; b < N; b++) PAREJAS.push([a, b]);
// orden mezclado fijo para que las líneas aparezcan desparramadas
const MEZCLA = PAREJAS.map((p, k) => [azar(k + 77), p]).sort((x, y) => x[0] - y[0]).map(x => x[1]);

function personas(t, o = {}) {
  for (let k = 0; k < N; k++) {
    const [x, y] = punto(k);
    const aparece = o.aparecer ? salto((t - k * 0.06) / 0.35) : 1;
    if (aparece <= 0) continue;
    const dorado = o.dorados && PAR.includes(k) ? o.dorados : 0;
    const vos = o.vos && k === 0 ? o.vos : 0;
    ctx.save();
    ctx.translate(x, y); ctx.scale(aparece, aparece);
    if (dorado) { ctx.shadowColor = AMARILLO; ctx.shadowBlur = 30 * dorado; }
    circulo(0, 0, 26 + 6 * dorado + 6 * vos, dorado ? AMARILLO : vos ? CELESTE : "#3a4a78", dorado ? "#fff" : "#8fb0ff", 3);
    ctx.restore();
  }
}

function lineaPar(a, b, color, grosor, alfa = 1, k = 1) {
  const [x0, y0] = punto(a), [x1, y1] = punto(b);
  ctx.save(); ctx.globalAlpha *= alfa; ctx.strokeStyle = color; ctx.lineWidth = grosor; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(lerp(x0, x1, k), lerp(y0, y1, k)); ctx.stroke(); ctx.restore();
}

function fechas(k) {
  if (k <= 0) return;
  for (const i of PAR) {
    const [x, y] = punto(i);
    chip("14/03", x + (x < 540 ? -110 : 110), y, { tam: 36, color: AMARILLO, escala: salto(k), alfa: clamp(k * 3) });
  }
}

// "En un grupo de solo veintitrés personas, hay más de un cincuenta por ciento de chance de que dos cumplan años el mismo día."
ESCENAS.grupo = (inf) => {
  const t = inf.t;
  estrellas(0.6);
  const tDos = inf.cuando("dos");
  personas(t, { aparecer: true, dorados: entre(t, tDos, tDos + 0.4) });
  fechas((t - tDos) / 0.4);
  const tC = inf.cuando("cincuenta") - 0.2;
  const k = entre(t, tC, tC + 1.0);
  if (t > tC) texto(`${(50.7 * k).toFixed(1).replace(".", ",")} %`, 540, 610, { tam: 110, peso: 900, color: "#fff", borde: 10 });
  texto("23 personas", 540, 700, { tam: 40, color: "rgba(255,255,255,0.7)", alfa: entre(t, 1.0, 1.6) * (1 - entre(t, tC - 0.2, tC)) });
};

// "Suena imposible, porque el año tiene trescientos sesenta y cinco días. Pero el error está en qué estás comparando."
ESCENAS.calendario = (inf) => {
  const t = inf.t;
  estrellas(0.5);
  const cols = 25, lado = 32, gap = 4, x0 = 540 - (cols * (lado + gap) - gap) / 2, y0 = 330;
  const tAnio = inf.cuando("trescientos") - 0.2;
  const k = entre(t, 0.2, tAnio + 1.0);
  for (let d = 0; d < 365; d++) {
    const c = d % cols, f = Math.floor(d / cols);
    if (d / 365 > k) break;
    const marcado = azar(d + 1000) < 23 / 365 * 1.6 && t > tAnio + 1.6;
    caja(x0 + c * (lado + gap), y0 + f * (lado + gap), lado, lado, 6, marcado ? CELESTE : "#25305a");
  }
  chip([["365", AMARILLO], ["días", "#fff"]], 540, 270, { tam: 42, escala: salto((t - tAnio) / 0.4), alfa: clamp((t - tAnio) / 0.2) });
  const tE = inf.cuando("error");
  chip("¿Qué estás comparando?", 540, 950, { tam: 42, color: NARANJA, escala: salto((t - tE) / 0.4), alfa: clamp((t - tE) / 0.2) });
};

// "No importa solo si alguien cumple el mismo día que vos. Importa cualquier pareja del grupo."
ESCENAS.vos = (inf) => {
  const t = inf.t;
  estrellas(0.5);
  const tVos = inf.cuando("tu") - 0.3, tPar = inf.cuando("cualquier");
  for (let b = 1; b < N; b++) lineaPar(0, b, CELESTE, 4, 0.8, entre(t, tVos + b * 0.03, tVos + 0.5 + b * 0.03));
  for (let k = 0; k < MEZCLA.length; k++) {
    const [a, b] = MEZCLA[k];
    if (a === 0) continue;
    lineaPar(a, b, "#8fb0ff", 2, 0.45, entre(t, tPar + k * 0.008, tPar + 0.4 + k * 0.008));
  }
  personas(t, { vos: entre(t, tVos, tVos + 0.3) });
  const [vx, vy] = punto(0);
  chip("Tú", vx, vy - 70, { tam: 38, color: CELESTE, alfa: entre(t, tVos, tVos + 0.3) });
  chip([["Tú:", CELESTE], ["22", AMARILLO], ["comparaciones", "#fff"]], 540, 1000, { tam: 36, alfa: entre(t, tVos + 0.4, tVos + 0.8) * (1 - entre(t, tPar, tPar + 0.3)) });
  chip([["Todas las parejas", "#fff"]], 540, 1000, { tam: 36, alfa: entre(t, tPar, tPar + 0.3) });
};

// "Y con veintitrés personas se pueden armar doscientas cincuenta y tres parejas distintas."
ESCENAS.parejas = (inf) => {
  const t = inf.t;
  estrellas(0.5);
  const fin = inf.cuando("parejas") + 0.3;
  const k = entre(t, 0.2, fin);
  const cuantas = Math.round(253 * k);
  for (let j = 0; j < cuantas; j++) lineaPar(...MEZCLA[j], "#8fb0ff", 2, 0.55);
  personas(t);
  texto(String(cuantas), 540, 600, { tam: 140, peso: 900, color: AMARILLO, borde: 12 });
  texto("parejas", 540, 700, { tam: 44, peso: 800, borde: 8 });
  const tF = fin + 0.1;
  chip([["23 × 22 ÷ 2 =", "#fff"], ["253", AMARILLO]], 540, 1000, { tam: 40, escala: salto((t - tF) / 0.4), alfa: clamp((t - tF) / 0.2) });
};

// "Cada pareja tiene poquísima chance de coincidir. Pero son tantas, que alguna termina pegando."
ESCENAS.chance = (inf) => {
  const t = inf.t;
  estrellas(0.5);
  const tT = inf.cuando("tantas") - 0.2, tP = inf.cuando("coincidiendo") - 0.2;
  const todas = entre(t, tT, tT + 0.4);
  for (let j = 0; j < 253; j++) {
    const brilla = todas * (0.25 + 0.6 * Math.max(0, Math.sin(t * 9 + j * 1.7)));
    lineaPar(...MEZCLA[j], "#8fb0ff", 2, brilla);
  }
  lineaPar(2, 9, "#fff", 6, 1 - todas, entre(t, 0.1, 0.6));
  chip([["1 pareja:", "#fff"], ["0,27 %", NARANJA]], 540, 1000, { tam: 40, alfa: entre(t, 0.4, 0.7) * (1 - todas) });
  const kp = entre(t, tP, tP + 0.3);
  lineaPar(...PAR, AMARILLO, 10, kp);
  personas(t, { dorados: kp });
  fechas((t - tP) / 0.4);
  chip("¡Coinciden!", 540, 1000, { tam: 42, color: AMARILLO, escala: salto((t - tP) / 0.4), alfa: clamp((t - tP) / 0.2) });
};

function probabilidad(n) { let p = 1; for (let k = 0; k < n; k++) p *= (365 - k) / 365; return 1 - p; }

// "Con cincuenta personas, la probabilidad sube al noventa y siete por ciento. Con setenta, es prácticamente seguro."
ESCENAS.curva = (inf) => {
  const t = inf.t;
  estrellas(0.4);
  const X0 = 150, X1 = 960, Y0 = 930, Y1 = 330;
  const X = n => lerp(X0, X1, n / 70), Y = p => lerp(Y0, Y1, p);
  ctx.save(); ctx.globalAlpha *= entre(t, 0, 0.4);
  ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(X0, Y1 - 20); ctx.lineTo(X0, Y0); ctx.lineTo(X1 + 20, Y0); ctx.stroke();
  for (const p of [0.5, 1]) {
    ctx.setLineDash([6, 10]); ctx.beginPath(); ctx.moveTo(X0, Y(p)); ctx.lineTo(X1, Y(p)); ctx.stroke(); ctx.setLineDash([]);
    texto(`${p * 100} %`, X0 - 20, Y(p), { tam: 30, alinear: "right", color: "rgba(255,255,255,0.7)" });
  }
  for (const n of [0, 23, 50, 70]) texto(String(n), X(n), Y0 + 35, { tam: 30, color: "rgba(255,255,255,0.7)" });
  texto("personas", X1 - 60, Y0 + 75, { tam: 28, color: "rgba(255,255,255,0.6)" });
  ctx.restore();
  const t50 = inf.cuando("cincuenta"), t70 = inf.cuando("setenta");
  const hasta = lerp(0, 70, entre(t, 0.2, t70 + 0.4));
  ctx.save(); ctx.strokeStyle = CELESTE; ctx.lineWidth = 8; ctx.shadowColor = CELESTE; ctx.shadowBlur = 14; ctx.lineJoin = "round";
  ctx.beginPath();
  for (let n = 0; n <= hasta; n += 0.5) n === 0 ? ctx.moveTo(X(n), Y(probabilidad(n))) : ctx.lineTo(X(n), Y(probabilidad(Math.floor(n))));
  ctx.stroke(); ctx.restore();
  for (const [n, txt, desde] of [[23, "50,7 %", 0.2 + (t70 + 0.2) * 23 / 70], [50, "97 %", t50 + 0.3], [70, "99,9 %", t70 + 0.3]]) {
    const k = (t - desde) / 0.35;
    if (k <= 0 || n > hasta + 0.5) continue;
    circulo(X(n), Y(probabilidad(n)), 12 * salto(k), AMARILLO);
    chip(txt, X(n) - (n === 70 ? 40 : 0), Y(probabilidad(n)) + (n === 23 ? -70 : 70), { tam: 38, color: AMARILLO, escala: salto(k), alfa: clamp(k * 3) });
  }
};

// "Así que si en tu laburo hay dos que cumplen el mismo día, no es destino. Es matemática."
ESCENAS.cierre = (inf) => {
  const t = inf.t;
  estrellas(0.6);
  for (let j = 0; j < 253; j++) lineaPar(...MEZCLA[j], "#8fb0ff", 2, 0.25);
  lineaPar(...PAR, AMARILLO, 10, 1);
  personas(t, { dorados: 1 });
  fechas(1);
  const tM = inf.cuando("matematica") - 0.1;
  chip([["No es destino:", "#fff"], ["es matemática", AMARILLO]], 540, 1000, { tam: 40, escala: salto((t - tM) / 0.4), alfa: clamp((t - tM) / 0.2) });
};
