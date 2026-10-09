import type { World, WorldName } from '../gl/world';
import type { SoundName } from '../core/audio';

export type Ctx = {
  dt: number;
  time: number;
  world<T extends World>(name: WorldName): T;
};

/** One camera view of one world. `apply` must set the world's state purely from progress. */
export type Shot = { world: World; apply: () => void };
export type ShotSet = { a: Shot; b?: Shot; mix?: number; warp?: number };

export type Hud = {
  /** Transaction time in ms. */
  ms: number;
  /** Slow-motion factor shown on the badge, or 'fast' for the time-lapse. */
  factor: number | 'fast';
};

/** A story scene: maps its scroll progress (0..1) to what is on screen. */
export interface Beat {
  worlds: WorldName[];
  shots(p: number, ctx: Ctx): ShotSet;
  hud(p: number): Hud;
  /** DOM overlay for this scene; `vis` fades it at scene boundaries. */
  overlay?(p: number, vis: number): void;
  cues?: { at: number; sound: SoundName }[];
  /** Positions (0..1) of the static frames used in reduced-motion mode. */
  keyframes: number[];
}
