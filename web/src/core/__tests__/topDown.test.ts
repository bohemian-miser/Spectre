/**
 * Top-down substitution (topDown.ts) against the bottom-up construction.
 *
 * The rule is solved from one pair of levels (2 and 3, Delta); here it is
 * iterated, for the spectre and the hexagons, from a single tile of every type and compared tile for tile, with
 * integer equality, against `zSupertileTransforms` composed down the
 * substitution tree, and by id, type and float transform against `flatten`.
 */
import { describe, expect, it } from 'vitest';
import { TILE_NAMES, type TileTypeId } from '../families';
import { REFLECT_X, mul } from '../geom';
import { SUPER_RULES, buildSystem, flatten, levelMirror } from '../tiles';
import {
  Z_IDENT,
  Z_REFLECT,
  zAffineKey,
  zKey,
  zMul,
  zRot,
  zSub,
  zSupertileTransforms,
  zToAffine,
  type ZAffine,
} from '../exact';
import {
  applyMatrix,
  topDownLeaves,
  matrixOf,
  parentId,
  startBoard,
  stepMatrix,
  substituteBoard,
  supertileFrame,
  supertileFrameByPath,
  topDownRule,
  type TopDownFamily,
  type TopDownTile,
} from '../topDown';

const FAMILIES: readonly TopDownFamily[] = ['spectre', 'hex'];

/** Bottom-up: the level-`level` supertile's unit tiles, exactly, in the board frame. */
function bottomUp(family: TopDownFamily, type: TileTypeId, level: number): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (t: string, lv: number, z: ZAffine, id: string): void => {
    if (lv === 0) {
      out.set(id, `${t}@${zAffineKey(z)}`);
      return;
    }
    const Ts = zSupertileTransforms(family, lv);
    SUPER_RULES[t].forEach((child, slot) => {
      if (child !== 'null') walk(child, lv - 1, zMul(z, Ts[slot]), id === '' ? String(slot) : `${id}.${slot}`);
    });
  };
  walk(type, level, level % 2 === 0 ? Z_IDENT : Z_REFLECT, '');
  return out;
}

function topDown(family: TopDownFamily, type: TileTypeId, level: number): TopDownTile[] {
  let board = startBoard(type);
  for (let i = 0; i < level; i++) board = substituteBoard(board, undefined, family);
  return board;
}

const keyed = (board: readonly TopDownTile[]): Map<string, string> =>
  new Map(board.map((t) => [t.id, `${t.type}@${zAffineKey(t.z)}`]));

type M4 = number[][];
const mm = (A: M4, B: M4): M4 => A.map((r) => B[0].map((_, j) => r.reduce((s, x, k) => s + x * B[k][j], 0)));
const ms = (A: M4, B: M4, b = 1): M4 => A.map((r, i) => r.map((x, j) => x + b * B[i][j]));
const I4: M4 = [0, 1, 2, 3].map((i) => [0, 1, 2, 3].map((j) => (i === j ? 1 : 0)));

describe('the spectre position rule', () => {
  it('is solved uniquely in integers', () => {
    const { matrix, centre } = topDownRule('spectre')!;
    expect(matrix.flat().every(Number.isInteger)).toBe(true);
    expect(centre.every(Number.isInteger)).toBe(true);
  });

  it('commutes with turns by 60 degrees but not by 30', () => {
    const L = topDownRule('spectre')!.matrix as M4;
    const D = (k: number): M4 => matrixOf((p) => zRot(p, k));
    expect(mm(L, D(2))).toEqual(mm(D(2), L));
    expect(mm(L, D(1))).not.toEqual(mm(D(1), L));
  });

  it('steps positions by a map whose square has eigenvalues 4 +- sqrt(15)', () => {
    const M = stepMatrix('spectre')!;
    const M2 = mm(M, M);
    // M^4 - 8 M^2 + I = 0
    expect(ms(ms(mm(M2, M2), M2, -8), I4)).toEqual([0, 1, 2, 3].map(() => [0, 0, 0, 0]));
  });

  it('agrees with the slot-path placement on every tile of every level-4 supertile', () => {
    for (const type of TILE_NAMES) {
      for (const tile of topDown('spectre', type, 4)) {
        expect(zAffineKey(supertileFrame(tile.z))).toBe(zAffineKey(supertileFrameByPath(tile.id)));
      }
    }
  });

  it('applyMatrix is the matrix product on coefficients', () => {
    const L = topDownRule('spectre')!.matrix;
    expect(applyMatrix(L, [1, 0, 0, 0])).toEqual(L.map((r) => r[0]));
  });

  it('moves with the board: substitute(g . board) = (R g* R) . substitute(board)', () => {
    const board = topDown('spectre', 'Psi', 2);
    const g: ZAffine = { k: 4, m: 0, t: [3, -1, 2, 5] };
    const h = zMul(Z_REFLECT, zMul(supertileFrame(g), Z_REFLECT));
    const moved = substituteBoard(board.map((t) => ({ ...t, z: zMul(g, t.z) })));
    const expected = substituteBoard(board).map((t) => ({ ...t, z: zMul(h, t.z) }));
    expect(keyed(moved)).toEqual(keyed(expected));
  });
});

describe('the hexagons', () => {
  it('have no position rule: their positions do not determine their supertiles', () => {
    expect(topDownRule('hex')).toBeNull();
    expect(stepMatrix('hex')).toBeNull();
    // No affine map: two pairs of hexagons turned alike, the same step apart,
    // whose supertiles are not the same step apart.
    const seen = new Map<string, string>();
    let witness = false;
    const tiles = topDown('hex', 'Delta', 3);
    for (const a of tiles) {
      for (const b of tiles) {
        if (a.z.k !== b.z.k || a === b) continue;
        const step = `${a.z.k}|${zKey(zSub(b.z.t, a.z.t))}`;
        const lifted = zKey(zSub(supertileFrameByPath(b.id, 'hex').t, supertileFrameByPath(a.id, 'hex').t));
        const prev = seen.get(step);
        if (prev !== undefined && prev !== lifted) witness = true;
        seen.set(step, lifted);
      }
    }
    expect(witness).toBe(true);
  });
});

for (const family of FAMILIES) {
  describe(`${family}: substituting from one tile`, () => {
    for (const type of TILE_NAMES) {
      it(`${type}: levels 1 to 4 match the bottom-up supertile exactly`, () => {
        for (let level = 1; level <= 4; level++) {
          expect(keyed(topDown(family, type, level))).toEqual(bottomUp(family, type, level));
        }
      });
    }

    it('level 5 Delta and Gamma match exactly', () => {
      for (const type of ['Delta', 'Gamma'] as const) {
        expect(keyed(topDown(family, type, 5))).toEqual(bottomUp(family, type, 5));
      }
    });

    it('leaves agree with flatten: ids, types and transforms', () => {
      for (const type of TILE_NAMES) {
        const level = 3;
        const ref = flatten(buildSystem(family, level)[type], levelMirror(level));
        const leaves = topDownLeaves(topDown(family, type, level), family);
        expect(leaves.map((l) => l.id).sort()).toEqual(ref.map((r) => r.id).sort());
        const byId = new Map(leaves.map((l) => [l.id, l]));
        for (const r of ref) {
          const l = byId.get(r.id)!;
          expect(l.type).toBe(r.type);
          const a = zToAffine(l.z);
          for (let i = 0; i < 6; i++) expect(Math.abs(a[i] - r.xform[i])).toBeLessThan(1e-9);
        }
      }
    });
  });

  describe(`${family}: substituting a board`, () => {
    it('a selection substitutes to exactly the children of the selected tiles', () => {
      const board = topDown(family, 'Sigma', 2);
      const picked = new Set(board.filter((_, i) => i % 3 === 0).map((t) => t.id));
      const part = keyed(substituteBoard(board, (t) => picked.has(t.id), family));
      const whole = keyed(substituteBoard(board, undefined, family));
      const expected = new Map([...whole].filter(([id]) => picked.has(parentId(id))));
      expect(part).toEqual(expected);
    });
  });
}

it('the mirror the board frame folds in is the one the views counter-apply', () => {
  expect(levelMirror(1)).toEqual(REFLECT_X);
  expect(mul(REFLECT_X, REFLECT_X)).toEqual(levelMirror(2));
});
