// Escenas de "¿Por qué nos da hipo?". Torso esquemático: pulmones, diafragma en cúpula y las cuerdas vocales arriba.

const aparece = (t, t0) => ({ escala: salto((t - t0) / 0.4), alfa: clamp((t - t0) / 0.2) });
const PULMON = "rgba(255,138,160,0.55)", DIAFRAGMA = NARANJA;

// torso: d = cuánto baja el diafragma (0 arriba, 1 abajo); cierre = cuerdas cerradas (0-1)
function torso(cx, top, d, cierre = 0, o = {}) {
  // tráquea
  ctx.save(); ctx.strokeStyle = "#cfd6ff"; ctx.lineWidth = 26; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(cx, top + 180); ctx.stroke(); ctx.restore();
  // cuerdas vocales: dos rayitas que se cierran
  const ab = lerp(22, 2, cierre);
  ctx.save(); ctx.strokeStyle = o.cuerdas ?? "#fff"; ctx.lineWidth = 8; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(cx - 40, top + 60); ctx.lineTo(cx - ab, top + 60); ctx.moveTo(cx + 40, top + 60); ctx.lineTo(cx + ab, top + 60); ctx.stroke(); ctx.restore();
  // pulmones que se inflan cuando baja el diafragma
  const inf = 1 + d * 0.12;
  ctx.fillStyle = PULMON;
  ctx.beginPath(); ctx.ellipse(cx - 150, top + 360, 120 * inf, 190 * inf, 0.1, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + 150, top + 360, 120 * inf, 190 * inf, -0.1, 0, 7); ctx.fill();
  // diafragma en cúpula
  const y = top + 560 + d * 60, alto = lerp(90, 30, d);
  ctx.save(); ctx.strokeStyle = o.diafragma ?? DIAFRAGMA; ctx.lineWidth = 16; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(cx - 320, y + 40); ctx.quadraticCurveTo(cx, y - alto * 2, cx + 320, y + 40); ctx.stroke(); ctx.restore();
}

// "Un hombre en Estados Unidos tuvo hipo durante sesenta y ocho años seguidos."
ESCENAS.hook = (inf) => {
  const t = inf.t;
  const tH = 0.1, tS = inf.cuando("sesenta") - 0.3;
  // "HIP" que salta
  for (let j = 0; j < 4; j++) {
    const tj = tH + j * 0.45, k = entre(t, tj, tj + 0.25);
    texto("¡hip!", 220 + j * 210, 560 - salto((t - tj) / 0.3) * 40 * (k > 0 ? 1 : 0), { tam: 64, color: j % 2 ? CELESTE : AMARILLO, alfa: k });
  }
  const ks = entre(t, tS, tS + 0.8);
  texto(String(Math.round(68 * ks)), 540, 780, { tam: 150, color: NARANJA, alfa: clamp(ks * 4) });
  texto("años", 540, 900, { tam: 50, alfa: ks });
  chip([["Hipo por", "#fff"], ["68 años", AMARILLO]], 540, 300, { tam: 42, ...aparece(t, tS) });
};

// "Debajo de los pulmones tienes el diafragma, el músculo que usas para respirar. Normalmente baja y sube con ritmo."
ESCENAS.diafragma = (inf) => {
  const t = inf.t;
  const tP = inf.cuando("pulmones") - 0.3, tD = inf.cuando("diafragma") - 0.3, tB = inf.cuando("baja") - 0.3;
  const resp = t > tB ? (1 - Math.cos((t - tB) * 2.4)) / 2 : 0;
  torso(540, 320, resp);
  chip("Pulmones", 820, 470, { tam: 32, ...aparece(t, tP) });
  chip([["Diafragma", NARANJA]], 540, 300, { tam: 44, ...aparece(t, tD) });
  chip("Baja y sube con ritmo", 540, 1010, { tam: 30, ...aparece(t, tB) });
};

// "En el hipo, el diafragma se contrae de golpe, sin que tú lo decidas, y el aire entra rápido."
ESCENAS.espasmo = (inf) => {
  const t = inf.t;
  const tG = inf.cuando("golpe") - 0.3, tA = inf.cuando("aire") - 0.3;
  // tirón brusco y repetido
  const c = t > tG ? ((t - tG) % 1.4) : 9;
  const d = c < 0.12 ? c / 0.12 : clamp(1 - (c - 0.12) / 0.8);
  torso(540, 320, d, 0, { diafragma: d > 0.5 ? ROJO : DIAFRAGMA });
  if (t > tA) for (let j = 0; j < 4; j++) { const f = ((t - tA) * 1.6 + j / 4) % 1; flecha(540, 335 + f * 60, 540, 370 + f * 60, CELESTE, 6, 1, 1 - f); }
  chip([["Se contrae", "#fff"], ["de golpe", ROJO]], 540, 300, { tam: 42, ...aparece(t, tG) });
  chip("El aire entra rápido", 540, 1010, { tam: 30, ...aparece(t, tA) });
};

// "Una fracción de segundo después, las cuerdas vocales se cierran y frenan ese aire. Ese choque es el sonido del hipo."
ESCENAS.cuerdas = (inf) => {
  const t = inf.t;
  const tC = inf.cuando("cierran") - 0.3, tS = inf.cuando("sonido") - 0.3;
  // zoom a la garganta: dos cuerdas grandes vistas desde arriba
  const cierre = t > tC ? clamp(((t - tC) % 1.4) / 0.15) * (((t - tC) % 1.4) < 0.7 ? 1 : 0) : 0;
  const cx = 540, cy = 640;
  ctx.fillStyle = "#3a2030"; ctx.beginPath(); ctx.ellipse(cx, cy, 240, 300, 0, 0, 7); ctx.fill();
  const ab = lerp(110, 4, cierre);
  ctx.fillStyle = "#ffd6e0";
  ctx.beginPath(); ctx.moveTo(cx - 6, cy - 230); ctx.quadraticCurveTo(cx - ab - 30, cy, cx - 6, cy + 230); ctx.lineTo(cx - 200, cy + 150); ctx.lineTo(cx - 200, cy - 150); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx + 6, cy - 230); ctx.quadraticCurveTo(cx + ab + 30, cy, cx + 6, cy + 230); ctx.lineTo(cx + 200, cy + 150); ctx.lineTo(cx + 200, cy - 150); ctx.closePath(); ctx.fill();
  // onda de sonido cuando chocan
  const ks = entre(t, tS, tS + 0.4) * (cierre > 0.9 ? 1 : 0.2);
  for (let j = 1; j <= 3; j++) { ctx.save(); ctx.strokeStyle = `rgba(255,209,102,${ks / j})`; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, cy, 260 + j * 40, -0.5, 0.5); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy, 260 + j * 40, Math.PI - 0.5, Math.PI + 0.5); ctx.stroke(); ctx.restore(); }
  chip([["Cuerdas vocales", "#fff"], ["se cierran", CELESTE]], 540, 300, { tam: 38, ...aparece(t, tC) });
  chip([["Choque =", "#fff"], ["¡hip!", AMARILLO]], 540, 1000, { tam: 40, ...aparece(t, tS) });
};

// "Lo puede disparar comer muy rápido, las bebidas con gas o un cambio brusco de temperatura."
ESCENAS.causas = (inf) => {
  const t = inf.t;
  const tC = inf.cuando("comer") - 0.3, tG = inf.cuando("gas") - 0.3, tT = inf.cuando("temperatura") - 0.4;
  const tarjeta = (x, k, dibujo, etiqueta) => {
    if (k <= 0) return;
    ctx.save(); ctx.globalAlpha *= k; ctx.translate(x, 640); ctx.scale(salto(k), salto(k));
    caja(-140, -200, 280, 400, 24, "rgba(255,255,255,0.05)", "#5a6390");
    dibujo(); texto(etiqueta, 0, 150, { tam: 30 });
    ctx.restore();
  };
  tarjeta(220, entre(t, tC, tC + 0.4), () => {
    circulo(0, -40, 80, "#f4f4f4", "#9aa3c7", 4); circulo(0, -40, 40, NARANJA);
    for (let j = 0; j < 3; j++) flecha(-120 + j * 10, -120 + j * 30, -60, -60, "#fff", 4, (t * 2 + j * 0.3) % 1);
  }, "Comer rápido");
  tarjeta(540, entre(t, tG, tG + 0.4), () => {
    caja(-50, -140, 100, 200, 16, "rgba(110,210,235,0.35)", CELESTE);
    for (let j = 0; j < 8; j++) circulo(-30 + azar(j) * 60, 40 - ((t * 80 + azar(j + 5) * 180) % 180), 7, "#fff");
  }, "Bebidas con gas");
  tarjeta(860, entre(t, tT, tT + 0.4), () => {
    caja(-14, -150, 28, 190, 14, "#fff"); circulo(0, 60, 36, ROJO); caja(-6, -100 + Math.sin(t * 3) * 30, 12, 160, 6, ROJO);
  }, "Frío o calor");
  chip("Qué lo dispara", 540, 300, { tam: 42, ...aparece(t, 0.2) });
};

// "Y lo más raro: nadie sabe bien para qué sirve. Charles Osborne lo tuvo desde mil novecientos veintidós hasta mil novecientos noventa."
ESCENAS.record = (inf) => {
  const t = inf.t;
  const tN = inf.cuando("nadie") - 0.3, tO = inf.cuando("osborne") - 0.3, tV = inf.cuando("veintidos") - 0.4, tF = inf.cuando("noventa") - 0.3;
  const sale = entre(t, tO - 0.3, tO);
  ctx.save(); ctx.globalAlpha *= 1 - sale;
  texto("?", 540, 640, { tam: 300, color: VIOLETA, alfa: entre(t, tN, tN + 0.5) * (0.8 + Math.sin(t * 3) * 0.2) });
  chip("Nadie sabe para qué sirve", 540, 300, { tam: 38, ...aparece(t, tN) });
  ctx.restore();
  if (sale > 0) {
    ctx.save(); ctx.globalAlpha *= sale;
    const x0 = 140, x1 = 940, y = 680;
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
    const k = entre(t, tV, tF + 0.5);
    caja(x0, y - 30, (x1 - x0) * k, 60, 14, "rgba(255,122,69,0.7)");
    texto("1922", x0 + 40, y + 80, { tam: 40, color: AMARILLO, alfa: entre(t, tV, tV + 0.3) });
    texto("1990", x1 - 40, y + 80, { tam: 40, color: AMARILLO, alfa: entre(t, tF, tF + 0.3) });
    texto("68 años", 540, y - 90, { tam: 60, alfa: entre(t, tF, tF + 0.4) });
    chip([["Charles", "#fff"], ["Osborne", CELESTE]], 540, 300, { tam: 42 });
    ctx.restore();
  }
};

// "Así que el hipo es un reflejo antiguo que tu cuerpo sigue haciendo, aunque ya nadie recuerde para qué."
ESCENAS.cierre = (inf) => {
  const t = inf.t;
  const tR = inf.cuando("reflejo") - 0.3;
  const c = t % 1.6, d = c < 0.12 ? c / 0.12 : clamp(1 - (c - 0.12) / 0.8);
  torso(540, 360, d, d > 0.6 ? 1 : 0);
  chip([["Un reflejo", "#fff"], ["antiguo", AMARILLO]], 540, 300, { tam: 42, ...aparece(t, tR) });
};
