// Motor de animación determinista: render(t) dibuja el cuadro del segundo t.
// No usa animaciones del navegador; todo es una función del tiempo, así cada
// cuadro se puede capturar en cualquier orden.
// Los momentos clave de cada escena (D.escenas[i].marcas) los calcula Python,
// que usa los mismos valores para ubicar los efectos de sonido.

const D = window.DATOS;
const $ = (sel, raiz = document) => raiz.querySelector(sel);
const crear = (tag, clase, padre, html) => {
  const el = document.createElement(tag);
  if (clase) el.className = clase;
  if (html !== undefined) el.innerHTML = html;
  if (padre) padre.appendChild(el);
  return el;
};

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const prog = (t, inicio, dur) => clamp((t - inicio) / dur);
const E = {
  outCubic: x => 1 - Math.pow(1 - x, 3),
  inOutCubic: x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  outBack: x => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
  outElastic: x => (x === 0 || x === 1 ? x : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (2 * Math.PI / 3)) + 1),
};
const mezclar = (a, b, p) => a + (b - a) * p;
const formatear = n => Math.round(n).toLocaleString("es-AR");

const raiz = document.documentElement;
raiz.style.setProperty("--color", D.tema.color);
raiz.style.setProperty("--oscuro", D.tema.oscuro);
$("#chip-emoji").textContent = D.tema.emoji;
$("#chip-texto").textContent = D.tema.nombre;
$("#usuario").textContent = D.usuario;

// ---------- Construcción de escenas ----------

const constructores = {
  foto(v, caja, esc) {
    const foto = crear("div", "foto", caja);
    const img = crear("div", "img", foto);
    img.style.backgroundImage = `url(${esc.foto})`;
    const sticker = v.emoji ? crear("div", "sticker", caja, v.emoji) : null;
    return (tl) => {
      const p = E.outBack(prog(tl, 0.05, 0.45));
      foto.style.transform = `scale(${mezclar(0.4, 1, p)}) rotate(${mezclar(-14, -3, p) + Math.sin(tl * 1.4) * 1.2}deg)`;
      foto.style.opacity = prog(tl, 0.05, 0.12);
      img.style.transform = `scale(${1.05 + tl * 0.035}) translateX(${-tl * 6}px)`;
      if (sticker) {
        const ps = E.outElastic(prog(tl, 0.35, 0.8));
        sticker.style.transform = `scale(${ps}) rotate(${12 + Math.sin(tl * 3) * 6}deg)`;
      }
    };
  },

  emoji(v, caja) {
    const halo = crear("div", "halo", caja);
    const emoji = crear("div", "emoji-grande", caja, v.emoji);
    const texto = v.texto ? crear("div", "emoji-texto", caja, v.texto) : null;
    return (tl) => {
      const p = E.outElastic(prog(tl, 0.1, 0.9));
      emoji.style.transform = `translateY(${Math.sin(tl * 2.4) * 18 - 90}px) scale(${p}) rotate(${Math.sin(tl * 1.7) * 6}deg)`;
      halo.style.transform = `translateY(-90px) scale(${E.outCubic(prog(tl, 0, 0.5)) * (1 + Math.sin(tl * 4) * 0.06)})`;
      if (texto) {
        const pt = E.outBack(prog(tl, 0.45, 0.4));
        texto.style.transform = `translateY(${mezclar(120, 0, pt)}px) rotate(-3deg)`;
        texto.style.opacity = prog(tl, 0.45, 0.15);
      }
    };
  },

  numero(v, caja, esc) {
    const m = esc.marcas;
    const cont = crear("div", "numero-caja", caja);
    cont.innerHTML = `<svg viewBox="0 0 760 760"><circle cx="380" cy="380" r="350" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="22"/><circle class="arco" cx="380" cy="380" r="350" fill="none" stroke="${D.tema.color}" stroke-width="22" stroke-linecap="round" stroke-dasharray="2199" stroke-dashoffset="2199"/></svg>`;
    const arco = $(".arco", cont);
    const texto = `${v.prefijo || ""}${formatear(v.valor)}${v.sufijo || ""}`;
    const num = crear("div", "numero l" + Math.min(5, Math.max(2, texto.length)), cont);
    const etiqueta = crear("div", "numero-etiqueta", cont, v.etiqueta || "");
    return (tl) => {
      const pc = E.outCubic(prog(tl, m.cuenta_inicio, m.cuenta_fin - m.cuenta_inicio));
      num.textContent = `${v.prefijo || ""}${formatear(v.valor * pc)}${v.sufijo || ""}`;
      const golpe = tl > m.cuenta_fin ? 1 + 0.18 * Math.exp(-(tl - m.cuenta_fin) * 9) : 1;
      num.style.transform = `scale(${E.outBack(prog(tl, 0, 0.35)) * golpe})`;
      arco.style.strokeDashoffset = 2199 * (1 - pc);
      cont.style.transform = `rotate(${Math.sin(tl * 1.3) * 2}deg)`;
      etiqueta.style.opacity = prog(tl, m.cuenta_fin - 0.2, 0.25);
      etiqueta.style.transform = `translateY(${mezclar(40, 0, E.outCubic(prog(tl, m.cuenta_fin - 0.2, 0.3)))}px)`;
    };
  },

  comparacion(v, caja, esc) {
    const m = esc.marcas;
    const cont = crear("div", "comparacion", caja);
    if (v.titulo) crear("div", "comp-titulo", cont, v.titulo);
    const maximo = Math.max(v.a.valor, v.b.valor);
    const filas = [v.a, v.b].map((item) => {
      const fila = crear("div", "fila", cont);
      const cabeza = crear("div", "fila-cabeza", fila, `<span class="e">${item.emoji || ""}</span><span>${item.etiqueta}</span>`);
      const valor = crear("div", "valor", cabeza);
      const pista = crear("div", "pista", fila);
      const relleno = crear("div", "relleno", pista);
      return { fila, relleno, valor, item };
    });
    return (tl) => {
      filas.forEach((f, i) => {
        const inicio = i === 0 ? m.fila_a : m.fila_b;
        const pe = E.outBack(prog(tl, inicio - 0.15, 0.35));
        f.fila.style.opacity = prog(tl, inicio - 0.15, 0.15);
        f.fila.style.transform = `translateX(${mezclar(-200, 0, pe)}px)`;
        const pb = E.outCubic(prog(tl, inicio, 0.75));
        f.relleno.style.width = `${Math.max(9, 100 * (f.item.valor / maximo) * pb)}%`;
        f.valor.textContent = `${formatear(f.item.valor * pb)} ${v.unidad || ""}`;
      });
    };
  },

  linea(v, caja, esc) {
    const m = esc.marcas;
    const cont = crear("div", "linea", caja);
    const eje = crear("div", "eje", cont);
    const hitos = v.hitos.map((h, i) => {
      const el = crear("div", "hito", cont, `<div class="punto"></div><div class="hito-texto"><div class="hito-anio">${h.fecha}</div><div class="hito-nombre">${h.etiqueta}</div></div>`);
      el.style.top = `${m.posiciones[i] * 860}px`;
      return { el, punto: $(".punto", el), texto: $(".hito-texto", el), t: m.hitos[i] };
    });
    return (tl) => {
      eje.style.height = `${860 * E.inOutCubic(prog(tl, m.linea_inicio, m.linea_fin - m.linea_inicio))}px`;
      hitos.forEach((h) => {
        h.punto.style.transform = `scale(${E.outElastic(prog(tl, h.t, 0.7))})`;
        h.texto.style.opacity = prog(tl, h.t, 0.15);
        h.texto.style.transform = `translateX(${mezclar(80, 0, E.outCubic(prog(tl, h.t, 0.35)))}px)`;
      });
    };
  },

  seguir(v, caja, esc) {
    const m = esc.marcas;
    const cont = crear("div", "seguir", caja);
    const avatar = crear("div", "avatar", cont, D.tema.emoji);
    crear("div", "seguir-nombre", cont, D.usuario);
    const boton = crear("div", "boton", cont, "SEGUIR");
    const mano = crear("div", "mano", cont, "👆");
    return (tl) => {
      avatar.style.transform = `scale(${E.outBack(prog(tl, 0.05, 0.4))})`;
      cont.style.opacity = prog(tl, 0, 0.12);
      const hecho = tl >= m.toque;
      boton.textContent = hecho ? "SIGUIENDO ✓" : "SEGUIR";
      boton.classList.toggle("hecho", hecho);
      const latido = hecho ? 1 + 0.12 * Math.exp(-(tl - m.toque) * 7) : 1 + Math.sin(tl * 8) * 0.03;
      const apretado = Math.abs(tl - m.toque) < 0.08 ? 0.9 : 1;
      boton.style.transform = `scale(${E.outBack(prog(tl, 0.25, 0.4)) * latido * apretado})`;
      const pm = E.outCubic(prog(tl, m.toque - 0.6, 0.55));
      mano.style.transform = `translate(${mezclar(260, 0, pm)}px, ${mezclar(380, 0, pm)}px) scale(${apretado})`;
      mano.style.opacity = prog(tl, m.toque - 0.6, 0.1) * (1 - prog(tl, m.toque + 0.6, 0.3));
    };
  },
};

const escenas = D.escenas.map((esc, i) => {
  const el = crear("div", "escena", $("#escenas"));
  el.style.zIndex = i + 1;
  const fondo = crear("div", "fondo", el);
  fondo.style.backgroundImage = `url(${esc.fondo})`;
  crear("div", "tinte", el);
  const caja = crear("div", "visual", el);
  const tipo = esc.visual.tipo in constructores ? esc.visual.tipo : "foto";
  const dibujar = constructores[tipo](esc.visual, caja, esc);
  return { ...esc, el, fondo, caja, dibujar };
});

// ---------- Subtítulos palabra por palabra ----------

const sub = $("#subtitulo");
const grupos = D.grupos.map((g) => ({
  ...g,
  spans: null,
}));
let grupoActual = -1;

function mostrarGrupo(i) {
  sub.innerHTML = "";
  grupos[i].spans = grupos[i].palabras.map((p) => {
    const s = crear("span", "palabra" + (p.destacada ? " destacada" : ""), sub);
    s.textContent = p.texto;
    return s;
  });
  grupoActual = i;
}

// ---------- Render ----------

window.render = function (t) {
  // Escenas: la actual entra con una cortina circular sobre la anterior
  const actual = escenas.findLastIndex((e) => t >= e.inicio);
  escenas.forEach((e, i) => {
    const visible = i === actual || (i === actual - 1 && t - escenas[actual].inicio < D.transicion);
    e.el.style.display = visible ? "block" : "none";
    if (!visible) return;
    const tl = t - e.inicio;
    if (i === actual && i > 0) {
      const pc = E.inOutCubic(prog(tl, 0, D.transicion));
      e.el.style.clipPath = pc < 1 ? `circle(${pc * 120}% at 50% 40%)` : "none";
    }
    // Golpe de cámara cada vez que cambia el subtítulo
    const g = grupos.findLastIndex((gr) => t >= gr.inicio);
    const golpe = g >= 0 ? 0.035 * Math.exp(-(t - grupos[g].inicio) * 7) : 0;
    e.fondo.style.transform = `scale(${1.06 + tl * 0.012 + golpe}) rotate(${Math.sin(t * 0.6) * 0.6}deg)`;
    e.caja.style.transform = `translateY(${Math.sin(t * 1.1) * 8}px) scale(${1 + golpe * 0.6})`;
    e.dibujar(tl);
  });

  // Subtítulo
  const g = grupos.findLastIndex((gr) => t >= gr.inicio);
  if (g >= 0 && t < grupos[g].fin) {
    if (g !== grupoActual) mostrarGrupo(g);
    sub.style.display = "flex";
    grupos[g].palabras.forEach((p, k) => {
      const s = grupos[g].spans[k];
      const pp = prog(t, p.inicio - 0.04, 0.16);
      s.style.opacity = pp > 0 ? 1 : 0;
      s.style.transform = `translateY(${mezclar(40, 0, E.outBack(pp))}px) scale(${mezclar(0.55, 1, E.outBack(pp))})`;
      if (p.destacada) s.style.setProperty("--pill", E.outBack(prog(t, p.inicio, 0.25)));
    });
  } else {
    sub.style.display = "none";
  }

  // Capas fijas
  $("#barra").style.width = `${100 * clamp(t / D.duracion)}%`;
  const pchip = E.outBack(prog(t, 0.2, 0.5));
  $("#chip").style.transform = `translateX(${mezclar(-500, 0, pchip)}px)`;
};

window.listo = Promise.all([
  document.fonts.ready,
  ...D.escenas.flatMap((e) => [e.fondo, e.foto]).map((src) => new Promise((ok) => {
    const img = new Image();
    img.onload = img.onerror = ok;
    img.src = src;
  })),
]);
