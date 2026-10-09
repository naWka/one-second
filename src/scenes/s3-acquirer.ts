import { Vector3 } from 'three';
import type { Beat } from './types';
import type { CityWorld } from '../gl/worlds/city';
import { content } from '../content';
import { T } from '../data/timeline';
import { bell, easeInOut, lerp, range, smoothRange } from '../core/math';
import { ov, setOn } from '../ui/overlays';

// Scene 3 — terminal → acquirer. The packet runs through the wire across the
// night city to the acquirer's data centre; then the camera climbs to the stratosphere.

const pos = new Vector3();
const look = new Vector3();
const pk = new Vector3();
const tmp = new Vector3();
const chase = new Vector3(-3.6, 6.8, 6.4);

let ready = false;
function initLabels(w: CityWorld) {
  if (ready) return;
  ready = true;
  w.labels.get('cafe')!.el.innerHTML = `<span class="label-box">${content.city.cafe}</span>`;
  w.labels.get('acquirer')!.el.innerHTML = `<span class="label-box">${content.city.acquirer}</span>`;
}

export function acquirerPose(w: CityWorld, p: number) {
  initLabels(w);
  const travel = easeInOut(range(0.06, 0.58, p));
  const climb = easeInOut(range(0.7, 1, p));

  w.route.getPointAt(travel, pk);
  if (climb > 0) pk.y += climb * climb * 70;
  w.packet.visible = true;
  w.packet.setColor(w.packet.color, true);
  w.packet.moveTo(pk);
  w.packet.intensity = 1;
  w.wire = travel;
  w.acquirerGlow = smoothRange(0.52, 0.62, p) * (1 - smoothRange(0.8, 1, p) * 0.5);
  w.altitude = smoothRange(0.72, 1, p);

  // camera: wide on the café, chase along the wire, orbit the tower, climb
  const start = tmp.set(3.5, 7.5, 8.5);
  pos.copy(pk).add(chase);
  pos.lerpVectors(start, pos, smoothRange(0, 0.12, p));
  look.copy(pk);
  const orbit = smoothRange(0.56, 0.72, p);
  if (orbit > 0) {
    const a = lerp(0, 0.9, orbit);
    tmp.set(Math.sin(a) * -6.5, 7.5, Math.cos(a) * 6.5).add(w.acquirer);
    pos.lerp(tmp, orbit);
  }
  if (climb > 0) {
    // rise with the packet and look down past it: the city drops away below
    tmp.set(w.acquirer.x - 5 - 6 * climb, pk.y + lerp(4, 14, climb), w.acquirer.z + 7 + 8 * climb);
    pos.lerp(tmp, smoothRange(0, 0.25, climb));
    look.lerp(tmp.copy(pk).lerp(w.acquirer, 0.35 * climb), smoothRange(0, 0.25, climb));
  }
  if (!w.portrait) {
    tmp.subVectors(look, pos).normalize().cross(new Vector3(0, 1, 0)).multiplyScalar(-1.4 * (1 - climb));
    look.add(tmp);
  }
  w.shoot(pos, look, lerp(40, 50, climb));

  w.labels.set('cafe', w.cafe, bell(0.0, 0.3, p));
  w.labels.set('acquirer', tmp.copy(w.acquirerTop).add(new Vector3(0, 0.3, 0)), bell(0.4, 0.86, p));
}

let rows: HTMLElement[] | null = null;
export const acquirer: Beat = {
  worlds: ['city'],
  keyframes: [0.18, 0.58],
  hud: (p) => ({
    ms:
      p < 0.62
        ? lerp(T.cardDone + 30, T.acquirer, range(0, 0.62, p))
        : lerp(T.acquirer, T.acquirer + 40, range(0.62, 1, p)),
    factor: 1000,
  }),
  shots(p, ctx) {
    const w = ctx.world<CityWorld>('city');
    return { a: { world: w, apply: () => acquirerPose(w, p) } };
  },
  overlay(p, vis) {
    const el = ov(3);
    setOn(el, vis > 0);
    rows ??= [...(el?.querySelectorAll<HTMLElement>('.msg-row') ?? [])];
    rows.forEach((r, k) => setOn(r, p > 0.06 + k * 0.06));
  },
  cues: [
    { at: 0.06, sound: 'whoosh' },
    { at: 0.6, sound: 'tick' },
    { at: 0.74, sound: 'whoosh' },
  ],
};
void content;
