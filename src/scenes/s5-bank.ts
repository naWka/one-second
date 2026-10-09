import { Vector3 } from 'three';
import type { Beat } from './types';
import { BankWorld, BRAIN, FEATURES } from '../gl/worlds/bank';
import { content } from '../content';
import { T } from '../data/timeline';
import { C } from '../gl/palette';
import { easeIn, easeInOut, lerp, range, smoothRange } from '../core/math';
import { ov, setOn } from '../ui/overlays';

// Scene 5 — the bank decides. Six checks light up sectors of the scoring brain;
// the risk needle swings and settles. "What if…" makes it decline.

const pos = new Vector3();
const look = new Vector3();
const pk = new Vector3();
const tmp = new Vector3();

export const riskState = { whatIf: false };

const featStart = (i: number) => 0.18 + i * 0.075;
const SCAN = 0.05;
export const DECIDE = 0.76;

const calm: [number, number][] = [
  [0.0, 0.3],
  [0.12, 0.3],
  [0.2, 0.48],
  [0.27, 0.22],
  [0.34, 0.56],
  [0.42, 0.3],
  [0.49, 0.64],
  [0.57, 0.28],
  [0.64, 0.38],
  [0.72, 0.12],
  [1, 0.1],
];
const alarm: [number, number][] = [...calm.filter(([p]) => p <= 0.57), [0.6, 0.72], [0.66, 0.95], [1, 0.93]];

function curve(k: [number, number][], p: number) {
  for (let i = 1; i < k.length; i++) {
    if (p <= k[i][0]) {
      const [p0, v0] = k[i - 1];
      const [p1, v1] = k[i];
      return lerp(v0, v1, easeInOut((p - p0) / (p1 - p0)));
    }
  }
  return k[k.length - 1][1];
}

export const riskAt = (p: number) => curve(riskState.whatIf ? alarm : calm, p);

export function bankPose(w: BankWorld, p: number) {
  const declined = riskState.whatIf;
  // packet: flies down the hall into the brain, then departs upward
  const arrive = easeInOut(range(0, 0.18, p));
  const leave = easeIn(range(0.86, 1, p));
  pk.set(0, lerp(1.9, BRAIN.y, arrive), lerp(27, BRAIN.z, arrive));
  pk.y += leave * 1.2;
  w.packet.visible = true;
  w.packet.moveTo(pk);
  w.packet.intensity = 1;
  const decided = p >= DECIDE + 0.02;
  w.packet.setColor(decided ? (declined ? C.pink : C.green) : C.amber, !decided || p < DECIDE + 0.03);

  w.wake = smoothRange(0.08, 0.22, p);
  w.risk = riskAt(p);
  for (let i = 0; i < FEATURES; i++) {
    const s = featStart(i);
    w.act[i] = smoothRange(s, s + 0.03, p) * (0.65 + 0.35 * (1 - smoothRange(s + SCAN, s + SCAN + 0.1, p)));
    const scanning = p < s + SCAN;
    const risky = declined && i === FEATURES - 1;
    w.featColor[i].copy(scanning ? C.amber : risky ? C.pink : C.green);
  }

  // camera: down the hall, then a slow orbit around the brain
  const orbit = smoothRange(0.16, 0.8, p);
  const ang = lerp(0, 0.85, orbit);
  const rad = lerp(9.5, 7.6, orbit);
  tmp.set(Math.sin(ang) * rad, lerp(2.4, 3.3, orbit), Math.cos(ang) * rad);
  pos.set(0, 1.8, 31).lerp(tmp, easeInOut(range(0, 0.2, p)));
  look.copy(BRAIN).lerp(pk, 0.3 + leave * 0.5);
  if (!w.portrait) {
    tmp.subVectors(look, pos).normalize().cross(new Vector3(0, 1, 0)).multiplyScalar(0.9 * orbit);
    look.add(tmp);
  } else {
    look.y -= 0.8 * orbit;
  }
  w.shoot(pos, look, w.portrait ? 44 : 40);
}

let feats: HTMLElement[] | null = null;
let whatIfFeat: HTMLElement | null = null;
let needle: SVGGElement | null = null;
let verdict: HTMLElement | null = null;
let codeEl: HTMLElement | null = null;
let textEl: HTMLElement | null = null;
let toggle: HTMLInputElement | null = null;
let lastNeedle = '';

function bindToggle(el: HTMLElement) {
  if (toggle) return;
  toggle = el.querySelector<HTMLInputElement>('[data-whatif]');
  toggle?.addEventListener('change', () => {
    riskState.whatIf = !!toggle?.checked;
    el.classList.toggle('is-what', riskState.whatIf);
  });
}

export const bank: Beat = {
  worlds: ['bank'],
  keyframes: [0.1, 0.36, 0.6, 0.84],
  hud: (p) => ({
    ms: p < DECIDE ? lerp(T.issuerIn, T.decision, range(0, DECIDE, p)) : lerp(T.decision, T.decision + 10, range(DECIDE, 1, p)),
    factor: 1000,
  }),
  shots(p, ctx) {
    const w = ctx.world<BankWorld>('bank');
    return { a: { world: w, apply: () => bankPose(w, p) } };
  },
  overlay(p, vis) {
    const el = ov(5);
    if (!el) return;
    bindToggle(el);
    setOn(el, vis > 0 && p > 0.1);
    if (!vis && riskState.whatIf) {
      // leaving the scene resets the experiment: the story goes on with "approved"
      riskState.whatIf = false;
      if (toggle) toggle.checked = false;
      el.classList.remove('is-what');
    }
    feats ??= [...el.querySelectorAll<HTMLElement>('.feat:not(.feat-whatif)')];
    whatIfFeat ??= el.querySelector<HTMLElement>('.feat-whatif');
    feats.forEach((f, i) => {
      const s = featStart(i);
      setOn(f, p >= s + SCAN);
      setOn(f, p >= s && p < s + SCAN, 'is-scan');
    });
    const s5 = featStart(FEATURES - 1);
    setOn(whatIfFeat, p >= s5 + SCAN);
    setOn(whatIfFeat, p >= s5 && p < s5 + SCAN, 'is-scan');

    needle ??= el.querySelector<SVGGElement>('.gauge-needle');
    const deg = (lerp(-80, 80, riskAt(p))).toFixed(1);
    if (needle && deg !== lastNeedle) {
      lastNeedle = deg;
      needle.style.transform = `rotate(${deg}deg)`;
    }
    verdict ??= el.querySelector<HTMLElement>('[data-verdict]');
    codeEl ??= el.querySelector<HTMLElement>('[data-code]');
    textEl ??= el.querySelector<HTMLElement>('[data-verdict-text]');
    const b = content.bank;
    const no = riskState.whatIf;
    setOn(verdict, p >= DECIDE);
    setOn(verdict, no, 'is-no');
    const code = no ? b.codeDeclined : b.codeApproved;
    const text = no ? b.declined : b.approved;
    if (codeEl && codeEl.textContent !== code) codeEl.textContent = code;
    if (textEl && textEl.textContent !== text) textEl.textContent = text;
  },
  cues: [
    { at: 0.2, sound: 'tick' },
    { at: 0.35, sound: 'tick' },
    { at: 0.5, sound: 'tick' },
    { at: 0.65, sound: 'tick' },
    { at: 0.86, sound: 'whoosh' },
  ],
};
