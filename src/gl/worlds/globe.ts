import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Line,
  LineSegments,
  Mesh,
  Points,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from 'three';
import { World } from '../world';
import { C, tone } from '../palette';
import { softPointFrag } from '../glsl';
import { Packet } from '../packet';
import { quality } from '../../core/quality';
import { hash } from '../../core/math';

// The Earth as a cloud of land points (Natural Earth 110m, public domain),
// with the payment network's routes and thousands of other payments in flight.

export const R = 2;

export function latLon(lat: number, lon: number, r = R, out = new Vector3()) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const th = ((lon + 180) * Math.PI) / 180;
  return out.set(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th));
}

/** Point on a great-circle arc lifted above the surface. */
export function arcPoint(a: Vector3, b: Vector3, t: number, lift: number, out = new Vector3()) {
  const an = a.clone().normalize();
  const bn = b.clone().normalize();
  const omega = Math.acos(Math.min(1, Math.max(-1, an.dot(bn))));
  const so = Math.sin(omega) || 1;
  out
    .copy(an)
    .multiplyScalar(Math.sin((1 - t) * omega) / so)
    .add(bn.multiplyScalar(Math.sin(t * omega) / so));
  return out.normalize().multiplyScalar(R * (1 + lift * Math.sin(Math.PI * t)));
}

const landVert = /* glsl */ `
attribute float aSeed;
uniform float uPixel;
uniform vec3 uColor;
uniform float uSize;
varying float vAlpha;
varying vec3 vColor;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec3 n = normalize(normalMatrix * normalize(position));
  float facing = dot(n, normalize(-mv.xyz));
  vAlpha = smoothstep(-0.15, 0.35, facing) * (0.55 + 0.45 * aSeed);
  vColor = uColor * (0.7 + 0.6 * aSeed);
  gl_PointSize = uSize * uPixel * (10.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}
`;

const atmoVert = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;
const atmoFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uPower;
uniform float uAlpha;
varying vec3 vN;
varying vec3 vV;
void main() {
  float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), uPower);
  gl_FragColor = vec4(uColor, f * uAlpha);
}
`;
const oceanFrag = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uRim;
varying vec3 vN;
varying vec3 vV;
void main() {
  float f = pow(1.0 - max(dot(normalize(vN), normalize(vV)), 0.0), 3.0);
  gl_FragColor = vec4(uColor + uRim * f * 0.12, 1.0);
}
`;

const trafficVert = /* glsl */ `
attribute vec3 aA;
attribute vec3 aB;
attribute float aPhase;
attribute float aSpeed;
uniform float uTime;
uniform float uPixel;
uniform float uAlpha;
uniform vec3 uColor;
varying float vAlpha;
varying vec3 vColor;
vec3 slerpN(vec3 a, vec3 b, float t) {
  float o = acos(clamp(dot(a, b), -1.0, 1.0));
  float so = max(sin(o), 1e-3);
  return normalize(a * sin((1.0 - t) * o) / so + b * sin(t * o) / so);
}
void main() {
  float t = fract(aPhase + uTime * aSpeed);
  vec3 a = normalize(aA);
  vec3 b = normalize(aB);
  float lift = 0.05 + 0.25 * acos(clamp(dot(a, b), -1.0, 1.0)) / 3.14159;
  vec3 p = slerpN(a, b, t) * ${R.toFixed(1)} * (1.0 + lift * sin(3.14159 * t));
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vec3 n = normalize(normalMatrix * p);
  float facing = dot(n, normalize(-mv.xyz));
  vAlpha = uAlpha * smoothstep(-0.25, 0.2, facing) * smoothstep(0.0, 0.06, t) * smoothstep(1.0, 0.94, t);
  vColor = uColor;
  gl_PointSize = 3.2 * uPixel * (7.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}
`;

const routeVert = /* glsl */ `
attribute float aT;
varying float vT;
void main() { vT = aT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const routeFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uProgress;
uniform float uTime;
uniform float uAlpha;
varying float vT;
void main() {
  float lit = smoothstep(uProgress + 0.002, uProgress - 0.02, vT);
  float dash = 0.55 + 0.45 * step(0.5, fract(vT * 40.0 - uTime * 1.5));
  gl_FragColor = vec4(uColor * (0.6 + lit * 2.0), uAlpha * (0.25 + lit * 0.75) * dash);
}
`;

const ARC_SEG = 96;

export class GlobeWorld extends World {
  readonly packet: Packet;
  /** Story geography (illustrative): café + acquirer, network node, issuer. */
  readonly nodes = {
    acquirer: latLon(38.7, -9.1),
    network: latLon(51.5, -0.6),
    issuer: latLon(52.2, 21.0),
  };
  readonly lifts = { a: 0.12, b: 0.16 };
  /** Progress of the lit part of each route (0..1). */
  routeA = 0;
  routeB = 0;
  routeColorGreen = 0;
  traffic = 1;
  nodePulse = { acquirer: 0, network: 0, issuer: 0 };

  private routeMats: ShaderMaterial[] = [];
  private trafficMat: ShaderMaterial;
  private landMat: ShaderMaterial;
  private nodeMat: ShaderMaterial;
  private nodeSizes: Float32Array;
  private nodeGeo: BufferGeometry;
  private clock = 0;

  constructor(labelHost: HTMLElement) {
    super('globe', labelHost);
    const s = this.scene;
    s.background = C.bg.clone();
    this.camera.near = 0.05;
    this.camera.far = 200;

    const ocean = new Mesh(
      new SphereGeometry(R * 0.985, 64, 48),
      new ShaderMaterial({
        vertexShader: atmoVert,
        fragmentShader: oceanFrag,
        uniforms: { uColor: { value: tone(C.panel, 0.55) }, uRim: { value: C.teal } },
      }),
    );
    s.add(ocean);
    const atmo = new Mesh(
      new SphereGeometry(R * 1.07, 64, 48),
      new ShaderMaterial({
        vertexShader: atmoVert,
        fragmentShader: atmoFrag,
        uniforms: { uColor: { value: tone(C.teal, 1.1) }, uPower: { value: 6.0 }, uAlpha: { value: 0.5 } },
        side: BackSide,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    );
    s.add(atmo);

    this.landMat = new ShaderMaterial({
      vertexShader: landVert,
      fragmentShader: softPointFrag,
      uniforms: {
        uPixel: { value: 1 },
        uColor: { value: tone(C.teal, 0.85) },
        uSize: { value: quality.mobile ? 2.6 : 1.9 },
      },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    void this.loadLand();

    // background stars
    const sn = 700;
    const sp = new Float32Array(sn * 3);
    const ss = new Float32Array(sn);
    for (let i = 0; i < sn; i++) {
      const v = new Vector3(hash(i * 1.1) - 0.5, hash(i * 2.2) - 0.5, hash(i * 3.3) - 0.5).normalize().multiplyScalar(60 + hash(i) * 40);
      sp.set([v.x, v.y, v.z], i * 3);
      ss[i] = hash(i * 9.1) * 0.6;
    }
    const sg = new BufferGeometry();
    sg.setAttribute('position', new BufferAttribute(sp, 3));
    sg.setAttribute('aSeed', new BufferAttribute(ss, 1));
    s.add(
      new Points(
        sg,
        new ShaderMaterial({
          vertexShader: landVert,
          fragmentShader: softPointFrag,
          uniforms: { uPixel: { value: 1 }, uColor: { value: tone(C.text, 0.7) }, uSize: { value: 22 } },
          transparent: true,
          depthWrite: false,
          blending: AdditiveBlending,
        }),
      ),
    );

    this.trafficMat = new ShaderMaterial({
      vertexShader: trafficVert,
      fragmentShader: softPointFrag,
      uniforms: {
        uTime: { value: 0 },
        uPixel: { value: 1 },
        uAlpha: { value: 1 },
        uColor: { value: tone(C.amber, 1.6) },
      },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    this.buildTraffic();
    this.buildRoutes();

    // node markers
    const nodePos = new Float32Array(9);
    [this.nodes.acquirer, this.nodes.network, this.nodes.issuer].forEach((v, i) => {
      const p = v.clone().multiplyScalar(1.004);
      nodePos.set([p.x, p.y, p.z], i * 3);
    });
    this.nodeSizes = new Float32Array([1, 1, 1]);
    this.nodeGeo = new BufferGeometry();
    this.nodeGeo.setAttribute('position', new BufferAttribute(nodePos, 3));
    this.nodeGeo.setAttribute('aSize', new BufferAttribute(this.nodeSizes, 1));
    this.nodeMat = new ShaderMaterial({
      vertexShader: /* glsl */ `
        attribute float aSize; uniform float uPixel; varying float vS;
        void main(){ vS = aSize; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = (10.0 + aSize * 14.0) * uPixel * (6.0 / -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; varying float vS;
        void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d) * 2.0;
          float ring = smoothstep(0.12, 0.0, abs(r - 0.75)) * 0.9; float core = smoothstep(0.4, 0.0, r);
          gl_FragColor = vec4(uColor * (1.0 + vS), (ring + core) * (0.6 + 0.4 * vS)); }`,
      uniforms: { uPixel: { value: 1 }, uColor: { value: tone(C.teal, 2) } },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    const nodes = new Points(this.nodeGeo, this.nodeMat);
    nodes.frustumCulled = false;
    s.add(nodes);

    this.packet = new Packet(0.3).addTo(s);

    this.labels.add('acquirer', '', 'is-teal');
    this.labels.add('network', '', 'is-teal');
    this.labels.add('issuer', '', 'is-teal');
    this.labels.add('traffic', '', 'is-plain');
  }

  private async loadLand() {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}land.bin`);
      const buf = new Int16Array(await res.arrayBuffer());
      const step = quality.mobile ? 2 : 1;
      const n = Math.floor(buf.length / 2 / step);
      const pos = new Float32Array(n * 3);
      const seed = new Float32Array(n);
      const v = new Vector3();
      for (let i = 0; i < n; i++) {
        const k = i * step * 2;
        latLon(buf[k] / 100, buf[k + 1] / 100, R, v);
        pos.set([v.x, v.y, v.z], i * 3);
        seed[i] = hash(i * 0.37);
      }
      const g = new BufferGeometry();
      g.setAttribute('position', new BufferAttribute(pos, 3));
      g.setAttribute('aSeed', new BufferAttribute(seed, 1));
      const pts = new Points(g, this.landMat);
      pts.frustumCulled = false;
      this.scene.add(pts);
      this.landHubs = [];
      for (let i = 0; i < 70; i++) {
        const k = Math.floor(hash(i * 13.7) * n) * 3;
        this.landHubs.push(new Vector3(pos[k], pos[k + 1], pos[k + 2]));
      }
      this.buildTraffic();
    } catch {
      // the globe still reads without land points
    }
  }

  private landHubs: Vector3[] = [];
  private trafficObj: Points | null = null;
  private trafficLines: LineSegments | null = null;

  private buildTraffic() {
    const hubs = this.landHubs.length
      ? this.landHubs
      : Array.from({ length: 40 }, (_, i) => latLon((hash(i) - 0.4) * 120, (hash(i * 2.1) - 0.5) * 360));
    const arcs = Math.round(240 * quality.density);
    const per = 3;
    const n = arcs * per;
    const A = new Float32Array(n * 3);
    const B = new Float32Array(n * 3);
    const ph = new Float32Array(n);
    const sp = new Float32Array(n);
    const lines: number[] = [];
    const tmp = new Vector3();
    const prev = new Vector3();
    for (let i = 0; i < arcs; i++) {
      const a = hubs[Math.floor(hash(i * 3.3) * hubs.length)];
      const b = hubs[Math.floor(hash(i * 5.9 + 1) * hubs.length)];
      if (a === b) continue;
      for (let j = 0; j < per; j++) {
        const k = i * per + j;
        A.set([a.x, a.y, a.z], k * 3);
        B.set([b.x, b.y, b.z], k * 3);
        ph[k] = hash(k * 1.7);
        sp[k] = 0.05 + hash(k * 2.9) * 0.08;
      }
      if (i % 2 === 0) {
        const lift = 0.05 + (0.25 * a.angleTo(b)) / Math.PI;
        for (let s = 0; s <= 16; s++) {
          arcPoint(a, b, s / 16, lift, tmp);
          if (s > 0) lines.push(prev.x, prev.y, prev.z, tmp.x, tmp.y, tmp.z);
          prev.copy(tmp);
        }
      }
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('aA', new BufferAttribute(A, 3));
    g.setAttribute('aB', new BufferAttribute(B, 3));
    g.setAttribute('aPhase', new BufferAttribute(ph, 1));
    g.setAttribute('aSpeed', new BufferAttribute(sp, 1));
    if (this.trafficObj) {
      this.scene.remove(this.trafficObj);
      this.trafficObj.geometry.dispose();
    }
    this.trafficObj = new Points(g, this.trafficMat);
    this.trafficObj.frustumCulled = false;
    this.scene.add(this.trafficObj);

    const lg = new BufferGeometry();
    lg.setAttribute('position', new BufferAttribute(new Float32Array(lines), 3));
    if (this.trafficLines) {
      this.scene.remove(this.trafficLines);
      this.trafficLines.geometry.dispose();
    } else {
      this.trafficLineMat = new ShaderMaterial({
        vertexShader: /* glsl */ `void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: /* glsl */ `uniform vec3 uColor; uniform float uAlpha; void main(){ gl_FragColor = vec4(uColor, uAlpha); }`,
        uniforms: { uColor: { value: tone(C.teal, 0.8) }, uAlpha: { value: 0.07 } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      });
    }
    this.trafficLines = new LineSegments(lg, this.trafficLineMat!);
    this.scene.add(this.trafficLines);
  }
  private trafficLineMat: ShaderMaterial | null = null;

  private buildRoutes() {
    const pairs: [Vector3, Vector3, number][] = [
      [this.nodes.acquirer, this.nodes.network, this.lifts.a],
      [this.nodes.network, this.nodes.issuer, this.lifts.b],
    ];
    for (const [a, b, lift] of pairs) {
      const pos = new Float32Array((ARC_SEG + 1) * 3);
      const t = new Float32Array(ARC_SEG + 1);
      const v = new Vector3();
      for (let i = 0; i <= ARC_SEG; i++) {
        arcPoint(a, b, i / ARC_SEG, lift, v);
        pos.set([v.x, v.y, v.z], i * 3);
        t[i] = i / ARC_SEG;
      }
      const g = new BufferGeometry();
      g.setAttribute('position', new BufferAttribute(pos, 3));
      g.setAttribute('aT', new BufferAttribute(t, 1));
      const mat = new ShaderMaterial({
        vertexShader: routeVert,
        fragmentShader: routeFrag,
        uniforms: {
          uColor: { value: tone(C.teal, 1.6) },
          uProgress: { value: 0 },
          uTime: { value: 0 },
          uAlpha: { value: 1 },
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      });
      this.scene.add(new Line(g, mat));
      this.routeMats.push(mat);
    }
  }

  /** Packet position along route 0 (acquirer→network) or 1 (network→issuer). */
  routePoint(route: 0 | 1, t: number, out = new Vector3()) {
    return route === 0
      ? arcPoint(this.nodes.acquirer, this.nodes.network, t, this.lifts.a, out)
      : arcPoint(this.nodes.network, this.nodes.issuer, t, this.lifts.b, out);
  }

  protected animate(_sdt: number, dt: number) {
    this.clock += dt;
    const px = this.pixelRatio;
    this.landMat.uniforms.uPixel.value = px;
    this.trafficMat.uniforms.uPixel.value = px;
    this.trafficMat.uniforms.uTime.value = this.clock * 0.25;
    this.trafficMat.uniforms.uAlpha.value = this.traffic;
    if (this.trafficLineMat) this.trafficLineMat.uniforms.uAlpha.value = 0.07 * this.traffic;
    this.nodeMat.uniforms.uPixel.value = px;
    const green = this.routeColorGreen;
    this.routeMats.forEach((m, i) => {
      m.uniforms.uTime.value = this.clock;
      m.uniforms.uProgress.value = i === 0 ? this.routeA : this.routeB;
      m.uniforms.uColor.value.copy(C.teal).lerp(C.green, green).multiplyScalar(1.6);
    });
    this.nodeSizes[0] = this.nodePulse.acquirer;
    this.nodeSizes[1] = this.nodePulse.network;
    this.nodeSizes[2] = this.nodePulse.issuer;
    this.nodeGeo.attributes.aSize.needsUpdate = true;
    this.packet.setPixelRatio(px);
    this.packet.update(dt, this.clock);
  }
}
