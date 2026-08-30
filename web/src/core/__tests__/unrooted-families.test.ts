/**
 * The un-rooted engine across ALL tile families (hex, hat, turtle — spectre
 * rides along as the control).
 *
 * The engine shares one substitution combinatorics across families; what
 * changes is the leaf geometry, the exact base quad, and the base Gamma pair
 * (absent for hex). These tests pin the family-dependent facts:
 *
 *  1. exact equivalence with the family's own rooted oracle (buildSystem) on
 *     integer transform keys, hex's single-leaf Gamma included;
 *  2. the wire contract: leaf type bytes index `leafOrder(family)`, leaves
 *     are never mirrored, aggregates carry parity `cutLevel & 1`;
 *  3. determinism and growth stability per (family, seed), and independence
 *     of the engines two families share a seed with;
 *  4. exact vertex welds: neighbouring tiles of a cut share Z[zeta12] vertex
 *     keys (the tiling actually fits together, hat/turtle Gamma2 shape swap
 *     included).
 */
import { describe, expect, it } from 'vitest';
import { FAMILIES, leafOrder, leafPts, type TileFamilyId } from '../families';
import { SUPER_RULES, buildSystem, countTiles, type TileNode } from '../tiles';
import {
  Z_IDENT,
  zAffineKey,
  zApply,
  zBasePairXform,
  zKey,
  zLeafPts,
  zMul,
  zSupertileTransforms,
  type ZAffine,
} from '../exact';
import {
  AGGREGATE_TYPE_BASE,
  SPECTRE_TILE_AREA,
  averageLeafArea,
  createUnrootedEngine,
  decodeInstanceCode,
  instanceExactAffine,
  instanceTypeId,
  runUnrootedQuery,
  unrootedEngineFor,
  type ViewRect,
} from '../unrooted';

const VIEW: ViewRect = { cx: 0, cy: 0, halfW: 24, halfH: 16 };
const NON_SPECTRE: readonly TileFamilyId[] = ['hex', 'hat', 'turtle'];

/**
 * Every leaf of the ancestor patch at `level`, as exact transform keys — the
 * family-aware rooted oracle (the spectre-only twin lives in unrooted.test.ts).
 */
function oracleLeafKeys(family: TileFamilyId, engine: ReturnType<typeof createUnrootedEngine>, level: number): Map<string, string> {
  const sys = buildSystem(family, level);
  const type = engine.ancestorType(level);
  const world = engine.ancestorWorldXform(level);
  const out = new Map<string, string>();
  const walk = (node: TileNode, lvl: number, zx: ZAffine): void => {
    if (node.kind === 'leaf') {
      out.set(zAffineKey(zx), node.type);
      return;
    }
    for (const child of node.children) {
      const zchild =
        lvl >= 1
          ? zSupertileTransforms(family, lvl)[child.pos]
          : child.pos === 0
            ? Z_IDENT
            : (zBasePairXform(family) as ZAffine);
      walk(child.node, lvl >= 1 ? lvl - 1 : 0, zMul(zx, zchild));
    }
  };
  walk(sys[type], level, world);
  return out;
}

describe.each(NON_SPECTRE)('un-rooted %s engine', (family) => {
  it('reproduces its own rooted oracle exactly at level 3 (integer keys)', () => {
    const engine = createUnrootedEngine(7, family);
    engine.ensureLevel(3);
    const oracle = oracleLeafKeys(family, engine, 3);
    const bounds = engine.ancestorWorldBounds(3);
    const view: ViewRect = {
      cx: (bounds.min.x + bounds.max.x) / 2,
      cy: (bounds.min.y + bounds.max.y) / 2,
      halfW: (bounds.max.x - bounds.min.x) / 2 + 4,
      halfH: (bounds.max.y - bounds.min.y) / 2 + 4,
    };
    const cut = engine.query(view, 1_000_000, { emitExact: true, ancestorLevel: 3 });
    expect(cut.cutLevel).toBe(0);
    expect(cut.count).toBe(oracle.size);
    const order = leafOrder(family);
    for (let i = 0; i < cut.count; i++) {
      const T = instanceExactAffine(cut.code[i], cut.exact as Float64Array, i);
      const want = oracle.get(zAffineKey(T));
      expect(want, `instance ${i} transform not in the oracle`).toBeDefined();
      expect(order[cut.type[i]]).toBe(want);
    }
  });

  it('emits valid wire bytes: leaf types in leafOrder, no mirrored leaves', () => {
    const cut = createUnrootedEngine(1, family).query(VIEW, 50_000);
    expect(cut.cutLevel).toBe(0);
    expect(cut.count).toBeGreaterThan(50);
    const order = leafOrder(family);
    for (let i = 0; i < cut.count; i++) {
      expect(cut.type[i]).toBeLessThan(order.length);
      expect(decodeInstanceCode(cut.code[i]).mirrored).toBe(false);
      expect(instanceTypeId(cut.type[i], family)).toBe(order[cut.type[i]]);
    }
  });

  it('cuts to aggregates at far zoom with parity cutLevel & 1', () => {
    const far: ViewRect = { cx: 0, cy: 0, halfW: 1200, halfH: 800 };
    const cut = createUnrootedEngine(1, family).query(far, 12_000);
    expect(cut.cutLevel).toBeGreaterThan(0);
    expect(cut.count).toBeGreaterThan(0);
    for (let i = 0; i < cut.count; i++) {
      expect(cut.type[i]).toBeGreaterThanOrEqual(AGGREGATE_TYPE_BASE);
      expect(decodeInstanceCode(cut.code[i]).mirrored).toBe((cut.cutLevel & 1) === 1);
    }
  });

  it('is deterministic per seed and stable under a higher-ancestor descent', () => {
    const a = createUnrootedEngine(42, family);
    const b = createUnrootedEngine(42, family);
    const cutA = a.query(VIEW, 50_000, { emitIds: true });
    const cutB = b.query(VIEW, 50_000, { emitIds: true });
    expect(cutA.count).toBe(cutB.count);
    expect([...cutA.pos]).toEqual([...cutB.pos]);
    expect([...cutA.code]).toEqual([...cutB.code]);
    expect([...cutA.type]).toEqual([...cutB.type]);
    expect(cutA.ids).toEqual(cutB.ids);

    // Descending from a higher chain ancestor emits the same tile set.
    a.ensureLevel(cutA.ancestorLevel + 2);
    const higher = a.query(VIEW, 50_000, {
      emitIds: true,
      ancestorLevel: cutA.ancestorLevel + 2,
    });
    expect(higher.count).toBe(cutA.count);
    const key = (cut: typeof cutA, i: number): string =>
      `${cut.pos[i * 2].toFixed(3)}:${cut.pos[i * 2 + 1].toFixed(3)}:${cut.code[i]}:${cut.type[i]}`;
    const seen = new Set<string>();
    for (let i = 0; i < cutA.count; i++) seen.add(key(cutA, i));
    for (let i = 0; i < higher.count; i++) {
      expect(seen.has(key(higher, i))).toBe(true);
    }
  });

  it('every ancestor step is legal under the shared SUPER_RULES', () => {
    const engine = createUnrootedEngine(5, family);
    engine.ensureLevel(8);
    const chain = engine.chain();
    let childType = engine.anchorType();
    for (const step of chain) {
      expect(SUPER_RULES[step.parentType][step.slot]).toBe(childType);
      childType = step.parentType;
    }
  });

  it('welds exactly: neighbouring tiles share Z[zeta12] vertex keys', () => {
    const engine = createUnrootedEngine(3, family);
    const cut = engine.query(VIEW, 50_000, { emitExact: true });
    expect(cut.cutLevel).toBe(0);
    const order = leafOrder(family);
    const seen = new Map<string, number>();
    let shared = 0;
    for (let i = 0; i < cut.count; i++) {
      const T = instanceExactAffine(cut.code[i], cut.exact as Float64Array, i);
      // Per-type exact outline: the hat family's Gamma2 welds as a turtle.
      for (const p of zLeafPts(family, order[cut.type[i]])) {
        const k = zKey(zApply(T, p));
        const n = (seen.get(k) ?? 0) + 1;
        seen.set(k, n);
        if (n === 2) shared++;
      }
    }
    // A tiling's interior vertices are shared by 2+ tiles; welds must be the
    // rule, not the exception. (Spectre cuts weld ~7 vertices per tile.)
    expect(shared).toBeGreaterThan(cut.count);
  });
});

describe('family worlds are independent', () => {
  it('unrootedEngineFor keys the cache by (family, seed)', () => {
    const spectre = unrootedEngineFor(11, 'spectre');
    const hex = unrootedEngineFor(11, 'hex');
    expect(spectre).not.toBe(hex);
    expect(spectre.family).toBe('spectre');
    expect(hex.family).toBe('hex');
    expect(unrootedEngineFor(11, 'hex')).toBe(hex);
  });

  it('runUnrootedQuery serves interleaved families on one seed without mixing', () => {
    const spectreCut = runUnrootedQuery({ id: 1, seed: 9, view: VIEW, budget: 30_000 });
    const hexCut = runUnrootedQuery({ id: 2, seed: 9, family: 'hex', view: VIEW, budget: 30_000 });
    const spectreAgain = runUnrootedQuery({ id: 3, seed: 9, view: VIEW, budget: 30_000 });
    expect(spectreCut.family).toBe('spectre');
    expect(hexCut.family).toBe('hex');
    // Hex has 9 leaf types; a spectre cut uses all 10 — different worlds.
    expect(Math.max(...hexCut.cut.type)).toBeLessThan(leafOrder('hex').length);
    expect([...spectreAgain.cut.pos]).toEqual([...spectreCut.cut.pos]);
    expect([...spectreAgain.cut.type]).toEqual([...spectreCut.cut.type]);
  });
});

describe('averageLeafArea', () => {
  it('is exactly the spectre tile area for the spectre (congruent leaves)', () => {
    expect(averageLeafArea('spectre')).toBeCloseTo(SPECTRE_TILE_AREA, 12);
  });

  it('matches the measured density of a real rooted patch per family', () => {
    for (const family of FAMILIES) {
      // Empirical density: area of a level-4 Delta patch / its tile count.
      // The patch boundary is fractal, so measure area as the sum of leaf
      // areas (exact — the tiles partition the patch).
      const root = buildSystem(family, 4)['Delta'];
      const tiles = countTiles(root);
      let sum = 0;
      const shoelace = (pts: readonly { x: number; y: number }[]): number => {
        let a = 0;
        for (let i = 0; i < pts.length; ++i) {
          const p = pts[i];
          const q = pts[(i + 1) % pts.length];
          a += p.x * q.y - q.x * p.y;
        }
        return Math.abs(a) / 2;
      };
      const walk = (node: TileNode): void => {
        if (node.kind === 'leaf') {
          sum += shoelace(leafPts(family, node.type) as { x: number; y: number }[]);
          return;
        }
        for (const child of node.children) walk(child.node);
      };
      walk(root);
      const empirical = sum / tiles;
      const estimate = averageLeafArea(family);
      // The stationary weights are asymptotic; a level-4 patch sits within a
      // few percent of the limit.
      expect(Math.abs(estimate - empirical) / empirical).toBeLessThan(0.05);
    }
  });
});
