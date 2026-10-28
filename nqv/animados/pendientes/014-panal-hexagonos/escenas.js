// Escenas de "¿Por qué las abejas hacen hexágonos?".

const aparece = (t, t0) => ({ escala: salto((t - t0) / 0.4), alfa: clamp((t - t0) / 0.2) });
const MIEL = "#f2a900", CERA = "#ffd166";

// polígono regular de n lados, radio r, rotado
function poligono(x, y, n, r, rot, relleno, borde, grosor = 4) {
  ctx.beginPath();
  for (let k = 0; k <= n; k++) { const a = rot + k * 2 * Math.PI / n; k ? ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)) : ctx.moveTo(x + r * Math.cos(a), y + r * Math.sin(a)); }
  ctx.closePath();
  if (relleno) { ctx.fillStyle = relleno; ctx.fill(); }
  if (borde) { ctx.strokeStyle = borde; ctx.lineWidth = grosor; ctx.stroke(); }
}

// panal de celdas hexagonales que aparecen de a una (k de 0 a 1)
function panal(cx, cy, r, filas, cols, k, relleno = "rgba(242,169,0,0.85)") {
  const w = Math.sqrt(3) * r;
  let i = 0;
  for (let f = 0; f < filas; f++) for (let c = 0; c < cols; c++, i++) {
    const a = clamp(k * filas * cols - i);
    if (a <= 0) continue;
    const x = cx + (c - (cols - 1) / 2) * w + (f % 2 ? w / 2 : 0), y = cy + (f - (filas - 1) / 2) * 1.5 * r;
    ctx.save(); ctx.globalAlpha *= a;
    poligono(x, y, 6, r * (0.6 + 0.4 * a), Math.PI / 6, relleno, CERA, 5);
    ctx.restore();
  }
}

function abeja(x, y, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = "rgba(220,235,255,0.7)";
  ctx.beginPath(); ctx.ellipse(-8, -22, 14, 22, -0.4, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(10, -22, 14, 22, 0.4, 0, 7); ctx.fill();
  ctx.fillStyle = CERA; ctx.beginPath(); ctx.ellipse(0, 0, 30, 20, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#1b1b1b"; ctx.fillRect(-8, -19, 8, 38); ctx.fillRect(10, -17, 7, 34);
  ctx.restore();
}

// "Las abejas construyen sus panales con hexágonos casi perfectos. Y a los matemáticos les llevó siglos demostrar por qué es la mejor forma."
ESCENAS.hook = (inf) => {
  const t = inf.t;
  const tH = inf.cuando("hexagonos") - 0.5, tM = inf.cuando("matematicos") - 0.3;
  panal(540, 640, 70, 5, 6, entre(t, 0, tH + 0.8));
  abeja(540 + Math.cos(t * 1.5) * 260, 640 + Math.sin(t * 3) * 120, 1.4);
  chip([["Hexágonos", MIEL], ["casi perfectos", "#fff"]], 540, 300, { tam: 40, ...aparece(t, tH) });
  chip([["¿Por qué es", "#fff"], ["la mejor forma?", AMARILLO]], 540, 1000, { tam: 38, ...aparece(t, tM) });
};

// "Las celdas tienen que encajar sin dejar huecos. Los círculos, por ejemplo, desperdician espacio entre ellos."
ESCENAS.circulos = (inf) => {
  const t = inf.t;
  const tC = inf.cuando("circulos") - 0.3, tD = inf.cuando("desperdician") - 0.3;
  chip("Sin huecos", 540, 300, { tam: 42, ...aparece(t, 0.2) });
  const k = entre(t, tC, tC + 0.8);
  for (let f = 0; f < 4; f++) for (let c = 0; c < 5; c++) {
    const i = f * 5 + c, a = clamp(k * 20 - i);
    if (a > 0) circulo(300 + c * 120, 480 + f * 120, 58 * a, "rgba(242,169,0,0.85)", CERA, 4);
  }
  // los huecos marcados en rojo
  if (t > tD) for (let f = 0; f < 3; f++) for (let c = 0; c < 4; c++) {
    const pul = 0.6 + 0.4 * Math.sin(t * 6);
    circulo(360 + c * 120, 540 + f * 120, 16 * pul, ROJO);
  }
  chip([["Huecos =", "#fff"], ["espacio perdido", ROJO]], 540, 1000, { tam: 36, ...aparece(t, tD) });
};

// "Solo tres figuras regulares cubren un plano sin huecos: el triángulo, el cuadrado y el hexágono."
ESCENAS.tres = (inf) => {
  const t = inf.t;
  const tT = inf.cuando("triangulo") - 0.3, tC = inf.cuando("cuadrado") - 0.3, tH = inf.cuando("hexagono") - 0.3;
  chip([["Solo", "#fff"], ["3", AMARILLO], ["figuras", "#fff"]], 540, 300, { tam: 42, ...aparece(t, 0.2) });
  const xs = [220, 540, 860];
  // triángulos
  const kT = Math.max(0.15, entre(t, tT, tT + 0.5));
  for (let j = 0; j < 6; j++) {
    const x = xs[0] - 90 + (j % 3) * 70, y = 600 + Math.floor(j / 3) * 120, rot = j % 2 ? Math.PI / 2 : -Math.PI / 2;
    ctx.save(); ctx.globalAlpha *= kT; poligono(x, y + (j % 2 ? -20 : 20), 3, 70, rot, "rgba(110,210,235,0.6)", CELESTE, 3); ctx.restore();
  }
  // cuadrados
  const kC = Math.max(0.15, entre(t, tC, tC + 0.5));
  for (let j = 0; j < 4; j++) { ctx.save(); ctx.globalAlpha *= kC; caja(xs[1] - 110 + (j % 2) * 110, 540 + Math.floor(j / 2) * 110, 110, 110, 0, "rgba(94,224,138,0.6)", VERDE); ctx.restore(); }
  // hexágonos
  ctx.save(); ctx.globalAlpha *= Math.max(0.15, entre(t, tH, tH + 0.5)); panal(xs[2], 650, 55, 3, 2, 1); ctx.restore();
  texto("triángulo", xs[0], 860, { tam: 32, alfa: kT });
  texto("cuadrado", xs[1], 860, { tam: 32, alfa: kC });
  texto("hexágono", xs[2], 860, { tam: 32, color: MIEL, alfa: entre(t, tH, tH + 0.5) });
};

// "De esas tres, el hexágono es la que encierra más espacio con menos borde. Y menos borde significa menos cera."
ESCENAS.borde = (inf) => {
  const t = inf.t;
  const tE = inf.cuando("espacio") - 0.3, tB = inf.cuando("borde") - 0.3, tC = inf.cuando("cera") - 0.3;
  // misma área, tres perímetros (área = 1: triángulo 4,56; cuadrado 4; hexágono 3,72)
  const figuras = [[3, 220, "4,56", CELESTE], [4, 540, "4,00", VERDE], [6, 860, "3,72", MIEL]];
  const area = 30000;
  for (const [n, x, p, c] of figuras) {
    const r = Math.sqrt(2 * area / (n * Math.sin(2 * Math.PI / n)));
    poligono(x, 600, n, r, n === 4 ? Math.PI / 4 : n === 3 ? -Math.PI / 2 : Math.PI / 6, `${c}55`, c, n === 6 ? 7 : 4);
    texto(p, x, 790, { tam: 44, peso: 900, color: n === 6 ? AMARILLO : "#fff", alfa: entre(t, tB, tB + 0.4) });
  }
  texto("misma superficie", 540, 440, { tam: 32, color: "rgba(255,255,255,0.75)", alfa: entre(t, tE, tE + 0.4) });
  chip([["Menos borde", "#fff"], ["= menos cera", MIEL]], 540, 300, { tam: 40, ...aparece(t, tC) });
  chip("largo del borde", 540, 880, { tam: 32, ...aparece(t, tB + 0.2) });
};

// "Y la cera es cara: para fabricarla, las abejas tienen que comer mucha miel."
ESCENAS.miel = (inf) => {
  const t = inf.t;
  const tC = inf.cuando("cera") - 0.3, tM = inf.cuando("miel") - 0.3;
  // frasco de miel que se vacía y bloque de cera que aparece
  const vacia = entre(t, tC + 0.3, tM + 0.8);
  caja(220, 480, 240, 360, 30, null, "#fff");
  caja(228, 832 - 340 * (1 - vacia * 0.8), 224, 340 * (1 - vacia * 0.8), 24, MIEL);
  texto("miel", 340, 890, { tam: 34 });
  flecha(500, 660, 620, 660, "#fff", 8, entre(t, tC + 0.3, tC + 0.8));
  const kc = entre(t, tC + 0.6, tM + 0.8);
  panal(790, 660, 45, 3, 3, kc, CERA);
  texto("cera", 790, 890, { tam: 34, alfa: kc });
  chip([["La cera es", "#fff"], ["cara", ROJO]], 540, 300, { tam: 42, ...aparece(t, tC) });
};

// "Se sospechaba desde la antigua Grecia, pero recién en mil novecientos noventa y nueve el matemático Thomas Hales lo demostró."
ESCENAS.prueba = (inf) => {
  const t = inf.t;
  const tG = inf.cuando("grecia") - 0.3, tA = inf.cuando("mil") - 0.2, tH = inf.cuando("hales") - 0.3;
  // línea de tiempo
  ctx.save(); ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(140, 640); ctx.lineTo(140 + 800 * entre(t, 0.1, tA), 640); ctx.stroke(); ctx.restore();
  circulo(160, 640, 16, CELESTE, "#fff", 3);
  chip("Antigua Grecia", 300, 520, { tam: 36, color: CELESTE, ...aparece(t, tG) });
  texto("se sospecha", 300, 740, { tam: 30, alfa: entre(t, tG, tG + 0.4) });
  const kA = entre(t, tA, tA + 0.4);
  if (kA > 0) circulo(920, 640, 16, AMARILLO, "#fff", 3);
  chip("1999", 800, 520, { tam: 44, color: AMARILLO, ...aparece(t, tA) });
  chip([["Thomas Hales:", "#fff"], ["demostrado", VERDE]], 640, 800, { tam: 36, ...aparece(t, tH) });
};

// "Así que el panal no es solo bonito: es la forma más económica de guardar miel."
ESCENAS.cierre = (inf) => {
  const t = inf.t;
  panal(540, 650, 70, 5, 6, 1);
  abeja(540 + Math.cos(t * 1.5) * 260, 650 + Math.sin(t * 3) * 120, 1.4);
  const tE = inf.cuando("economica") - 0.3;
  chip([["La forma", "#fff"], ["más económica", MIEL]], 540, 300, { tam: 42, ...aparece(t, tE) });
};
