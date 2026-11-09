import {Composition} from 'remotion';
import {ReelCiencia, DURACION} from './ReelCiencia';
import {CUES, MUSICA} from './sonido';
import {EpisodioSol, DUR_SOL, CUES_SOL} from './EpisodioSol';
import {Prueba3D, DUR_P3} from './Prueba3D';
import {EpisodioSemaforo, DUR_SEMAFORO, CUES_SEMAFORO} from './EpisodioSemaforo';
import {NoticiasSemana, DUR_SEMANA, CUES_SEMANA} from './NoticiasSemana';

export const Root = () => (
  <>
    <Composition id="EpisodioSol" component={EpisodioSol} durationInFrames={DUR_SOL} fps={60} width={1080} height={1920} defaultProps={{cues: CUES_SOL}} />
    <Composition id="NoticiasSemana" component={NoticiasSemana} durationInFrames={DUR_SEMANA} fps={60} width={1080} height={1920} defaultProps={{cues: CUES_SEMANA}} />
    <Composition id="EpisodioSemaforo" component={EpisodioSemaforo} durationInFrames={DUR_SEMAFORO} fps={60} width={1080} height={1920} defaultProps={{cues: CUES_SEMAFORO}} />
    <Composition id="Prueba3D" component={Prueba3D} durationInFrames={DUR_P3} fps={60} width={1080} height={1920} />
    <Composition id="ReelCiencia" component={ReelCiencia} durationInFrames={DURACION} fps={60} width={1080} height={1920} defaultProps={{cues: CUES, musica: MUSICA}} />
  </>
);
