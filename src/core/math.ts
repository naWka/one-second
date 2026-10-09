export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const invLerp = (a: number, b: number, v: number) => clamp((v - a) / (b - a));
/** Maps v from [a, b] to [0, 1] (clamped) — the workhorse of scroll choreography. */
export const range = invLerp;
export const smooth = (t: number) => t * t * (3 - 2 * t);
export const smoothRange = (a: number, b: number, v: number) => smooth(invLerp(a, b, v));
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeIn = (t: number) => t * t * t;
/** Frame-rate independent exponential smoothing. */
export const damp = (current: number, target: number, lambda: number, dt: number) =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));
/** Bell curve: 0 outside [a, b], 1 in the middle. */
export const bell = (a: number, b: number, v: number) => {
  const t = invLerp(a, b, v);
  return Math.sin(t * Math.PI);
};
/** Deterministic pseudo-random in [0, 1). */
export const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
