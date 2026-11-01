// Escenas de "¿Por qué no se cae la Torre de Pisa?". Torre esquemática que gira sobre su base, con el centro de gravedad.

const aparece = (t, t0) => ({ escala: salto((t - t0) / 0.4), alfa: clamp((t - t0) / 0.2) });
const PIEDRA = "#efe6d2", SOMBRA = "#c9bc9f";
// el dibujo exagera la inclinación al doble para que se note (los números en pantalla son los reales)
const rad = g => 2 * g * Math.PI / 180;

// torre de 8 pisos apoyada en (x, y) (centro de la base), inclinada "grados" hacia la derecha. pisos = cuántos se ven
function torre(x, y, grados, esc = 1, pisos = 8, o = {}) {
  const ancho = 150, altoPiso = 62;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rad(grados)); ctx.scale(esc, esc);
  for (let p = 0; p < pisos; p++) {
    const w = p === 7 ? ancho * 0.7 : ancho, y0 = -(p + 1) * altoPiso;
    ctx.fillStyle = PIEDRA; ctx.fillRect(-w / 2, y0, w, altoPiso - 4);
    ctx.fillStyle = SOMBRA;
    for (let a = 0; a < 5; a++) ctx.fillRect(-w / 2 + 12 + a * (w - 24) / 5, y0 + 14, (w - 24) / 5 - 10, altoPiso - 30);
    ctx.fillStyle = "#fff"; ctx.fillRect(-w / 2 - 8, y0 + altoPiso - 8, w + 16, 6);
  }
  if (o.cg) {
    // centro de gravedad y su línea vertical (en coordenadas del mundo)
    const cgY = -pisos * altoPiso / 2;
    ctx.restore(); ctx.save();
    const gx = x + Math.sin(rad(grados)) * -cgY * esc, gy = y + Math.cos(rad(grados)) * cgY * esc;
    ctx.setLineDash([14, 10]); ctx.strokeStyle = o.colorCG ?? AMARILLO; ctx.lineWidth = 5; ctx.globalAlpha *= o.cg;
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, y + 10); ctx.stroke(); ctx.setLineDash([]);
    circulo(gx, gy, 18, o.colorCG ?? AMARILLO, FONDO, 4);
    flecha(gx, y + 10, gx, y + 40, o.colorCG ?? AMARILLO, 6);
  }
  ctx.restore();
}

function suelo(y, blando = 0, t = 0) {
  ctx.fillStyle = "#5a4632"; ctx.fillRect(60, y, 960, 1030 - y);
  ctx.fillStyle = "#7a6248";
  for (let j = 0; j < 60 * blando; j++) circulo(80 + azar(j) * 920, y + 12 + azar(j + 70) * (1020 - y - 20), 4 + azar(j + 3) * 4, "#8c7456");
  ctx.strokeStyle = "#9b8466"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(60, y); ctx.lineTo(1020, y); ctx.stroke();
}

// "La Torre de Pisa lleva más de ochocientos años inclinada y todavía no se cayó."
ESCENAS.hook = (inf) => {
  const t = inf.t;
  const tO = inf.cuando("ochocientos") - 0.3, tC = inf.cuando("cayo") - 0.4;
  suelo(900);
  // un leve vaivén al decir "cayó", como si fuera a caerse
  const tiembla = entre(t, tC, tC + 0.3) * (1 - entre(t, tC + 0.6, tC + 1)) * Math.sin(t * 20) * 0.6;
  torre(540, 900, 4 + tiembla, 1);
  chip([["Más de", "#fff"], ["800 años", AMARILLO], ["inclinada", "#fff"]], 540, 300, { tam: 40, ...aparece(t, tO) });
};

// "Empezaron a construirla en mil ciento setenta y tres, sobre un suelo blando de arcilla y arena."
ESCENAS.suelo = (inf) => {
  const t = inf.t;
  const tM = inf.cuando("mil") - 0.3, tS = inf.cuando("suelo") - 0.3, tA = inf.cuando("arcilla") - 0.3;
  suelo(800, entre(t, tS, tS + 0.6), t);
  // se arma piso por piso
  const pisos = Math.max(1, Math.round(3 * entre(t, 0.2, tS)));
  torre(540, 800, 0, 1, pisos);
  texto("1173", 540, 430, { tam: 110, color: AMARILLO, alfa: entre(t, tM, tM + 0.5) });
  chip([["Suelo blando:", "#fff"], ["arcilla y arena", NARANJA]], 540, 960, { tam: 34, ...aparece(t, tA) });
  chip("Empieza la obra", 540, 300, { tam: 40, ...aparece(t, 0.2) });
};

// "Cuando iban por el tercer piso, el suelo de un lado se hundió más que el otro, y la torre empezó a inclinarse."
ESCENAS.inclina = (inf) => {
  const t = inf.t;
  const tT = inf.cuando("tercer") - 0.3, tH = inf.cuando("hundio") - 0.3, tI = inf.cuando("inclinarse") - 0.4;
  suelo(800, 1, t);
  const g = 4 * entre(t, tH, tI + 0.8);
  // hundimiento del lado derecho
  const hund = entre(t, tH, tH + 0.8) * 24;
  ctx.fillStyle = FONDO; ctx.beginPath(); ctx.moveTo(540, 800); ctx.lineTo(680, 800); ctx.lineTo(680, 800 + hund); ctx.closePath(); ctx.fill();
  torre(540, 800 + hund * 0.4, g, 1, t > tI ? 8 : 3);
  flecha(760, 760, 760, 860, ROJO, 7, entre(t, tH, tH + 0.5));
  chip("Se hunde", 860, 700, { tam: 34, color: ROJO, ...aparece(t, tH) });
  chip([["Tercer piso", AMARILLO]], 540, 300, { tam: 42, ...aparece(t, tT) });
};

// "No se cae porque la línea vertical que baja desde su centro de gravedad sigue cayendo dentro de la base."
ESCENAS.gravedad = (inf) => {
  const t = inf.t;
  const tL = inf.cuando("linea") - 0.3, tG = inf.cuando("gravedad") - 0.4, tB = inf.cuando("base") - 0.3;
  suelo(880);
  torre(540, 880, 4, 1, 8, { cg: entre(t, tL, tL + 0.6) });
  // base resaltada
  const kb = entre(t, tB, tB + 0.4);
  caja(540 - 83, 872, 166, 16, 8, `rgba(94,224,138,${kb})`);
  chip("Centro de gravedad", 300, 470, { tam: 32, color: AMARILLO, ...aparece(t, tG) });
  chip([["Cae", "#fff"], ["dentro de la base", VERDE]], 540, 300, { tam: 40, ...aparece(t, tB) });
};

// "Pero llegó a estar en peligro: en mil novecientos noventa tenía unos cinco grados y medio de inclinación, y la cerraron al público."
ESCENAS.peligro = (inf) => {
  const t = inf.t;
  const tP = inf.cuando("peligro") - 0.3, tC = inf.cuando("cinco") - 0.3, tR = inf.cuando("cerraron") - 0.3;
  suelo(880);
  const g = lerp(4, 5.5, entre(t, tC, tC + 1));
  torre(540, 880, g, 1, 8, { cg: 1, colorCG: g > 5 ? ROJO : AMARILLO });
  texto(g.toFixed(1).replace(".", ",") + "°", 260, 560, { tam: 90, color: g > 5 ? ROJO : "#fff", alfa: entre(t, tC - 0.2, tC + 0.2) });
  texto("1990", 260, 460, { tam: 50, color: AMARILLO, alfa: entre(t, tC - 0.6, tC) });
  // cinta de cerrado
  const kr = entre(t, tR, tR + 0.5);
  ctx.save(); ctx.globalAlpha *= kr; ctx.translate(540, 820); ctx.rotate(-0.08);
  caja(-420 * kr, -26, 840 * kr, 52, 8, AMARILLO);
  texto("CERRADA", 0, 2, { tam: 38, color: FONDO });
  ctx.restore();
  chip([["En", "#fff"], ["peligro", ROJO]], 540, 300, { tam: 42, ...aparece(t, tP) });
};

// "Durante once años sacaron tierra de debajo del lado alto, de a poco, y la torre se enderezó hasta unos cuatro grados."
ESCENAS.arreglo = (inf) => {
  const t = inf.t;
  const tO = inf.cuando("once") - 0.3, tS = inf.cuando("sacaron") - 0.3, tE = inf.cuando("enderezo") - 0.4;
  suelo(880, 1, t);
  const g = lerp(5.5, 4, entre(t, tS, tE + 1));
  torre(540, 880, g, 1, 8, { cg: 1 });
  // tierra que sale por debajo del lado alto (izquierda)
  if (t > tS) for (let j = 0; j < 8; j++) {
    const f = ((t - tS) * 0.5 + j / 8) % 1;
    circulo(lerp(440, 160, f), 950 + Math.sin(f * 3) * 20, 9, "#a88a66");
  }
  flecha(430, 950, 170, 950, "#fff", 5, entre(t, tS, tS + 0.5), 0.6);
  texto(g.toFixed(1).replace(".", ",") + "°", 840, 560, { tam: 80, color: g < 4.2 ? VERDE : "#fff" });
  chip([["11 años", AMARILLO], ["de trabajo", "#fff"]], 540, 300, { tam: 40, ...aparece(t, tO) });
};

// "Así que la Torre de Pisa no se cae porque su peso todavía apunta a su propia base. Y la cuidan para que siga así."
ESCENAS.cierre = (inf) => {
  const t = inf.t;
  const tP = inf.cuando("peso") - 0.3, tC = inf.cuando("cuidan") - 0.3;
  suelo(880);
  torre(540, 880, 4, 1, 8, { cg: entre(t, tP, tP + 0.5) });
  caja(540 - 83, 872, 166, 16, 8, `rgba(94,224,138,${entre(t, tP + 0.4, tP + 0.8)})`);
  chip([["El peso apunta", "#fff"], ["a la base", VERDE]], 540, 300, { tam: 40, ...aparece(t, tP) });
  chip("Y la vigilan", 740, 980, { tam: 32, ...aparece(t, tC) });
};
