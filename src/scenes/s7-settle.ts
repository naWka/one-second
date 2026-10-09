import { Vector3 } from 'three';
import type { Beat } from './types';
import { SettleWorld, AXIS, HOLD, BATCH, ISSUER, ACQUIRER, NETWORK } from '../gl/worlds/settle';
import { content } from '../content';
import { T } from '../data/timeline';
import { bell, easeInOut, lerp, range, smoothRange } from '../core/math';
import { ov, setOn } from '../ui/overlays';

// Scene 7 — the twist. Zoom out from milliseconds to days: the purchase only
// froze money; the café's day is bundled into a batch; banks settle next day.

const pos = new Vector3();
const look = new Vector3();
const tmp = new Vector3();
const H = 3600_000;

/** Time-lapse keyframes (progress → ms since the tap), interpolated in log space. */
const lapse: [number, number][] = [
  [0, T.total],
  [0.1, 60_000],
  [0.3, 3 * H],
  [0.56, 14.3 * H],
  [0.7, 24 * H],
  [1, 26 * H],
];
export function lapseMs(p: number) {
  for (let i = 1; i < lapse.length; i++) {
    if (p <= lapse[i][0]) {
      const [p0, v0] = lapse[i - 1];
      const [p1, v1] = lapse[i];
      const k = (p - p0) / (p1 - p0);
      return Math.exp(lerp(Math.log(v0), Math.log(v1), k));
    }
  }
  return lapse[lapse.length - 1][1];
}

let ready = false;
function initLabels(w: SettleWorld) {
  if (ready) return;
  ready = true;
  const c = content.settle;
  const set = (id: string, html: string) => (w.labels.get(id)!.el.innerHTML = `<span class="label-box">${html}</span>`);
  set('hold', c.auth);
  set('batch', c.batch);
  set('clearing', c.clearing);
  set('settlement', c.settlement);
  set('issuer', c.issuer);
  set('acquirer', c.acquirer);
  set('day1', `${c.dayLabel} 1`);
  set('day2', `${c.dayLabel} 2`);
}

export function settlePose(w: SettleWorld, p: number) {
  initLabels(w);
  w.cursor = smoothRange(0.02, 0.95, p);
  w.buys = smoothRange(0.16, 0.56, p);
  w.gather = smoothRange(0.56, 0.68, p);
  w.clearing = smoothRange(0.7, 0.86, p);
  w.settlement = smoothRange(0.84, 0.92, p);
  w.freeze = 1 - smoothRange(0.88, 0.97, p);

  const cx = lerp(AXIS.from, AXIS.to, w.cursor);
  const a = easeInOut(range(0, 0.3, p));
  const b = easeInOut(range(0.3, 0.6, p));
  const c = easeInOut(range(0.62, 0.85, p));
  pos.set(HOLD.x + 1.1, 1.6, 2.4);
  look.set(HOLD.x, 1.1, 0);
  pos.lerp(tmp.set(cx - 0.5, 2.3, 7), a);
  look.lerp(tmp.set(cx - 1.5, 0.9, 0), a);
  pos.lerp(tmp.set(-0.5, 3.2, 10.5), b);
  look.lerp(tmp.set(-0.6, 0.9, 0), b);
  pos.lerp(tmp.set(3.2, 3.6, 8.2), c);
  look.lerp(tmp.set(4.0, 1.5, -1.3), c);
  if (!w.portrait) {
    tmp.subVectors(look, pos).normalize().cross(new Vector3(0, 1, 0)).multiplyScalar(-1.3);
    look.add(tmp);
  }
  w.shoot(pos, look, 40);

  const L = w.labels;
  L.set('hold', tmp.set(HOLD.x + 0.3, 1.5, 0), bell(-0.1, 0.42, p));
  L.set('batch', tmp.copy(BATCH).add(new Vector3(0.35, 0.4, 0)), bell(0.58, 0.8, p));
  L.set('clearing', tmp.copy(NETWORK).add(new Vector3(0.3, 0.2, 0)), bell(0.7, 0.92, p));
  L.set('settlement', tmp.lerpVectors(ISSUER, ACQUIRER, 0.5).setY(3.6), smoothRange(0.84, 0.9, p));
  L.set('issuer', tmp.copy(ISSUER).setY(1.2), smoothRange(0.64, 0.72, p));
  L.set('acquirer', tmp.copy(ACQUIRER).setY(1.2), smoothRange(0.64, 0.72, p));
  L.set('day1', tmp.set(AXIS.from + 0.1, -0.35, 0), smoothRange(0.04, 0.14, p));
  L.set('day2', tmp.set(AXIS.dayEnd + 1.2, -0.35, 0), smoothRange(0.52, 0.62, p));
}

let units: HTMLElement[] | null = null;
export const settle: Beat = {
  worlds: ['settle'],
  keyframes: [0.16, 0.48, 0.78],
  hud: (p) => ({ ms: lapseMs(p), factor: 'fast' }),
  shots(p, ctx) {
    const w = ctx.world<SettleWorld>('settle');
    return { a: { world: w, apply: () => settlePose(w, p) } };
  },
  overlay(p, vis) {
    const el = ov(7);
    setOn(el, vis > 0);
    units ??= [...(el?.querySelectorAll<HTMLElement>('[data-scale]') ?? [])];
    const k = p < 0.04 ? 0 : p < 0.12 ? 1 : p < 0.56 ? 2 : 3;
    units.forEach((u, i) => setOn(u, i === k));
  },
  cues: [{ at: 0.86, sound: 'chirp' }],
};
