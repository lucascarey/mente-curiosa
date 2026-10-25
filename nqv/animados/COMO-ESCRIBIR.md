# Cómo escribir un video animado de Nada Que Ver

Formato elegido por Lucas (2026-10-25): **Neurón solo**, explicando un tema con gráficos animados programados
(nada de fotos). No sale el nombre de quien habla. Cada video es una carpeta `nqv/animados/pendientes/NNN-tema/`
y se publican en orden de nombre (2 por día, a las 13 y 20 h de Argentina, cuando `nqv/formato.txt`
dice `animado`).

## Estructura del guion (obligatoria)

1. **Hook**: la primera línea engancha con el dato más sorprendente o una afirmación que choca ("Con solo 23
   personas...", "Spoiler: el cielo es azul, pero no porque refleje el mar").
   La **portada** del Reel se arma sola con el `titulo` (corto, que dé ganas de tocar; la última palabra sale en
   celeste) y la escena del hook tal como queda al final de esa línea: que ese último momento se entienda solo.
2. **Intro corta** con la escena fija `intro` (muestra el título grande): "Hoy vamos a ver...", "Hoy te explico...".
3. **Explicación** en 4 a 6 líneas, una idea por línea, cada una con su escena. Datos reales y comprobables.
4. **Conclusión** en una frase que cierre la idea.
5. **Llamado a seguir** con la escena fija `seguir` ("Para más datos curiosos como este, sígueme." El botón se
   aprieta cuando dice "sígueme").

Total: 45 a 60 segundos (unas 130 a 170 palabras). Español latino NEUTRO: tú, nunca vos ni lunfardo
("sígueme", no "seguime"; "trabajo", no "laburo"). Público de 20 a 26 años: claro, sin tono infantil, humor
poco y natural. Temas: ciencia y espacio, cuerpo humano, animales, historia, tecnología, psicología, matemática.
Afuera: política, religión, tragedias. Que no repita temas de `pendientes/` ni `publicados/` (ni de
`nqv/guiones/`). Lo mejor para este formato son temas que se puedan DIBUJAR: mecanismos, comparaciones de
tamaño o cantidad, procesos paso a paso, curvas y proporciones.

## guion.json

```json
{
 "titulo": "¿POR QUÉ FLOTA EL HIELO?",
 "caption": "Texto del post con el dato y #hashtags (#datoscuriosos ... #nadaquever)",
 "lineas": [
  {"dice": "lo que lee la voz", "escena": "vasos", "chip": "¿Por qué flota?", "poses": ["habla", "senala"]},
  {"dice": "Hoy vamos a ver...", "escena": "intro", "chip": "¿Por qué flota?", "poses": ["explica"]},
  ...
  {"dice": "Para más datos curiosos como este, sígueme.", "escena": "seguir", "chip": "Sígueme", "poses": ["festeja"]}
 ]
}
```

- `chip`: cartel de arriba. Las partes de la explicación van numeradas ("1 La molécula", "2 Líquida"); el número
  sale en naranja. Hook, intro y conclusión llevan la pregunta corta del tema.
- `poses` de Neurón: habla, canchero, explica, escucha, piensa, atento, frustrado, festeja, senala, listo, idea
  (ver `GESTOS` en `nqv/guion.py`). Con 2, cambia a mitad de la línea.
- Números en `dice` escritos en palabras ("veintitrés") para que la voz los lea bien; en los gráficos van en cifras.

## escenas.js

Una función por escena, que dibuja en el canvas de 1080x1920 con las utilidades de `nqv/animado/plantilla.html`
(`texto`, `chip`, `caja`, `circulo`, `flecha`, `onda`, `sol`, `tachar`, `estrellas`, `entre`, `salto`, `azar`,
colores `CELESTE`, `NARANJA`, `AMARILLO`, `AZUL`, `ROJO`, `VIOLETA`, `VERDE`, `ARCOIRIS`).

```js
ESCENAS.vasos = (inf) => {
  const t = inf.t;                       // segundos desde que empezó la línea
  const tF = inf.cuando("flota");        // segundo en que Neurón dice "flota" (sin tildes ni mayúsculas)
  chip("¡Flota!", 780, 950, { tam: 40, escala: salto((t - tF) / 0.4), alfa: clamp((t - tF) / 0.2) });
};
```

Reglas de diseño (copiadas de los videos de referencia que eligió Lucas):
- Dibujar SOLO en la zona y=220 a y=1030; más abajo están Neurón y el subtítulo, y lo de x>930 lo tapan
  los botones de Reels/TikTok si está bajo y=1000.
- Cada cosa aparece **cuando se nombra** (`inf.cuando`), con `salto` para los carteles y `entre` para lo que
  crece o se mueve. Algo tiene que moverse siempre.
- Fondo oscuro, formas simples y planas, pocos colores fuertes, carteles mono en cajitas oscuras, cifras grandes
  con contadores que suben. Letra de los carteles 36 a 46 px como mínimo.
- Si un dibujo no está a escala o exagera algo, aclararlo con un texto chico ("dibujo no a escala").
- Nada de emojis dentro del canvas (no hay fuente de emojis en Actions).

## Probar sin gastar cuota

```
NQV_CHROMIUM=/opt/pw-browsers/chromium python -m nqv.animado.armar --validar
NQV_CHROMIUM=/opt/pw-browsers/chromium python -m nqv.animado.armar nqv/animados/pendientes/NNN-tema --sin-voz --cuadros 1,3,6,9
```
`--validar` dibuja varios cuadros de cada pendiente y falla si hay errores de JavaScript; las capturas (y la
`portada.jpg`) quedan en `salida/animado-NNN-tema/cuadros/` para MIRARLAS antes de subir. Para el video completo con voz: poner la carpeta en
`nqv/animado.txt` y pushear (workflow "Nada Que Ver - video animado de prueba", resultado en la rama `nqv-animado`).
