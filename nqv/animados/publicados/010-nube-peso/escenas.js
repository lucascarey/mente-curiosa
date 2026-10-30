// Escenas de "¿Cuánto pesa una nube?".

const aparece = (t, t0) => ({ escala: salto((t - t0) / 0.4), alfa: clamp((t - t0) / 0.2) });
const CIELO = "#1c3566";

// nube esponjosa centrada en x,y, de ancho w
function nube(x, y, w, alfa = 1, color = "#f2f5fb") {
  ctx.save(); ctx.globalAlpha *= alfa; ctx.fillStyle = color;
  const bolas = [[-0.35, 0.1, 0.22], [-0.12, -0.12, 0.28], [0.15, -0.05, 0.25], [0.36, 0.12, 0.2], [0, 0.15, 0.3]];
  for (const [dx, dy, r] of bolas) { ctx.beginPath(); ctx.arc(x + dx * w, y + dy * w, r * w, 0, 7); ctx.fill(); }
  ctx.restore();
}

function elefante(x, y, s, alfa = 1) {
  ctx.save(); ctx.globalAlpha *= alfa; ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = "#9aa6b8";
  ctx.beginPath(); ctx.ellipse(0, 0, 40, 26, 0, 0, 7); ctx.fill();               // cuerpo
  ctx.beginPath(); ctx.arc(38, -10, 18, 0, 7); ctx.fill();                       // cabeza
  ctx.fillRect(48, -4, 8, 30);                                                   // trompa
  for (const px of [-28, -10, 10, 26]) ctx.fillRect(px, 14, 10, 22);             // patas
  ctx.restore();
}

// "Una nube común, de esas blancas y esponjosas, pesa unas quinientas toneladas. Lo mismo que unos cien elefantes."
ESCENAS.hook = (inf) => {
  const t = inf.t;
  const tQ = inf.cuando("quinientas") - 0.2, tE = inf.cuando("elefantes") - 0.4;
  nube(540 + Math.sin(t * 0.6) * 20, 450, 440);
  const n = Math.round(500 * entre(t, tQ, tQ + 1));
  chip([[`${n}`, AMARILLO], ["toneladas", "#fff"]], 540, 300, { tam: 48, ...aparece(t, tQ) });
  // 100 elefantes en 5 filas de 20
  for (let k = 0; k < 100; k++) {
    const a = entre(t, tE + k * 0.012, tE + 0.25 + k * 0.012);
    if (a > 0) elefante(110 + (k % 20) * 45, 720 + Math.floor(k / 20) * 52, 0.48, a);
  }
  chip([["=", "#fff"], ["100 elefantes", AMARILLO]], 540, 1000, { tam: 38, ...aparece(t, tE + 0.6) });
};

// "Una nube de este tipo puede medir un kilómetro de ancho, de largo y de alto. Es un cubo de mil millones de metros cúbicos."
ESCENAS.cubo = (inf) => {
  const t = inf.t;
  const tA = inf.cuando("ancho") - 0.2, tL = inf.cuando("largo") - 0.2, tH = inf.cuando("alto") - 0.2, tC = inf.cuando("cubo") - 0.3;
  nube(540, 620, 520, 0.35);
  // cubo en perspectiva que se dibuja arista por arista
  const x = 330, y = 760, L = 360, d = 140;
  ctx.save(); ctx.strokeStyle = CELESTE; ctx.lineWidth = 6; ctx.lineCap = "round";
  const linea = (x0, y0, x1, y1, k) => { if (k <= 0) return; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(lerp(x0, x1, k), lerp(y0, y1, k)); ctx.stroke(); };
  const kA = entre(t, tA, tA + 0.4), kL = entre(t, tL, tL + 0.4), kH = entre(t, tH, tH + 0.4);
  linea(x, y, x + L, y, kA);
  linea(x + L, y, x + L + d, y - d, kL); linea(x, y, x + d, y - d, kL);
  linea(x, y, x, y - L, kH); linea(x + L, y, x + L, y - L, kH); linea(x + L + d, y - d, x + L + d, y - L - d, kH);
  linea(x, y - L, x + L, y - L, kH); linea(x, y - L, x + d, y - L - d, kH); linea(x + L, y - L, x + L + d, y - L - d, kH); linea(x + d, y - L - d, x + L + d, y - L - d, kH);
  ctx.restore();
  texto("1 km", x + L / 2, y + 40, { tam: 36, alfa: kA });
  texto("1 km", x + L + d / 2 + 60, y - d / 2 + 10, { tam: 36, alfa: kL });
  texto("1 km", x - 70, y - L / 2, { tam: 36, alfa: kH });
  chip([["1.000.000.000", AMARILLO], ["m³", "#fff"]], 540, 300, { tam: 42, ...aparece(t, tC) });
};

// "En cada metro cúbico hay apenas medio gramo de agua, en gotitas diminutas. Pero multiplica eso por mil millones."
ESCENAS.gramos = (inf) => {
  const t = inf.t;
  const tG = inf.cuando("medio") - 0.2, tM = inf.cuando("multiplica") - 0.2;
  const sale = entre(t, tM, tM + 0.5);
  // un metro cúbico con gotitas
  ctx.save(); ctx.globalAlpha *= 1 - sale;
  caja(340, 440, 400, 400, 16, "rgba(110,210,235,0.08)", CELESTE);
  for (let k = 0; k < 40; k++) circulo(370 + azar(k) * 340, 470 + ((azar(k + 40) * 340 + t * 15) % 340), 3, "rgba(255,255,255,0.8)");
  texto("1 m³", 540, 880, { tam: 36 });
  chip([["0,5 g", AMARILLO], ["de agua", "#fff"]], 540, 330, { tam: 42, ...aparece(t, tG) });
  ctx.restore();
  if (sale > 0) {
    ctx.save(); ctx.globalAlpha *= sale;
    texto("0,5 g × 1.000.000.000", 540, 520, { tam: 52, peso: 800 });
    const n = Math.round(500 * entre(t, tM + 0.5, tM + 1.6));
    texto(`= ${n} toneladas`, 540, 660, { tam: 70, peso: 900, color: AMARILLO });
    ctx.restore();
  }
};

// "Cada gotita es tan pequeña que cae lentísimo, y el aire tibio que sube desde el suelo alcanza para sostenerla."
ESCENAS.gotitas = (inf) => {
  const t = inf.t;
  const tL = inf.cuando("lentisimo") - 0.3, tA = inf.cuando("aire") - 0.2;
  // gotita ampliada
  circulo(330, 520 + Math.sin(t * 1.5) * 10, 70, "rgba(110,210,235,0.85)", "#fff", 3);
  texto("gotita de nube", 330, 640, { tam: 32 });
  texto("(ampliada)", 330, 685, { tam: 26, color: "rgba(255,255,255,0.6)" });
  // gota de lluvia que cae rápido, para comparar
  const yl = 380 + ((t * 300) % 500);
  ctx.save(); ctx.fillStyle = AZUL; ctx.beginPath(); ctx.ellipse(780, yl, 16, 22, 0, 0, 7); ctx.fill(); ctx.restore();
  texto("gota de lluvia", 780, 930, { tam: 30, alfa: 0.8 });
  chip([["Cae", "#fff"], ["lentísimo", CELESTE]], 330, 320, { tam: 40, ...aparece(t, tL) });
  // aire tibio que sube
  for (let k = 0; k < 4; k++) flecha(230 + k * 65, 1000, 230 + k * 65, 760, NARANJA, 7, entre(t, tA + k * 0.08, tA + 0.5 + k * 0.08));
  chip("aire tibio", 330, 1010, { tam: 34, color: NARANJA, ...aparece(t, tA + 0.3) });
};

// "Además, el aire que ocupa ese mismo espacio pesa más de un millón de toneladas. Al lado de eso, el agua de la nube es casi nada."
ESCENAS.aire = (inf) => {
  const t = inf.t;
  const tM = inf.cuando("millon") - 0.3, tC = inf.cuando("casi") - 0.2;
  // dos barras: aire (enorme) y agua de la nube (500 t ≈ 0,04 % del aire)
  const kA = entre(t, tM, tM + 0.9);
  if (kA > 0) caja(200, 1000 - 520 * kA, 260, 520 * kA, 14, "rgba(110,210,235,0.35)", CELESTE);
  texto("aire", 330, 1000 - 520 * kA - 40, { tam: 36, alfa: kA });
  caja(620, 996, 260, 4, 2, AMARILLO);
  texto("agua de la nube", 750, 950, { tam: 32, alfa: entre(t, tC, tC + 0.4) });
  chip([["Aire:", "#fff"], ["+1.000.000 t", CELESTE]], 540, 300, { tam: 40, ...aparece(t, tM) });
  chip([["Agua:", "#fff"], ["500 t", AMARILLO]], 750, 860, { tam: 38, ...aparece(t, tC) });
};

// "Así que las nubes no flotan porque no pesen: flotan porque su peso está repartido en gotitas diminutas dentro de un montón de aire."
ESCENAS.cierre = (inf) => {
  const t = inf.t;
  nube(540 + Math.sin(t * 0.6) * 20, 600, 560);
  for (let k = 0; k < 30; k++) circulo(330 + azar(k) * 420, 540 + azar(k + 30) * 160 + Math.sin(t * 2 + k) * 4, 4, CELESTE);
  const tR = inf.cuando("repartido") - 0.2;
  chip([["Peso", "#fff"], ["repartido", CELESTE]], 540, 300, { tam: 44, ...aparece(t, tR) });
};
