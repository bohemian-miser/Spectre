/**
 * Un-rooted engine verification (unrooted.ts) — BIGMAP stage 1 acceptance.
 *
 *  1. EQUIVALENCE: expanding an un-rooted viewport that lies inside a known
 *     level-k ancestor patch reproduces buildSystem/flatten's tiles exactly
 *     (matched on EXACT integer transform keys — stronger than any float
 *     tolerance), for multiple seeds, window positions, windows straddling
 *     supertile boundaries, and both mirror parities (k = 4 and 5).
 *  2. FLAVOURS: every aggregate/leaf type equals the oracle's node type at
 *     every cut level; the typed chain leaves zero ambiguity (every parent
 *     step is re-checked against SUPER_RULES).
 *  3. DETERMINISM: same seed + camera => byte-identical buffers and ids,
 *     across engine instances, after panning far away and back, and when the
 *     DFS descends from a higher ancestor (growth stability).
 *  4. EXACTNESS: shared vertices/edges of neighbouring tiles weld on
 *     bit-identical integer keys at depth 18, across supertile boundaries,
 *     where the float pipeline demonstrably drifts.
 */
import { describe, expect, it } from 'vitest';
import { mul, transPt, type Affine, type Pt } from '../geom';
import { LEAF_ORDER, TILE_NAMES, leafPts, type TileTypeId } from '../families';
import { SUPER_RULES, buildSystem, type TileNode } from '../tiles';
import {
  Z_IDENT,
  zAffineEq,
  zAffineKey,
  zApply,
  zGamma2Xform,
  zKey,
  zMul,
  zSpectrePts,
  zSupertileTransforms,
  zToAffine,
  type ZAffine,
} from '../exact';
import {
  AGGREGATE_TYPE_BASE,
  SPECTRE_TILE_AREA,
  SUBSTITUTION_GROWTH,
  createUnrootedEngine,
  decodeInstanceCode,
  instanceAffine,
  instanceExactAffine,
  instanceTypeId,
  isAggregateType,
  runUnrootedQuery,
  stationaryTypeDistribution,
  unrootedEngineFor,
  UNROOTED_MAX_LEVEL,
  type UnrootedEngine,
  type ViewRect,
  type ViewportCut,
} from '../unrooted';

// ---------------------------------------------------------------------------
// Oracle helpers
// ---------------------------------------------------------------------------

interface OracleInst {
  readonly type: TileTypeId;
  readonly level: number; // 0 = leaf
  readonly path: string;
  readonly firstSlot: number;
  readonly node: TileNode;
  readonly zx: ZAffine; // exact transform (root-local until re-based)
  readonly fx: Affine; // float transform via core's own composition
}

/** All nodes at `cutLevel` (leaves when 0) of a level-k system, both pipelines. */
function oracleNodes(rootType: TileTypeId, k: number, cutLevel: number): OracleInst[] {
  const sys = buildSystem('spectre', k);
  const out: OracleInst[] = [];
  const walk = (
    node: TileNode,
    level: number,
    zx: ZAffine,
    fx: Affine,
    path: string,
    firstSlot: number,
  ): void => {
    const atCut = cutLevel > 0 && level <= cutLevel;
    if (node.kind === 'leaf' || atCut) {
      out.push({ type: node.type, level, path, firstSlot, node, zx, fx });
      return;
    }
    for (const child of node.children) {
      const zchild =
        level >= 1
          ? zSupertileTransforms(level)[child.pos]
          : child.pos === 0
            ? Z_IDENT
            : zGamma2Xform();
      if (level >= 1) {
        // flavour check: the typed hierarchy admits zero ambiguity
        expect(SUPER_RULES[node.type][child.pos]).toBe(child.node.type);
      }
      walk(
        child.node,
        level >= 1 ? level - 1 : 0,
        zMul(zx, zchild),
        mul(fx, child.xform),
        path === '' ? String(child.pos) : `${path}.${child.pos}`,
        firstSlot < 0 ? child.pos : firstSlot,
      );
    }
  };
  walk(sys[rootType], k, Z_IDENT, [1, 0, 0, 0, 1, 0], '', -1);
  return out;
}

interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * The engine's recursive node-local bbox, replicated bit-for-bit (leaf: bbox
 * of leafPts; meta: union of corner-transformed child boxes over the SAME
 * shared DAG nodes) so the oracle-side cull predicate matches the engine's.
 */
const nodeBoxCache = new WeakMap<TileNode, Box>();

function nodeLocalBBox(node: TileNode): Box {
  const hit = nodeBoxCache.get(node);
  if (hit) return hit;
  const box: Box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  if (node.kind === 'leaf') {
    for (const p of leafPts('spectre', node.type)) {
      box.minX = Math.min(box.minX, p.x);
      box.minY = Math.min(box.minY, p.y);
      box.maxX = Math.max(box.maxX, p.x);
      box.maxY = Math.max(box.maxY, p.y);
    }
  } else {
    for (const child of node.children) {
      const b = nodeLocalBBox(child.node);
      const T = child.xform;
      for (const [cx, cy] of [
        [b.minX, b.minY],
        [b.maxX, b.minY],
        [b.minX, b.maxY],
        [b.maxX, b.maxY],
      ]) {
        const x = T[0] * cx + T[1] * cy + T[2];
        const y = T[3] * cx + T[4] * cy + T[5];
        box.minX = Math.min(box.minX, x);
        box.minY = Math.min(box.minY, y);
        box.maxX = Math.max(box.maxX, x);
        box.maxY = Math.max(box.maxY, y);
      }
    }
  }
  nodeBoxCache.set(node, box);
  return box;
}

function worldBBox(node: TileNode, xf: Affine): Box {
  const b = nodeLocalBBox(node);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [px, py] of [
    [b.minX, b.minY],
    [b.maxX, b.minY],
    [b.minX, b.maxY],
    [b.maxX, b.maxY],
  ]) {
    const w = transPt(xf, { x: px, y: py });
    minX = Math.min(minX, w.x);
    minY = Math.min(minY, w.y);
    maxX = Math.max(maxX, w.x);
    maxY = Math.max(maxY, w.y);
  }
  return { minX, minY, maxX, maxY };
}

function intersects(b: Box, v: ViewRect): boolean {
  return !(
    b.maxX < v.cx - v.halfW ||
    b.minX > v.cx + v.halfW ||
    b.maxY < v.cy - v.halfH ||
    b.minY > v.cy + v.halfH
  );
}

/** type + exact transform — the strongest possible instance identity. */
function exactInstanceKey(type: TileTypeId, zx: ZAffine): string {
  return `${type}|${zAffineKey(zx)}`;
}

function engineExactKeys(cut: ViewportCut): Map<string, number> {
  const map = new Map<string, number>();
  if (!cut.exact) throw new Error('emitExact required');
  for (let i = 0; i < cut.count; i++) {
    const za = instanceExactAffine(cut.code[i], cut.exact, i);
    map.set(exactInstanceKey(instanceTypeId(cut.type[i]), za), i);
  }
  return map;
}

function bufferFingerprint(cut: ViewportCut): string {
  return [
    cut.count,
    cut.cutLevel,
    Array.from(cut.pos).join(','),
    Array.from(cut.code).join(','),
    Array.from(cut.type).join(','),
  ].join(';');
}

// ---------------------------------------------------------------------------

describe('stationary type distribution', () => {
  it('is a probability vector and a substitution fixed point', () => {
    const freq = stationaryTypeDistribution();
    let sum = 0;
    for (const t of TILE_NAMES) {
      expect(freq[t]).toBeGreaterThan(0);
      sum += freq[t];
    }
    expect(sum).toBeCloseTo(1, 12);
    const next = new Map<string, number>(TILE_NAMES.map((t) => [t, 0]));
    for (const parent of TILE_NAMES) {
      for (const child of SUPER_RULES[parent]) {
        if (child === 'null') continue;
        next.set(child, (next.get(child) ?? 0) + freq[parent]);
      }
    }
    let total = 0;
    for (const v of next.values()) total += v;
    for (const t of TILE_NAMES) {
      expect((next.get(t) ?? 0) / total).toBeCloseTo(freq[t], 12);
    }
  });

  it('matches the empirical metatile frequencies of a level-8 patch', () => {
    const freq = stationaryTypeDistribution();
    const memo = new Map<TileNode, Map<string, number>>();
    const countTypes = (node: TileNode, level: number): Map<string, number> => {
      const hit = memo.get(node);
      if (hit) return hit;
      const out = new Map<string, number>();
      if (level === 0) {
        out.set(node.type, 1);
      } else {
        if (node.kind !== 'meta') throw new Error('leaf above level 0');
        for (const ch of node.children) {
          for (const [t, c] of countTypes(ch.node, level - 1)) {
            out.set(t, (out.get(t) ?? 0) + c);
          }
        }
      }
      memo.set(node, out);
      return out;
    };
    const counts = countTypes(buildSystem('spectre', 8)['Delta'], 8);
    let total = 0;
    for (const c of counts.values()) total += c;
    for (const t of TILE_NAMES) {
      expect(Math.abs((counts.get(t) ?? 0) / total - freq[t])).toBeLessThan(2e-4);
    }
  });
});

describe('ancestor chain', () => {
  it('is deterministic per seed and prefix-stable under extension', () => {
    for (const seed of [1, 7, 42, 0xc0ffee]) {
      const a = createUnrootedEngine(seed);
      const b = createUnrootedEngine(seed);
      a.ensureLevel(12);
      b.ensureLevel(5);
      expect(b.chain()).toEqual(a.chain().slice(0, 5));
      b.ensureLevel(12);
      expect(b.chain()).toEqual(a.chain());
      expect(b.anchorType()).toBe(a.anchorType());
    }
  });

  it('every step is legal: SUPER_RULES[parent][slot] equals the child type', () => {
    const eng = createUnrootedEngine(42);
    eng.ensureLevel(16);
    let childType: TileTypeId = eng.anchorType();
    for (const step of eng.chain()) {
      expect(SUPER_RULES[step.parentType][step.slot]).toBe(childType);
      childType = step.parentType;
    }
  });

  it('anchor stays interior: distance to the top bbox boundary grows', () => {
    for (const seed of [1, 7, 42]) {
      const eng = createUnrootedEngine(seed);
      let prev = 0;
      for (const level of [4, 8, 12]) {
        const wb = eng.ancestorWorldBounds(level);
        const d = Math.min(-wb.min.x, -wb.min.y, wb.max.x, wb.max.y);
        expect(d, `seed ${seed} level ${level}`).toBeGreaterThan(prev);
        prev = d;
      }
    }
  });

  it('refuses to grow past UNROOTED_MAX_LEVEL', () => {
    const eng = createUnrootedEngine(3);
    expect(() => eng.ensureLevel(UNROOTED_MAX_LEVEL + 1)).toThrow(/UNROOTED_MAX_LEVEL/);
  });
});

// ---------------------------------------------------------------------------
// EQUIVALENCE vs the buildSystem/flatten oracle
// ---------------------------------------------------------------------------

describe('equivalence with the rooted oracle', () => {
  const SEEDS = [1, 7, 42];

  for (const k of [4, 5]) {
    it(`level-${k} ancestor patches reproduce buildSystem exactly (${k % 2 ? 'odd' : 'even'} parity)`, () => {
      for (const seed of SEEDS) {
        const eng = createUnrootedEngine(seed);
        const rootType = eng.ancestorType(k);
        const W = eng.ancestorWorldXform(k);
        const Wf = zToAffine(W);
        const oracle = oracleNodes(rootType, k, 0).map((o) => ({
          ...o,
          zx: zMul(W, o.zx),
          fx: mul(Wf, o.fx),
        }));
        // exact identity of every tile of the whole level-k patch
        const fullKeys = new Set(oracle.map((o) => exactInstanceKey(o.type, o.zx)));

        const wb = eng.ancestorWorldBounds(k);
        const cx = (wb.min.x + wb.max.x) / 2;
        const cy = (wb.min.y + wb.max.y) / 2;
        const ex = (wb.max.x - wb.min.x) / 2;
        const ey = (wb.max.y - wb.min.y) / 2;

        let compared = 0;
        let straddling = 0;
        for (const [ox, oy] of [
          [0, 0],
          [-0.23, -0.17],
          [0.23, -0.17],
          [-0.17, 0.23],
          [0.19, 0.21],
          [-0.1, -0.28],
          [0.05, 0.3],
          [-0.3, 0.05],
          [0.28, 0.12],
        ]) {
          const view: ViewRect = {
            cx: cx + ox * ex,
            cy: cy + oy * ey,
            halfW: 11.5,
            halfH: 11.5,
          };
          const cut = eng.query(view, 1_000_000, { emitExact: true, emitIds: true });
          expect(cut.cutLevel).toBe(0);
          expect(cut.truncated).toBe(false);
          const engKeys = engineExactKeys(cut);

          // The engine expands the INFINITE tiling: if the window pokes out of
          // the level-k patch it legitimately contains tiles the rooted oracle
          // cannot know about. Exact keys detect that case precisely — only
          // windows fully interior to the patch are comparable.
          let interior = true;
          for (const key of engKeys.keys()) {
            if (!fullKeys.has(key)) {
              interior = false;
              break;
            }
          }
          if (!interior) continue;
          compared++;

          const expected = oracle.filter((o) => intersects(worldBBox(o.node, o.fx), view));

          // exact one-to-one match: same tiles, same types, same transforms
          expect(cut.count, `count (seed ${seed}, k ${k}, offset ${ox},${oy})`).toBe(
            expected.length,
          );
          const firstSlots = new Set<number>();
          let maxFloatErr = 0;
          for (const o of expected) {
            const idx = engKeys.get(exactInstanceKey(o.type, o.zx));
            expect(idx, `missing ${o.type} at path ${o.path} (seed ${seed}, k ${k})`).toBeDefined();
            firstSlots.add(o.firstSlot);
            // float projections of both pipelines agree
            const fa = instanceAffine(
              cut.pos[(idx as number) * 2] + cut.origin.x,
              cut.pos[(idx as number) * 2 + 1] + cut.origin.y,
              cut.code[idx as number],
            );
            for (let j = 0; j < 6; ++j) {
              maxFloatErr = Math.max(maxFloatErr, Math.abs(fa[j] - o.fx[j]));
            }
          }
          expect(maxFloatErr).toBeLessThan(1e-3); // f32 wire quantization dominates
          if (firstSlots.size > 1) straddling++;

          // chirality invariant: leaves are never mirrored in world frame
          for (let i = 0; i < cut.count; i++) {
            expect(decodeInstanceCode(cut.code[i]).mirrored).toBe(false);
            expect(isAggregateType(cut.type[i])).toBe(false);
          }
        }
        // enough interior windows compared, incl. supertile-boundary straddles
        expect(compared, `interior windows (seed ${seed}, k ${k})`).toBeGreaterThanOrEqual(2);
        expect(straddling, `straddling windows (seed ${seed}, k ${k})`).toBeGreaterThan(0);
      }
    });
  }

  it('reproduces the Gamma (Mystic) pair exactly wherever it appears', () => {
    const eng = createUnrootedEngine(7);
    const k = 4;
    const rootType = eng.ancestorType(k);
    const W = eng.ancestorWorldXform(k);
    const oracle = oracleNodes(rootType, k, 0);
    const pair = oracle.find((o) => o.type === 'Gamma2');
    expect(pair).toBeDefined();
    const g2 = zMul(W, (pair as OracleInst).zx);
    const world = zToAffine(g2);
    const view: ViewRect = { cx: world[2], cy: world[5], halfW: 6, halfH: 6 };
    const cut = eng.query(view, 100_000, { emitExact: true });
    const keys = engineExactKeys(cut);
    expect(keys.has(exactInstanceKey('Gamma2', g2))).toBe(true);
    const types = new Set<TileTypeId>();
    for (let i = 0; i < cut.count; i++) types.add(instanceTypeId(cut.type[i]));
    expect(types.has('Gamma1')).toBe(true);
    expect(types.has('Gamma2')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// FLAVOURS at every level of the LOD cut
// ---------------------------------------------------------------------------

describe('LOD cut aggregates', () => {
  it('aggregate flavours and transforms match the oracle at cut levels 1..3', () => {
    const eng = createUnrootedEngine(42);
    const k = 5;
    const rootType = eng.ancestorType(k);
    const W = eng.ancestorWorldXform(k);
    const Wf = zToAffine(W);
    const wb = eng.ancestorWorldBounds(k);
    const cx = (wb.min.x + wb.max.x) / 2;
    const cy = (wb.min.y + wb.max.y) / 2;

    for (const cutLevel of [1, 2, 3]) {
      const halfW = 120;
      const est = (4 * halfW * halfW) / SPECTRE_TILE_AREA;
      // budget in [est/G^c, est/G^(c-1)) forces the cut to exactly c
      const budget = Math.ceil(est / SUBSTITUTION_GROWTH ** cutLevel) + 1;
      const view: ViewRect = { cx, cy, halfW, halfH: halfW };
      // descend from A_k itself: the engine then emits exactly the oracle's
      // subtree, so aggregate flavours/transforms compare one-to-one even
      // where foreign aggregates' bboxes would otherwise reach the window
      // (completeness of the default descent is covered by the equivalence
      // and growth-stability tests)
      const cut = eng.query(view, budget, { emitExact: true, ancestorLevel: k });
      expect(cut.cutLevel).toBe(cutLevel);

      const oracle = oracleNodes(rootType, k, cutLevel)
        .map((o) => ({ ...o, zx: zMul(W, o.zx), fx: mul(Wf, o.fx) }))
        .filter((o) => intersects(worldBBox(o.node, o.fx), view));

      expect(cut.count).toBe(oracle.length);
      const engKeys = engineExactKeys(cut);
      for (const o of oracle) {
        expect(o.level).toBe(cutLevel);
        expect(
          engKeys.has(exactInstanceKey(o.type, o.zx)),
          `aggregate ${o.type}@${o.path} missing at cut ${cutLevel}`,
        ).toBe(true);
      }
      for (let i = 0; i < cut.count; i++) {
        expect(isAggregateType(cut.type[i])).toBe(true);
        expect(cut.type[i]).toBeGreaterThanOrEqual(AGGREGATE_TYPE_BASE);
        // aggregate mirror parity is exactly cutLevel & 1
        expect(decodeInstanceCode(cut.code[i]).mirrored).toBe((cutLevel & 1) === 1);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// DETERMINISM
// ---------------------------------------------------------------------------

describe('determinism', () => {
  const view: ViewRect = { cx: 40, cy: -25, halfW: 30, halfH: 30 };

  it('same seed + camera => byte-identical buffers and ids, across engines', () => {
    const a = createUnrootedEngine(1234).query(view, 500_000, { emitIds: true });
    const b = createUnrootedEngine(1234).query(view, 500_000, { emitIds: true });
    expect(bufferFingerprint(a)).toBe(bufferFingerprint(b));
    expect(a.ids).toEqual(b.ids);
    expect(a.count).toBeGreaterThan(100);
  });

  it('panning far away and back reproduces identical buffers and ids', () => {
    const eng = createUnrootedEngine(1234);
    const before = eng.query(view, 500_000, { emitIds: true });
    const topBefore = eng.topLevel();
    const far = eng.query({ cx: 2.5e5, cy: -1.9e5, halfW: 200, halfH: 200 }, 500_000);
    expect(far.count).toBeGreaterThan(0);
    expect(eng.topLevel()).toBeGreaterThan(topBefore);
    const after = eng.query(view, 500_000, { emitIds: true });
    expect(bufferFingerprint(after)).toBe(bufferFingerprint(before));
    expect(after.ids).toEqual(before.ids);
  });

  it('emitted tile set is stable when the DFS starts from a higher ancestor', () => {
    for (const seed of [1, 7, 42]) {
      const eng = createUnrootedEngine(seed);
      const v: ViewRect = { cx: -60, cy: 35, halfW: 25, halfH: 25 };
      const base = eng.query(v, 500_000, { emitExact: true });
      eng.ensureLevel(Math.min(UNROOTED_MAX_LEVEL, base.ancestorLevel + 3));
      const higher = eng.query(v, 500_000, {
        emitExact: true,
        ancestorLevel: base.ancestorLevel + 3,
      });
      expect(higher.count, `seed ${seed}`).toBe(base.count);
      const keysA = [...engineExactKeys(base).keys()].sort();
      const keysB = [...engineExactKeys(higher).keys()].sort();
      expect(keysB).toEqual(keysA);
    }
  });

  it('ids are unique, seed-relative and stable across overlapping windows', () => {
    const eng = createUnrootedEngine(99);
    const q1 = eng.query({ cx: 0, cy: 0, halfW: 18, halfH: 18 }, 100_000, {
      emitIds: true,
      emitExact: true,
    });
    const q2 = eng.query({ cx: 9, cy: 6, halfW: 18, halfH: 18 }, 100_000, {
      emitIds: true,
      emitExact: true,
    });
    expect(new Set(q1.ids).size).toBe(q1.count);
    const byKey = new Map<string, string>();
    for (const [key, idx] of engineExactKeys(q1)) byKey.set(key, (q1.ids as string[])[idx]);
    let shared = 0;
    for (const [key, idx] of engineExactKeys(q2)) {
      const id1 = byKey.get(key);
      if (id1 !== undefined) {
        expect((q2.ids as string[])[idx]).toBe(id1);
        shared++;
      }
    }
    expect(shared).toBeGreaterThan(50);
    // the window around the origin contains the anchor tile itself (id base 0)
    expect((q1.ids as string[]).some((id) => id.startsWith('0:'))).toBe(true);
  });

  it('runUnrootedQuery is deterministic through the shared engine cache', () => {
    const req = {
      id: 5,
      seed: 271828,
      view: { cx: 10, cy: 12, halfW: 20, halfH: 15 },
      budget: 50_000,
      emitIds: true,
    };
    const a = runUnrootedQuery(req);
    const b = runUnrootedQuery({ ...req, id: 6 });
    expect(a.id).toBe(5);
    expect(b.id).toBe(6);
    expect(a.seed).toBe(271828 >>> 0);
    expect(unrootedEngineFor(271828)).toBe(unrootedEngineFor(271828));
    expect(bufferFingerprint(a.cut)).toBe(bufferFingerprint(b.cut));
    expect(a.cut.ids).toEqual(b.cut.ids);
  });
});

// ---------------------------------------------------------------------------
// EXACTNESS: integer welds across supertile boundaries at depth
// ---------------------------------------------------------------------------

interface WeldStats {
  readonly cut: ViewportCut;
  readonly welded: number;
  /** earliest id-path position at which some welded pair diverges (Infinity if none). */
  readonly minSplit: number;
}

/**
 * Exact-weld audit of a cut-0 window: every physical edge must be owned by at
 * most 2 tiles, and welded edges match on bit-identical integer keys.
 */
function edgeWeldStats(eng: UnrootedEngine, view: ViewRect): WeldStats {
  const cut = eng.query(view, 500_000, { emitExact: true, emitIds: true });
  expect(cut.cutLevel).toBe(0);
  expect(cut.count).toBeGreaterThan(8);
  const zpts = zSpectrePts();

  const edgeOwners = new Map<string, number[]>();
  for (let i = 0; i < cut.count; i++) {
    const T = instanceExactAffine(cut.code[i], cut.exact as Float64Array, i);
    const vkeys = zpts.map((p) => zKey(zApply(T, p)));
    for (let e = 0; e < vkeys.length; e++) {
      const a = vkeys[e];
      const b = vkeys[(e + 1) % vkeys.length];
      const ekey = a < b ? `${a}~${b}` : `${b}~${a}`;
      const owners = edgeOwners.get(ekey);
      if (owners) owners.push(i);
      else edgeOwners.set(ekey, [i]);
    }
  }

  const splitPos = (idA: string, idB: string): number => {
    if (idA === idB) return Infinity;
    const [baseA, pathA = ''] = idA.split(':');
    const [baseB, pathB = ''] = idB.split(':');
    if (baseA !== baseB) return 0; // different divergence ancestors
    const segA = pathA === '' ? [] : pathA.split('.');
    const segB = pathB === '' ? [] : pathB.split('.');
    for (let i = 0; i < Math.max(segA.length, segB.length); i++) {
      if (segA[i] !== segB[i]) return i;
    }
    return Infinity;
  };

  let welded = 0;
  let minSplit = Infinity;
  for (const [, owners] of edgeOwners) {
    expect(owners.length).toBeLessThanOrEqual(2);
    if (owners.length === 2) {
      welded++;
      const idA = (cut.ids as string[])[owners[0]];
      const idB = (cut.ids as string[])[owners[1]];
      minSplit = Math.min(minSplit, splitPos(idA, idB));
    }
  }
  expect(welded).toBeGreaterThan(cut.count); // dense interior welding (~7 edges/tile)
  return { cut, welded, minSplit };
}

describe('exact welds at depth (drift-free deep zoom)', () => {
  it('welds exactly at depth 18, across high-level supertile boundaries, where floats drift', () => {
    const eng = createUnrootedEngine(42);
    eng.ensureLevel(18);

    // Walk from the centre of A_17 towards the centre of its nearest sibling
    // inside A_18: somewhere along that segment a small window must contain
    // tiles on both sides of the level-17 supertile boundary (ids diverging
    // at the divergence ancestor or in their first path segment).
    const a17 = eng.ancestorWorldBounds(17);
    const c17: Pt = { x: (a17.min.x + a17.max.x) / 2, y: (a17.min.y + a17.max.y) / 2 };
    const chainSlot = eng.chain()[17 - 1].slot;
    const node18 = buildSystem('spectre', 18)[eng.ancestorType(18)];
    if (node18.kind !== 'meta') throw new Error('A_18 is not meta');
    const W18f = zToAffine(eng.ancestorWorldXform(18));
    let sibling: Pt | null = null;
    let siblingDist = Infinity;
    for (const child of node18.children) {
      if (child.pos === chainSlot) continue;
      const b = worldBBox(child.node, mul(W18f, child.xform));
      const c: Pt = { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
      const dist = Math.hypot(c.x - c17.x, c.y - c17.y);
      if (dist < siblingDist) {
        siblingDist = dist;
        sibling = c;
      }
    }
    expect(sibling).not.toBeNull();

    // Bisect along the segment from A_17's centre towards (and beyond) the
    // sibling, ending outside A_17's bbox so the far endpoint provably holds
    // tiles that diverge above level 17. Classify each sample window by
    // whether its tiles diverge from the chain at level <= 17 (inside A_17)
    // or above (outside); the crossing window contains both and welds across
    // the level-17 boundary.
    const halfDiag17 = Math.hypot(a17.max.x - a17.min.x, a17.max.y - a17.min.y) / 2;
    const dirLen = Math.hypot((sibling as Pt).x - c17.x, (sibling as Pt).y - c17.y);
    const target: Pt = {
      x: c17.x + (((sibling as Pt).x - c17.x) / dirLen) * 2.5 * halfDiag17,
      y: c17.y + (((sibling as Pt).y - c17.y) / dirLen) * 2.5 * halfDiag17,
    };
    const statsAt = (t: number): WeldStats => {
      const view: ViewRect = {
        cx: c17.x + (target.x - c17.x) * t,
        cy: c17.y + (target.y - c17.y) * t,
        halfW: 7,
        halfH: 7,
      };
      return edgeWeldStats(eng, view);
    };
    const sideOf = (stats: WeldStats): 'in' | 'out' | 'both' => {
      let hasIn = false;
      let hasOut = false;
      for (const id of stats.cut.ids as string[]) {
        if (Number(id.split(':')[0]) <= 17) hasIn = true;
        else hasOut = true;
      }
      return hasIn && hasOut ? 'both' : hasIn ? 'in' : 'out';
    };

    let best: WeldStats | null = null;
    let lo = 0;
    let hi = 1;
    const first = statsAt(lo);
    const last = statsAt(hi);
    expect(sideOf(first)).not.toBe('out');
    expect(sideOf(last)).not.toBe('in');
    if (sideOf(first) === 'both') best = first;
    if (!best && sideOf(last) === 'both') best = last;
    for (let iter = 0; iter < 48 && !best; iter++) {
      const mid = (lo + hi) / 2;
      const stats = statsAt(mid);
      const side = sideOf(stats);
      if (side === 'both') best = stats;
      else if (side === 'in') lo = mid;
      else hi = mid;
    }
    expect(best, 'bisection found no window straddling the level-17 boundary').not.toBeNull();
    expect((best as WeldStats).minSplit).toBeLessThanOrEqual(1);
    const { cut } = best as WeldStats;

    // float-drift witness: recompose each instance's transform the way the
    // float pipeline would — float child transforms multiplied down the path
    // from its id — and compare shared vertices: floats disagree bitwise at
    // this depth, while the exact keys welded above with integer equality.
    const chain = eng.chain();
    const floatOf = (id: string): Affine => {
      const [baseStr, pathStr = ''] = id.split(':');
      const base = Number(baseStr);
      let fx = zToAffine(eng.ancestorWorldXform(base));
      let level = base;
      let node: TileNode = buildSystem('spectre', base)[
        base === 0 ? eng.anchorType() : chain[base - 1].parentType
      ];
      const slots = pathStr === '' ? [] : pathStr.split('.').map(Number);
      for (const slot of slots) {
        if (node.kind !== 'meta') throw new Error('path descends below a leaf');
        const child = node.children.find((c) => c.pos === slot);
        if (!child) throw new Error(`bad slot ${slot} in id ${id}`);
        const zchild =
          level >= 1 ? zSupertileTransforms(level)[slot] : slot === 0 ? Z_IDENT : zGamma2Xform();
        fx = mul(fx, zToAffine(zchild));
        node = child.node;
        level = level >= 1 ? level - 1 : 0;
      }
      return fx;
    };

    const zpts = zSpectrePts();
    const spectreFloat = leafPts('spectre', 'Delta');
    const floatByVertex = new Map<string, Pt[]>();
    for (let i = 0; i < cut.count; i++) {
      const T = instanceExactAffine(cut.code[i], cut.exact as Float64Array, i);
      const F = floatOf((cut.ids as string[])[i]);
      zpts.forEach((p, j) => {
        const key = zKey(zApply(T, p));
        const fv = transPt(F, spectreFloat[j]);
        const list = floatByVertex.get(key);
        if (list) list.push(fv);
        else floatByVertex.set(key, [fv]);
      });
    }
    let maxSpread = 0;
    let sharedVertices = 0;
    for (const [, list] of floatByVertex) {
      if (list.length < 2) continue;
      sharedVertices++;
      for (const p of list) {
        maxSpread = Math.max(maxSpread, Math.abs(p.x - list[0].x), Math.abs(p.y - list[0].y));
      }
    }
    expect(sharedVertices).toBeGreaterThan(cut.count);
    // the float pipeline scatters "the same" vertex — bitwise weld keys are
    // impossible for floats at depth...
    expect(maxSpread).toBeGreaterThan(0);
    // ...but the drift is small enough that these really are the same
    // vertices (sanity on the weld itself)
    expect(maxSpread).toBeLessThan(1e-3);
  });

  it('welds exactly near the anchor too', () => {
    const eng = createUnrootedEngine(7);
    const stats = edgeWeldStats(eng, { cx: 3, cy: -2, halfW: 8, halfH: 8 });
    expect(stats.minSplit).toBeLessThan(Infinity); // straddles some boundary
  });
});

// ---------------------------------------------------------------------------
// LOD policy + wire format
// ---------------------------------------------------------------------------

describe('viewport LOD policy and wire format', () => {
  it('cut level rises with view size and instances stay within budget slack', () => {
    const eng = createUnrootedEngine(1);
    let prevCut = -1;
    for (const halfW of [40, 400, 1600, 4000]) {
      const cut = eng.query({ cx: 0, cy: 0, halfW, halfH: halfW }, 150_000);
      expect(cut.cutLevel).toBeGreaterThanOrEqual(prevCut);
      prevCut = cut.cutLevel;
      expect(cut.truncated).toBe(false);
      expect(cut.count).toBeLessThanOrEqual(2 * 150_000 + 1024);
      if (cut.cutLevel > 0) {
        for (let i = 0; i < cut.count; i++) expect(isAggregateType(cut.type[i])).toBe(true);
      }
    }
    expect(prevCut).toBeGreaterThan(0);
  });

  it('wire codec round-trips: the 10-byte fields reconstruct the true transform', () => {
    const eng = createUnrootedEngine(1);
    for (const [halfW, budget] of [
      [30, 100_000], // leaves at cut 0
      [1200, 90_000], // aggregates at cut >= 1
    ]) {
      const cut = eng.query({ cx: 5, cy: 5, halfW, halfH: halfW }, budget, { emitExact: true });
      expect(cut.count).toBeGreaterThan(0);
      let maxErr = 0;
      for (let i = 0; i < cut.count; i++) {
        const za = instanceExactAffine(cut.code[i], cut.exact as Float64Array, i);
        const truth = zToAffine(za);
        const rec = instanceAffine(
          cut.pos[i * 2] + cut.origin.x,
          cut.pos[i * 2 + 1] + cut.origin.y,
          cut.code[i],
        );
        for (let j = 0; j < 6; ++j) maxErr = Math.max(maxErr, Math.abs(rec[j] - truth[j]));
      }
      // linear part is table-exact; translation error is the f32 quantization
      // of view-relative coordinates only
      expect(maxErr).toBeLessThan(halfW <= 30 ? 1e-4 : 1e-2);
    }
  });

  it('type bytes decode to TileTypeIds for leaves and aggregates', () => {
    for (let i = 0; i < LEAF_ORDER.length; i++) expect(instanceTypeId(i)).toBe(LEAF_ORDER[i]);
    for (let i = 0; i < TILE_NAMES.length; i++) {
      expect(instanceTypeId(AGGREGATE_TYPE_BASE + i)).toBe(TILE_NAMES[i]);
    }
  });

  it('rejects invalid budgets', () => {
    const eng = createUnrootedEngine(1);
    expect(() => eng.query({ cx: 0, cy: 0, halfW: 10, halfH: 10 }, 0)).toThrow(/budget/);
  });

  it('leaves no hole in a far view whose chain climbs past several dead levels', () => {
    // Regression: seed 1 at z=0.02 held the same probe count from ancestor 13
    // through 18 (each new ancestor extended away from the view) and only
    // gained the missing subtree at 19. Count stability alone accepted level
    // 13 and the map rendered a large empty wedge; the occupancy grid in the
    // stabilization loop is what rejects it.
    const eng = createUnrootedEngine(1);
    const view = { cx: 0, cy: 0, halfW: 32_000, halfH: 15_000 };
    const q = eng.query(view, 200_000);

    const CELL = 500;
    const nx = Math.ceil((2 * view.halfW) / CELL);
    const ny = Math.ceil((2 * view.halfH) / CELL);
    const grid = new Uint8Array(nx * ny);
    for (let i = 0; i < q.count; ++i) {
      const gx = Math.floor((q.pos[i * 2] + q.origin.x - (view.cx - view.halfW)) / CELL);
      const gy = Math.floor((q.pos[i * 2 + 1] + q.origin.y - (view.cy - view.halfH)) / CELL);
      if (gx >= 0 && gx < nx && gy >= 0 && gy < ny) grid[gy * nx + gx] = 1;
    }
    const empty = grid.reduce((n, v) => (v === 0 ? n + 1 : n), 0);
    expect(empty).toBe(0);
    expect(q.ancestorLevel).toBeGreaterThanOrEqual(19);
  });

  it('a tile emitted by two different queries is exactly the same tile', () => {
    const eng = createUnrootedEngine(5);
    const a = eng.query({ cx: 0, cy: 0, halfW: 10, halfH: 10 }, 10_000, { emitExact: true });
    const b = eng.query({ cx: 4, cy: 3, halfW: 10, halfH: 10 }, 10_000, { emitExact: true });
    const ka = engineExactKeys(a);
    const kb = engineExactKeys(b);
    let common = 0;
    for (const [key, ia] of ka) {
      const ib = kb.get(key);
      if (ib === undefined) continue;
      common++;
      const za = instanceExactAffine(a.code[ia], a.exact as Float64Array, ia);
      const zb = instanceExactAffine(b.code[ib], b.exact as Float64Array, ib);
      expect(zAffineEq(za, zb)).toBe(true);
    }
    expect(common).toBeGreaterThan(10);
  });
});

describe('viewport coverage regression (measured holes)', () => {
  // These exact (seed, rect) pairs shipped incomplete cuts: the count
  // plateaued for 4 ancestor levels while the coarse occupancy probe's AABBs
  // papered over a ~20-40 tile hole INSIDE the requested rect (a sibling
  // supertile poking into the view that only a higher descent finds). A cut
  // must emit the same leaf set a descent from far above finds.
  const CASES = [
    { seed: 99, view: { cx: -6.65, cy: 9.13, halfW: 20, halfH: 13.33 } },
    { seed: 20260827, view: { cx: 17.66, cy: -18.63, halfW: 20, halfH: 13.33 } },
    { seed: 99, view: { cx: 18.96, cy: -22.96, halfW: 20, halfH: 13.33 } },
  ];

  it('emits the complete leaf set for rects that used to come up short', () => {
    for (const c of CASES) {
      const engine = createUnrootedEngine(c.seed);
      const cut = engine.query(c.view, 100_000);
      expect(cut.cutLevel).toBe(0);
      expect(cut.truncated).toBe(false);
      const deep = engine.query(c.view, 100_000, {
        ancestorLevel: Math.min(cut.ancestorLevel + 6, UNROOTED_MAX_LEVEL),
      });
      expect(cut.count).toBe(deep.count);
    }
  });
});
