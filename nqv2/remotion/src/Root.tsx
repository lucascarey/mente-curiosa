import {Composition} from 'remotion';
import {ReelCiencia, DURACION} from './ReelCiencia';
import {CUES, MUSICA} from './sonido';

export const Root = () => (
  <>
    <Composition id="ReelCiencia" component={ReelCiencia} durationInFrames={DURACION} fps={60} width={1080} height={1920} defaultProps={{cues: CUES, musica: MUSICA}} />
  </>
);
