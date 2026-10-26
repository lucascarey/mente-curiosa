// Escenas de "¿Por qué flota el hielo?".

const AGUA = "#3f8cff", HIELO = "#bfeaff";

// molécula de agua: oxígeno rojo y dos hidrógenos blancos en V (104,5°), apuntando hacia "ang"
function agua(x, y, s = 1, ang = Math.PI / 2, alfa = 1) {
  ctx.save(); ctx.globalAlpha *= alfa;
  const abre = 104.5 / 2 * Math.PI / 180;
  for (const d of [-abre, abre]) circulo(x + Math.cos(ang + d) * 22 * s, y + Math.sin(ang + d) * 22 * s, 10 * s, "#f2f5ff", "rgba(0,0,0,0.35)", 2);
  circulo(x, y, 15 * s, "#ff5a5a", "rgba(0,0,0,0.35)", 2);
  ctx.restore();
}

function vaso(x, nivel, liquido = AGUA) {
  const w = 270, y0 = 470, y1 = 880;
  ctx.save();
  ctx.beginPath(); ctx.roundRect(x - w / 2, nivel, w, y1 - nivel, [0, 0, 26, 26]); ctx.fillStyle = liquido; ctx.globalAlpha = 0.45; ctx.fill();
  ctx.restore();
  ctx.save(); ctx.strokeStyle = "rgba(220,235,255,0.9)"; ctx.lineWidth = 6; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(x - w / 2, y0); ctx.lineTo(x - w / 2, y1 - 26); ctx.quadraticCurveTo(x - w / 2, y1, x - w / 2 + 26, y1);
  ctx.lineTo(x + w / 2 - 26, y1); ctx.quadraticCurveTo(x + w / 2, y1, x + w / 2, y1 - 26); ctx.lineTo(x + w / 2, y0); ctx.stroke();
  ctx.restore();
}

// "Si congelas casi cualquier líquido, el sólido se hunde. El agua hace todo al revés: el hielo flota."
ESCENAS.vasos = (inf) => {
  const t = inf.t;
  estrellas(0.5);
  const nivel = 560;
  vaso(300, nivel, "#c08a3e");
  vaso(780, nivel);
  texto("Casi todo", 300, 400, { tam: 42, peso: 800, alfa: entre(t, 0, 0.4) });
  texto("Agua", 780, 400, { tam: 42, peso: 800, color: AGUA, alfa: entre(t, 0, 0.4) });
  const tH = inf.cuando("hunde") - 0.4;
  const y = lerp(nivel - 40, 790, entre(t, tH, tH + 1.0));
  caja(300 - 60, y - 45, 120, 90, 14, "#e0a95a", "#fff3d6");
  const tF = inf.cuando("hielo") - 0.3;
  const kf = entre(t, tF - 0.6, tF);
  if (kf > 0) {
    const yf = nivel - 20 + Math.sin(t * 3) * 6;
    ctx.save(); ctx.globalAlpha *= kf;
    caja(780 - 60, lerp(400, yf - 45, kf), 120, 90, 14, HIELO, "#fff");
    ctx.restore();
  }
  chip("Se hunde", 300, 950, { tam: 40, color: "#e0a95a", escala: salto((t - tH - 0.6) / 0.4), alfa: clamp((t - tH - 0.6) / 0.2) });
  const tFl = inf.cuando("flota");
  chip("¡Flota!", 780, 950, { tam: 40, color: HIELO, escala: salto((t - tFl) / 0.4), alfa: clamp((t - tFl) / 0.2) });
};

// "Todo empieza en la forma de la molécula: un oxígeno con dos hidrógenos, doblada como una V."
ESCENAS.molecula = (inf) => {
  const t = inf.t;
  estrellas(0.5);
  const tO = inf.cuando("oxigeno"), tH = inf.cuando("hidrogenos"), tV = inf.cuando("v");
  const x = 540, y = 540, s = 6;
  const abre = 104.5 / 2 * Math.PI / 180;
  const kh = salto((t - tH + 0.2) / 0.5), ko = salto((t - Math.min(tO - 0.2, 0.3)) / 0.5);
  ctx.save();
  for (const d of [-abre, abre]) {
    if (kh <= 0) continue;
    const hx = x + Math.cos(Math.PI / 2 + d) * 22 * s, hy = y + Math.sin(Math.PI / 2 + d) * 22 * s;
    ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(lerp(x, hx, clamp(kh)), lerp(y, hy, clamp(kh))); ctx.stroke();
    circulo(hx, hy, 10 * s * clamp(kh), "#f2f5ff", "rgba(0,0,0,0.35)", 3);
    texto("H", hx, hy, { tam: 56, peso: 900, color: "#20263f", alfa: clamp(kh) });
  }
  if (ko > 0) { circulo(x, y, 15 * s * ko, "#ff5a5a", "rgba(0,0,0,0.35)", 3); texto("O", x, y, { tam: 72, peso: 900, alfa: clamp(ko) }); }
  ctx.restore();
  // ángulo
  const kv = entre(t, tV - 0.3, tV + 0.4);
  if (kv > 0) {
    ctx.save(); ctx.strokeStyle = AMARILLO; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(x, y, 190, Math.PI / 2 - abre, Math.PI / 2 - abre + 2 * abre * kv); ctx.stroke(); ctx.restore();
    chip("104,5°", x, y + 250, { tam: 40, color: AMARILLO, escala: salto((t - tV) / 0.4), alfa: clamp((t - tV) / 0.2) });
  }
  chip([["H₂O", CELESTE]], x, 300, { tam: 46, alfa: entre(t, 0, 0.4) });
};

// posición de la molécula k "suelta" en el líquido, moviéndose
function suelta(k, t) {
  const x = 190 + azar(k) * 700 + Math.sin(t * (1.3 + azar(k + 5)) + k) * 40;
  const y = 340 + azar(k + 9) * 580 + Math.cos(t * (1.1 + azar(k + 13)) + k * 2) * 40;
  return [clamp(x, 180, 900), clamp(y, 330, 930), t * (1 + azar(k + 17)) + k];
}

function caja_agua(alfa = 1) {
  ctx.save(); ctx.globalAlpha *= alfa;
  caja(140, 300, 800, 660, 30, "rgba(63,140,255,0.12)", "rgba(150,200,255,0.6)");
  ctx.restore();
}

// "En el agua líquida, las moléculas se mueven, chocan y quedan bastante amontonadas."
ESCENAS.liquido = (inf) => {
  const t = inf.t;
  estrellas(0.4);
  caja_agua();
  for (let k = 0; k < 55; k++) {
    const [x, y, a] = suelta(k, t * 1.6);
    agua(x, y, 1.5, a, entre(t, k * 0.01, 0.3 + k * 0.01));
  }
  const tA = inf.cuando("amontonadas");
  chip([["Líquida:", "#fff"], ["amontonadas", AGUA]], 540, 1000, { tam: 40, escala: salto((t - tA) / 0.4), alfa: clamp((t - tA) / 0.2) });
};

// red de hexágonos (panal): vértices, lados y centros
const L = 82, RED = (() => {
  const vert = [], centros = [];
  const h = Math.sqrt(3) * L;
  for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) {
    const cx = 230 + i * 1.5 * L, cy = 390 + j * h + (i % 2) * h / 2;
    if (cx > 900 || cy > 900) continue;
    centros.push([cx, cy]);
    for (let k = 0; k < 6; k++) {
      const v = [cx + L * Math.cos(k * Math.PI / 3), cy + L * Math.sin(k * Math.PI / 3)];
      if (!vert.some(w => Math.hypot(w[0] - v[0], w[1] - v[1]) < 2)) vert.push(v);
    }
  }
  const lados = [];
  vert.forEach((a, i) => vert.forEach((b, j) => { if (j > i && Math.abs(Math.hypot(a[0] - b[0], a[1] - b[1]) - L) < 2) lados.push([a, b]); }));
  return { vert, centros, lados };
})();

function panal(k, huecos, t) {
  const kl = clamp((k - 0.6) / 0.4);
  ctx.save(); ctx.strokeStyle = `rgba(190,234,255,${0.55 * kl})`; ctx.lineWidth = 4; ctx.setLineDash([8, 8]);
  for (const [a, b] of RED.lados) { ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke(); }
  ctx.restore();
  if (huecos > 0) {
    for (const [cx, cy] of RED.centros) {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, L * 0.8);
      g.addColorStop(0, `rgba(255,209,102,${0.5 * huecos})`); g.addColorStop(1, "rgba(255,209,102,0)");
      circulo(cx, cy, L * 0.8, g);
    }
  }
  RED.vert.forEach((v, n) => {
    const [x, y, a] = suelta(n, t * 1.6 * (1 - k));
    const ang = Math.atan2(v[1] - 640, v[0] - 540);
    agua(lerp(x, v[0], suave(k)), lerp(y, v[1], suave(k)), 1.5, lerp(a, ang, suave(k)));
  });
}

// "Pero al congelarse, se enganchan formando hexágonos. Y esa red deja huecos vacíos en el medio."
ESCENAS.hexagonos = (inf) => {
  const t = inf.t;
  estrellas(0.4);
  const tC = inf.cuando("congelarse") - 0.2, tHex = inf.cuando("hexagonos"), tHu = inf.cuando("huecos") - 0.2;
  caja_agua(1 - entre(t, tC, tC + 1));
  panal(entre(t, tC, tHex + 0.6), entre(t, tHu, tHu + 0.5), t);
  chip("Hexágonos", 540, 290, { tam: 40, color: HIELO, escala: salto((t - tHex) / 0.4), alfa: clamp((t - tHex) / 0.2) });
  chip("Huecos vacíos", 540, 1000, { tam: 40, color: AMARILLO, escala: salto((t - tHu - 0.2) / 0.4), alfa: clamp((t - tHu - 0.2) / 0.2) });
};

// "Por eso el hielo ocupa cerca de un nueve por ciento más de espacio, y pesa menos que la misma cantidad de agua."
ESCENAS.espacio = (inf) => {
  const t = inf.t;
  estrellas(0.4);
  const base = 830, w = 280, h = 380;
  const tN = inf.cuando("nueve") - 0.3, tP = inf.cuando("pesa") - 0.2;
  const crece = entre(t, tN, tN + 1.0);
  caja(300 - w / 2, base - h, w, h, 18, "rgba(63,140,255,0.7)", "#8fc2ff");
  texto("Agua", 300, base - h / 2, { tam: 46, peso: 900 });
  const hh = h * (1 + 0.09 * crece * 2.2);  // exagerado ×2,2 para que se note (está aclarado abajo)
  caja(780 - w / 2, base - hh, w, hh, 18, "rgba(191,234,255,0.85)", "#fff");
  texto("Hielo", 780, base - hh / 2, { tam: 46, peso: 900, color: "#173a5e" });
  if (crece > 0) {
    ctx.save(); ctx.strokeStyle = AMARILLO; ctx.lineWidth = 4; ctx.setLineDash([10, 10]);
    ctx.beginPath(); ctx.moveTo(120, base - h); ctx.lineTo(960, base - h); ctx.stroke(); ctx.restore();
    chip("+9 %", 780, base - hh - 55, { tam: 44, color: AMARILLO, escala: salto((t - tN - 0.5) / 0.4), alfa: clamp((t - tN - 0.5) / 0.2) });
  }
  texto("mismo peso, más espacio", 540, 965, { tam: 34, color: "rgba(255,255,255,0.75)", alfa: entre(t, tN + 0.6, tN + 1) });
  chip([["1,00", "#fff"], ["kg/L", "rgba(255,255,255,0.6)"]], 300, 890, { tam: 38, escala: salto((t - tP) / 0.4), alfa: clamp((t - tP) / 0.2) });
  chip([["0,92", HIELO], ["kg/L", "rgba(255,255,255,0.6)"]], 780, 890, { tam: 38, escala: salto((t - tP - 0.2) / 0.4), alfa: clamp((t - tP - 0.2) / 0.2) });
  texto("(dibujo exagerado)", 540, 1012, { tam: 26, color: "rgba(255,255,255,0.5)", alfa: entre(t, tN + 0.6, tN + 1) });
};

function pez(x, y, s, dir = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s * dir, s);
  ctx.fillStyle = NARANJA;
  ctx.beginPath(); ctx.ellipse(0, 0, 34, 16, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-28, 0); ctx.lineTo(-54, -16); ctx.lineTo(-54, 16); ctx.closePath(); ctx.fill();
  circulo(18, -4, 4, "#141a33");
  ctx.restore();
}

// "Y menos mal: en un lago, el hielo queda arriba como una tapa, y el agua de abajo sigue líquida para los peces."
ESCENAS.lago = (inf) => {
  const t = inf.t;
  estrellas(0.3);
  // nieve
  for (let k = 0; k < 40; k++) {
    const x = azar(k + 700) * 1080, y = 230 + ((azar(k + 720) * 230 + t * 60 * (0.6 + azar(k + 740))) % 230);
    circulo(x, y, 3 + azar(k) * 3, "rgba(255,255,255,0.8)");
  }
  chip([["Aire:", "#fff"], ["−10 °C", HIELO]], 870, 300, { tam: 34, alfa: entre(t, 0.2, 0.6) });
  // cuenca
  const sup = 480;
  ctx.save();
  ctx.beginPath(); ctx.moveTo(60, sup); ctx.bezierCurveTo(140, 980, 940, 980, 1020, sup); ctx.closePath();
  const g = ctx.createLinearGradient(0, sup, 0, 960);
  g.addColorStop(0, "#2a6fd6"); g.addColorStop(1, "#123a7a");
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = "#6b4f3a"; ctx.lineWidth = 16; ctx.stroke();
  ctx.restore();
  // tapa de hielo
  const tH = inf.cuando("hielo") - 0.2;
  const kh = entre(t, tH, tH + 0.8);
  caja(70, sup - 6, 940 * kh, 56, 10, HIELO, "#fff");
  if (kh > 0.9) texto("hielo", 540, sup + 22, { tam: 34, peso: 800, color: "#173a5e" });
  // temperaturas y peces
  const tL = inf.cuando("liquida") - 0.2;
  chip([["0 °C", HIELO]], 200, sup + 110, { tam: 32, alfa: entre(t, tL, tL + 0.3) });
  chip([["4 °C", "#fff"]], 540, 900, { tam: 32, alfa: entre(t, tL + 0.2, tL + 0.5) });
  const tP = inf.cuando("peces") - 0.4;
  const kp = entre(t, tP, tP + 0.5);
  if (kp > 0) {
    ctx.save(); ctx.globalAlpha *= kp;
    pez(380 + Math.sin(t * 0.9) * 120, 700, 1.4, Math.cos(t * 0.9) > 0 ? 1 : -1);
    pez(680 + Math.sin(t * 0.7 + 2) * 100, 790, 1.1, Math.cos(t * 0.7 + 2) > 0 ? 1 : -1);
    ctx.restore();
  }
};

// "O sea, el hielo flota porque está lleno de huecos."
ESCENAS.cierre = (inf) => {
  const t = inf.t;
  estrellas(0.4);
  panal(1, 0.6 + 0.4 * Math.sin(t * 3) ** 2, t);
  const tH = inf.cuando("huecos") - 0.1;
  chip([["Hielo =", "#fff"], ["agua con huecos", AMARILLO]], 540, 1000, { tam: 40, escala: salto((t - tH) / 0.4), alfa: clamp((t - tH) / 0.2) });
};
