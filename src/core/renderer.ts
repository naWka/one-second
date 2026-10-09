import {
  HalfFloatType,
  NoToneMapping,
  SRGBColorSpace,
  ShaderMaterial,
  Uniform,
  WebGLRenderTarget,
  WebGLRenderer,
  type Camera,
  type Scene,
} from 'three';
import {
  BloomEffect,
  EffectComposer,
  EffectPass,
  NoiseEffect,
  Pass,
  ToneMappingEffect,
  ToneMappingMode,
  VignetteEffect,
  BlendFunction,
} from 'postprocessing';
import { quality } from './quality';

export type Frame = { scene: Scene; camera: Camera };
export type FrameFn = () => Frame;

const mixVert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 1.0, 1.0); }
`;

// Blends two rendered worlds. Both images zoom forward while crossfading, with a
// faint amber flash in the middle — reads as "diving through" into the next scene.
const mixFrag = /* glsl */ `
uniform sampler2D tA;
uniform sampler2D tB;
uniform float uMix;
uniform float uWarp;
varying vec2 vUv;
vec2 zoom(vec2 uv, float s) { return (uv - 0.5) / s + 0.5; }
void main() {
  float m = uMix * uMix * (3.0 - 2.0 * uMix);
  vec4 a = texture2D(tA, zoom(vUv, 1.0 + m * 0.5 * uWarp));
  vec4 b = texture2D(tB, zoom(vUv, 1.0 + (1.0 - m) * 0.35 * uWarp));
  vec4 c = mix(a, b, m);
  // values are linear HDR: a small number is already a visible glow
  float flash = exp(-pow((uMix - 0.5) * 4.5, 2.0)) * 0.025 * uWarp;
  float r = length(vUv - 0.5);
  c.rgb += vec3(1.0, 0.71, 0.28) * flash * smoothstep(0.6, 0.0, r);
  gl_FragColor = c;
}
`;

/** Renders the active world, or crossfades between two worlds. */
class StoryPass extends Pass {
  a: FrameFn | null = null;
  b: FrameFn | null = null;
  mix = 0;
  warp = 1;
  private rtA: WebGLRenderTarget;
  private rtB: WebGLRenderTarget;
  private material: ShaderMaterial;

  constructor(samples: number) {
    super('StoryPass');
    this.needsSwap = false;
    const opts = { type: HalfFloatType, samples, depthBuffer: true };
    this.rtA = new WebGLRenderTarget(1, 1, opts);
    this.rtB = new WebGLRenderTarget(1, 1, opts);
    this.material = new ShaderMaterial({
      vertexShader: mixVert,
      fragmentShader: mixFrag,
      uniforms: {
        tA: new Uniform(null),
        tB: new Uniform(null),
        uMix: new Uniform(0),
        uWarp: new Uniform(1),
      },
      depthTest: false,
      depthWrite: false,
    });
    this.fullscreenMaterial = this.material;
  }

  render(renderer: WebGLRenderer, inputBuffer: WebGLRenderTarget | null) {
    const target = this.renderToScreen ? null : inputBuffer;
    if (!this.a) return;
    if (!this.b || this.mix <= 0.001 || this.mix >= 0.999) {
      const f = this.b && this.mix >= 0.999 ? this.b() : this.a();
      renderer.setRenderTarget(target);
      renderer.render(f.scene, f.camera);
      return;
    }
    const fa = this.a();
    renderer.setRenderTarget(this.rtA);
    renderer.render(fa.scene, fa.camera);
    const fb = this.b();
    renderer.setRenderTarget(this.rtB);
    renderer.render(fb.scene, fb.camera);
    const u = this.material.uniforms;
    u.tA.value = this.rtA.texture;
    u.tB.value = this.rtB.texture;
    u.uMix.value = this.mix;
    u.uWarp.value = this.warp;
    renderer.setRenderTarget(target);
    renderer.render(this.scene, this.camera);
  }

  setSize(width: number, height: number) {
    this.rtA.setSize(width, height);
    this.rtB.setSize(width, height);
  }
}

export class Renderer {
  readonly gl: WebGLRenderer;
  readonly composer: EffectComposer;
  readonly story: StoryPass;
  readonly bloom: BloomEffect;
  readonly noise: NoiseEffect;
  dpr = quality.maxDpr;
  width = 1;
  height = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.gl = new WebGLRenderer({
      canvas,
      antialias: false,
      stencil: false,
      depth: true,
      powerPreference: 'high-performance',
    });
    this.gl.outputColorSpace = SRGBColorSpace;
    this.gl.toneMapping = NoToneMapping;
    this.gl.setClearColor(0x07090f, 1);
    this.gl.shadowMap.enabled = quality.shadows;

    this.composer = new EffectComposer(this.gl, {
      frameBufferType: HalfFloatType,
      multisampling: quality.msaa,
    });
    this.story = new StoryPass(quality.msaa);
    this.composer.addPass(this.story);

    this.bloom = new BloomEffect({
      mipmapBlur: true,
      luminanceThreshold: 0.55,
      luminanceSmoothing: 0.25,
      intensity: 1.35,
      radius: 0.72,
      levels: quality.mobile ? 5 : 7,
    });
    this.noise = new NoiseEffect({ premultiply: true, blendFunction: BlendFunction.SCREEN });
    this.noise.blendMode.opacity.value = 0.11;
    const vignette = new VignetteEffect({ offset: 0.32, darkness: 0.62 });
    const tone = new ToneMappingEffect({ mode: ToneMappingMode.AGX });
    this.composer.addPass(new EffectPass(undefined, this.bloom, tone, vignette, this.noise));

    this.resize();
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.gl.setPixelRatio(this.dpr);
    this.composer.setSize(this.width, this.height, true);
  }

  setDpr(dpr: number) {
    if (Math.abs(dpr - this.dpr) < 0.01) return;
    this.dpr = dpr;
    this.resize();
  }

  render(dt: number) {
    this.composer.render(dt);
  }

  compile(scene: Scene, camera: Camera) {
    return this.gl.compileAsync(scene, camera);
  }
}
