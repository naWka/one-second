import { Vector3, type Camera } from 'three';
import { clamp } from '../core/math';

// DOM labels pinned to points in 3D. Text stays real HTML (readable, selectable,
// crisp at any DPR); only its position follows the WebGL camera.

type Label = {
  el: HTMLElement;
  anchor: Vector3;
  opacity: number;
  /** Pixel offset from the anchor. */
  dx: number;
  dy: number;
  /** Box width, re-measured whenever the box element is replaced. */
  box: HTMLElement | null;
  bw: number;
  flip: boolean;
  shift: number;
};

const v = new Vector3();
const EDGE = 8;
/** The right edge keeps clear of the scene rail. */
const edgeRight = (w: number) => (w <= 760 ? 34 : 16);

export class LabelLayer {
  readonly root: HTMLElement;
  private items = new Map<string, Label>();

  constructor(host: HTMLElement, name: string) {
    this.root = document.createElement('div');
    this.root.className = `labels labels-${name}`;
    host.appendChild(this.root);
  }

  add(id: string, html: string, cls = '', dx = 0, dy = 0) {
    const el = document.createElement('div');
    el.className = `label ${cls}`;
    el.innerHTML = html;
    this.root.appendChild(el);
    const label: Label = { el, anchor: new Vector3(), opacity: 0, dx, dy, box: null, bw: 0, flip: false, shift: 0 };
    this.items.set(id, label);
    return label;
  }

  get(id: string) {
    return this.items.get(id);
  }

  set(id: string, anchor: Vector3 | null, opacity: number) {
    const l = this.items.get(id);
    if (!l) return;
    if (anchor) l.anchor.copy(anchor);
    l.opacity = opacity;
  }

  private alpha = -1;

  update(camera: Camera, w: number, h: number, alpha: number) {
    if (alpha !== this.alpha) {
      this.alpha = alpha;
      this.root.style.opacity = alpha.toFixed(3);
      this.root.style.visibility = alpha > 0.01 ? 'visible' : 'hidden';
    }
    if (alpha <= 0.01) return;
    for (const l of this.items.values()) {
      if (l.opacity <= 0.01) {
        if (l.el.style.opacity !== '0') l.el.style.opacity = '0';
        continue;
      }
      v.copy(l.anchor).project(camera);
      const behind = v.z > 1;
      let x = (v.x * 0.5 + 0.5) * w + l.dx;
      const y = (-v.y * 0.5 + 0.5) * h + l.dy;
      const box = l.el.firstElementChild as HTMLElement | null;
      if (box !== l.box || !l.bw) {
        l.box = box;
        l.bw = box?.offsetWidth ?? 0;
        l.shift = 0;
      }
      const right = w - edgeRight(w);
      if (x < 0 || x > w) this.fit(l, x, right, false);
      else if (!l.el.classList.contains('is-plain')) this.fit(l, x, right, true);
      else if (l.bw > right - EDGE) x = (EDGE + right) / 2;
      else x = clamp(x, l.bw / 2 + EDGE, right - l.bw / 2);
      l.el.style.opacity = behind ? '0' : l.opacity.toFixed(3);
      l.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    }
  }

  /** Keeps the box on screen: moves it to the other side of the dot, or nudges it, when it would spill out. */
  private fit(l: Label, x: number, right: number, onScreen: boolean) {
    if (!onScreen) {
      // the anchor itself is off-screen: the box just follows it
      if (l.flip) l.el.classList.toggle('is-flip', (l.flip = false));
      if (l.shift && l.box) l.box.style.translate = '';
      l.shift = 0;
      return;
    }
    const span = l.bw + 14;
    const left = l.el.classList.contains('is-left');
    // Room for the box on its own side; a flipped label needs some slack to come back (no flicker).
    const slack = l.flip ? 12 : 0;
    const home = left ? x - span >= EDGE + slack : x + span <= right - slack;
    const away = left ? x + span <= right : x - span >= EDGE;
    const roomier = left ? right - x > x - EDGE : x - EDGE > right - x;
    const flip = !home && (away || roomier);
    if (flip !== l.flip) l.el.classList.toggle('is-flip', (l.flip = flip));
    const onLeft = left !== flip;
    const shift = Math.round(onLeft ? Math.max(0, EDGE - (x - span)) : Math.min(0, right - (x + span)));
    if (shift !== l.shift && l.box) {
      l.shift = shift;
      l.box.style.translate = shift ? `${shift}px 0` : '';
    }
  }
}
