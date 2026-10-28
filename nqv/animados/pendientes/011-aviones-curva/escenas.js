// Escenas de "¿Por qué los aviones vuelan en curva?". Mapa plano esquemático (dibujo no a escala).

const aparece = (t, t0) => ({ escala: salto((t - t0) / 0.4), alfa: clamp((t - t0) / 0.2) });
const MAR = "#16305e", TIERRA = "#3fae6a";

// mapa plano con grilla; "estira" separa las líneas cerca de los polos
function mapa(x, y, w, h, estira = 1) {
  caja(x, y, w, h, 16, MAR, "#8fc2ff");
  ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, 16); ctx.clip();
  ctx.fillStyle = TIERRA;
  ctx.beginPath(); ctx.ellipse(x + w * 0.22, y + h * 0.42, w * 0.13, h * 0.24, 0.2, 0, 7); ctx.fill();   // América
  ctx.beginPath(); ctx.ellipse(x + w * 0.4, y + h * 0.16, w * 0.06, h * 0.08 * estira, 0, 0, 7); ctx.fill(); // Groenlandia
  ctx.beginPath(); ctx.ellipse(x + w * 0.66, y + h * 0.38, w * 0.15, h * 0.2, -0.2, 0, 7); ctx.fill();   // Europa y Asia
  ctx.beginPath(); ctx.ellipse(x + w * 0.58, y + h * 0.7, w * 0.08, h * 0.17, 0.1, 0, 7); ctx.fill();     // África
  ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 2;
  for (let k = 1; k < 6; k++) { const yy = y + h / 2 + Math.sign(k - 3) * Math.pow(Math.abs(k - 3) / 3, estira) * h / 2; ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke(); }
  for (let k = 1; k < 8; k++) { ctx.beginPath(); ctx.moveTo(x + k * w / 8, y); ctx.lineTo(x + k * w / 8, y + h); ctx.stroke(); }
  ctx.restore();
}

// curva de A a B que se levanta "alto" px hacia el norte; k = cuánto se dibujó
function curva(ax, ay, bx, by, alto, color, k, grosor = 7) {
  if (k <= 0) return;
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = grosor; ctx.lineCap = "round"; ctx.shadowColor = color; ctx.shadowBlur = 12;
  ctx.beginPath();
  for (let s = 0; s <= k + 1e-6; s += 0.02) {
    const x = lerp(ax, bx, s), y = lerp(ay, by, s) - Math.sin(Math.PI * s) * alto;
    s === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke(); ctx.restore();
}

function avion(x, y, ang, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s); ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.ellipse(0, 0, 30, 7, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(-10, -26); ctx.lineTo(-2, -26); ctx.lineTo(14, 0); ctx.lineTo(-2, 26); ctx.lineTo(-10, 26); ctx.closePath(); ctx.fill();
  ctx.restore();
}

const NY = [300, 650], MAD = [680, 680];

// "En el mapa, el vuelo de Madrid a Nueva York hace una curva rara hacia el norte. Y aun así es el camino más corto."
ESCENAS.hook = (inf) => {
  const t = inf.t;
  mapa(80, 400, 920, 560);
  const tC = inf.cuando("curva") - 0.4, tM = inf.cuando("corto") - 0.3;
  circulo(NY[0], NY[1], 12, AMARILLO); texto("Nueva York", NY[0], NY[1] + 40, { tam: 30 });
  circulo(MAD[0], MAD[1], 12, AMARILLO); texto("Madrid", MAD[0], MAD[1] + 40, { tam: 30 });
  const k = entre(t, tC, tC + 1.2);
  curva(MAD[0], MAD[1], NY[0], NY[1], 130, AMARILLO, k);
  if (k > 0 && k < 1) {
    const s = k, x = lerp(MAD[0], NY[0], s), y = lerp(MAD[1], NY[1], s) - Math.sin(Math.PI * s) * 130;
    avion(x, y, Math.PI + Math.atan(Math.cos(Math.PI * s) * 130 * Math.PI / (MAD[0] - NY[0])), 1);
  }
  chip([["¿Curva?", "#fff"], ["Es lo más corto", AMARILLO]], 540, 300, { tam: 40, ...aparece(t, tM) });
};

// "El problema es el mapa. La Tierra es una esfera, y para aplanarla en un papel hay que estirarla, sobre todo cerca de los polos."
ESCENAS.mapa = (inf) => {
  const t = inf.t;
  const tE = inf.cuando("esfera") - 0.3, tA = inf.cuando("aplanarla") - 0.2, tP = inf.cuando("polos") - 0.3;
  const k = entre(t, tA, tA + 1.2);
  // globo que se convierte en mapa
  if (k < 1) {
    ctx.save(); ctx.globalAlpha *= 1 - k;
    circulo(540, 640, 260, MAR, "#8fc2ff", 3);
    ctx.save(); ctx.beginPath(); ctx.arc(540, 640, 260, 0, 7); ctx.clip();
    ctx.strokeStyle = "rgba(255,255,255,0.2)"; ctx.lineWidth = 2;
    for (let j = -2; j <= 2; j++) { ctx.beginPath(); ctx.ellipse(540, 640, Math.abs(j) * 60 + 1, 260, 0, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(280, 640 + j * 100); ctx.lineTo(800, 640 + j * 100); ctx.stroke(); }
    ctx.restore(); ctx.restore();
  }
  if (k > 0) { ctx.save(); ctx.globalAlpha *= k; mapa(80, 400, 920, 520, lerp(1, 0.45, entre(t, tP, tP + 0.8))); ctx.restore(); }
  chip("Esfera", 540, 300, { tam: 40, ...aparece(t, tE) });
  for (const yy of [430, 890]) flecha(540, yy + (yy < 600 ? 50 : -50), 540, yy + (yy < 600 ? -10 : 10), ROJO, 7, entre(t, tP, tP + 0.4));
  chip([["Estirado cerca de", "#fff"], ["los polos", ROJO]], 540, 1000, { tam: 36, ...aparece(t, tP) });
};

// "Sobre una esfera, el camino más corto entre dos puntos es un arco del círculo más grande que puedes dibujar alrededor de ella."
ESCENAS.esfera = (inf) => {
  const t = inf.t;
  const tA = inf.cuando("arco") - 0.3, tG = inf.cuando("grande") - 0.3;
  circulo(540, 640, 300, MAR, "#8fc2ff", 3);
  // círculo máximo inclinado, que se dibuja completo
  const kG = entre(t, tG, tG + 1);
  ctx.save(); ctx.strokeStyle = "rgba(110,210,235,0.7)"; ctx.lineWidth = 4; ctx.setLineDash([12, 10]);
  ctx.beginPath(); ctx.ellipse(540, 640, 300, 110, -0.35, 0, 2 * Math.PI * kG); ctx.stroke(); ctx.restore();
  // puntos y el arco corto entre ellos
  const p = a => [540 + Math.cos(a) * 300 * Math.cos(-0.35) - Math.sin(a) * 110 * Math.sin(-0.35), 640 + Math.cos(a) * 300 * Math.sin(-0.35) + Math.sin(a) * 110 * Math.cos(-0.35)];
  const a0 = Math.PI * 1.15, a1 = Math.PI * 1.75;
  const kA = entre(t, tA, tA + 0.8);
  ctx.save(); ctx.strokeStyle = AMARILLO; ctx.lineWidth = 9; ctx.lineCap = "round"; ctx.shadowColor = AMARILLO; ctx.shadowBlur = 12;
  ctx.beginPath(); ctx.ellipse(540, 640, 300, 110, -0.35, a0, lerp(a0, a1, kA)); ctx.stroke(); ctx.restore();
  for (const a of [a0, a1]) { const [x, y] = p(a); circulo(x, y, 14, AMARILLO, "#fff", 3); }
  chip([["Camino más corto:", "#fff"], ["arco", AMARILLO]], 540, 300, { tam: 38, ...aparece(t, tA) });
  chip([["del círculo", "#fff"], ["más grande", CELESTE]], 540, 1000, { tam: 36, ...aparece(t, tG) });
};

// "Puedes comprobarlo con un globo terráqueo y un hilo: estíralo bien tenso entre dos ciudades y verás que pasa más al norte."
ESCENAS.hilo = (inf) => {
  const t = inf.t;
  const tH = inf.cuando("hilo") - 0.2, tT = inf.cuando("tenso") - 0.3, tN = inf.cuando("norte") - 0.3;
  circulo(540, 660, 300, MAR, "#8fc2ff", 3);
  ctx.save(); ctx.beginPath(); ctx.arc(540, 660, 300, 0, 7); ctx.clip();
  ctx.fillStyle = TIERRA;
  ctx.beginPath(); ctx.ellipse(360, 640, 90, 150, 0.2, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(720, 620, 110, 140, -0.2, 0, 7); ctx.fill();
  ctx.restore();
  const A = [400, 690], B = [700, 700];
  circulo(A[0], A[1], 12, AMARILLO); circulo(B[0], B[1], 12, AMARILLO);
  // el hilo: primero flojo, después tenso y curvado hacia el norte (arriba)
  const kT = entre(t, tT, tT + 0.8);
  const comba = lerp(-60, 120, kT);
  if (t > tH) {
    ctx.save(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.quadraticCurveTo(550, lerp(A[1], B[1], 0.5) - comba * 2, B[0], B[1]); ctx.stroke(); ctx.restore();
  }
  chip("Globo + hilo", 540, 300, { tam: 40, ...aparece(t, tH) });
  flecha(550, 520, 550, 430, AMARILLO, 8, entre(t, tN, tN + 0.4));
  chip([["Pasa más al", "#fff"], ["norte", AMARILLO]], 540, 1010, { tam: 38, ...aparece(t, tN) });
};

// "Al pasar esa ruta al mapa plano, se ve torcida. Por eso muchos vuelos de Europa a Estados Unidos pasan cerca de Groenlandia."
ESCENAS.ruta = (inf) => {
  const t = inf.t;
  mapa(80, 400, 920, 560);
  const tT = inf.cuando("torcida") - 0.4, tG = inf.cuando("groenlandia") - 0.4;
  const A = [700, 640], B = [210, 620];
  circulo(A[0], A[1], 12, AMARILLO); circulo(B[0], B[1], 12, AMARILLO);
  ctx.save(); ctx.setLineDash([12, 12]); ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); ctx.restore();
  const k = entre(t, tT - 0.6, tT + 0.8);
  curva(A[0], A[1], B[0], B[1], 190, AMARILLO, k);
  texto("línea recta del mapa", 450, 690, { tam: 26, color: "rgba(255,255,255,0.7)" });
  chip("Groenlandia", 448, 330, { tam: 38, color: TIERRA, ...aparece(t, tG) });
  texto("dibujo no a escala", 540, 1010, { tam: 26, color: "rgba(255,255,255,0.6)" });
};

// "Así que el avión sí va derecho. El que se tuerce es el mapa."
ESCENAS.cierre = (inf) => {
  const t = inf.t;
  mapa(80, 400, 920, 560);
  const k = (t * 0.25) % 1;
  curva(700, 680, 300, 650, 140, AMARILLO, 1, 5);
  const x = lerp(700, 300, k), y = lerp(680, 650, k) - Math.sin(Math.PI * k) * 140;
  avion(x, y, Math.PI + Math.atan(Math.cos(Math.PI * k) * 140 * Math.PI / 400), 1.1);
  const tM = inf.cuando("mapa") - 0.3;
  chip([["Se tuerce", "#fff"], ["el mapa", AMARILLO]], 540, 300, { tam: 44, ...aparece(t, tM) });
};
