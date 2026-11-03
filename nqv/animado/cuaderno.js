// Estilo "cuaderno": todo dibujado con birome en una hoja rayada (birome azul, tramado para las sombras,
// letras globo con sombra tramada, notas a mano, lapicera roja para lo que está mal).
//
// Las escenas de cada video (escenas.js) siguen escritas como siempre, con ctx.fill / stroke / fillText y los
// ayudantes de la plantilla. Mientras se dibuja una escena, `ctx` pasa a ser BIROME: un contexto que anota los
// trazos y los redibuja a mano:
//   stroke()   -> línea de birome temblorosa, con presión variable y gotitas de tinta
//   fill()     -> tramado (rayitas a 45°, y cruzadas del lado de la sombra) + contorno
//   fillText() -> letras globo (texto grande) o letra a mano (texto chico)
//   alfa < 1   -> en vez de aparecer transparente, se va dibujando (el trazo crece, el texto se escribe)
// Los colores se pasan a biromes de colores; el blanco es la birome azul y el amarillo es resaltador.
//
// Neurón ya no está siempre: aparece en el gancho, la intro y el cierre (o donde la línea diga "neuron": true),
// en su estilo original (en color), con una sombrita tramada. Sin Neurón la escena se agranda y ocupa la hoja.
// Todo depende solo de T: el mismo T da el mismo cuadro.

(() => {
  const W = 1080, HH = 1920;
  const REAL = ctx;
  const PAPEL = "#fbfaf5";
  const TINTAS = {
    azul: [30, 46, 150], rojo: [178, 28, 38], naranja: [200, 92, 24], verde: [18, 112, 62],
    violeta: [92, 42, 152], negro: [30, 30, 40],
  };
  const AZULT = TINTAS.azul, ROJOT = TINTAS.rojo;
  const RS = 46, RENGLON0 = 260, MARGEN = 118;  // renglones y margen rojo
  const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

  // ---------- azar con semilla y ruido (de la librería H del estilo de referencia) ----------
  function rng(seed = 1) {
    let a = (seed >>> 0) || 1;
    const r = () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.range = (lo, hi) => lo + r() * (hi - lo);
    r.chance = p => r() < p;
    return r;
  }
  function makeNoise(seed = 1) {
    const r = rng(seed), p = new Uint8Array(512), perm = [...Array(256).keys()];
    for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
    for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
    const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
    const L = (a, b, t) => a + (b - a) * t;
    const g3 = (h, x, y, z) => { h &= 15; const u = h < 8 ? x : y, v = h < 4 ? y : h === 12 || h === 14 ? x : z; return ((h & 1) ? -u : u) + ((h & 2) ? -v : v); };
    function n3(x, y, z) {
      const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
      x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
      const u = fade(x), v = fade(y), w = fade(z);
      const A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z, B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;
      return L(L(L(g3(p[AA], x, y, z), g3(p[BA], x - 1, y, z), u), L(g3(p[AB], x, y - 1, z), g3(p[BB], x - 1, y - 1, z), u), v),
        L(L(g3(p[AA + 1], x, y, z - 1), g3(p[BA + 1], x - 1, y, z - 1), u), L(g3(p[AB + 1], x, y - 1, z - 1), g3(p[BB + 1], x - 1, y - 1, z - 1), u), v), w);
    }
    const n2 = (x, y) => n3(x, y, 0.5);
    const fbm2 = (x, y, oct = 4) => { let s = 0, a = 0.5, f = 1, nn = 0; for (let i = 0; i < oct; i++) { s += a * n3(x * f, y * f, 0.5); nn += a; a *= 0.5; f *= 2; } return s / nn; };
    return { n2, fbm2 };
  }
  const nz = makeNoise(57);
  const capa = (w, h) => { const c = document.createElement("canvas"); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };

  // ---------- trazos de birome (coordenadas de pantalla) ----------
  const seg = (pts, paso = 2.5) => {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / paso));
      for (let j = 0; j < n; j++) out.push([x0 + (x1 - x0) * j / n, y0 + (y1 - y0) * j / n]);
    }
    out.push(pts[pts.length - 1]);
    return out;
  };
  const wob = (pts, seed, amp = 1.0, freq = 0.02) => {
    let L = 0;
    return pts.map((p, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
      if (i) L += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
      const o = nz.n2(L * freq + seed * 1.37, seed * 0.71) * amp + nz.n2(L * freq * 6 + seed, seed + 3.3) * amp * 0.3;
      return [p[0] - dy / d * o, p[1] + dx / d * o];
    });
  };
  // una línea de birome: presión que sube y baja, a veces la tinta saltea, gotita donde apoya
  function bpl(pts, seed, w, a, rgb, fin = true) {
    const n = pts.length; if (n < 2) return;
    const rr = rng(seed);
    const salto = rr.chance(0.25) ? Math.floor(rr.range(0.2, 0.8) * n) : -1;
    const tandas = [[], [], []];
    for (let i = 0; i < n - 1; i += 2) {
      if (salto >= 0 && i >= salto && i < salto + 2) continue;
      const nv = 0.5 + 0.5 * (0.75 * nz.n2(i * 0.022 + seed * 0.3, seed * 0.11) + 0.25 * Math.sin(i * 0.19 + seed * 1.7));
      tandas[Math.min(2, Math.floor(nv * 3))].push(i);
    }
    tandas.forEach((idx, k) => {
      if (!idx.length) return;
      const pr = 0.55 + 0.45 * (k + 0.5) / 3;
      REAL.strokeStyle = rgba(rgb, a * pr); REAL.lineWidth = w * (0.7 + 0.42 * pr);
      REAL.beginPath();
      for (const i of idx) {
        REAL.moveTo(pts[i][0], pts[i][1]); REAL.lineTo(pts[i + 1][0], pts[i + 1][1]);
        if (pts[i + 2]) REAL.lineTo(pts[i + 2][0], pts[i + 2][1]);
      }
      REAL.stroke();
    });
    if (rr.chance(0.7)) { const r0 = w * rr.range(0.9, 1.5); REAL.fillStyle = rgba(rgb, 0.85 * a); REAL.beginPath(); REAL.ellipse(pts[0][0] + 0.3, pts[0][1], r0, r0 * 0.85, rr() * 3, 0, 7); REAL.fill(); }
    if (fin && rr.chance(0.35)) { const q = pts[n - 1]; REAL.fillStyle = rgba(rgb, 0.75 * a); REAL.beginPath(); REAL.arc(q[0], q[1], w * 1.1 * rr.range(0.7, 1), 0, 7); REAL.fill(); }
  }
  // una línea a mano: temblor + 1 o 2 pasadas; k = cuánto se dibujó
  function rayar(pts, seed, w, a, rgb, k = 1, pasadas = 1) {
    if (k <= 0 || pts.length < 2) return;
    for (let j = 0; j < pasadas; j++) {
      let P = wob(seg(pts, 2.5), (seed + j * 13) % 97, 0.9 + j * 0.5);
      if (k < 1) P = P.slice(0, Math.max(2, Math.ceil(P.length * k)));
      bpl(P, seed + j * 7, j ? w * 0.6 : w, j ? a * 0.6 : a, rgb, k >= 1);
    }
  }

  // tramado dentro de un Path2D (en pantalla). caja = [x0, y0, x1, y1]; fuerza 0..1; k = cuánto se tramó
  function tramar(path, caja, rgb, fuerza = 1, k = 1, semilla = 1) {
    if (k <= 0) return;
    const [x0, y0, x1, y1] = caja, w = x1 - x0, h = y1 - y0, L = w + h;
    const rr = rng(semilla);
    REAL.save();
    REAL.clip(path);
    REAL.lineCap = "round";
    const capaT = (dir, uMin, sp, al, lw, pp) => {
      if (pp <= 0) return;
      const grupos = [[], [], []];
      if (dir === 0) {
        for (let o = uMin * L; o < L * (uMin + (1 - uMin) * pp); o += sp * (0.85 + rr() * 0.3)) {
          const c = x0 + y0 + o, ax = Math.max(x0 - 4, c - y1 - 4), bx = Math.min(x1 + 4, c - y0 + 4);
          if (bx - ax < 2) continue;
          let sx = ax;
          while (sx < bx) { const len = rr.range(26, 70), ex = Math.min(bx, sx + len), j = rr.range(-0.9, 0.9); grupos[(rr() * 3) | 0].push([sx + j, c - sx, ex + j, c - ex]); sx = ex + rr.range(-3, 1.5); }
        }
      } else {
        const corte = x0 + y0 + uMin * L;
        for (let o = -h; o < w; o += sp * (0.85 + rr() * 0.3)) {
          const kk = x0 - y0 + o;
          const sxa = Math.max(x0 - 4, y0 - 4 + kk, (corte + kk) / 2), sxb = Math.min(x1 + 4, y1 + 4 + kk);
          const span = sxb - sxa; if (span < 3) continue;
          const ex = sxa + span * Math.min(1, pp * 1.3);
          let sx = sxa;
          while (sx < ex) { const len = rr.range(22, 60), e2 = Math.min(ex, sx + len), j = rr.range(-0.9, 0.9); grupos[(rr() * 3) | 0].push([sx, sx - kk + j, e2, e2 - kk + j]); sx = e2 + rr.range(-3, 1.5); }
        }
      }
      REAL.lineWidth = lw;
      grupos.forEach((g, gi) => {
        if (!g.length) return;
        REAL.strokeStyle = rgba(rgb, al * [0.75, 0.95, 1.15][gi]);
        REAL.beginPath(); g.forEach(([ax, ay, bx, by]) => { REAL.moveTo(ax, ay); REAL.lineTo(bx, by); }); REAL.stroke();
      });
    };
    const sp = fuerza > 0.6 ? 6.5 : 9.5, al = 0.3 + 0.2 * fuerza;
    capaT(0, 0, sp, al, 1.5, clamp(k / 0.6));
    if (fuerza > 0.5 && Math.min(w, h) > 26) capaT(1, 0.5, sp + 1, al, 1.4, clamp((k - 0.35) / 0.5));
    if (fuerza > 0.75 && Math.min(w, h) > 90) capaT(0, 0.75, 4.2, al * 0.9, 1.3, clamp((k - 0.6) / 0.4));
    REAL.restore();
  }

  // ---------- colores de la escena -> biromes ----------
  const muestra = capa(1, 1).getContext("2d");
  const cacheColor = new Map();
  function tinta(estilo) {
    if (estilo && estilo.colores) {  // degradé: si es un brillo (todo transparente) no se dibuja
      const fuertes = estilo.colores.map(tinta).filter(t => t.a >= 0.45);
      return fuertes[0] || { tipo: "nada", a: 0 };
    }
    if (typeof estilo !== "string") return { tipo: "tinta", rgb: AZULT, a: 1 };
    if (cacheColor.has(estilo)) return cacheColor.get(estilo);
    muestra.fillStyle = "#000"; muestra.fillStyle = estilo;
    const s = muestra.fillStyle;
    let r, g, b, a = 1;
    if (s[0] === "#") { const n = parseInt(s.slice(1), 16); r = n >> 16 & 255; g = n >> 8 & 255; b = n & 255; }
    else { [r, g, b, a = 1] = s.match(/[\d.]+/g).map(Number); }
    const mx = Math.max(r, g, b) / 255, mn = Math.min(r, g, b) / 255, lum = (0.3 * r + 0.59 * g + 0.11 * b) / 255;
    const sat = mx ? (mx - mn) / mx : 0;
    let hue = 0;
    if (mx > mn) {
      const d = (mx - mn) * 255;
      hue = mx * 255 === r ? ((g - b) / d) % 6 : mx * 255 === g ? (b - r) / d + 2 : (r - g) / d + 4;
      hue = (hue * 60 + 360) % 360;
    }
    let res;
    if (lum < 0.13 && a > 0.5) res = { tipo: "papel", a };           // el fondo oscuro: "borra" (papel)
    else if (sat < 0.28 || lum > 0.9) res = { tipo: "tinta", rgb: AZULT, a, claro: lum };  // blanco y grises: birome azul
    else if (hue >= 42 && hue < 72) res = { tipo: "resaltador", rgb: TINTAS.negro, a };
    else if (hue >= 72 && hue < 170) res = { tipo: "tinta", rgb: TINTAS.verde, a };
    else if (hue >= 170 && hue < 250) res = { tipo: "tinta", rgb: AZULT, a };
    else if (hue >= 250 && hue < 300) res = { tipo: "tinta", rgb: TINTAS.violeta, a };
    else if (hue >= 14 && hue < 42) res = { tipo: "tinta", rgb: TINTAS.naranja, a };
    else res = { tipo: "tinta", rgb: ROJOT, a };
    cacheColor.set(estilo, res);
    return res;
  }

  // ---------- letras ----------
  const tamDe = f => +(f.match(/([\d.]+)px/) || [0, 40])[1];
  const fuenteGlobo = tam => `700 ${tam}px Fredoka`;
  const fuenteMano = tam => `400 ${tam}px "Gloria Hallelujah"`;
  const escalaDe = m => Math.hypot(m.a, m.b);
  // a partir de cuántos px en pantalla el texto va en letras globo
  const GLOBO = 56;
  function fuentePara(fuente, m) {
    const tam = tamDe(fuente);
    return tam * escalaDe(m) >= GLOBO ? fuenteGlobo(tam * 0.98) : fuenteMano(tam * 0.92);
  }

  // texto con el contexto real ya transformado; p = qué parte está escrita
  function escribir(s, x, y, fuente, alinear, base, t, p) {
    const m = REAL.getTransform();
    const globo = fuente.startsWith("700");
    const tam = tamDe(fuente);
    REAL.save();
    REAL.font = fuente; REAL.textBaseline = base; REAL.textAlign = "left";
    const ancho = REAL.measureText(s).width;
    const x0 = alinear === "center" ? x - ancho / 2 : alinear === "right" || alinear === "end" ? x - ancho : x;
    const n = Math.ceil(s.length * clamp(p));
    const parte = s.slice(0, n);
    if (!parte.trim()) { REAL.restore(); return; }
    const anchoP = REAL.measureText(parte).width;
    const rgb = t.rgb || AZULT;
    const subir = base === "middle" ? 0 : base === "top" ? tam * 0.5 : base === "bottom" ? -tam * 0.5 : -tam * 0.33;
    if (t.tipo === "resaltador") resaltar(x0 - tam * 0.1, y + subir, anchoP + tam * 0.2, tam * 0.95, hashS(s));
    REAL.globalCompositeOperation = "multiply";
    if (globo) {
      // sombra tramada: las letras corridas menos las letras, tramadas en diagonal
      const esc = escalaDe(m) * 1.0, off = tam * 0.08, pad = tam * 0.3;
      const cw = (anchoP + 2 * pad + off) * esc, ch = (tam * 1.6 + off) * esc;
      if (cw < 4000 && ch < 2000) {
        const M = capa(cw, ch), mc = M.getContext("2d");
        mc.scale(esc, esc); mc.font = fuente; mc.textBaseline = "middle"; mc.fillStyle = "#000";
        const yy = tam * 0.8;
        mc.fillText(parte, pad + off, yy + off);
        mc.globalCompositeOperation = "destination-out"; mc.lineWidth = 3;
        mc.fillText(parte, pad, yy); mc.strokeText(parte, pad, yy);
        mc.globalCompositeOperation = "source-in"; mc.setTransform(1, 0, 0, 1, 0, 0);
        mc.strokeStyle = rgba(rgb, 0.85); mc.lineWidth = 1.2;
        mc.beginPath(); for (let o = -ch; o < cw + ch; o += 3.8) { mc.moveTo(o, ch); mc.lineTo(o + ch * 0.9, 0); } mc.stroke();
        REAL.drawImage(M, x0 - pad, y + subir - tam * 0.8, cw / esc, ch / esc);
      }
      REAL.lineJoin = "round"; REAL.textBaseline = "middle";
      [[0, 0, 2.3, 1.0], [0.9, -0.7, 1.3, 0.75]].forEach(([dx, dy, lw, a]) => {
        REAL.strokeStyle = rgba(rgb, a * t.a); REAL.lineWidth = lw / escalaDe(m) * 1.4;
        REAL.strokeText(parte, x0 + dx, y + subir + dy);
      });
    } else {
      REAL.fillStyle = rgba(rgb, 0.92 * Math.max(0.45, t.a));
      REAL.fillText(parte, x0, y);
    }
    REAL.restore();
  }
  const hashS = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  // trazo de resaltador amarillo (en las coordenadas actuales), centrado en y
  function resaltar(x, y, w, h, semilla = 1) {
    if (w <= 0) return;
    const rr = rng(semilla);
    REAL.save();
    REAL.globalCompositeOperation = "multiply";
    REAL.fillStyle = "rgba(255,226,64,0.62)";
    REAL.beginPath();
    const y0 = y - h * 0.42 + rr.range(-2, 2), y1 = y + h * 0.42 + rr.range(-2, 2);
    REAL.moveTo(x + rr.range(-3, 3), y0); REAL.lineTo(x + w + rr.range(-4, 4), y0 + rr.range(-4, 2));
    REAL.lineTo(x + w + rr.range(-2, 6), y1); REAL.lineTo(x + rr.range(-5, 2), y1 + rr.range(-2, 3));
    REAL.closePath(); REAL.fill();
    REAL.restore();
  }

  // ---------- BIROME: el contexto que ven las escenas ----------
  let trazo = 0;          // contador de trazos del cuadro (semillas estables)
  let hervor = 0;         // las líneas "hierven" un poco: 3 variantes que se alternan
  let sub = [], abierto = null;   // el camino actual, en pantalla
  const pila = [];
  let estiloF = "#fff", estiloT = "#fff", sombra = 0;
  const pt = (x, y) => { const m = REAL.getTransform(); return [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]; };
  const nuevo = p => { abierto = [p]; abierto.cerrado = false; sub.push(abierto); };
  const agregar = p => { if (!abierto) nuevo(p); else abierto.push(p); };
  function arco(cx, cy, rx, ry, rot, a0, a1, ccw) {
    let da = a1 - a0;
    if (!ccw && da < 0) da = da % (2 * Math.PI) + 2 * Math.PI;
    if (ccw && da > 0) da = da % (2 * Math.PI) - 2 * Math.PI;
    if (Math.abs(a1 - a0) >= 2 * Math.PI) da = ccw ? -2 * Math.PI : 2 * Math.PI;
    const m = REAL.getTransform(), r = Math.max(rx, ry) * escalaDe(m);
    const n = Math.max(8, Math.min(240, Math.ceil(Math.abs(da) * r / 4)));
    const c = Math.cos(rot), s = Math.sin(rot);
    for (let i = 0; i <= n; i++) {
      const a = a0 + da * i / n, ex = Math.cos(a) * rx, ey = Math.sin(a) * ry;
      agregar(pt(cx + ex * c - ey * s, cy + ex * s + ey * c));
    }
  }
  const cajaDe = subs => {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const s of subs) for (const [x, y] of s) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return [x0, y0, x1, y1];
  };
  const aPath = subs => { const p = new Path2D(); for (const s of subs) { s.forEach(([x, y], i) => i ? p.lineTo(x, y) : p.moveTo(x, y)); if (s.cerrado) p.closePath(); } return p; };
  function pantalla(fn) {  // dibujar con el contexto real en coordenadas de pantalla
    REAL.save(); REAL.setTransform(1, 0, 0, 1, 0, 0); REAL.setLineDash([]);
    REAL.shadowBlur = 0; REAL.globalCompositeOperation = "multiply"; REAL.lineCap = "round"; REAL.lineJoin = "round";
    const ga = REAL.globalAlpha; REAL.globalAlpha = 1;
    try { fn(ga); } finally { REAL.restore(); }
  }
  // punteado: corta la polilínea según el patrón
  function punteado(P, patron, escala) {
    const pat = patron.map(v => v * escala), out = [];
    let i = 0, resto = pat[0], dibuja = true, cur = [P[0]];
    for (let k = 1; k < P.length; k++) {
      let [ax, ay] = P[k - 1]; const [bx, by] = P[k];
      let d = Math.hypot(bx - ax, by - ay);
      while (d > resto) {
        const f = resto / d; ax += (bx - ax) * f; ay += (by - ay) * f; d -= resto;
        if (dibuja) { cur.push([ax, ay]); out.push(cur); } else cur = null;
        dibuja = !dibuja; i = (i + 1) % pat.length; resto = pat[i];
        cur = dibuja ? [[ax, ay]] : null;
      }
      resto -= d;
      if (dibuja && cur) cur.push([bx, by]);
    }
    if (dibuja && cur && cur.length > 1) out.push(cur);
    return out;
  }
  function trazar(subs, estilo, ancho) {
    const t = tinta(estilo);
    if (t.tipo === "nada" || t.tipo === "papel" || t.a < 0.08) return;
    const dash = REAL.getLineDash(), m = REAL.getTransform(), esc = escalaDe(m);
    const lw = ancho * esc;
    pantalla(ga => {
      for (let s of subs) {
        if (s.length < 2) continue;
        const piezas = dash.length ? punteado(s, dash, esc) : [s];
        for (const pz of piezas) {
          const semilla = (trazo++ * 31 + hervor * 97) % 9973;
          if (t.tipo === "resaltador") {  // línea amarilla: pasada de resaltador
            REAL.strokeStyle = `rgba(255,222,60,${0.7 * Math.min(1, t.a + 0.2)})`;
            REAL.lineWidth = Math.max(10, lw * 1.6);
            let P = pz; if (ga < 1) P = P.slice(0, Math.max(2, Math.ceil(P.length * ga)));
            REAL.beginPath(); P.forEach(([x, y], i) => i ? REAL.lineTo(x, y) : REAL.moveTo(x, y)); REAL.stroke();
            continue;
          }
          const w = clamp(1.7 + lw * 0.28, 2.0, 5.2);
          const a = clamp(0.35 + t.a * 0.65);
          rayar(pz, semilla, w, a, t.rgb, ga, lw >= 6 ? 2 : 1);
        }
      }
    });
  }
  function rellenar(subs, estilo, regla) {
    const t = tinta(estilo);
    if (t.tipo === "nada" || t.a < 0.22) return;
    const caja = cajaDe(subs), w = caja[2] - caja[0], h = caja[3] - caja[1];
    if (!(w > 0 && h > 0)) return;
    const path = aPath(subs);
    pantalla(ga => {
      if (t.tipo === "papel") {  // tapar con papel (corrector)
        REAL.globalCompositeOperation = "source-over"; REAL.globalAlpha = ga; REAL.fillStyle = PAPEL; REAL.fill(path, regla); return;
      }
      if (t.tipo === "resaltador") {
        REAL.fillStyle = `rgba(255,224,64,${0.6 * Math.min(1, t.a + 0.2) * ga})`; REAL.fill(path, regla); return;
      }
      if (w < 16 && h < 16) {  // puntitos: tinta llena
        REAL.globalAlpha = ga; REAL.fillStyle = rgba(t.rgb, 0.85 * Math.max(0.5, t.a)); REAL.fill(path, regla); return;
      }
      const grande = w * h > 0.42 * 1080 * 840;  // un fondo: solo el contorno
      if (!grande) tramar(path, caja, t.rgb, t.a * (t.claro > 0.9 ? 0.55 : 1), ga, ((caja[0] * 7 + caja[1] * 13) | 0) + hervor);
      const semilla = (trazo++ * 31 + hervor * 97) % 9973;
      for (const s of subs) if (s.length > 2) rayar(s.cerrado ? s : [...s, s[0]], semilla, grande ? 2.6 : 2.2, grande ? 0.75 : 0.85, t.rgb, ga);
    });
  }

  const BIROME_M = {
    beginPath() { sub = []; abierto = null; },
    moveTo(x, y) { nuevo(pt(x, y)); },
    lineTo(x, y) { agregar(pt(x, y)); },
    closePath() { if (abierto && abierto.length) { abierto.cerrado = true; abierto.push(abierto[0]); const p = abierto[0]; nuevo(p); sub.pop(); abierto = sub.at(-1) || null; abierto = null; } },
    arc(x, y, r, a0, a1, ccw = false) { arco(x, y, r, r, 0, a0, a1, ccw); },
    ellipse(x, y, rx, ry, rot, a0, a1, ccw = false) { arco(x, y, rx, ry, rot, a0, a1, ccw); },
    arcTo(x1, y1) { agregar(pt(x1, y1)); },
    rect(x, y, w, h) { nuevo(pt(x, y)); agregar(pt(x + w, y)); agregar(pt(x + w, y + h)); agregar(pt(x, y + h)); BIROME_M.closePath(); },
    roundRect(x, y, w, h, r = 0) {
      let rr = Array.isArray(r) ? r : [r]; rr = rr.map(v => typeof v === "number" ? v : (v.x || 0));
      const [a, b = a, c = a, d = b] = rr.length === 1 ? [rr[0], rr[0], rr[0], rr[0]] : rr.length === 2 ? [rr[0], rr[1], rr[0], rr[1]] : rr;
      const lim = Math.min(Math.abs(w), Math.abs(h)) / 2, q = v => Math.min(Math.max(0, v), lim);
      abierto = null;
      nuevo(pt(x + q(a), y));
      agregar(pt(x + w - q(b), y)); if (q(b)) arco(x + w - q(b), y + q(b), q(b), q(b), 0, -Math.PI / 2, 0, false);
      agregar(pt(x + w, y + h - q(c))); if (q(c)) arco(x + w - q(c), y + h - q(c), q(c), q(c), 0, 0, Math.PI / 2, false);
      agregar(pt(x + q(d), y + h)); if (q(d)) arco(x + q(d), y + h - q(d), q(d), q(d), 0, Math.PI / 2, Math.PI, false);
      agregar(pt(x, y + q(a))); if (q(a)) arco(x + q(a), y + q(a), q(a), q(a), 0, Math.PI, Math.PI * 1.5, false);
      BIROME_M.closePath();
    },
    bezierCurveTo(c1x, c1y, c2x, c2y, x, y) {
      const p0 = abierto ? abierto.at(-1) : pt(c1x, c1y), m = REAL.getTransform().inverse();
      const P0 = [m.a * p0[0] + m.c * p0[1] + m.e, m.b * p0[0] + m.d * p0[1] + m.f];
      for (let i = 1; i <= 24; i++) { const t = i / 24, u = 1 - t; agregar(pt(u * u * u * P0[0] + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * x, u * u * u * P0[1] + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * y)); }
    },
    quadraticCurveTo(cx, cy, x, y) {
      const p0 = abierto ? abierto.at(-1) : pt(cx, cy), m = REAL.getTransform().inverse();
      const P0 = [m.a * p0[0] + m.c * p0[1] + m.e, m.b * p0[0] + m.d * p0[1] + m.f];
      for (let i = 1; i <= 18; i++) { const t = i / 18, u = 1 - t; agregar(pt(u * u * P0[0] + 2 * u * t * cx + t * t * x, u * u * P0[1] + 2 * u * t * cy + t * t * y)); }
    },
    stroke(path) { if (path instanceof Path2D) return; trazar(sub, estiloT, REAL.lineWidth); },
    fill(a, b) { if (a instanceof Path2D) return; rellenar(sub, estiloF, typeof a === "string" ? a : "nonzero"); },
    clip(a) {
      if (a instanceof Path2D) return REAL.clip(a);
      const p = aPath(sub), m = REAL.getTransform();
      REAL.setTransform(1, 0, 0, 1, 0, 0); REAL.clip(p, typeof a === "string" ? a : "nonzero"); REAL.setTransform(m);
    },
    fillRect(x, y, w, h) {
      const s = [pt(x, y), pt(x + w, y), pt(x + w, y + h), pt(x, y + h), pt(x, y)]; s.cerrado = true;
      rellenar([s], estiloF, "nonzero");
    },
    strokeRect(x, y, w, h) {
      const s = [pt(x, y), pt(x + w, y), pt(x + w, y + h), pt(x, y + h), pt(x, y)]; s.cerrado = true;
      trazar([s], estiloT, REAL.lineWidth);
    },
    clearRect() {},
    fillText(s, x, y) {
      s = String(s); if (!s.trim()) return;
      const t = tinta(estiloF);
      if (t.tipo === "nada" || t.a < 0.12) return;
      const ga = REAL.globalAlpha;
      const fuente = fuentePara(REAL.font, REAL.getTransform());
      REAL.save(); REAL.globalAlpha = 1; REAL.shadowBlur = 0;
      escribir(s, x, y, fuente, REAL.textAlign, REAL.textBaseline, t.tipo === "papel" ? { tipo: "tinta", rgb: AZULT, a: 1 } : t, ga);
      REAL.restore();
    },
    strokeText() {},  // los bordes del texto no van en papel
    measureText(s) {
      const f = REAL.font; REAL.font = fuentePara(f, REAL.getTransform());
      const r = REAL.measureText(s); REAL.font = f; return r;
    },
    save() { pila.push([estiloF, estiloT]); REAL.save(); },
    restore() { const e = pila.pop(); if (e) [estiloF, estiloT] = e; REAL.restore(); },
    createLinearGradient() { return degrade(); },
    createRadialGradient() { return degrade(); },
    createConicGradient() { return degrade(); },
  };
  function degrade() { return { colores: [], addColorStop(o, c) { this.colores.push(c); } }; }
  const BIROME = new Proxy(REAL, {
    get(o, k) {
      if (k in BIROME_M) return BIROME_M[k];
      if (k === "fillStyle") return estiloF;
      if (k === "strokeStyle") return estiloT;
      if (k === "shadowBlur") return sombra;
      const v = o[k];
      return typeof v === "function" ? v.bind(o) : v;
    },
    set(o, k, v) {
      if (k === "fillStyle") estiloF = v;
      else if (k === "strokeStyle") estiloT = v;
      else if (k === "shadowBlur") sombra = v;
      else if (k === "shadowColor" || k === "filter" || k === "globalCompositeOperation") { /* nada en papel */ }
      else o[k] = v;
      return true;
    },
  });
  function conBirome(fn) {
    const antes = ctx;
    ctx = BIROME; sub = []; abierto = null; estiloF = "#fff"; estiloT = "#fff"; pila.length = 0;
    try { fn(); } finally { ctx = antes; }
  }

  // ---------- la hoja ----------
  const CACHE = {};
  function hojaBase() {
    if (CACHE.hoja) return CACHE.hoja;
    const c = capa(W, HH), g = c.getContext("2d");
    g.fillStyle = PAPEL; g.fillRect(0, 0, W, HH);
    const n2 = makeNoise(12), [br, bg, bb] = [251, 250, 245];
    for (let y = 0; y < HH; y += 4) for (let x = 0; x < W; x += 4) {
      const v = n2.fbm2(x * 0.01, y * 0.01, 3) * 0.6 + n2.n2(x * 0.15, y * 0.04) * 0.4, s = 1 + v * 0.028;
      g.fillStyle = `rgb(${br * s | 0},${bg * s | 0},${bb * s | 0})`; g.fillRect(x, y, 4, 4);
    }
    // dientes del papel: fibras y puntitos
    const img = g.getImageData(0, 0, W, HH), d = img.data, rr = rng(907);
    for (let i = 0; i < d.length; i += 4) { const v = (rr() - 0.5) * 9; d[i] += v; d[i + 1] += v; d[i + 2] += v; }
    g.putImageData(img, 0, 0);
    g.lineCap = "round";
    for (let i = 0; i < 260; i++) {
      const x = rr() * W, y = rr() * HH, a = rr.range(-0.4, 0.4), l = rr.range(8, 30);
      g.strokeStyle = `rgba(150,140,120,${rr.range(0.08, 0.2)})`; g.lineWidth = rr.range(0.6, 1.2);
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + 2, y + Math.sin(a) * l * 0.5 - 2, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    const luz = g.createLinearGradient(0, 0, W, HH);
    luz.addColorStop(0, "rgba(255,255,255,0)"); luz.addColorStop(1, "rgba(120,110,90,0.10)");
    g.fillStyle = luz; g.fillRect(0, 0, W, HH);
    CACHE.hoja = c;
    // granos para el final de cada cuadro (4 variantes)
    CACHE.granos = [0, 1, 2, 3].map(k => {
      const gc = capa(540, 960), gg = gc.getContext("2d"), im = gg.createImageData(540, 960), dd = im.data, r2 = rng(4 + k);
      for (let i = 0; i < dd.length; i += 4) { const v = 128 + (r2() - 0.5) * 70; dd[i] = dd[i + 1] = dd[i + 2] = v; dd[i + 3] = 255; }
      gg.putImageData(im, 0, 0); return gc;
    });
    return c;
  }
  // la hoja con los renglones corridos `scroll` px (la cámara baja por la página)
  function hoja(scroll) {
    REAL.save(); REAL.setTransform(1, 0, 0, 1, 0, 0); REAL.globalAlpha = 1; REAL.globalCompositeOperation = "source-over";
    REAL.drawImage(hojaBase(), 0, 0);
    const y0 = ((RENGLON0 - scroll) % RS + RS) % RS;
    for (let y = y0; y < HH; y += RS) {
      REAL.fillStyle = "rgba(110,160,215,0.62)"; REAL.fillRect(0, y, W, 1.8);
      REAL.fillStyle = "rgba(110,160,215,0.16)"; REAL.fillRect(0, y + 1.8, W, 1.2);
    }
    REAL.fillStyle = "rgba(225,95,105,0.75)"; REAL.fillRect(MARGEN, 0, 2.4, HH);
    REAL.fillStyle = "rgba(225,95,105,0.28)"; REAL.fillRect(MARGEN + 2.4, 0, 1.5, HH);
    // agujeros de la carpeta: se ve el escritorio
    const per = 560, base = ((300 - scroll) % per + per) % per;
    for (let y = base - per; y < HH + per; y += per) {
      const x = 48, r = 22;
      REAL.save(); REAL.beginPath(); REAL.arc(x, y, r, 0, 7); REAL.clip();
      const dg = REAL.createLinearGradient(0, y - r, 0, y + r); dg.addColorStop(0, "#5a3e2a"); dg.addColorStop(1, "#7a5638");
      REAL.fillStyle = dg; REAL.fillRect(x - r, y - r, r * 2, r * 2);
      REAL.strokeStyle = "rgba(0,0,0,0.35)"; REAL.lineWidth = 7; REAL.beginPath(); REAL.arc(x + 2, y + 3, r, 0, 7); REAL.stroke();
      REAL.restore();
      REAL.strokeStyle = "rgba(255,255,255,0.8)"; REAL.lineWidth = 1.2; REAL.beginPath(); REAL.arc(x, y, r + 0.5, 0.2, 2.6); REAL.stroke();
    }
    REAL.restore();
  }
  function terminar(T) {
    hojaBase();
    REAL.save(); REAL.setTransform(1, 0, 0, 1, 0, 0); REAL.globalAlpha = 0.05; REAL.globalCompositeOperation = "overlay";
    REAL.drawImage(CACHE.granos[Math.floor(T * 12) % 4], 0, 0, W, HH);
    REAL.globalAlpha = 1; REAL.globalCompositeOperation = "source-over";
    const g = REAL.createRadialGradient(W / 2, HH / 2, W * 0.45, W / 2, HH / 2, Math.hypot(W, HH) * 0.6);
    g.addColorStop(0, "rgba(60,50,40,0)"); g.addColorStop(1, "rgba(60,50,40,0.12)");
    REAL.fillStyle = g; REAL.fillRect(0, 0, W, HH);
    REAL.restore();
  }

  // garabatos del margen, repasados una y otra vez (uno por página)
  function garabatos(pagina, T, desdeT, scroll) {
    const rr = rng(pagina * 17 + 3), y = 470 + rr() * 60 + (pagina % 2) * 120 - scroll, x = 78;
    const tipo = pagina % 3, vueltas = clamp((T - desdeT) / 1.4) * 4;
    if (vueltas <= 0) return;
    pantalla(() => {
      for (let v = 0; v < Math.ceil(vueltas); v++) {
        const k = clamp(vueltas - v);
        let P = [];
        if (tipo === 0) for (let j = 0; j <= 5; j++) { const a = -Math.PI / 2 + j * Math.PI * 4 / 5; P.push([x + Math.cos(a) * 26, y + Math.sin(a) * 26]); }
        else if (tipo === 1) for (let j = 0; j <= 180; j++) { const a = j / 60 * Math.PI * 2, r = 26 * j / 180; P.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
        else { P = [[x - 24, y], [x - 12, y - 14], [x, y], [x + 12, y - 14], [x + 24, y]]; }
        rayar(P, pagina * 50 + v * 7, 2.0, 0.85, AZULT, k);
      }
    });
  }

  // ---------- qué líneas tienen a Neurón ----------
  function conNeuron(i) {
    const l = DATOS.lineas[i];
    if (typeof l.neuron === "boolean") return l.neuron;
    const n = DATOS.lineas.length;
    return i <= 1 || i >= n - 1 || l.escena === "intro" || l.escena === "seguir";
  }

  // ---------- cuadro ----------
  const eio = x => (x = clamp(x), x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const BAJADA = 0.55;   // segundos que tarda en bajar la página al cambiar de escena
  const PASO = 1500;     // cuánto baja la página por escena
  function paginaDe(i) {  // cuántos cambios de escena hubo hasta la línea i
    let p = 0; for (let k = 1; k <= i; k++) if (DATOS.lineas[k].escena !== DATOS.lineas[k - 1].escena) p++;
    return p;
  }
  // disposición de la escena: con Neurón (como antes) o sola y más grande
  function disposicion(i) {
    return conNeuron(i) ? { esc: 1, cy: 620 } : { esc: 1.12, cy: 700 };
  }
  function mezclaDisp(i, T) {
    const l = DATOS.lineas[i], d1 = disposicion(i);
    if (!i) return d1;
    const d0 = disposicion(i - 1), k = eio((T - l.ini) / 0.45);
    return { esc: lerp(d0.esc, d1.esc, k), cy: lerp(d0.cy, d1.cy, k) };
  }
  function dibujarEscena(i, T, dy, disp) {
    const l = DATOS.lineas[i];
    REAL.save();
    REAL.translate(0, dy);
    REAL.beginPath(); REAL.rect(0, 150, W, 1400); REAL.clip();
    REAL.translate(W / 2, disp.cy); REAL.scale(disp.esc, disp.esc); REAL.translate(-W / 2, -(PANEL.y + PANEL.h / 2));
    hervor = Math.floor(T * 4) % 3; trazo = 0;
    conBirome(() => ESCENAS[l.escena](info(i, T)));
    REAL.restore();
  }

  function cabeceraC(i, T) {
    const l = DATOS.lineas[i], antes = i ? DATOS.lineas[i - 1] : null;
    const nuevoChip = !antes || antes.chip !== l.chip;
    const k = nuevoChip ? clamp((T - l.ini) / 0.6) : 1;
    REAL.save(); REAL.globalCompositeOperation = "multiply";
    REAL.font = fuenteMano(28); REAL.textAlign = "center"; REAL.textBaseline = "middle";
    REAL.fillStyle = rgba(AZULT, 0.7); REAL.fillText("Nada Que Ver", W / 2, 84);
    REAL.restore();
    const [num, ...resto] = l.chip.split(" ");
    const esNum = /^\d+$/.test(num), titulo = esNum ? resto.join(" ") : l.chip;
    REAL.save(); REAL.font = fuenteGlobo(50);
    const ancho = REAL.measureText(titulo).width; REAL.restore();
    const x0 = W / 2 - ancho / 2 + (esNum ? 36 : 0);
    if (esNum) pantalla(() => {
      rayar(window.__circ(x0 - 62, 150, 32, 28), 900 + +num, 2.6, 0.9, ROJOT, clamp(k * 2), 2);
      REAL.font = fuenteMano(40); REAL.textAlign = "center"; REAL.textBaseline = "middle";
      REAL.fillStyle = rgba(ROJOT, 0.92 * clamp(k * 3)); REAL.fillText(num, x0 - 62, 156);
    });
    REAL.save(); escribir(titulo, x0, 150, fuenteGlobo(50), "left", "middle", { tipo: "tinta", rgb: AZULT, a: 1 }, k); REAL.restore();
  }
  window.__circ = (x, y, rx, ry) => { const P = []; for (let j = 0; j <= 48; j++) { const a = -1.2 + j / 48 * (Math.PI * 2 + 0.5); P.push([x + Math.cos(a) * rx, y + Math.sin(a) * ry]); } return P; };

  function progresoC(T) {
    const fin = DATOS.lineas.at(-1).fin + 1.5, k = clamp(T / fin);
    pantalla(() => {
      if (k > 0.002) rayar([[100, 214], [100 + 880 * k, 212]], 4242, 3.2, 0.9, AZULT, 1);
    });
  }

  function neuronC(i, T, n) {
    const l = DATOS.lineas[i];
    // cuánto se ve: entra dibujándose de arriba abajo, sale corriéndose a la izquierda
    const ahora = conNeuron(i), antes = i ? conNeuron(i - 1) : false;
    let revela = 1, corre = 0;
    if (ahora && !antes) revela = clamp((T - l.ini) / 0.45);
    if (!ahora && antes) corre = eio((T - l.ini) / 0.4);
    if (!ahora && (!antes || corre >= 1)) return;
    const inf = info(ahora ? i : i - 1, T), poses = DATOS.lineas[ahora ? i : i - 1].poses;
    const pk = poses[Math.min(poses.length - 1, Math.floor(clamp(inf.p) * poses.length))];
    const b = original(pk);
    const vol = DATOS.vol[Math.min(n, DATOS.vol.length - 1)] || 0;
    const habla = T < DATOS.lineas.at(-1).fin + 0.3;
    const entra = salto(revela);
    const alto = 620 * (1 + (habla ? 0.035 * vol : 0.008 * Math.sin(T * 2))), ancho = b.width * alto / b.height;
    const x = 260 - 560 * corre, base = 1700;
    // sombrita tramada en el piso (lo único a birome: Neurón queda como es, en color)
    pantalla(() => {
      const p = new Path2D(); p.ellipse(x, base - 30, ancho * 0.42, 18, 0, 0, 7);
      tramar(p, [x - ancho * 0.42, base - 48, x + ancho * 0.42, base - 12], AZULT, 0.5, clamp(revela * 2), 9);
    });
    REAL.save();
    REAL.globalAlpha = clamp(revela * 3);
    REAL.translate(x, base); REAL.scale(entra, entra);
    REAL.drawImage(b, -ancho / 2, -alto, ancho, alto);
    REAL.restore();
  }

  // Neurón tal cual (su estilo original), con los pies que se funden con el papel
  const ORIGINAL = {};
  function original(k) {
    if (ORIGINAL[k]) return ORIGINAL[k];
    const im = POSES[k], c = capa(im.width, im.height), g = c.getContext("2d");
    g.drawImage(im, 0, 0);
    g.globalCompositeOperation = "destination-out";
    const f = g.createLinearGradient(0, im.height * 0.86, 0, im.height);
    f.addColorStop(0, "rgba(0,0,0,0)"); f.addColorStop(1, "rgba(0,0,0,1)");
    g.fillStyle = f; g.fillRect(0, im.height * 0.86, im.width, im.height * 0.14);
    return (ORIGINAL[k] = c);
  }

  function subtituloC(i, T) {
    const l = DATOS.lineas[i];
    if (T > DATOS.lineas.at(-1).fin + 0.5) return;
    const ws = l.texto.split(" ");
    let actual = 0;
    l.palabras.forEach((t, j) => { if (t <= T + 0.05) actual = j; });
    const grupo = l.grupos.find(g => g.includes(actual)) || l.grupos[0];
    const clave = new Set(l.clave || []);
    const con = conNeuron(i);
    const tam = con ? 50 : 56, maxAncho = con ? 500 : 860, cx = con ? 700 : W / 2, cy = con ? 1290 : 1330, inter = tam * 1.45;
    const fuente = j => fuenteMano(clave.has(j) ? Math.round(tam * 1.15) : tam);
    const medir = j => { REAL.font = fuente(j); return REAL.measureText(ws[j]).width; };
    REAL.save();
    REAL.font = fuenteMano(tam);
    const esp = REAL.measureText(" ").width;
    const renglones = [[]];
    let ancho = 0;
    for (const j of grupo) {
      const w = medir(j);
      if (renglones.at(-1).length && ancho + esp + w > maxAncho) { renglones.push([]); ancho = 0; }
      ancho += (renglones.at(-1).length ? esp : 0) + w;
      renglones.at(-1).push(j);
    }
    let y = cy - (renglones.length - 1) * inter / 2;
    REAL.textBaseline = "middle"; REAL.textAlign = "left";
    for (const r of renglones) {
      const total = r.reduce((a, j) => a + medir(j), 0) + esp * (r.length - 1);
      let x = cx - total / 2;
      for (const j of r) {
        REAL.font = fuente(j);
        const w = REAL.measureText(ws[j]).width;
        if (j === actual) resaltar(x - 6, y + 4, w + 12, tam * 0.95, 31 + j);
        REAL.globalCompositeOperation = "multiply";
        REAL.fillStyle = rgba(clave.has(j) ? ROJOT : AZULT, 0.93);
        REAL.fillText(ws[j], x, y);
        if (clave.has(j)) pantalla(() => rayar([[x, y + tam * 0.62], [x + w, y + tam * 0.58]], 300 + j, 2.4, 0.85, ROJOT, 1));
        x += w + esp;
      }
      y += inter;
    }
    REAL.restore();
  }

  function dibujarC(T) {
    const n = Math.round(T * DATOS.fps), i = linea(T), l = DATOS.lineas[i];
    const cambia = i > 0 && DATOS.lineas[i - 1].escena !== l.escena;
    const u = cambia ? eio((T - l.ini) / BAJADA) : 1;
    const pag = paginaDe(i), scroll = (pag - 1 + u) * PASO;
    ctx = REAL;
    REAL.setTransform(1, 0, 0, 1, 0, 0); REAL.globalAlpha = 1;
    hoja(Math.max(0, scroll));
    // inicio de la página actual (para los garabatos)
    let desde = 0; for (let k = i; k >= 0; k--) { if (k === 0 || DATOS.lineas[k].escena !== DATOS.lineas[k - 1].escena) { desde = DATOS.lineas[k].ini; break; } }
    garabatos(pag, T, desde + 0.3, (u - 1) * PASO);
    if (cambia && u < 1) {
      garabatos(pag - 1, T, 0, u * PASO);
      dibujarEscena(i - 1, l.ini - 0.001, -u * PASO, disposicion(i - 1));
      dibujarEscena(i, T, (1 - u) * PASO, mezclaDisp(i, T));
    } else dibujarEscena(i, T, 0, mezclaDisp(i, T));
    cabeceraC(i, T);
    progresoC(T);
    neuronC(i, T, n);
    subtituloC(i, T);
    terminar(T);
  }

  // ---------- escenas fijas en versión cuaderno ----------
  function introC(inf) {
    const t = inf.t;
    REAL.save();
    escribir("HOY", 540, 380, fuenteMano(54), "center", "middle", { tipo: "tinta", rgb: ROJOT, a: 1 }, clamp(t / 0.3));
    pantalla(() => {
      const m = REAL.getTransform();
    });
    REAL.restore();
    const tam = DATOS.titulo.length > 30 ? 84 : 96;
    REAL.save(); REAL.font = fuenteGlobo(tam);
    const renglones = [""];
    for (const w of DATOS.titulo.split(" ")) {
      const prueba = (renglones.at(-1) + " " + w).trim();
      if (REAL.measureText(prueba).width > 860 && renglones.at(-1)) renglones.push(w); else renglones[renglones.length - 1] = prueba;
    }
    REAL.restore();
    const y0 = 620 - (renglones.length - 1) * tam * 0.6;
    renglones.forEach((r, k) => {
      REAL.save(); REAL.translate(540, y0 + k * tam * 1.2); REAL.rotate(-0.015);
      escribir(r, 0, 0, fuenteGlobo(tam), "center", "middle", { tipo: "tinta", rgb: AZULT, a: 1 }, entre(t, 0.1 + k * 0.35, 0.5 + k * 0.35));
      REAL.restore();
    });
    const yl = y0 + renglones.length * tam * 1.2 - tam * 0.45;
    const m = REAL.getTransform();
    pantalla(() => {
      const p = (x, y) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f];
      rayar([p(240, yl + 6), p(840, yl - 4)], 1301, 4.2, 0.95, ROJOT, entre(t, 0.4 + renglones.length * 0.35, 0.8 + renglones.length * 0.35), 2);
    });
  }

  function seguirC(inf) {
    const t = inf.t, m = REAL.getTransform();
    const p = (x, y) => [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f], e = escalaDe(m);
    // sello redondo con las iniciales (Neurón ya está dibujado abajo)
    const kc = clamp(t / 0.6);
    pantalla(() => { const [cx, cy] = p(540, 450); rayar(window.__circ(cx, cy, 128 * e, 124 * e), 1401, 3.4, 0.95, AZULT, kc, 2); rayar(window.__circ(cx, cy, 108 * e, 104 * e), 1405, 2.4, 0.8, ROJOT, clamp(kc * 1.5 - 0.3)); });
    REAL.save(); REAL.translate(540, 455); REAL.rotate(-0.06); escribir("NQV", 0, 0, fuenteGlobo(92), "center", "middle", { tipo: "tinta", rgb: AZULT, a: 1 }, entre(t, 0.15, 0.6)); REAL.restore();
    REAL.save(); escribir("@nqv.tv", 540, 650, fuenteGlobo(72), "center", "middle", { tipo: "tinta", rgb: AZULT, a: 1 }, entre(t, 0.2, 0.7)); REAL.restore();
    REAL.save(); escribir("Nada Que Ver", 540, 730, fuenteMano(38), "center", "middle", { tipo: "tinta", rgb: AZULT, a: 0.8 }, entre(t, 0.4, 0.8)); REAL.restore();
    const tS = inf.cuando("sigueme"), apretado = entre(t, tS, tS + 0.25), kb = entre(t, 0.5, 0.9);
    const caja = [[330, 790], [750, 790], [750, 900], [330, 900], [330, 790]].map(([x, y]) => p(x, y));
    pantalla(() => {
      const sh = new Path2D(); caja.forEach(([x, y], k) => k ? sh.lineTo(x + 12 * e, y + 12 * e) : sh.moveTo(x + 12 * e, y + 12 * e)); sh.closePath();
      const cb = cajaDe([caja]);
      tramar(sh, [cb[0] + 12 * e, cb[1] + 12 * e, cb[2] + 12 * e, cb[3] + 12 * e], AZULT, 1, kb, 1402);
      REAL.fillStyle = PAPEL; REAL.globalCompositeOperation = "source-over";
      const fr = new Path2D(); caja.forEach(([x, y], k) => k ? fr.lineTo(x, y) : fr.moveTo(x, y)); fr.closePath();
      if (kb > 0.3) REAL.fill(fr);
      REAL.globalCompositeOperation = "multiply";
      if (apretado > 0.5) { REAL.fillStyle = "rgba(255,224,64,0.6)"; REAL.fill(fr); }
      rayar(caja, 1403, 3.4, 0.95, AZULT, kb, 2);
    });
    REAL.save();
    escribir(apretado > 0.5 ? "Siguiendo" : "Seguir", 540, 845, fuenteGlobo(56), "center", "middle", { tipo: "tinta", rgb: apretado > 0.5 ? ROJOT : AZULT, a: 1 }, entre(t, 0.7, 1.0));
    REAL.restore();
    if (apretado > 0.5) pantalla(() => rayar([p(780, 840), p(805, 875), p(860, 790)], 1404, 4.5, 0.95, ROJOT, clamp((apretado - 0.5) * 2), 2));
  }

  // sol a birome: círculo, rayitos y un poco de tramado
  function solC(x, y, r, color, brillo = 1) {
    const m = REAL.getTransform(), p = (a, b) => [m.a * a + m.c * b + m.e, m.b * a + m.d * b + m.f], e = escalaDe(m);
    const k = clamp(REAL.globalAlpha) * clamp(brillo);
    if (k <= 0) return;
    pantalla(() => {
      const [cx, cy] = p(x, y);
      rayar(window.__circ(cx, cy, r * e, r * e * 0.97), (x * 3 + y) | 0, 3, 0.95, TINTAS.naranja, k, 2);
      for (let j = 0; j < 12; j++) {
        const a = j / 12 * Math.PI * 2 + 0.2, r0 = r * 1.3 * e, r1 = r * (j % 2 ? 1.7 : 1.95) * e;
        rayar([[cx + Math.cos(a) * r0, cy + Math.sin(a) * r0], [cx + Math.cos(a) * r1, cy + Math.sin(a) * r1]], j + 40, 2.6, 0.9, TINTAS.naranja, clamp(k * 1.6 - j / 24));
      }
      REAL.save(); REAL.globalCompositeOperation = "multiply"; REAL.globalAlpha = 0.5 * k;
      const g = new Path2D(); g.arc(cx, cy, r * e * 0.95, 0, 7);
      REAL.fillStyle = "rgba(255,224,64,0.8)"; REAL.fill(g); REAL.restore();
    });
  }

  // cartelito: un recuadro a mano con sombra tramada; el texto adentro a mano
  function chipC(partes, x, y, o = {}) {
    if (typeof partes === "string") partes = [[partes, o.color ?? "#fff"]];
    const tam = o.tam ?? 38, k = clamp(o.alfa ?? 1) * clamp(REAL.globalAlpha);
    if (k <= 0) return;
    const m0 = REAL.getTransform();
    REAL.save();
    REAL.translate(x, y);
    const esc = Math.min(1.15, Math.max(0.9, o.escala ?? 1)); REAL.scale(esc, esc);
    const fm = fuenteMano(tam * 0.95);
    REAL.font = fm;
    const anchos = partes.map(([s]) => REAL.measureText(s).width);
    const total = anchos.reduce((a, b) => a + b, 0) + (partes.length - 1) * tam * 0.35;
    const pad = tam * 0.5, w = total + 2 * pad, h = tam * 1.75;
    const m = REAL.getTransform(), p = (a, b) => [m.a * a + m.c * b + m.e, m.b * a + m.d * b + m.f], e = escalaDe(m);
    const cajaP = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2], [-w / 2, -h / 2]].map(([a, b]) => p(a, b));
    const semilla = hashS(partes.map(q => q[0]).join(""));
    pantalla(() => {
      const sh = new Path2D(); cajaP.forEach(([a, b], i) => i ? sh.lineTo(a + 9 * e, b + 9 * e) : sh.moveTo(a + 9 * e, b + 9 * e)); sh.closePath();
      const cb = cajaDe([cajaP]);
      tramar(sh, [cb[0] + 9 * e, cb[1] + 9 * e, cb[2] + 9 * e, cb[3] + 9 * e], AZULT, 0.8, clamp((k - 0.3) / 0.7), semilla);
      const fr = new Path2D(); cajaP.forEach(([a, b], i) => i ? fr.lineTo(a, b) : fr.moveTo(a, b)); fr.closePath();
      REAL.globalCompositeOperation = "source-over"; REAL.fillStyle = PAPEL; REAL.globalAlpha = clamp(k * 3); REAL.fill(fr);
      REAL.globalAlpha = 1; REAL.globalCompositeOperation = "multiply";
      rayar(cajaP, semilla % 997, 2.6, 0.9, AZULT, clamp(k * 1.6));
    });
    let cx = -total / 2;
    partes.forEach(([s, c], j) => {
      const t = tinta(c);
      escribir(s, cx, 4, fm, "left", "middle", t.tipo === "tinta" ? t : t.tipo === "resaltador" ? t : { tipo: "tinta", rgb: AZULT, a: 1 }, clamp((k - 0.2) / 0.8));
      cx += anchos[j] + tam * 0.35;
    });
    REAL.restore();
  }

  function portadaC() {
    ctx = REAL;
    REAL.setTransform(1, 0, 0, 1, 0, 0); REAL.globalAlpha = 1;
    hoja(0);
    REAL.save(); REAL.globalCompositeOperation = "multiply"; REAL.font = fuenteMano(34); REAL.textAlign = "center";
    REAL.fillStyle = rgba(AZULT, 0.75); REAL.fillText("Nada Que Ver", W / 2, 300); REAL.restore();
    const tam = DATOS.titulo.length > 28 ? 96 : 110;
    REAL.save(); REAL.font = fuenteGlobo(tam);
    const renglones = [""];
    for (const w of DATOS.titulo.split(" ")) {
      const prueba = (renglones.at(-1) + " " + w).trim();
      if (REAL.measureText(prueba).width > 900 && renglones.at(-1)) renglones.push(w); else renglones[renglones.length - 1] = prueba;
    }
    REAL.restore();
    const alto = tam * 1.12;
    const h = DATOS.lineas[0], esc = 0.72, arriba = 420 + renglones.length * alto - 40;
    REAL.save();
    REAL.translate(W / 2 * (1 - esc), arriba - (PANEL.y - 60) * esc); REAL.scale(esc, esc);
    REAL.beginPath(); REAL.rect(0, PANEL.y - 60, W, PANEL.h + 60); REAL.clip();
    hervor = 0; trazo = 0;
    conBirome(() => ESCENAS[h.escena](info(0, h.ini + (h.fin - h.ini) * 0.95)));
    REAL.restore();
    renglones.forEach((r, k) => {
      REAL.save(); REAL.translate(W / 2, 420 + k * alto); REAL.rotate(-0.02);
      escribir(r, 0, 0, fuenteGlobo(tam), "center", "middle", { tipo: "tinta", rgb: k === renglones.length - 1 ? ROJOT : AZULT, a: 1 }, 1);
      REAL.restore();
    });
    const b = original(h.poses[0]), hn = 640, wn = b.width * hn / b.height;
    REAL.drawImage(b, 250 - wn / 2, 1680 - hn, wn, hn);
    terminar(0);
  }

  // ---------- activar ----------
  window.activarCuaderno = async () => {
    await Promise.all([document.fonts.load("700 60px Fredoka"), document.fonts.load('400 40px "Gloria Hallelujah"')]);
    window.dibujar = dibujarC;
    window.portada = portadaC;
    window.estrellas = () => {};
    window.sol = solC;
    window.chip = chipC;
    ESCENAS.intro = introC;
    ESCENAS.seguir = seguirC;
  };
})();
