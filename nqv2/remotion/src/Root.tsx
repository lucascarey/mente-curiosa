import {Composition, AbsoluteFill, useCurrentFrame, interpolate, Easing} from 'remotion';

const Prueba = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: '#EAF4F2', justifyContent: 'center', alignItems: 'center'}}>
      <div style={{fontSize: 160, color: '#14252C', scale: interpolate(f, [0, 30], [0, 1], {extrapolateRight: 'clamp', easing: Easing.spring({damping: 12})})}}>NQV</div>
    </AbsoluteFill>
  );
};

export const Root = () => (
  <>
    <Composition id="Prueba" component={Prueba} durationInFrames={60} fps={60} width={1080} height={1920} />
  </>
);
