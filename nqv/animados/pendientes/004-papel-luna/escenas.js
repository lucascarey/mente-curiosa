// Escenas de "Una hoja doblada 42 veces". El papel es una columna blanca con rayitas (las capas).

const PAPEL = "#f4f1e8";

function tierra(x, y, r) {
  circulo(x, y, r, "#2f6fd0", "#8fc2ff", 3);
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.clip();
  ctx.fillStyle = "#3fae6a";
  ctx.beginPath(); ctx.ellipse(x - r * 0.3, y - r * 0.2, r * 0.45, r * 0.3, 0.5, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + r * 0.35, y + r * 0.35, r * 0.3, r * 0.22, -0.4, 0, 7); ctx.fill();
  ctx.restore();
}

function luna(x, y, r) {
  circulo(x, y, r, "#cfd3dc", "#fff", 2);
  circulo(x - r * 0.3, y - r * 0.2, r * 0.18, "#aab0bd");
  circulo(x + r * 0.25, y + r * 0.3, r * 0.12, "#aab0bd");
}

// columna de papel de abajo hacia arriba, con base en (x, base) y alto h
function pila(x, base, w, h, capas = 12) {
  if (h <= 0) return;
  ctx.save();
  ctx.shadowColor = "rgba(255,255,255,0.4)"; ctx.shadowBlur = 12;
  ctx.fillStyle = PAPEL; ctx.fillRect(x - w / 2, base - h, w, h);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(120,110,90,0.35)"; ctx.lineWidth = 1.5;
  const n = Math.min(capas, Math.floor(h / 4));
  for (let k = 1; k < n; k++) { const y = base - h * k / n; ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x + w / 2, y); ctx.stroke(); }
  ctx.restore();
}

function contador(etq, valor, x, y, color = AMARILLO) {
  chip([[etq, "#fff"], [valor, color]], x, y, { tam: 42 });
}

// "Si pudieras doblar una hoja de papel cuarenta y dos veces, llegaría hasta la Luna."
ESCENAS.hook = (inf) => {
  const t = inf.t;
  estrellas(0.9);
  const ex = 190, ey = 880, mx = 880, my = 340;
  tierra(ex, ey, 110);
  luna(mx, my, 55);
  const tC = inf.cuando("cuarenta") - 0.3, tL = inf.cuando("luna");
  const k = entre(t, tC, tL + 0.2);
  const n = Math.round(42 * k);
  // el papel crece de la Tierra a la Luna
  const ang = Math.atan2(my - ey, mx - ex), largo = Math.hypot(mx - ex, my - ey) - 165;
  ctx.save(); ctx.translate(ex, ey); ctx.rotate(ang);
  const l = 110 + largo * Math.pow(2, 42 * k - 42) * (k > 0 ? 1 : 0);
  ctx.fillStyle = PAPEL; ctx.shadowColor = "#fff"; ctx.shadowBlur = 16;
  ctx.fillRect(110, -9, Math.max(0, l - 110), 18);
  ctx.restore();
  contador("dobleces:", String(n), 540, 300);
  const tLu = tL;
  chip("¡Llega a la Luna!", 600, 1000, { tam: 42, color: AMARILLO, escala: salto((t - tLu) / 0.4), alfa: clamp((t - tLu) / 0.2) });
};

// "Una hoja común mide un décimo de milímetro. Y cada vez que la doblas, el grosor se duplica."
ESCENAS.doblar = (inf) => {
  const t = inf.t;
  estrellas(0.4);
  const tD = inf.cuando("doblas"), tDu = inf.cuando("duplica");
  // dobleces: 0 al principio, 1 en "doblas", y después sigue duplicando solo
  let n = 0;
  if (t > tD) n = 1;
  if (t > tDu) n = 1 + Math.min(3, Math.floor((t - tDu) / 0.7) + 1);
  const capas = Math.pow(2, n);
  const base = 820, alto = 7 * capas, ancho = 620 / Math.pow(1.35, n);
  pila(540, base, ancho, alto, capas);
  texto(`${capas} ${capas === 1 ? "capa" : "capas"}`, 540, base + 60, { tam: 40, peso: 800 });
  const tM = inf.cuando("milimetro") - 0.3;
  chip([["Grosor:", "#fff"], ["0,1 mm", AMARILLO]], 540, 330, { tam: 42, escala: salto((t - tM) / 0.4), alfa: clamp((t - tM) / 0.2) });
  if (n > 0) chip([["×2", NARANJA], ["en cada doblez", "#fff"]], 540, 960, { tam: 40, escala: salto((t - tDu) / 0.4), alfa: clamp((t - tDu) / 0.2) });
};

// regla vertical con marcas, de la base hacia arriba
function regla(x, base, alto, marcas, etiquetas) {
  ctx.save(); ctx.strokeStyle = "rgba(255,255,255,0.75)"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x, base - alto); ctx.stroke();
  for (let k = 0; k <= marcas; k++) {
    const y = base - alto * k / marcas, larga = k % (marcas / (etiquetas.length - 1)) === 0;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - (larga ? 30 : 15), y); ctx.stroke();
  }
  ctx.restore();
  etiquetas.forEach((e, k) => texto(e, x - 45, base - alto * k / (etiquetas.length - 1), { tam: 30, alinear: "right", color: "rgba(255,255,255,0.8)" }));
}

// "Con diez dobleces, ya tienes unos diez centímetros de papel."
ESCENAS.diez = (inf) => {
  const t = inf.t;
  estrellas(0.4);
  const base = 900, alto = 520;
  regla(420, base, alto, 10, ["0", "5 cm", "10 cm"]);
  const k = entre(t, 0.2, inf.cuando("centimetros"));
  pila(600, base, 220, alto * Math.pow(2, 10 * k - 10) * (k > 0 ? 1 : 0), 40);
  contador("dobleces:", String(Math.round(10 * k)), 540, 300);
  const tC = inf.cuando("centimetros");
  chip("≈ 10 cm", 800, base - alto, { tam: 42, color: AMARILLO, escala: salto((t - tC) / 0.4), alfa: clamp((t - tC) / 0.2) });
};

// "Con veinte, unos cien metros: la altura de un edificio de treinta pisos."
ESCENAS.veinte = (inf) => {
  const t = inf.t;
  estrellas(0.5);
  const base = 1000, alto = 540;
  const tE = inf.cuando("edificio") - 0.3;
  const ke = entre(t, tE, tE + 0.8);
  // edificio de 30 pisos que sube
  ctx.save(); ctx.globalAlpha *= clamp(ke * 3);
  const h = alto * ke;
  caja(330, base - h, 230, h, 6, "#2a355e", "#6f86c6");
  for (let p = 0; p < 30; p++) for (let v = 0; v < 4; v++) {
    const y = base - (p + 0.7) * alto / 30;
    if (y < base - h) continue;
    caja(350 + v * 52, y, 34, alto / 30 * 0.5, 2, azar(p * 4 + v) > 0.45 ? "#ffd98a" : "#1b2244");
  }
  ctx.restore();
  const k = entre(t, 0.2, inf.cuando("metros") + 0.2);
  pila(720, base, 110, alto * Math.pow(2, 10 * k - 10) * (k > 0 ? 1 : 0), 60);
  contador("dobleces:", String(10 + Math.round(10 * k)), 540, 290);
  const tM = inf.cuando("metros");
  chip("≈ 100 m", 720, base - alto - 50, { tam: 42, color: AMARILLO, escala: salto((t - tM) / 0.4), alfa: clamp((t - tM) / 0.2) });
  chip("30 pisos", 445, base - alto - 50, { tam: 38, alfa: entre(t, tE + 0.6, tE + 0.9) });
};

// "Con treinta, más de cien kilómetros. Tu hoja ya llegó al espacio."
ESCENAS.treinta = (inf) => {
  const t = inf.t;
  const base = 980, alto = 640;
  const g = ctx.createLinearGradient(0, base, 0, base - alto - 80);
  g.addColorStop(0, "#4f9be8"); g.addColorStop(0.5, "#1d3f8a"); g.addColorStop(1, "rgba(11,14,28,0)");
  ctx.fillStyle = g; ctx.fillRect(60, base - alto - 80, 960, alto + 80);
  estrellas(0.6);
  caja(60, base - 10, 960, 40, 0, "#2b6b3f");
  // líneas de referencia
  const yAvion = base - alto * 10 / 120, yEsp = base - alto * 100 / 120;
  ctx.save(); ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 3; ctx.setLineDash([10, 10]);
  ctx.beginPath(); ctx.moveTo(80, yAvion); ctx.lineTo(1000, yAvion); ctx.stroke();
  ctx.strokeStyle = AMARILLO; ctx.beginPath(); ctx.moveTo(80, yEsp); ctx.lineTo(1000, yEsp); ctx.stroke(); ctx.restore();
  texto("aviones: 10 km", 110, yAvion - 28, { tam: 30, alinear: "left" });
  texto("espacio: 100 km", 110, yEsp - 28, { tam: 32, alinear: "left", color: AMARILLO });
  const k = entre(t, 0.2, inf.cuando("kilometros") + 0.2);
  const h = alto * 107 / 120 * Math.pow(2, 10 * k - 10) * (k > 0 ? 1 : 0);
  pila(760, base - 10, 60, h, 80);
  contador("dobleces:", String(20 + Math.round(10 * k)), 540, 250);
  const tE = inf.cuando("espacio");
  chip("¡En el espacio!", 760, yEsp - 120, { tam: 40, color: AMARILLO, escala: salto((t - tE) / 0.4), alfa: clamp((t - tE) / 0.2) });
};

// "Y con cuarenta y dos, unos cuatrocientos cuarenta mil kilómetros. Más que la distancia a la Luna."
ESCENAS.luna = (inf) => {
  const t = inf.t;
  estrellas(0.9);
  const y = 620, ex = 150, mx = 820;
  tierra(ex, y, 90);
  luna(mx, y, 42);
  const tC = inf.cuando("cuatrocientos") - 0.2, tL = inf.cuando("luna");
  const k = entre(t, 0.2, tC + 0.6);
  const papelX = lerp(ex + 90, ex + 90 + (mx - ex - 90) * 439805 / 384400, Math.pow(k, 3));
  ctx.save(); ctx.fillStyle = PAPEL; ctx.shadowColor = "#fff"; ctx.shadowBlur = 16;
  ctx.fillRect(ex + 90, y - 120, Math.max(0, papelX - ex - 90), 20); ctx.restore();
  // distancia a la Luna
  ctx.save(); ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 3; ctx.setLineDash([8, 10]);
  ctx.beginPath(); ctx.moveTo(ex + 90, y + 120); ctx.lineTo(mx, y + 120); ctx.stroke(); ctx.restore();
  contador("dobleces:", String(30 + Math.round(12 * k)), 540, 300);
  chip([["Papel:", "#fff"], [`${Math.round(439805 * Math.pow(k, 3)).toLocaleString("es-AR")} km`, AMARILLO]], 470, y - 200, { tam: 38, alfa: entre(t, 0.2, 0.5) });
  chip([["Luna:", "#fff"], ["384.400 km", "#cfd3dc"]], 470, y + 190, { tam: 38, escala: salto((t - tL) / 0.4), alfa: clamp((t - tL) / 0.2) });
};

// "Eso es crecer de forma exponencial: al principio casi no pasa nada, y de golpe se dispara."
ESCENAS.curva = (inf) => {
  const t = inf.t;
  estrellas(0.4);
  const X0 = 150, X1 = 960, Y0 = 930, Y1 = 320;
  const X = n => lerp(X0, X1, n / 42), Y = v => lerp(Y0, Y1, v);
  ctx.save(); ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(X0, Y1 - 20); ctx.lineTo(X0, Y0); ctx.lineTo(X1 + 20, Y0); ctx.stroke(); ctx.restore();
  for (const n of [0, 10, 20, 30, 42]) texto(String(n), X(n), Y0 + 35, { tam: 30, color: "rgba(255,255,255,0.7)" });
  texto("dobleces", X1 - 70, Y0 + 75, { tam: 28, color: "rgba(255,255,255,0.6)" });
  texto("grosor", X0 + 20, Y1 - 30, { tam: 28, alinear: "left", color: "rgba(255,255,255,0.6)" });
  const tG = inf.cuando("golpe") - 0.2;
  const hasta = 42 * entre(t, 0.2, tG + 0.6);
  ctx.save(); ctx.strokeStyle = NARANJA; ctx.lineWidth = 8; ctx.shadowColor = NARANJA; ctx.shadowBlur = 14; ctx.lineJoin = "round";
  ctx.beginPath();
  for (let n = 0; n <= hasta; n += 0.25) { const v = Math.pow(2, n - 42); n === 0 ? ctx.moveTo(X(n), Y(v)) : ctx.lineTo(X(n), Y(v)); }
  ctx.stroke(); ctx.restore();
  const tN = inf.cuando("nada");
  chip("casi nada…", X(18), Y0 - 70, { tam: 38, alfa: entre(t, tN - 0.2, tN + 0.2) });
  chip("¡se dispara!", X(30), Y(0.55), { tam: 42, color: NARANJA, escala: salto((t - tG - 0.3) / 0.4), alfa: clamp((t - tG - 0.3) / 0.2) });
};

// "Igual, ni lo intentes: el récord es de doce dobleces, y usaron una tira de papel de más de un kilómetro."
ESCENAS.record = (inf) => {
  const t = inf.t;
  estrellas(0.5);
  const tR = inf.cuando("record") - 0.2, tK = inf.cuando("kilometro") - 0.3;
  chip([["Récord real:", "#fff"], ["12 dobleces", AMARILLO]], 540, 330, { tam: 44, escala: salto((t - tR) / 0.4), alfa: clamp((t - tR) / 0.2) });
  // tira larguísima que se pierde a los costados
  const k = entre(t, tK, tK + 1.0);
  ctx.save(); ctx.fillStyle = PAPEL; ctx.shadowColor = "#fff"; ctx.shadowBlur = 10;
  ctx.fillRect(540 - 560 * k, 640, 1120 * k, 16); ctx.restore();
  pila(540, 620, 160, 100 * clamp(t / 0.6), 12);
  chip([["Tira de papel:", "#fff"], ["+1 km", AMARILLO]], 540, 760, { tam: 40, alfa: entre(t, tK + 0.4, tK + 0.8) });
  texto("(Britney Gallivan, 2002)", 540, 840, { tam: 28, color: "rgba(255,255,255,0.55)", alfa: entre(t, tK + 0.6, tK + 1) });
};
