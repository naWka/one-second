import { Quaternion, Vector3 } from 'three';
import type { Beat } from './types';
import type { CafeWorld } from '../gl/worlds/cafe';
import { easeInOut, lerp, smoothRange } from '../core/math';
import { motion } from '../core/quality';
import { pointer } from '../core/pointer';

// Scene 0 — the café. The card hovers over the terminal; scrolling lowers it.
// At the touch, time freezes: steam stops, dust hangs, the badge jumps to ×1000.

const camFrom = new Vector3(0.0, 1.6, 2.6);
const lookFrom = new Vector3(0.02, 1.3, 0.0);
const camTo = new Vector3(0.66, 1.43, 1.08);
const lookTo = new Vector3(0.48, 1.12, 0.05);
const pos = new Vector3();
const look = new Vector3();
const q = new Quaternion();
const qHover = new Quaternion();

export function coverPose(w: CafeWorld, p: number, time: number) {
  const k = easeInOut(p);
  pos.lerpVectors(camFrom, camTo, k);
  look.lerpVectors(lookFrom, lookTo, k);
  // on wide screens the text sits on the left, so push the subject right
  if (!w.portrait) look.x -= lerp(0.3, 0.12, k);
  // on phones the title covers the lower half: frame the counter higher
  else {
    // a diagonal view stacks cup, lamp and terminal into the narrow frame
    pos.x += 0.75 * (1 - k);
    pos.z -= 0.2 * (1 - k);
    look.x += 0.12 * (1 - k);
    look.y -= 0.3 * (1 - k);
    pos.y += 0.12 * (1 - k);
  }
  if (!motion.reduced) {
    const b = 1 - k;
    pos.x += Math.sin(time * 0.31) * 0.025 * b;
    pos.y += Math.sin(time * 0.43) * 0.018 * b;
    pos.x += pointer.x * 0.12 * b;
    pos.y -= pointer.y * 0.06 * b;
  }
  w.shoot(pos, look, lerp(35, 30, k));

  w.card.visible = true;
  const rest = w.cardRestPose(0.012);
  const drop = smoothRange(0.08, 1, p);
  const bob = motion.reduced ? 0 : Math.sin(w.time * 1.3) * 0.012 * (1 - drop);
  w.card.position.set(
    rest.pos.x + 0.02 * (1 - drop),
    rest.pos.y + 0.34 * (1 - drop) + bob,
    rest.pos.z + 0.1 * (1 - drop),
  );
  qHover.setFromAxisAngle(new Vector3(1, 0, 0.2).normalize(), 0.9 + (motion.reduced ? 0 : Math.sin(w.time * 0.7) * 0.05));
  q.copy(qHover).premultiply(rest.q);
  w.card.quaternion.copy(q).slerp(rest.q, drop);

  // the moment of contact freezes time
  w.targetTimeScale = p > 0.94 ? 0.0015 : 1;
  w.field = smoothRange(0.8, 1, p) * 0.7;
  w.read = smoothRange(0.85, 1, p);
  w.xray = 0;
  w.coilPower = 0;
  w.approved = 0;
  w.steam = 1;
  w.packet.visible = false;
  w.labels.set('reader', null, 0);
  w.labels.set('card', null, 0);
  w.labels.set('freq', null, 0);
}

export const cover: Beat = {
  worlds: ['cafe'],
  keyframes: [0],
  hud: (p) => ({ ms: 0, factor: p > 0.94 ? 1000 : 1 }),
  shots(p, ctx) {
    const w = ctx.world<CafeWorld>('cafe');
    return { a: { world: w, apply: () => coverPose(w, p, ctx.time) } };
  },
  overlay(p) {
    coverEl ??= document.querySelector<HTMLElement>('.cover');
    hintEl ??= document.querySelector<HTMLElement>('.cover-hint');
    const o = (1 - smoothRange(0.04, 0.42, p)).toFixed(3);
    if (coverEl) coverEl.style.opacity = o;
    if (hintEl) hintEl.style.opacity = (1 - smoothRange(0.0, 0.18, p)).toFixed(3);
  },
  cues: [{ at: 0.96, sound: 'chirp' }],
};

let coverEl: HTMLElement | null = null;
let hintEl: HTMLElement | null = null;
