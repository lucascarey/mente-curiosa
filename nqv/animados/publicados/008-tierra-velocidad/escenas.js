// Escenas de "¿A qué velocidad te mueves ahora?".

function tierra(x, y, r, giro = 0) {
  circulo(x, y, r, "#2f6fd0", "#8fc2ff", 3);
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.clip();
  ctx.fillStyle = "#3fae6a";
  // continentes que se desplazan con el giro
  for (let k = 0; k < 4; k++) {
    const cx = x - r + ((k * 0.55 * r + giro * r) % (2.2 * r)) - 0.1 * r;
    ctx.beginPath(); ctx.ellipse(cx, y + (azar(k) - 0.5) * r, r * 0.25, r * 0.35, 0.3, 0, 7); ctx.fill();
  }
  ctx.restore();
}

// velocímetro semicircular con aguja de 0 a 1
function velocimetro(x, y, r, k, texto_, color = AMARILLO) {
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 22; ctx.lineCap = "round";
  ctx.beginPath(); ctx.arc(x, y, r, Math.PI, 2 * Math.PI); ctx.stroke();
  ctx.strokeStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 16;
  ctx.beginPath(); ctx.arc(x, y, r, Math.PI, Math.PI + Math.PI * clamp(k)); ctx.stroke();
  ctx.restore();
  const a = Math.PI + Math.PI * clamp(k);
  ctx.save(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 8; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * (r - 30), y + Math.sin(a) * (r - 30)); ctx.stroke(); ctx.restore();
  circulo(x, y, 14, "#fff");
  texto(texto_, x, y + 70, { tam: 54, peso: 900, color });
  texto("km/h", x, y + 125, { tam: 32, color: "rgba(255,255,255,0.75)" });
}

const miles = n => Math.round(n).toLocaleString("es-AR");

// "Ahora mismo, mientras ves esto, te estás moviendo a más de cien mil kilómetros por hora."
ESCENAS.hook = (inf) => {
  const t = inf.t;
  estrellas(0.7);
  const tC = inf.cuando("cien") - 0.4;
  const k = entre(t, tC, tC + 1.2);
  velocimetro(540, 700, 300, k, miles(107000 * k));
  chip("Tú, en el sillón:", 540, 300, { tam: 40, alfa: entre(t, 0.2, 0.5) });
};

// "Primero, la Tierra gira sobre sí misma. En el ecuador, eso son unos mil seiscientos setenta kilómetros por hora."
ESCENAS.giro = (inf) => {
  const t = inf.t;
  estrellas(0.7);
  const x = 540, y = 600, r = 260;
  tierra(x, y, r, t * 0.25);
  // ecuador
  ctx.save(); ctx.strokeStyle = AMARILLO; ctx.lineWidth = 4; ctx.setLineDash([10, 10]);
  ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.12, 0, 0, Math.PI); ctx.stroke(); ctx.restore();
  const tE = inf.cuando("ecuador") - 0.3, tM = inf.cuando("mil") - 0.3;
  texto("ecuador", x + r + 20, y + 10, { tam: 30, alinear: "left", color: AMARILLO, alfa: entre(t, tE, tE + 0.3) });
  // flecha del giro
  flecha(x - 200, y - r - 40, x + 200, y - r - 40, "#fff", 6, entre(t, 0.2, 0.9));
  const k = entre(t, tM, tM + 1.0);
  chip([["Giro:", "#fff"], [`${miles(1670 * k)} km/h`, AMARILLO]], 540, 960, { tam: 42, alfa: clamp((t - tM) / 0.2) });
};

// "Segundo, la Tierra da la vuelta alrededor del Sol, a unos ciento siete mil kilómetros por hora."
ESCENAS.orbita = (inf) => {
  const t = inf.t;
  estrellas(0.8);
  const cx = 540, cy = 600, r = 330;
  sol(cx, cy, 70);
  ctx.save(); ctx.strokeStyle = "rgba(143,176,255,0.5)"; ctx.lineWidth = 3; ctx.setLineDash([8, 12]);
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke(); ctx.restore();
  const a = -Math.PI / 2 + t * 0.9;
  const ex = cx + Math.cos(a) * r, ey = cy + Math.sin(a) * r;
  // estela
  ctx.save(); ctx.strokeStyle = CELESTE; ctx.lineWidth = 8; ctx.lineCap = "round"; ctx.shadowColor = CELESTE; ctx.shadowBlur = 14;
  ctx.beginPath(); ctx.arc(cx, cy, r, a - 0.7, a); ctx.stroke(); ctx.restore();
  tierra(ex, ey, 36, t);
  const tC = inf.cuando("ciento") - 0.3;
  const k = entre(t, tC, tC + 1.0);
  chip([["Órbita:", "#fff"], [`${miles(107000 * k)} km/h`, AMARILLO]], 540, 1000, { tam: 42, alfa: clamp((t - tC) / 0.2) });
};

// "Y el Sol, con todos sus planetas, gira alrededor de la galaxia a más de ochocientos mil kilómetros por hora."
ESCENAS.galaxia = (inf) => {
  const t = inf.t;
  estrellas(0.4);
  const cx = 540, cy = 600;
  // galaxia espiral de puntitos
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 0.12); ctx.scale(1, 0.55);
  for (let k = 0; k < 900; k++) {
    const brazo = k % 2, d = 20 + azar(k) * 420;
    const a = d / 70 + brazo * Math.PI + (azar(k + 3) - 0.5) * 0.7;
    ctx.fillStyle = `rgba(${200 + 55 * azar(k + 5)},${190 + 40 * azar(k + 6)},255,${0.35 + 0.5 * (1 - d / 440)})`;
    ctx.fillRect(Math.cos(a) * d, Math.sin(a) * d, 3, 3);
  }
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 90);
  g.addColorStop(0, "rgba(255,240,200,0.9)"); g.addColorStop(1, "rgba(255,240,200,0)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 90, 0, 7); ctx.fill();
  // el Sol: un punto marcado en un brazo
  const sa = 4.1, sd = 270;
  ctx.restore();
  const ang = t * 0.12, px = cx + Math.cos(sa + ang) * sd, py = cy + Math.sin(sa + ang) * sd * 0.55;
  const tS = inf.cuando("sol") - 0.2;
  circulo(px, py, 12, AMARILLO);
  ctx.save(); ctx.strokeStyle = AMARILLO; ctx.lineWidth = 3; ctx.globalAlpha *= entre(t, tS, tS + 0.3);
  ctx.beginPath(); ctx.arc(px, py, 34 + 6 * Math.sin(t * 5), 0, 7); ctx.stroke(); ctx.restore();
  chip("Estamos aquí", px, py - 80, { tam: 34, color: AMARILLO, alfa: entre(t, tS, tS + 0.3) });
  const tO = inf.cuando("ochocientos") - 0.3;
  const k = entre(t, tO, tO + 1.0);
  chip([["Galaxia:", "#fff"], [`+${miles(800000 * k)} km/h`, AMARILLO]], 540, 1000, { tam: 42, alfa: clamp((t - tO) / 0.2) });
};

// "¿Y por qué no lo sentimos? Porque esa velocidad es constante. El cuerpo solo nota los cambios: acelerar, frenar o doblar."
ESCENAS.constante = (inf) => {
  const t = inf.t;
  estrellas(0.3);
  const X0 = 150, X1 = 960, Y0 = 760, Y1 = 380;
  ctx.save(); ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(X0, Y1 - 20); ctx.lineTo(X0, Y0); ctx.lineTo(X1 + 20, Y0); ctx.stroke(); ctx.restore();
  texto("velocidad", X0 + 20, Y1 - 35, { tam: 28, alinear: "left", color: "rgba(255,255,255,0.6)" });
  texto("tiempo", X1 - 40, Y0 + 40, { tam: 28, color: "rgba(255,255,255,0.6)" });
  const tC = inf.cuando("constante") - 0.4, tA = inf.cuando("acelerar") - 0.2, tF = inf.cuando("frenar") - 0.2;
  // línea plana (no se siente) y después un salto (se siente)
  const hasta = lerp(X0, X1, entre(t, tC, inf.dur - 0.3));
  const v = x => {
    let y = 520;
    if (x > 640) y -= 100 * clamp((x - 640) / 60);   // acelera
    if (x > 820) y += 180 * clamp((x - 820) / 50);   // frena
    return y;
  };
  ctx.save(); ctx.strokeStyle = CELESTE; ctx.lineWidth = 8; ctx.lineJoin = "round"; ctx.shadowColor = CELESTE; ctx.shadowBlur = 12;
  ctx.beginPath();
  for (let x = X0; x <= hasta; x += 4) x === X0 ? ctx.moveTo(x, v(x)) : ctx.lineTo(x, v(x));
  ctx.stroke(); ctx.restore();
  chip("plano: no se siente", 400, 440, { tam: 34, alfa: entre(t, tC + 0.3, tC + 0.6) });
  chip("¡cambio: se siente!", 760, 330, { tam: 36, color: NARANJA, escala: salto((t - tA) / 0.4), alfa: clamp((t - tA) / 0.2) });
  if (t > tF) chip("¡frenazo!", 860, 860, { tam: 34, color: NARANJA, escala: salto((t - tF) / 0.4) });
};

function avion(x, y, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = "#e8edf5";
  ctx.beginPath(); ctx.ellipse(0, 0, 200, 38, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(-90, 120); ctx.lineTo(-40, 120); ctx.lineTo(50, 0); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-150, -10); ctx.lineTo(-200, -90); ctx.lineTo(-170, -90); ctx.lineTo(-110, -10); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#3d7bff";
  for (let k = 0; k < 8; k++) circulo(-110 + k * 34, -8, 8, "#3d7bff");
  ctx.restore();
}

// "Es como en un avión a novecientos kilómetros por hora: si no hay turbulencia, puedes servirte un café tranquilo."
ESCENAS.avion = (inf) => {
  const t = inf.t;
  estrellas(0.2);
  // nubes que pasan rapidísimo de fondo
  for (let k = 0; k < 6; k++) {
    const x = 1100 - ((t * 700 + k * 260) % 1300), y = 300 + azar(k) * 600;
    ctx.save(); ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.beginPath(); ctx.ellipse(x, y, 120, 30, 0, 0, 7); ctx.fill(); ctx.restore();
  }
  avion(540, 470, 1.2);
  const tN = inf.cuando("novecientos") - 0.3, tC = inf.cuando("cafe") - 0.4;
  chip([["", "#fff"], ["900 km/h", AMARILLO]], 540, 300, { tam: 42, escala: salto((t - tN) / 0.4), alfa: clamp((t - tN) / 0.2) });
  // taza de café quieta, con el líquido bien horizontal
  const kc = entre(t, tC, tC + 0.4);
  if (kc > 0) {
    ctx.save(); ctx.globalAlpha *= kc;
    caja(470, 760, 140, 150, 18, "#f4f1e8", "#fff");
    caja(485, 780, 110, 26, 8, "#6b4426");
    ctx.strokeStyle = "#f4f1e8"; ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(615, 830, 34, -1.2, 1.2); ctx.stroke();
    for (let k = 0; k < 3; k++) {
      ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(500 + k * 35, 740); ctx.quadraticCurveTo(515 + k * 35 + Math.sin(t * 3 + k) * 10, 710, 500 + k * 35, 680); ctx.stroke();
    }
    ctx.restore();
    chip("ni se mueve", 790, 840, { tam: 36, color: CELESTE, alfa: kc });
  }
};

// "Así que nunca estás quieto: solo vas a la misma velocidad que todo lo que te rodea."
ESCENAS.cierre = (inf) => {
  const t = inf.t;
  estrellas(0.8);
  const filas = [["Giro", 1670 / 828000, "1.670"], ["Órbita", 107000 / 828000, "107.000"], ["Galaxia", 1, "+800.000"]];
  filas.forEach(([n, v, km], k) => {
    const y = 420 + k * 170, a = entre(t, 0.2 + k * 0.3, 0.6 + k * 0.3);
    texto(n, 90, y - 45, { tam: 36, peso: 800, alinear: "left", alfa: a });
    texto(`${km} km/h`, 990, y - 45, { tam: 32, alinear: "right", color: "rgba(255,255,255,0.8)", alfa: a });
    caja(90, y - 18, Math.max(12, 860 * v * a), 44, 12, [CELESTE, AZUL, VIOLETA][k]);
  });
  const tQ = inf.cuando("quieto") - 0.2;
  chip([["Quieto:", "#fff"], ["nunca", AMARILLO]], 540, 960, { tam: 44, escala: salto((t - tQ) / 0.4), alfa: clamp((t - tQ) / 0.2) });
};
