import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  FogExp2,
  HemisphereLight,
  InstancedMesh,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Points,
  ShaderMaterial,
  Vector3,
  DirectionalLight,
} from 'three';
import { World } from '../world';
import { C, tone } from '../palette';
import { softPointFrag } from '../glsl';
import { quality } from '../../core/quality';
import { hash, smoothRange, lerp, easeInOut, range } from '../../core/math';

// The twist: authorisation only froze money. The camera zooms out from
// milliseconds to days; the day's purchases are bundled into a batch and the
// banks settle the next day.

export const AXIS = { from: -6, to: 6, dayEnd: 1.4 };
export const HOLD = new Vector3(-5.2, 0.9, 0);
export const BATCH = new Vector3(2.4, 0.55, 0);
export const ISSUER = new Vector3(3.6, 0, -2.6);
export const ACQUIRER = new Vector3(6.4, 0, -2.6);
export const NETWORK = new Vector3(5.0, 2.6, -2.6);

const N_BUYS = 44;

const flowVert = /* glsl */ `
attribute float aT;
uniform float uTime;
uniform float uPixel;
uniform float uAlpha;
uniform vec3 uA;
uniform vec3 uB;
uniform vec3 uColor;
varying float vAlpha;
varying vec3 vColor;
void main() {
  float t = fract(aT + uTime * 0.35);
  vec3 p = mix(uA, uB, t);
  p.y += sin(t * 3.14159) * 1.1;
  vAlpha = uAlpha * smoothstep(0.0, 0.1, t) * smoothstep(1.0, 0.85, t);
  vColor = uColor;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = 5.0 * uPixel * (8.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}
`;

export class SettleWorld extends World {
  /** 0..1 position of the time cursor along the axis. */
  cursor = 0;
  /** How many of the day's purchases have appeared (0..1). */
  buys = 0;
  /** 0..1 purchases gathering into the batch. */
  gather = 0;
  /** 0..1 batch travelling acquirer → network → issuer (clearing). */
  clearing = 0;
  /** 0..1 strength of the money flow issuer → acquirer (settlement). */
  settlement = 0;
  freeze = 1;

  readonly buyPos: Vector3[] = [];
  private buyMesh: InstancedMesh;
  private batchMesh: Mesh;
  private holdIce: Mesh;
  private cursorLine: Mesh;
  private flowMat: ShaderMaterial;
  private o = new Object3D();
  private clock = 0;

  constructor(labelHost: HTMLElement) {
    super('settle', labelHost);
    const s = this.scene;
    s.background = C.bg.clone();
    s.fog = new FogExp2(C.bg.getHex(), 0.035);

    // time axis with ticks
    const axis = new Mesh(new BoxGeometry(AXIS.to - AXIS.from + 2, 0.012, 0.012), new MeshBasicMaterial({ color: tone(C.muted, 0.9) }));
    s.add(axis);
    const tickGeo = new BoxGeometry(0.008, 0.12, 0.008);
    const ticks = new InstancedMesh(tickGeo, new MeshBasicMaterial({ color: tone(C.muted, 0.7) }), 49);
    for (let i = 0; i < 49; i++) {
      this.o.position.set(lerp(AXIS.from, AXIS.to, i / 48), 0, 0);
      this.o.scale.set(1, i % 12 === 0 ? 2.4 : i % 3 === 0 ? 1.2 : 0.6, 1);
      this.o.updateMatrix();
      ticks.setMatrixAt(i, this.o.matrix);
    }
    s.add(ticks);
    const midnight = new Mesh(new BoxGeometry(0.01, 3.2, 0.01), new MeshBasicMaterial({ color: tone(C.muted, 0.5) }));
    midnight.position.set(AXIS.dayEnd + 0.6, 1.4, 0);
    s.add(midnight);

    this.cursorLine = new Mesh(new BoxGeometry(0.02, 2.6, 0.02), new MeshBasicMaterial({ color: tone(C.amber, 2.2) }));
    this.cursorLine.position.y = 1.2;
    s.add(this.cursorLine);

    // your account: a column with the frozen amount
    const acc = new Mesh(
      new BoxGeometry(0.5, 1.6, 0.5),
      new MeshStandardMaterial({ color: tone(C.panel, 3.2), metalness: 0.1, roughness: 0.65, flatShading: true }),
    );
    acc.position.set(HOLD.x, 0.8, HOLD.z);
    s.add(acc);
    this.holdIce = new Mesh(
      new BoxGeometry(0.56, 0.32, 0.56),
      new MeshBasicMaterial({ color: tone(C.amber, 0.75), transparent: true, opacity: 0.85 }),
    );
    this.holdIce.position.set(HOLD.x, 1.45, HOLD.z);
    s.add(this.holdIce);

    // the café's purchases through the day
    for (let i = 0; i < N_BUYS; i++) {
      const t = (i + hash(i * 3.3) * 0.8) / N_BUYS;
      this.buyPos.push(new Vector3(lerp(AXIS.from + 0.6, AXIS.dayEnd, t), 0.35 + hash(i * 1.9) * 0.9, (hash(i * 7.1) - 0.5) * 1.2));
    }
    this.buyMesh = new InstancedMesh(
      new BoxGeometry(0.16, 0.06, 0.06),
      new MeshBasicMaterial({ color: tone(C.amber, 1.8) }),
      N_BUYS,
    );
    s.add(this.buyMesh);

    // the batch: a stack of slabs
    this.batchMesh = new Mesh(
      new BoxGeometry(0.6, 0.5, 0.4),
      new MeshStandardMaterial({ color: tone(C.amber, 0.6), emissive: tone(C.amber, 0.5), metalness: 0.2, roughness: 0.4, flatShading: true }),
    );
    this.batchMesh.position.copy(BATCH);
    s.add(this.batchMesh);

    // banks and network
    const towerMat = new MeshStandardMaterial({ color: tone(C.panel, 3.2), metalness: 0.1, roughness: 0.65, flatShading: true });
    for (const p of [ISSUER, ACQUIRER]) {
      const t = new Mesh(new CylinderGeometry(0.45, 0.55, 2.2, 6), towerMat);
      t.position.set(p.x, 1.1, p.z);
      const cap = new Mesh(new CylinderGeometry(0.5, 0.5, 0.05, 6), new MeshBasicMaterial({ color: tone(C.teal, 1.4) }));
      cap.position.set(p.x, 2.22, p.z);
      s.add(t, cap);
    }
    const net = new Mesh(new CylinderGeometry(0.3, 0.3, 0.05, 6), new MeshBasicMaterial({ color: tone(C.teal, 1.8) }));
    net.position.copy(NETWORK);
    s.add(net);
    const link = new Line(
      new BufferGeometry().setFromPoints([ISSUER.clone().setY(2.25), NETWORK, ACQUIRER.clone().setY(2.25)]),
      new LineBasicMaterial({ color: tone(C.teal, 0.8), transparent: true, opacity: 0.5 }),
    );
    s.add(link);

    // settlement: money flows issuer → acquirer
    const fn = Math.round(80 * (quality.mobile ? 0.6 : 1));
    const fg = new BufferGeometry();
    fg.setAttribute('position', new BufferAttribute(new Float32Array(fn * 3), 3));
    fg.setAttribute('aT', new BufferAttribute(Float32Array.from({ length: fn }, (_, i) => i / fn), 1));
    this.flowMat = new ShaderMaterial({
      vertexShader: flowVert,
      fragmentShader: softPointFrag,
      uniforms: {
        uTime: { value: 0 },
        uPixel: { value: 1 },
        uAlpha: { value: 0 },
        uA: { value: ISSUER.clone().setY(2.3) },
        uB: { value: ACQUIRER.clone().setY(2.3) },
        uColor: { value: tone(C.green, 2) },
      },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    const flow = new Points(fg, this.flowMat);
    flow.frustumCulled = false;
    s.add(flow);

    s.add(new HemisphereLight(tone(C.teal, 0.7), tone(C.panel, 1.4), 1.1));
    const key = new DirectionalLight(C.amber, 0.9);
    key.position.set(-3, 5, 4);
    s.add(key);

    this.labels.add('hold', '', '');
    this.labels.add('batch', '', '');
    this.labels.add('clearing', '', 'is-teal');
    this.labels.add('settlement', '', 'is-plain');
    this.labels.add('issuer', '', 'is-teal is-left');
    this.labels.add('acquirer', '', 'is-teal');
    this.labels.add('day1', '', 'is-plain');
    this.labels.add('day2', '', 'is-plain');
  }

  /** Where the batch is during clearing (acquirer → network → issuer). */
  batchPoint(out: Vector3) {
    const c = this.clearing;
    const a = ACQUIRER.clone().setY(2.5);
    const n = NETWORK.clone().setY(2.9);
    const i = ISSUER.clone().setY(2.5);
    if (c <= 0) return out.copy(BATCH);
    const up = easeInOut(range(0, 0.35, c));
    out.lerpVectors(BATCH, a, up);
    if (c > 0.35) out.lerpVectors(a, n, easeInOut(range(0.35, 0.65, c)));
    if (c > 0.65) out.lerpVectors(n, i, easeInOut(range(0.65, 1, c)));
    return out;
  }

  protected animate(_sdt: number, dt: number) {
    this.clock += dt;
    this.cursorLine.position.x = lerp(AXIS.from, AXIS.to, this.cursor);

    const shown = Math.floor(this.buys * N_BUYS + 0.001);
    const tmp = new Vector3();
    for (let i = 0; i < N_BUYS; i++) {
      const p = this.buyPos[i];
      const vis = i < shown ? 1 : 0;
      const g = smoothRange(i / N_BUYS * 0.5, i / N_BUYS * 0.5 + 0.5, this.gather);
      tmp.lerpVectors(p, BATCH, g);
      this.o.position.copy(tmp);
      this.o.rotation.set(0, 0, 0);
      this.o.scale.setScalar(vis * (1 - g * 0.6));
      this.o.updateMatrix();
      this.buyMesh.setMatrixAt(i, this.o.matrix);
    }
    this.buyMesh.instanceMatrix.needsUpdate = true;

    const bs = smoothRange(0.6, 1, this.gather);
    this.batchMesh.scale.set(1, Math.max(0.001, bs), 1);
    this.batchPoint(this.batchMesh.position);
    if (this.clearing > 0) this.batchMesh.scale.multiplyScalar(1 - smoothRange(0.85, 1, this.clearing) * 0.9);
    this.batchMesh.visible = bs > 0.01;

    (this.holdIce.material as MeshBasicMaterial).opacity = 0.85 * this.freeze;
    this.holdIce.scale.setScalar(0.9 + 0.1 * this.freeze);

    this.flowMat.uniforms.uTime.value = this.clock;
    this.flowMat.uniforms.uPixel.value = this.pixelRatio;
    this.flowMat.uniforms.uAlpha.value = this.settlement;
  }
}
