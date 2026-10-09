import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CapsuleGeometry,
  Color,
  Group,
  Mesh,
  PlaneGeometry,
  Points,
  ShaderMaterial,
  Vector3,
  type Object3D,
} from 'three';
import { C } from './palette';
import { softPointFrag } from './glsl';
import { hash } from '../core/math';

// The data packet: the one object the viewer rides along with through every scene.
// Each world owns its own instance, but all instances share geometry and shaders,
// so they look identical.

const TRAIL = 64;
const SPARKS = 96;
const UP = new Vector3(0, 1, 0);

const coreGeo = new CapsuleGeometry(0.055, 0.17, 6, 16);
const glowGeo = new PlaneGeometry(1, 1);

const coreVert = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
varying float vY;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  vY = position.y;
  gl_Position = projectionMatrix * mv;
}
`;
const coreFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uTime;
uniform float uIntensity;
varying vec3 vN;
varying vec3 vV;
varying float vY;
void main() {
  float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0);
  float bands = smoothstep(0.55, 1.0, sin(vY * 70.0 - uTime * 9.0));
  vec3 c = uColor * (0.9 + 1.5 * fres + 0.5 * bands) * uIntensity;
  gl_FragColor = vec4(c, 1.0);
}
`;

const glowVert = /* glsl */ `
uniform float uScale;
varying vec2 vUv;
void main() {
  vUv = uv - 0.5;
  vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  mv.xy += position.xy * uScale;
  gl_Position = projectionMatrix * mv;
}
`;
const glowFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
varying vec2 vUv;
void main() {
  float r = length(vUv) * 2.0;
  float a = exp(-r * r * 7.0) * 0.55 + exp(-r * 10.0) * 0.35;
  a *= smoothstep(1.0, 0.7, r);
  gl_FragColor = vec4(uColor * uIntensity, a);
}
`;

const trailVert = /* glsl */ `
attribute float aT;
attribute float aSeed;
uniform float uSize;
uniform float uPixel;
uniform vec3 uColor;
uniform float uIntensity;
varying float vAlpha;
varying vec3 vColor;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float t = aT;
  float spark = step(0.5, aSeed);
  float fade = (1.0 - t);
  vAlpha = fade * fade * (spark > 0.5 ? 0.9 : 0.55) * uIntensity;
  vColor = uColor * (spark > 0.5 ? 2.2 : 1.4);
  float size = uSize * (spark > 0.5 ? 0.35 + 0.4 * fract(aSeed * 13.7) : 1.0 - 0.75 * t);
  gl_PointSize = size * uPixel * (300.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}
`;

export class Packet {
  readonly head = new Group();
  readonly trail: Points;
  readonly color = C.amber.clone();
  private target = C.amber.clone();
  private coreMat: ShaderMaterial;
  private glowMat: ShaderMaterial;
  private trailMat: ShaderMaterial;
  private samples: Vector3[] = [];
  private ages: number[] = [];
  private sparkDirs: Vector3[] = [];
  private pos: Float32Array;
  private tAttr: Float32Array;
  private dir = new Vector3(0, 1, 0);
  private hasPos = false;
  intensity = 1;

  constructor(readonly size = 1) {
    this.coreMat = new ShaderMaterial({
      vertexShader: coreVert,
      fragmentShader: coreFrag,
      uniforms: {
        uColor: { value: this.color },
        uTime: { value: 0 },
        uIntensity: { value: 1 },
      },
    });
    const core = new Mesh(coreGeo, this.coreMat);
    core.scale.setScalar(size);
    this.glowMat = new ShaderMaterial({
      vertexShader: glowVert,
      fragmentShader: glowFrag,
      uniforms: {
        uColor: { value: this.color },
        uScale: { value: size * 0.75 },
        uIntensity: { value: 1 },
      },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    const glow = new Mesh(glowGeo, this.glowMat);
    glow.frustumCulled = false;
    glow.renderOrder = 10;
    this.head.add(core, glow);

    const n = TRAIL + SPARKS;
    this.pos = new Float32Array(n * 3);
    this.tAttr = new Float32Array(n).fill(1);
    const seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      seed[i] = i < TRAIL ? 0.1 : 0.5 + hash(i) * 0.5;
      if (i >= TRAIL) {
        this.sparkDirs.push(
          new Vector3(hash(i * 3.1) - 0.5, hash(i * 7.7) - 0.5, hash(i * 1.3) - 0.5).normalize(),
        );
      }
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(this.pos, 3));
    g.setAttribute('aT', new BufferAttribute(this.tAttr, 1));
    g.setAttribute('aSeed', new BufferAttribute(seed, 1));
    this.trailMat = new ShaderMaterial({
      vertexShader: trailVert,
      fragmentShader: softPointFrag,
      uniforms: {
        uSize: { value: size * 0.08 },
        uPixel: { value: 1 },
        uColor: { value: this.color },
        uIntensity: { value: 1 },
      },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    this.trail = new Points(g, this.trailMat);
    this.trail.frustumCulled = false;
    this.trail.renderOrder = 9;
  }

  addTo(parent: Object3D) {
    parent.add(this.head, this.trail);
    return this;
  }

  set visible(v: boolean) {
    this.head.visible = v;
    this.trail.visible = v;
  }
  get visible() {
    return this.head.visible;
  }

  setColor(c: Color, instant = false) {
    this.target.copy(c);
    if (instant) this.color.copy(c);
  }

  /** Point sprites are sized in CSS pixels × this factor. */
  setPixelRatio(r: number) {
    this.trailMat.uniforms.uPixel.value = r;
  }

  resetTrail() {
    this.samples.length = 0;
    this.ages.length = 0;
    this.hasPos = false;
  }

  /** Moves the packet. Orientation follows the direction of travel unless given. */
  moveTo(p: Vector3, dir?: Vector3) {
    const last = this.samples[0];
    if (this.hasPos && last) {
      const d = p.distanceTo(last);
      if (d > this.size * 8) this.resetTrail();
      else if (d > this.size * 0.012) {
        this.dir.subVectors(p, last).normalize();
        this.samples.unshift(p.clone());
        this.ages.unshift(0);
        if (this.samples.length > TRAIL) {
          this.samples.pop();
          this.ages.pop();
        }
      }
    }
    if (!this.hasPos || !this.samples.length) {
      this.samples.unshift(p.clone());
      this.ages.unshift(0);
      this.hasPos = true;
    }
    if (dir) this.dir.copy(dir).normalize();
    this.head.position.copy(p);
    this.head.quaternion.setFromUnitVectors(UP, this.dir);
  }

  update(dt: number, time: number) {
    this.color.lerp(this.target, 1 - Math.exp(-dt * 6));
    this.coreMat.uniforms.uTime.value = time;
    this.coreMat.uniforms.uIntensity.value = this.intensity;
    this.glowMat.uniforms.uIntensity.value = this.intensity;
    this.trailMat.uniforms.uIntensity.value = this.intensity;

    // Old samples fade out even when the packet is still, so the trail
    // always reads as motion that just happened.
    for (let i = 0; i < this.ages.length; i++) this.ages[i] += dt;
    while (this.ages.length > 1 && this.ages[this.ages.length - 1] > 1.4) {
      this.ages.pop();
      this.samples.pop();
    }

    const n = this.samples.length;
    const head = this.head.position;
    for (let i = 0; i < TRAIL; i++) {
      const s = this.samples[i] ?? head;
      this.pos[i * 3] = s.x;
      this.pos[i * 3 + 1] = s.y;
      this.pos[i * 3 + 2] = s.z;
      const age = this.ages[i] ?? 9;
      this.tAttr[i] = i < n ? Math.min(1, Math.max(i / TRAIL, age / 1.4)) : 1;
    }
    for (let j = 0; j < SPARKS; j++) {
      const i = TRAIL + j;
      const k = n > 1 ? Math.floor(hash(j * 5.3) * n) : 0;
      const s = this.samples[k] ?? head;
      const age = this.ages[k] ?? 9;
      const spread = this.size * (0.04 + age * 0.5) * (0.4 + hash(j * 9.1));
      const d = this.sparkDirs[j];
      this.pos[i * 3] = s.x + d.x * spread;
      this.pos[i * 3 + 1] = s.y + d.y * spread;
      this.pos[i * 3 + 2] = s.z + d.z * spread;
      this.tAttr[i] = n > 1 ? Math.min(1, Math.max(k / n, age / 1.2)) : 1;
    }
    const g = this.trail.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.aT.needsUpdate = true;
  }
}
