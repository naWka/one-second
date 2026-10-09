import type { World, WorldName } from '../gl/world';
import type { Renderer } from './renderer';
import { CafeWorld } from '../gl/worlds/cafe';
import { ChipWorld } from '../gl/worlds/chip';
import { CityWorld } from '../gl/worlds/city';
import { GlobeWorld } from '../gl/worlds/globe';
import { BankWorld } from '../gl/worlds/bank';
import { SettleWorld } from '../gl/worlds/settle';

const factories: Record<WorldName, (host: HTMLElement) => World> = {
  cafe: (h) => new CafeWorld(h),
  chip: (h) => new ChipWorld(h),
  city: (h) => new CityWorld(h),
  globe: (h) => new GlobeWorld(h),
  bank: (h) => new BankWorld(h),
  settle: (h) => new SettleWorld(h),
};

/** Lazily created worlds: each is built the first time a scene needs it. */
export class Worlds {
  private map = new Map<WorldName, World>();

  constructor(
    private host: HTMLElement,
    private renderer: Renderer,
  ) {}

  get(name: WorldName): World {
    let w = this.map.get(name);
    if (!w) {
      w = factories[name](this.host);
      w.resize(this.renderer.width, this.renderer.height, this.renderer.dpr);
      this.map.set(name, w);
    }
    return w;
  }

  created() {
    return this.map.values();
  }

  resize() {
    for (const w of this.map.values()) w.resize(this.renderer.width, this.renderer.height, this.renderer.dpr);
  }

  /** Builds and pre-compiles worlds during idle time, in story order. */
  preload(order: WorldName[]) {
    const idle =
      (window as unknown as { requestIdleCallback?: (cb: () => void, o?: object) => void }).requestIdleCallback ??
      ((cb: () => void) => setTimeout(cb, 120));
    const next = () => {
      const name = order.shift();
      if (!name) return;
      if (this.map.has(name)) return idle(next, { timeout: 800 });
      const w = this.get(name);
      this.renderer
        .compile(w.scene, w.camera)
        .catch(() => undefined)
        .finally(() => idle(next, { timeout: 800 }));
    };
    idle(next, { timeout: 800 });
  }
}
