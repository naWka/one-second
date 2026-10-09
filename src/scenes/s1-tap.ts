import { Vector3 } from 'three';
import type { Beat } from './types';
import type { CafeWorld } from '../gl/worlds/cafe';
import { content } from '../content';
import { T } from '../data/timeline';
import { bell, easeIn, easeInOut, lerp, smoothRange } from '../core/math';

// Scene 1 — the touch. Field rings rise from the reader, the card turns
// see-through and its copper antenna lights up. Then the camera dives into the chip.

const camA = new Vector3(0.66, 1.43, 1.08);
const lookA = new Vector3(0.48, 1.12, 0.05);
const pos = new Vector3();
const look = new Vector3();
const over = new Vector3();
const coilCorner = new Vector3();
const freqAnchor = new Vector3();

let labelsReady = false;
function initLabels(w: CafeWorld) {
  if (labelsReady) return;
  labelsReady = true;
  const c = content.tap;
  w.labels.get('reader')!.el.innerHTML = `<span class="label-box">${c.readerLabel}</span>`;
  w.labels.get('reader')!.el.classList.add('is-teal');
  w.labels.get('card')!.el.innerHTML = `<span class="label-box">${c.cardLabel}</span>`;
  w.labels.get('freq')!.el.innerHTML = `<span class="label-box">${c.fieldLabel}</span>`;
  w.labels.get('freq')!.el.classList.add('is-plain', 'is-big');
}

export function tapPose(w: CafeWorld, p: number) {
  initLabels(w);
  w.card.visible = true;
  const rest = w.cardRestPose(0.012);
  w.card.position.copy(rest.pos);
  w.card.quaternion.copy(rest.q);
  w.refreshAnchors();

  // orbit closer and above the card, then dive into the chip
  over.copy(rest.pos).add(new Vector3(0.2, 0.6, 0.52));
  const orbit = easeInOut(smoothRange(0, 0.62, p));
  pos.lerpVectors(camA, over, orbit);
  look.lerpVectors(lookA, rest.pos, orbit);
  if (!w.portrait) look.x -= lerp(0.12, 0.1, orbit);
  const dive = easeIn(smoothRange(0.66, 1, p));
  const chipEye = w.chipPoint.clone().add(new Vector3(0.0, 0.035, 0.012));
  pos.lerp(chipEye, dive);
  look.lerp(w.chipPoint, dive);
  w.shoot(pos, look, lerp(30, 24, dive));

  w.targetTimeScale = 0.0015;
  w.field = lerp(0.7, 1, smoothRange(0, 0.15, p)) * (1 - smoothRange(0.85, 1, p) * 0.6);
  w.read = 1;
  w.xray = smoothRange(0.18, 0.45, p);
  w.coilPower = smoothRange(0.3, 0.62, p);
  w.approved = 0;
  w.steam = 1;
  w.packet.visible = false;

  // labels
  const k = w.labels;
  freqAnchor.copy(w.antenna).add(new Vector3(0, 0.11, 0));
  k.set('reader', w.antenna, bell(0.02, 0.5, p));
  k.set('freq', freqAnchor, bell(0.05, 0.62, p));
  w.card.localToWorld(coilCorner.set(0.135, 0, 0.08));
  k.set('card', coilCorner, bell(0.38, 0.8, p));
}

export const tap: Beat = {
  worlds: ['cafe'],
  keyframes: [0.2, 0.62],
  hud: (p) => ({ ms: lerp(T.touch, T.powered, smoothRange(0, 0.9, p)), factor: 1000 }),
  shots(p, ctx) {
    const w = ctx.world<CafeWorld>('cafe');
    return { a: { world: w, apply: () => tapPose(w, p) } };
  },
  cues: [{ at: 0.35, sound: 'tick' }],
};
