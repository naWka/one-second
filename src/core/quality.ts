// Device tier and accessibility preferences, decided once at startup.
const params = new URLSearchParams(location.search);
const coarse = matchMedia('(pointer: coarse)').matches;
const small = Math.min(window.innerWidth, window.innerHeight) < 700;
const forced = params.get('q');

const mobile = forced ? forced === 'low' : coarse || small;

export const quality = {
  mobile,
  /** Device pixel ratio cap from the brief: 1.75. Mobile starts lower and adapts. */
  maxDpr: Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75),
  msaa: mobile ? 0 : 4,
  shadows: !mobile,
  /** Multiplier for particle and instance counts. */
  density: mobile ? 0.45 : 1,
  debug: params.has('debug'),
};

const reduceQuery = matchMedia('(prefers-reduced-motion: reduce)');
export const motion = {
  reduced: params.has('reduced') || reduceQuery.matches,
};
