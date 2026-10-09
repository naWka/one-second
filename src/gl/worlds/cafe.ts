import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  ExtrudeGeometry,
  FogExp2,
  Group,
  HemisphereLight,
  InstancedMesh,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  PointLight,
  Points,
  RingGeometry,
  SRGBColorSpace,
  ShaderMaterial,
  Shape,
  SphereGeometry,
  SpotLight,
  TubeGeometry,
  Vector2,
  Vector3,
  Quaternion,
  Euler,
} from 'three';
import { World } from '../world';
import { C, HEX, tone } from '../palette';
import { noise3, softPointFrag } from '../glsl';
import { Packet } from '../packet';
import { quality } from '../../core/quality';
import { hash } from '../../core/math';

// Low-poly night café: counter, lamp, steaming cup, payment terminal, the card.
// Scenes 0, 1, the end of 6 and the finale all happen here.

const std = (hex: string, k = 1, extra: Partial<ConstructorParameters<typeof MeshStandardMaterial>[0]> = {}) =>
  new MeshStandardMaterial({ color: tone(new Color(hex), k), roughness: 0.8, metalness: 0.05, flatShading: true, ...extra });

const steamFrag = /* glsl */ `
${noise3}
uniform float uTime;
uniform float uSeed;
uniform float uOpacity;
uniform vec3 uColor;
varying vec2 vUv;
void main() {
  vec2 uv = vUv;
  float t = uTime * 0.32;
  float n = snoise(vec3(uv.x * 1.6, uv.y * 1.7 - t, t * 0.35 + uSeed));
  float x = uv.x - 0.5 + n * 0.2 * uv.y;
  float width = mix(0.05, 0.24, uv.y);
  float body = smoothstep(width, 0.0, abs(x));
  float w = snoise(vec3(uv.x * 3.5, uv.y * 4.5 - t * 1.7, uSeed * 1.7)) * 0.5 + 0.5;
  float a = body * smoothstep(0.25, 0.85, w);
  a *= smoothstep(0.0, 0.12, uv.y) * smoothstep(1.0, 0.4, uv.y);
  gl_FragColor = vec4(uColor, a * uOpacity);
}
`;

const coneVert = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;
const coneFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying vec3 vN;
varying vec3 vV;
varying vec2 vUv;
void main() {
  float facing = abs(dot(normalize(vN), normalize(vV)));
  float a = pow(facing, 2.2);
  a *= smoothstep(0.0, 0.55, vUv.y) * smoothstep(1.0, 0.9, vUv.y);
  gl_FragColor = vec4(uColor, a * uOpacity);
}
`;

const dustVert = /* glsl */ `
attribute float aSeed;
uniform float uTime;
uniform float uPixel;
uniform vec3 uApex;
uniform float uSlope;
uniform vec3 uColor;
varying float vAlpha;
varying vec3 vColor;
void main() {
  vec3 p = position;
  float s = aSeed * 6.2831;
  p += vec3(sin(uTime * 0.11 + s) * 0.06, sin(uTime * 0.07 + s * 1.3) * 0.05, cos(uTime * 0.09 + s * 0.7) * 0.06);
  float below = uApex.y - p.y;
  float r = length(p.xz - uApex.xz);
  float cone = below * uSlope;
  float inside = below > 0.0 ? smoothstep(cone, cone * 0.55, r) : 0.0;
  float twinkle = 0.65 + 0.35 * sin(uTime * 0.8 + s * 3.0);
  vAlpha = (0.05 + inside * 0.95) * twinkle;
  vColor = uColor * (1.0 + inside * 1.6);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = (0.9 + fract(aSeed * 31.7) * 1.7) * uPixel * (2.2 / -mv.z);
  gl_Position = projectionMatrix * mv;
}
`;

const ringVert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const ringFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uAlpha;
void main() { gl_FragColor = vec4(uColor, uAlpha); }
`;

const screenFrag = /* glsl */ `
uniform float uTime;
uniform float uRead;
uniform float uApproved;
uniform vec3 uTeal;
uniform vec3 uGreen;
uniform vec3 uText;
varying vec2 vUv;
float seg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}
void main() {
  vec2 uv = vUv;
  vec2 q = (uv - 0.5) * vec2(1.33, 1.0);
  vec3 col = mix(vec3(0.010, 0.014, 0.028), vec3(0.020, 0.030, 0.055), uv.y);
  // contactless symbol: four arcs
  vec2 p = q + vec2(0.16, 0.0);
  float ang = atan(p.y, p.x);
  float icon = 0.0;
  for (int i = 0; i < 4; i++) {
    float r = 0.07 + float(i) * 0.065;
    float d = abs(length(p) - r);
    float wave = 0.55 + 0.45 * sin(uTime * 4.0 - float(i) * 1.3) * uRead;
    icon = max(icon, smoothstep(0.016, 0.006, d) * step(abs(ang), 0.72) * step(0.0, p.x) * wave);
  }
  col += uTeal * icon * 1.8;
  // approved: green field with a check mark
  float check = min(seg(q, vec2(-0.13, 0.0), vec2(-0.04, -0.09)), seg(q, vec2(-0.04, -0.09), vec2(0.16, 0.12)));
  vec3 ok = uGreen * 0.55 + uText * smoothstep(0.03, 0.018, check) * 1.6;
  col = mix(col, ok, uApproved);
  col *= 0.9 + 0.1 * sin(uv.y * 260.0);
  gl_FragColor = vec4(col * 1.25, 1.0);
}
`;

const coilFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uPower;
uniform float uTime;
uniform float uOpacity;
varying vec2 vUv;
void main() {
  float pulse = smoothstep(0.85, 1.0, sin(vUv.x * 60.0 - uTime * 3.0) * 0.5 + 0.5);
  vec3 c = uColor * (0.25 + uPower * (1.6 + 3.0 * pulse));
  gl_FragColor = vec4(c, uOpacity);
}
`;

const windowFrag = /* glsl */ `
uniform float uTime;
uniform vec3 uAmber;
uniform vec3 uTeal;
uniform vec3 uText;
varying vec2 vUv;
float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  vec2 uv = vUv;
  vec3 col = mix(vec3(0.006, 0.009, 0.02), vec3(0.018, 0.028, 0.05), uv.y);
  // far skyline windows
  vec2 g = uv * vec2(150.0, 80.0);
  vec2 id = floor(g);
  float sky = step(uv.y, 0.35 + 0.25 * h(vec2(floor(uv.x * 9.0), 3.0)));
  float lit = step(0.86, h(id)) * sky * step(0.3, fract(g.x)) * step(0.35, fract(g.y));
  col += mix(uAmber, uText, h(id + 1.0)) * lit * 0.1;
  // bokeh street lights drifting by
  for (int i = 0; i < 14; i++) {
    float fi = float(i);
    float speed = 0.004 + h(vec2(fi, 2.0)) * 0.012;
    vec2 c = vec2(fract(h(vec2(fi, 1.0)) + uTime * speed * (h(vec2(fi, 4.0)) > 0.5 ? 1.0 : -1.0)), 0.12 + h(vec2(fi, 3.0)) * 0.35);
    float r = 0.018 + h(vec2(fi, 5.0)) * 0.03;
    float d = length((uv - c) * vec2(1.4, 1.0));
    float disc = smoothstep(r, r * 0.75, d) * (0.6 + 0.4 * smoothstep(r * 0.6, r, d));
    vec3 bc = h(vec2(fi, 6.0)) > 0.6 ? uTeal : uAmber;
    col += bc * disc * 0.2;
  }
  gl_FragColor = vec4(col, 1.0);
}
`;

const basicVert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

function cardFaceTexture() {
  const w = 1024;
  const h = 646;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const g = cv.getContext('2d')!;
  const grd = g.createLinearGradient(0, 0, w, h);
  grd.addColorStop(0, '#141c33');
  grd.addColorStop(0.55, HEX.panel);
  grd.addColorStop(1, '#0a0f1c');
  g.fillStyle = grd;
  g.fillRect(0, 0, w, h);
  // contour lines — an abstract pattern instead of any brand mark
  g.lineWidth = 2;
  for (let i = 0; i < 18; i++) {
    g.strokeStyle = `rgba(79, 209, 197, ${0.05 + (i % 3) * 0.03})`;
    g.beginPath();
    for (let x = 0; x <= w; x += 16) {
      const y = h * 0.15 + i * 30 + Math.sin(x * 0.006 + i * 0.5) * 40 + Math.sin(x * 0.013 + i) * 12;
      if (x === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }
  const glow = g.createRadialGradient(w * 0.92, h * 0.1, 10, w * 0.92, h * 0.1, w * 0.55);
  glow.addColorStop(0, 'rgba(255, 181, 71, 0.38)');
  glow.addColorStop(1, 'rgba(255, 181, 71, 0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, w, h);
  // number as dot groups (no glyphs: all real text lives in the DOM)
  g.fillStyle = 'rgba(232, 236, 244, 0.75)';
  for (let grp = 0; grp < 4; grp++) {
    for (let d = 0; d < 4; d++) {
      g.beginPath();
      g.arc(110 + grp * 205 + d * 38, h * 0.68, 9, 0, Math.PI * 2);
      g.fill();
    }
  }
  g.fillStyle = 'rgba(138, 147, 166, 0.6)';
  g.fillRect(110, h * 0.8, 260, 14);
  // contactless mark
  g.strokeStyle = 'rgba(232, 236, 244, 0.7)';
  g.lineWidth = 7;
  g.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    g.beginPath();
    g.arc(w * 0.36, h * 0.43, 20 + i * 18, -0.75, 0.75);
    g.stroke();
  }
  const tex = new CanvasTexture(cv);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function roundedRect(w: number, h: number, r: number) {
  const s = new Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

export const CARD = { w: 0.3, h: 0.189, t: 0.006 };

export class CafeWorld extends World {
  readonly terminal = new Group();
  readonly card = new Group();
  readonly packet: Packet;
  /** Card x-ray: 0 opaque, 1 see-through with the antenna coil visible. */
  xray = 0;
  coilPower = 0;
  /** Strength of the reader's field rings. */
  field = 0;
  fieldPhase = 0;
  read = 0;
  approved = 0;
  steam = 1;
  /** Path from the terminal into the wall socket: the "wire" the packet takes. */
  readonly cable: CatmullRomCurve3;
  readonly antenna = new Vector3();
  readonly chipPoint = new Vector3();

  private steamPlanes: Mesh[] = [];
  private steamMats: ShaderMaterial[] = [];
  private dustMat: ShaderMaterial;
  private rings: Mesh[] = [];
  private ringMats: ShaderMaterial[] = [];
  private screenMat: ShaderMaterial;
  private windowMat: ShaderMaterial;
  private cardMat: MeshPhysicalMaterial;
  private coilMat: ShaderMaterial;
  private chipMesh: Mesh;
  private dieMat: MeshBasicMaterial;
  private clock = 0;
  private antennaLocal = new Vector3(0, 0.074, -0.11);
  private chipLocal = new Vector3(-0.085, CARD.t / 2 + 0.0008, 0.0);

  constructor(labelHost: HTMLElement) {
    super('cafe', labelHost);
    const s = this.scene;
    s.background = C.bg.clone();
    s.fog = new FogExp2(C.bg.getHex(), 0.11);

    this.buildRoom();
    this.buildCounter();
    this.buildLamps();
    this.buildCup();
    this.buildTerminal();
    this.buildCard();

    // shaders shared below
    this.screenMat = (this.terminal.getObjectByName('screen') as Mesh).material as ShaderMaterial;
    this.windowMat = (s.getObjectByName('window') as Mesh).material as ShaderMaterial;
    this.cardMat = (this.card.getObjectByName('cardBody') as Mesh).material as MeshPhysicalMaterial;
    this.coilMat = (this.card.getObjectByName('coil') as Mesh).material as ShaderMaterial;
    this.chipMesh = this.card.getObjectByName('chip') as Mesh;
    this.dieMat = (this.card.getObjectByName('die') as Mesh).material as MeshBasicMaterial;
    this.dustMat = (s.getObjectByName('dust') as Points).material as ShaderMaterial;

    // cable from the back of the terminal down behind the counter
    this.terminal.updateMatrixWorld(true);
    const t = (x: number, y: number, z: number) => this.terminal.localToWorld(new Vector3(x, y, z));
    this.cable = new CatmullRomCurve3([
      t(0, 0.03, -0.24),
      t(0, 0.0, -0.34),
      new Vector3(0.62, 0.99, -0.4),
      new Vector3(0.75, 0.9, -0.48),
      new Vector3(0.8, 0.3, -0.5),
      new Vector3(0.85, 0.02, -0.55),
    ]);
    const cableMesh = new Mesh(
      new TubeGeometry(this.cable, 48, 0.006, 6, false),
      std(HEX.panel, 1.4, { roughness: 0.5 }),
    );
    s.add(cableMesh);

    this.packet = new Packet(0.22).addTo(s);
    this.packet.visible = false;

    this.labels.add('reader', '', 'label-dot');
    this.labels.add('card', '', 'label-dot');
    this.labels.add('freq', '', 'label-mono');
  }

  private buildRoom() {
    const s = this.scene;
    const floor = new Mesh(new PlaneGeometry(30, 30), std(HEX.panel, 0.55, { roughness: 0.95 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    s.add(floor);

    const wall = new Mesh(new PlaneGeometry(30, 9), std(HEX.panel, 0.7));
    wall.position.set(0, 4.5, -2.15);
    wall.receiveShadow = true;
    s.add(wall);

    // wainscot panels
    const panelGeo = new BoxGeometry(0.42, 1.1, 0.04);
    const panels = new InstancedMesh(panelGeo, std(HEX.panel, 1.05), 22);
    const o = new Object3D();
    for (let i = 0; i < 22; i++) {
      o.position.set(-4.6 + i * 0.44, 0.58, -2.12);
      o.updateMatrix();
      panels.setMatrixAt(i, o.matrix);
    }
    s.add(panels);

    // window with the night street behind
    this.windowMat = new ShaderMaterial({
      vertexShader: basicVert,
      fragmentShader: windowFrag,
      uniforms: {
        uTime: { value: 0 },
        uAmber: { value: C.amber },
        uTeal: { value: C.teal },
        uText: { value: C.text },
      },
    });
    const win = new Mesh(new PlaneGeometry(1.9, 1.35), this.windowMat);
    win.name = 'window';
    win.position.set(-1.75, 1.95, -2.13);
    s.add(win);
    const frameMat = std(HEX.panel, 1.6, { metalness: 0.4, roughness: 0.4 });
    const bars: [number, number, number, number][] = [
      [1.98, 0.05, -1.75, 2.65],
      [1.98, 0.05, -1.75, 1.25],
      [0.05, 1.4, -2.72, 1.95],
      [0.05, 1.4, -0.78, 1.95],
      [0.035, 1.35, -1.75, 1.95],
    ];
    for (const [w, h, x, y] of bars) {
      const b = new Mesh(new BoxGeometry(w, h, 0.06), frameMat);
      b.position.set(x, y, -2.1);
      s.add(b);
    }

    // shelves with jars on the right
    const shelfMat = std(HEX.panel, 1.5);
    for (let k = 0; k < 2; k++) {
      const shelf = new Mesh(new BoxGeometry(1.7, 0.04, 0.26), shelfMat);
      shelf.position.set(1.65, 1.72 + k * 0.48, -2.0);
      shelf.castShadow = true;
      s.add(shelf);
    }
    const jarGeo = new CylinderGeometry(0.07, 0.07, 0.2, 7);
    const jars = new InstancedMesh(jarGeo, std(HEX.muted, 0.55, { roughness: 0.3, metalness: 0.2 }), 14);
    for (let i = 0; i < 14; i++) {
      const k = i % 2;
      const x = 0.95 + Math.floor(i / 2) * 0.22 + hash(i) * 0.04;
      const sc = 0.7 + hash(i * 3) * 0.6;
      o.position.set(x, 1.74 + k * 0.48 + 0.1 * sc, -2.0);
      o.scale.set(1, sc, 1);
      o.updateMatrix();
      jars.setMatrixAt(i, o.matrix);
    }
    s.add(jars);

    // back counter and espresso machine
    const back = new Mesh(new BoxGeometry(7, 0.95, 0.6), std(HEX.panel, 0.9));
    back.position.set(0, 0.475, -1.75);
    s.add(back);
    const backTop = new Mesh(new BoxGeometry(7, 0.04, 0.64), std(HEX.panel, 1.7, { roughness: 0.4 }));
    backTop.position.set(0, 0.97, -1.75);
    s.add(backTop);
    const metal = std(HEX.muted, 0.9, { metalness: 0.7, roughness: 0.3 });
    const machine = new Group();
    const body = new Mesh(new BoxGeometry(0.8, 0.5, 0.45), metal);
    body.position.y = 0.25;
    const top = new Mesh(new BoxGeometry(0.84, 0.05, 0.48), std(HEX.panel, 1.3));
    top.position.y = 0.52;
    machine.add(body, top);
    for (let i = 0; i < 2; i++) {
      const head = new Mesh(new CylinderGeometry(0.05, 0.05, 0.08, 8), metal);
      head.position.set(-0.18 + i * 0.36, 0.12, 0.25);
      const lamp = new Mesh(
        new SphereGeometry(0.012, 6, 4),
        new MeshBasicMaterial({ color: tone(C.amber, 4) }),
      );
      lamp.position.set(-0.18 + i * 0.36, 0.42, 0.226);
      machine.add(head, lamp);
    }
    machine.position.set(1.45, 0.99, -1.8);
    machine.traverse((m) => (m.castShadow = true));
    s.add(machine);

    // a cold rim light from the street side and a soft fill
    const hemi = new HemisphereLight(tone(C.teal, 0.35), tone(C.panel, 1), 0.55);
    s.add(hemi);
    const rim = new DirectionalLight(tone(C.teal, 1), 0.7);
    rim.position.set(-3, 3, -3);
    s.add(rim);
  }

  private buildCounter() {
    const s = this.scene;
    const top = new Mesh(new BoxGeometry(5.4, 0.06, 0.95), std(HEX.panel, 1.9, { roughness: 0.32, metalness: 0.15 }));
    top.position.set(0, 0.97, 0);
    top.receiveShadow = true;
    s.add(top);
    const body = new Mesh(new BoxGeometry(5.2, 0.94, 0.8), std(HEX.panel, 0.85));
    body.position.set(0, 0.47, -0.04);
    s.add(body);
    const slatGeo = new BoxGeometry(0.06, 0.86, 0.03);
    const slats = new InstancedMesh(slatGeo, std(HEX.panel, 1.25), 48);
    const o = new Object3D();
    for (let i = 0; i < 48; i++) {
      o.position.set(-2.5 + i * 0.106, 0.47, 0.38);
      o.updateMatrix();
      slats.setMatrixAt(i, o.matrix);
    }
    s.add(slats);
    // warm strip light under the counter lip
    const strip = new Mesh(new BoxGeometry(5.2, 0.008, 0.01), new MeshBasicMaterial({ color: tone(C.amber, 0.9) }));
    strip.position.set(0, 0.93, 0.46);
    s.add(strip);
  }

  private buildLamps() {
    const s = this.scene;
    const shadeMat = std(HEX.panel, 1.5, { metalness: 0.6, roughness: 0.35, side: DoubleSide });
    const xs = quality.mobile ? [0.08] : [-1.7, 0.08, 1.85];
    for (const x of xs) {
      const main = x === 0.08;
      const cord = new Mesh(new CylinderGeometry(0.004, 0.004, 2, 4), shadeMat);
      cord.position.set(x, 3.1, 0);
      const shade = new Mesh(new ConeGeometry(0.26, 0.22, 10, 1, true), shadeMat);
      shade.position.set(x, 2.1, 0);
      const bulb = new Mesh(new SphereGeometry(0.06, 10, 6), new MeshBasicMaterial({ color: tone(C.amber, main ? 7 : 4) }));
      bulb.position.set(x, 2.0, 0);
      s.add(cord, shade, bulb);
      if (!main) {
        const pl = new PointLight(C.amber, 1.2, 3.5, 2);
        pl.position.set(x, 1.92, 0);
        s.add(pl);
      }
    }
    const spot = new SpotLight(C.amber, 9, 4.5, 0.62, 0.65, 2);
    spot.position.set(0.08, 1.98, 0);
    spot.target.position.set(0.1, 1, 0.05);
    spot.castShadow = quality.shadows;
    spot.shadow.mapSize.set(1024, 1024);
    spot.shadow.bias = -0.0004;
    spot.shadow.radius = 4;
    s.add(spot, spot.target);

    // visible beam
    const beamH = 0.98;
    const beam = new Mesh(
      new ConeGeometry(0.55, beamH, 32, 1, true),
      new ShaderMaterial({
        vertexShader: coneVert,
        fragmentShader: coneFrag,
        uniforms: { uColor: { value: tone(C.amber, 0.9) }, uOpacity: { value: 0.085 } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
      }),
    );
    beam.position.set(0.08, 2.0 - beamH / 2, 0);
    s.add(beam);

    // dust hanging in the beam
    const n = Math.round(900 * quality.density);
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = 0.08 + (hash(i * 1.1) - 0.5) * 1.6;
      pos[i * 3 + 1] = 1.02 + hash(i * 2.3) * 0.95;
      pos[i * 3 + 2] = (hash(i * 3.7) - 0.5) * 1.3;
      seed[i] = hash(i * 4.9);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new BufferAttribute(seed, 1));
    const dust = new Points(
      g,
      new ShaderMaterial({
        vertexShader: dustVert,
        fragmentShader: softPointFrag,
        uniforms: {
          uTime: { value: 0 },
          uPixel: { value: 1 },
          uApex: { value: new Vector3(0.08, 2.0, 0) },
          uSlope: { value: 0.55 / beamH },
          uColor: { value: tone(C.amber, 1.2) },
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    );
    dust.name = 'dust';
    dust.frustumCulled = false;
    s.add(dust);
  }

  private buildCup() {
    const s = this.scene;
    const profile = [
      [0.0, 0.0],
      [0.05, 0.0],
      [0.055, 0.006],
      [0.062, 0.05],
      [0.07, 0.09],
      [0.074, 0.1],
      [0.068, 0.1],
      [0.062, 0.06],
    ].map(([x, y]) => new Vector2(x, y));
    const porcelain = std(HEX.text, 0.8, { roughness: 0.28, flatShading: false });
    const cup = new Mesh(new LatheGeometry(profile, 14), porcelain);
    const coffee = new Mesh(new CylinderGeometry(0.066, 0.066, 0.002, 14), std(HEX.amber, 0.12, { roughness: 0.2 }));
    coffee.position.y = 0.088;
    const saucer = new Mesh(new CylinderGeometry(0.12, 0.09, 0.012, 16), porcelain);
    saucer.position.y = -0.006;
    const handle = new Mesh(new RingGeometry(0.022, 0.034, 10, 1, -Math.PI / 2, Math.PI), porcelain);
    handle.position.set(0.075, 0.055, 0);
    const group = new Group();
    group.add(cup, coffee, saucer, handle);
    group.position.set(-0.36, 1.012, 0.08);
    group.traverse((m) => {
      m.castShadow = true;
      m.receiveShadow = true;
    });
    s.add(group);

    for (let i = 0; i < 3; i++) {
      const mat = new ShaderMaterial({
        vertexShader: basicVert,
        fragmentShader: steamFrag,
        uniforms: {
          uTime: { value: 0 },
          uSeed: { value: i * 3.7 },
          uOpacity: { value: 0.22 },
          uColor: { value: tone(C.text, 1.1) },
        },
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
      });
      const plane = new Mesh(new PlaneGeometry(0.28, 0.62), mat);
      plane.position.set(-0.36 + (i - 1) * 0.015, 1.42, 0.08 + (i - 1) * 0.01);
      s.add(plane);
      this.steamPlanes.push(plane);
      this.steamMats.push(mat);
    }
  }

  private buildTerminal() {
    const t = this.terminal;
    const shell = std(HEX.panel, 1.35, { roughness: 0.45, metalness: 0.2 });
    const base = new Mesh(new BoxGeometry(0.26, 0.05, 0.46), shell);
    base.position.y = 0.025;
    const deck = new Mesh(new BoxGeometry(0.25, 0.025, 0.45), std(HEX.panel, 1.0, { roughness: 0.6 }));
    deck.position.y = 0.06;
    t.add(base, deck);

    const screenMat = new ShaderMaterial({
      vertexShader: basicVert,
      fragmentShader: screenFrag,
      uniforms: {
        uTime: { value: 0 },
        uRead: { value: 0 },
        uApproved: { value: 0 },
        uTeal: { value: C.teal },
        uGreen: { value: C.green },
        uText: { value: C.text },
      },
    });
    const screen = new Mesh(new PlaneGeometry(0.2, 0.15), screenMat);
    screen.name = 'screen';
    screen.rotation.x = -Math.PI / 2;
    screen.position.set(0, 0.0735, -0.11);
    t.add(screen);

    const keyGeo = new BoxGeometry(0.052, 0.012, 0.03);
    const keys = new InstancedMesh(keyGeo, std(HEX.panel, 2.2, { roughness: 0.55 }), 12);
    const o = new Object3D();
    for (let i = 0; i < 12; i++) {
      o.position.set(-0.064 + (i % 3) * 0.064, 0.078, 0.03 + Math.floor(i / 3) * 0.042);
      o.updateMatrix();
      keys.setMatrixAt(i, o.matrix);
    }
    t.add(keys);
    const ok = new Mesh(keyGeo, new MeshBasicMaterial({ color: tone(C.green, 0.8) }));
    ok.position.set(0.064, 0.079, 0.198);
    ok.scale.set(1, 1, 0.8);
    t.add(ok);
    const led = new Mesh(new BoxGeometry(0.12, 0.004, 0.006), new MeshBasicMaterial({ color: tone(C.teal, 3) }));
    led.position.set(0, 0.074, -0.205);
    t.add(led);

    // field rings rise from the antenna under the screen
    for (let i = 0; i < 7; i++) {
      const mat = new ShaderMaterial({
        vertexShader: ringVert,
        fragmentShader: ringFrag,
        uniforms: { uColor: { value: tone(C.teal, 2.6) }, uAlpha: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
      });
      const ring = new Mesh(new RingGeometry(0.982, 1, 96), mat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.copy(this.antennaLocal);
      t.add(ring);
      this.rings.push(ring);
      this.ringMats.push(mat);
    }

    t.position.set(0.48, 1.0, 0.1);
    t.rotation.set(0.16, -0.32, 0, 'YXZ');
    base.castShadow = true;
    deck.castShadow = true;
    this.scene.add(t);
  }

  private buildCard() {
    const c = this.card;
    const geo = new ExtrudeGeometry(roundedRect(CARD.w, CARD.h, 0.014), {
      depth: CARD.t,
      bevelEnabled: false,
      curveSegments: 4,
    });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, -CARD.t / 2, 0);
    // planar UVs for the top face
    const uv = geo.attributes.uv as BufferAttribute;
    const p = geo.attributes.position as BufferAttribute;
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, p.getX(i) / CARD.w + 0.5, 0.5 - p.getZ(i) / CARD.h);
    }
    this.cardMat = new MeshPhysicalMaterial({
      map: cardFaceTexture(),
      roughness: 0.38,
      metalness: 0.1,
      clearcoat: 1,
      clearcoatRoughness: 0.25,
      transparent: true,
      opacity: 1,
    });
    const body = new Mesh(geo, this.cardMat);
    body.name = 'cardBody';
    body.castShadow = true;
    c.add(body);

    const chip = new Mesh(
      new BoxGeometry(0.036, 0.0016, 0.028),
      new MeshStandardMaterial({ color: tone(C.amber, 0.9), metalness: 1, roughness: 0.28 }),
    );
    chip.name = 'chip';
    chip.position.copy(this.chipLocal);
    c.add(chip);

    // the antenna coil hidden inside the card
    const pts: Vector3[] = [];
    const turns = 4;
    for (let k = 0; k < turns; k++) {
      const inset = 0.012 + k * 0.0055;
      const hw = CARD.w / 2 - inset;
      const hh = CARD.h / 2 - inset;
      pts.push(new Vector3(-hw, 0, -hh), new Vector3(hw, 0, -hh), new Vector3(hw, 0, hh), new Vector3(-hw, 0, hh));
    }
    pts.push(new Vector3(-CARD.w / 2 + 0.012 + turns * 0.0055, 0, -0.01), this.chipLocal.clone().setY(0));
    const coilCurve = new CatmullRomCurve3(pts, false, 'catmullrom', 0.02);
    this.coilMat = new ShaderMaterial({
      vertexShader: basicVert,
      fragmentShader: coilFrag,
      uniforms: {
        uColor: { value: C.amber },
        uPower: { value: 0 },
        uTime: { value: 0 },
        uOpacity: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    const coil = new Mesh(new TubeGeometry(coilCurve, 400, 0.0011, 4, false), this.coilMat);
    coil.name = 'coil';
    c.add(coil);
    const die = new Mesh(new BoxGeometry(0.012, 0.002, 0.012), new MeshBasicMaterial({ color: tone(C.amber, 3), transparent: true, opacity: 0 }));
    die.name = 'die';
    die.position.copy(this.chipLocal).setY(0);
    c.add(die);

    this.scene.add(c);
  }

  /** World position of a point given in terminal space. */
  terminalPoint(local: Vector3, out = new Vector3()) {
    this.terminal.updateMatrixWorld();
    return this.terminal.localToWorld(out.copy(local));
  }

  /** Resting pose of the card on the reader, slightly above the screen. */
  cardRestPose(lift = 0.02) {
    const pos = this.terminalPoint(new Vector3(0.0, 0.074 + lift, -0.1));
    const q = new Quaternion().setFromEuler(new Euler(0.16, -0.32 + 0.12, 0, 'YXZ'));
    return { pos, q };
  }

  protected animate(sdt: number, dt: number) {
    const t = this.time;
    for (let i = 0; i < this.steamMats.length; i++) {
      this.steamMats[i].uniforms.uTime.value = t;
      this.steamMats[i].uniforms.uOpacity.value = 0.2 * this.steam;
      const pl = this.steamPlanes[i];
      pl.rotation.y = Math.atan2(this.camera.position.x - pl.position.x, this.camera.position.z - pl.position.z) + (i - 1) * 0.5;
    }
    this.dustMat.uniforms.uTime.value = t;
    this.dustMat.uniforms.uPixel.value = this.pixelRatio * (this.portrait ? 1.4 : 1);
    this.windowMat.uniforms.uTime.value = t;

    // the reader's field: rings rise and widen; their speed is tied to real time
    // so the frozen moment still breathes
    this.fieldPhase += dt * 0.35;
    const n = this.rings.length;
    for (let i = 0; i < n; i++) {
      const ph = (this.fieldPhase + i / n) % 1;
      const r = this.rings[i];
      const sc = 0.03 + ph * 0.24;
      r.scale.setScalar(sc);
      r.position.y = this.antennaLocal.y + 0.004 + ph * 0.05;
      this.ringMats[i].uniforms.uAlpha.value = this.field * Math.pow(1 - ph, 1.8) * Math.min(1, ph * 6) * 0.5;
    }

    const su = this.screenMat.uniforms;
    su.uTime.value += dt;
    su.uRead.value = this.read;
    su.uApproved.value = this.approved;

    this.cardMat.opacity = 1 - this.xray * 0.86;
    this.cardMat.depthWrite = this.xray < 0.5;
    this.coilMat.uniforms.uOpacity.value = this.xray;
    this.coilMat.uniforms.uPower.value = this.coilPower;
    this.coilMat.uniforms.uTime.value += dt;
    this.dieMat.opacity = this.xray * (0.3 + this.coilPower * 0.7);
    (this.chipMesh.material as MeshStandardMaterial).emissive.copy(C.amber).multiplyScalar(this.coilPower * 0.22);

    this.clock += dt;
    this.packet.setPixelRatio(this.pixelRatio);
    this.packet.update(dt, this.clock);
    void sdt;
  }

  /** Update anchors used by labels and the camera. */
  refreshAnchors() {
    this.terminalPoint(this.antennaLocal, this.antenna);
    this.card.updateMatrixWorld();
    this.card.localToWorld(this.chipPoint.copy(this.chipLocal));
  }
}
