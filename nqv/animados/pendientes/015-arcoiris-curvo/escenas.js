// Escenas de "¿Por qué el arcoíris es curvo?". Gota grande con rayos de luz y el círculo de 42° alrededor de la sombra.

const aparece = (t, t0) => ({ escala: salto((t - t0) / 0.4), alfa: clamp((t - t0) / 0.2) });

// arcos de colores con centro cx,cy; k = cuánto se dibujó (0-1), desde/hasta en radianes
function arco(cx, cy, r, k = 1, desde = Math.PI, hasta = 2 * Math.PI, alfa = 1, grosor = 16) {
  if (k <= 0) return;
  ctx.save(); ctx.globalAlpha *= alfa; ctx.lineCap = "round";
  ARCOIRIS.forEach((c, j) => {
    ctx.strokeStyle = c; ctx.lineWidth = grosor; ctx.shadowColor = c; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(cx, cy, r - j * grosor, desde, lerp(desde, hasta, k)); ctx.stroke();
  });
  ctx.restore();
}

function suelo(y = 900) {
  ctx.fillStyle = "#1f3a2a"; ctx.fillRect(60, y, 960, 1045 - y);
  ctx.strokeStyle = "#5ee08a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(60, y); ctx.lineTo(1020, y); ctx.stroke();
}

function persona(x, y, esc = 1, color = "#fff") {
  ctx.save(); ctx.translate(x, y); ctx.scale(esc, esc);
  circulo(0, -110, 22, color);
  ctx.strokeStyle = color; ctx.lineWidth = 10; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(0, -85); ctx.lineTo(0, -35); ctx.moveTo(0, -35); ctx.lineTo(-18, 0); ctx.moveTo(0, -35); ctx.lineTo(18, 0);
  ctx.moveTo(-25, -70); ctx.lineTo(25, -70); ctx.stroke();
  ctx.restore();
}

// "Spoiler: el arcoíris no es un arco. Es un círculo completo, y casi nunca lo ves entero."
ESCENAS.hook = (inf) => {
  const t = inf.t;
  const tC = inf.cuando("circulo") - 0.3, tN = inf.cuando("nunca") - 0.3;
  const completa = entre(t, tC, tC + 1.2);
  arco(540, 760, 330, 1, Math.PI, lerp(2 * Math.PI, 3 * Math.PI, completa), 1, 18);
  // el suelo tapa la mitad de abajo cuando dice "nunca"
  const tapa = entre(t, tN, tN + 0.6);
  if (tapa > 0) { ctx.save(); ctx.globalAlpha *= tapa; suelo(760); ctx.restore(); }
  chip([["No es un arco:", "#fff"], ["es un círculo", AMARILLO]], 540, 300, { tam: 42, ...aparece(t, tC) });
};

function gota(cx, cy, r) {
  ctx.save();
  ctx.fillStyle = "rgba(110,210,235,0.22)"; ctx.strokeStyle = CELESTE; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
  ctx.restore();
}

// "Cuando la luz del Sol entra en una gota de lluvia, se dobla, rebota adentro y vuelve a salir, separada en colores."
ESCENAS.gota = (inf) => {
  const t = inf.t;
  const tE = inf.cuando("entra") - 0.3, tD = inf.cuando("dobla") - 0.2, tR = inf.cuando("rebota") - 0.2, tS = inf.cuando("separada") - 0.3;
  const cx = 600, cy = 640, r = 250;
  sol(150, 330, 50);
  gota(cx, cy, r);
  // puntos del recorrido: entrada arriba-izquierda, rebote atrás a la derecha, salida abajo-izquierda
  const A = [cx - 150, cy - 200], B = [cx + 230, cy + 95], C = [cx - 60, cy + 243];
  flecha(80, A[1], A[0], A[1], "#fff", 8, entre(t, tE, tE + 0.5));
  const k1 = entre(t, tD, tD + 0.6), k2 = entre(t, tR, tR + 0.6);
  ctx.save(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 7; ctx.lineCap = "round";
  if (k1 > 0) { ctx.beginPath(); ctx.moveTo(...A); ctx.lineTo(lerp(A[0], B[0], k1), lerp(A[1], B[1], k1)); ctx.stroke(); }
  if (k2 > 0) { ctx.beginPath(); ctx.moveTo(...B); ctx.lineTo(lerp(B[0], C[0], k2), lerp(B[1], C[1], k2)); ctx.stroke(); }
  ctx.restore();
  // salida en abanico de colores
  const k3 = entre(t, tS, tS + 0.7);
  ARCOIRIS.forEach((c, j) => flecha(C[0], C[1], C[0] - 330 + j * 18, C[1] + 120 - j * 22, c, 6, k3));
  chip("Se dobla", 860, 420, { tam: 34, ...aparece(t, tD) });
  chip("Rebota", 900, 860, { tam: 34, ...aparece(t, tR) });
  chip([["Sale en", "#fff"], ["colores", AMARILLO]], 540, 300, { tam: 42, ...aparece(t, tS) });
};

// "Y sale siempre con el mismo ángulo: unos cuarenta y dos grados respecto de la luz que entró."
ESCENAS.angulo = (inf) => {
  const t = inf.t;
  const tM = inf.cuando("mismo") - 0.3, tC = inf.cuando("cuarenta") - 0.3;
  const ox = 820, oy = 520;
  gota(ox, oy, 70);
  // luz que entra (horizontal desde la izquierda) y sigue de largo como referencia punteada
  flecha(120, oy, ox - 75, oy, "#fff", 8, entre(t, 0, 0.6));
  ctx.save(); ctx.setLineDash([16, 14]); ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(160, oy); ctx.stroke(); ctx.restore();
  const ang = 42 * Math.PI / 180, L = 560;
  const k = entre(t, tM, tM + 0.8);
  flecha(ox, oy + 30, ox - Math.cos(ang) * L, oy + 30 + Math.sin(ang) * L, AMARILLO, 9, k);
  // arco del ángulo
  const ka = entre(t, tC, tC + 0.6);
  if (ka > 0) {
    ctx.save(); ctx.strokeStyle = NARANJA; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(ox, oy + 30, 200, Math.PI - ang * ka, Math.PI, false); ctx.stroke(); ctx.restore();
  }
  texto("42°", ox - 290, oy + 110, { tam: 70, color: NARANJA, alfa: ka });
  chip([["Siempre", "#fff"], ["42 grados", AMARILLO]], 540, 300, { tam: 44, ...aparece(t, tC) });
};

// "Entonces, las gotas que te mandan color son las que están a cuarenta y dos grados de la sombra de tu cabeza. Y todas juntas forman un círculo."
ESCENAS.circulo = (inf) => {
  const t = inf.t;
  const tS = inf.cuando("sombra") - 0.3, tC = inf.cuando("circulo") - 0.4;
  const cx = 540, cy = 690;
  // la sombra de la cabeza en el centro
  const ks = entre(t, tS, tS + 0.5);
  circulo(cx, cy, 34, `rgba(0,0,0,${0.9 * ks})`, `rgba(255,255,255,${ks})`, 4);
  texto("tu sombra", cx, cy + 70, { tam: 30, alfa: ks, color: "#cfd6ff" });
  // gotas que van apareciendo alrededor y luego el anillo
  const n = 36, kg = entre(t, 0.3, tC);
  for (let j = 0; j < n * kg; j++) {
    const a = j / n * 2 * Math.PI;
    circulo(cx + Math.cos(a) * 250, cy + Math.sin(a) * 250, 12, ARCOIRIS[j % 7]);
  }
  const kc = entre(t, tC, tC + 1);
  arco(cx, cy, 300, kc, -Math.PI / 2, 1.5 * Math.PI, 1, 10);
  // líneas de 42° desde la sombra a dos gotas
  ctx.save(); ctx.globalAlpha *= ks * 0.7; ctx.setLineDash([12, 10]); ctx.strokeStyle = "#fff"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + 250, cy); ctx.moveTo(cx, cy); ctx.lineTo(cx - 177, cy - 177); ctx.stroke(); ctx.restore();
  chip([["Todas a", "#fff"], ["42°", AMARILLO], ["= círculo", "#fff"]], 540, 300, { tam: 42, ...aparece(t, tC) });
};

function avion(x, y, esc = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(esc, esc); ctx.fillStyle = "#e8ecff";
  ctx.beginPath(); ctx.ellipse(0, 0, 90, 16, 0, 0, 2 * Math.PI); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-40, 60); ctx.lineTo(-10, 60); ctx.lineTo(30, 0); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-40, -55); ctx.lineTo(-15, -55); ctx.lineTo(30, 0); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-80, 0); ctx.lineTo(-100, -35); ctx.lineTo(-80, -35); ctx.lineTo(-60, 0); ctx.closePath(); ctx.fill();
  ctx.restore();
}

// "El suelo tapa la parte de abajo. Pero desde un avión, a veces se ve el círculo entero."
ESCENAS.avion = (inf) => {
  const t = inf.t;
  const tA = inf.cuando("avion") - 0.4, tE = inf.cuando("entero") - 0.3;
  const vuela = entre(t, tA, tA + 0.8);
  if (vuela < 1) {
    ctx.save(); ctx.globalAlpha *= 1 - vuela;
    arco(540, 800, 300, 1, 0, 2 * Math.PI, 1, 14);
    suelo(800); persona(540, 960, 0.9);
    chip([["El suelo", "#fff"], ["tapa la mitad", NARANJA]], 540, 300, { tam: 40, ...aparece(t, 0.4) });
    ctx.restore();
  }
  if (vuela > 0) {
    ctx.save(); ctx.globalAlpha *= vuela;
    // nubes abajo y círculo completo
    for (let j = 0; j < 6; j++) circulo(150 + j * 160, 960 + Math.sin(j) * 15, 70, "rgba(255,255,255,0.18)");
    arco(540, 640, 260, entre(t, tA + 0.3, tE + 0.6), -Math.PI / 2, 1.5 * Math.PI, 1, 13);
    avion(lerp(-100, 540, vuela) + Math.sin(t) * 10, 640, 0.9);
    chip([["Desde el avión:", "#fff"], ["círculo entero", AMARILLO]], 540, 300, { tam: 40, ...aparece(t, tE) });
    ctx.restore();
  }
};

// "Por eso cada persona ve su propio arcoíris: sus gotas son distintas a las tuyas."
ESCENAS.propio = (inf) => {
  const t = inf.t;
  const tP = inf.cuando("propio") - 0.3, tD = inf.cuando("distintas") - 0.3;
  suelo(880);
  const k = entre(t, tP, tP + 0.8);
  arco(330, 880, 230, k, Math.PI, 2 * Math.PI, 1, 12);
  arco(750, 880, 230, entre(t, tP + 0.3, tP + 1.1), Math.PI, 2 * Math.PI, 0.85, 12);
  persona(330, 1010, 0.8, CELESTE); persona(750, 1010, 0.8, AMARILLO);
  // gotas de lluvia distintas para cada uno
  for (let j = 0; j < 30; j++) {
    const x = 100 + azar(j) * 880, y = 380 + ((t * 300 + azar(j + 9) * 500) % 480);
    ctx.save(); ctx.strokeStyle = "rgba(143,194,255,0.6)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 18); ctx.stroke(); ctx.restore();
  }
  chip([["Cada uno ve", "#fff"], ["su propio arcoíris", AMARILLO]], 540, 300, { tam: 38, ...aparece(t, tP) });
  chip("Otras gotas", 540, 470, { tam: 32, ...aparece(t, tD) });
};

// "Así que el arcoíris es curvo porque en realidad es un círculo, y tú siempre estás en su centro."
ESCENAS.cierre = (inf) => {
  const t = inf.t;
  const tC = inf.cuando("circulo") - 0.3, tZ = inf.cuando("centro") - 0.3;
  arco(540, 700, 300, entre(t, 0, tC + 0.8), -Math.PI / 2, 1.5 * Math.PI, 1, 15);
  const kz = entre(t, tZ, tZ + 0.5);
  circulo(540, 700, 30 + Math.sin(t * 5) * 4 * kz, `rgba(110,210,235,${kz})`);
  texto("tú", 540, 700, { tam: 30, color: FONDO, alfa: kz });
  chip([["Tú estás", "#fff"], ["en el centro", AMARILLO]], 540, 300, { tam: 42, ...aparece(t, tZ) });
};
