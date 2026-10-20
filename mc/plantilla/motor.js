// Motor de animación determinista: render(t) dibuja el cuadro del segundo t.
// No usa animaciones del navegador; todo es una función del tiempo, así cada
// cuadro se puede capturar en cualquier orden.
// Los momentos clave de cada escena (D.escenas[i].marcas) los calcula Python,
// que usa los mismos valores para ubicar los efectos de sonido.
// Estilo: técnico y mínimo; movimientos cortos y suaves, siempre con las mismas curvas.

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
const entrada = x => 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2); // frena con un leve pasarse
const acelera = x => x * x * x;
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
$("#tema").textContent = D.tema.nombre;
$("#usuario").textContent = D.usuario;

// ---------- Construcción de escenas ----------

function ilustracion(esc, caja, texto) {
  const marco = crear("div", "ilus", caja);
  const img = crear("div", "img", marco);
  img.style.backgroundImage = `url(${esc.dibujo})`;
  const etiqueta = texto ? crear("div", "etiqueta", marco, texto) : null;
  // Se acerca despacio y se corre apenas hacia un lado, alternando entre escenas
  const lado = esc.indice % 2 ? -1 : 1;
  return (tl) => {
    const p = clamp(tl / Math.max(1, esc.fin - esc.inicio + D.transicion));
    img.style.transform = `scale(${1.04 + 0.07 * p}) translateX(${lado * 18 * p}px)`;
    if (etiqueta) entrar(etiqueta, tl, 0.35);
  };
}

const constructores = {
  ilustracion: (v, caja, esc) => ilustracion(esc, caja, v.texto),
  foto: (v, caja, esc) => ilustracion(esc, caja, v.texto),
  emoji: (v, caja, esc) => ilustracion(esc, caja, v.texto),

  numero(v, caja, esc) {
    const m = esc.marcas;
    const cont = crear("div", "numero-caja", caja);
    // Anillo fino con marcas, como un instrumento de medición
    const marcas = Array.from({ length: 60 }, (_, k) => {
      const a = (k / 60) * 2 * Math.PI, largo = k % 5 ? 10 : 22;
      const x1 = 300 + 286 * Math.cos(a), y1 = 300 + 286 * Math.sin(a);
      const x2 = 300 + (286 - largo) * Math.cos(a), y2 = 300 + (286 - largo) * Math.sin(a);
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(255,255,255,${k % 5 ? 0.15 : 0.35})" stroke-width="2"/>`;
    }).join("");
    cont.innerHTML = `<svg viewBox="0 0 600 600">${marcas}<circle cx="300" cy="300" r="298" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="2"/><circle class="arco" cx="300" cy="300" r="298" fill="none" stroke="${D.tema.color}" stroke-width="4" stroke-linecap="round" stroke-dasharray="1872" stroke-dashoffset="1872"/></svg>`;
    const arco = $(".arco", cont);
    const texto = `${v.prefijo || ""}${formatear(v.valor)}${v.sufijo || ""}`;
    const num = crear("div", "numero l" + Math.min(5, Math.max(2, texto.length)), cont);
    const etiqueta = crear("div", "numero-etiqueta", cont, v.etiqueta || "");
    return (tl) => {
      const pc = suave(prog(tl, m.cuenta_inicio, m.cuenta_fin - m.cuenta_inicio));
      num.textContent = `${v.prefijo || ""}${formatear(v.valor * pc)}${v.sufijo || ""}`;
      arco.style.strokeDashoffset = 1872 * (1 - pc);
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
      el.style.top = `${m.posiciones[i] * 600}px`;
      return { punto: $(".punto", el), texto: $(".hito-texto", el), t: m.hitos[i] };
    });
    return (tl) => {
      relleno.style.height = `${600 * suaveDoble(prog(tl, m.linea_inicio, m.linea_fin - m.linea_inicio))}px`;
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
    const avatar = crear("div", "avatar", cont, '<img src="personaje/12.png">');
    const nombre = crear("div", "seguir-nombre", cont, D.usuario);
    const boton = crear("div", "boton", cont, "Seguir");
    const onda = crear("div", "onda", cont);
    return (tl) => {
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

const escenas = D.escenas.map((esc, indice) => {
  esc.indice = indice;
  const el = crear("div", "escena", $("#escenas"));
  const caja = crear("div", "visual", el);
  const tipo = esc.visual.tipo in constructores ? esc.visual.tipo : "ilustracion";
  const dibujar = constructores[tipo](esc.visual, caja, esc);
  const marco = crear("div", "marco", el, "<i></i><i></i><i></i><i></i>");
  return { ...esc, el, marco, tipo, dibujar };
});

// ---------- Subtítulos: la palabra que se dice se subraya ----------

const sub = $("#subtitulo");
const subrayado = $("#subrayado");
let grupoActual = -1;
let spans = [];

function mostrarGrupo(i) {
  sub.innerHTML = "";
  sub.appendChild(subrayado); // vive dentro del subtítulo, así se mueve con él
  spans = D.grupos[i].palabras.map((p) => crear("span", "palabra" + (p.destacada ? " destacada" : ""), sub, p.texto));
  grupoActual = i;
}

// Posición del subrayado debajo de una palabra, dentro del subtítulo
const caja = (el) => ({ x: el.offsetLeft, y: el.offsetTop + el.offsetHeight - 2, w: el.offsetWidth });

function subrayar(t, grupo) {
  const k = grupo.palabras.findLastIndex((p) => t >= p.inicio - 0.03);
  grupo.palabras.forEach((p, j) => spans[j].classList.toggle("dicha", j <= k));
  if (k < 0) { subrayado.style.opacity = 0; return; }
  // Se desliza de la palabra anterior a la actual
  const actual = caja(spans[k]);
  const antes = k > 0 && spans[k - 1].offsetTop === spans[k].offsetTop ? caja(spans[k - 1]) : { ...actual, w: 0 };
  const p = suave(prog(t, grupo.palabras[k].inicio - 0.03, 0.14));
  subrayado.style.opacity = 1;
  subrayado.style.left = `${mezclar(antes.x, actual.x, p)}px`;
  subrayado.style.top = `${actual.y}px`;
  subrayado.style.width = `${mezclar(antes.w, actual.w, p)}px`;
}

// ---------- Conductora ----------

const mostrarPersonaje = personaje($("#personaje"));
const HABLANDO = [3, 2, 4, 5, 3, 4, 2];
const POSE_MINIMA = 1.2; // segundos que dura cada pose, como mínimo

// Una pose por "viñeta": empieza con un grupo de subtítulos y dura al menos POSE_MINIMA
const vinetas = [];
D.grupos.forEach((g) => {
  const ultima = vinetas[vinetas.length - 1];
  if (ultima && g.inicio - ultima.inicio < POSE_MINIMA) {
    ultima.destacada ||= g.palabras.some((p) => p.destacada);
    return;
  }
  const escena = escenas.findLastIndex((e) => g.inicio >= e.inicio - 0.05);
  const primera = !ultima || escenas.findLastIndex((e) => ultima.inicio >= e.inicio - 0.05) !== escena;
  vinetas.push({ inicio: g.inicio, escena, primera, destacada: g.palabras.some((p) => p.destacada) });
});
vinetas.forEach((v, k) => {
  if (escenas[v.escena].tipo === "seguir") v.pose = k % 2 ? 12 : 11;
  else if (v.destacada) v.pose = k % 2 ? 9 : 10;
  else if (v.primera && v.escena % 2) v.pose = 8; // mira la tarjeta nueva
  else v.pose = HABLANDO[k % HABLANDO.length];
});

// Devuelve [pose, segundo en que empezó], así el personaje puede dar un saltito en cada cambio
function poseActual(t) {
  const v = vinetas.findLast((x) => t >= x.inicio - 0.05);
  if (!v) return [1, 0];
  // Cuando termina de hablar cierra la boca, y en silencios largos parpadea
  const fin = D.grupos[D.grupos.length - 1].fin;
  if (t > fin) return [(t - fin) % 2.4 < 0.15 ? 7 : 1, fin];
  return [v.pose, v.inicio - 0.05];
}

// ---------- Render ----------

const ANCHO_TARJETA = 980;

window.render = function (t) {
  // Carrusel: la tarjeta nueva entra desde la derecha mientras la anterior sale por la izquierda
  escenas.forEach((e, i) => {
    const ultima = i === escenas.length - 1;
    const visible = t >= e.inicio && (ultima || t < e.fin + D.transicion);
    e.el.style.display = visible ? "block" : "none";
    if (!visible) return;
    const tl = t - e.inicio;
    const pe = i === 0 ? 1 : prog(tl, 0, D.transicion);
    const ps = ultima ? 0 : prog(t, e.fin, D.transicion);
    let x = (1 - entrada(pe)) * ANCHO_TARJETA - acelera(ps) * ANCHO_TARJETA;
    let giro = (1 - suave(pe)) * 4 - acelera(ps) * 3;
    let escala = 1 - 0.06 * acelera(ps);
    if (i === 0) {
      // La primera aparece en su lugar, creciendo
      const p = prog(tl, 0, 0.5);
      escala *= mezclar(0.86, 1, entrada(p));
      e.el.style.opacity = suave(p);
    } else {
      e.el.style.opacity = 1 - 0.4 * ps;
    }
    e.el.style.transform = `translateX(${x}px) rotate(${giro}deg) scale(${escala})`;
    // El borde se enciende en celeste al llegar y se apaga solo
    e.marco.style.borderColor = `rgba(79, 195, 247, ${0.9 * (1 - suave(prog(tl, D.transicion * 0.6, 0.6)))})`;
    e.dibujar(tl);
  });

  // Subtítulo: el grupo aparece entero y se va subrayando palabra por palabra
  const g = D.grupos.findLastIndex((gr) => t >= gr.inicio - 0.05);
  if (g >= 0 && t < D.grupos[g].fin) {
    if (g !== grupoActual) mostrarGrupo(g);
    const p = prog(t, D.grupos[g].inicio - 0.05, 0.16);
    sub.style.display = "flex";
    sub.style.opacity = suave(p);
    sub.style.transform = `scale(${mezclar(0.9, 1, entrada(p))})`;
    subrayar(t, D.grupos[g]);
  } else {
    sub.style.display = "none";
    subrayado.style.opacity = 0;
  }

  const [pose, desde] = poseActual(t);
  mostrarPersonaje(t, pose, desde);

  // Capas fijas
  $("#barra").style.width = `${100 * clamp(t / D.duracion)}%`;
};

window.listo = Promise.all([
  document.fonts.ready,
  ...["200 40px Inter", "400 40px Inter", "500 40px Inter", "600 40px Inter", "400 30px Mono"].map((f) => document.fonts.load(f)),
  personaje.cargado,
  ...D.escenas.filter((e) => e.dibujo).map((e) => new Promise((ok) => {
    const img = new Image();
    img.onload = img.onerror = ok;
    img.src = e.dibujo;
  })),
]);
