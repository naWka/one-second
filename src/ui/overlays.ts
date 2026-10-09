// Small helpers for the fixed DOM overlays that accompany scenes.

const cache = new Map<string, HTMLElement | null>();
export function ov(scene: number) {
  const key = `ov${scene}`;
  if (!cache.has(key)) cache.set(key, document.querySelector<HTMLElement>(`[data-ov="${scene}"]`));
  return cache.get(key) ?? null;
}

export function setOn(el: Element | null, on: boolean, cls = 'is-on') {
  if (!el) return;
  if (el.classList.contains(cls) !== on) el.classList.toggle(cls, on);
}
