/**
 * Geometric self-avoidance check for 1278/<combo>:
 * over ALL welded strand segments of a patch, verify
 *   (1) no two segments properly cross,
 *   (2) no segment endpoint lies in the interior of another segment (T-touch),
 *   (3) no collinear overlap between distinct segments,
 *   (4) every welded point has degree <= 2 (so shared endpoints are exactly
 *       the consecutive joints of a single polyline — distinct arcs share
 *       no point at all).
 *
 * (1)-(3) use a spatial hash + orientation predicates with eps 1e-9 on
 * coordinates whose fp noise is ~1e-12, far below the minimum true
 * clearances printed at the end.
 *
 * Run: cd web && npx --yes tsx fass-investigation/05-self-avoiding.ts <combo> <root> <level>
 * e.g. npx --yes tsx fass-investigation/05-self-avoiding.ts 0100100000 Delta 4
 */

import { segmentsCross, type Pt, type TileTypeId } from '../src/core';
import { buildPatch, collectTagged, pointSegDist, traceIndexed } from './lib';

const COMBO = process.argv[2] ?? '0100100000';
const ROOT = (process.argv[3] ?? 'Delta') as TileTypeId;
const LEVEL = Number(process.argv[4] ?? 4);

const { instances } = buildPatch(ROOT, LEVEL);
const { segs } = collectTagged(instances, COMBO);
const trace = traceIndexed(segs);
console.log(
  `1278/${COMBO} ${ROOT}@${LEVEL}: tiles=${instances.length} segments=${segs.length} ` +
    `arcs=${trace.tails.length} circuits=${trace.circuits.length} junctions=${trace.junctionCount}`,
);

// (4) degree check
let maxDeg = 0;
for (const [, d] of trace.degree) maxDeg = Math.max(maxDeg, d);
console.log(`max welded-point degree: ${maxDeg} (must be <= 2)`);

// spatial hash
const CELL = 2.0;
const grid = new Map<string, number[]>();
const cellOf = (x: number, y: number) => `${Math.floor(x / CELL)},${Math.floor(y / CELL)}`;
for (let i = 0; i < segs.length; i++) {
  const [a, b] = segs[i];
  const x0 = Math.floor(Math.min(a.x, b.x) / CELL);
  const x1 = Math.floor(Math.max(a.x, b.x) / CELL);
  const y0 = Math.floor(Math.min(a.y, b.y) / CELL);
  const y1 = Math.floor(Math.max(a.y, b.y) / CELL);
  for (let cx = x0; cx <= x1; cx++)
    for (let cy = y0; cy <= y1; cy++) {
      const k = `${cx},${cy}`;
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k)!.push(i);
    }
}

const key = (p: Pt) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`;
let crossings = 0;
let tTouches = 0;
let overlaps = 0;
let pairsChecked = 0;
let minClearance = Infinity; // smallest positive endpoint-to-other-segment distance
const EPS = 1e-9;

const seen = new Set<string>();
for (const [, list] of grid) {
  for (let ii = 0; ii < list.length; ii++) {
    for (let jj = ii + 1; jj < list.length; jj++) {
      const i = list[ii];
      const j = list[jj];
      const pk = i < j ? `${i}_${j}` : `${j}_${i}`;
      if (seen.has(pk)) continue;
      seen.add(pk);
      pairsChecked++;
      const [a1, a2] = segs[i];
      const [b1, b2] = segs[j];
      const shared =
        key(a1) === key(b1) || key(a1) === key(b2) || key(a2) === key(b1) || key(a2) === key(b2);
      if (segmentsCross(a1, a2, b1, b2)) {
        crossings++;
        continue;
      }
      // T-touch / overlap: endpoint of one strictly inside the other
      for (const [p, s1, s2] of [
        [a1, b1, b2],
        [a2, b1, b2],
        [b1, a1, a2],
        [b2, a1, a2],
      ] as const) {
        const d = pointSegDist(p, s1, s2);
        const atEnd = key(p) === key(s1) || key(p) === key(s2);
        if (d < EPS && !atEnd) {
          tTouches++;
        } else if (!atEnd && !shared && d < minClearance && d > EPS) {
          minClearance = d;
        }
      }
      // collinear overlap: both endpoints of one on the line of the other and
      // projections overlapping — covered by the T-touch test unless segments
      // are identical; identical welded segments would collapse in the weld,
      // but double-check:
      if (
        !shared &&
        pointSegDist(b1, a1, a2) < EPS &&
        pointSegDist(b2, a1, a2) < EPS
      ) {
        overlaps++;
      }
    }
  }
}

console.log(`segment pairs checked (bbox-close pairs): ${pairsChecked}`);
console.log(`proper crossings: ${crossings}`);
console.log(`T-touches (endpoint interior to another segment): ${tTouches}`);
console.log(`collinear overlaps: ${overlaps}`);
console.log(`min positive clearance between non-adjacent features: ${minClearance.toFixed(6)} world units`);
console.log(
  crossings === 0 && tTouches === 0 && overlaps === 0 && maxDeg <= 2
    ? 'SELF-AVOIDING: verified — strands form disjoint simple polylines.'
    : 'VIOLATIONS FOUND',
);
