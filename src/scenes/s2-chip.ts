import { Vector3 } from 'three';
import type { Beat } from './types';
import type { ChipWorld } from '../gl/worlds/chip';
import { content } from '../content';
import { T } from '../data/timeline';
import { bell, easeInOut, easeIn, lerp, smoothRange, range } from '../core/math';

// Scene 2 — inside the chip. A low flight over the circuit city to the vault.
// Key, purchase data and the terminal's random number flow in; the cryptogram
// is born as the amber packet.

const pos = new Vector3();
const look = new Vector3();
const tmp = new Vector3();
const pk = new Vector3();
const HEX_FINAL = '8F3A 61C0 9B2E 47D1';
const HEXCH = '0123456789ABCDEF';

let ready = false;
let lastHex = '';
function initLabels(w: ChipWorld) {
  if (ready) return;
  ready = true;
  const c = content.chip;
  const set = (id: string, html: string) => (w.labels.get(id)!.el.innerHTML = `<span class="label-box">${html}</span>`);
  set('vault', c.vault);
  set('key', `${c.key}<small>${c.keyNote}</small>`);
  set('data', c.data);
  set('nonce', c.nonce);
  set('packet', `<small>${c.packet}</small><span data-hex>ARQC ${HEX_FINAL}</span>`);
}

function hexFor(p: number) {
  // the cryptogram is "computed": digits scramble, then lock left to right
  const lock = range(0.64, 0.74, p);
  const locked = Math.floor(lock * HEX_FINAL.length);
  let out = '';
  const seed = Math.floor(p * 400);
  for (let i = 0; i < HEX_FINAL.length; i++) {
    const ch = HEX_FINAL[i];
    if (ch === ' ' || i < locked) out += ch;
    else out += HEXCH[(seed * 7 + i * 13) % 16];
  }
  return `ARQC ${out}`;
}

export function chipPose(w: ChipWorld, p: number) {
  initLabels(w);
  // camera
  const dive = easeInOut(range(0, 0.14, p));
  const orbit = easeInOut(range(0.1, 0.62, p));
  const close = easeInOut(range(0.6, 0.8, p));
  const exit = easeIn(range(0.84, 1, p));

  const ang = lerp(-0.75, 0.55, orbit);
  const rad = lerp(4.6, 3.3, orbit);
  const hgt = lerp(2.5, 1.55, orbit);
  pos.set(Math.sin(ang) * rad, hgt, Math.cos(ang) * rad);
  tmp.set(0, 7.5, 0.6);
  pos.lerpVectors(tmp, pos, dive);
  look.set(0, 0.45, 0).lerp(new Vector3(0, 0, 0), 1 - dive);

  // packet
  const born = range(0.62, 0.7, p);
  const rise = easeIn(range(0.86, 1, p));
  pk.set(0, lerp(w.core.y, w.vaultTop.y + 0.35, easeInOut(born)), 0);
  pk.y += rise * 7;
  pk.x += rise * 0.6;
  w.packet.visible = p > 0.62;
  w.packet.setColor(w.packet.color, true);
  w.packet.moveTo(pk, rise > 0 ? undefined : new Vector3(0, 1, 0));
  w.packet.intensity = smoothRange(0.62, 0.68, p);

  tmp.set(1.3, 1.6, 2.3);
  pos.lerp(tmp, close);
  look.lerp(pk, close);
  if (exit > 0) {
    pos.lerp(tmp.set(1.1, 1.4, 2.0), exit);
    look.lerp(pk, 1);
  }
  if (!w.portrait) {
    // keep the subject right of the text column
    tmp.subVectors(look, pos).normalize().cross(new Vector3(0, 1, 0)).multiplyScalar(-0.55 * (1 - exit));
    look.add(tmp);
  }
  w.shoot(pos, look, 40);

  // streams and core
  w.flow.key = smoothRange(0.06, 0.2, p) * (1 - smoothRange(0.66, 0.74, p));
  w.flow.data = smoothRange(0.24, 0.36, p) * (1 - smoothRange(0.64, 0.72, p));
  w.flow.nonce = smoothRange(0.28, 0.4, p) * (1 - smoothRange(0.64, 0.72, p));
  w.coreGlow = smoothRange(0.36, 0.62, p) * 0.6 + bell(0.6, 0.76, p) * 1.2;
  w.energy = 0.35 + smoothRange(0.3, 0.62, p) * 0.5;

  // labels
  const L = w.labels;
  L.set('vault', tmp.set(-0.9, 0.55, 0.4), bell(0.05, 0.34, p));
  L.set('key', w.keyPosition(tmp), bell(0.09, 0.44, p));
  L.set('data', w.streamStart.data, bell(0.25, 0.58, p));
  L.set('nonce', w.streamStart.nonce, bell(0.29, 0.6, p));
  L.set('packet', tmp.copy(pk).add(new Vector3(0, 0.5, 0)), bell(0.62, 0.95, p));
  const hex = hexFor(p);
  if (hex !== lastHex) {
    lastHex = hex;
    const el = w.labels.get('packet')!.el.querySelector('[data-hex]');
    if (el) el.textContent = hex;
  }
}

export const chip: Beat = {
  worlds: ['chip'],
  keyframes: [0.12, 0.36, 0.56, 0.8],
  hud: (p) => ({
    ms: p < 0.8 ? lerp(T.powered, T.cardDone, range(0, 0.8, p)) : lerp(T.cardDone, T.cardDone + 30, range(0.8, 1, p)),
    factor: 1000,
  }),
  shots(p, ctx) {
    const w = ctx.world<ChipWorld>('chip');
    return { a: { world: w, apply: () => chipPose(w, p) } };
  },
  cues: [
    { at: 0.64, sound: 'tick' },
    { at: 0.8, sound: 'beep' },
    { at: 0.88, sound: 'whoosh' },
  ],
};
