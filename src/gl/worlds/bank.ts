import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  FogExp2,
  HemisphereLight,
  InstancedMesh,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Points,
  ShaderMaterial,
  TorusGeometry,
  Vector3,
} from 'three';
import { World } from '../world';
import { C, tone } from '../palette';
import { softPointFrag } from '../glsl';
import { Packet } from '../packet';
import { quality } from '../../core/quality';
import { hash } from '../../core/math';

// The issuing bank: a server hall and, at its heart, the scoring "brain".
// Six feature sectors light up as the bank checks the purchase.

export const BRAIN = new Vector3(0, 2.6, 0);
export const FEATURES = 6;

const nodeVert = /* glsl */ `
attribute float aFeat;
attribute float aSeed;
attribute float aLayer;
uniform float uAct[${FEATURES}];
uniform vec3 uFeatColor[${FEATURES}];
uniform vec3 uBase;
uniform float uPixel;
uniform float uTime;
uniform float uWake;
varying float vAlpha;
varying vec3 vColor;
void main() {
  int f = int(aFeat + 0.5);
  float act = 0.0;
  vec3 fc = uBase;
  for (int i = 0; i < ${FEATURES}; i++) {
    if (i == f) { act = uAct[i]; fc = uFeatColor[i]; }
  }
  float flicker = 0.75 + 0.25 * sin(uTime * (2.0 + aSeed * 3.0) + aSeed * 40.0);
  vColor = mix(uBase, fc * 2.2, act);
  vAlpha = (0.4 + 0.6 * act) * flicker * uWake;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = min((3.0 + (3.0 - aLayer) * 1.4 + act * 5.0) * uPixel * (9.0 / -mv.z), 26.0 * uPixel);
  gl_Position = projectionMatrix * mv;
}
`;

const linkVert = /* glsl */ `
attribute float aFeat;
attribute float aT;
uniform float uAct[${FEATURES}];
uniform vec3 uFeatColor[${FEATURES}];
uniform vec3 uBase;
uniform float uTime;
uniform float uWake;
varying float vAlpha;
varying vec3 vColor;
void main() {
  int f = int(aFeat + 0.5);
  float act = 0.0;
  vec3 fc = uBase;
  for (int i = 0; i < ${FEATURES}; i++) {
    if (i == f) { act = uAct[i]; fc = uFeatColor[i]; }
  }
  float pulse = smoothstep(0.75, 1.0, fract(aT - uTime * 0.9));
  vColor = mix(uBase, fc * 2.0, act);
  vAlpha = (0.025 + act * (0.06 + 0.5 * pulse)) * uWake;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const linkFrag = /* glsl */ `
varying float vAlpha;
varying vec3 vColor;
void main() { gl_FragColor = vec4(vColor, vAlpha); }
`;

const ledVert = /* glsl */ `
attribute float aSeed;
uniform float uTime;
uniform float uPixel;
uniform vec3 uTeal;
uniform vec3 uAmber;
varying float vAlpha;
varying vec3 vColor;
void main() {
  float blink = step(0.35, fract(sin(floor(uTime * (1.0 + aSeed * 5.0)) * 91.7 + aSeed * 311.0) * 437.5));
  vColor = aSeed > 0.8 ? uAmber * 1.3 : uTeal * 1.1;
  vAlpha = 0.25 + 0.75 * blink;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = min(1.6 * uPixel * (6.0 / -mv.z), 3.0 * uPixel);
  gl_Position = projectionMatrix * mv;
}
`;

const floorFrag = /* glsl */ `
uniform vec3 uTeal;
uniform vec3 uPanel;
varying vec3 vW;
void main() {
  vec2 g = abs(fract(vW.xz * 0.5) - 0.5);
  float line = smoothstep(0.48, 0.5, max(g.x, g.y));
  vec3 col = uPanel * 0.5 + uTeal * line * 0.12;
  float glow = exp(-length(vW.xz) * 0.18);
  col += uTeal * glow * 0.08;
  gl_FragColor = vec4(col, 1.0);
}
`;

function fib(n: number, r: number, i: number) {
  const y = 1 - (i / (n - 1)) * 2;
  const rad = Math.sqrt(1 - y * y);
  const th = Math.PI * (3 - Math.sqrt(5)) * i;
  return new Vector3(Math.cos(th) * rad * r, y * r * 0.42, Math.sin(th) * rad * r);
}

export class BankWorld extends World {
  readonly packet: Packet;
  /** Activation of each feature sector (0..1). */
  readonly act = new Float32Array(FEATURES);
  /** Colour per feature: scanning amber, ok green, risky pink. */
  readonly featColor: Color[] = Array.from({ length: FEATURES }, () => C.teal.clone());
  /** 0 calm, 1 high risk — tints the ring around the packet. */
  risk = 0.2;
  wake = 0;
  readonly featureAnchors: Vector3[] = [];

  private nodeMat: ShaderMaterial;
  private linkMat: ShaderMaterial;
  private ledMat!: ShaderMaterial;
  private ring: Mesh;
  private ringMat: ShaderMaterial;
  private clock = 0;

  constructor(labelHost: HTMLElement) {
    super('bank', labelHost);
    const s = this.scene;
    s.background = C.bg.clone();
    s.fog = new FogExp2(C.bg.getHex(), 0.032);
    this.camera.far = 120;

    const shared = {
      uAct: { value: this.act },
      uFeatColor: { value: this.featColor },
      uBase: { value: tone(C.teal, 0.7) },
      uTime: { value: 0 },
      uWake: { value: 0 },
    };

    // neural "brain": four shells of nodes, links pointing inward
    const layers = [
      { r: 1.25, n: 28 },
      { r: 1.9, n: 48 },
      { r: 2.55, n: 72 },
      { r: 3.2, n: Math.round(110 * (quality.mobile ? 0.7 : 1)) },
    ];
    const nodes: { p: Vector3; feat: number; layer: number }[] = [];
    layers.forEach((L, li) => {
      for (let i = 0; i < L.n; i++) {
        const p = fib(L.n, L.r, i).add(BRAIN);
        const az = Math.atan2(p.z - BRAIN.z, p.x - BRAIN.x);
        const feat = Math.floor(((az + Math.PI) / (Math.PI * 2)) * FEATURES) % FEATURES;
        nodes.push({ p, feat, layer: li });
      }
    });
    const np = new Float32Array(nodes.length * 3);
    const nf = new Float32Array(nodes.length);
    const ns = new Float32Array(nodes.length);
    const nl = new Float32Array(nodes.length);
    nodes.forEach((n, i) => {
      np.set([n.p.x, n.p.y, n.p.z], i * 3);
      nf[i] = n.feat;
      ns[i] = hash(i * 3.1);
      nl[i] = n.layer;
    });
    const ng = new BufferGeometry();
    ng.setAttribute('position', new BufferAttribute(np, 3));
    ng.setAttribute('aFeat', new BufferAttribute(nf, 1));
    ng.setAttribute('aSeed', new BufferAttribute(ns, 1));
    ng.setAttribute('aLayer', new BufferAttribute(nl, 1));
    this.nodeMat = new ShaderMaterial({
      vertexShader: nodeVert,
      fragmentShader: softPointFrag,
      uniforms: { ...shared, uPixel: { value: 1 } },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    const pts = new Points(ng, this.nodeMat);
    pts.frustumCulled = false;
    s.add(pts);

    // links: each node to its 2 nearest in the next inner layer; t runs inward
    const lp: number[] = [];
    const lf: number[] = [];
    const lt: number[] = [];
    for (const n of nodes) {
      if (n.layer === 0) {
        lp.push(n.p.x, n.p.y, n.p.z, BRAIN.x, BRAIN.y, BRAIN.z);
        lf.push(n.feat, n.feat);
        lt.push(0.5, 1);
        continue;
      }
      const inner = nodes
        .filter((m) => m.layer === n.layer - 1)
        .sort((a, b) => a.p.distanceToSquared(n.p) - b.p.distanceToSquared(n.p))
        .slice(0, 2);
      for (const m of inner) {
        lp.push(n.p.x, n.p.y, n.p.z, m.p.x, m.p.y, m.p.z);
        lf.push(n.feat, n.feat);
        const t0 = (3 - n.layer) / 4;
        lt.push(t0, t0 + 0.25);
      }
    }
    const lg = new BufferGeometry();
    lg.setAttribute('position', new BufferAttribute(new Float32Array(lp), 3));
    lg.setAttribute('aFeat', new BufferAttribute(new Float32Array(lf), 1));
    lg.setAttribute('aT', new BufferAttribute(new Float32Array(lt), 1));
    this.linkMat = new ShaderMaterial({
      vertexShader: linkVert,
      fragmentShader: linkFrag,
      uniforms: shared,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    s.add(new LineSegments(lg, this.linkMat));

    // anchors for the DOM feature chips: outer shell, at each sector's middle
    for (let f = 0; f < FEATURES; f++) {
      const az = -Math.PI + ((f + 0.5) / FEATURES) * Math.PI * 2;
      this.featureAnchors.push(new Vector3(Math.cos(az) * 3.5, 0.6 * Math.sin(f * 1.7), Math.sin(az) * 3.5).add(BRAIN));
    }

    // risk ring around the packet
    this.ringMat = new ShaderMaterial({
      vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `uniform vec3 uColor; uniform float uTime; varying vec2 vUv;
        void main(){ float d = 0.55 + 0.45 * sin(vUv.x * 62.83 - uTime * 3.0); gl_FragColor = vec4(uColor * (1.2 + d), 0.75); }`,
      uniforms: { uColor: { value: C.green.clone() }, uTime: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    this.ring = new Mesh(new TorusGeometry(0.55, 0.012, 6, 96), this.ringMat);
    this.ring.position.copy(BRAIN);
    s.add(this.ring);

    this.buildHall();

    this.packet = new Packet(0.55).addTo(s);
    this.packet.visible = false;

  }

  private buildHall() {
    const s = this.scene;
    const rackMat = new MeshStandardMaterial({ color: tone(C.muted, 0.32), metalness: 0.2, roughness: 0.6, flatShading: true });
    const rows = quality.mobile ? 14 : 22;
    const racks = new InstancedMesh(new BoxGeometry(0.9, 2.4, 1.1), rackMat, rows * 4);
    const o = new Object3D();
    const leds: number[] = [];
    const seeds: number[] = [];
    let k = 0;
    for (const side of [-1, 1]) {
      for (const lane of [0, 1]) {
        for (let i = 0; i < rows; i++) {
          const x = side * (2.3 + lane * 3.2);
          const z = 11 + i * 1.15;
          o.position.set(x, 1.2, z);
          o.updateMatrix();
          racks.setMatrixAt(k++, o.matrix);
          const fx = x - side * 0.46;
          for (let j = 0; j < 7; j++) {
            leds.push(fx, 0.35 + hash(i * 7 + j + lane * 99 + side) * 1.9, z + (hash(i * 3 + j * 5 + side) - 0.5) * 0.9);
            seeds.push(hash(i * 13 + j * 17 + lane * 5 + side * 3));
          }
        }
      }
    }
    s.add(racks);
    // thin light strips on the rack fronts
    const strips = new InstancedMesh(new BoxGeometry(0.02, 0.018, 0.82), new MeshBasicMaterial({ color: tone(C.teal, 0.6) }), rows * 4 * 3);
    let m = 0;
    for (const side of [-1, 1]) {
      for (const lane of [0, 1]) {
        for (let i = 0; i < rows; i++) {
          for (const yy of [0.45, 1.25, 2.05]) {
            o.position.set(side * (2.3 + lane * 3.2) - side * 0.46, yy, 11 + i * 1.15);
            o.updateMatrix();
            strips.setMatrixAt(m++, o.matrix);
          }
        }
      }
    }
    s.add(strips);
    const lg = new BufferGeometry();
    lg.setAttribute('position', new BufferAttribute(new Float32Array(leds), 3));
    lg.setAttribute('aSeed', new BufferAttribute(new Float32Array(seeds), 1));
    this.ledMat = new ShaderMaterial({
      vertexShader: ledVert,
      fragmentShader: softPointFrag,
      uniforms: { uTime: { value: 0 }, uPixel: { value: 1 }, uTeal: { value: C.teal }, uAmber: { value: C.amber } },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    const ledPts = new Points(lg, this.ledMat);
    ledPts.frustumCulled = false;
    s.add(ledPts);

    const floor = new Mesh(
      new PlaneGeometry(80, 80),
      new ShaderMaterial({
        vertexShader: /* glsl */ `varying vec3 vW; void main(){ vec4 wp = modelMatrix * vec4(position,1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
        fragmentShader: floorFrag,
        uniforms: { uTeal: { value: C.teal }, uPanel: { value: C.panel } },
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    s.add(floor);
    s.add(new HemisphereLight(tone(C.teal, 0.8), tone(C.panel, 1.5), 1.4));
  }

  protected animate(_sdt: number, dt: number) {
    this.clock += dt;
    const t = this.clock;
    this.nodeMat.uniforms.uTime.value = t;
    this.nodeMat.uniforms.uPixel.value = this.pixelRatio;
    this.nodeMat.uniforms.uWake.value = this.wake;
    this.ledMat.uniforms.uTime.value = t;
    this.ledMat.uniforms.uPixel.value = this.pixelRatio;
    const c = this.ringMat.uniforms.uColor.value as Color;
    if (this.risk < 0.5) c.copy(C.green).lerp(C.amber, this.risk / 0.5);
    else c.copy(C.amber).lerp(C.pink, (this.risk - 0.5) / 0.5);
    this.ringMat.uniforms.uTime.value = t;
    this.ring.rotation.set(Math.PI / 2 + Math.sin(t * 0.4) * 0.3, t * 0.5, 0);
    this.ring.scale.setScalar(1 + this.risk * 0.5);
    this.ring.visible = this.wake > 0.05;
    this.packet.setPixelRatio(this.pixelRatio);
    this.packet.update(dt, t);
  }
}
