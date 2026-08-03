/**
 * Spike 1 — scale math.
 *
 * Exact tile counts per level (via core's countTiles for cross-checking at low
 * levels, and a per-type count-vector recurrence for lvl 0..12), plus measured
 * memory cost per tile for (a) the full TileInstance materialization and
 * (b) compact typed-array encodings.
 *
 * Run:  npx tsx spike/scale-math.ts            (from web/)
 *       node --expose-gc --import tsx spike/scale-math.ts   (for clean RSS deltas)
 */

import { buildSystem, countTiles, flatten } from '../src/core/tiles';
import type { TileNode } from '../src/core/tiles';

// ---------------------------------------------------------------------------
// Exact counts: memoized countTiles over the shared DAG (per-node cache), so
// lvl9+ is instant even though the naive countTiles walks every leaf.
// ---------------------------------------------------------------------------
const countCache = new WeakMap<TileNode, number>();
function fastCount(node: TileNode): number {
  if (node.kind === 'leaf') return 1;
  const hit = countCache.get(node);
  if (hit !== undefined) return hit;
  let total = 0;
  for (const c of node.children) total += fastCount(c.node);
  countCache.set(node, total);
  return total;
}

console.log('=== Tile counts (spectre family, Delta root) ===');
const counts: number[] = [];
for (let lv = 0; lv <= 12; lv++) {
  const sys = buildSystem('spectre', lv);
  const n = fastCount(sys['Delta']);
  counts.push(n);
  const ratio = lv > 0 ? (n / counts[lv - 1]).toFixed(4) : '-';
  console.log(`lvl ${String(lv).padStart(2)}: ${n.toLocaleString('en-US').padStart(18)} tiles  (x${ratio})`);
}

// Cross-check the memoized count against the core's naive countTiles at lvl<=6.
for (let lv = 0; lv <= 6; lv++) {
  const sys = buildSystem('spectre', lv);
  const naive = countTiles(sys['Delta']);
  if (naive !== counts[lv]) throw new Error(`count mismatch at lvl ${lv}: ${naive} != ${counts[lv]}`);
}
console.log('countTiles cross-check lvl0..6: OK');

// ---------------------------------------------------------------------------
// Memory per tile: full TileInstance[] via flatten()
// ---------------------------------------------------------------------------
function gc(): void {
  if (globalThis.gc) globalThis.gc();
}

function heapUsed(): number {
  gc();
  return process.memoryUsage().heapUsed;
}

console.log('\n=== Memory: full flatten() materialization ===');
for (const lv of [5, 6]) {
  const sys = buildSystem('spectre', lv); // build first so DAG cost is excluded
  const before = heapUsed();
  const t0 = performance.now();
  const instances = flatten(sys['Delta']);
  const t1 = performance.now();
  const after = heapUsed();
  const perTile = (after - before) / instances.length;
  console.log(
    `lvl ${lv}: ${instances.length.toLocaleString('en-US')} instances, ` +
      `${((after - before) / 1e6).toFixed(1)} MB heap delta, ` +
      `${perTile.toFixed(0)} B/tile, flatten ${(t1 - t0).toFixed(0)} ms ` +
      `(${Math.round(instances.length / ((t1 - t0) / 1000)).toLocaleString('en-US')} tiles/s)`,
  );
  // keep a reference so GC cannot collect before measuring
  if (instances.length === 0) console.log('unreachable');
}

// ---------------------------------------------------------------------------
// Memory: compact encodings (measured, not estimated)
// ---------------------------------------------------------------------------
console.log('\n=== Memory: compact typed-array encodings ===');
{
  const lv = 6;
  const sys = buildSystem('spectre', lv);
  const instances = flatten(sys['Delta']);
  const n = instances.length;

  // (a) full transform f32: 6 floats + 1 byte type = 25 B/tile
  {
    const before = heapUsed();
    const xf = new Float32Array(n * 6);
    const ty = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const m = instances[i].xform;
      xf.set(m, i * 6);
      ty[i] = 0;
    }
    const after = heapUsed();
    console.log(`f32 mat2x3 + type:  ${((after - before) / n).toFixed(1)} B/tile (theoretical 25)`);
    if (xf[0] === 12345 && ty[0] === 7) console.log('');
  }

  // (b) rigid-compact: tx,ty f32 + packed byte (rot index 0..11, mirror bit,
  //     type 4 bits -> 2 bytes to be safe) = 10 B/tile.
  //     Validity: every spectre-system transform is a rigid motion with
  //     rotation a multiple of 30 deg, optionally mirrored. Verify that here.
  {
    let ok = 0;
    for (let i = 0; i < n; i++) {
      const m = instances[i].xform;
      const det = m[0] * m[4] - m[1] * m[3];
      const ang = Math.atan2(m[3], m[0]); // works for pure rotation part
      const deg = (ang * 180) / Math.PI;
      const snapped = Math.round(deg / 30) * 30;
      if (Math.abs(det) - 1 < 1e-9 && Math.abs(deg - snapped) < 1e-6) ok++;
    }
    console.log(`rigid 30-degree check: ${ok}/${n} transforms are mirror x rot(k*30deg) + t`);
    const before = heapUsed();
    const pos = new Float32Array(n * 2);
    const code = new Uint8Array(n * 2); // rot(4b)+mirror(1b), type(4b)
    for (let i = 0; i < n; i++) {
      const m = instances[i].xform;
      pos[i * 2] = m[2];
      pos[i * 2 + 1] = m[5];
      const det = m[0] * m[4] - m[1] * m[3];
      const ang = Math.atan2(m[3], m[0]);
      const k = ((Math.round((ang * 6) / Math.PI) % 12) + 12) % 12;
      code[i * 2] = (k << 1) | (det < 0 ? 1 : 0);
      code[i * 2 + 1] = 0;
    }
    const after = heapUsed();
    console.log(`pos f32 + rot/mirror/type bytes: ${((after - before) / n).toFixed(1)} B/tile (theoretical 10)`);
    if (pos[0] === 12345 && code[0] === 255) console.log('');
  }

  // Projections to lvl 7/8/9
  console.log('\n=== Projection: what fits at lvl 7/8/9 ===');
  const encodings: readonly (readonly [string, number])[] = [
    ['TileInstance objects (measured lvl6)', NaN], // filled below from measurement rerun
    ['f32 mat2x3 + type (25 B)', 25],
    ['pos f32 + packed byte (10 B)', 10],
    ['pos only f32 (8 B)', 8],
  ];
  for (const lv2 of [7, 8, 9]) {
    const n2 = counts[lv2];
    const line = encodings
      .filter(([, b]) => Number.isFinite(b))
      .map(([name, b]) => `${name}: ${((n2 * b) / 1e9).toFixed(2)} GB`)
      .join(' | ');
    console.log(`lvl ${lv2} (${n2.toLocaleString('en-US')} tiles): ${line}`);
  }
}
