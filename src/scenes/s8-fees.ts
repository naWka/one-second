import { Vector3 } from 'three';
import type { Beat } from './types';
import type { CafeWorld } from '../gl/worlds/cafe';
import { T } from '../data/timeline';
import { lerp } from '../core/math';
import { motion } from '../core/quality';
import { pointer } from '../core/pointer';

// Scene 8 — back in the café, time flows normally. The calculator lives in the DOM.

const pos = new Vector3();
const look = new Vector3();

export function finalePose(w: CafeWorld, p: number, time: number) {
  const a = motion.reduced ? 0.2 : time * 0.05;
  pos.set(Math.sin(a) * 0.5 - 0.2, 1.75 + lerp(0, 0.25, p), 2.9 + Math.cos(a) * 0.2);
  pos.x += pointer.x * 0.1;
  pos.y -= pointer.y * 0.05;
  look.set(0.1, 1.2, 0);
  w.shoot(pos, look, 38);
  const rest = w.cardRestPose(0.16);
  w.card.position.copy(rest.pos).add(new Vector3(0.25, 0.5, 0.6));
  w.card.visible = false;
  w.packet.visible = false;
  w.approved = 0;
  w.read = 0;
  w.field = 0;
  w.xray = 0;
  w.coilPower = 0;
  w.targetTimeScale = 1;
  w.steam = 1;
  for (const id of ['reader', 'card', 'freq']) w.labels.set(id, null, 0);
}

export const fees: Beat = {
  worlds: ['cafe'],
  keyframes: [0.02, 0.5],
  hud: () => ({ ms: T.total, factor: 1 }),
  shots(p, ctx) {
    const w = ctx.world<CafeWorld>('cafe');
    return {
      a: {
        world: w,
        apply: () => finalePose(w, p, ctx.time),
      },
    };
  },
};
