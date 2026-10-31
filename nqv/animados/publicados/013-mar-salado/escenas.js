// Escenas de "¿Por qué el mar es salado?". Corte esquemático: montaña a la izquierda, río y mar a la derecha.

const aparece = (t, t0) => ({ escala: salto((t - t0) / 0.4), alfa: clamp((t - t0) / 0.2) });
const MAR = "rgba(63,140,255,0.6)", ROCA = "#7a6a5a";

function paisaje(t, o = {}) {
  // montaña
  ctx.fillStyle = ROCA;
  ctx.beginPath(); ctx.moveTo(60, 1000); ctx.lineTo(260, 520); ctx.lineTo(460, 1000); ctx.closePath(); ctx.fill();
  // río que baja serpenteando
  ctx.save(); ctx.strokeStyle = "rgba(110,210,235,0.9)"; ctx.lineWidth = 14; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(300, 640);
  for (let s = 0; s <= 1; s += 0.05) ctx.lineTo(lerp(300, 600, s) + Math.sin(s * 9) * 18, lerp(640, 880, s));
  ctx.stroke(); ctx.restore();
  // mar
  ctx.save(); ctx.fillStyle = MAR; ctx.beginPath(); ctx.moveTo(580, 1030);
  for (let x = 580; x <= 1020; x += 10) ctx.lineTo(x, 860 + Math.sin(x / 50 + t * 2) * 6);
  ctx.lineTo(1020, 1030); ctx.closePath(); ctx.fill(); ctx.restore();
  // puntitos de sal en el mar
  const sal = o.sal ?? 0.3;
  for (let k = 0; k < 60 * sal; k++) circulo(600 + azar(k) * 400, 890 + azar(k + 60) * 120, 4, "#fff");
}

// granos de sal que caen de un vaso que se evapora
// "Si evaporas un litro de agua de mar, quedan unos treinta y cinco gramos de sal. Pero los ríos que llegan al mar son de agua dulce."
ESCENAS.hook = (inf) => {
  const t = inf.t;
  const tE = inf.cuando("evaporas") - 0.2, tS = inf.cuando("treinta") - 0.2, tR = inf.cuando("rios") - 0.3;
  const sale = entre(t, tR - 0.3, tR);
  ctx.save(); ctx.globalAlpha *= 1 - sale;
  const nivel = 1 - entre(t, tE, tS + 0.4);
  caja(400, 400, 280, 400, 18, null, "#fff");
  caja(406, 794 - 380 * nivel, 268, 380 * nivel, 12, MAR);
  for (let k = 0; k < 6; k++) { const y = 380 - ((t * 60 + k * 40) % 160); if (nivel < 1 && nivel > 0) onda(450 + k * 35, y, 470 + k * 35, 20, 4, t * 4, "rgba(255,255,255,0.5)", 3); }
  const pila = entre(t, tS - 0.2, tS + 0.6);
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(470, 794); ctx.quadraticCurveTo(540, 794 - 90 * pila, 610, 794); ctx.closePath(); ctx.fill();
  texto("1 litro", 540, 840, { tam: 36 });
  chip([["35 g", AMARILLO], ["de sal", "#fff"]], 540, 300, { tam: 44, ...aparece(t, tS) });
  ctx.restore();
  if (sale > 0) {
    ctx.save(); ctx.globalAlpha *= sale;
    paisaje(t, { sal: 0.6 });
    chip([["Ríos:", "#fff"], ["agua dulce", CELESTE]], 540, 300, { tam: 42 });
    ctx.restore();
  }
};

// "Todo empieza con la lluvia. Es apenas ácida, y al caer sobre las rocas las va desgastando de a poco."
ESCENAS.lluvia = (inf) => {
  const t = inf.t;
  paisaje(t, { sal: 0.3 });
  const tL = inf.cuando("lluvia") - 0.3, tA = inf.cuando("acida") - 0.2, tD = inf.cuando("desgastando") - 0.3;
  if (t > tL) for (let k = 0; k < 40; k++) {
    const x = 80 + azar(k) * 420, y = 260 + ((t * 500 + azar(k + 40) * 600) % 520);
    ctx.save(); ctx.strokeStyle = "rgba(143,194,255,0.8)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 22); ctx.stroke(); ctx.restore();
  }
  chip([["Lluvia", "#fff"], ["apenas ácida", AMARILLO]], 540, 300, { tam: 40, ...aparece(t, tA) });
  // granitos que se desprenden de la montaña
  if (t > tD) for (let k = 0; k < 12; k++) {
    const f = ((t - tD) * 0.6 + azar(k)) % 1;
    circulo(220 + azar(k + 3) * 100 + f * 60, 640 + f * 300, 6, "#d8c8b0");
  }
  chip("Desgasta las rocas", 300, 1010, { tam: 34, ...aparece(t, tD) });
};

// "Así se sueltan minerales, como el sodio, y los ríos los llevan hasta el mar. Llevan tan poca sal que su agua parece dulce."
ESCENAS.rios = (inf) => {
  const t = inf.t;
  paisaje(t, { sal: 0.45 });
  const tS = inf.cuando("sodio") - 0.3, tR = inf.cuando("rios") - 0.3, tP = inf.cuando("poca") - 0.3;
  // partículas que viajan por el río hasta el mar
  if (t > tR) for (let k = 0; k < 10; k++) {
    const s = ((t - tR) * 0.35 + k / 10) % 1;
    circulo(lerp(300, 600, s) + Math.sin(s * 9) * 18, lerp(640, 880, s), 8, AMARILLO, "#fff", 2);
  }
  chip([["Minerales:", "#fff"], ["sodio", AMARILLO]], 540, 300, { tam: 40, ...aparece(t, tS) });
  chip([["Muy poca sal", "#fff"], ["= parece dulce", CELESTE]], 540, 420, { tam: 36, ...aparece(t, tP) });
};

// "En el fondo del mar, los volcanes y las fuentes de agua caliente aportan más minerales, como el cloro."
ESCENAS.fondo = (inf) => {
  const t = inf.t;
  const tV = inf.cuando("volcanes") - 0.3, tC = inf.cuando("cloro") - 0.3;
  // corte del mar con el fondo
  ctx.save(); ctx.fillStyle = MAR; ctx.fillRect(60, 380, 960, 650); ctx.restore();
  ctx.fillStyle = "#3a2f28";
  ctx.beginPath(); ctx.moveTo(60, 1030); ctx.lineTo(60, 950); ctx.lineTo(420, 950); ctx.lineTo(540, 800); ctx.lineTo(660, 950); ctx.lineTo(1020, 950); ctx.lineTo(1020, 1030); ctx.closePath(); ctx.fill();
  const k = entre(t, tV, tV + 0.5);
  // chimenea que echa minerales
  for (let j = 0; j < 18; j++) {
    const f = ((t * 0.5 + azar(j)) % 1);
    circulo(540 + (azar(j + 5) - 0.5) * 120 * f, 790 - f * 360, 6 + f * 10, `rgba(255,122,69,${0.7 * k * (1 - f)})`);
  }
  chip("Volcanes del fondo", 540, 300, { tam: 40, color: NARANJA, ...aparece(t, tV) });
  chip([["Minerales:", "#fff"], ["cloro", AMARILLO]], 820, 600, { tam: 36, ...aparece(t, tC) });
};

// "Después, el Sol evapora el agua del mar, pero la sal no se evapora: se queda. Y así, durante millones de años, se fue juntando."
ESCENAS.evaporar = (inf) => {
  const t = inf.t;
  const tS = inf.cuando("sol") - 0.3, tQ = inf.cuando("queda") - 0.3, tM = inf.cuando("millones") - 0.3;
  sol(880, 330, 55, undefined, entre(t, tS, tS + 0.5));
  paisaje(t, { sal: lerp(0.4, 1, entre(t, tM, tM + 1.5)) });
  // vapor que sube del mar
  if (t > tS) for (let k = 0; k < 6; k++) {
    const f = ((t - tS) * 0.4 + k / 6) % 1;
    onda(640 + k * 60, 840 - f * 400, 670 + k * 60, 24, 5, t * 4, `rgba(255,255,255,${0.6 * (1 - f)})`, 3);
  }
  chip([["El agua se va,", "#fff"], ["la sal se queda", AMARILLO]], 470, 300, { tam: 36, ...aparece(t, tQ) });
  chip("Millones de años", 700, 990, { tam: 34, ...aparece(t, tM) });
};

// "Así que el mar es salado porque es el final del camino: el agua se va, pero la sal se queda."
ESCENAS.cierre = (inf) => {
  const t = inf.t;
  paisaje(t, { sal: 1 });
  const tF = inf.cuando("final") - 0.3;
  chip([["El mar:", "#fff"], ["final del camino", AMARILLO]], 540, 300, { tam: 42, ...aparece(t, tF) });
};
