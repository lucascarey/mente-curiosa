# Mente Curiosa

Fábrica automática de videos de curiosidades para Instagram (@mentecuriosa.tv) y TikTok.

Cuatro veces por día, GitHub Actions toma el próximo guion de `guiones/pendientes`, arma el video y lo publica:

1. **Voz:** voz IA gratuita (edge-tts, `es-MX-JorgeNeural`).
2. **Imágenes:** un clip de [Pixabay](https://pixabay.com) (o Pexels) por cada parte del guion, recortado a vertical.
3. **Subtítulos:** grandes, de 3 palabras, con las palabras clave en amarillo y el usuario de la cuenta abajo.
4. **Publicación:** Reels con la API oficial de Instagram y, si está configurado, TikTok con su API oficial.

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

En local, sin internet: `MC_MOCK=1 python -m mc.main --solo-video` (voz muda y fondos de color).

## Formato de un guion

Un archivo JSON por video en `guiones/pendientes`, que se publican en orden alfabético (`001-…`, `002-…`):

```json
{
  "id": "001-pulpos-tres-corazones",
  "tema": "Animales",
  "partes": [
    {"texto": "Los pulpos tienen *tres corazones*. Y eso no es lo más raro.", "busqueda": "octopus"}
  ],
  "descripcion": "Los pulpos tienen tres corazones 🐙",
  "hashtags": ["#curiosidades", "#datoscuriosos", "#sabiasque", "#animales"],
  "fuente": "https://es.wikipedia.org/wiki/Octopoda"
}
```

- `partes`: entre 3 y 8; cada una lleva un clip distinto. Gancho, dato, giro y cierre.
- Las palabras entre `*asteriscos*` salen en amarillo.
- `busqueda`: en inglés, lo que se busca en Pixabay o Pexels.
- Entre 50 y 160 palabras en total (20 a 60 segundos).
- `python -m mc.main --validar` revisa todos los pendientes.
