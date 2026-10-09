import type { Scroll } from '../core/scroll';
import type { Story } from '../core/story';

type Opts = {
  scroll: Scroll;
  story: () => Story | null;
  sections: HTMLElement[];
  goto: (scene: number) => void;
};

/** Arrow keys step between text cards, PageUp/PageDown jump between scenes. */
export function initKeyboard({ scroll, story, sections, goto }: Opts) {
  window.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.closest('input, textarea, select, [contenteditable="true"]') || t.isContentEditable)) return;
    const s = story();
    const last = sections.length - 1;
    const y = scroll.y;
    const tops = s ? s.tops : sections.map((el) => el.offsetTop);
    let cur = tops.length - 1;
    while (cur > 0 && y < tops[cur] - 4) cur--;
    const inFinale = cur === last;

    if (e.key === 'PageDown' || e.key === 'PageUp') {
      const dir = e.key === 'PageDown' ? 1 : -1;
      if (inFinale && dir > 0) return;
      e.preventDefault();
      const target = dir > 0 ? cur + 1 : y > tops[cur] + 8 ? cur : cur - 1;
      goto(Math.max(0, Math.min(last, target)));
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const dir = e.key === 'ArrowDown' ? 1 : -1;
      if (inFinale && (dir > 0 || y > tops[last] + 8)) return;
      e.preventDefault();
      const stops = collectStops(s, sections);
      const next = dir > 0 ? stops.find((v) => v > y + 4) : [...stops].reverse().find((v) => v < y - 4);
      if (next !== undefined) scroll.to(next);
    }
  });
}

function collectStops(s: Story | null, sections: HTMLElement[]) {
  if (!s) return sections.map((el) => el.offsetTop);
  const stops: number[] = [];
  s.beats.forEach((b, i) => {
    stops.push(s.tops[i]);
    for (const k of b.keyframes) stops.push(s.tops[i] + k * s.lens[i]);
  });
  return [...new Set(stops.map((v) => Math.round(v)))].sort((a, b) => a - b);
}
