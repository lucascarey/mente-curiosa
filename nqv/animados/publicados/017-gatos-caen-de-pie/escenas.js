// Escenas de "¿Por qué los gatos caen de pie?". Gato esquemático en dos mitades que giran por separado.

const aparece = (t, t0) => ({ escala: salto((t - t0) / 0.4), alfa: clamp((t - t0) / 0.2) });
const GATO = "#ff9f5a", RAYA = "#c96a2c";

// media mitad del gato: rot = 0 patas abajo, Math.PI patas arriba. lado = -1 adelante (cabeza), 1 atrás (cola)
function mitad(x, y, rot, lado, esc = 1, recogidas = false) {
  ctx.save(); ctx.translate(x, y); ctx.scale(esc, esc);
  // el giro alrededor del eje del cuerpo se ve como un aplastamiento vertical
  ctx.scale(1, Math.cos(rot) || 0.001);
  ctx.fillStyle = GATO;
  caja(lado < 0 ? -110 : 0, -45, 110, 90, 40, GATO);
  ctx.fillStyle = RAYA; for (let k = 0; k < 2; k++) ctx.fillRect(lado * (30 + k * 30) - 6, -45, 12, 30);
  // patas
  ctx.strokeStyle = GATO; ctx.lineWidth = 18; ctx.lineCap = "round";
  const largo = recogidas ? 25 : 70;
  ctx.beginPath(); ctx.moveTo(lado * 40, 30); ctx.lineTo(lado * 40, 30 + largo); ctx.moveTo(lado * 85, 30); ctx.lineTo(lado * 85, 30 + largo); ctx.stroke();
  if (lado < 0) {
    // cabeza con orejas
    circulo(-135, -40, 48, GATO);
    ctx.beginPath(); ctx.moveTo(-170, -70); ctx.lineTo(-160, -115); ctx.lineTo(-135, -82); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-100, -70); ctx.lineTo(-110, -115); ctx.lineTo(-135, -82); ctx.closePath(); ctx.fill();
    circulo(-150, -45, 6, FONDO); circulo(-118, -45, 6, FONDO);
  } else {
    // cola
    ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(105, -20); ctx.quadraticCurveTo(190, -40, 180, -120); ctx.stroke();
  }
  ctx.restore();
}

function gato(x, y, rotA, rotB, esc = 1, recA = false, recB = false) {
  mitad(x, y, rotB, 1, esc, recB);
  mitad(x, y, rotA, -1, esc, recA);
}

// "Un gato que cae de espaldas puede darse vuelta en el aire, sin apoyarse en nada, en menos de medio segundo."
ESCENAS.hook = (inf) => {
  const t = inf.t;
  const tV = inf.cuando("vuelta") - 0.3, tM = inf.cuando("medio") - 0.3;
  const caida = entre(t, 0, inf.dur);
  const giro = entre(t, tV, tV + 1.2);
  gato(540, lerp(420, 820, caida), Math.PI * (1 - giro), Math.PI * (1 - entre(t, tV + 0.4, tV + 1.4)), 1);
  ctx.save(); ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 4; ctx.setLineDash([14, 12]);
  ctx.beginPath(); ctx.moveTo(140, 1000); ctx.lineTo(940, 1000); ctx.stroke(); ctx.restore();
  chip([["Se da vuelta en", "#fff"], ["menos de 0,5 s", AMARILLO]], 540, 300, { tam: 40, ...aparece(t, tM) });
};

function oidoDibujo(x, y, k) {
  ctx.save(); ctx.globalAlpha *= k; ctx.translate(x, y); ctx.scale(1.7, 1.7); ctx.translate(-x, -y); ctx.strokeStyle = CELESTE; ctx.lineWidth = 6; ctx.lineCap = "round";
  // tres canales semicirculares del oído interno
  ctx.beginPath(); ctx.arc(x, y - 30, 50, Math.PI * 0.9, Math.PI * 2.1); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(x + 40, y + 10, 28, 55, 0.6, 0, 7); ctx.stroke();
  ctx.beginPath(); ctx.arc(x - 30, y + 20, 35, Math.PI * 0.2, Math.PI * 1.4); ctx.stroke();
  circulo(x, y + 25, 22, CELESTE);
  ctx.restore();
}

// "Primero, el oído interno le avisa hacia dónde está el suelo. Ahí arranca el giro."
ESCENAS.oido = (inf) => {
  const t = inf.t;
  const tO = inf.cuando("oido") - 0.3, tS = inf.cuando("suelo") - 0.3, tG = inf.cuando("giro") - 0.3;
  gato(330, 600, Math.PI * (1 - 0.15 * entre(t, tG, tG + 0.8)), Math.PI, 1.1);
  oidoDibujo(800, 560, entre(t, tO, tO + 0.5));
  chip([["Oído", "#fff"], ["interno", CELESTE]], 800, 400, { tam: 34, ...aparece(t, tO) });
  // flecha "suelo" hacia abajo
  flecha(800, 730, 800, 930, AMARILLO, 8, entre(t, tS, tS + 0.5));
  texto("suelo", 800, 975, { tam: 36, color: AMARILLO, alfa: entre(t, tS, tS + 0.5) });
  chip("¿Dónde está el suelo?", 540, 300, { tam: 40, ...aparece(t, 0.3) });
};

// "Después se dobla por la cintura y gira la mitad de adelante, con las patas delanteras recogidas para girar más rápido."
ESCENAS.adelante = (inf) => {
  const t = inf.t;
  const tD = inf.cuando("dobla") - 0.3, tG = inf.cuando("gira") - 0.3, tR = inf.cuando("recogidas") - 0.3;
  const gira = entre(t, tG, tG + 1.4);
  gato(540, 640, Math.PI * (1 - gira), Math.PI, 1.3, t > tR);
  // marca de la cintura
  const kd = entre(t, tD, tD + 0.4);
  ctx.save(); ctx.globalAlpha *= kd; ctx.setLineDash([10, 8]); ctx.strokeStyle = AMARILLO; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(540, 500); ctx.lineTo(540, 780); ctx.stroke(); ctx.restore();
  texto("cintura", 540, 820, { tam: 32, color: AMARILLO, alfa: kd });
  // flecha de giro curva sobre la mitad de adelante
  if (gira > 0 && gira < 1) { ctx.save(); ctx.strokeStyle = CELESTE; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(380, 640, 190, -0.6, -0.6 + gira * 3); ctx.stroke(); ctx.restore(); }
  chip([["1º gira", "#fff"], ["la mitad de adelante", CELESTE]], 540, 300, { tam: 38, ...aparece(t, tG) });
  chip("Patas recogidas = más rápido", 540, 960, { tam: 32, ...aparece(t, tR) });
};

// "Recién entonces gira la mitad de atrás. Como cada mitad gira por separado, no necesita apoyarse en nada."
ESCENAS.atras = (inf) => {
  const t = inf.t;
  const tG = inf.cuando("gira") - 0.3, tS = inf.cuando("separado") - 0.3;
  const gira = entre(t, tG, tG + 1.4);
  gato(540, 640, 0, Math.PI * (1 - gira), 1.3, false, gira < 1);
  if (gira > 0 && gira < 1) { ctx.save(); ctx.strokeStyle = NARANJA; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(700, 640, 190, Math.PI + 0.6, Math.PI + 0.6 - gira * 3, true); ctx.stroke(); ctx.restore(); }
  chip([["2º gira", "#fff"], ["la mitad de atrás", NARANJA]], 540, 300, { tam: 38, ...aparece(t, tG) });
  chip("Cada mitad por separado", 540, 960, { tam: 34, ...aparece(t, tS) });
};

// "Al final estira las patas y arquea la espalda para amortiguar el golpe."
ESCENAS.aterriza = (inf) => {
  const t = inf.t;
  const tE = inf.cuando("estira") - 0.3, tA = inf.cuando("arquea") - 0.3, tG = inf.cuando("golpe") - 0.3;
  const baja = entre(t, 0, tG + 0.2);
  const aplasta = entre(t, tG, tG + 0.3) * (1 - entre(t, tG + 0.3, tG + 0.8));
  ctx.save(); ctx.translate(540, lerp(520, 790, baja)); ctx.scale(1 + aplasta * 0.12, 1 - aplasta * 0.15);
  // espalda arqueada: las dos mitades levemente inclinadas
  const arco = entre(t, tA, tA + 0.5) * 0.18;
  ctx.save(); ctx.rotate(-arco); mitad(0, 0, 0, 1, 1.2, false); ctx.restore();
  ctx.save(); ctx.rotate(arco); mitad(0, 0, 0, -1, 1.2, false); ctx.restore();
  ctx.restore();
  ctx.fillStyle = "#3a3f5c"; ctx.fillRect(100, 920, 880, 20);
  chip("Estira las patas", 290, 420, { tam: 34, ...aparece(t, tE) });
  chip("Arquea la espalda", 790, 420, { tam: 34, ...aparece(t, tA) });
  chip([["Amortigua", AMARILLO], ["el golpe", "#fff"]], 540, 300, { tam: 40, ...aparece(t, tG) });
};

// "Los gatitos aprenden este reflejo entre las tres y las siete semanas de vida. Y necesitan algo de altura: desde muy bajo no les da el tiempo."
ESCENAS.gatitos = (inf) => {
  const t = inf.t;
  const tS = inf.cuando("tres") - 0.3, tA = inf.cuando("altura") - 0.3;
  const salida = entre(t, tA - 0.3, tA + 0.2);
  ctx.save(); ctx.globalAlpha *= 1 - salida;
  // línea de tiempo de semanas
  const x0 = 140, x1 = 940, y = 680;
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
  for (let s = 0; s <= 8; s++) { const x = lerp(x0, x1, s / 8); ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.lineTo(x, y + 12); ctx.stroke(); texto(String(s), x, y + 50, { tam: 30 }); }
  const k = entre(t, tS, tS + 1);
  caja(lerp(x0, x1, 3 / 8), y - 40, (x1 - x0) * 4 / 8 * k, 80, 14, "rgba(255,159,90,0.55)");
  texto("semanas", 540, y + 110, { tam: 32, color: "#9aa3c7" });
  mitad(lerp(x0, x1, 5 / 8) + 40, 520, 0, 1, 0.5); mitad(lerp(x0, x1, 5 / 8) + 40, 520, 0, -1, 0.5);
  chip([["Lo aprenden entre", "#fff"], ["3 y 7 semanas", AMARILLO]], 540, 300, { tam: 38, ...aparece(t, tS) });
  ctx.restore();
  if (salida > 0) {
    ctx.save(); ctx.globalAlpha *= salida;
    // dos alturas: muy bajo (no alcanza a girar) y suficiente
    ctx.fillStyle = "#3a3f5c"; ctx.fillRect(100, 920, 880, 20);
    const g = entre(t, tA, tA + 1.2);
    gato(300, lerp(820, 860, g), Math.PI * (1 - 0.4 * g), Math.PI, 0.6);
    gato(780, lerp(420, 860, g), Math.PI * (1 - g), Math.PI * (1 - entre(t, tA + 0.3, tA + 1.2)), 0.6);
    chip("Muy bajo: no le da el tiempo", 330, 470, { tam: 30, color: ROJO });
    chip([["Necesitan", "#fff"], ["algo de altura", AMARILLO]], 540, 300, { tam: 38 });
    ctx.restore();
  }
};

// "Así que el gato no tiene suerte: tiene un cuerpo que gira por partes."
ESCENAS.cierre = (inf) => {
  const t = inf.t;
  const tS = inf.cuando("suerte") - 0.3, tP = inf.cuando("partes") - 0.4;
  // vuelve a girar en bucle, mitad por mitad
  const c = (t * 0.5) % 1;
  gato(540, 640, Math.PI * (1 - entre(c, 0.1, 0.4)), Math.PI * (1 - entre(c, 0.45, 0.75)), 1.2);
  chip("No es suerte", 300, 940, { tam: 36, ...aparece(t, tS) });
  chip([["Gira", "#fff"], ["por partes", AMARILLO]], 540, 300, { tam: 44, ...aparece(t, tP) });
};
