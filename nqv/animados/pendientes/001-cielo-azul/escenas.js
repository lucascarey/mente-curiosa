// Escenas de "¿Por qué el cielo es azul?". Cada una dibuja la línea del guion con el mismo nombre.
// Coordenadas del canvas de 1080x1920; la zona de las escenas va de y=200 a y=1040 (PANEL).

const CIELO_DIA = ["#1f6fd1", "#5fb2f0", "#a9dcf7"];

function cieloPanel(alfa, colores = CIELO_DIA) {
  ctx.save();
  ctx.globalAlpha *= alfa;
  const g = ctx.createLinearGradient(0, 240, 0, 1000);
  colores.forEach((c, k) => g.addColorStop(k / (colores.length - 1), c));
  ctx.beginPath(); ctx.roundRect(60, 240, 960, 770, 44); ctx.fillStyle = g; ctx.fill();
  ctx.restore();
}

function persona(x, y, alto = 90, color = "#fff") {
  ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 7; ctx.lineCap = "round";
  circulo(x, y - alto, alto * 0.16, color);
  ctx.beginPath();
  ctx.moveTo(x, y - alto * 0.82); ctx.lineTo(x, y - alto * 0.38);
  ctx.moveTo(x - alto * 0.25, y - alto * 0.62); ctx.lineTo(x + alto * 0.25, y - alto * 0.62);
  ctx.moveTo(x, y - alto * 0.38); ctx.lineTo(x - alto * 0.2, y);
  ctx.moveTo(x, y - alto * 0.38); ctx.lineTo(x + alto * 0.2, y);
  ctx.stroke(); ctx.restore();
}

// "¿Por qué el cielo es azul? Spoiler: no es porque refleje el mar."
ESCENAS.pregunta = (inf) => {
  const t = inf.t;
  estrellas(1 - entre(t, 0, 1));
  cieloPanel(entre(t, 0.1, 1.2));
  sol(830, 400, 60, "#fffbe8", entre(t, 0.3, 1.2));
  // mar abajo
  ctx.save();
  ctx.globalAlpha *= entre(t, 0.3, 1.2);
  ctx.beginPath(); ctx.roundRect(60, 820, 960, 190, [0, 0, 44, 44]); ctx.fillStyle = "#16508f"; ctx.fill();
  for (let k = 0; k < 5; k++) onda(90, 860 + k * 30, 990, 120, 6, t * 2 + k, "rgba(255,255,255,0.35)", 3);
  ctx.restore();
  texto("?", 540, 560, { tam: 260, peso: 900, color: "#fff", alfa: entre(t, 0.4, 1.0) * (1 - entre(t, inf.cuando("spoiler") - 0.2, inf.cuando("spoiler"))), borde: 0 });
  const tMar = inf.cuando("spoiler");
  if (t > tMar - 0.1) {
    const k = salto((t - tMar) / 0.4);
    chip("¿Refleja el mar?", 540, 520, { tam: 46, escala: k, alfa: clamp(k) });
    tachar(540, 520, 460, 90, entre(t, inf.cuando("mar") - 0.1, inf.cuando("mar") + 0.4));
  }
};

// "La luz del Sol parece blanca, pero en realidad es una mezcla de todos los colores."
ESCENAS.luz = (inf) => {
  const t = inf.t;
  estrellas(0.8);
  sol(140, 620, 70);
  const prisma = [540, 620];
  // rayo blanco
  ctx.save(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 12; ctx.shadowColor = "#fff"; ctx.shadowBlur = 20;
  ctx.beginPath(); ctx.moveTo(210, 620); ctx.lineTo(lerp(210, prisma[0] - 40, entre(t, 0.2, 1.3)), 620); ctx.stroke(); ctx.restore();
  chip("Luz blanca", 330, 540, { tam: 40, alfa: entre(t, 0.8, 1.2) });
  // prisma
  ctx.save(); ctx.globalAlpha *= entre(t, 0, 0.6);
  ctx.beginPath(); ctx.moveTo(540, 470); ctx.lineTo(660, 720); ctx.lineTo(420, 720); ctx.closePath();
  ctx.fillStyle = "rgba(180,220,255,0.12)"; ctx.fill(); ctx.strokeStyle = "rgba(200,230,255,0.9)"; ctx.lineWidth = 4; ctx.stroke();
  ctx.restore();
  // abanico de colores
  const tMezcla = inf.cuando("mezcla") - 0.3;
  const k = entre(t, tMezcla, tMezcla + 1.0);
  ARCOIRIS.forEach((c, j) => {
    const ang = (-0.3 + j * 0.1);
    const largo = 430 * k;
    ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = 12; ctx.shadowColor = c; ctx.shadowBlur = 16; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(575, 620); ctx.lineTo(575 + Math.cos(ang) * largo, 620 + Math.sin(ang) * largo); ctx.stroke(); ctx.restore();
  });
  const tTodos = inf.cuando("todos");
  chip([["=", "#fff"], ["todos", AMARILLO], ["los colores", "#fff"]], 690, 860, { tam: 42, escala: salto((t - tTodos) / 0.4), alfa: clamp((t - tTodos) / 0.2) });
};

// "Cuando entra a la atmósfera, esa luz choca con las moléculas del aire: nitrógeno y oxígeno."
ESCENAS.atmosfera = (inf) => {
  const t = inf.t;
  estrellas(0.8);
  const cx = 540, cy = 1900, r = 1080, aire = 150;
  // atmósfera y Tierra
  const g = ctx.createRadialGradient(cx, cy, r, cx, cy, r + aire);
  g.addColorStop(0, "rgba(90,170,255,0.55)"); g.addColorStop(1, "rgba(90,170,255,0)");
  ctx.save(); ctx.globalAlpha *= entre(t, 0, 0.8);
  ctx.fillStyle = g; circulo(cx, cy, r + aire, g);
  circulo(cx, cy, r, "#1d3b6b", "#4f86c6", 4);
  ctx.restore();
  texto("Atmósfera", 880, 790, { tam: 36, color: "rgba(170,215,255,0.9)", alfa: entre(t, 0.6, 1.2) });
  // rayo que entra desde arriba a la izquierda
  const tAtm = inf.cuando("atmosfera");
  const kr = entre(t, 0.2, tAtm + 0.3);
  sol(150, 300, 40);
  ctx.save(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 9; ctx.shadowColor = "#fff"; ctx.shadowBlur = 16;
  ctx.beginPath(); ctx.moveTo(190, 330); ctx.lineTo(lerp(190, 470, kr), lerp(330, 790, kr)); ctx.stroke(); ctx.restore();
  // lupa con las moléculas
  const tLupa = inf.cuando("choca") - 0.2;
  const kl = salto((t - tLupa) / 0.5);
  if (kl > 0) {
    const lx = 690, ly = 470, lr = 210 * kl;
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 3; ctx.setLineDash([8, 8]);
    ctx.beginPath(); ctx.moveTo(470, 790); ctx.lineTo(lx - lr * 0.7, ly + lr * 0.7); ctx.stroke(); ctx.setLineDash([]);
    circulo(lx, ly, lr, "#0c1430", "#fff", 4);
    ctx.beginPath(); ctx.arc(lx, ly, Math.max(1, lr - 2), 0, 7); ctx.clip();
    // luz atravesando
    onda(lx - lr, ly + 10, lx + lr, 60, 18, t * 8, "#fff", 4, lerp(lx - lr, lx + lr, entre(t, tLupa, tLupa + 0.8)), 0.8);
    const tN = inf.cuando("nitrogeno"), tO = inf.cuando("oxigeno");
    for (let m = 0; m < 12; m++) {
      const esO = m % 5 === 4;  // 1 de cada 5 es oxígeno (~21 %)
      const mx = lx + ((m % 4) - 1.5) * 95 + (azar(m) - 0.5) * 40 + Math.sin(t * 2.3 + m) * 10;
      const my = ly + (Math.floor(m / 4) - 1) * 110 + (azar(m + 20) - 0.5) * 40 + Math.cos(t * 1.9 + m * 2) * 10;
      const ang = azar(m + 40) * 6 + t * (0.6 + azar(m + 60));
      const resalta = esO ? entre(t, tO - 0.1, tO + 0.3) : entre(t, tN - 0.1, tN + 0.3);
      const col = esO ? `rgb(${lerp(150, 255, resalta)},${lerp(150, 90, resalta)},${lerp(170, 100, resalta)})`
                      : `rgb(${lerp(150, 120, resalta)},${lerp(150, 170, resalta)},${lerp(170, 255, resalta)})`;
      for (const s of [-1, 1]) circulo(mx + Math.cos(ang) * 16 * s, my + Math.sin(ang) * 16 * s, 17, col, "rgba(0,0,0,0.4)", 2);
    }
    ctx.restore();
    chip([["N₂", "#78aaff"], ["78 %", "#fff"]], 450, 330, { tam: 44, escala: salto((t - tN) / 0.4), alfa: clamp((t - tN) / 0.2) });
    chip([["O₂", "#ff6a6a"], ["21 %", "#fff"]], 930, 640, { tam: 44, escala: salto((t - tO) / 0.4), alfa: clamp((t - tO) / 0.2) });
  }
};

// "Los colores de onda corta, como el azul, rebotan para todos lados. El rojo, de onda larga, pasa casi derecho."
ESCENAS.rebote = (inf) => {
  const t = inf.t;
  estrellas(0.6);
  const tReb = inf.cuando("rebotan"), tRojo = inf.cuando("rojo"), tDer = inf.cuando("derecho");
  // carril del azul
  const ya = 420, yr = 820, mx = 600;
  chip("Onda corta", 230, ya - 110, { tam: 40, color: AZUL, alfa: entre(t, 0.2, 0.6) });
  onda(80, ya, mx - 30, 55, 26, t * 10, AZUL, 7, lerp(80, mx - 30, entre(t, 0.1, tReb)));
  molecula(mx, ya, t);
  if (t > tReb - 0.2) {
    const k = (t - tReb + 0.2) / 1.1;
    for (let j = 0; j < 10; j++) {
      const a = j / 10 * 2 * Math.PI + 0.3;
      const d0 = 50, d1 = 50 + 200 * clamp(k);
      ctx.save(); ctx.globalAlpha *= 1 - clamp(k - 1.2);
      flecha(mx + Math.cos(a) * d0, ya + Math.sin(a) * d0, mx + Math.cos(a) * d1, ya + Math.sin(a) * d1, AZUL, 6, 1);
      ctx.restore();
    }
    chip("¡Rebota!", 880, ya - 150, { tam: 40, color: AZUL, escala: salto((t - tReb) / 0.4), alfa: clamp((t - tReb) / 0.2) });
  }
  // carril del rojo
  if (t > tRojo - 0.3) {
    const a = clamp((t - tRojo + 0.3) / 0.3);
    chip("Onda larga", 230, yr - 120, { tam: 40, color: ROJO, alfa: a });
    molecula(mx, yr, t, a);
    onda(80, yr, 1000, 210, 32, t * 6, ROJO, 7, lerp(80, 1000, entre(t, tRojo, tDer + 0.4)), a);
    chip("Pasa derecho", 830, yr + 120, { tam: 40, color: ROJO, alfa: entre(t, tDer, tDer + 0.3) });
  }
};

function molecula(x, y, t, alfa = 1) {
  ctx.save(); ctx.globalAlpha *= alfa;
  const a = t * 0.8;
  for (const s of [-1, 1]) circulo(x + Math.cos(a) * 18 * s, y + Math.sin(a) * 18 * s, 20, "#9aa6c4", "rgba(0,0,0,0.4)", 2);
  ctx.restore();
}

// "El azul se desvía casi seis veces más que el rojo. Por eso, mires adonde mires, te llega azul desde todo el cielo."
ESCENAS.seis = (inf) => {
  const t = inf.t;
  const tPor = inf.cuando("por") - 0.3;
  const cambio = entre(t, tPor, tPor + 0.5);
  estrellas(0.6 * (1 - cambio));
  // primera parte: barras
  if (cambio < 1) {
    ctx.save(); ctx.globalAlpha *= 1 - cambio;
    const base = 900, kb = entre(t, 0.3, inf.cuando("seis") + 0.4);
    texto("Cuánto se desvía", 540, 290, { tam: 42, color: "rgba(255,255,255,0.75)" });
    caja(250, base - 70, 200, 70, 14, ROJO);
    texto("×1", 350, base - 110, { tam: 44, peso: 800, color: ROJO });
    texto("Rojo", 350, base + 45, { tam: 40 });
    const h = lerp(70, 470, kb);
    caja(630, base - h, 200, h, 14, AZUL);
    texto(`×${(1 + 4.9 * kb).toFixed(1).replace(".", ",")}`, 730, base - h - 45, { tam: 54, peso: 900, color: AZUL });
    texto("Azul", 730, base + 45, { tam: 40 });
    ctx.restore();
  }
  // segunda parte: te llega azul de todos lados
  if (cambio > 0) {
    cieloPanel(cambio);
    ctx.save(); ctx.globalAlpha *= cambio;
    ctx.beginPath(); ctx.roundRect(60, 900, 960, 110, [0, 0, 44, 44]); ctx.fillStyle = "#2b6b3f"; ctx.fill();
    persona(540, 905, 120, "#10203a");
    const tMires = inf.cuando("mires");
    for (let j = 0; j < 9; j++) {
      const a = Math.PI * (0.1 + 0.8 * j / 8);
      const x0 = 540 + Math.cos(a) * 520, y0 = 840 - Math.sin(a) * 520;
      const k = entre(t, tMires + j * 0.12, tMires + j * 0.12 + 0.7);
      flecha(x0, y0, lerp(x0, 540, 0.62), lerp(y0, 790, 0.62), "#0d3d8a", 7, k);
    }
    ctx.restore();
  }
};

// "¿Y por qué no es violeta, si rebota todavía más? Porque el Sol manda menos violeta, y tus ojos captan mucho mejor el azul."
ESCENAS.violeta = (inf) => {
  const t = inf.t;
  estrellas(0.6);
  const filas = [
    { titulo: "Rebota", y: 360, v: 1.0, a: 0.63, desde: 0.3, vTxt: "×9,4", aTxt: "×5,9" },
    { titulo: "Luz del Sol", y: 630, v: 0.55, a: 1.0, desde: inf.cuando("sol") - 0.2, vTxt: "menos", aTxt: "más" },
    { titulo: "Tu ojo", y: 900, v: 0.18, a: 1.0, desde: inf.cuando("ojos") - 0.2, vTxt: "casi nada", aTxt: "¡mucho!" },
  ];
  for (const f of filas) {
    const k = entre(t, f.desde, f.desde + 0.7);
    if (k <= 0) continue;
    ctx.save(); ctx.globalAlpha *= clamp(k * 2);
    texto(f.titulo, 90, f.y - 75, { tam: 40, alinear: "left", color: "rgba(255,255,255,0.8)" });
    for (const [c, val, txt, dy] of [[VIOLETA, f.v, f.vTxt, -25], [AZUL, f.a, f.aTxt, 40]]) {
      const w = 560 * val * k;
      caja(90, f.y + dy - 24, Math.max(10, w), 48, 12, c);
      texto(txt, 90 + w + 20, f.y + dy, { tam: 40, alinear: "left", color: c, alfa: clamp(k * 1.5 - 0.5) });
    }
    ctx.restore();
  }
  const tAzul = inf.cuando("azul") + 0.1;
  chip([["Resultado:", "#fff"], ["azul", AZUL]], 540, 1010, { tam: 42, escala: salto((t - tAzul) / 0.4), alfa: clamp((t - tAzul) / 0.2) });
};

// "Al atardecer, la luz cruza casi cuarenta veces más aire para llegarte. En el camino pierde el azul, y lo que sobrevive es naranja y rojo."
ESCENAS.atardecer = (inf) => {
  const t = inf.t;
  const cx = 540, cy = 1640, r = 720, aire = 120;
  const obs = [cx, cy - r];
  const tBaja = inf.cuando("cruza") - 0.2, tCuarenta = inf.cuando("cuarenta");
  const tCamino = inf.cuando("camino"), tNaranja = inf.cuando("naranja");
  const baja = entre(t, tBaja, tCuarenta + 0.3);
  const ang = lerp(Math.PI / 2, 0.02, baja);
  const solX = obs[0] + Math.cos(ang) * 470, solY = obs[1] - Math.sin(ang) * 470;
  // cielo: de noche estrellada a resplandor naranja al final
  const tarde = entre(t, tNaranja - 0.4, tNaranja + 0.8);
  estrellas(0.7 * (1 - tarde));
  const g = ctx.createLinearGradient(0, 300, 0, 1000);
  g.addColorStop(0, "rgba(255,120,60,0)"); g.addColorStop(1, `rgba(255,120,60,${0.45 * tarde})`);
  ctx.fillStyle = g; ctx.fillRect(0, 200, ANCHO, 840);
  // atmósfera y Tierra
  const ga = ctx.createRadialGradient(cx, cy, r, cx, cy, r + aire);
  ga.addColorStop(0, "rgba(90,170,255,0.5)"); ga.addColorStop(1, "rgba(90,170,255,0.03)");
  circulo(cx, cy, r + aire, ga, "rgba(120,190,255,0.5)", 2);
  circulo(cx, cy, r, "#1d3b6b", "#4f86c6", 4);
  // tramo de aire que cruza la luz: desde el borde de la atmósfera hasta el que mira
  const dx = Math.cos(ang), dy = -Math.sin(ang);
  const ox = obs[0] - cx, oy = obs[1] - cy;
  const b = ox * dx + oy * dy, c = ox * ox + oy * oy - (r + aire) ** 2;
  const s = -b + Math.sqrt(b * b - c);
  const ex = obs[0] + dx * s, ey = obs[1] + dy * s;
  sol(solX, solY, 46, tarde > 0.5 ? "#ffd2a0" : "#fff6d5");
  // rayo: blanco donde entra, naranja donde llega (cuando pierde el azul)
  const perdida = entre(t, tCamino, tCamino + 1.2);
  ctx.save();
  ctx.lineWidth = 12; ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.setLineDash([10, 14]);
  ctx.beginPath(); ctx.moveTo(solX, solY); ctx.lineTo(ex, ey); ctx.stroke(); ctx.setLineDash([]);
  const gr = ctx.createLinearGradient(ex, ey, obs[0], obs[1]);
  gr.addColorStop(0, "#fff"); gr.addColorStop(1, perdida > 0 ? `rgb(255,${lerp(255, 140, perdida)},${lerp(255, 60, perdida)})` : "#fff");
  ctx.strokeStyle = gr; ctx.shadowColor = perdida > 0.5 ? NARANJA : "#fff"; ctx.shadowBlur = 18;
  ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(obs[0], obs[1]); ctx.stroke();
  ctx.restore();
  // puntitos azules que se van del rayo
  if (perdida > 0) {
    for (let j = 0; j < 16; j++) {
      const u = azar(j + 300);
      const px = lerp(ex, obs[0], u), py = lerp(ey, obs[1], u);
      const k = clamp((perdida * 1.4 - azar(j + 330) * 0.4));
      const a = azar(j + 360) * 2 * Math.PI;
      ctx.save(); ctx.globalAlpha *= (1 - clamp(k * 1.2 - 0.6));
      circulo(px + Math.cos(a) * 140 * k, py + Math.sin(a) * 140 * k - 60 * k, 8, AZUL);
      ctx.restore();
    }
  }
  persona(obs[0], obs[1] + 4, 95, "#fff");
  // contador de cuánto aire cruza
  const cuenta = 1 + 37 * entre(t, tBaja + 0.2, tCuarenta + 0.5);
  if (t > tBaja) chip([["Aire que cruza:", "#fff"], [`×${Math.round(cuenta)}`, AMARILLO]], 540, 300, { tam: 42 });
  else chip([["Mediodía:", "#fff"], ["×1", AMARILLO]], 540, 300, { tam: 42, alfa: entre(t, 0, 0.4) });
  texto("(dibujo no a escala)", 540, 365, { tam: 28, color: "rgba(255,255,255,0.5)", alfa: entre(t, tCuarenta, tCuarenta + 0.4) });
  chip([["Llega:", "#fff"], ["naranja", NARANJA], ["y", "#fff"], ["rojo", ROJO]], 540, 1000,
       { tam: 42, escala: salto((t - tNaranja) / 0.4), alfa: clamp((t - tNaranja) / 0.2) });
};

// "Así que el cielo no tiene color: es el aire tirándote el azul del Sol a los ojos."
ESCENAS.cierre = (inf) => {
  const t = inf.t;
  cieloPanel(entre(t, 0, 0.6));
  sol(830, 380, 60);
  ctx.save(); ctx.globalAlpha *= entre(t, 0, 0.6);
  ctx.beginPath(); ctx.roundRect(60, 900, 960, 110, [0, 0, 44, 44]); ctx.fillStyle = "#2b6b3f"; ctx.fill();
  ctx.restore();
  persona(300, 905, 120, "#10203a");
  const tAire = inf.cuando("aire");
  // luz del Sol que rebota en el aire y baja a los ojos
  for (let j = 0; j < 6; j++) {
    const px = 380 + j * 90, py = 470 + azar(j + 500) * 220;
    const k1 = entre(t, tAire + j * 0.1, tAire + j * 0.1 + 0.4);
    const k2 = entre(t, tAire + 0.4 + j * 0.1, tAire + 0.9 + j * 0.1);
    flecha(800, 410, px, py, "rgba(255,255,255,0.85)", 5, k1);
    if (k2 > 0) { molecula(px, py, t); flecha(px, py, lerp(px, 310, 0.85), lerp(py, 790, 0.85), "#0d3d8a", 6, k2); }
  }
  chip([["Cielo azul =", "#fff"], ["luz desviada", AMARILLO]], 540, 300,
       { tam: 40, escala: salto((t - inf.cuando("ojos")) / 0.4), alfa: clamp((t - inf.cuando("ojos")) / 0.2) });
};
