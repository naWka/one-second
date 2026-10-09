import { content } from '../content';
import type { Hud } from '../scenes/types';
import { audio } from './audio';

const pad = (n: number, w = 2) => String(Math.floor(n)).padStart(w, '0');

/** Formats transaction time: mm:ss.mmm, then hours, then days for the time-lapse. */
export function formatTime(ms: number) {
  if (ms < 3600_000) {
    const m = ms / 60000;
    const s = (ms % 60000) / 1000;
    const msPart = ms % 1000;
    return `${pad(m)}:${pad(s)}.${pad(msPart, 3)}`;
  }
  const h = ms / 3600_000;
  if (h < 24) return `${pad(h)} ч ${pad((ms % 3600_000) / 60000)} мин`;
  const d = Math.floor(h / 24);
  return `+${d} д ${pad(h % 24)} ч`;
}

function formatFactor(f: number) {
  return `×${Math.round(f).toLocaleString('ru-RU')}`;
}

export class HudView {
  private time = document.querySelector<HTMLElement>('[data-time]')!;
  private badge = document.querySelector<HTMLElement>('[data-badge]')!;
  private badgeLabel = document.querySelector<HTMLElement>('[data-badge-label]')!;
  private factor = document.querySelector<HTMLElement>('[data-factor]')!;
  private railBtns = [...document.querySelectorAll<HTMLButtonElement>('.rail-btn')];
  private soundBtn = document.querySelector<HTMLButtonElement>('[data-sound]')!;
  private soundLabel = document.querySelector<HTMLElement>('[data-sound-label]')!;
  private last = { time: '', label: '', factor: '', scene: -1 };

  constructor(onGoto: (scene: number) => void) {
    for (const b of this.railBtns) b.addEventListener('click', () => onGoto(Number(b.dataset.goto)));
    this.soundBtn.addEventListener('click', () => {
      const on = this.soundBtn.getAttribute('aria-pressed') !== 'true';
      this.soundBtn.setAttribute('aria-pressed', String(on));
      this.soundLabel.textContent = on ? content.hud.soundOn : content.hud.soundOff;
      void audio.setEnabled(on);
      if (on) audio.play('tick');
    });
  }

  update(h: Hud, scene: number) {
    const t = formatTime(h.ms);
    if (t !== this.last.time) this.time.textContent = this.last.time = t;
    const fast = h.factor === 'fast';
    const slow = !fast && (h.factor as number) > 1.5;
    const label = fast ? content.hud.speedup : slow ? content.hud.slowdown : content.hud.realtime;
    const factor = fast ? '' : formatFactor(h.factor as number);
    if (label !== this.last.label) {
      this.badgeLabel.textContent = this.last.label = label;
      this.badge.classList.toggle('is-real', !slow && !fast);
    }
    if (factor !== this.last.factor) this.factor.textContent = this.last.factor = factor;
    if (scene !== this.last.scene) {
      this.last.scene = scene;
      this.railBtns.forEach((b) => {
        const k = Number(b.dataset.goto);
        b.classList.toggle('is-active', k === scene);
        b.classList.toggle('is-done', k < scene);
        if (k === scene) b.setAttribute('aria-current', 'step');
        else b.removeAttribute('aria-current');
      });
    }
  }
}
