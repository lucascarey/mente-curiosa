// Personaje de la cuenta: un búho con anteojos, en estilo plano.
// personaje(contenedor) devuelve una función animar(t, estado) que mueve
// ojos, párpados, pico (con la voz), alas y cuerpo.
//   estado.boca: 0 a 1, apertura del pico según el volumen de la voz
//   estado.mirada: -1 a 1, hacia dónde mira (izquierda/derecha)
//   estado.arriba: 0 a 1, cuánto mira hacia arriba
//   estado.gesto: 0 a 1, cuánto levanta el ala derecha

const SVG_PERSONAJE = `
<svg viewBox="0 0 400 460" xmlns="http://www.w3.org/2000/svg" style="overflow:visible;width:100%;height:100%">
  <defs>
    <linearGradient id="pj-cuerpo" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8B6CF0"/><stop offset="1" stop-color="#5B3FC4"/>
    </linearGradient>
    <linearGradient id="pj-panza" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFE6B8"/><stop offset="1" stop-color="#F6C98A"/>
    </linearGradient>
    <linearGradient id="pj-ala" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#6F52DA"/><stop offset="1" stop-color="#4A31A8"/>
    </linearGradient>
    <clipPath id="pj-ojo-izq"><circle cx="145" cy="175" r="58"/></clipPath>
    <clipPath id="pj-ojo-der"><circle cx="255" cy="175" r="58"/></clipPath>
  </defs>
  <ellipse cx="200" cy="440" rx="120" ry="14" fill="rgba(0,0,0,.25)"/>
  <g class="pj-cuerpo">
    <!-- orejas -->
    <path d="M92 120 L70 40 L150 92 Z" fill="#5B3FC4"/>
    <path d="M308 120 L330 40 L250 92 Z" fill="#5B3FC4"/>
    <!-- cuerpo -->
    <path d="M200 70 C310 70 340 160 340 270 C340 380 280 432 200 432 C120 432 60 380 60 270 C60 160 90 70 200 70 Z" fill="url(#pj-cuerpo)"/>
    <path d="M200 230 C262 230 286 290 286 340 C286 396 250 424 200 424 C150 424 114 396 114 340 C114 290 138 230 200 230 Z" fill="url(#pj-panza)"/>
    <path d="M160 300 q10 10 20 0 M220 300 q10 10 20 0 M190 340 q10 10 20 0 M160 375 q10 10 20 0 M220 375 q10 10 20 0" stroke="#E9B370" stroke-width="5" fill="none" stroke-linecap="round"/>
    <!-- patas -->
    <path d="M160 428 l-14 16 M160 428 l0 18 M160 428 l14 16 M240 428 l-14 16 M240 428 l0 18 M240 428 l14 16" stroke="#F2A541" stroke-width="9" stroke-linecap="round"/>
    <!-- ala izquierda (fija) -->
    <path class="pj-ala-izq" d="M70 220 C30 260 34 340 80 380 C96 330 100 270 70 220 Z" fill="url(#pj-ala)"/>
    <!-- ala derecha (gesto) -->
    <g class="pj-ala-der" style="transform-origin: 330px 230px">
      <path d="M330 220 C370 260 366 340 320 380 C304 330 300 270 330 220 Z" fill="url(#pj-ala)"/>
    </g>
    <!-- ojos -->
    <g class="pj-ojos">
      <circle cx="145" cy="175" r="58" fill="#fff"/>
      <circle cx="255" cy="175" r="58" fill="#fff"/>
      <g class="pj-pupilas">
        <circle cx="145" cy="178" r="26" fill="#1B1240"/>
        <circle cx="255" cy="178" r="26" fill="#1B1240"/>
        <circle cx="154" cy="168" r="8" fill="#fff"/>
        <circle cx="264" cy="168" r="8" fill="#fff"/>
      </g>
      <!-- párpados -->
      <rect class="pj-parpado" x="85" y="115" width="120" height="0" fill="#7A5CE6" clip-path="url(#pj-ojo-izq)"/>
      <rect class="pj-parpado" x="195" y="115" width="120" height="0" fill="#7A5CE6" clip-path="url(#pj-ojo-der)"/>
    </g>
    <!-- anteojos -->
    <circle cx="145" cy="175" r="64" fill="none" stroke="#1B1240" stroke-width="10"/>
    <circle cx="255" cy="175" r="64" fill="none" stroke="#1B1240" stroke-width="10"/>
    <path d="M209 170 q-9 -10 -18 0" stroke="#1B1240" stroke-width="10" fill="none" stroke-linecap="round"/>
    <!-- cejas -->
    <path class="pj-cejas" d="M100 100 q45 -22 90 4 M210 104 q45 -26 90 -4" stroke="#3B2590" stroke-width="12" fill="none" stroke-linecap="round"/>
    <!-- pico -->
    <ellipse class="pj-boca" cx="200" cy="246" rx="17" ry="14" fill="#3A1420"/>
    <path class="pj-pico-inf" d="M184 244 L216 244 L200 266 Z" fill="#D9862A"/>
    <path d="M176 232 L224 232 L200 256 Z" fill="#F2A541" stroke="#E08E2E" stroke-width="3" stroke-linejoin="round"/>
  </g>
</svg>`;

let instancias = 0;

function personaje(contenedor) {
  // Cada copia del búho necesita sus propios ids de gradientes y recortes
  const sufijo = `-${instancias++}`;
  contenedor.innerHTML = SVG_PERSONAJE.replace(/id="pj-([\w-]+)"/g, `id="pj-$1${sufijo}"`).replace(/url\(#pj-([\w-]+)\)/g, `url(#pj-$1${sufijo})`);
  const q = (s) => contenedor.querySelector(s);
  const cuerpo = q(".pj-cuerpo");
  const pupilas = q(".pj-pupilas");
  const parpados = contenedor.querySelectorAll(".pj-parpado");
  const picoInf = q(".pj-pico-inf");
  const boca = q(".pj-boca");
  const alaDer = q(".pj-ala-der");
  const cejas = q(".pj-cejas");

  // Parpadeo cada 3 a 4 segundos, siempre en los mismos momentos para cada t
  const parpadeo = (t) => {
    const ciclo = 3.4;
    const fase = (t + 0.7) % ciclo;
    return fase < 0.16 ? Math.sin((fase / 0.16) * Math.PI) : 0;
  };

  return function animar(t, estado = {}) {
    const abre = Math.max(0, Math.min(1, estado.boca || 0));
    const mirada = estado.mirada || 0;
    const gesto = estado.gesto || 0;
    const respira = Math.sin(t * 2.2);
    cuerpo.style.transform = `translateY(${respira * 3}px) scale(${1 + respira * 0.006}, ${1 - respira * 0.006})`;
    cuerpo.style.transformOrigin = "200px 432px";
    pupilas.style.transform = `translate(${mirada * 12}px, ${Math.sin(t * 0.9) * 2 - (estado.arriba || 0) * 14}px)`;
    const p = parpadeo(t);
    parpados.forEach((el) => el.setAttribute("height", 120 * p));
    // El pico inferior baja con la voz
    picoInf.style.transform = `translateY(${abre * 18}px)`;
    boca.style.transform = `scaleY(${abre * 1.4})`;
    boca.style.transformOrigin = "200px 240px";
    alaDer.style.transform = `rotate(${-gesto * 115 + Math.sin(t * 3) * gesto * 6}deg)`;
    cejas.style.transform = `translateY(${-abre * 4 - gesto * 6}px)`;
  };
}

window.personaje = personaje;
