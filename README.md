# Mente Curiosa

Fábrica automática de videos de curiosidades para Instagram (@mente.curiosatv) y TikTok.

Cuatro veces por día, GitHub Actions toma el próximo guion de `guiones/pendientes`, arma el video y lo publica:

1. **Voz:** voz IA gratuita (edge-tts, `es-MX-JorgeNeural`).
2. **Ilustraciones:** una ilustración plana por escena, estilo Kurzgesagt, generada con IA en [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/) (modelo Flux, plan gratis). Sin credenciales de Cloudflare usa una foto de Pixabay.
3. **Animación:** `mc/plantilla` es una página HTML que dibuja cada cuadro: la tarjeta de la escena (ilustración o infografía de línea), el búho de la cuenta que habla con la voz, y el texto palabra por palabra en su globo. Chromium la captura a 30 cuadros por segundo.
4. **Sonido:** efectos suaves (soplido, clic, nota) y música de fondo sintetizados en `mc/sonido.py`, sin archivos con licencia. La música baja sola cuando habla la voz.
5. **Publicación:** Reels con la API oficial de Instagram y, si está configurado, TikTok con su API oficial.

Después mueve el guion a `guiones/publicados` con el resultado. Los guiones nuevos se agregan una vez por semana.

## Secretos (Settings → Secrets and variables → Actions)

| Secreto | Para qué | Obligatorio |
| --- | --- | --- |
| `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` | Generar las ilustraciones (token de Workers AI) | Sí |
| `PIXABAY_API_KEY` | Fotos de respaldo si falla Cloudflare (o `PEXELS_API_KEY`) | No |
| `IG_ACCESS_TOKEN` | Publicar en Instagram | Sí |
| `GH_PAT` | Guardar tokens renovados (token fino con permiso *Secrets: read and write* sobre este repo) | Sí |
| `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_REFRESH_TOKEN` | Publicar en TikTok | No |

Hasta que TikTok apruebe la app, los videos se suben en privado. Cuando la aprueben, crear la variable `TIKTOK_PRIVACIDAD` con valor `PUBLIC_TO_EVERYONE`.

## Encender y apagar

La publicación automática corre solo si existe la variable `PUBLICACION_ACTIVA` con valor `true` (Settings → Secrets and variables → Actions → pestaña Variables). Para pausarla, cambiala a `false`.

## Probar

En la pestaña **Actions → Publicar video → Run workflow**, con "Solo armar el video" marcado, se genera un video sin publicar y queda para descargar como artefacto.

En local, sin internet: `MC_MOCK=1 python -m mc.main --solo-video` (voz muda e ilustraciones de color). Si Playwright no encuentra Chromium, indicar la ruta con `MC_CHROMIUM`.

## Formato de un guion

Un archivo JSON por video en `guiones/pendientes`, que se publican en orden alfabético (`001-…`, `002-…`):

```json
{
  "id": "001-pulpos-tres-corazones",
  "tema": "Animales",
  "protagonista": "a cute round purple octopus with big friendly eyes",
  "partes": [
    {"texto": "Los pulpos tienen *tres corazones*. Y eso no es lo más raro.", "busqueda": "octopus",
     "visual": {"tipo": "numero", "valor": 3, "etiqueta": "corazones"}},
    {"texto": "Cuando nadan, ese tercer corazón se detiene.", "busqueda": "octopus crawling",
     "dibujo": "A cute octopus crawling on the sandy sea floor among rocks and seaweed",
     "visual": {"tipo": "ilustracion", "texto": "prefiere arrastrarse"}}
  ],
  "descripcion": "Los pulpos tienen tres corazones 🐙",
  "hashtags": ["#curiosidades", "#datoscuriosos", "#sabiasque", "#animales"],
  "fuente": "https://es.wikipedia.org/wiki/Octopoda"
}
```

- `partes`: entre 3 y 8. Gancho, dato, giro y cierre.
- Las palabras entre `*asteriscos*` salen con el color del tema y el búho levanta el ala.
- `protagonista` (opcional): en inglés, cómo se ve el personaje principal de las ilustraciones, para que sea el mismo en todas las escenas.
- `dibujo`: en inglés, qué tiene que mostrar la ilustración (un sujeto claro, sin texto). El estilo y la paleta del tema se agregan solos.
- `busqueda`: en inglés, la foto de respaldo en Pixabay; si falta `dibujo`, también se usa para la ilustración.
- `visual` (opcional, por defecto `ilustracion`): qué muestra la tarjeta de la escena.

| Tipo | Campos | Ejemplo |
| --- | --- | --- |
| `ilustracion` | `texto` opcional (etiqueta sobre la ilustración) | `{"tipo": "ilustracion", "texto": "sangre azul"}` |
| `numero` | `valor`, `etiqueta`, `prefijo`/`sufijo` opcionales | `{"tipo": "numero", "valor": 243, "etiqueta": "días"}` |
| `comparacion` | `a` y `b` con `etiqueta`, `valor` e `icono` ([nombre de Lucide](https://lucide.dev/icons)); `titulo`, `unidad` | ver `003-venus-dia-anio.json` |
| `linea` | `hitos`: 2 a 4 con `anio` (número, negativo antes de Cristo), `fecha`, `etiqueta` | ver `002-cleopatra-luna.json` |
| `seguir` | nada (botón de seguir animado, va al final) | `{"tipo": "seguir"}` |

- Entre 50 y 160 palabras en total (20 a 60 segundos).
- `python -m mc.main --validar` revisa todos los pendientes.
