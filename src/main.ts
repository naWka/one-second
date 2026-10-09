import './styles/main.css';
import { Renderer } from './core/renderer';
import { Worlds } from './core/worlds';
import { Story } from './core/story';
import { HudView } from './core/hud';
import { Scroll, ScrollTrigger, gsap, revealSteps } from './core/scroll';
import { motion, quality } from './core/quality';
import { beats } from './scenes';
import { initKeyboard } from './ui/keyboard';
import { initFees } from './ui/fees';
import { updatePointer } from './core/pointer';

const root = document.documentElement;
root.classList.add('js');
if (motion.reduced) root.classList.add('reduced');

const canvas = document.getElementById('gl') as HTMLCanvasElement;
const sections = [...document.querySelectorAll<HTMLElement>('.scene')];
const scroll = new Scroll(motion.reduced);

function webglOk() {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

let story: Story | null = null;
let renderer: Renderer | null = null;
let worlds: Worlds | null = null;

const goto = (scene: number) => {
  const top = story ? story.sceneTop(scene) : sections[scene]?.offsetTop ?? 0;
  scroll.to(top + 2);
};
const hud = new HudView(goto);

if (webglOk()) {
  renderer = new Renderer(canvas);
  worlds = new Worlds(document.getElementById('labels')!, renderer);
  story = new Story(beats, sections, renderer, worlds, motion.reduced);
} else {
  root.classList.add('no-webgl');
}

function measure() {
  ScrollTrigger.refresh();
  story?.measure();
}

let resizeTimer = 0;
window.addEventListener('resize', () => {
  renderer?.resize();
  worlds?.resize();
  clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(measure, 150);
});

revealSteps();
measure();
document.fonts?.ready.then(measure);
window.addEventListener('load', measure);

initKeyboard({
  scroll,
  story: () => story,
  sections,
  goto,
});
initFees({
  replay: () => {
    root.classList.add('is-rewinding');
    scroll.to(0, motion.reduced ? 0 : 5.5, () => root.classList.remove('is-rewinding'));
  },
});

// main loop
let slowFor = 0;
let avg = 1 / 60;
const fpsEl = quality.debug ? document.body.appendChild(document.createElement('div')) : null;
if (fpsEl) fpsEl.style.cssText = 'position:fixed;right:8px;bottom:8px;z-index:99;font:12px monospace;color:#4FD1C5';

gsap.ticker.lagSmoothing(0);
gsap.ticker.add((time, deltaMs) => {
  scroll.raf(time * 1000);
  const dt = Math.min(deltaMs / 1000, 0.05);
  updatePointer(dt);
  if (story && renderer) {
    story.frame(scroll.y, dt, time);
    hud.update(story.hud, story.current);
    // adaptive resolution: if frames stay slow, render fewer pixels
    avg += (dt - avg) * 0.05;
    slowFor = avg > 1 / 42 ? slowFor + dt : 0;
    if (slowFor > 2 && renderer.dpr > 1) {
      renderer.setDpr(Math.max(1, renderer.dpr - 0.25));
      worlds?.resize();
      slowFor = 0;
    }
    if (fpsEl) fpsEl.textContent = `${(1 / avg).toFixed(0)} fps · dpr ${renderer.dpr.toFixed(2)}`;
  }
});

// handle for screenshot scripts and debugging
(window as unknown as { __os: object }).__os = { story, scroll, renderer };

if (worlds) worlds.preload(['cafe', 'chip', 'city', 'globe', 'bank', 'settle']);
