// Escenas de "Tu corazón late 100.000 veces por día".

const aparece = (t, t0) => ({ escala: salto((t - t0) / 0.4), alfa: clamp((t - t0) / 0.2) });
const PULSO = 70 / 60;  // latidos por segundo
const miles = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

// corazón dibujado con dos curvas, de tamaño s, que late
function corazon(x, y, s, latido = 0, color = ROJO) {
  const k = s * (1 + 0.1 * latido);
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  ctx.beginPath();
  ctx.moveTo(0, 30);
  ctx.bezierCurveTo(-55, -5, -45, -60, 0, -35);
  ctx.bezierCurveTo(45, -60, 55, -5, 0, 30);
  ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 25; ctx.fill();
  ctx.restore();
}
const late = t => Math.pow(Math.max(0, Math.sin(t * PULSO * Math.PI * 2)), 8);

// línea de electrocardiograma que avanza
function ecg(x0, y, w, t, color = VERDE) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.shadowColor = color; ctx.shadowBlur = 10;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 4) {
    const f = ((x / 160) + t * PULSO) % 1;
    const yy = f > 0.45 && f < 0.5 ? -70 * Math.sin((f - 0.45) / 0.05 * Math.PI) : f > 0.5 && f < 0.55 ? 25 * Math.sin((f - 0.5) / 0.05 * Math.PI) : 0;
    x === 0 ? ctx.moveTo(x0 + x, y + yy) : ctx.lineTo(x0 + x, y + yy);
  }
  ctx.stroke(); ctx.restore();
}

// "Tu corazón late unas cien mil veces por día, sin que tengas que pensarlo ni una sola vez."
ESCENAS.hook = (inf) => {
  const t = inf.t;
  corazon(540, 560, 3.2, late(t));
  ecg(80, 860, 920, t);
  const tC = inf.cuando("cien") - 0.2;
  const n = Math.round(100000 * entre(t, tC, tC + 1.4));
  chip([[miles(n), AMARILLO], ["latidos por día", "#fff"]], 540, 300, { tam: 42, ...aparece(t, tC) });
};

// "En reposo late entre sesenta y cien veces por minuto. Multiplica eso por todos los minutos del día y llegas a unas cien mil."
ESCENAS.latidos = (inf) => {
  const t = inf.t;
  const tS = inf.cuando("sesenta") - 0.2, tM = inf.cuando("multiplica") - 0.2;
  corazon(260, 520, 1.6, late(t));
  chip([["60 a 100", AMARILLO], ["por minuto", "#fff"]], 640, 520, { tam: 40, ...aparece(t, tS) });
  const k = entre(t, tM, tM + 0.4);
  if (k > 0) {
    texto("× 1.440 minutos del día", 540, 720, { tam: 44, alfa: k });
    const tf = inf.cuando("llegas") - 0.2;
    texto(`= ${miles(Math.round(100000 * entre(t, tf, tf + 1)))}`, 540, 850, { tam: 84, peso: 900, color: AMARILLO, alfa: entre(t, tf, tf + 0.2) });
  }
};

// "En cada latido bombea unos setenta mililitros de sangre. Al día, eso suma más de siete mil litros."
ESCENAS.sangre = (inf) => {
  const t = inf.t;
  const tS = inf.cuando("setenta") - 0.2, tD = inf.cuando("siete") - 0.3;
  corazon(260, 560, 1.6, late(t));
  // vaso que se llena con cada latido
  const nivel = entre(t, tS, tS + 0.6);
  caja(600, 420, 160, 280, 14, null, "#fff");
  caja(606, 694 - 270 * nivel * 0.3, 148, 270 * nivel * 0.3, 10, ROJO);
  chip([["70 ml", AMARILLO], ["por latido", "#fff"]], 680, 320, { tam: 38, ...aparece(t, tS) });
  const n = Math.round(7000 * entre(t, tD, tD + 1.2));
  chip([["Al día:", "#fff"], [`+${miles(n)} litros`, ROJO]], 540, 900, { tam: 46, ...aparece(t, tD) });
};

// "Es como llenar unas cuarenta bañeras por día, con un músculo que pesa unos trescientos gramos."
ESCENAS.baneras = (inf) => {
  const t = inf.t;
  const tB = inf.cuando("cuarenta") - 0.2, tP = inf.cuando("trescientos") - 0.3;
  for (let k = 0; k < 40; k++) {
    const a = entre(t, tB + k * 0.03, tB + 0.25 + k * 0.03);
    if (a <= 0) continue;
    const x = 150 + (k % 8) * 110, y = 400 + Math.floor(k / 8) * 85;
    ctx.save(); ctx.globalAlpha *= a;
    // bañera blanca vista de costado, llena de sangre hasta el borde
    ctx.beginPath(); ctx.moveTo(x - 46, y - 16); ctx.lineTo(x + 46, y - 16); ctx.quadraticCurveTo(x + 44, y + 24, x + 24, y + 24); ctx.lineTo(x - 24, y + 24); ctx.quadraticCurveTo(x - 44, y + 24, x - 46, y - 16); ctx.closePath();
    ctx.fillStyle = "#eef2f7"; ctx.fill();
    caja(x - 44, y - 22, 88, 10, 5, ROJO);
    caja(x - 30, y + 24, 8, 10, 2, "#eef2f7"); caja(x + 22, y + 24, 8, 10, 2, "#eef2f7");
    ctx.restore();
  }
  chip([["40", AMARILLO], ["bañeras por día", "#fff"]], 540, 300, { tam: 42, ...aparece(t, tB) });
  if (t > tP - 0.3) corazon(540, 900, 0.9, late(t));
  chip([["300 g", AMARILLO]], 760, 900, { tam: 40, ...aparece(t, tP) });
};

// "En una vida de ochenta años, son unos tres mil millones de latidos. Y solo descansa un instante entre latido y latido."
ESCENAS.vida = (inf) => {
  const t = inf.t;
  const tO = inf.cuando("ochenta") - 0.2, tT = inf.cuando("tres") - 0.2, tI = inf.cuando("instante") - 0.3;
  chip([["80", AMARILLO], ["años", "#fff"]], 540, 320, { tam: 42, ...aparece(t, tO) });
  const n = Math.round(3000 * entre(t, tT, tT + 1.2));
  texto(`${miles(n)} millones`, 540, 500, { tam: 80, peso: 900, color: ROJO, alfa: entre(t, tT, tT + 0.2) });
  texto("de latidos", 540, 590, { tam: 44, alfa: entre(t, tT, tT + 0.2) });
  if (t > tI) {
    ecg(80, 820, 920, t);
    chip([["Descanso:", "#fff"], ["un instante", VERDE]], 540, 960, { tam: 38, ...aparece(t, tI) });
  }
};

// "Así que mientras veías este video, tu corazón ya latió unas cincuenta veces. Sin pedirte permiso."
ESCENAS.cierre = (inf) => {
  const t = inf.t;
  corazon(540, 600, 2.6, late(t));
  const tC = inf.cuando("cincuenta") - 0.3;
  const n = Math.round(50 * entre(t, tC, tC + 1));
  chip([["Mientras veías:", "#fff"], [`${n} latidos`, AMARILLO]], 540, 300, { tam: 42, ...aparece(t, tC) });
};
