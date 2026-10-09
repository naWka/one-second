import type { Beat, Ctx, Hud, Shot, ShotSet } from '../scenes/types';
import type { Renderer } from './renderer';
import type { Worlds } from './worlds';
import type { World } from '../gl/world';
import { audio } from './audio';
import { clamp } from './math';

type Composite = { a: Shot; b?: Shot; mix: number; warp: number };

const dominant = (s: ShotSet): Shot => (s.b && (s.mix ?? 0) > 0.5 ? s.b : s.a);

/**
 * The scene manager. Turns scroll position into: which world(s) to render,
 * scene progress, crossfades at scene boundaries, HUD values and sound cues.
 */
export class Story {
  tops: number[] = [];
  lens: number[] = [];
  vh = 1;
  current = 0;
  progress = 0;
  hud: Hud = { ms: 0, factor: 1 };
  private prevY = -1;
  private anchors: number[] = [];
  private shownY = 0;
  private fromY = 0;
  private fade = 1;
  private fadeStart = -1;
  private overlayVis: number[] = [];
  private ctx: Ctx;

  constructor(
    readonly beats: Beat[],
    private sections: HTMLElement[],
    private renderer: Renderer,
    private worlds: Worlds,
    private reduced: boolean,
  ) {
    this.ctx = {
      dt: 0,
      time: 0,
      world: <T extends World>(name: Parameters<Worlds['get']>[0]) => this.worlds.get(name) as T,
    };
    this.overlayVis = beats.map(() => -1);
  }

  measure() {
    this.vh = window.innerHeight;
    const max = Math.max(1, document.documentElement.scrollHeight - this.vh);
    this.tops = this.sections.map((s) => s.offsetTop);
    this.lens = this.tops.map((t, i) => {
      const next = i < this.tops.length - 1 ? this.tops[i + 1] : max;
      return Math.max(1, next - t);
    });
    this.anchors = [];
    this.beats.forEach((b, i) => {
      for (const k of b.keyframes) this.anchors.push(this.tops[i] + k * this.lens[i]);
    });
    this.anchors.sort((a, b) => a - b);
  }

  /** Scroll position at which scene i starts. */
  sceneTop(i: number) {
    return this.tops[i] ?? 0;
  }

  locate(y: number) {
    let i = this.tops.length - 1;
    while (i > 0 && y < this.tops[i]) i--;
    return { i, p: clamp((y - this.tops[i]) / this.lens[i]) };
  }

  private compose(y: number): Composite {
    const { i, p } = this.locate(y);
    const cur = this.beats[i].shots(p, this.ctx);
    const zone = this.vh * 0.32;
    const dStart = y - this.tops[i];
    const dEnd = this.tops[i] + this.lens[i] - y;
    let a: Shot | null = null;
    let b: Shot | null = null;
    let mix = 0;
    if (i > 0 && dStart < zone) {
      a = dominant(this.beats[i - 1].shots(1, this.ctx));
      b = dominant(cur);
      mix = 0.5 + dStart / (2 * zone);
    } else if (i < this.beats.length - 1 && dEnd < zone) {
      a = dominant(cur);
      b = dominant(this.beats[i + 1].shots(0, this.ctx));
      mix = 0.5 - dEnd / (2 * zone);
    }
    if (a && b && a.world !== b.world) return { a, b, mix, warp: 1 };
    return { a: cur.a, b: cur.b, mix: cur.mix ?? 0, warp: cur.warp ?? 1 };
  }

  frame(scrollY: number, dt: number, time: number) {
    this.ctx.dt = dt;
    this.ctx.time = time;
    let comp: Composite;
    let y = scrollY;

    if (this.reduced) {
      // Static frames with crossfades instead of camera flights.
      const anchor = this.nearestAnchor(scrollY);
      if (anchor !== this.shownY) {
        this.fromY = this.shownY;
        this.shownY = anchor;
        this.fadeStart = this.prevY < 0 ? -1 : time;
      }
      // wall-clock based, so the crossfade finishes even when frames are slow
      this.fade = this.fadeStart < 0 ? 1 : Math.min(1, (time - this.fadeStart) / 0.6);
      y = this.shownY;
      const to = this.compose(this.shownY);
      if (this.fade < 1) {
        const from = this.compose(this.fromY);
        const fa = from.b && from.mix > 0.5 ? from.b : from.a;
        const tb = to.b && to.mix > 0.5 ? to.b : to.a;
        comp = { a: fa, b: tb, mix: this.fade, warp: 0 };
      } else {
        const tb = to.b && to.mix > 0.5 ? to.b : to.a;
        comp = { a: tb, mix: 0, warp: 0 };
      }
    } else {
      comp = this.compose(scrollY);
    }

    const { i, p } = this.locate(y);
    this.current = i;
    this.progress = p;
    this.hud = this.beats[i].hud(p);

    // tick ambient animation of the worlds on screen
    const active = new Set<World>([comp.a.world]);
    if (comp.b && comp.mix > 0.001) active.add(comp.b.world);
    for (const w of active) w.tick(dt);

    const pass = this.renderer.story;
    const fn = (s: Shot) => () => {
      s.apply();
      return { scene: s.world.scene, camera: s.world.camera };
    };
    pass.a = fn(comp.a);
    pass.b = comp.b ? fn(comp.b) : null;
    pass.mix = comp.b ? comp.mix : 0;
    pass.warp = comp.warp;
    this.renderer.render(dt);

    // labels follow the cameras after the render applied the shots
    const w = this.renderer.width;
    const h = this.renderer.height;
    for (const world of this.worlds.created()) {
      let alpha = 0;
      if (world === comp.a.world) alpha += comp.b && comp.b.world !== world ? 1 - pass.mix : 1;
      if (comp.b && world === comp.b.world && comp.b.world !== comp.a.world) alpha += pass.mix;
      if (comp.b && comp.a.world === comp.b.world && world === comp.a.world) alpha = 1;
      world.labels.update(world.camera, w, h, alpha);
    }

    // DOM overlays
    this.beats.forEach((beat, k) => {
      if (!beat.overlay) return;
      const top = this.tops[k];
      const end = top + this.lens[k];
      const margin = this.vh * 0.25;
      const vis = y > top - margin && y < end - margin ? 1 : 0;
      const pk = clamp((y - top) / this.lens[k]);
      if (vis || this.overlayVis[k] !== 0) beat.overlay(pk, vis);
      this.overlayVis[k] = vis;
    });

    this.cues(scrollY);
    audio.setDrone(this.frozen(y));
  }

  private frozen(y: number) {
    if (this.tops.length < 7) return 0;
    const start = this.tops[1] - this.vh * 0.1;
    const end = this.tops[6] + this.lens[6] * 0.7;
    return y > start && y < end ? 1 : 0;
  }

  private cues(y: number) {
    const prev = this.prevY;
    this.prevY = y;
    if (prev < 0 || y <= prev || y - prev > this.vh * 1.5) return;
    this.beats.forEach((beat, k) => {
      for (const c of beat.cues ?? []) {
        const at = this.tops[k] + c.at * this.lens[k];
        if (prev < at && y >= at) audio.play(c.sound);
      }
    });
  }

  private nearestAnchor(y: number) {
    let best = this.anchors[0] ?? 0;
    for (const a of this.anchors) if (Math.abs(a - y) < Math.abs(best - y)) best = a;
    return best;
  }
}
