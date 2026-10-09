// Usage: node scripts/screenshots.mjs [url] [outDir] [spec]
// spec: comma list of scene:progress pairs, e.g. "0:0,1:0.5" (default: 3 points per scene).
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const url = process.argv[2] ?? 'http://localhost:5179/';
const out = process.argv[3] ?? 'screenshots';
const spec = process.argv[4];
const only = process.env.VIEWPORTS ?? 'desktop,mobile';

const viewports = {
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

const points = spec
  ? spec.split(',').map((s) => s.split(':').map(Number))
  : Array.from({ length: 9 }, (_, i) => [[i, 0.12], [i, 0.5], [i, 0.88]]).flat();

await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

for (const name of only.split(',')) {
  const vp = viewports[name];
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, ...vp });
  page.on('console', (m) => {
    if (m.type() === 'error') console.log(`[${name}] console:`, m.text());
  });
  page.on('pageerror', (e) => console.log(`[${name}] pageerror:`, e.message));
  await page.goto(url + (url.includes('?') ? '&' : '?') + 'shots', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__os?.story?.tops?.length > 0, null, { timeout: 20000 });
  await page.waitForTimeout(1500);
  for (const [i, p] of points) {
    await page.waitForFunction(() => window.__os?.story?.tops?.length > 0, null, { timeout: 20000 });
    await page.evaluate(
      ({ i, p }) => {
        const { story, scroll } = window.__os;
        story.measure();
        const y = story.tops[i] + p * story.lens[i];
        if (scroll.lenis) scroll.lenis.scrollTo(y, { immediate: true, force: true });
        window.scrollTo(0, y);
      },
      { i, p },
    );
    await page.waitForTimeout(Number(process.env.WAIT ?? 1400));
    const jpeg = process.env.FORMAT === 'jpeg';
    const file = `${out}/${name}-s${i}-${String(Math.round(p * 100)).padStart(3, '0')}.${jpeg ? 'jpg' : 'png'}`;
    await page.screenshot(jpeg ? { path: file, type: 'jpeg', quality: 86 } : { path: file });
    console.log(file);
  }
  await page.close();
}
await browser.close();
