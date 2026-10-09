import { PerspectiveCamera, Scene, Vector3 } from 'three';
import { LabelLayer } from './labels';
import { damp } from '../core/math';

export type WorldName = 'cafe' | 'chip' | 'city' | 'globe' | 'bank' | 'settle';

/**
 * A 3D place the story visits. Worlds own geometry and ambient animation;
 * story scenes (src/scenes) decide where the camera and the packet are.
 */
export abstract class World {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(35, 1, 0.01, 400);
  readonly labels: LabelLayer;
  /** Ambient clock (steam, dust, shimmer). Slows to a crawl when time "freezes". */
  time = 0;
  timeScale = 1;
  targetTimeScale = 1;
  portrait = false;
  pixelRatio = 1;
  private lookTarget = new Vector3();

  constructor(
    readonly name: WorldName,
    labelHost: HTMLElement,
  ) {
    this.labels = new LabelLayer(labelHost, name);
  }

  tick(dt: number) {
    this.timeScale = damp(this.timeScale, this.targetTimeScale, 5, dt);
    this.time += dt * this.timeScale;
    this.animate(dt * this.timeScale, dt);
  }

  /** Ambient animation. `sdt` is scaled (story) time, `dt` is real time. */
  protected abstract animate(sdt: number, dt: number): void;

  resize(w: number, h: number, pixelRatio: number) {
    this.portrait = h > w * 1.05;
    this.pixelRatio = pixelRatio;
    this.camera.aspect = w / h;
    // On tall phones the subject sits in the upper part of the screen,
    // leaving the lower part for text cards.
    if (this.portrait) this.camera.setViewOffset(w, h, 0, h * 0.1, w, h);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
  }

  /** Places the camera; wider FOV on portrait screens keeps the subject in frame. */
  shoot(pos: Vector3, look: Vector3, fov = 35) {
    this.camera.position.copy(pos);
    this.lookTarget.copy(look);
    this.camera.lookAt(this.lookTarget);
    const f = this.portrait ? Math.min(fov * 1.45, 75) : fov;
    if (Math.abs(this.camera.fov - f) > 0.01) {
      this.camera.fov = f;
      this.camera.updateProjectionMatrix();
    }
  }
}
