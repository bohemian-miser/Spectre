/**
 * A long strand's pyramid against rasterizing every one of its segments,
 * window by window: every level from 32 pixels a tile edge to 16384 tile
 * edges a pixel, at spots along the strand and in the empty space beside it,
 * panned, and the whole strand at once. Prints a table of mismatched pixels
 * per level (the pyramid is right when every count is 0), what each window
 * cost both ways, the bytes held, and writes pictures of the strand.
 *
 *   node --max-old-space-size=8000 node_modules/.bin/vite-node trail-scale/compare.ts -- <points> [outDir]
 *
 * The strand is the long open strand of rule 023468, combination 011001100
 * (`SEAM_STRAND`), walked the way the Explorer follows it.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { TrailPyramid } from '../src/pages/map/trail/pyramid';
import { emptyPicture, newStats, rasterize, type PixelGrid } from '../src/pages/map/trail/raster';
import { latticeOf, SQRT3, TrailStore } from '../src/pages/map/trail/store';
import { SEAM_STRAND, walkPoints } from '../src/pages/map/trail/__tests__/walkFixture';

const args = process.argv.slice(2).filter((a) => a !== '--');
const POINTS = Number(args[0] ?? 1e6);
const OUT = args[1] ?? 'trail-scale/out';
mkdirSync(OUT, { recursive: true });

const STORED = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
const LEVELS = [-5, -3, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
const W = 256;
const H = 192;

function rng(seed: number): () => number {
  let x = seed >>> 0 || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 2 ** 32;
  };
}

const sec = (t0: number): number => (performance.now() - t0) / 1000;

// --- the strand -------------------------------------------------------------
let t0 = performance.now();
const xy = walkPoints(SEAM_STRAND, POINTS, 120);
const walkSec = sec(t0);
const n = xy.length / 2;
const [i0, j0] = latticeOf(xy[0], xy[1]);
const store = new TrailStore(i0, j0);
for (let k = 1; k < n; k++) store.append(...latticeOf(xy[2 * k], xy[2 * k + 1]));
const pts = store.allPoints();
console.log(`walked ${n.toLocaleString('en-US')} points in ${walkSec.toFixed(1)} s; store ${(store.bytes / 1e6).toFixed(1)} MB (a float trail: ${((57 * n) / 1e6).toFixed(0)} MB)`);

t0 = performance.now();
const pyr = new TrailPyramid(store, { stored: STORED, tile: 256 });
const buildStats = newStats();
pyr.update(buildStats);
console.log(`pyramid: levels ${STORED.join(', ')} built in ${sec(t0).toFixed(1)} s, ${(pyr.bytes / 1e6).toFixed(1)} MB in tiles; ${buildStats.tested.toLocaleString('en-US')} pixel tests, ${buildStats.exact} settled exactly`);
console.log('tiles per level: ' + STORED.map((s) => `${s}:${pyr.tileCount(s)}`).join(' '));

let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
for (let k = 0; k < n; k++) {
  const x = pts[2 * k] / 4;
  const y = (pts[2 * k + 1] * SQRT3) / 4;
  minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
}

function reference(g: PixelGrid): Float64Array {
  const out = emptyPicture(g);
  rasterize(pts, store.segmentCount, 0, g, out);
  return out;
}

const centredAt = (x: number, y: number, s: number, w = W, h = H): PixelGrid => {
  const p = 2 ** s;
  return { s, m0: Math.floor(x / p) - (w >> 1), n0: Math.floor(y / p) - (h >> 1), w, h };
};

interface Row { windows: number; inked: number; wrong: number; refSec: number; pyrSec: number; from: Set<string>; maxSegs: number }
const rows = new Map<number, Row>();
const rowOf = (s: number): Row => rows.get(s) ?? rows.set(s, { windows: 0, inked: 0, wrong: 0, refSec: 0, pyrSec: 0, from: new Set(), maxSegs: 0 }).get(s)!;

function check(g: PixelGrid): void {
  const row = rowOf(g.s);
  let t = performance.now();
  const want = reference(g);
  row.refSec += sec(t);
  t = performance.now();
  const got = pyr.draw(g);
  row.pyrSec += sec(t);
  row.from.add(got.from);
  row.maxSegs = Math.max(row.maxSegs, got.segments);
  for (let i = 0; i < want.length; i++) {
    if (want[i] >= 0) row.inked++;
    if (got.picture[i] !== want[i]) row.wrong++;
  }
  // Stored levels are also drawn from chunks: both routes must agree.
  if (got.from === 'tiles') {
    const viaChunks = pyr.draw(g, 'chunks').picture;
    for (let i = 0; i < want.length; i++) if (viaChunks[i] !== want[i]) row.wrong++;
  }
  row.windows++;
}

const rand = rng(2026);
t0 = performance.now();
for (const s of LEVELS) {
  // Spots on the strand.
  for (let t = 0; t < 8; t++) {
    const k = Math.floor(rand() * n);
    check(centredAt(pts[2 * k] / 4, (pts[2 * k + 1] * SQRT3) / 4, s));
  }
  // Spots anywhere in the strand's box, ink or not.
  for (let t = 0; t < 4; t++) check(centredAt(minX + rand() * (maxX - minX), minY + rand() * (maxY - minY), s));
  // A pan of 12 steps of up to 300 pixels, across tile borders.
  const k = Math.floor(rand() * n);
  let g = centredAt(pts[2 * k] / 4, (pts[2 * k + 1] * SQRT3) / 4, s);
  for (let step = 0; step < 12; step++) {
    g = { ...g, m0: g.m0 + Math.floor(rand() * 601) - 300, n0: g.n0 + Math.floor(rand() * 601) - 300 };
    check(g);
  }
}
// The whole strand in one window at the levels where it fits in 2048 pixels.
for (const s of LEVELS) {
  const p = 2 ** s;
  const w = Math.ceil((maxX - minX) / p) + 8;
  const h = Math.ceil((maxY - minY) / p) + 8;
  if (w > 2048 || h > 2048) continue;
  check({ s, m0: Math.floor(minX / p) - 4, n0: Math.floor(minY / p) - 4, w, h });
}
console.log(`checked in ${sec(t0).toFixed(0)} s\n`);

console.log('level  tile edges/px  windows  inked px    wrong px  drawn from     segments re-walked  reference s/window  pyramid s/window');
let wrongAll = 0;
for (const s of LEVELS) {
  const r = rowOf(s);
  wrongAll += r.wrong;
  console.log(
    `${String(s).padStart(5)}  ${String(2 ** s).padStart(13)}  ${String(r.windows).padStart(7)}  ${String(r.inked).padStart(10)}  ${String(r.wrong).padStart(8)}  ${[...r.from].join('+').padEnd(13)}  ${String(r.maxSegs).padStart(18)}  ${(r.refSec / r.windows).toFixed(3).padStart(18)}  ${(r.pyrSec / r.windows).toFixed(4).padStart(16)}`,
  );
}
console.log(`\nmismatched pixels, all windows: ${wrongAll}`);

// --- pictures ---------------------------------------------------------------
function png(path: string, w: number, h: number, rgb: Uint8Array): void {
  const crcTable = new Int32Array(256).map((_, i) => {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c;
  });
  const crc = (b: Uint8Array): number => {
    let c = -1;
    for (const x of b) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
  };
  const chunk = (type: string, data: Uint8Array): Buffer => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), Buffer.from(data)]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const raw = Buffer.alloc((3 * w + 1) * h);
  for (let y = 0; y < h; y++) raw.set(rgb.subarray(3 * w * y, 3 * w * (y + 1)), y * (3 * w + 1) + 1);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  writeFileSync(path, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', new Uint8Array())]));
}

/** The rainbow of `webglRenderer.ts` (hue 0..300 degrees, lightness lifted round blue), over the segment index. */
function colour(t: number): [number, number, number] {
  const deg = t * 300;
  const l = 0.5 + 0.15 * Math.cos(((deg - 240) * Math.PI) / 180);
  const a = Math.min(l, 1 - l);
  const f = (k0: number): number => {
    const k = (k0 + deg / 30) % 12;
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return [f(0), f(8), f(4)];
}

function picturePng(path: string, g: PixelGrid, pic: Float64Array): void {
  const rgb = new Uint8Array(3 * g.w * g.h).fill(14);
  for (let row = 0; row < g.h; row++) {
    for (let col = 0; col < g.w; col++) {
      const v = pic[(g.h - 1 - row) * g.w + col];
      if (v < 0) continue;
      rgb.set(colour(v / store.segmentCount), 3 * (row * g.w + col));
    }
  }
  png(path, g.w, g.h, rgb);
}

{
  // The whole strand, and a zoom into the middle of it, each from the pyramid.
  const s = Math.ceil(Math.log2(Math.max((maxX - minX) / 1100, (maxY - minY) / 800)));
  const p = 2 ** s;
  const whole: PixelGrid = { s, m0: Math.floor(minX / p) - 8, n0: Math.floor(minY / p) - 8, w: Math.ceil((maxX - minX) / p) + 16, h: Math.ceil((maxY - minY) / p) + 16 };
  picturePng(`${OUT}/whole.png`, whole, pyr.draw(whole).picture);
  const k = Math.floor(n / 2);
  for (const z of [s - 3, s - 6, s - 9]) {
    const g = centredAt(pts[2 * k] / 4, (pts[2 * k + 1] * SQRT3) / 4, z, 600, 400);
    picturePng(`${OUT}/zoom-${z}.png`, g, pyr.draw(g).picture);
  }
  console.log(`pictures in ${OUT}: whole.png (level ${s}), zoom-${s - 3}, zoom-${s - 6}, zoom-${s - 9}`);
}
