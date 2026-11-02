/**
 * A strand for a page to draw: `SEAM_STRAND` walked both ways from its seed,
 * as lattice steps (one byte each) with the step table and the first point.
 *
 *   node node_modules/.bin/vite-node trail-scale/export-strand.ts -- <points each way> <out.json>
 */
import { writeFileSync } from 'node:fs';
import { comboToMatchingIndices, unrootedEngineFor } from '../src/core';
import { buildLeafChordTable } from '../src/pages/map/chords';
import { advanceWalk, buildChordIndex, hitTestChord, startTrail, trimTrail, type ChordEnd } from '../src/pages/map/strandWalk';
import { latticeOf } from '../src/pages/map/trail/store';
import { SEAM_STRAND, type WalkSpec } from '../src/pages/map/trail/__tests__/walkFixture';

const args = process.argv.slice(2).filter((a) => a !== '--');
const EACH = Number(args[0] ?? 2e5);
const OUT = args[1] ?? 'trail-scale/out/strand.json';

function walk(spec: WalkSpec, back: boolean, points: number, on: (i: number, j: number) => void): void {
  const engine = unrootedEngineFor(1, 'hex', spec.chain);
  const chords = buildLeafChordTable('hex', spec.subset, comboToMatchingIndices('hex', spec.subset, spec.combo));
  const HALF = 120;
  const query = (cx: number, cy: number) => {
    const view = { cx, cy, halfW: HALF, halfH: HALF };
    return { view, index: buildChordIndex(engine.query(view, 200000, {}), chords) };
  };
  const [sx, sy] = spec.seed;
  const hit = hitTestChord(query(sx, sy).index!, { x: sx, y: sy }, 1.5)!;
  const flip = (Math.hypot(hit.at.x - sx, hit.at.y - sy) > Math.hypot(hit.to.x - sx, hit.to.y - sy)) !== back;
  const start: ChordEnd = flip ? { ...hit, at: hit.to, to: hit.at } : hit;
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
    if (trail.status !== 'frontier' || trail.count === before) return;
    trimTrail(trail, 64);
  }
}

const back: [number, number][] = [];
walk(SEAM_STRAND, true, EACH, (i, j) => back.push([i, j]));
const all: [number, number][] = back.reverse();
let skip = 2;
walk(SEAM_STRAND, false, EACH, (i, j) => {
  if (skip > 0) skip--;
  else all.push([i, j]);
});

const stepI: number[] = [];
const stepJ: number[] = [];
const codeOf = new Map<string, number>();
const codes = new Uint8Array(all.length - 1);
for (let k = 1; k < all.length; k++) {
  const di = all[k][0] - all[k - 1][0];
  const dj = all[k][1] - all[k - 1][1];
  const key = `${di},${dj}`;
  let c = codeOf.get(key);
  if (c === undefined) {
    c = stepI.length;
    stepI.push(di);
    stepJ.push(dj);
    codeOf.set(key, c);
  }
  codes[k - 1] = c;
}
const out = {
  name: 'rule 023468, combination 011001100, walked both ways from the seed of an Explorer link',
  originI: all[0][0],
  originJ: all[0][1],
  points: all.length,
  stepI,
  stepJ,
  codes: Buffer.from(codes).toString('base64'),
};
writeFileSync(OUT, JSON.stringify(out));
console.log(`${all.length.toLocaleString('en-US')} points, ${stepI.length} distinct steps, ${(Buffer.byteLength(JSON.stringify(out)) / 1e3).toFixed(0)} kB -> ${OUT}`);
