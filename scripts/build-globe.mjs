// Builds public/land.bin — a point cloud of land masses for the globe.
// Source: Natural Earth 110m land (public domain), https://www.naturalearthdata.com/
// Output format: Int16Array of [lat*100, lon*100] pairs.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cacheDir = join(root, '.cache', 'natural-earth');
const cacheFile = join(cacheDir, 'ne_110m_land.geojson');
const outFile = join(root, 'public', 'land.bin');
const URL_NE =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_110m_land.geojson';
const SAMPLES = 64000;

async function loadGeoJSON() {
  if (!existsSync(cacheFile)) {
    await mkdir(cacheDir, { recursive: true });
    const res = await fetch(URL_NE);
    if (!res.ok) throw new Error(`Natural Earth download failed: ${res.status}`);
    await writeFile(cacheFile, await res.text());
  }
  return JSON.parse(await readFile(cacheFile, 'utf8'));
}

function ringContains(ring, lon, lat) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const geo = await loadGeoJSON();
const polygons = [];
for (const f of geo.features) {
  const g = f.geometry;
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  for (const rings of polys) {
    let minX = 180, maxX = -180, minY = 90, maxY = -90;
    for (const [x, y] of rings[0]) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
    polygons.push({ rings, minX, maxX, minY, maxY });
  }
}

const out = [];
const golden = Math.PI * (3 - Math.sqrt(5));
for (let i = 0; i < SAMPLES; i++) {
  const y = 1 - (i / (SAMPLES - 1)) * 2;
  const theta = golden * i;
  const lat = (Math.asin(y) * 180) / Math.PI;
  let lon = ((theta * 180) / Math.PI) % 360;
  if (lon > 180) lon -= 360;
  if (lat < -60) continue; // skip Antarctica: it reads as noise at this scale
  for (const p of polygons) {
    if (lon < p.minX || lon > p.maxX || lat < p.minY || lat > p.maxY) continue;
    if (ringContains(p.rings[0], lon, lat) && !p.rings.slice(1).some((h) => ringContains(h, lon, lat))) {
      out.push(Math.round(lat * 100), Math.round(lon * 100));
      break;
    }
  }
}

await writeFile(outFile, Buffer.from(new Int16Array(out).buffer));
console.log(`land.bin: ${out.length / 2} points, ${(out.length * 2 / 1024).toFixed(1)} KB`);
