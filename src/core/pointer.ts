// Smoothed pointer position in [-1, 1] for gentle camera parallax on desktop.
import { damp } from './math';

export const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

if (matchMedia('(pointer: fine)').matches) {
  window.addEventListener(
    'pointermove',
    (e) => {
      pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
    },
    { passive: true },
  );
}

export function updatePointer(dt: number) {
  pointer.x = damp(pointer.x, pointer.tx, 2.5, dt);
  pointer.y = damp(pointer.y, pointer.ty, 2.5, dt);
}
