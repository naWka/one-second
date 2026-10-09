import { Color } from 'three';

// The only colours the site uses (see brief). Darker or brighter variants are
// derived by scaling these values, never by introducing new hues.
export const HEX = {
  bg: '#07090F',
  panel: '#0E1424',
  text: '#E8ECF4',
  muted: '#8A93A6',
  amber: '#FFB547',
  teal: '#4FD1C5',
  green: '#3DDC97',
  pink: '#FF4D8D',
} as const;

export const C = {
  bg: new Color(HEX.bg),
  panel: new Color(HEX.panel),
  text: new Color(HEX.text),
  muted: new Color(HEX.muted),
  amber: new Color(HEX.amber),
  teal: new Color(HEX.teal),
  green: new Color(HEX.green),
  pink: new Color(HEX.pink),
};

/** A palette colour scaled by k (k > 1 gives HDR values that bloom). */
export const tone = (c: Color, k: number) => c.clone().multiplyScalar(k);
