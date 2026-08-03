/**
 * Spike 2 — viewport-driven lazy expansion of the substitution hierarchy.
 *
 * The level-9 root is a DAG of shared nodes; we never flatten it. Given a
 * camera (center, zoom) and an on-screen tile budget, we:
 *   1. pick a CUT LEVEL c so the expected visible instance count fits budget
 *      (each level up divides counts by ~7.873 — the hierarchy IS the LOD tree)
 *   2. DFS from the root, pruning nodes whose (cached, node-local) bbox misses
 *      the view rect, and emit compact instances at the cut level.
 *
 * Output per instance: x, y (f32, view-relative), rot index 0..11 + mirror
 * bit, type index — 11 bytes. This is also the WebGL spike's wire format.
 *
 * Run:  npx tsx spike/lazy-gen.ts            benchmarks
 *       npx tsx spike/lazy-gen.ts --emit     also writes spike/tiles.bin for
 *                                            the WebGL page (~2M real tiles
 *                                            from the level-9 patch)
 */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { isMainThread } from 'node:worker_threads';
import { leafPts, LEAF_ORDER, type TileTypeId } from '../src/core/families';
import { buildSystem, type TileNode } from '../src/core/tiles';
import type { Affine } from '../src/core/geom';

const family = 'spectre' as const;
const GROWTH = 7.8730178; // tiles per level (dominant eigenvalue)

// ---------------------------------------------------------------------------
// Cached node-local bounding boxes (WeakMap over the shared DAG)
// ---------------------------------------------------------------------------
interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const bboxCache = new WeakMap<TileNode, BBox>();

function localBBox(node: TileNode): BBox {
  const hit = bboxCache.get(node);
  if (hit) return hit;
  let box: BBox;
  if (node.kind === 'leaf') {
    box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    for (const p of leafPts(family, node.type)) {
      if (p.x < box.minX) box.minX = p.x;
      if (p.y < box.minY) box.minY = p.y;
      if (p.x > box.maxX) box.maxX = p.x;
      if (p.y > box.maxY) box.maxY = p.y;
    }
  } else {
    box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    for (const child of node.children) {
      const b = localBBox(child.node);
      const T = child.xform;
      // transform the 4 corners (rigid transforms -> exact corner images)
      for (const [cx, cy] of [
        [b.minX, b.minY],
        [b.maxX, b.minY],
        [b.minX, b.maxY],
        [b.maxX, b.maxY],
      ]) {
        const x = T[0] * cx + T[1] * cy + T[2];
        const y = T[3] * cx + T[4] * cy + T[5];
        if (x < box.minX) box.minX = x;
        if (y < box.minY) box.minY = y;
        if (x > box.maxX) box.maxX = x;
        if (y > box.maxY) box.maxY = y;
      }
    }
  }
  bboxCache.set(node, box);
  return box;
}

// ---------------------------------------------------------------------------
// Expansion
// ---------------------------------------------------------------------------
export interface View {
  cx: number;
  cy: number;
  halfW: number;
  halfH: number;
}

export interface Emission {
  count: number;
  pos: Float32Array; // x,y per instance, view-relative
  code: Uint8Array; // rot(0..11) | mirror<<4
  type: Uint8Array; // index into LEAF_ORDER (or 255 for aggregate supertile)
  cutLevel: number;
  visitedNodes: number;
}

const TYPE_INDEX = new Map<TileTypeId, number>(LEAF_ORDER.map((t, i) => [t, i]));

export function expand(root: TileNode, rootLevel: number, view: View, budget: number): Emission {
  // Estimate visible tiles: view area / tile area (spectre shoelace area).
  const TILE_AREA = 8.196152;
  const est = (4 * view.halfW * view.halfH) / TILE_AREA;
  const cutLevel = Math.max(0, Math.ceil(Math.log(Math.max(1, est / budget)) / Math.log(GROWTH)));

  const cap = Math.ceil(budget * GROWTH * 1.6); // slack: bbox culling overshoots
  const pos = new Float32Array(cap * 2);
  const code = new Uint8Array(cap);
  const type = new Uint8Array(cap);
  let n = 0;
  let visited = 0;

  const minX = view.cx - view.halfW;
  const maxX = view.cx + view.halfW;
  const minY = view.cy - view.halfH;
  const maxY = view.cy + view.halfH;

  const emit = (node: TileNode, T: Affine): void => {
    if (n >= cap) return; // budget blown; caller sees count===cap
    pos[n * 2] = T[2] - view.cx;
    pos[n * 2 + 1] = T[5] - view.cy;
    const det = T[0] * T[4] - T[1] * T[3];
    // Decompose linear part as R(theta) * S, S = diag(mirror, 1):
    //   det>0: T = [[c,-s],[s,c]]      -> theta = atan2(T[3], T[0])
    //   det<0: T = [[-c,-s],[-s,c]]    -> theta = atan2(-T[3], -T[0])
    const ang = det > 0 ? Math.atan2(T[3], T[0]) : Math.atan2(-T[3], -T[0]);
    const k = ((Math.round((ang * 6) / Math.PI) % 12) + 12) % 12;
    code[n] = k | (det < 0 ? 16 : 0);
    type[n] = node.kind === 'leaf' ? (TYPE_INDEX.get(node.type) ?? 0) : 255;
    n++;
  };

  const walk = (node: TileNode, T: Affine, level: number): void => {
    visited++;
    const b = localBBox(node);
    // world bbox via corner transforms
    let wMinX = Infinity;
    let wMinY = Infinity;
    let wMaxX = -Infinity;
    let wMaxY = -Infinity;
    for (const [cx, cy] of [
      [b.minX, b.minY],
      [b.maxX, b.minY],
      [b.minX, b.maxY],
      [b.maxX, b.maxY],
    ]) {
      const x = T[0] * cx + T[1] * cy + T[2];
      const y = T[3] * cx + T[4] * cy + T[5];
      if (x < wMinX) wMinX = x;
      if (y < wMinY) wMinY = y;
      if (x > wMaxX) wMaxX = x;
      if (y > wMaxY) wMaxY = y;
    }
    if (wMaxX < minX || wMinX > maxX || wMaxY < minY || wMinY > maxY) return;

    if (node.kind === 'leaf' || (cutLevel > 0 && level <= cutLevel)) {
      // At cut 0 the Gamma composite (a level-0 meta of two leaves) must
      // still recurse — only real leaves are emitted as tiles.
      emit(node, T);
      return;
    }
    for (const child of node.children) {
      // child level: substitution children live one level down; the Gamma
      // pair at level 0 keeps level 0.
      walk(
        child.node,
        [
          T[0] * child.xform[0] + T[1] * child.xform[3],
          T[0] * child.xform[1] + T[1] * child.xform[4],
          T[0] * child.xform[2] + T[1] * child.xform[5] + T[2],
          T[3] * child.xform[0] + T[4] * child.xform[3],
          T[3] * child.xform[1] + T[4] * child.xform[4],
          T[3] * child.xform[2] + T[4] * child.xform[5] + T[5],
        ],
        level > 0 ? level - 1 : 0,
      );
    }
  };

  walk(root, [1, 0, 0, 0, 1, 0], rootLevel);
  return { count: n, pos, code, type, cutLevel, visitedNodes: visited };
}

// ---------------------------------------------------------------------------
// Benchmark
// ---------------------------------------------------------------------------
if (isMainThread && process.argv[1] && process.argv[1].endsWith('lazy-gen.ts')) {
  const LEVEL = 9;
  console.log(`building lvl${LEVEL} system…`);
  let t0 = performance.now();
  const sys = buildSystem(family, LEVEL);
  const root = sys['Delta'];
  console.log(`buildSystem(${LEVEL}): ${(performance.now() - t0).toFixed(1)} ms`);

  t0 = performance.now();
  const rootBox = localBBox(root);
  console.log(
    `bbox cache warm-up: ${(performance.now() - t0).toFixed(1)} ms, root bbox ` +
      `[${rootBox.minX.toFixed(0)},${rootBox.minY.toFixed(0)}]..[${rootBox.maxX.toFixed(0)},${rootBox.maxY.toFixed(0)}]`,
  );

  const cx = (rootBox.minX + rootBox.maxX) / 2;
  const cy = (rootBox.minY + rootBox.maxY) / 2;
  const budget = 1_200_000;

  // Round-trip check: reconstruct every emitted transform from (pos, code)
  // and compare against the walk's true transform (leaf tiles only).
  {
    const view: View = { cx, cy, halfW: 157, halfH: 157 };
    const em = expand(root, LEVEL, view, budget);
    // recompute true transforms by a parallel expansion that emits raw affines
    const raw: Affine[] = [];
    const collect = (node: TileNode, T: Affine, level: number): void => {
      const b = localBBox(node);
      let ok = false;
      const corners = [
        [b.minX, b.minY],
        [b.maxX, b.minY],
        [b.minX, b.maxY],
        [b.maxX, b.maxY],
      ];
      let wMinX = Infinity;
      let wMinY = Infinity;
      let wMaxX = -Infinity;
      let wMaxY = -Infinity;
      for (const [px, py] of corners) {
        const x = T[0] * px + T[1] * py + T[2];
        const y = T[3] * px + T[4] * py + T[5];
        wMinX = Math.min(wMinX, x);
        wMinY = Math.min(wMinY, y);
        wMaxX = Math.max(wMaxX, x);
        wMaxY = Math.max(wMaxY, y);
      }
      ok = !(wMaxX < cx - 157 || wMinX > cx + 157 || wMaxY < cy - 157 || wMinY > cy + 157);
      if (!ok) return;
      if (node.kind === 'leaf') {
        raw.push(T);
        return;
      }
      for (const child of node.children) {
        collect(
          child.node,
          [
            T[0] * child.xform[0] + T[1] * child.xform[3],
            T[0] * child.xform[1] + T[1] * child.xform[4],
            T[0] * child.xform[2] + T[1] * child.xform[5] + T[2],
            T[3] * child.xform[0] + T[4] * child.xform[3],
            T[3] * child.xform[1] + T[4] * child.xform[4],
            T[3] * child.xform[2] + T[4] * child.xform[5] + T[5],
          ],
          level - 1,
        );
      }
    };
    collect(root, [1, 0, 0, 0, 1, 0], LEVEL);
    if (raw.length !== em.count) throw new Error(`roundtrip count ${raw.length} != ${em.count}`);
    let worst = 0;
    for (let i = 0; i < em.count; i++) {
      const k = em.code[i] & 15;
      const mir = em.code[i] & 16 ? -1 : 1;
      const c = Math.cos((k * Math.PI) / 6);
      const s = Math.sin((k * Math.PI) / 6);
      // R(theta) * S
      const rec: Affine = [c * mir, -s, em.pos[i * 2] + cx, s * mir, c, em.pos[i * 2 + 1] + cy];
      const t = raw[i];
      for (const [a, b2] of [
        [rec[0], t[0]],
        [rec[1], t[1]],
        [rec[2], t[2]],
        [rec[3], t[3]],
        [rec[4], t[4]],
        [rec[5], t[5]],
      ]) {
        worst = Math.max(worst, Math.abs(a - b2));
      }
    }
    if (worst > 1e-3) throw new Error(`transform round-trip max error ${worst}`);
    console.log(
      `transform round-trip check: ${em.count} instances, max |err| = ${worst.toExponential(2)} — OK`,
    );
  }

  const scenarios: { name: string; view: View }[] = [
    { name: 'deep zoom (~12k tiles)', view: { cx, cy, halfW: 157, halfH: 157 } },
    { name: 'mid zoom (~120k tiles)', view: { cx, cy, halfW: 500, halfH: 500 } },
    { name: 'wide zoom (~1M tiles)', view: { cx, cy, halfW: 1430, halfH: 1430 } },
    { name: 'huge zoom (~8M est -> LOD cut 1)', view: { cx, cy, halfW: 4050, halfH: 4050 } },
    { name: 'whole patch (~469M est -> deeper cut)', view: { cx, cy, halfW: 31000, halfH: 31000 } },
  ];

  console.log(`\n=== expansion benchmark (budget ${budget.toLocaleString('en-US')}) ===`);
  for (const s of scenarios) {
    // warm run then 3 timed runs
    expand(root, LEVEL, s.view, budget);
    const times: number[] = [];
    let em: Emission = null as never;
    for (let i = 0; i < 3; i++) {
      const t = performance.now();
      em = expand(root, LEVEL, s.view, budget);
      times.push(performance.now() - t);
    }
    const best = Math.min(...times);
    console.log(
      `${s.name}: cut lvl ${em.cutLevel}, ${em.count.toLocaleString('en-US')} instances, ` +
        `${best.toFixed(1)} ms best-of-3 (${Math.round(em.count / (best / 1000)).toLocaleString('en-US')} inst/s), ` +
        `${em.visitedNodes.toLocaleString('en-US')} nodes visited`,
    );
  }

  if (process.argv.includes('--emit')) {
    // Real lvl9 data for the WebGL page: a ~1.25M-tile viewport at cut level 0.
    const view: View = { cx, cy, halfW: 1600, halfH: 1600 };
    const em = expand(root, LEVEL, view, 4_000_000);
    const here = dirname(fileURLToPath(import.meta.url));
    const out = join(here, 'tiles.bin');
    const header = new Uint32Array([em.count]);
    const buf = Buffer.concat([
      Buffer.from(header.buffer),
      Buffer.from(em.pos.buffer, 0, em.count * 8),
      Buffer.from(em.code.buffer, 0, em.count),
      Buffer.from(em.type.buffer, 0, em.count),
    ]);
    writeFileSync(out, buf);
    console.log(`\nwrote ${out}: ${em.count.toLocaleString('en-US')} instances, ${(buf.length / 1e6).toFixed(1)} MB`);
  }
}
