// Escenas de "¿Cómo flota un barco de acero?". El agua ocupa la parte de abajo del panel.

const AGUA_Y = 640, ACERO = "#9aa6b8", AGUA_C = "rgba(63,140,255,0.55)";

function agua(t, nivel = AGUA_Y) {
  ctx.save();
  ctx.fillStyle = AGUA_C;
  ctx.beginPath(); ctx.moveTo(60, 1030);
  for (let x = 60; x <= 1020; x += 10) ctx.lineTo(x, nivel + Math.sin(x / 60 + t * 2) * 6);
  ctx.lineTo(1020, 1030); ctx.closePath(); ctx.fill();
  ctx.restore();
}

// casco del barco: forma de U, ancho w, alto h, con la línea de flotación en y
function casco(x, y, w, h, o = {}) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y - h * 0.4);
  ctx.lineTo(x - w / 2 + 30, y + h * 0.6);
  ctx.quadraticCurveTo(x, y + h * 0.7, x + w / 2 - 30, y + h * 0.6);
  ctx.lineTo(x + w / 2, y - h * 0.4);
  ctx.closePath();
  ctx.fillStyle = o.color ?? "#c0392b"; ctx.fill();
  ctx.strokeStyle = "#f2f2f2"; ctx.lineWidth = 4; ctx.stroke();
  if (o.lleno) {  // agua adentro
    ctx.clip();
    ctx.fillStyle = "rgba(63,140,255,0.8)";
    ctx.fillRect(x - w / 2, y + h * 0.7 - (h * 1.1) * o.lleno, w, h * 1.1 * o.lleno);
  }
  ctx.restore();
  if (o.cabina !== false) {
    caja(x - w * 0.18, y - h * 0.4 - 70, w * 0.36, 70, 8, "#eef2f7", "#9aa6b8");
    caja(x + w * 0.05, y - h * 0.4 - 130, 36, 60, 4, "#3a4260");
  }
}

// "Una moneda de acero se hunde. Pero un barco de acero de miles de toneladas flota. ¿Cómo puede ser?"
ESCENAS.hook = (inf) => {
  const t = inf.t;
  estrellas(0.3);
  const tH = inf.cuando("hunde") - 0.4, tB = inf.cuando("barco") - 0.3;
  agua(t);
  // moneda que se hunde
  const ym = lerp(AGUA_Y - 160, 960, entre(t, tH, tH + 1.4));
  ctx.save(); ctx.translate(260, ym); ctx.rotate(t * 2);
  ctx.beginPath(); ctx.ellipse(0, 0, 34, 12, 0, 0, 7); ctx.fillStyle = ACERO; ctx.fill(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.stroke();
  ctx.restore();
  chip("Moneda: se hunde", 260, 330, { tam: 34, alfa: entre(t, tH, tH + 0.3) });
  // barco que flota
  const kb = entre(t, tB - 0.3, tB + 0.3);
  if (kb > 0) {
    ctx.save(); ctx.globalAlpha *= kb;
    casco(760, AGUA_Y + Math.sin(t * 2) * 6, 320, 120);
    ctx.restore();
    chip("Barco: flota", 760, 330, { tam: 34, alfa: kb });
  }
  const tC = inf.cuando("como");
  texto("?", 540, 470, { tam: 140, peso: 900, color: AMARILLO, alfa: entre(t, tC - 0.2, tC + 0.2) });
};

// "El acero es casi ocho veces más pesado que el agua. Una bola de acero maciza se hunde sin remedio."
ESCENAS.densidad = (inf) => {
  const t = inf.t;
  estrellas(0.3);
  const tO = inf.cuando("ocho") - 0.3, tB = inf.cuando("bola") - 0.2;
  const sale = entre(t, tB - 0.3, tB);
  // comparación: 1 cubo de acero = 8 cubos de agua (mismo tamaño)
  ctx.save(); ctx.globalAlpha *= 1 - sale;
  caja(170, 470, 150, 150, 10, ACERO, "#fff");
  texto("1 L de acero", 245, 670, { tam: 32 });
  texto("=", 400, 545, { tam: 80, peso: 900 });
  for (let k = 0; k < 8; k++) {
    const a = entre(t, tO + k * 0.08, tO + 0.3 + k * 0.08);
    caja(470 + (k % 4) * 125, 420 + Math.floor(k / 4) * 125, 110, 110, 10, `rgba(63,140,255,${0.7 * a})`, a > 0 ? "#8fc2ff" : null);
  }
  texto("en peso: casi 8 L de agua", 720, 690, { tam: 32, alfa: entre(t, tO + 0.6, tO + 1) });
  ctx.restore();
  // la bola se hunde
  if (sale > 0) {
    agua(t);
    const y = lerp(AGUA_Y - 200, 930, entre(t, tB + 0.2, tB + 1.6));
    const g = ctx.createRadialGradient(520, y - 20, 10, 540, y, 80);
    g.addColorStop(0, "#e8edf5"); g.addColorStop(1, "#6b778c");
    circulo(540, y, 80, g, "#fff", 3);
    chip("Maciza: se hunde", 540, 330, { tam: 38, alfa: sale });
  }
};

// "Pero si con ese mismo acero armas un casco hueco, lleno de aire, todo cambia."
ESCENAS.forma = (inf) => {
  const t = inf.t;
  estrellas(0.3);
  agua(t);
  const tC = inf.cuando("casco") - 0.3, tA = inf.cuando("aire") - 0.2;
  const k = entre(t, tC, tC + 1.0);
  // la bola se "estira" en casco: se dibuja la bola achicándose y el casco creciendo
  if (k < 1) circulo(540, 930, 80 * (1 - k), ACERO, "#fff", 3);
  if (k > 0) {
    ctx.save(); ctx.globalAlpha *= k;
    casco(540, lerp(930, AGUA_Y, k) + Math.sin(t * 2) * 5, lerp(160, 440, k), lerp(80, 160, k), { color: ACERO, cabina: false });
    ctx.restore();
  }
  if (t > tA) {
    for (let j = 0; j < 14; j++) {
      const x = 400 + azar(j) * 280, y = AGUA_Y - 30 + azar(j + 9) * 90 - ((t * 30 + j * 13) % 40);
      circulo(x, y, 8 + azar(j + 3) * 6, null, "rgba(255,255,255,0.75)", 2);
    }
    chip([["Hueco:", "#fff"], ["lleno de aire", CELESTE]], 540, 330, { tam: 40, escala: salto((t - tA) / 0.4), alfa: clamp((t - tA) / 0.2) });
  }
};

// "Al apoyarse, el barco corre agua hacia los costados. Y el agua lo empuja hacia arriba con una fuerza igual al peso del agua que corrió."
ESCENAS.empuje = (inf) => {
  const t = inf.t;
  estrellas(0.3);
  const tC = inf.cuando("costados") - 0.4, tE = inf.cuando("empuja") - 0.2, tP = inf.cuando("peso") - 0.2;
  const baja = entre(t, 0.1, tC);
  agua(t, AGUA_Y - 30 * baja);
  casco(540, lerp(AGUA_Y - 120, AGUA_Y, baja), 440, 160);
  // agua corrida a los costados
  const kc = entre(t, tC - 0.3, tC + 0.4);
  flecha(320, AGUA_Y + 40, 140, AGUA_Y + 40, CELESTE, 8, kc);
  flecha(760, AGUA_Y + 40, 940, AGUA_Y + 40, CELESTE, 8, kc);
  // empuje hacia arriba
  for (const dx of [-120, 0, 120]) flecha(540 + dx, 1010, 540 + dx, AGUA_Y + 140, AMARILLO, 10, entre(t, tE, tE + 0.5));
  chip("Empuje", 820, 920, { tam: 40, color: AMARILLO, escala: salto((t - tE) / 0.4), alfa: clamp((t - tE) / 0.2) });
  chip([["empuje =", "#fff"], ["peso del agua corrida", CELESTE]], 540, 330, { tam: 36, escala: salto((t - tP) / 0.4), alfa: clamp((t - tP) / 0.2) });
};

// "Si el casco logra correr tanta agua como lo que pesa el barco, flota. Eso lo descubrió Arquímedes hace más de dos mil años."
ESCENAS.balanza = (inf) => {
  const t = inf.t;
  estrellas(0.3);
  const tP = inf.cuando("pesa") - 0.4, tF = inf.cuando("flota") - 0.2, tA = inf.cuando("arquimedes") - 0.3;
  // balanza: barco a la izquierda, agua corrida a la derecha
  const inclina = 0.25 * (1 - entre(t, tP, tF));
  const cx = 540, cy = 520;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(-inclina);
  ctx.strokeStyle = "#e8edf5"; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-320, 0); ctx.lineTo(320, 0); ctx.stroke();
  ctx.restore();
  caja(cx - 14, cy, 28, 360, 6, "#e8edf5");
  caja(cx - 120, cy + 350, 240, 24, 8, "#e8edf5");
  const iz = [cx - 320 * Math.cos(inclina), cy + 320 * Math.sin(inclina)];
  const de = [cx + 320 * Math.cos(inclina), cy - 320 * Math.sin(inclina)];
  ctx.save(); ctx.translate(iz[0], iz[1] - 20); casco(0, -40, 200, 80, { cabina: false }); ctx.restore();
  const kw = entre(t, 0.2, tP);
  caja(de[0] - 100, de[1] - 20 - 120 * kw, 200, 120 * kw, 14, "rgba(63,140,255,0.8)", "#8fc2ff");
  texto("barco", iz[0], iz[1] + 50, { tam: 32 });
  texto("agua corrida", de[0], de[1] + 50, { tam: 32 });
  chip("¡Flota!", 540, 300, { tam: 46, color: AMARILLO, escala: salto((t - tF) / 0.4), alfa: clamp((t - tF) / 0.2) });
  chip([["Arquímedes,", "#fff"], ["hace +2.000 años", AMARILLO]], 540, 1000, { tam: 38, escala: salto((t - tA) / 0.4), alfa: clamp((t - tA) / 0.2) });
};

// "Por eso un barco se hunde cuando le entra agua: lo que lo mantiene arriba es el aire de adentro."
ESCENAS.hundir = (inf) => {
  const t = inf.t;
  estrellas(0.3);
  agua(t);
  const tE = inf.cuando("entra") - 0.3, tA = inf.cuando("aire") - 0.2;
  const lleno = entre(t, tE, tE + 1.6);
  const y = lerp(AGUA_Y, AGUA_Y + 260, Math.pow(lleno, 2));
  casco(540, y, 440, 160, { lleno });
  if (t > tE) for (let j = 0; j < 8; j++) {
    const by = AGUA_Y - ((t - tE) * 120 + j * 30) % 160;
    circulo(500 + azar(j) * 80, by + 60, 6, null, "rgba(255,255,255,0.7)", 2);
  }
  chip([["Sin aire", "#fff"], ["= se hunde", ROJO]], 540, 330, { tam: 40, escala: salto((t - tA) / 0.4), alfa: clamp((t - tA) / 0.2) });
};

// "Así que un barco no flota a pesar del acero: flota gracias a todo el aire que lleva adentro."
ESCENAS.cierre = (inf) => {
  const t = inf.t;
  estrellas(0.3);
  agua(t);
  casco(540, AGUA_Y + Math.sin(t * 2) * 6, 460, 170);
  const tA = inf.cuando("aire") - 0.2;
  chip([["Flota gracias al", "#fff"], ["aire", CELESTE]], 540, 330, { tam: 44, escala: salto((t - tA) / 0.4), alfa: clamp((t - tA) / 0.2) });
};
