// Escenas de "El Sol que ves es de hace 8 minutos".

function tierra(x, y, r, luz = 1) {
  circulo(x, y, r, "#2f6fd0", "#8fc2ff", 3);
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.clip();
  ctx.fillStyle = "#3fae6a";
  ctx.beginPath(); ctx.ellipse(x - r * 0.3, y - r * 0.2, r * 0.45, r * 0.3, 0.5, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + r * 0.35, y + r * 0.35, r * 0.3, r * 0.22, -0.4, 0, 7); ctx.fill();
  // lado de noche (el Sol está a la izquierda)
  ctx.fillStyle = `rgba(5,8,20,${lerp(0.85, 0.55, luz)})`;
  ctx.beginPath(); ctx.arc(x, y, r, -Math.PI / 2, Math.PI / 2); ctx.fill();
  if (luz < 1) { ctx.fillStyle = `rgba(5,8,20,${0.8 * (1 - luz)})`; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); }
  ctx.restore();
}

function reloj(seg, x, y, o = {}) {
  const m = Math.floor(seg / 60), s = Math.floor(seg % 60);
  chip([[o.etq ?? "Tiempo:", "#fff"], [`${m}:${String(s).padStart(2, "0")}`, o.color ?? AMARILLO]], x, y, { tam: o.tam ?? 46, alfa: o.alfa ?? 1 });
}

// rayo de luz del Sol a la Tierra: un tramo luminoso que avanza (k de 0 a 1)
function rayo(x0, x1, y, k, color = AMARILLO, cola = 1) {
  const xf = lerp(x0, x1, clamp(k));
  const xi = lerp(x0, x1, clamp(k - cola));
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 8; ctx.lineCap = "round"; ctx.shadowColor = color; ctx.shadowBlur = 18;
  ctx.beginPath(); ctx.moveTo(xi, y); ctx.lineTo(xf, y); ctx.stroke(); ctx.restore();
  if (k > 0 && k < 1) circulo(xf, y, 12, "#fff");
}

// "El Sol que estás viendo ahora no es el Sol de ahora. Es el de hace ocho minutos."
ESCENAS.hook = (inf) => {
  const t = inf.t;
  estrellas(0.8);
  sol(170, 620, 95);
  tierra(900, 620, 60);
  rayo(270, 840, 620, (t % 2.2) / 1.6, AMARILLO, 0.35);
  const tH = inf.cuando("hace") - 0.2;
  chip([["Lo que ves:", "#fff"], ["hace 8 min", AMARILLO]], 540, 400, { tam: 42, escala: salto((t - tH) / 0.4), alfa: clamp((t - tH) / 0.2) });
};

// "La luz es lo más rápido que existe: recorre unos trescientos mil kilómetros por segundo. Le daría siete vueltas y media a la Tierra en un segundo."
ESCENAS.velocidad = (inf) => {
  const t = inf.t;
  estrellas(0.5);
  const tT = inf.cuando("trescientos") - 0.3, tV = inf.cuando("vueltas") - 0.4;
  const k = entre(t, tT, tT + 1.2);
  texto(`${Math.round(300000 * k).toLocaleString("es-AR")}`, 540, 360, { tam: 96, peso: 900, color: AMARILLO, alfa: clamp(k * 4) });
  texto("km por segundo", 540, 440, { tam: 38, alfa: clamp(k * 4) });
  // Tierra con un rayo que le da vueltas
  const kv = entre(t, tV - 0.3, tV);
  tierra(540, 720, 150, 1);
  if (kv > 0) {
    const vueltas = 7.5 * clamp((t - tV) / 2.0);
    const ang = vueltas * 2 * Math.PI;
    ctx.save(); ctx.strokeStyle = AMARILLO; ctx.lineWidth = 7; ctx.shadowColor = AMARILLO; ctx.shadowBlur = 16; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(540, 720, 190, ang - 1.2 - Math.PI / 2, ang - Math.PI / 2); ctx.stroke(); ctx.restore();
    chip([["vueltas:", "#fff"], [vueltas.toFixed(1).replace(".", ","), AMARILLO]], 540, 980, { tam: 40 });
  }
};

// "Pero el Sol está a ciento cincuenta millones de kilómetros. Así que su luz tarda ocho minutos y veinte segundos en llegar."
ESCENAS.viaje = (inf) => {
  const t = inf.t;
  estrellas(0.7);
  const y = 640;
  sol(140, y, 70);
  tierra(950, y, 34);
  const tM = inf.cuando("ciento") - 0.2, tO = inf.cuando("ocho") - 0.4, tL = inf.cuando("llegar") + 0.3;
  // distancia
  const kd = entre(t, tM, tM + 0.8);
  ctx.save(); ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 3; ctx.setLineDash([10, 10]);
  ctx.beginPath(); ctx.moveTo(220, y + 130); ctx.lineTo(lerp(220, 950, kd), y + 130); ctx.stroke(); ctx.restore();
  chip([["150.000.000", AMARILLO], ["km", "#fff"]], 560, y + 200, { tam: 40, escala: salto((t - tM) / 0.4), alfa: clamp((t - tM) / 0.2) });
  // la luz viaja y el reloj cuenta hasta 8:20
  const k = entre(t, tO, tL);
  rayo(215, 912, y, k, AMARILLO, 1);
  reloj(500 * k, 540, 380, { alfa: entre(t, tO - 0.2, tO) });
};

// "O sea, cada vez que miras el Sol, estás viendo el pasado."
ESCENAS.pasado = (inf) => {
  const t = inf.t;
  estrellas(0.7);
  sol(540, 560, 150);
  const tP = inf.cuando("pasado") - 0.2;
  ctx.save(); ctx.globalAlpha *= entre(t, tP, tP + 0.5);
  // marco de foto vieja alrededor del Sol
  ctx.strokeStyle = "#e9dcc0"; ctx.lineWidth = 14;
  ctx.strokeRect(300, 320, 480, 480);
  ctx.restore();
  chip([["Foto de", "#fff"], ["hace 8:20", AMARILLO]], 540, 880, { tam: 42, escala: salto((t - tP) / 0.4), alfa: clamp((t - tP) / 0.2) });
};

// "Y si el Sol desapareciera, lo seguirías viendo brillar durante ocho minutos, sin enterarte de nada."
ESCENAS.apagon = (inf) => {
  const t = inf.t;
  estrellas(0.8);
  const y = 640;
  const tD = inf.cuando("desapareciera") - 0.1;
  const apagado = entre(t, tD, tD + 0.3);
  if (apagado < 1) sol(140, y, 70, "#fff6d5", 1 - apagado);
  circulo(140, y, 70, null, `rgba(255,255,255,${0.5 * apagado})`, 3);
  texto("¡Puf!", 140, y - 130, { tam: 44, peso: 900, color: NARANJA, alfa: entre(t, tD, tD + 0.2) * (1 - entre(t, tD + 1.2, tD + 1.6)) });
  // la luz que ya salió sigue viajando: el último tramo avanza hacia la Tierra
  const viaje = clamp((t - tD) / (inf.dur - tD));
  const frente = apagado > 0 ? lerp(215, 912, viaje) : 215;
  ctx.save(); ctx.strokeStyle = AMARILLO; ctx.lineWidth = 8; ctx.shadowColor = AMARILLO; ctx.shadowBlur = 18;
  ctx.beginPath(); ctx.moveTo(frente, y); ctx.lineTo(912, y); ctx.stroke(); ctx.restore();
  tierra(950, y, 34, 1);
  reloj(500 * (1 - viaje), 540, 380, { etq: "Te enteras en", alfa: apagado });
  const tN = inf.cuando("nada") - 0.2;
  chip("…y la Tierra sigue iluminada", 560, 880, { tam: 38, escala: salto((t - tN) / 0.4), alfa: clamp((t - tN) / 0.2) });
};

// "Con su gravedad pasa lo mismo: la Tierra seguiría girando a su alrededor esos ocho minutos, como si nada."
ESCENAS.gravedad = (inf) => {
  const t = inf.t;
  estrellas(0.7);
  const cx = 540, cy = 640, r = 300;
  circulo(cx, cy, 60, null, "rgba(255,255,255,0.5)", 3);
  texto("(sin Sol)", cx, cy, { tam: 28, color: "rgba(255,255,255,0.6)" });
  ctx.save(); ctx.strokeStyle = "rgba(143,176,255,0.5)"; ctx.lineWidth = 3; ctx.setLineDash([8, 12]);
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke(); ctx.restore();
  const ang = -Math.PI / 2 + t * 0.6;
  // flechita de la gravedad que todavía "llega"
  const tG = inf.cuando("gravedad") - 0.2;
  const ex = cx + Math.cos(ang) * r, ey = cy + Math.sin(ang) * r;
  flecha(ex, ey, lerp(ex, cx, 0.45), lerp(ey, cy, 0.45), "#b48cff", 6, entre(t, tG, tG + 0.4));
  tierra(ex, ey, 40, 0.6);
  const tO = inf.cuando("ocho") - 0.3;
  reloj(Math.min(500, 500 * clamp((t - tO) / (inf.dur - tO))), 540, 300, { etq: "Sigue girando", alfa: entre(t, tO, tO + 0.3) });
  chip([["La gravedad también tarda", "#fff"], ["8 min", AMARILLO]], 540, 1000, { tam: 36, alfa: entre(t, tG + 0.3, tG + 0.7) });
};

// "Así que el cielo es una foto vieja: cuanto más lejos miras, más atrás en el tiempo ves."
ESCENAS.cierre = (inf) => {
  const t = inf.t;
  estrellas(1, 110);
  const filas = [
    ["Luna", "1,3 segundos", "#cfd3dc", 0.4],
    ["Sol", "8 minutos", AMARILLO, 0.9],
    ["Alfa Centauri", "4 años", "#8fb0ff", 1.4],
    ["Andrómeda", "2,5 millones de años", VIOLETA, 1.9],
  ];
  filas.forEach(([nombre, cuanto, color, d], k) => {
    const a = entre(t, d - 0.3, d);
    if (a <= 0) return;
    const y = 340 + k * 180;
    circulo(130, y, 20 + k * 3, color);
    texto(nombre, 185, y - 26, { tam: 46, peso: 800, alinear: "left", alfa: a });
    texto(`la ves como era hace ${cuanto}`, 185, y + 30, { tam: 32, alinear: "left", color, alfa: a });
  });
};
