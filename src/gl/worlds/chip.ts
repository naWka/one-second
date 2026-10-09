import {
  AdditiveBlending,
  DataTexture,
  FloatType,
  LinearFilter,
  RGBAFormat,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  DirectionalLight,
  EdgesGeometry,
  FogExp2,
  Group,
  HemisphereLight,
  IcosahedronGeometry,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  OctahedronGeometry,
  PlaneGeometry,
  PointLight,
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

// Macro view of the card's chip: a city of transistor blocks around a guarded
// vault (the secure element). Three streams flow in; the packet is born inside.

const groundVert = /* glsl */ `
varying vec2 vP;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vP = wp.xz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;
const groundFrag = /* glsl */ `
uniform float uTime;
uniform vec3 uTeal;
uniform vec3 uAmber;
uniform vec3 uPanel;
uniform float uEnergy;
varying vec2 vP;
float h(float n) { return fract(sin(n * 91.345) * 47453.5453); }
float line(float c, float w) { return smoothstep(w, 0.0, abs(c)); }
void main() {
  vec2 p = vP;
  vec3 col = uPanel * 0.55;
  // fine silicon grid
  vec2 g = abs(fract(p * 4.0) - 0.5);
  col += uPanel * 0.5 * smoothstep(0.47, 0.5, max(g.x, g.y));
  // main traces with travelling pulses
  float lane = 0.5;
  vec2 cell = floor(p / lane);
  vec2 f = p / lane - cell - 0.5;
  float onX = step(0.45, h(cell.y * 7.0 + 3.0));
  float onY = step(0.55, h(cell.x * 13.0 + 1.0));
  float lx = line(f.y, 0.06) * onX;
  float ly = line(f.x, 0.06) * onY;
  float px = smoothstep(0.92, 1.0, fract(p.x * 0.18 - uTime * (0.25 + h(cell.y) * 0.5) + h(cell.y * 3.1)));
  float py = smoothstep(0.92, 1.0, fract(p.y * 0.18 - uTime * (0.25 + h(cell.x) * 0.5) + h(cell.x * 5.7)));
  vec3 tc = mix(uTeal, uAmber, step(0.7, h(cell.y + cell.x * 0.1)));
  col += tc * (lx + ly) * 0.16;
  col += tc * (lx * px + ly * py) * 2.2 * uEnergy;
  // edge fade
  float r = length(p);
  col *= smoothstep(9.0, 3.5, r);
  gl_FragColor = vec4(col, 1.0);
}
`;

const streamVert = /* glsl */ `
attribute float aT;
attribute float aSeed;
uniform float uTime;
uniform float uFlow;
uniform float uPixel;
uniform vec3 uColor;
uniform sampler2D uPath;
varying float vAlpha;
varying vec3 vColor;
void main() {
  float t = fract(aT + uTime * (0.12 + aSeed * 0.05));
  vec3 p = texture2D(uPath, vec2(t, 0.5)).xyz;
  p += (vec3(fract(aSeed * 13.1), fract(aSeed * 7.3), fract(aSeed * 3.7)) - 0.5) * 0.12 * (1.0 - t);
  vAlpha = uFlow * smoothstep(0.0, 0.08, t) * smoothstep(1.0, 0.85, t);
  vColor = uColor;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = (2.0 + aSeed * 3.0) * uPixel * (6.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}
`;


function pathTexture(curve: CatmullRomCurve3, n = 128) {
  const data = new Float32Array(n * 4);
  const v = new Vector3();
  for (let i = 0; i < n; i++) {
    curve.getPointAt(i / (n - 1), v);
    data.set([v.x, v.y, v.z, 1], i * 4);
  }
  const tex = new DataTexture(data, n, 1, RGBAFormat, FloatType);
  tex.magFilter = LinearFilter;
  tex.minFilter = LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export type StreamName = 'data' | 'nonce' | 'key';

export class ChipWorld extends World {
  readonly packet: Packet;
  readonly vaultTop = new Vector3(0, 1.05, 0);
  readonly core = new Vector3(0, 0.55, 0);
  /** 0..1 flow strength of each stream. */
  readonly flow: Record<StreamName, number> = { data: 0, nonce: 0, key: 0 };
  readonly streamStart: Record<StreamName, Vector3> = {
    data: new Vector3(),
    nonce: new Vector3(),
    key: new Vector3(),
  };
  coreGlow = 0;
  energy = 0.4;

  private groundMat: ShaderMaterial;
  private streamMats: Record<StreamName, ShaderMaterial> = {} as Record<StreamName, ShaderMaterial>;
  private shell: LineSegments;
  private keyObj = new Group();
  private coreMesh: Mesh;
  private coreLight: PointLight;
  private clock = 0;

  constructor(labelHost: HTMLElement) {
    super('chip', labelHost);
    const s = this.scene;
    s.background = C.bg.clone();
    s.fog = new FogExp2(C.bg.getHex(), 0.075);
    this.camera.far = 80;

    this.groundMat = new ShaderMaterial({
      vertexShader: groundVert,
      fragmentShader: groundFrag,
      uniforms: {
        uTime: { value: 0 },
        uTeal: { value: C.teal },
        uAmber: { value: C.amber },
        uPanel: { value: C.panel },
        uEnergy: { value: 0.4 },
      },
    });
    const ground = new Mesh(new PlaneGeometry(20, 20), this.groundMat);
    ground.rotation.x = -Math.PI / 2;
    s.add(ground);

    this.buildBlocks();

    // the vault: secure element
    const metal = new MeshStandardMaterial({
      color: tone(C.panel, 2.4),
      metalness: 0.8,
      roughness: 0.35,
      flatShading: true,
    });
    const base = new Mesh(new CylinderGeometry(0.95, 1.05, 0.45, 8), metal);
    base.position.y = 0.225;
    const ring = new Mesh(new CylinderGeometry(1.1, 1.1, 0.04, 8), new MeshBasicMaterial({ color: tone(C.amber, 0.7) }));
    ring.position.y = 0.02;
    s.add(base, ring);

    this.shell = new LineSegments(
      new EdgesGeometry(new IcosahedronGeometry(1.25, 1)),
      new LineBasicMaterial({ color: tone(C.teal, 1.6), transparent: true, opacity: 0.55 }),
    );
    this.shell.position.y = 0.55;
    this.shell.scale.set(1, 0.72, 1);
    s.add(this.shell);

    this.coreMesh = new Mesh(new OctahedronGeometry(0.22, 0), new MeshBasicMaterial({ color: tone(C.amber, 2) }));
    this.coreMesh.position.copy(this.core);
    s.add(this.coreMesh);
    this.coreLight = new PointLight(C.amber, 2, 6, 1.6);
    this.coreLight.position.set(0, 0.9, 0);
    s.add(this.coreLight);

    // the secret key orbits inside the vault — it never leaves
    const keyMat = new MeshBasicMaterial({ color: tone(C.text, 1.8) });
    const bow = new Mesh(new TorusGeometry(0.07, 0.018, 6, 16), keyMat);
    const shaft = new Mesh(new BoxGeometry(0.2, 0.03, 0.03), keyMat);
    shaft.position.x = 0.16;
    const tooth1 = new Mesh(new BoxGeometry(0.025, 0.06, 0.03), keyMat);
    tooth1.position.set(0.22, -0.04, 0);
    const tooth2 = tooth1.clone();
    tooth2.position.x = 0.17;
    this.keyObj.add(bow, shaft, tooth1, tooth2);
    s.add(this.keyObj);

    const hemi = new HemisphereLight(tone(C.teal, 0.5), tone(C.panel, 1), 0.7);
    const key = new DirectionalLight(C.amber, 1.1);
    key.position.set(4, 6, 3);
    const rim = new DirectionalLight(C.teal, 0.8);
    rim.position.set(-5, 3, -4);
    s.add(hemi, key, rim);

    // three streams flowing into the vault
    const curves: Record<StreamName, Vector3[]> = {
      data: [new Vector3(-6, 0.05, 2.2), new Vector3(-3.5, 0.05, 1.6), new Vector3(-1.8, 0.4, 0.9), new Vector3(-0.3, 0.55, 0.15)],
      nonce: [new Vector3(5.5, 0.05, 3.5), new Vector3(3.2, 0.05, 2.0), new Vector3(1.6, 0.45, 1.0), new Vector3(0.25, 0.55, 0.15)],
      key: [new Vector3(0.6, 0.62, -0.25), new Vector3(0.35, 0.7, 0.35), new Vector3(-0.2, 0.6, 0.3), new Vector3(0, 0.55, 0)],
    };
    const colors: Record<StreamName, Color> = {
      data: tone(C.teal, 2.2),
      nonce: tone(C.amber, 2.4),
      key: tone(C.text, 1.8),
    };
    for (const name of ['data', 'nonce', 'key'] as StreamName[]) {
      const curve = new CatmullRomCurve3(curves[name]);
      this.streamStart[name].copy(curves[name][1]);
      const n = Math.round((name === 'key' ? 60 : 220) * (quality.mobile ? 0.6 : 1));
      const g = new BufferGeometry();
      const t = new Float32Array(n);
      const seed = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        t[i] = i / n;
        seed[i] = hash(i * 1.7 + name.length);
      }
      g.setAttribute('position', new BufferAttribute(new Float32Array(n * 3), 3));
      g.setAttribute('aT', new BufferAttribute(t, 1));
      g.setAttribute('aSeed', new BufferAttribute(seed, 1));
      const mat = new ShaderMaterial({
        vertexShader: streamVert,
        fragmentShader: softPointFrag,
        uniforms: {
          uTime: { value: 0 },
          uFlow: { value: 0 },
          uPixel: { value: 1 },
          uColor: { value: colors[name] },
          uPath: { value: pathTexture(curve) },
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      });
      const pts = new Points(g, mat);
      pts.frustumCulled = false;
      s.add(pts);
      this.streamMats[name] = mat;
    }

    this.packet = new Packet(1.6).addTo(s);
    this.packet.visible = false;

    this.labels.add('vault', '', 'is-teal');
    this.labels.add('key', '', 'is-text');
    this.labels.add('data', '', 'is-teal');
    this.labels.add('nonce', '');
    this.labels.add('packet', '', 'is-plain is-big');
  }

  private buildBlocks() {
    const n = Math.round(2200 * quality.density);
    const geo = new BoxGeometry(1, 1, 1);
    geo.translate(0, 0.5, 0);
    const mat = new MeshStandardMaterial({ metalness: 0.55, roughness: 0.42, flatShading: true });
    const mesh = new InstancedMesh(geo, mat, n);
    const o = new Object3D();
    const col = new Color();
    let k = 0;
    const step = 0.25;
    for (let tries = 0; k < n && tries < n * 6; tries++) {
      const gx = Math.round((hash(tries * 1.31) - 0.5) * 44);
      const gz = Math.round((hash(tries * 2.77) - 0.5) * 44);
      const x = gx * step;
      const z = gz * step;
      const r = Math.hypot(x, z);
      if (r < 1.7 || r > 8.5) continue;
      if (gx % 7 === 0 || gz % 9 === 0) continue; // avenues
      const district = hash(Math.floor(gx / 7) * 17 + Math.floor(gz / 9) * 3);
      const hgt = 0.04 + Math.pow(hash(tries * 5.1), 3) * (0.25 + district * 0.45);
      const w = step * (0.6 + hash(tries * 3.3) * 0.3);
      o.position.set(x, 0, z);
      o.scale.set(w, hgt, w * (0.6 + hash(tries * 4.4) * 0.6));
      o.updateMatrix();
      mesh.setMatrixAt(k, o.matrix);
      const lit = hash(tries * 6.6);
      if (lit > 0.97) col.copy(C.amber).multiplyScalar(0.9);
      else if (lit > 0.93) col.copy(C.teal).multiplyScalar(0.6);
      else col.copy(C.panel).multiplyScalar(1.6 + district * 1.6);
      mesh.setColorAt(k, col);
      k++;
    }
    mesh.count = k;
    this.scene.add(mesh);
  }

  protected animate(_sdt: number, dt: number) {
    this.clock += dt;
    const t = this.clock;
    this.groundMat.uniforms.uTime.value = t;
    this.groundMat.uniforms.uEnergy.value = this.energy;
    for (const name of ['data', 'nonce', 'key'] as StreamName[]) {
      const u = this.streamMats[name].uniforms;
      u.uTime.value = t;
      u.uFlow.value = this.flow[name];
      u.uPixel.value = this.pixelRatio;
    }
    this.shell.rotation.y = t * 0.08;
    const a = t * 0.9;
    this.keyObj.position.set(Math.cos(a) * 0.42, 0.62 + Math.sin(a * 1.3) * 0.05, Math.sin(a) * 0.42);
    this.keyObj.rotation.set(0.3, -a + Math.PI / 2, 0.2);
    this.coreMesh.rotation.y = t * 0.6;
    this.coreMesh.scale.setScalar(1 + this.coreGlow * 0.35);
    (this.coreMesh.material as MeshBasicMaterial).color.copy(C.amber).multiplyScalar(1.4 + this.coreGlow * 3);
    this.coreLight.intensity = 1.5 + this.coreGlow * 6;
    this.packet.setPixelRatio(this.pixelRatio);
    this.packet.update(dt, t);
  }

  keyPosition(out: Vector3) {
    return out.copy(this.keyObj.position);
  }
}
