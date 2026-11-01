// Escenas de "¿Cuántas Tierras caben en el Sol?". El Sol grande a la izquierda, Tierras chiquitas en azul.

const aparece = (t, t0) => ({ escala: salto((t - t0) / 0.4), alfa: clamp((t - t0) / 0.2) });
const miles = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

function tierra(x, y, r) {
  circulo(x, y, r, AZUL);
  if (r > 6) { ctx.fillStyle = VERDE; ctx.beginPath(); ctx.ellipse(x - r * 0.25, y - r * 0.15, r * 0.4, r * 0.28, 0.5, 0, 7); ctx.fill(); }
}

function solGrande(x, y, r, t) {
  ctx.save();
  const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
  g.addColorStop(0, "#fff3b0"); g.addColorStop(0.7, "#ffb347"); g.addColorStop(1, "#ff7a45");
  ctx.shadowColor = "#ffb347"; ctx.shadowBlur = 50;
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * (1 + Math.sin(t * 2) * 0.008), 0, 7); ctx.fill();
  ctx.restore();
}

// "Dentro del Sol cabrían más de un millón de Tierras. Y no es una exageración."
ESCENAS.hook = (inf) => {
  const t = inf.t;
  const tM = inf.cuando("millon") - 0.3;
  solGrande(540, 690, 330, t);
  // Tierras que entran al Sol de a montones
  const k = entre(t, 0.2, tM + 1.2);
  for (let j = 0; j < 260 * k; j++) {
    const a = azar(j) * 2 * Math.PI, d = Math.sqrt(azar(j + 300)) * 300;
    tierra(540 + Math.cos(a) * d, 690 + Math.sin(a) * d, 7);
  }
  chip([["Más de", "#fff"], ["1 millón", AMARILLO], ["de Tierras", "#fff"]], 540, 300, { tam: 42, ...aparece(t, tM) });
};

// "Si pones Tierras en fila de un lado al otro del Sol, necesitas unas ciento nueve."
ESCENAS.fila = (inf) => {
  const t = inf.t;
  const tF = inf.cuando("fila") - 0.3, tC = inf.cuando("ciento") - 0.3;
  const R = 360, cy = 660;
  solGrande(540, cy, R, t);
  // fila de 109 Tierras a lo ancho del diámetro (880 px / 109 ≈ 8 px cada una)
  const n = Math.floor(109 * entre(t, tF, tC + 0.4));
  for (let j = 0; j < n; j++) tierra(540 - R + 4 + j * (2 * R / 109), cy, 3.2);
  const cuenta = Math.min(109, n);
  chip([["Tierras en fila:", "#fff"], [String(cuenta), AMARILLO]], 540, 300, { tam: 42, alfa: clamp((t - tF) / 0.3) });
  // la Tierra en grande para comparar
  tierra(110, 960, 14);
  texto("Tierra", 110, 1005, { tam: 26, color: CELESTE });
};

// "Pero el Sol no es una línea: es una esfera. Y el espacio de adentro crece mucho más rápido que el ancho."
ESCENAS.esfera = (inf) => {
  const t = inf.t;
  const tE = inf.cuando("esfera") - 0.3, tR = inf.cuando("rapido") - 0.3;
  // tres cubos: ancho 1, 2, 3 -> volumen 1, 8, 27
  const ks = [entre(t, 0.2, 0.7), entre(t, tE, tE + 0.6), entre(t, tE + 0.6, tE + 1.2)];
  const lados = [80, 160, 240], xs = [190, 440, 770];
  lados.forEach((L, j) => {
    const k = ks[j]; if (k <= 0) return;
    ctx.save(); ctx.globalAlpha *= k;
    const x = xs[j] - L / 2, y = 760 - L, d = L * 0.4;
    ctx.fillStyle = "#ffb347"; ctx.fillRect(x, y, L, L);
    ctx.fillStyle = "#ffd98a"; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + d, y - d); ctx.lineTo(x + L + d, y - d); ctx.lineTo(x + L, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#ff7a45"; ctx.beginPath(); ctx.moveTo(x + L, y); ctx.lineTo(x + L + d, y - d); ctx.lineTo(x + L + d, y + L - d); ctx.lineTo(x + L, y + L); ctx.closePath(); ctx.fill();
    texto(`ancho ${j + 1}`, xs[j], 820, { tam: 36 });
    ctx.restore();
  });
  const kr = entre(t, tR, tR + 0.5);
  ["1", "8", "27"].forEach((v, j) => texto(`espacio ${v}`, xs[j], 885, { tam: 40, color: AMARILLO, alfa: kr }));
  chip([["El Sol es una", "#fff"], ["esfera", NARANJA]], 540, 300, { tam: 42, ...aparece(t, tE) });
  chip("El espacio crece más rápido", 540, 990, { tam: 34, ...aparece(t, tR) });
};

// "Ciento nueve por ciento nueve por ciento nueve da más de un millón. Por eso cabrían unas un millón trescientas mil Tierras."
ESCENAS.cuenta = (inf) => {
  const t = inf.t;
  const tD = inf.cuando("da") - 0.3, tT = inf.cuando("trescientas") - 0.6;
  const k1 = entre(t, 0, 0.5), k2 = entre(t, 0.8, 1.3), k3 = entre(t, 1.6, 2.1);
  texto("109", 260, 520, { tam: 90, color: AMARILLO, alfa: k1 });
  texto("x", 400, 520, { tam: 70, alfa: k2 });
  texto("109", 540, 520, { tam: 90, color: AMARILLO, alfa: k2 });
  texto("x", 680, 520, { tam: 70, alfa: k3 });
  texto("109", 820, 520, { tam: 90, color: AMARILLO, alfa: k3 });
  // contador que sube hasta 1.295.029 y luego redondea
  const kc = entre(t, tD, tD + 1.2);
  const valor = Math.round(1295029 * kc);
  texto("= " + miles(valor), 540, 680, { tam: 80, color: "#fff", alfa: clamp(kc * 4) });
  chip([["Unas", "#fff"], ["1.300.000", AMARILLO], ["Tierras", "#fff"]], 540, 860, { tam: 44, ...aparece(t, tT) });
};

// "Y además pesa muchísimo: el Sol tiene casi toda la masa del sistema solar, el noventa y nueve coma ocho por ciento."
ESCENAS.masa = (inf) => {
  const t = inf.t;
  const tM = inf.cuando("masa") - 0.3, tN = inf.cuando("noventa") - 0.3;
  // barra de masa: casi toda naranja, una rayita azul
  const k = entre(t, tM, tN + 0.8);
  const x = 120, y = 560, w = 840, h = 110;
  caja(x, y, w, h, 18, "rgba(255,255,255,0.08)", "#fff");
  caja(x + 4, y + 4, (w - 8) * 0.998 * k, h - 8, 14, "#ffb347");
  if (k > 0.99) caja(x + w - 8, y + 4, 4, h - 8, 2, AZUL);
  texto("Sol", x + 60, y + h / 2, { tam: 40, color: FONDO, alfa: clamp(k * 3), alinear: "left" });
  const kn = entre(t, tN, tN + 0.5);
  texto("99,8 %", 540, 470, { tam: 90, color: AMARILLO, alfa: kn });
  flecha(930, 820, 955, 690, AZUL, 5, kn);
  chip("Todo lo demás", 760, 860, { tam: 32, color: AZUL, ...aparece(t, tN + 0.6) });
  chip([["Masa del", "#fff"], ["sistema solar", NARANJA]], 540, 300, { tam: 40, ...aparece(t, tM) });
};

// "Todos los planetas, lunas y asteroides juntos son apenas el resto."
ESCENAS.resto = (inf) => {
  const t = inf.t;
  const tP = inf.cuando("planetas") - 0.3, tA = inf.cuando("asteroides") - 0.3, tR = inf.cuando("resto") - 0.3;
  // los planetas en fila, chiquitos
  const pl = [[4, "#bbb"], [9, "#e8c27a"], [10, AZUL], [6, ROJO], [40, "#e0b080"], [34, "#e8d39a"], [20, "#9be0e8"], [19, "#5b6cff"]];
  let x = 140;
  pl.forEach(([r, c], j) => {
    const k = entre(t, tP + j * 0.12, tP + j * 0.12 + 0.4);
    circulo(x + r * 1.6, 620, r * 1.6 * k, c);
    x += r * 3.2 + 30;
  });
  if (t > tA) for (let j = 0; j < 40; j++) circulo(140 + azar(j) * 800, 780 + azar(j + 50) * 60, 6, "#c9b9a0");
  chip([["Planetas, lunas", "#fff"], ["y asteroides", "#fff"]], 540, 300, { tam: 40, ...aparece(t, tP) });
  chip([["= el", "#fff"], ["0,2 %", AMARILLO]], 540, 940, { tam: 44, ...aparece(t, tR) });
};

// "Así que, al lado del Sol, la Tierra es un granito de arena flotando junto a una pelota de playa."
ESCENAS.cierre = (inf) => {
  const t = inf.t;
  const tG = inf.cuando("granito") - 0.3, tP = inf.cuando("pelota") - 0.3;
  const kp = entre(t, tP, tP + 0.6);
  solGrande(620, 660, 320, t);
  // la pelota de playa: franjas sobre el Sol
  if (kp > 0) {
    ctx.save(); ctx.globalAlpha *= kp; ctx.beginPath(); ctx.arc(620, 660, 320, 0, 7); ctx.clip();
    [ROJO, "#fff", AZUL, AMARILLO, "#fff", VERDE].forEach((c, j) => {
      ctx.fillStyle = c; ctx.globalAlpha = kp * 0.35;
      ctx.beginPath(); ctx.moveTo(620, 340); ctx.quadraticCurveTo(300 + j * 130, 660, 620, 980); ctx.quadraticCurveTo(360 + j * 130, 660, 620, 340); ctx.fill();
    });
    ctx.restore();
  }
  const kg = entre(t, tG, tG + 0.5);
  tierra(170, 660, 4 * kg + 0.01);
  flecha(170, 760, 170, 680, CELESTE, 5, kg);
  texto("Tierra", 170, 800, { tam: 32, color: CELESTE, alfa: kg });
  chip([["Granito de arena", "#fff"], ["vs", "#9aa3c7"], ["pelota de playa", AMARILLO]], 540, 300, { tam: 36, ...aparece(t, tP) });
};
