import { Vector3, type Camera } from 'three';

// DOM labels pinned to points in 3D. Text stays real HTML (readable, selectable,
// crisp at any DPR); only its position follows the WebGL camera.

type Label = {
  el: HTMLElement;
  anchor: Vector3;
  opacity: number;
  /** Pixel offset from the anchor. */
  dx: number;
  dy: number;
};

const v = new Vector3();

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
    const label: Label = { el, anchor: new Vector3(), opacity: 0, dx, dy };
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
      const x = (v.x * 0.5 + 0.5) * w + l.dx;
      const y = (-v.y * 0.5 + 0.5) * h + l.dy;
      l.el.style.opacity = behind ? '0' : l.opacity.toFixed(3);
      l.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    }
  }
}
