// Combines screenshots into one contact sheet: node scripts/sheet.mjs out.png a.png b.png ...
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';

const [out, ...files] = process.argv.slice(2);
const cols = Number(process.env.COLS ?? 2);
const w = Number(process.env.W ?? 720);
const imgs = await Promise.all(files.map(async (f) => `data:image/png;base64,${(await readFile(f)).toString('base64')}`));
const html = `<body style="margin:0;background:#222;display:grid;grid-template-columns:repeat(${cols},${w}px);gap:4px;font:12px monospace;color:#fff">
${imgs.map((src, i) => `<div><img src="${src}" style="width:${w}px;display:block"><div>${basename(files[i])}</div></div>`).join('')}</body>`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: cols * (w + 4), height: 400 } });
await page.setContent(html);
await page.waitForTimeout(200);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
