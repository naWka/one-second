import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Smooth scroll (Lenis) synced with GSAP ScrollTrigger; native scroll in reduced-motion mode. */
export class Scroll {
  readonly lenis: Lenis | null;

  constructor(reduced: boolean) {
    this.lenis = reduced
      ? null
      : new Lenis({ lerp: 0.085, wheelMultiplier: 0.85, touchMultiplier: 1.3, smoothWheel: true });
    this.lenis?.on('scroll', ScrollTrigger.update);
  }

  get y() {
    return this.lenis ? this.lenis.animatedScroll : window.scrollY;
  }

  raf(ms: number) {
    this.lenis?.raf(ms);
  }

  to(y: number, duration?: number, onComplete?: () => void) {
    if (this.lenis) {
      const d = duration ?? Math.min(2.6, Math.max(1.1, Math.abs(y - this.y) / window.innerHeight / 2.2));
      this.lenis.scrollTo(y, { duration: d, easing: easeInOutCubic, force: true, onComplete });
    } else {
      window.scrollTo({ top: y, behavior: 'auto' });
      onComplete?.();
    }
  }
}

/** Fades text cards in as they reach the reading zone. */
export function revealSteps() {
  for (const el of document.querySelectorAll<HTMLElement>('.step')) {
    ScrollTrigger.create({
      trigger: el,
      start: 'top 88%',
      end: 'bottom 24%',
      toggleClass: { targets: el, className: 'is-in' },
    });
  }
}

export { ScrollTrigger, gsap };
