/**
 * One long open strand walked both ways from its seed, as far as asked, held
 * in the exact store and drawn from its pyramid; and the proof in pictures
 * that the pyramid's windows are the full rasterization's, pixel for pixel.
 *
 *   node --max-old-space-size=12000 node_modules/.bin/vite-node trail-scale/biggie.ts -- <points each way> [outDir]
 *
 * Writes, into outDir:
 *   whole.png            the whole strand from the pyramid
 *   level-<s>.png        at each level checked: [reference | pyramid | difference], side by side
 *   summary.txt          points, bytes, seconds, and mismatched pixels per level
 *
 * The strand's float trail is never held: the walk is trimmed as it goes and
 * every point goes into the store as it is passed.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { comboToMatchingIndices, unrootedEngineFor } from '../src/core';
import { buildLeafChordTable } from '../src/pages/map/chords';
import { advanceWalk, buildChordIndex, hitTestChord, startTrail, trimTrail, type ChordEnd } from '../src/pages/map/strandWalk';
import { TrailPyramid } from '../src/pages/map/trail/pyramid';
import { emptyPicture, rasterize, type PixelGrid } from '../src/pages/map/trail/raster';
import { CHUNK, latticeOf, SQRT3, TrailStore } from '../src/pages/map/trail/store';
import { SEAM_STRAND, type WalkSpec } from '../src/pages/map/trail/__tests__/walkFixture';

const args = process.argv.slice(2).filter((a) => a !== '--');
const EACH = Number(args[0] ?? 2e7);
const OUT = args[1] ?? 'trail-scale/out/biggie';
mkdirSync(OUT, { recursive: true });
const lines: string[] = [];
const log = (s: string): void => {
  console.log(s);
  lines.push(s);
};
const sec = (t0: number): string => ((performance.now() - t0) / 1000).toFixed(1);

// --- walking into a store ---------------------------------------------------

/** Walk `spec`'s strand one way from its seed, `points` points, handing each point (absolute lattice) to `on`. */
function walk(spec: WalkSpec, back: boolean, points: number, on: (i: number, j: number) => void): string {
  const engine = unrootedEngineFor(1, 'hex', spec.chain);
  const chords = buildLeafChordTable('hex', spec.subset, comboToMatchingIndices('hex', spec.subset, spec.combo));
  const HALF = 120;
  const query = (cx: number, cy: number) => {
    const view = { cx, cy, halfW: HALF, halfH: HALF };
    const cut = engine.query(view, 200000, {});
    return { view, index: buildChordIndex(cut, chords) };
  };
  const [sx, sy] = spec.seed;
  const hit = hitTestChord(query(sx, sy).index!, { x: sx, y: sy }, 1.5);
  if (!hit) throw new Error('the seed is not on a chord');
  const flip = (Math.hypot(hit.at.x - sx, hit.at.y - sy) > Math.hypot(hit.to.x - sx, hit.to.y - sy)) !== back;
  const start: ChordEnd = flip ? { at: hit.to, to: hit.at, leafType: hit.leafType } : hit;
  const trail = startTrail(start, chords.rows);
  let seen = 0;
  const take = (from: number): void => {
    for (let k = from; k < trail.count && seen < points; k++, seen++) on(...latticeOf(trail.xy[2 * k], trail.xy[2 * k + 1]));
  };
  take(0);
  while (seen < points) {
    const r = query(trail.head.x, trail.head.y);
    const before = trail.count;
    advanceWalk(trail, r.index, { covered: { ...r.view, halfW: HALF / 2, halfH: HALF / 2 }, maxSteps: 1e9 });
    take(before);
    if (trail.status !== 'frontier' || trail.count === before) return trail.status;
    trimTrail(trail, 64);
  }
  return trail.status;
}

let t0 = performance.now();
// The backward half first, into its own store; then the whole strand from
// its far end: the backward half reversed, then the forward half.
let backStore: TrailStore | null = null;
const backStatus = walk(SEAM_STRAND, true, EACH, (i, j) => {
  if (!backStore) backStore = new TrailStore(i, j);
  else backStore.append(i, j);
});
const bs = backStore!;
log(`backward: ${bs.pointCount.toLocaleString('en-US')} points, ${backStatus}, ${sec(t0)} s`);

t0 = performance.now();
let store: TrailStore | null = null;
for (let c = bs.chunkCount - 1; c >= 0; c--) {
  const { count } = bs.chunkSegments(c);
  const pts = bs.chunkPoints(c);
  for (let k = count; k >= 0; k--) {
    const i = pts[2 * k] + bs.originI;
    const j = pts[2 * k + 1] + bs.originJ;
    if (!store) store = new TrailStore(i, j);
    else if (k < count || c === bs.chunkCount - 1) store.append(i, j);
  }
}
const S = store!;
// A walk's first two points are the tapped chord's ends, so the forward
// walk's first two are the backward walk's first two the other way round:
// both already in the store.
let skip = 2;
const fwdStatus = walk(SEAM_STRAND, false, EACH, (i, j) => {
  if (skip > 0) skip--;
  else S.append(i, j);
});
log(`forward: ${fwdStatus}; whole strand ${S.pointCount.toLocaleString('en-US')} points in ${S.chunkCount.toLocaleString('en-US')} chunks of ${CHUNK}, ${(S.bytes / 1e6).toFixed(1)} MB (a float trail would be ${((57 * S.pointCount) / 1e9).toFixed(2)} GB), ${sec(t0)} s`);

// --- the pyramid ------------------------------------------------------------
t0 = performance.now();
const STORED = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
const pyr = new TrailPyramid(S, { stored: STORED, tile: 256 });
pyr.update();
log(`pyramid: levels ${STORED[0]}..${STORED[STORED.length - 1]} in ${sec(t0)} s, ${(pyr.bytes / 1e6).toFixed(1)} MB in tiles (` + STORED.map((s) => `${s}:${pyr.tileCount(s)}`).join(' ') + ')');

// Extent, and the reference drawn from every segment.
let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
for (let c = 0; c < S.chunkCount; c++) {
  const b = S.box(c);
  minX = Math.min(minX, b.minI / 4); maxX = Math.max(maxX, b.maxI / 4);
  minY = Math.min(minY, (b.minJ * SQRT3) / 4); maxY = Math.max(maxY, (b.maxJ * SQRT3) / 4);
}
log(`extent: ${(maxX - minX).toFixed(0)} by ${(maxY - minY).toFixed(0)} tile edges`);

const scratch = new Float64Array(2 * (CHUNK + 1));
function reference(g: PixelGrid): Float64Array {
  const out = emptyPicture(g);
  for (let c = 0; c < S.chunkCount; c++) {
    const { first, count } = S.chunkSegments(c);
    rasterize(S.chunkPoints(c, scratch), count, first, g, out);
  }
  return out;
}

// --- pictures ---------------------------------------------------------------
function png(path: string, w: number, h: number, rgb: Uint8Array): void {
  const table = new Int32Array(256).map((_, i) => {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c;
  });
  const crc = (b: Uint8Array): number => {
    let c = -1;
    for (const x of b) c = table[(c ^ x) & 0xff] ^ (c >>> 8);
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

/** The Explorer's rainbow (`webglRenderer.ts`): hue 0..300 over the strand, lightness lifted round blue. */
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

const BG: [number, number, number] = [14, 17, 22];
function paint(rgb: Uint8Array, stride: number, x0: number, g: PixelGrid, pic: Float64Array): void {
  for (let row = 0; row < g.h; row++) {
    for (let col = 0; col < g.w; col++) {
      const v = pic[(g.h - 1 - row) * g.w + col];
      rgb.set(v < 0 ? BG : colour(v / S.segmentCount), 3 * (row * stride + x0 + col));
    }
  }
}

const GAP = 12;
/** [reference | pyramid | difference] side by side; returns the mismatch count. */
function comparison(path: string, g: PixelGrid): { wrong: number; refSec: string; pyrSec: string } {
  let t = performance.now();
  const want = reference(g);
  const refSec = sec(t);
  t = performance.now();
  const got = pyr.draw(g).picture;
  const pyrSec = sec(t);
  const W = 3 * g.w + 2 * GAP;
  const rgb = new Uint8Array(3 * W * g.h).fill(60);
  paint(rgb, W, 0, g, want);
  paint(rgb, W, g.w + GAP, g, got);
  let wrong = 0;
  for (let row = 0; row < g.h; row++) {
    for (let col = 0; col < g.w; col++) {
      const k = (g.h - 1 - row) * g.w + col;
      const differ = want[k] !== got[k];
      if (differ) wrong++;
      rgb.set(differ ? [255, 255, 255] : want[k] < 0 ? BG : [40, 46, 56], 3 * (row * W + 2 * (g.w + GAP) + col));
    }
  }
  png(path, W, g.h, rgb);
  return { wrong, refSec, pyrSec };
}

const centred = (x: number, y: number, s: number, w: number, h: number): PixelGrid => {
  const p = 2 ** s;
  return { s, m0: Math.floor(x / p) - (w >> 1), n0: Math.floor(y / p) - (h >> 1), w, h };
};

t0 = performance.now();
const sWhole = Math.ceil(Math.log2(Math.max((maxX - minX) / 1500, (maxY - minY) / 1000)));
{
  const p = 2 ** sWhole;
  const g: PixelGrid = { s: sWhole, m0: Math.floor(minX / p) - 8, n0: Math.floor(minY / p) - 8, w: Math.ceil((maxX - minX) / p) + 16, h: Math.ceil((maxY - minY) / p) + 16 };
  const pic = pyr.draw(g).picture;
  const rgb = new Uint8Array(3 * g.w * g.h);
  paint(rgb, g.w, 0, g, pic);
  png(`${OUT}/whole.png`, g.w, g.h, rgb);
  log(`whole.png: level ${sWhole} (${p} tile edges a pixel), ${g.w} by ${g.h}, ${sec(t0)} s`);
}

// Comparisons: the whole strand at its level, then zooms on the seed (the
// middle of the strand) and on a spot a third of the way along, down to
// four pixels a tile edge.
const mid = bs.pointCount - 1; // the tapped chord's end the walks leave from, in the whole strand
const midPts = S.chunkPoints(Math.floor(mid / CHUNK));
const midK = mid - Math.floor(mid / CHUNK) * CHUNK;
const midX = midPts[2 * midK] / 4;
const midY = (midPts[2 * midK + 1] * SQRT3) / 4;
const third = Math.floor(S.pointCount / 3);
const thirdPts = S.chunkPoints(Math.floor(third / CHUNK));
const thirdK = third - Math.floor(third / CHUNK) * CHUNK;
const thirdX = thirdPts[2 * thirdK] / 4;
const thirdY = (thirdPts[2 * thirdK + 1] * SQRT3) / 4;

log('\nlevel  tile edges/px  window        wrong px  reference s  pyramid s');
let wrongAll = 0;
const spots: [string, number, number][] = [['seed', midX, midY], ['third', thirdX, thirdY]];
for (let s = sWhole; s >= -2; s--) {
  const [name, x, y] = spots[(sWhole - s) % 2];
  const g = s === sWhole
    ? { s, m0: Math.floor(minX / 2 ** s) - 8, n0: Math.floor(minY / 2 ** s) - 8, w: Math.ceil((maxX - minX) / 2 ** s) + 16, h: Math.ceil((maxY - minY) / 2 ** s) + 16 }
    : centred(x, y, s, 640, 420);
  const r = comparison(`${OUT}/level-${s}.png`, g);
  wrongAll += r.wrong;
  log(`${String(s).padStart(5)}  ${String(2 ** s).padStart(13)}  ${(s === sWhole ? 'whole' : name).padEnd(12)}  ${String(r.wrong).padStart(8)}  ${r.refSec.padStart(11)}  ${r.pyrSec.padStart(9)}`);
}
log(`\nmismatched pixels, all comparisons: ${wrongAll}`);
writeFileSync(`${OUT}/summary.txt`, lines.join('\n') + '\n');
