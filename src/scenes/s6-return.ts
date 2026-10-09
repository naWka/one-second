import { Vector3 } from 'three';
import type { Beat, Ctx, Shot, ShotSet } from './types';
import type { WorldName } from '../gl/world';
import { BankWorld, BRAIN, FEATURES } from '../gl/worlds/bank';
import { GlobeWorld, latLon } from '../gl/worlds/globe';
import type { CityWorld } from '../gl/worlds/city';
import type { CafeWorld } from '../gl/worlds/cafe';
import { C } from '../gl/palette';
import { T } from '../data/timeline';
import { easeIn, easeInOut, easeOut, lerp, range, smoothRange } from '../core/math';
import { ov, setOn } from '../ui/overlays';
import { motion } from '../core/quality';

// Scene 6 — the way back, fast: bank → network → acquirer → café → terminal.
// "Approved", a double beep, and time thaws: steam moves again, ×1000 → ×1.

const pos = new Vector3();
const look = new Vector3();
const pk = new Vector3();
const tmp = new Vector3();
const europe = latLon(47, 7);

export const APPROVED_AT = 0.72;

const bankFrom = new Vector3(Math.sin(0.85) * 7.6, 3.3, Math.cos(0.85) * 7.6);
const bankTo = new Vector3(3.5, 3.9, 15);

function bankReturn(w: BankWorld, q: number) {
  const k = easeIn(q);
  pk.set(0, BRAIN.y + 1.2 + k * 1.3, BRAIN.z + k * 16);
  w.packet.visible = true;
  w.packet.setColor(C.green, true);
  w.packet.moveTo(pk);
  w.wake = 1 - q * 0.5;
  w.risk = 0.1;
  for (let i = 0; i < FEATURES; i++) {
    w.act[i] = 0.55;
    w.featColor[i].copy(C.green);
  }
  pos.lerpVectors(bankFrom, bankTo, easeInOut(q));
  look.copy(BRAIN).lerp(pk, 0.8 + 0.2 * q);
  if (!w.portrait) {
    tmp.subVectors(look, pos).normalize().cross(new Vector3(0, 1, 0)).multiplyScalar(0.9 * (1 - q));
    look.add(tmp);
  } else {
    look.y -= 0.8 * (1 - q);
  }
  w.shoot(pos, look, w.portrait ? 44 : 40);
}

function globeReturn(w: GlobeWorld, q: number) {
  const b = easeInOut(range(0, 0.5, q));
  const a = easeInOut(range(0.5, 1, q));
  if (q < 0.5) w.routePoint(1, 1 - b, pk);
  else w.routePoint(0, 1 - a, pk);
  w.packet.visible = true;
  w.packet.setColor(C.green, true);
  w.packet.moveTo(pk);
  w.routeA = 1;
  w.routeB = 1;
  w.routeColorGreen = 1;
  w.traffic = 1;
  w.nodePulse.issuer = 1 - smoothRange(0, 0.2, q);
  w.nodePulse.network = Math.sin(Math.PI * range(0.3, 0.7, q));
  w.nodePulse.acquirer = smoothRange(0.8, 1, q);
  pos.copy(europe).normalize().multiplyScalar(lerp(6.2, 4.6, q));
  pos.y += 0.6;
  look.copy(europe).multiplyScalar(0.5).lerp(w.nodes.acquirer, smoothRange(0.6, 1, q) * 0.6);
  if (!w.portrait) {
    tmp.subVectors(look, pos).normalize().cross(w.camera.up).multiplyScalar(-0.8);
    look.add(tmp);
  }
  w.shoot(pos, look, 38);
  for (const id of ['acquirer', 'network', 'issuer', 'traffic']) w.labels.set(id, null, 0);
}

function cityReturn(w: CityWorld, q: number) {
  const t = easeInOut(q);
  w.route.getPointAt(1 - t, pk);
  w.packet.visible = true;
  w.packet.setColor(C.green, true);
  w.packet.moveTo(pk);
  w.wire = 1;
  w.wireGreen = 1;
  w.acquirerGlow = 1 - q;
  w.altitude = 0;
  pos.set(lerp(14, 4, t), lerp(16, 7, t), lerp(6, 8, t));
  look.copy(pk);
  w.shoot(pos, look, 42);
  w.labels.set('cafe', null, 0);
  w.labels.set('acquirer', null, 0);
}

const camWide = new Vector3(0.0, 1.6, 2.6);
const lookWide = new Vector3(0.02, 1.3, 0.0);

function cafeReturn(w: CafeWorld, q: number) {
  w.card.visible = true;
  const inT = range(0, 0.26, q);
  const rest = w.cardRestPose(lerp(0.012, 0.16, easeOut(range(0.32, 1, q))));
  w.card.position.copy(rest.pos);
  w.card.quaternion.copy(rest.q);
  w.cable.getPointAt(1 - easeOut(inT), pk);
  w.packet.visible = inT < 1;
  w.packet.setColor(C.green, true);
  w.packet.moveTo(pk);

  w.approved = smoothRange(0.24, 0.3, q);
  w.read = 1 - smoothRange(0.24, 0.3, q);
  w.field = 0.6 * (1 - smoothRange(0.2, 0.35, q));
  w.xray = 0.6 * (1 - smoothRange(0, 0.2, q));
  w.coilPower = 0.4 * (1 - smoothRange(0, 0.2, q));
  w.targetTimeScale = q > 0.3 ? 1 : 0.0015;
  w.steam = 1;

  // close on the terminal as the answer arrives, then back to the wide café shot
  const term = w.terminalPoint(tmp.set(0, 0.07, -0.05));
  const near = new Vector3(term.x + 0.32, term.y + 0.3, term.z + 0.5);
  const back = easeInOut(range(0.3, 1, q));
  pos.lerpVectors(near, camWide, back);
  look.lerpVectors(term, lookWide, back);
  if (!w.portrait) look.x -= 0.3 * back;
  if (!motion.reduced) {
    pos.x += Math.sin(w.time * 0.31) * 0.02 * back;
    pos.y += Math.sin(w.time * 0.43) * 0.014 * back;
  }
  w.shoot(pos, look, lerp(32, 35, back));
  w.labels.set('reader', null, 0);
  w.labels.set('card', null, 0);
  w.labels.set('freq', null, 0);
}

type Seg = { world: WorldName; from: number; to: number; pose: (w: never, q: number) => void };
const segs: Seg[] = [
  { world: 'bank', from: 0, to: 0.16, pose: bankReturn as Seg['pose'] },
  { world: 'globe', from: 0.16, to: 0.42, pose: globeReturn as Seg['pose'] },
  { world: 'city', from: 0.42, to: 0.6, pose: cityReturn as Seg['pose'] },
  { world: 'cafe', from: 0.6, to: 1, pose: cafeReturn as Seg['pose'] },
];
const BLEND = 0.035;

function shotFor(seg: Seg, q: number, ctx: Ctx): Shot {
  const w = ctx.world(seg.world);
  return { world: w, apply: () => seg.pose(w as never, q) };
}

/** The badge counts the slow-motion factor back down: ×1000 → ×1. */
function factorAt(p: number) {
  const k = smoothRange(APPROVED_AT + 0.02, 0.94, p);
  return Math.pow(1000, 1 - k);
}

export const returnTrip: Beat = {
  worlds: ['bank', 'globe', 'city', 'cafe'],
  keyframes: [0.2, 0.72],
  hud: (p) => ({
    ms: p < APPROVED_AT ? lerp(T.decision + 10, T.total, range(0, APPROVED_AT, p)) : T.total,
    factor: factorAt(p),
  }),
  shots(p, ctx): ShotSet {
    let i = segs.findIndex((s) => p < s.to);
    if (i < 0) i = segs.length - 1;
    const seg = segs[i];
    const q = range(seg.from, seg.to, p);
    const a = shotFor(seg, q, ctx);
    const next = segs[i + 1];
    if (next && p > seg.to - BLEND) {
      const mix = range(seg.to - BLEND, seg.to + BLEND, p);
      return { a: shotFor(seg, 1, ctx), b: shotFor(next, 0, ctx), mix, warp: 1 };
    }
    const prev = segs[i - 1];
    if (prev && p < seg.from + BLEND) {
      const mix = range(seg.from - BLEND, seg.from + BLEND, p);
      return { a: shotFor(prev, 1, ctx), b: shotFor(seg, 0, ctx), mix, warp: 1 };
    }
    return { a };
  },
  overlay(p, vis) {
    setOn(ov(6), vis > 0 && p > APPROVED_AT && p < 0.97);
  },
  cues: [
    { at: 0.02, sound: 'whoosh' },
    { at: 0.18, sound: 'whoosh' },
    { at: 0.44, sound: 'whoosh' },
    { at: APPROVED_AT, sound: 'double' },
  ],
};
