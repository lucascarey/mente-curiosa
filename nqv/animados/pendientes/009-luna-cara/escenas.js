// Escenas de "La cara oculta de la Luna". La Luna lleva una marca naranja en la cara que mira a la Tierra.

const GRIS = "#c9ced8";
const aparece = (t, t0) => ({ escala: salto((t - t0) / 0.4), alfa: clamp((t - t0) / 0.2) });

function tierra(x, y, r) {
  circulo(x, y, r, "#2f6fd0", "#8fc2ff", 3);
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.clip();
  ctx.fillStyle = "#3fae6a";
  ctx.beginPath(); ctx.ellipse(x - r * 0.3, y - r * 0.2, r * 0.35, r * 0.25, 0.4, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + r * 0.35, y + r * 0.3, r * 0.25, r * 0.35, -0.3, 0, 7); ctx.fill();
  ctx.restore();
}

// Luna de radio r; "giro" es el ángulo hacia donde mira su cara marcada
function luna(x, y, r, giro, o = {}) {
  ctx.save(); ctx.translate(x, y);
  ctx.scale(o.estira ?? 1, 1 / (o.estira ?? 1));
  circulo(0, 0, r, GRIS, "#fff", 3);
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.clip();
  for (let k = 0; k < 5; k++) circulo((azar(k) - 0.5) * r * 1.4, (azar(k + 5) - 0.5) * r * 1.4, r * (0.1 + azar(k + 9) * 0.12), "#a9afbb");
  ctx.restore();
  // la cara que mira a la Tierra: un punto naranja en el borde
  circulo(Math.cos(giro) * r * 0.7, Math.sin(giro) * r * 0.7, r * 0.2, NARANJA, "#fff", 3);
  ctx.restore();
}

// "Desde la Tierra, siempre vemos la misma cara de la Luna. La otra mitad nunca se ve desde aquí."
ESCENAS.hook = (inf) => {
  const t = inf.t;
  estrellas(0.8);
  const ex = 540, ey = 640, R = 300;
  tierra(ex, ey, 110);
  ctx.save(); ctx.setLineDash([10, 14]); ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(ex, ey, R, 0, 7); ctx.stroke(); ctx.restore();
  const a = t * 0.5;
  const lx = ex + Math.cos(a) * R, ly = ey + Math.sin(a) * R;
  luna(lx, ly, 70, a + Math.PI);
  const tM = inf.cuando("misma") - 0.2, tO = inf.cuando("otra") - 0.2;
  chip([["Siempre la", "#fff"], ["misma cara", NARANJA]], 540, 300, { tam: 42, ...aparece(t, tM) });
  chip([["La otra mitad:", "#fff"], ["nunca se ve", ROJO]], 540, 1000, { tam: 38, ...aparece(t, tO) });
};

// "Mucha gente cree que la Luna no gira. Pero sí gira sobre sí misma."
ESCENAS.gira = (inf) => {
  const t = inf.t;
  estrellas(0.6);
  const tN = inf.cuando("gira") - 0.2, tS = inf.cuando("pero") - 0.1;
  const giro = t > tS ? (t - tS) * 1.6 : 0;
  luna(540, 640, 200, -Math.PI / 2 + giro);
  chip("La Luna no gira", 540, 320, { tam: 42, ...aparece(t, tN) });
  tachar(540, 320, 420, 70, entre(t, tS, tS + 0.5));
  if (t > tS) {
    ctx.save(); ctx.strokeStyle = AMARILLO; ctx.lineWidth = 8; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(540, 640, 260, -0.4 + giro, 1.2 + giro); ctx.stroke(); ctx.restore();
    chip([["Sí gira", AMARILLO], ["sobre sí misma", "#fff"]], 540, 960, { tam: 40, ...aparece(t, tS + 0.3) });
  }
};

// "El truco es que tarda lo mismo en girar sobre sí misma que en dar una vuelta alrededor de la Tierra: unos veintisiete días."
ESCENAS.orbita = (inf) => {
  const t = inf.t;
  estrellas(0.6);
  const ex = 540, ey = 640, R = 290;
  tierra(ex, ey, 100);
  ctx.save(); ctx.setLineDash([10, 14]); ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(ex, ey, R, 0, 7); ctx.stroke(); ctx.restore();
  const a = t * 0.6;
  const lx = ex + Math.cos(a) * R, ly = ey + Math.sin(a) * R;
  luna(lx, ly, 62, a + Math.PI);
  // la línea que muestra que la cara marcada siempre apunta a la Tierra
  ctx.save(); ctx.strokeStyle = "rgba(255,122,69,0.5)"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(ex, ey); ctx.stroke(); ctx.restore();
  const tV = inf.cuando("vuelta") - 0.2, tD = inf.cuando("veintisiete") - 0.2;
  chip([["Girar sobre sí:", "#fff"], [`${Math.round(27 * entre(t, tD, tD + 0.8))} días`, AMARILLO]], 540, 280, { tam: 38, ...aparece(t, tD) });
  chip([["Dar la vuelta:", "#fff"], [`${Math.round(27 * entre(t, tD, tD + 0.8))} días`, AMARILLO]], 540, 1000, { tam: 38, ...aparece(t, tD + 0.2) });
  chip("lo mismo", 860, 640, { tam: 36, color: NARANJA, ...aparece(t, tV) });
};

// "No es casualidad. La gravedad de la Tierra estira un poco a la Luna, y ese tirón la fue frenando durante millones de años."
ESCENAS.freno = (inf) => {
  const t = inf.t;
  estrellas(0.6);
  const tE = inf.cuando("estira") - 0.2, tF = inf.cuando("frenando") - 0.3;
  tierra(220, 640, 120);
  const estira = 1 + 0.18 * entre(t, tE, tE + 0.6);
  // giro rápido que se va frenando
  const vel = lerp(4, 0.2, entre(t, tF, tF + 2));
  luna(700, 640, 140, Math.PI + Math.sin(t * vel) * 1.5 * (1 - entre(t, tF, tF + 2)), { estira });
  for (const dy of [-60, 0, 60]) flecha(560, 640 + dy, 380, 640 + dy, CELESTE, 7, entre(t, tE, tE + 0.5));
  chip("Gravedad de la Tierra", 450, 380, { tam: 36, color: CELESTE, ...aparece(t, tE) });
  chip([["El tirón la", "#fff"], ["frena", AMARILLO]], 700, 900, { tam: 40, ...aparece(t, tF) });
  texto("dibujo no a escala", 540, 1010, { tam: 26, color: "rgba(255,255,255,0.6)", alfa: entre(t, 0.3, 0.8) });
};

// "Los astrónomos lo llaman rotación sincrónica, y les pasa a muchas lunas del sistema solar."
ESCENAS.sincronica = (inf) => {
  const t = inf.t;
  estrellas(0.7);
  const tR = inf.cuando("rotacion") - 0.2, tL = inf.cuando("lunas") - 0.3;
  chip([["Rotación", "#fff"], ["sincrónica", NARANJA]], 540, 320, { tam: 48, ...aparece(t, tR) });
  // un planeta con varias lunas, todas mirándolo
  const k = entre(t, tL, tL + 0.5);
  if (k > 0) {
    ctx.save(); ctx.globalAlpha *= k;
    circulo(540, 680, 110, "#d9a066", "#ffe0b8", 3);
    ctx.save(); ctx.strokeStyle = "rgba(255,224,184,0.6)"; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.ellipse(540, 680, 190, 40, -0.2, 0, 7); ctx.stroke(); ctx.restore();
    for (let j = 0; j < 4; j++) {
      const R = 230 + j * 45, a = t * (0.9 - j * 0.15) + j * 1.7;
      const x = 540 + Math.cos(a) * R, y = 680 + Math.sin(a) * R * 0.55;
      luna(x, y, 22 + j * 3, a + Math.PI);
    }
    ctx.restore();
    chip("Muchas lunas", 540, 990, { tam: 38, ...aparece(t, tL) });
  }
};

// "Y el lado oculto no es oscuro: recibe tanta luz del Sol como el nuestro. La primera foto la sacó una sonda soviética en mil novecientos cincuenta y nueve."
ESCENAS.oculto = (inf) => {
  const t = inf.t;
  estrellas(0.6);
  const tO = inf.cuando("oscuro") - 0.3, tL = inf.cuando("luz") - 0.2, tS = inf.cuando("sonda") - 0.3;
  sol(940, 420, 60);
  // la Luna iluminada del lado que no vemos (derecha), la Tierra a la izquierda
  circulo(560, 640, 170, "#3a3f4c", "#fff", 3);
  ctx.save(); ctx.beginPath(); ctx.arc(560, 640, 170, -Math.PI / 2, Math.PI / 2); ctx.closePath();
  ctx.fillStyle = GRIS; ctx.globalAlpha = entre(t, tL, tL + 0.6); ctx.fill(); ctx.restore();
  for (let k = 0; k < 6; k++) flecha(900, 380 + k * 40, 760, 520 + k * 30, AMARILLO, 5, entre(t, tL + k * 0.05, tL + 0.5 + k * 0.05), 0.8);
  tierra(150, 640, 70);
  chip("Lado oculto", 560, 300, { tam: 40, ...aparece(t, 0.2) });
  chip([["No es el", "#fff"], ["lado oscuro", ROJO]], 560, 380, { tam: 36, ...aparece(t, tO) });
  chip([["Luna 3,", "#fff"], ["1959", AMARILLO]], 560, 950, { tam: 40, ...aparece(t, tS) });
};

// "Así que la Luna sí gira, solo que al ritmo justo para mirarnos siempre de frente."
ESCENAS.cierre = (inf) => {
  const t = inf.t;
  estrellas(0.8);
  const ex = 540, ey = 640, R = 280;
  tierra(ex, ey, 100);
  const a = t * 0.5 + 1;
  luna(ex + Math.cos(a) * R, ey + Math.sin(a) * R, 64, a + Math.PI);
  const tF = inf.cuando("frente") - 0.3;
  chip([["Siempre", "#fff"], ["de frente", NARANJA]], 540, 300, { tam: 44, ...aparece(t, tF) });
};
