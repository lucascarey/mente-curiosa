// Conductora de la cuenta: 12 dibujos (assets/personaje) que se alternan según la voz y el momento.
//   01-05 hablando (cerrada, apenas abierta, a medias, bien abierta, redonda)
//   06-07 parpadeo, 08 mira arriba a la derecha, 09-10 señala (boca cerrada/abierta), 11-12 saluda
// personaje(contenedor) devuelve animar(t, estado):
//   estado.boca: 0 a 1, volumen de la voz en ese cuadro
//   estado.mira: mira la tarjeta de arriba
//   estado.senala: levanta el dedo (palabras destacadas)
//   estado.saluda: saluda con la mano (cierre del video)

function personaje(contenedor) {
  const cuadros = Array.from({ length: 12 }, (_, i) => {
    const img = document.createElement("img");
    img.src = `personaje/${String(i + 1).padStart(2, "0")}.png`;
    contenedor.appendChild(img);
    return img;
  });
  personaje.cargado = Promise.all(cuadros.map((img) => new Promise((ok) => { img.onload = img.onerror = ok; })));
  let visible = -1;

  const boca = (nivel, t) => {
    if (nivel < 0.12) return 1;
    if (nivel < 0.35) return 2;
    if (nivel < 0.6) return 3;
    // Alterna entre la "A" y la "O" para que no se vea siempre igual
    return Math.floor(t * 2.6) % 3 === 0 ? 5 : 4;
  };
  // Parpadea cada 3,6 segundos, siempre en los mismos momentos para cada t
  const parpadeo = (t) => {
    const fase = (t + 1.1) % 3.6;
    return fase < 0.05 ? 6 : fase < 0.11 ? 7 : fase < 0.16 ? 6 : 0;
  };

  return function animar(t, estado = {}) {
    const nivel = estado.boca || 0;
    let n;
    if (estado.saluda) n = 11 + (Math.floor(t / 0.35) % 2);
    else if (estado.senala) n = nivel > 0.25 ? 10 : 9;
    else if (estado.mira && nivel < 0.12) n = 8;
    else if (nivel < 0.12 && parpadeo(t)) n = parpadeo(t);
    else n = boca(nivel, t);
    if (n !== visible) {
      cuadros.forEach((img, i) => { img.style.opacity = i === n - 1 ? 1 : 0; });
      visible = n;
    }
    // Respiración apenas visible
    contenedor.style.transform = `translateY(${Math.sin(t * 2) * 3}px)`;
  };
}

window.personaje = personaje;
