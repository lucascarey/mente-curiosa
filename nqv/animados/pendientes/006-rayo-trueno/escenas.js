// Escenas de "¿A qué distancia cayó el rayo?". El rayo cae a la izquierda y la persona está a la derecha.

const PISO = 900, RAYO_X = 200, PERSONA_X = 860;

function nube(x, y, s = 1, color = "#3a4260") {
  ctx.save(); ctx.fillStyle = color;
  for (const [dx, dy, r] of [[-90, 10, 60], [-30, -25, 75], [50, -10, 70], [110, 15, 55], [10, 30, 70]]) {
    ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, r * s, 0, 7); ctx.fill();
  }
  ctx.restore();
}

// rayo en zigzag fijo desde (x, y0) hasta el piso
function relampago(x, y0, y1, alfa = 1, grosor = 9) {
  if (alfa <= 0) return;
  ctx.save(); ctx.globalAlpha *= alfa;
  ctx.strokeStyle = "#fffbe0"; ctx.lineWidth = grosor; ctx.lineJoin = "round"; ctx.shadowColor = "#ffe98a"; ctx.shadowBlur = 30;
  ctx.beginPath(); ctx.moveTo(x, y0);
  const pasos = 7;
  for (let k = 1; k <= pasos; k++) ctx.lineTo(x + (k < pasos ? (azar(k + 40) - 0.5) * 90 : 0), lerp(y0, y1, k / pasos));
  ctx.stroke(); ctx.restore();
}

function persona(x, y, alto = 110, color = "#fff") {
  ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 7; ctx.lineCap = "round";
  circulo(x, y - alto, alto * 0.16, color);
  ctx.beginPath();
  ctx.moveTo(x, y - alto * 0.82); ctx.lineTo(x, y - alto * 0.38);
  ctx.moveTo(x - alto * 0.25, y - alto * 0.62); ctx.lineTo(x + alto * 0.25, y - alto * 0.62);
  ctx.moveTo(x, y - alto * 0.38); ctx.lineTo(x - alto * 0.2, y);
  ctx.moveTo(x, y - alto * 0.38); ctx.lineTo(x + alto * 0.2, y);
  ctx.stroke(); ctx.restore();
}

function paisaje(destello = 0) {
  if (destello > 0) { ctx.save(); ctx.fillStyle = `rgba(255,250,220,${0.25 * destello})`; ctx.fillRect(0, 200, ANCHO, 840); ctx.restore(); }
  caja(60, PISO, 960, 18, 4, "#2b6b3f");
  nube(RAYO_X + 30, 330, 1);
}

// "Cuenta los segundos entre el relámpago y el trueno, divide por tres, y sabrás a cuántos kilómetros cayó el rayo."
ESCENAS.hook = (inf) => {
  const t = inf.t;
  estrellas(0.3);
  const tR = inf.cuando("relampago") - 0.1, tT = inf.cuando("trueno"), tD = inf.cuando("divide") - 0.1, tK = inf.cuando("kilometros") - 0.2;
  const flash = Math.max(0, 1 - (t - tR) / 0.5) * (t > tR ? 1 : 0);
  paisaje(flash);
  relampago(RAYO_X, 400, PISO, flash);
  persona(PERSONA_X, PISO);
  const seg = clamp((t - tR) / Math.max(0.5, tT - tR + 0.6)) * 6;
  if (t > tR) chip([["segundos:", "#fff"], [String(Math.floor(seg)), AMARILLO]], 540, 260, { tam: 44 });
  chip([["6 ÷ 3 =", "#fff"], ["2 km", AMARILLO]], 540, 1000, { tam: 44, escala: salto((t - tD) / 0.4), alfa: clamp((t - tD) / 0.2) });
  ctx.save(); ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 3; ctx.setLineDash([8, 10]);
  const kk = entre(t, tK, tK + 0.6);
  ctx.beginPath(); ctx.moveTo(RAYO_X, PISO + 50); ctx.lineTo(lerp(RAYO_X, PERSONA_X, kk), PISO + 50); ctx.stroke(); ctx.restore();
};

// "Un rayo calienta el aire a unos treinta mil grados. Es cinco veces más caliente que la superficie del Sol."
ESCENAS.calor = (inf) => {
  const t = inf.t;
  estrellas(0.3);
  const base = 900, alto = 560;
  const tT = inf.cuando("treinta") - 0.3, tS = inf.cuando("sol") - 0.3;
  const kr = entre(t, tT - 0.6, tT + 0.6), ks = entre(t, tS - 0.3, tS + 0.4);
  // termómetro del rayo
  caja(300 - 60, base - alto, 120, alto, 60, "#1b2244", "#6f86c6");
  caja(300 - 40, base - alto * kr, 80, alto * kr, 40, "#fffbe0");
  relampago(300, base - alto - 120, base - alto - 10, 1, 6);
  texto(`${Math.round(30000 * kr).toLocaleString("es-AR")} °C`, 300, base + 50, { tam: 42, peso: 900, color: "#fffbe0" });
  // termómetro del Sol
  caja(780 - 60, base - alto, 120, alto, 60, "#1b2244", "#6f86c6");
  caja(780 - 40, base - alto * 5500 / 30000 * ks, 80, alto * 5500 / 30000 * ks, 40, NARANJA);
  sol(780, base - alto - 70, 40, "#fff1c9", ks);
  texto("5.500 °C", 780, base + 50, { tam: 42, peso: 900, color: NARANJA, alfa: ks });
  chip("×5", 540, 450, { tam: 56, color: AMARILLO, escala: salto((t - tS - 0.4) / 0.4), alfa: clamp((t - tS - 0.4) / 0.2) });
};

// "Ese aire se expande tan rápido que explota. Esa explosión es el trueno."
ESCENAS.explosion = (inf) => {
  const t = inf.t;
  estrellas(0.3);
  const cx = 540, tE = inf.cuando("explota") - 0.2, tT = inf.cuando("trueno") - 0.2;
  relampago(cx, 260, 960, 0.6 + 0.4 * Math.sin(t * 20) ** 2, 12);
  // anillos de aire que se expanden
  for (let k = 0; k < 6; k++) {
    const r = (t - tE - k * 0.25) * 380;
    if (r <= 0 || r > 520) continue;
    ctx.save(); ctx.strokeStyle = `rgba(150,200,255,${0.8 * (1 - r / 520)})`; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.ellipse(cx, 620, r, r * 0.9, 0, 0, 7); ctx.stroke(); ctx.restore();
  }
  chip("aire que se expande", 540, 280, { tam: 38, alfa: entre(t, 0.2, 0.6) * (1 - entre(t, tT - 0.2, tT)) });
  chip("¡BOOM! = trueno", 540, 280, { tam: 46, color: AMARILLO, escala: salto((t - tT) / 0.4), alfa: clamp((t - tT) / 0.2) });
};

// "La luz del rayo te llega casi al instante. Pero el sonido es lento: tarda unos tres segundos en recorrer un kilómetro."
ESCENAS.carrera = (inf) => {
  const t = inf.t;
  estrellas(0.3);
  paisaje(0);
  const tL = inf.cuando("luz") - 0.1, tS = inf.cuando("sonido") - 0.2, tT = inf.cuando("tres") - 0.2;
  const flash = Math.max(0, 1 - (t - tL) / 0.6) * (t > tL ? 1 : 0);
  relampago(RAYO_X, 400, PISO, Math.max(flash, 0.25));
  persona(PERSONA_X, PISO);
  // carril de la luz: llega enseguida
  const yl = 560, ys = 720;
  texto("Luz", 110, yl - 50, { tam: 34, peso: 800, alinear: "left", color: AMARILLO });
  flecha(RAYO_X + 40, yl, lerp(RAYO_X + 40, PERSONA_X - 60, entre(t, tL, tL + 0.15)), yl, AMARILLO, 7, t > tL ? 1 : 0);
  if (t > tL + 0.15) chip("¡ya llegó!", 700, yl - 70, { tam: 34, color: AMARILLO });
  // carril del sonido: ondas que avanzan despacio
  texto("Sonido", 110, ys - 50, { tam: 34, peso: 800, alinear: "left", color: CELESTE, alfa: entre(t, tS, tS + 0.3) });
  const ks = clamp((t - tS) / 3.0);
  if (t > tS) {
    const x = lerp(RAYO_X + 40, PERSONA_X - 60, ks);
    for (let k = 0; k < 3; k++) {
      ctx.save(); ctx.strokeStyle = CELESTE; ctx.lineWidth = 6; ctx.globalAlpha *= 1 - k * 0.3;
      ctx.beginPath(); ctx.arc(x - k * 30, ys, 36, -0.9, 0.9); ctx.stroke(); ctx.restore();
    }
    chip([["tiempo:", "#fff"], [`${(3 * ks).toFixed(1).replace(".", ",")} s`, CELESTE]], 540, 1000, { tam: 40 });
  }
  chip([["1 km", "#fff"], ["≈ 3 s", CELESTE]], 540, 260, { tam: 42, escala: salto((t - tT) / 0.4), alfa: clamp((t - tT) / 0.2) });
};

// "Por eso, si cuentas nueve segundos, la tormenta está a unos tres kilómetros."
ESCENAS.cuenta = (inf) => {
  const t = inf.t;
  estrellas(0.3);
  paisaje(0);
  relampago(RAYO_X, 400, PISO, 0.3);
  persona(PERSONA_X, PISO);
  const tN = inf.cuando("nueve") - 0.4, tK = inf.cuando("kilometros") - 0.4;
  const seg = 9 * entre(t, tN, tK);
  // regla de kilómetros: 3 tramos
  for (let k = 0; k <= 3; k++) {
    const x = lerp(RAYO_X, PERSONA_X, k / 3);
    ctx.save(); ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x, PISO + 30); ctx.lineTo(x, PISO + 60); ctx.stroke(); ctx.restore();
    if (k > 0) texto(`${k} km`, x, PISO + 95, { tam: 30, alfa: seg >= k * 3 ? 1 : 0.3, color: seg >= k * 3 ? AMARILLO : "#fff" });
  }
  // el sonido avanza
  const x = lerp(RAYO_X, PERSONA_X, seg / 9);
  ctx.save(); ctx.strokeStyle = CELESTE; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(x, 780, 40, -0.9, 0.9); ctx.stroke(); ctx.restore();
  texto(String(Math.floor(seg)), 540, 480, { tam: 150, peso: 900, color: "#fff", alfa: entre(t, tN, tN + 0.2) });
  texto("segundos", 540, 580, { tam: 36, alfa: entre(t, tN, tN + 0.2) });
  chip([["9 ÷ 3 =", "#fff"], ["3 km", AMARILLO]], 540, 260, { tam: 44, escala: salto((t - tK) / 0.4), alfa: clamp((t - tK) / 0.2) });
};

// "Y ojo: si llegas a oír el trueno, ya estás lo bastante cerca como para que te caiga un rayo. Busca refugio."
ESCENAS.refugio = (inf) => {
  const t = inf.t;
  estrellas(0.3);
  const tO = inf.cuando("oir") - 0.2, tB = inf.cuando("refugio") - 0.4;
  const flash = (Math.sin(t * 3) > 0.97) ? 1 : 0;
  paisaje(flash);
  relampago(RAYO_X, 400, PISO, 0.3 + 0.7 * flash);
  // casa a la derecha
  const hx = 820;
  caja(hx - 110, PISO - 180, 220, 180, 6, "#5a3d2b", "#c49a6c");
  ctx.save(); ctx.fillStyle = "#9b3b2e"; ctx.beginPath(); ctx.moveTo(hx - 140, PISO - 180); ctx.lineTo(hx, PISO - 300); ctx.lineTo(hx + 140, PISO - 180); ctx.closePath(); ctx.fill(); ctx.restore();
  caja(hx - 30, PISO - 100, 60, 100, 6, "#2a1c13");
  // la persona corre a la casa
  const kp = entre(t, tB, tB + 0.9);
  if (kp < 1) persona(lerp(560, hx, kp), PISO, 110, "#fff");
  chip([["Si oyes trueno:", "#fff"], ["estás en riesgo", ROJO]], 540, 260, { tam: 38, escala: salto((t - tO) / 0.4), alfa: clamp((t - tO) / 0.2) });
  chip("¡Adentro!", hx, PISO - 360, { tam: 42, color: AMARILLO, escala: salto((t - tB) / 0.4), alfa: clamp((t - tB) / 0.2) });
};

// "O sea, el trueno es aire explotando, y contar segundos te dice qué tan cerca está la tormenta."
ESCENAS.cierre = (inf) => {
  const t = inf.t;
  estrellas(0.3);
  paisaje(0);
  relampago(RAYO_X, 400, PISO, 0.5 + 0.5 * Math.sin(t * 9) ** 8);
  persona(PERSONA_X, PISO);
  const tC = inf.cuando("contar") - 0.2;
  chip([["segundos ÷ 3", "#fff"], ["= km", AMARILLO]], 540, 1000, { tam: 46, escala: salto((t - tC) / 0.4), alfa: clamp((t - tC) / 0.2) });
};
