// Escenas de "¿Por qué lloras con la cebolla?". Cebolla en corte, células con dos compartimentos y un ojo grande.

const aparece = (t, t0) => ({ escala: salto((t - t0) / 0.4), alfa: clamp((t - t0) / 0.2) });
const AZUFRE = AMARILLO, ENZIMA = VERDE, GAS = "rgba(200,255,120,";

function cebolla(x, y, r, cortada = 0) {
  ctx.save();
  // capas
  for (let k = 5; k >= 0; k--) {
    const rr = r * (0.35 + k * 0.13);
    ctx.fillStyle = k % 2 ? "#e9d2f0" : "#d6a8e6"; ctx.strokeStyle = "#a66bff"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(x, y, rr, rr * 1.05, 0, 0, 7); ctx.fill(); ctx.stroke();
  }
  // tallito
  ctx.fillStyle = "#a66bff"; ctx.beginPath(); ctx.moveTo(x - 14, y - r * 1.05); ctx.lineTo(x, y - r * 1.4); ctx.lineTo(x + 14, y - r * 1.05); ctx.closePath(); ctx.fill();
  ctx.restore();
  if (cortada > 0) {
    // cuchillo que baja
    const yc = lerp(y - r * 1.6, y + r * 0.2, cortada);
    ctx.save(); ctx.fillStyle = "#dfe6f0"; ctx.beginPath(); ctx.moveTo(x - 20, yc - 160); ctx.lineTo(x + 20, yc - 160); ctx.lineTo(x + 20, yc); ctx.lineTo(x - 20, yc + 40); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#5a3d2b"; ctx.fillRect(x - 24, yc - 300, 48, 140); ctx.restore();
  }
}

function gasNube(x, y, k, t, ancho = 200) {
  if (k <= 0) return;
  for (let j = 0; j < 14; j++) {
    const f = (t * 0.4 + azar(j)) % 1;
    circulo(x + (azar(j + 20) - 0.5) * ancho + Math.sin(t * 2 + j) * 10, y - f * 220, 14 + f * 18, GAS + (0.5 * k * (1 - f)) + ")");
  }
}

// "Una cebolla entera no te hace llorar. Pero apenas la cortas, empieza un pequeño ataque químico."
ESCENAS.hook = (inf) => {
  const t = inf.t;
  const tE = inf.cuando("entera") - 0.3, tC = inf.cuando("cortas") - 0.3, tQ = inf.cuando("quimico") - 0.4;
  const corte = entre(t, tC, tC + 0.6);
  cebolla(540, 720, 200, corte);
  gasNube(540, 560, entre(t, tC + 0.4, tC + 1), t, 300);
  chip("Entera: nada", 540, 300, { tam: 40, ...aparece(t, tE), alfa: clamp((t - tE) / 0.2) * (1 - entre(t, tC, tC + 0.3)) });
  chip([["Cortada:", "#fff"], ["ataque químico", AMARILLO]], 540, 300, { tam: 40, ...aparece(t, tQ) });
};

// una célula con azufre y enzimas separados; abierta = 0 a 1 rompe la pared del medio
function celula(x, y, w, h, abierta, t) {
  caja(x, y, w, h, 26, "rgba(214,168,230,0.18)", "#d6a8e6");
  const mezcla = abierta;
  for (let j = 0; j < 10; j++) {
    const px = lerp(x + 30 + azar(j) * (w / 2 - 60), x + 30 + azar(j + 7) * (w - 60), mezcla) + Math.sin(t * 3 + j) * 4;
    const py = y + 30 + azar(j + 3) * (h - 60);
    circulo(px, py, 11, AZUFRE);
  }
  for (let j = 0; j < 8; j++) {
    const px = lerp(x + w / 2 + 30 + azar(j + 11) * (w / 2 - 60), x + 30 + azar(j + 17) * (w - 60), mezcla) + Math.cos(t * 3 + j) * 4;
    const py = y + 30 + azar(j + 13) * (h - 60);
    ctx.fillStyle = ENZIMA; ctx.fillRect(px - 10, py - 10, 20, 20);
  }
  if (abierta < 1) {
    ctx.save(); ctx.globalAlpha *= 1 - abierta; ctx.strokeStyle = "#d6a8e6"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(x + w / 2, y + 10); ctx.lineTo(x + w / 2, y + h - 10); ctx.stroke(); ctx.restore();
  }
}

// "La cebolla guarda sustancias con azufre dentro de sus células, separadas de unas enzimas."
ESCENAS.celulas = (inf) => {
  const t = inf.t;
  const tA = inf.cuando("azufre") - 0.3, tS = inf.cuando("separadas") - 0.3, tE = inf.cuando("enzimas") - 0.3;
  celula(160, 440, 760, 420, 0, t);
  chip([["Azufre", AZUFRE]], 350, 940, { tam: 36, ...aparece(t, tA) });
  chip([["Enzimas", ENZIMA]], 730, 940, { tam: 36, ...aparece(t, tE) });
  chip("Separados", 540, 300, { tam: 42, ...aparece(t, tS) });
};

// "Cuando el cuchillo rompe las células, todo se mezcla y se forma un gas irritante."
ESCENAS.corte = (inf) => {
  const t = inf.t;
  const tR = inf.cuando("rompe") - 0.3, tM = inf.cuando("mezcla") - 0.3, tG = inf.cuando("gas") - 0.3;
  const ab = entre(t, tR, tM + 0.6);
  celula(160, 520, 760, 400, ab, t);
  // cuchillo que pasa
  const kc = entre(t, tR - 0.2, tR + 0.4);
  if (kc > 0 && kc < 1) { ctx.fillStyle = "#dfe6f0"; ctx.fillRect(520, lerp(380, 900, kc) - 120, 40, 160); }
  gasNube(540, 520, entre(t, tG, tG + 0.6), t, 600);
  chip("Todo se mezcla", 540, 1000, { tam: 34, ...aparece(t, tM) });
  chip([["Gas", VERDE], ["irritante", "#fff"]], 540, 300, { tam: 44, ...aparece(t, tG) });
};

function ojo(x, y, esc, t, lagrima = 0, irritado = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(esc, esc);
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(-200, 0); ctx.quadraticCurveTo(0, -150, 200, 0); ctx.quadraticCurveTo(0, 150, -200, 0); ctx.fill();
  // venitas rojas al irritarse
  if (irritado > 0) { ctx.strokeStyle = `rgba(255,77,94,${irritado})`; ctx.lineWidth = 3; for (let j = 0; j < 6; j++) { const a = j * 1.05; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 170 * 0.9, Math.sin(a) * 50); ctx.lineTo(Math.cos(a) * 90, Math.sin(a) * 30); ctx.stroke(); } }
  circulo(0, 0, 70, "#4e8a5c"); circulo(0, 0, 32, FONDO); circulo(-18, -18, 12, "#fff");
  ctx.restore();
  if (lagrima > 0) {
    for (let j = 0; j < 3; j++) {
      const f = ((t * 0.6 + j / 3) % 1);
      const lx = x + 170 * esc, ly = y + 40 * esc + f * 260;
      ctx.save(); ctx.globalAlpha *= lagrima * (1 - f * 0.6); ctx.fillStyle = CELESTE;
      ctx.beginPath(); ctx.moveTo(lx, ly - 26); ctx.quadraticCurveTo(lx + 18, ly, lx, ly + 14); ctx.quadraticCurveTo(lx - 18, ly, lx, ly - 26); ctx.fill(); ctx.restore();
    }
  }
}

// "Ese gas flota hasta tus ojos y activa unos nervios que avisan: algo me está irritando."
ESCENAS.ojos = (inf) => {
  const t = inf.t;
  const tF = inf.cuando("flota") - 0.3, tN = inf.cuando("nervios") - 0.3, tI = inf.cuando("irritando") - 0.4;
  ojo(560, 520, 1.1, t, 0, entre(t, tI, tI + 0.5));
  // gas que sube desde abajo
  const kg = entre(t, tF, tF + 1);
  for (let j = 0; j < 12; j++) {
    const f = (t * 0.35 + azar(j)) % 1;
    circulo(220 + azar(j + 4) * 640, lerp(980, 620, f), 14 + f * 12, GAS + (0.55 * kg * (1 - f * 0.5)) + ")");
  }
  // nervio con señal que viaja
  const kn = entre(t, tN, tN + 0.4);
  ctx.save(); ctx.globalAlpha *= kn; ctx.strokeStyle = AMARILLO; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(340, 500); ctx.bezierCurveTo(220, 420, 200, 330, 130, 300); ctx.stroke(); ctx.restore();
  if (t > tN) { const f = ((t - tN) * 1.2) % 1; circulo(lerp(340, 130, f), lerp(500, 300, f) - Math.sin(f * 3) * 40, 12, AMARILLO); }
  chip([["Nervios:", "#fff"], ["¡alerta!", AMARILLO]], 700, 300, { tam: 40, ...aparece(t, tN) });
};

// "Los ojos responden con lágrimas, para lavar el gas y sacarlo."
ESCENAS.lagrimas = (inf) => {
  const t = inf.t;
  const tL = inf.cuando("lagrimas") - 0.3, tV = inf.cuando("lavar") - 0.3;
  ojo(540, 520, 1.1, t, entre(t, tL, tL + 0.5), 0.6 * (1 - entre(t, tV, tV + 1.2)));
  chip([["Lágrimas", CELESTE], ["= lavar el gas", "#fff"]], 540, 300, { tam: 40, ...aparece(t, tV) });
};

// "Un truco: un cuchillo bien afilado rompe menos células, y si la cebolla está fría, suelta menos gas."
ESCENAS.trucos = (inf) => {
  const t = inf.t;
  const tA = inf.cuando("afilado") - 0.3, tF = inf.cuando("fria") - 0.3;
  // tarjeta 1: cuchillo afilado
  const k1 = entre(t, tA, tA + 0.5);
  ctx.save(); ctx.globalAlpha *= k1;
  caja(110, 420, 400, 460, 26, "rgba(255,255,255,0.05)", "#5a6390");
  ctx.fillStyle = "#dfe6f0"; ctx.beginPath(); ctx.moveTo(180, 640); ctx.lineTo(440, 600); ctx.lineTo(440, 650); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#5a3d2b"; ctx.fillRect(440, 596, 50, 58);
  texto("Bien afilado", 310, 760, { tam: 38 });
  texto("menos células rotas", 310, 820, { tam: 32, color: AMARILLO });
  ctx.restore();
  // tarjeta 2: cebolla fría
  const k2 = entre(t, tF, tF + 0.5);
  ctx.save(); ctx.globalAlpha *= k2;
  caja(570, 420, 400, 460, 26, "rgba(255,255,255,0.05)", "#5a6390");
  cebolla(770, 600, 80);
  for (let j = 0; j < 6; j++) { const a = j * Math.PI / 3 + t * 0.5; texto("*", 770 + Math.cos(a) * 130, 600 + Math.sin(a) * 130, { tam: 44, color: CELESTE }); }
  texto("Fría", 770, 760, { tam: 38, color: CELESTE });
  texto("menos gas", 770, 820, { tam: 32, color: AMARILLO });
  ctx.restore();
  chip("Trucos", 540, 300, { tam: 44, ...aparece(t, 0.2) });
};

// "Así que no lloras por la cebolla: lloras porque tus ojos se están defendiendo."
ESCENAS.cierre = (inf) => {
  const t = inf.t;
  const tD = inf.cuando("defendiendo") - 0.4;
  ojo(540, 560, 1, t, 1, 0);
  // escudo alrededor del ojo
  const k = entre(t, tD, tD + 0.6);
  ctx.save(); ctx.globalAlpha *= k; ctx.strokeStyle = CELESTE; ctx.lineWidth = 8; ctx.shadowColor = CELESTE; ctx.shadowBlur = 20;
  ctx.beginPath(); ctx.ellipse(540, 560, 290 + Math.sin(t * 4) * 6, 210, 0, 0, 7); ctx.stroke(); ctx.restore();
  chip([["Tus ojos se", "#fff"], ["defienden", AMARILLO]], 540, 300, { tam: 42, ...aparece(t, tD) });
};
