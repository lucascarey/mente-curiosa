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

  // `desde`: segundo en que empezó la pose actual. En cada cambio da un saltito corto
  // (se estira hacia arriba y se asienta), y mientras tanto se balancea apenas.
  return function mostrar(t, pose, desde) {
    if (pose !== visible) {
      cuadros.forEach((img, i) => { img.style.opacity = i === pose - 1 ? 1 : 0; });
      visible = pose;
    }
    const dt = t - desde;
    const salto = dt >= 0 && dt < 0.32 ? Math.sin((Math.PI * dt) / 0.32) : 0;
    const estira = dt >= 0 && dt < 0.4 ? Math.sin((2 * Math.PI * dt) / 0.4) * Math.exp(-dt * 6) : 0;
    const llega = Math.min(1, Math.max(0, t / 0.6));
    const sube = (1 - (1 - Math.pow(1 - llega, 3))) * 520; // entra desde abajo al empezar el video
    const y = Math.sin(t * 2.2) * 5 - salto * 16 + sube;
    const giro = Math.sin(t * 1.3) * 1.4;
    contenedor.style.transform =
      `translateY(${y}px) rotate(${giro}deg) scale(${1 - estira * 0.035}, ${1 + estira * 0.045})`;
  };
}

window.personaje = personaje;
