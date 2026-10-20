// Conductora de la cuenta: 12 dibujos (assets/personaje). Cambia de pose cada uno o dos segundos,
// como viñetas de un cómic; motor.js decide qué pose va en cada momento.
//   01-05 hablando (cerrada, apenas abierta, a medias, bien abierta, redonda)
//   06-07 parpadeo, 08 mira arriba a la derecha, 09-10 señala (boca cerrada/abierta), 11-12 saluda
// personaje(contenedor) devuelve mostrar(t, pose).

function personaje(contenedor) {
  const cuadros = Array.from({ length: 12 }, (_, i) => {
    const img = document.createElement("img");
    img.src = `personaje/${String(i + 1).padStart(2, "0")}.png`;
    contenedor.appendChild(img);
    return img;
  });
  personaje.cargado = Promise.all(cuadros.map((img) => new Promise((ok) => { img.onload = img.onerror = ok; })));
  let visible = -1;

  return function mostrar(t, pose) {
    if (pose !== visible) {
      cuadros.forEach((img, i) => { img.style.opacity = i === pose - 1 ? 1 : 0; });
      visible = pose;
    }
    // Respiración apenas visible
    contenedor.style.transform = `translateY(${Math.sin(t * 2) * 3}px)`;
  };
}

window.personaje = personaje;
