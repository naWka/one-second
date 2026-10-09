import { Vector3 } from 'three';
import type { Beat } from './types';
import { GlobeWorld, latLon } from '../gl/worlds/globe';
import { content } from '../content';
import { T } from '../data/timeline';
import { bell, easeInOut, lerp, range, smoothRange } from '../core/math';
import { ov, setOn } from '../ui/overlays';

// Scene 4 — the payment network. Earth from space; the packet arcs from the
// acquirer to a network node, which reads the card's first digits (BIN) and
// routes it on to the issuing bank. Thousands of other payments fly around.

const pos = new Vector3();
const look = new Vector3();
const pk = new Vector3();
const tmp = new Vector3();
const focus = new Vector3();
const europe = latLon(46, 8);

let ready = false;
function initLabels(w: GlobeWorld) {
  if (ready) return;
  ready = true;
  const n = content.network;
  const set = (id: string, html: string) => (w.labels.get(id)!.el.innerHTML = `<span class="label-box">${html}</span>`);
  set('acquirer', n.acquirer);
  set('network', n.switch);
  set('issuer', n.issuer);
  set('traffic', n.traffic);
}

/** Packet route through the globe for a scene-local progress. */
export function packetOnGlobe(w: GlobeWorld, p: number, out: Vector3) {
  const a = easeInOut(range(0.12, 0.42, p));
  const b = easeInOut(range(0.6, 0.9, p));
  if (p < 0.6) w.routePoint(0, a, out);
  else w.routePoint(1, b, out);
  const dive = range(0.9, 1, p);
  if (dive > 0) out.multiplyScalar(lerp(1, 0.985, dive));
  return { a, b };
}

export function networkPose(w: GlobeWorld, p: number) {
  initLabels(w);
  const { a, b } = packetOnGlobe(w, p, pk);
  w.packet.visible = true;
  w.packet.setColor(w.packet.color, true);
  w.packet.moveTo(pk);
  w.packet.intensity = 1;
  w.routeA = a;
  w.routeB = b;
  w.routeColorGreen = 0;
  w.traffic = 1;
  w.nodePulse.acquirer = bell(-0.1, 0.2, p);
  w.nodePulse.network = bell(0.38, 0.64, p);
  w.nodePulse.issuer = bell(0.84, 1.1, p);

  // camera
  const pull = easeInOut(range(0, 0.22, p));
  const dive = easeInOut(range(0.88, 1, p));
  focus.copy(w.nodes.acquirer);
  focus.lerp(w.nodes.network, smoothRange(0.1, 0.45, p));
  focus.lerp(w.nodes.issuer, smoothRange(0.55, 0.9, p));
  focus.lerp(europe, (1 - smoothRange(0.2, 0.4, p)) * 0.5 * pull);

  // close above the acquirer → wide → following
  tmp.copy(w.nodes.acquirer).normalize().multiplyScalar(2.9);
  pos.copy(focus).normalize().multiplyScalar(lerp(7.8, 6.3, smoothRange(0.25, 0.6, p)));
  pos.y += 0.9;
  pos.lerpVectors(tmp, pos, pull);
  look.copy(focus).multiplyScalar(lerp(0.15, 0.55, smoothRange(0.2, 0.6, p)));
  look.lerp(w.nodes.acquirer, 1 - pull);
  if (dive > 0) {
    tmp.copy(w.nodes.issuer).normalize().multiplyScalar(2.55);
    pos.lerp(tmp, dive);
    look.lerp(w.nodes.issuer, dive);
  }
  if (!w.portrait) {
    tmp.subVectors(look, pos).normalize().cross(w.camera.up).multiplyScalar(-1.05 * pull * (1 - dive));
    look.add(tmp);
  }
  w.shoot(pos, look, 38);

  const L = w.labels;
  L.set('acquirer', w.nodes.acquirer, bell(0.02, 0.32, p));
  L.set('network', w.nodes.network, bell(0.3, 0.7, p));
  L.set('issuer', w.nodes.issuer, bell(0.62, 1.05, p));
  L.set('traffic', tmp.copy(latLon(28, -40, 2.35)), bell(0.18, 0.42, p) * 0.9);
}

let digits: HTMLElement[] | null = null;
export const network: Beat = {
  worlds: ['globe'],
  keyframes: [0.14, 0.42, 0.7],
  hud: (p) => ({
    ms:
      p < 0.6
        ? lerp(T.acquirer + 40, T.network, range(0, 0.6, p))
        : lerp(T.network, T.issuerIn, range(0.6, 1, p)),
    factor: 1000,
  }),
  shots(p, ctx) {
    const w = ctx.world<GlobeWorld>('globe');
    return { a: { world: w, apply: () => networkPose(w, p) } };
  },
  overlay(p, vis) {
    const el = ov(4);
    setOn(el, vis > 0 && p > 0.36 && p < 0.66);
    digits ??= [...(el?.querySelectorAll<HTMLElement>('.pan-d') ?? [])];
    const lit = Math.floor(range(0.43, 0.56, p) * 8.99);
    digits.forEach((d, k) => setOn(d, k < lit, 'is-bin'));
  },
  cues: [
    { at: 0.12, sound: 'whoosh' },
    { at: 0.5, sound: 'tick' },
    { at: 0.6, sound: 'whoosh' },
  ],
};
