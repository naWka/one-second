import {
  AdditiveBlending,
  BackSide,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  InstancedMesh,
  Mesh,
  Object3D,
  PlaneGeometry,
  Points,
  ShaderMaterial,
  SphereGeometry,
  TubeGeometry,
  Vector3,
} from 'three';
import { World } from '../world';
import { C, tone } from '../palette';
import { softPointFrag } from '../glsl';
import { Packet } from '../packet';
import { quality } from '../../core/quality';
import { hash } from '../../core/math';

// Night city. The packet leaves the café through the wire, crosses town to the
// acquirer's data centre, then climbs toward the payment network.

const FOG = /* glsl */ `
vec3 applyFog(vec3 col, float dist, vec3 bg, float density) {
  float f = 1.0 - exp(-dist * dist * density * density);
  return mix(col, bg, clamp(f, 0.0, 1.0));
}
`;

const buildingVert = /* glsl */ `
varying vec3 vW;
varying vec3 vN;
varying float vSeed;
varying float vH;
void main() {
  vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vW = wp.xyz;
  vN = normalize(mat3(instanceMatrix) * normal);
  vSeed = fract(sin(dot(instanceMatrix[3].xz, vec2(12.9898, 78.233))) * 43758.5453);
  vH = instanceMatrix[1].y;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;
const buildingFrag = /* glsl */ `
${FOG}
uniform vec3 uPanel;
uniform vec3 uAmber;
uniform vec3 uTeal;
uniform vec3 uText;
uniform vec3 uBg;
uniform float uFog;
uniform float uLights;
varying vec3 vW;
varying vec3 vN;
varying float vSeed;
varying float vH;
float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  vec3 n = normalize(vN);
  vec3 L = normalize(vec3(0.4, 0.8, 0.3));
  float lam = 0.35 + 0.65 * max(dot(n, L), 0.0);
  vec3 col = uPanel * (1.1 + vSeed * 0.6) * lam;
  if (n.y < 0.5) {
    float u = abs(n.x) > 0.5 ? vW.z : vW.x;
    vec2 g = vec2(u * 7.0, vW.y * 5.5);
    vec2 cell = floor(g);
    vec2 f = fract(g);
    float win = step(0.22, f.x) * step(f.x, 0.78) * step(0.25, f.y) * step(f.y, 0.7);
    float r = h(cell + vSeed * 31.0);
    float lit = step(0.7, r) * step(0.3, vW.y);
    vec3 wc = r > 0.96 ? uTeal : (r > 0.9 ? uText * 0.8 : uAmber);
    col += wc * win * lit * (1.1 + 0.8 * h(cell * 1.7)) * uLights;
    col += uPanel * win * (1.0 - lit) * 0.4;
    col *= 0.55 + 0.45 * smoothstep(0.0, 1.5, vW.y);
  } else {
    col *= 0.7;
  }
  float d = length(vW - cameraPosition);
  gl_FragColor = vec4(applyFog(col, d, uBg, uFog), 1.0);
}
`;

const groundVert = /* glsl */ `
varying vec3 vW;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vW = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;
const groundFrag = /* glsl */ `
${FOG}
uniform vec3 uPanel;
uniform vec3 uAmber;
uniform vec3 uText;
uniform vec3 uBg;
uniform float uFog;
uniform float uTime;
varying vec3 vW;
float h(float n) { return fract(sin(n * 91.345) * 47453.5453); }
void main() {
  vec2 p = vW.xz;
  vec3 col = uPanel * 0.45;
  // streets every 2 units
  vec2 f = abs(fract(p / 2.0) - 0.5) * 2.0;
  float street = smoothstep(0.86, 0.9, max(f.x, f.y));
  col = mix(col, uPanel * 0.25, street);
  // street lamps
  vec2 lp = fract(p / 0.5) - 0.5;
  float lamp = smoothstep(0.12, 0.0, length(lp)) * street;
  col += uAmber * lamp * 0.5;
  // cars: moving light dots along streets
  float lane = floor(p.y / 2.0);
  float cx = fract(p.x * 0.08 + uTime * (0.05 + h(lane) * 0.08) * (h(lane + 3.0) > 0.5 ? 1.0 : -1.0) + h(lane));
  float carX = smoothstep(0.985, 1.0, cx) * smoothstep(0.93, 0.98, f.y);
  float laneX = floor(p.x / 2.0);
  float cz = fract(p.y * 0.08 + uTime * (0.05 + h(laneX) * 0.08) + h(laneX * 2.0));
  float carZ = smoothstep(0.985, 1.0, cz) * smoothstep(0.93, 0.98, f.x);
  col += mix(uAmber, uText, 0.4) * (carX + carZ) * 1.6;
  float d = length(vW - cameraPosition);
  col *= smoothstep(48.0, 20.0, length(p));
  gl_FragColor = vec4(applyFog(col, d, uBg, uFog), 1.0);
}
`;

const wireVert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const wireFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uProgress;
uniform float uTime;
varying vec2 vUv;
void main() {
  float lit = smoothstep(uProgress, uProgress - 0.02, vUv.x);
  float pulse = 0.6 + 0.4 * sin(vUv.x * 80.0 - uTime * 6.0);
  float a = (0.12 + lit * 0.88 * pulse);
  gl_FragColor = vec4(uColor * (0.4 + lit * 2.6), a);
}
`;

const skyVert = /* glsl */ `
varying vec3 vW;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vW = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;
const skyFrag = /* glsl */ `
uniform vec3 uTeal;
uniform vec3 uBg;
uniform float uAlt;
varying vec3 vW;
void main() {
  vec3 d = normalize(vW - cameraPosition);
  float above = smoothstep(-0.02, 0.01, d.y);
  float horizon = exp(-abs(d.y) * mix(14.0, 40.0, uAlt)) * above;
  vec3 col = uBg + uTeal * horizon * (0.05 + 0.22 * uAlt);
  gl_FragColor = vec4(col, 1.0);
}
`;

const starVert = /* glsl */ `
attribute float aSeed;
uniform float uPixel;
uniform float uAlpha;
uniform vec3 uColor;
varying float vAlpha;
varying vec3 vColor;
void main() {
  vAlpha = uAlpha * (0.3 + 0.7 * aSeed);
  vColor = uColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = (1.0 + aSeed * 1.6) * uPixel;
  gl_Position = projectionMatrix * mv;
}
`;

export class CityWorld extends World {
  readonly packet: Packet;
  readonly cafe = new Vector3(0, 0.25, 0);
  readonly acquirer = new Vector3(9, 0, -7);
  readonly acquirerTop = new Vector3();
  readonly route: CatmullRomCurve3;
  /** 0..1 how much of the wire is lit. */
  wire = 0;
  /** 0..1 altitude for the stratosphere look. */
  altitude = 0;
  acquirerGlow = 0;
  /** 0 amber (request), 1 green (approval on its way back). */
  wireGreen = 0;

  private bMat: ShaderMaterial;
  private gMat: ShaderMaterial;
  private wMat: ShaderMaterial;
  private skyMat: ShaderMaterial;
  private starMat: ShaderMaterial;
  private beacon: Mesh;
  private clock = 0;

  constructor(labelHost: HTMLElement) {
    super('city', labelHost);
    const s = this.scene;
    s.background = C.bg.clone();
    this.camera.far = 400;

    const common = {
      uPanel: { value: C.panel },
      uAmber: { value: C.amber },
      uTeal: { value: C.teal },
      uText: { value: C.text },
      uBg: { value: C.bg },
      uFog: { value: 0.035 },
    };
    this.bMat = new ShaderMaterial({
      vertexShader: buildingVert,
      fragmentShader: buildingFrag,
      uniforms: { ...common, uLights: { value: 1 } },
    });
    this.gMat = new ShaderMaterial({
      vertexShader: groundVert,
      fragmentShader: groundFrag,
      uniforms: { ...common, uTime: { value: 0 } },
    });
    const ground = new Mesh(new PlaneGeometry(600, 600), this.gMat);
    ground.rotation.x = -Math.PI / 2;
    s.add(ground);

    this.skyMat = new ShaderMaterial({
      vertexShader: skyVert,
      fragmentShader: skyFrag,
      uniforms: { uTeal: { value: C.teal }, uBg: { value: C.bg }, uAlt: { value: 0 } },
      side: BackSide,
      depthWrite: false,
    });
    const sky = new Mesh(new SphereGeometry(300, 32, 16), this.skyMat);
    s.add(sky);

    // stars appear as we climb
    const sn = 900;
    const sp = new Float32Array(sn * 3);
    const ss = new Float32Array(sn);
    for (let i = 0; i < sn; i++) {
      const th = hash(i * 1.3) * Math.PI * 2;
      const ph = Math.acos(hash(i * 2.9) * 0.9);
      sp.set([Math.sin(ph) * Math.cos(th) * 250, Math.cos(ph) * 250, Math.sin(ph) * Math.sin(th) * 250], i * 3);
      ss[i] = hash(i * 7.1);
    }
    const sg = new BufferGeometry();
    sg.setAttribute('position', new BufferAttribute(sp, 3));
    sg.setAttribute('aSeed', new BufferAttribute(ss, 1));
    this.starMat = new ShaderMaterial({
      vertexShader: starVert,
      fragmentShader: softPointFrag,
      uniforms: { uPixel: { value: 1 }, uAlpha: { value: 0 }, uColor: { value: tone(C.text, 1.2) } },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    s.add(new Points(sg, this.starMat));

    this.buildCity();

    // the acquirer's data centre: a tall dark tower with a beacon
    this.acquirerTop.copy(this.acquirer).setY(5.2);
    this.beacon = new Mesh(new SphereGeometry(0.18, 12, 8), new ShaderMaterial({
      vertexShader: wireVert,
      fragmentShader: /* glsl */ `uniform vec3 uColor; void main(){ gl_FragColor = vec4(uColor, 1.0); }`,
      uniforms: { uColor: { value: tone(C.teal, 2) } },
    }));
    this.beacon.position.copy(this.acquirerTop);
    s.add(this.beacon);

    // the wire: café → under the streets → acquirer
    const a = this.acquirer;
    this.route = new CatmullRomCurve3(
      [
        new Vector3(0, 0.25, 0),
        new Vector3(0, 0.08, 0.6),
        new Vector3(1.0, 0.06, 1.0),
        new Vector3(4.0, 0.06, 1.0),
        new Vector3(5.0, 0.06, 0.0),
        new Vector3(5.0, 0.06, -5.0),
        new Vector3(6.0, 0.06, -6.0),
        new Vector3(a.x - 1.0, 0.06, a.z + 1.0),
        new Vector3(a.x - 0.75, 1.5, a.z + 0.75),
        new Vector3(a.x, 4.6, a.z),
        this.acquirerTop.clone(),
      ],
      false,
      'catmullrom',
      0.1,
    );
    this.wMat = new ShaderMaterial({
      vertexShader: wireVert,
      fragmentShader: wireFrag,
      uniforms: { uColor: { value: C.amber.clone() }, uProgress: { value: 0 }, uTime: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    s.add(new Mesh(new TubeGeometry(this.route, 400, 0.035, 6, false), this.wMat));

    // café glow
    const cafeGlow = new Points(
      new BufferGeometry().setAttribute('position', new BufferAttribute(new Float32Array([0, 0.6, 0]), 3)),
      new ShaderMaterial({
        vertexShader: /* glsl */ `uniform float uPixel; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = 140.0 * uPixel / -mv.z; gl_Position = projectionMatrix * mv; }`,
        fragmentShader: /* glsl */ `uniform vec3 uColor; void main(){ float r = length(gl_PointCoord - 0.5) * 2.0; gl_FragColor = vec4(uColor, exp(-r * r * 4.0) * 0.9); }`,
        uniforms: { uPixel: { value: 1 }, uColor: { value: tone(C.amber, 2) } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    );
    cafeGlow.name = 'cafeGlow';
    cafeGlow.frustumCulled = false;
    s.add(cafeGlow);

    this.packet = new Packet(1.2).addTo(s);
    this.labels.add('cafe', '', '');
    this.labels.add('acquirer', '', 'is-teal');
  }

  private buildCity() {
    const n = Math.round(2600 * quality.density);
    const geo = new BoxGeometry(1, 1, 1);
    geo.translate(0, 0.5, 0);
    const mesh = new InstancedMesh(geo, this.bMat, n);
    const o = new Object3D();
    let k = 0;
    for (let i = 0; k < n && i < n * 4; i++) {
      // blocks between streets (streets every 2 units)
      const bx = Math.floor((hash(i * 1.17) - 0.5) * 36);
      const bz = Math.floor((hash(i * 2.31) - 0.5) * 36);
      const lx = (hash(i * 3.7) - 0.5) * 1.1;
      const lz = (hash(i * 4.3) - 0.5) * 1.1;
      const x = bx * 2 + 1 + lx * 0.6;
      const z = bz * 2 + 1 + lz * 0.6;
      const r = Math.hypot(x, z);
      if (Math.hypot(x, z) < 1.4) continue; // the café's own square
      if (Math.hypot(x - this.acquirer.x, z - this.acquirer.z) < 1.8) continue;
      const center = Math.exp(-r / 14);
      const hgt = 0.4 + Math.pow(hash(i * 5.9), 2.5) * (1.2 + center * 6);
      const w = 0.4 + hash(i * 6.1) * 0.5;
      o.position.set(x, 0, z);
      o.scale.set(w, hgt, 0.4 + hash(i * 7.7) * 0.5);
      o.updateMatrix();
      mesh.setMatrixAt(k++, o.matrix);
    }
    // acquirer tower
    o.position.copy(this.acquirer);
    o.scale.set(1.4, 5, 1.4);
    o.updateMatrix();
    if (k < n) mesh.setMatrixAt(k++, o.matrix);
    mesh.count = k;
    mesh.frustumCulled = false;
    this.scene.add(mesh);
  }

  protected animate(_sdt: number, dt: number) {
    this.clock += dt;
    this.gMat.uniforms.uTime.value = this.clock;
    this.wMat.uniforms.uTime.value = this.clock;
    this.wMat.uniforms.uProgress.value = this.wire;
    this.wMat.uniforms.uColor.value.copy(C.amber).lerp(C.green, this.wireGreen);
    this.skyMat.uniforms.uAlt.value = this.altitude;
    this.starMat.uniforms.uAlpha.value = this.altitude;
    this.starMat.uniforms.uPixel.value = this.pixelRatio;
    const fog = 0.035 * (1 - this.altitude * 0.75);
    this.bMat.uniforms.uFog.value = fog;
    this.gMat.uniforms.uFog.value = fog;
    ((this.scene.getObjectByName('cafeGlow') as Points).material as ShaderMaterial).uniforms.uPixel.value = this.pixelRatio;
    const bm = this.beacon.material as ShaderMaterial;
    bm.uniforms.uColor.value.copy(C.teal).multiplyScalar(1.1 + this.acquirerGlow * 1.4 + Math.sin(this.clock * 3) * 0.2);
    this.beacon.scale.setScalar(1 + this.acquirerGlow * 0.3);
    this.packet.setPixelRatio(this.pixelRatio);
    this.packet.update(dt, this.clock);
  }
}
