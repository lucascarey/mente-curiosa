"""Genera varias voces candidatas para cada personaje con una frase suya, para elegir de oído.

Uso: python herramientas/muestras_personajes.py carpeta_destino
"""

import asyncio
import sys
from pathlib import Path

import edge_tts

# personaje: (frase, [(etiqueta, voz, velocidad, tono), ...])
CANDIDATAS = {
    "neuron": (
        "Uno, Glip. Uno. Pero el pulpo tiene tres corazones. Les juro que es simple: "
        "dos mueven la sangre por las branquias y uno por el resto del cuerpo.",
        [
            ("1-jorge-mexico", "es-MX-JorgeNeural", "-5%", "-4Hz"),
            ("2-andrew", "en-US-AndrewMultilingualNeural", "-3%", "-2Hz"),
            ("3-tomas-argentina", "es-AR-TomasNeural", "-5%", "-6Hz"),
        ],
    ),
    "nyx": (
        "Ajá. ¿Y eso quién lo dijo? Tranqui, Bruno, que los pulpos no muerden. Bueno, algunos sí.",
        [
            ("1-ava", "en-US-AvaMultilingualNeural", "-5%", "-6Hz"),
            ("2-dalia-mexico", "es-MX-DaliaNeural", "-5%", "-4Hz"),
            ("3-emma", "en-US-EmmaMultilingualNeural", "-5%", "-8Hz"),
        ],
    ),
    "glip": (
        "Pregunta para mi informe: ¿cuántos corazones tienen los humanos? "
        "Anoto: los humanos se asustan de la sangre azul.",
        [
            ("1-brian", "en-US-BrianMultilingualNeural", "+8%", "+30Hz"),
            ("2-remy-frances", "fr-FR-RemyMultilingualNeural", "+5%", "+35Hz"),
            ("3-florian-aleman", "de-DE-FlorianMultilingualNeural", "+5%", "+30Hz"),
        ],
    ),
    "bruno": (
        "¿Tres? ¿Y si se le rompen los tres juntos? ¡¿Sangre azul?! ¡Yo no me asusté! Tranqui, yo no tengo miedo.",
        [
            ("1-gonzalo-colombia", "es-CO-GonzaloNeural", "+15%", "+20Hz"),
            ("2-alonso-latino", "es-US-AlonsoNeural", "+15%", "+20Hz"),
            ("3-tomas-argentina", "es-AR-TomasNeural", "+18%", "+25Hz"),
        ],
    ),
}

# La escena del ejemplo de los pulpos, con la primera voz de cada uno.
ESCENA = [
    ("glip", "Pregunta para mi informe: ¿cuántos corazones tienen los humanos?"),
    ("neuron", "Uno, Glip. Uno. Pero el pulpo tiene tres."),
    ("bruno", "¿Tres? ¿Y si se le rompen los tres juntos?"),
    ("neuron", "Dos mueven la sangre por las branquias y uno por el resto del cuerpo."),
    ("neuron", "Ah, y su sangre es azul."),
    ("bruno", "¡¿Azul?!"),
    ("glip", "Anoto: los humanos se asustan de la sangre azul."),
    ("bruno", "¡Yo no me asusté!"),
    ("neuron", "Mandáselo a alguien con el corazón roto. El pulpo tiene repuesto."),
]


async def decir(texto: str, voz: str, velocidad: str, tono: str, destino: Path) -> None:
    await edge_tts.Communicate(texto, voz, rate=velocidad, pitch=tono).save(str(destino))


async def main(destino: Path) -> None:
    destino.mkdir(parents=True, exist_ok=True)
    for personaje, (frase, voces) in CANDIDATAS.items():
        for etiqueta, voz, velocidad, tono in voces:
            try:
                await decir(frase, voz, velocidad, tono, destino / f"{personaje}-{etiqueta}.mp3")
                print(personaje, etiqueta)
            except Exception as e:  # una voz que no existe no frena al resto
                print(personaje, etiqueta, "FALLÓ:", e)
    partes = []
    for i, (personaje, linea) in enumerate(ESCENA):
        _, voz, velocidad, tono = CANDIDATAS[personaje][1][0]
        parte = destino / f"_escena{i}.mp3"
        await decir(linea, voz, velocidad, tono, parte)
        partes.append(parte)
    (destino / "escena-pulpos.mp3").write_bytes(b"".join(p.read_bytes() for p in partes))
    for p in partes:
        p.unlink()


asyncio.run(main(Path(sys.argv[1])))
