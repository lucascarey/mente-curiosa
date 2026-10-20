// Motor de animación determinista: render(t) dibuja el cuadro del segundo t.
// No usa animaciones del navegador; todo es una función del tiempo, así cada
// cuadro se puede capturar en cualquier orden.
// Los momentos clave de cada escena (D.escenas[i].marcas) los calcula Python,
// que usa los mismos valores para ubicar los efectos de sonido.
// Estilo: movimientos cortos y suaves, siempre con las mismas curvas.

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
const suave = x => 1 - Math.pow(1 - x, 3);
const suaveDoble = x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const mezclar = (a, b, p) => a + (b - a) * p;
const formatear = n => Math.round(n).toLocaleString("es-AR");
// Sube en `sube` segundos desde `inicio`, se mantiene hasta `fin` y baja en `baja` segundos
const campana = (t, inicio, fin, sube = 0.3, baja = 0.4) =>
  suaveDoble(prog(t, inicio, sube)) * (1 - suaveDoble(prog(t, fin, baja)));
// Entrada estándar: aparece y sube unos pocos píxeles
const entrar = (el, t, inicio, dur = 0.45, distancia = 24) => {
  const p = suave(prog(t, inicio, dur));
  el.style.opacity = p;
  el.style.transform = `translateY(${mezclar(distancia, 0, p)}px)`;
};

const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

const raiz = document.documentElement;
raiz.style.setProperty("--color", D.tema.color);
raiz.style.setProperty("--oscuro", D.tema.oscuro);
$("#chip-texto").textContent = D.tema.nombre;
$("#usuario").textContent = D.usuario;

// ---------- Construcción de escenas ----------

function ilustracion(esc, caja, texto) {
  const marco = crear("div", "ilus", caja);
  const img = crear("div", "img", marco);
  img.style.backgroundImage = `url(${esc.dibujo})`;
  const etiqueta = texto ? crear("div", "etiqueta", marco, texto) : null;
  return (tl) => {
    img.style.transform = `scale(${1.02 + tl * 0.012})`;
    if (etiqueta) entrar(etiqueta, tl, 0.5);
  };
}

const constructores = {
  ilustracion: (v, caja, esc) => ilustracion(esc, caja, v.texto),
  foto: (v, caja, esc) => ilustracion(esc, caja, v.texto),
  emoji: (v, caja, esc) => ilustracion(esc, caja, v.texto),

  numero(v, caja, esc) {
    const m = esc.marcas;
    const cont = crear("div", "numero-caja", caja);
    cont.innerHTML = `<svg viewBox="0 0 680 680"><circle cx="340" cy="340" r="320" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="10"/><circle class="arco" cx="340" cy="340" r="320" fill="none" stroke="${D.tema.color}" stroke-width="10" stroke-linecap="round" stroke-dasharray="2011" stroke-dashoffset="2011"/></svg>`;
    const arco = $(".arco", cont);
    const texto = `${v.prefijo || ""}${formatear(v.valor)}${v.sufijo || ""}`;
    const num = crear("div", "numero l" + Math.min(5, Math.max(2, texto.length)), cont);
    const etiqueta = crear("div", "numero-etiqueta", cont, v.etiqueta || "");
    return (tl) => {
      const pc = suave(prog(tl, m.cuenta_inicio, m.cuenta_fin - m.cuenta_inicio));
      num.textContent = `${v.prefijo || ""}${formatear(v.valor * pc)}${v.sufijo || ""}`;
      arco.style.strokeDashoffset = 2011 * (1 - pc);
      entrar(etiqueta, tl, m.cuenta_fin - 0.3);
    };
  },

  comparacion(v, caja, esc) {
    const m = esc.marcas;
    const cont = crear("div", "comparacion", caja);
    if (v.titulo) crear("div", "comp-titulo", cont, v.titulo);
    const maximo = Math.max(v.a.valor, v.b.valor);
    const filas = [v.a, v.b].map((item, i) => {
      const fila = crear("div", "fila " + (i ? "b" : "a"), cont);
      const cabeza = crear("div", "fila-cabeza", fila);
      if (item.svg) crear("div", "icono", cabeza, item.svg);
      crear("span", "", cabeza, item.etiqueta);
      const valor = crear("div", "valor", cabeza);
      const relleno = crear("div", "relleno", crear("div", "pista", fila));
      return { fila, relleno, valor, item, inicio: i ? m.fila_b : m.fila_a };
    });
    return (tl) => {
      filas.forEach((f) => {
        entrar(f.fila, tl, f.inicio - 0.2, 0.4, 20);
        const pb = suave(prog(tl, f.inicio, 0.8));
        f.relleno.style.width = `${Math.max(3, 100 * (f.item.valor / maximo) * pb)}%`;
        f.valor.textContent = `${formatear(f.item.valor * pb)} ${v.unidad || ""}`.trim();
      });
    };
  },

  linea(v, caja, esc) {
    const m = esc.marcas;
    const cont = crear("div", "linea", caja);
    const relleno = crear("div", "eje-relleno", crear("div", "eje", cont));
    const hitos = v.hitos.map((h, i) => {
      const el = crear("div", "hito", cont, `<div class="punto"></div><div class="hito-texto"><div class="hito-anio">${h.fecha}</div><div class="hito-nombre">${h.etiqueta}</div></div>`);
      el.style.top = `${m.posiciones[i] * 760}px`;
      return { punto: $(".punto", el), texto: $(".hito-texto", el), t: m.hitos[i] };
    });
    return (tl) => {
      relleno.style.height = `${760 * suaveDoble(prog(tl, m.linea_inicio, m.linea_fin - m.linea_inicio))}px`;
      hitos.forEach((h) => {
        const p = suave(prog(tl, h.t, 0.3));
        h.punto.style.background = p > 0 ? D.tema.color : "";
        h.punto.style.opacity = mezclar(0.35, 1, p);
        h.texto.style.opacity = p;
        h.texto.style.transform = `translateX(${mezclar(24, 0, p)}px)`;
      });
    };
  },

  seguir(v, caja, esc) {
    const m = esc.marcas;
    const cont = crear("div", "seguir", caja);
    const avatar = crear("div", "avatar", cont);
    const mini = personaje(crear("div", "", avatar));
    const nombre = crear("div", "seguir-nombre", cont, D.usuario);
    const boton = crear("div", "boton", cont, "Seguir");
    const onda = crear("div", "onda", cont);
    return (tl) => {
      mini(tl + 1.3, {});
      entrar(avatar, tl, 0.05);
      entrar(nombre, tl, 0.2);
      entrar(boton, tl, 0.35);
      const hecho = tl >= m.toque;
      if (boton.classList.contains("hecho") !== hecho) {
        boton.classList.toggle("hecho", hecho);
        boton.innerHTML = hecho ? `${CHECK}Siguiendo` : "Seguir";
      }
      const apretado = 1 - 0.05 * campana(tl, m.toque - 0.12, m.toque, 0.1, 0.15);
      boton.style.transform = `scale(${apretado})`;
      const po = prog(tl, m.toque - 0.05, 0.6);
      onda.style.opacity = po > 0 && po < 1 ? 0.6 * (1 - po) : 0;
      onda.style.transform = `scale(${mezclar(0.3, 1.8, suave(po))})`;
    };
  },
};

const escenas = D.escenas.map((esc) => {
  const el = crear("div", "escena", $("#escenas"));
  const caja = crear("div", "visual", el);
  const tipo = esc.visual.tipo in constructores ? esc.visual.tipo : "ilustracion";
  const dibujar = constructores[tipo](esc.visual, caja, esc);
  return { ...esc, el, tipo, dibujar };
});

// ---------- Subtítulos dentro del globo ----------

const sub = $("#subtitulo");
let grupoActual = -1;
let spans = [];

function mostrarGrupo(i) {
  sub.innerHTML = "";
  spans = D.grupos[i].palabras.map((p) => crear("span", "palabra" + (p.destacada ? " destacada" : ""), sub, p.texto));
  grupoActual = i;
}

// ---------- Personaje ----------

const animarPersonaje = personaje($("#personaje"));
const destacadas = D.grupos.flatMap((g) => g.palabras.filter((p) => p.destacada).map((p) => p.inicio));

function estadoPersonaje(t, escena) {
  const tl = t - escena.inicio;
  // Al empezar cada escena mira la tarjeta y después vuelve al globo
  const mira = campana(tl, 0, 1.1, 0.3, 0.4);
  let gesto = Math.max(0, ...destacadas.map((d) => campana(t, d - 0.15, d + 0.6, 0.3, 0.4)));
  if (escena.tipo === "seguir") gesto = Math.max(gesto, suaveDoble(prog(tl, 0.2, 0.4)));
  return {
    boca: D.boca[Math.round(t * D.fps)] || 0,
    mirada: mezclar(0.35, 0.6, mira),
    arriba: mira,
    gesto,
  };
}

// ---------- Render ----------

window.render = function (t) {
  const actual = escenas.findLastIndex((e) => t >= e.inicio);
  escenas.forEach((e, i) => {
    const sale = i === actual - 1 && t - escenas[actual].inicio < D.transicion;
    const visible = i === actual || sale;
    e.el.style.display = visible ? "block" : "none";
    if (!visible) return;
    const tl = t - e.inicio;
    if (sale) {
      const p = suaveDoble(prog(t, escenas[actual].inicio, D.transicion * 0.6));
      e.el.style.opacity = 1 - p;
      e.el.style.transform = `translateY(${-16 * p}px)`;
    } else if (i > 0) {
      const p = suave(prog(tl, D.transicion * 0.3, D.transicion * 0.7));
      e.el.style.opacity = p;
      e.el.style.transform = `translateY(${mezclar(28, 0, p)}px)`;
    }
    e.dibujar(tl);
  });

  // Subtítulo palabra por palabra
  const g = D.grupos.findLastIndex((gr) => t >= gr.inicio);
  if (g >= 0 && t < D.grupos[g].fin) {
    if (g !== grupoActual) mostrarGrupo(g);
    sub.style.display = "flex";
    D.grupos[g].palabras.forEach((p, k) => entrar(spans[k], t, p.inicio - 0.05, 0.16, 14));
  } else {
    sub.style.display = "none";
  }

  animarPersonaje(t, estadoPersonaje(t, escenas[Math.max(0, actual)]));

  // Capas fijas
  $("#barra").style.width = `${100 * clamp(t / D.duracion)}%`;
  $("#luz").style.transform = `translate(${90 + Math.sin(t * 0.2) * 60}px, ${-60 + Math.cos(t * 0.15) * 50}px)`;
};

window.listo = Promise.all([
  document.fonts.ready,
  ...["500", "700", "800"].map((peso) => document.fonts.load(`${peso} 40px Montserrat`)),
  ...D.escenas.filter((e) => e.dibujo).map((e) => new Promise((ok) => {
    const img = new Image();
    img.onload = img.onerror = ok;
    img.src = e.dibujo;
  })),
]);
