// Escenas de "¿Cómo sabe el GPS dónde estás?". La Tierra abajo, satélites en órbita y círculos de distancia.

const aparece = (t, t0) => ({ escala: salto((t - t0) / 0.4), alfa: clamp((t - t0) / 0.2) });

function planeta(x, y, r) {
  circulo(x, y, r, "#1d4f8f");
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.clip(); ctx.fillStyle = "#2f8f5b";
  ctx.beginPath(); ctx.ellipse(x - r * 0.3, y - r * 0.2, r * 0.35, r * 0.25, 0.4, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + r * 0.35, y + r * 0.25, r * 0.3, r * 0.2, -0.3, 0, 7); ctx.fill();
  ctx.restore();
}

function satelite(x, y, esc = 1, color = "#e8ecff") {
  ctx.save(); ctx.translate(x, y); ctx.scale(esc, esc);
  ctx.fillStyle = AZUL; ctx.fillRect(-70, -14, 46, 28); ctx.fillRect(24, -14, 46, 28);
  ctx.fillStyle = color; ctx.fillRect(-22, -22, 44, 44);
  ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-24, 0); ctx.lineTo(24, 0); ctx.stroke();
  ctx.restore();
}

function celular(x, y, esc = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(esc, esc);
  caja(-32, -58, 64, 116, 12, "#222842", "#cfd6ff");
  caja(-24, -46, 48, 84, 6, "rgba(110,210,235,0.35)");
  ctx.restore();
}

// "Tu celular sabe dónde estás gracias a relojes que flotan a veinte mil kilómetros de altura."
ESCENAS.hook = (inf) => {
  const t = inf.t;
  const tR = inf.cuando("relojes") - 0.3, tV = inf.cuando("veinte") - 0.3;
  planeta(540, 1150, 330);
  celular(540, 800, 0.9);
  // pin de ubicación que late
  const p = 1 + Math.sin(t * 5) * 0.08;
  circulo(540, 700, 24 * p, ROJO);
  const kr = entre(t, tR, tR + 0.6);
  satelite(540, 440, kr * 1.1);
  ctx.save(); ctx.setLineDash([12, 12]); ctx.strokeStyle = `rgba(255,255,255,${0.6 * kr})`; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(540, 480); ctx.lineTo(540, 680); ctx.stroke(); ctx.restore();
  chip([["A", "#fff"], ["20.000 km", AMARILLO], ["de altura", "#fff"]], 540, 300, { tam: 40, ...aparece(t, tV) });
};

// "Hay unos treinta satélites GPS girando alrededor de la Tierra. Cada uno lleva un reloj atómico muy preciso y transmite la hora todo el tiempo."
ESCENAS.satelites = (inf) => {
  const t = inf.t;
  const tT = inf.cuando("treinta") - 0.3, tA = inf.cuando("atomico") - 0.3, tH = inf.cuando("hora") - 0.3;
  const cx = 540, cy = 660;
  planeta(cx, cy, 150);
  // tres órbitas inclinadas con satélites
  const k = entre(t, tT, tT + 1);
  for (let o = 0; o < 3; o++) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(o * Math.PI / 3);
    ctx.strokeStyle = `rgba(255,255,255,${0.25 * k})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, 360, 140, 0, 0, 7); ctx.stroke();
    for (let s = 0; s < 4; s++) {
      const a = t * 0.4 + s * Math.PI / 2 + o;
      ctx.save(); ctx.globalAlpha *= k; ctx.translate(Math.cos(a) * 360, Math.sin(a) * 140); ctx.rotate(-o * Math.PI / 3); satelite(0, 0, 0.35); ctx.restore();
    }
    ctx.restore();
  }
  chip([["Unos", "#fff"], ["30 satélites", AMARILLO]], 540, 300, { tam: 42, ...aparece(t, tT) });
  chip([["Reloj", "#fff"], ["atómico", CELESTE]], 300, 960, { tam: 34, ...aparece(t, tA) });
  chip("Envían la hora", 760, 960, { tam: 34, ...aparece(t, tH) });
};

// "Tu celular recibe esa señal y mide cuánto tardó en llegar. Como viaja a la velocidad de la luz, eso le dice a qué distancia está el satélite."
ESCENAS.distancia = (inf) => {
  const t = inf.t;
  const tS = inf.cuando("senal") - 0.3, tT = inf.cuando("tardo") - 0.3, tL = inf.cuando("luz") - 0.3, tD = inf.cuando("distancia") - 0.3;
  satelite(220, 440, 0.9); celular(820, 860, 0.9);
  // pulso que viaja del satélite al celular
  if (t > tS) {
    const f = ((t - tS) * 0.7) % 1;
    for (let j = 0; j < 3; j++) { const g = clamp(f - j * 0.08); circulo(lerp(260, 790, g), lerp(470, 820, g), 10, `rgba(255,209,102,${1 - j * 0.3})`); }
  }
  const kd = entre(t, tD, tD + 0.6);
  ctx.save(); ctx.globalAlpha *= kd; ctx.strokeStyle = AMARILLO; ctx.lineWidth = 4; ctx.setLineDash([14, 10]);
  ctx.beginPath(); ctx.moveTo(260, 470); ctx.lineTo(790, 820); ctx.stroke(); ctx.restore();
  texto("tiempo x velocidad de la luz", 540, 1000, { tam: 30, color: "#cfd6ff", alfa: entre(t, tL, tL + 0.5) });
  chip([["Tardó", "#fff"], ["0,07 s", AMARILLO]], 700, 520, { tam: 36, ...aparece(t, tT) });
  chip([["= la", "#fff"], ["distancia", AMARILLO]], 540, 300, { tam: 42, ...aparece(t, tD) });
};

// "Con la distancia a tres satélites, solo hay un punto posible donde puedes estar. El cuarto satélite sirve para corregir el reloj de tu celular."
ESCENAS.cruce = (inf) => {
  const t = inf.t;
  const tT = inf.cuando("tres") - 0.3, tP = inf.cuando("punto") - 0.3, tC = inf.cuando("cuarto") - 0.3;
  // tres círculos que se cruzan en un punto
  const P = [560, 680];
  const S = [[330, 520], [800, 560], [470, 900]];
  ctx.save(); ctx.beginPath(); ctx.rect(0, 220, 1080, 810); ctx.clip();
  S.forEach(([x, y], j) => {
    const k = entre(t, tT + j * 0.3, tT + j * 0.3 + 0.6);
    const r = Math.hypot(P[0] - x, P[1] - y);
    ctx.save(); ctx.strokeStyle = [CELESTE, NARANJA, VIOLETA][j]; ctx.lineWidth = 5; ctx.globalAlpha *= 0.85;
    ctx.beginPath(); ctx.arc(x, y, r * k, 0, 7); ctx.stroke(); ctx.restore();
    satelite(x, y, 0.75);
  });
  ctx.restore();
  const kp = entre(t, tP, tP + 0.4);
  circulo(P[0], P[1], 20 * kp * (1 + Math.sin(t * 6) * 0.1), ROJO, "#fff", 4);
  const kc = entre(t, tC, tC + 0.5);
  satelite(880, 860, 0.75 * kc + 0.001, AMARILLO);
  chip("4º: corrige el reloj", 600, 1000, { tam: 30, ...aparece(t, tC + 0.3) });
  chip([["3 distancias =", "#fff"], ["1 punto", ROJO]], 540, 300, { tam: 42, ...aparece(t, tP) });
};

// "Y hay un detalle de película: por la relatividad, los relojes de los satélites se adelantan unos treinta y ocho microsegundos por día."
ESCENAS.relatividad = (inf) => {
  const t = inf.t;
  const tR = inf.cuando("relatividad") - 0.3, tA = inf.cuando("adelantan") - 0.3, tT = inf.cuando("treinta") - 0.3;
  // dos relojes: uno en la Tierra, otro en el satélite que corre un poco más rápido
  const reloj = (x, y, vel, etiqueta, c) => {
    circulo(x, y, 130, "rgba(255,255,255,0.05)", c, 6);
    for (let h = 0; h < 12; h++) { const a = h * Math.PI / 6; ctx.strokeStyle = c; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 110, y + Math.sin(a) * 110); ctx.lineTo(x + Math.cos(a) * 125, y + Math.sin(a) * 125); ctx.stroke(); }
    const a = t * vel - Math.PI / 2;
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 100, y + Math.sin(a) * 100); ctx.stroke();
    texto(etiqueta, x, y + 180, { tam: 34, color: c });
  };
  const ka = entre(t, tA, tA + 0.5);
  reloj(290, 600, 2, "en la Tierra", CELESTE);
  reloj(790, 600, 2 + ka * 0.6, "en el satélite", NARANJA);
  chip([["Relatividad", VIOLETA]], 540, 300, { tam: 42, ...aparece(t, tR) });
  chip([["+38", AMARILLO], ["microsegundos por día", "#fff"]], 540, 420, { tam: 34, ...aparece(t, tT) });
};

// "Parece nada, pero si no se corrigiera, el error crecería unos diez kilómetros por día."
ESCENAS.error = (inf) => {
  const t = inf.t;
  const tE = inf.cuando("error") - 0.3, tD = inf.cuando("diez") - 0.3;
  // mapa con dos pines que se separan
  caja(120, 420, 840, 540, 24, "#1a2440", "#5a6390");
  ctx.save(); ctx.beginPath(); ctx.roundRect(120, 420, 840, 540, 24); ctx.clip();
  ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 14;
  for (let j = 0; j < 6; j++) { ctx.beginPath(); ctx.moveTo(120, 460 + j * 100); ctx.lineTo(960, 430 + j * 110); ctx.stroke(); ctx.beginPath(); ctx.moveTo(180 + j * 150, 420); ctx.lineTo(220 + j * 140, 960); ctx.stroke(); }
  ctx.restore();
  const k = entre(t, tE, tD + 0.8);
  const pin = (x, y, c) => { circulo(x, y - 40, 26, c); ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x - 20, y - 26); ctx.lineTo(x, y); ctx.lineTo(x + 20, y - 26); ctx.closePath(); ctx.fill(); circulo(x, y - 40, 10, "#fff"); };
  pin(300, 720, VERDE);
  pin(lerp(300, 820, k), lerp(720, 620, k), ROJO);
  flecha(330, 700, lerp(330, 790, k), lerp(700, 610, k), AMARILLO, 5, k > 0.05 ? 1 : 0);
  texto("tú", 300, 760, { tam: 30, color: VERDE });
  chip([["Error:", "#fff"], ["+10 km por día", ROJO]], 540, 300, { tam: 42, ...aparece(t, tD) });
};

// "Así que cada vez que abres el mapa, estás usando la teoría de Einstein sin darte cuenta."
ESCENAS.cierre = (inf) => {
  const t = inf.t;
  const tM = inf.cuando("mapa") - 0.3, tE = inf.cuando("einstein") - 0.3;
  celular(540, 640, 2.4 * entre(t, 0, 0.5) + 0.01);
  const km = entre(t, tM, tM + 0.5);
  circulo(540, 600, 22 * km * (1 + Math.sin(t * 5) * 0.1), ROJO, "#fff", 3);
  chip([["Mapa =", "#fff"], ["teoría de Einstein", AMARILLO]], 540, 300, { tam: 40, ...aparece(t, tE) });
};
