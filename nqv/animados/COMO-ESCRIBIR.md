# Cómo escribir un video animado de Nada Que Ver

Formato elegido por Lucas (2026-10-25): **Neurón solo**, explicando un tema con gráficos animados programados
(nada de fotos). No sale el nombre de quien habla. Desde 2026-11-03 el estilo visual es **cuaderno**
(`nqv/estilo.txt`): todo dibujado con birome en una hoja rayada. Lucas pidió calidad al máximo en sonido,
animación, dibujos y coherencia, y que **los guiones vendan**. Cada video es una carpeta `nqv/animados/pendientes/NNN-tema/`
y se publican en orden de nombre (2 por día, a las 13 y 20 h de Argentina, cuando `nqv/formato.txt`
dice `animado`).

## Guiones que vendan (lo más importante)

El video se juega en el primer segundo y en la portada. Antes de escribir, preguntarse: "¿alguien que no sigue
la cuenta frenaría el scroll por esto?". Si no, cambiar de tema o de ángulo.

- **Tema con tensión**: algo que la gente cree saber y está mal, una cifra que no entra en la cabeza, un "¿por
  qué?" cotidiano que nadie sabe responder. Nada de datos sueltos sin sorpresa.
- **Hook en 1 frase, máximo 2 segundos hasta el golpe**: la afirmación que choca va primero, sin "¿Sabías
  que...?" ni saludos. Buenos moldes: "X no es lo que te dijeron", "Si hicieras X, pasaría Y", una cifra
  imposible ("Un millón de segundos son once días. Mil millones, treinta y dos años.").
- **Promesa y pago**: el hook abre una pregunta; la explicación la va cerrando de a poco y el dato más fuerte
  queda para el final (no gastarlo en la línea 2).
- **Cada línea suma algo nuevo** y deja con ganas de la siguiente ("Pero hay un detalle...", "Y acá viene lo
  raro..."). Frases cortas, para decir en voz alta; nada de explicar lo obvio.
- **Conclusión que se pueda repetir**: una frase que el que mira le contaría a un amigo.
- **Título de portada**: 3 a 7 palabras, pregunta o contraste ("¿POR QUÉ EL CIELO ES AZUL?",
  "UN MILLÓN VS MIL MILLONES"). La última palabra sale en rojo.
- **Caption**: primera línea = el dato más fuerte (es lo que se ve sin tocar "más"), después 1-2 frases y
  los hashtags.

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
 "musica": "ciencia",
 "lineas": [
  {"dice": "lo que lee la voz", "escena": "vasos", "chip": "¿Por qué flota?", "poses": ["habla", "senala"],
   "destacar": ["al revés", "flota"]},
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
- `neuron` (opcional, true/false): en el estilo cuaderno Neurón aparece solo en el hook, la intro y el cierre,
  en su estilo original (en color); en el resto la escena se agranda y ocupa la hoja. Poner `"neuron": true` en una línea de la
  explicación solo si Neurón tiene que reaccionar ahí (como mucho 1 por video).
- `musica`: el clima de la música de fondo, según el tema: `espacio` (lento, misterioso), `ciencia` (alegre, con
  ritmo suave), `historia` (solemne, con tambores), `naturaleza` (cálido, tipo marimba) o `tecnologia` (más
  electrónico). Se sintetiza sola (sin derechos de autor) y baja cuando habla Neurón. Si falta, se adivina por los
  hashtags. Los efectos (whoosh al cambiar de escena, pop en carteles nuevos, clic en "sígueme") van solos.
- `destacar` (opcional, por línea): 1 o 2 palabras o frases cortas de lo que dice, las que tienen que quedar
  grabadas; el subtítulo las muestra más grandes, en rojo y subrayadas. Los números dichos ("ocho minutos") se destacan
  solos. No destacar más de 3 palabras por línea, ni en la intro ni en el "sígueme".
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

Reglas de diseño (estilo cuaderno, desde 2026-11-03):
- Las escenas se escriben igual que siempre, pero se REDIBUJAN a birome solas: cada `stroke` es una línea de
  birome, cada `fill` es un tramado de rayitas con contorno, el texto grande va en letras globo con sombra
  tramada y el chico a mano. Lo que aparece con `alfa`/`globalAlpha` no se desvanece: **se va dibujando** (el
  trazo crece, el texto se escribe letra por letra). Por eso: hacer aparecer las cosas con `entre(...)` en el alfa
  o en el largo, y que se dibujen en el momento en que se nombran.
- Colores -> biromes: blanco y celestes/azules = birome azul (la principal), rojo = birome roja (lo que está mal,
  lo importante), naranja = birome naranja, verde = verde, violeta = violeta, **amarillo = resaltador**. Usar
  pocos colores: azul para casi todo y rojo/resaltador para el punto clave. Lo oscuro (`FONDO`) tapa con papel.
- Sin Neurón la escena se agranda 12 % y se centra en la hoja (y 250 a 1190 en pantalla); el subtítulo va
  abajo, en y=1330. Con Neurón, como siempre (escena arriba, Neurón abajo a la izquierda). Dibujar en la zona
  y=220 a y=1030 del canvas y dejar libre x>930 bajo y=1000 (botones de Reels).
- Dibujos con forma reconocible y del tamaño de la escena (que llenen el panel, nada de figuritas chicas en el
  medio de la hoja vacía). Rellenos grandes (más de ~40 % del panel) solo se contornean: usarlos como marco.
- `estrellas()` no dibuja nada en papel y `sol()` es un sol de birome con rayitos; los brillos (`shadowBlur`)
  se ignoran.
- Cada cosa aparece **cuando se nombra** (`inf.cuando`), con `salto` para los carteles y `entre` para lo que
  crece o se mueve. Algo tiene que estar dibujándose o moviéndose siempre.
- Cifras grandes (64 px o más) salen en letras globo; contadores que suben quedan muy bien.
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
