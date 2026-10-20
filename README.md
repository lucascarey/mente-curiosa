# Mente Curiosa

Fábrica automática de videos de curiosidades para Instagram (@mentecuriosa.tv) y TikTok.

Cuatro veces por día, GitHub Actions toma el próximo guion de `guiones/pendientes`, arma el video y lo publica:

1. **Voz:** voz IA gratuita (edge-tts, `es-MX-JorgeNeural`).
2. **Fotos:** una de [Pixabay](https://pixabay.com) (o Pexels) por escena, nítida en una tarjeta y desenfocada de fondo.
3. **Animación:** `mc/plantilla` es una página HTML que dibuja cada cuadro con gráficos animados (números, comparaciones, líneas de tiempo, emojis), subtítulos palabra por palabra y el color del tema. Chromium la captura a 30 cuadros por segundo.
4. **Sonido:** efectos (whoosh, pop, ding) y música de fondo sintetizados en `mc/sonido.py`, sin archivos con licencia. La música baja sola cuando habla la voz.
5. **Publicación:** Reels con la API oficial de Instagram y, si está configurado, TikTok con su API oficial.

Después mueve el guion a `guiones/publicados` con el resultado. Los guiones nuevos se agregan una vez por semana.

## Secretos (Settings → Secrets and variables → Actions)

| Secreto | Para qué | Obligatorio |
| --- | --- | --- |
| `PIXABAY_API_KEY` | Buscar clips de video (o `PEXELS_API_KEY`) | Sí |
| `IG_ACCESS_TOKEN` | Publicar en Instagram | Sí |
| `GH_PAT` | Guardar tokens renovados (token fino con permiso *Secrets: read and write* sobre este repo) | Sí |
| `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_REFRESH_TOKEN` | Publicar en TikTok | No |

Hasta que TikTok apruebe la app, los videos se suben en privado. Cuando la aprueben, crear la variable `TIKTOK_PRIVACIDAD` con valor `PUBLIC_TO_EVERYONE`.

## Encender y apagar

La publicación automática corre solo si existe la variable `PUBLICACION_ACTIVA` con valor `true` (Settings → Secrets and variables → Actions → pestaña Variables). Para pausarla, cambiala a `false`.

## Probar

En la pestaña **Actions → Publicar video → Run workflow**, con "Solo armar el video" marcado, se genera un video sin publicar y queda para descargar como artefacto.

En local, sin internet: `MC_MOCK=1 python -m mc.main --solo-video` (voz muda y fondos de color). Si Playwright no encuentra Chromium, indicar la ruta con `MC_CHROMIUM`.

## Formato de un guion

Un archivo JSON por video en `guiones/pendientes`, que se publican en orden alfabético (`001-…`, `002-…`):

```json
{
  "id": "001-pulpos-tres-corazones",
  "tema": "Animales",
  "partes": [
    {"texto": "Los pulpos tienen *tres corazones*. Y eso no es lo más raro.", "busqueda": "octopus",
     "visual": {"tipo": "numero", "valor": 3, "etiqueta": "corazones"}}
  ],
  "descripcion": "Los pulpos tienen tres corazones 🐙",
  "hashtags": ["#curiosidades", "#datoscuriosos", "#sabiasque", "#animales"],
  "fuente": "https://es.wikipedia.org/wiki/Octopoda"
}
```

- `partes`: entre 3 y 8; cada una lleva un clip distinto. Gancho, dato, giro y cierre.
- Las palabras entre `*asteriscos*` salen en amarillo.
- `busqueda`: en inglés, la foto que se busca en Pixabay o Pexels.
- `visual` (opcional, por defecto `foto`): el gráfico de la escena.

| Tipo | Campos | Ejemplo |
| --- | --- | --- |
| `foto` | `emoji` opcional (sticker) | `{"tipo": "foto", "emoji": "🫀"}` |
| `emoji` | `emoji`, `texto` opcional | `{"tipo": "emoji", "emoji": "🐙", "texto": "sangre azul"}` |
| `numero` | `valor`, `etiqueta`, `prefijo`/`sufijo` opcionales | `{"tipo": "numero", "valor": 243, "etiqueta": "días"}` |
| `comparacion` | `a` y `b` con `etiqueta`, `valor`, `emoji`; `titulo`, `unidad` | ver `003-venus-dia-anio.json` |
| `linea` | `hitos`: 2 a 4 con `anio` (número, negativo antes de Cristo), `fecha`, `etiqueta` | ver `002-cleopatra-luna.json` |
| `seguir` | nada (botón de seguir animado, va al final) | `{"tipo": "seguir"}` |

- Entre 50 y 160 palabras en total (20 a 60 segundos).
- `python -m mc.main --validar` revisa todos los pendientes.
