/**
 * Top-down substitution: replace each tile of a board by its level-1
 * supertile, placed from the tile's own position alone.
 *
 * `buildSupertiles` works bottom-up: the child transforms of level `n` are
 * derived from the key quad of level `n - 1`, and the quads of successive
 * levels are not similar (the linear inflation `sqrt(4 + sqrt(15))` is not in
 * Z[zeta12]). So a level-(n+1) supertile is not a scaled copy of a level-n
 * one, and a tile's supertile cannot be placed by scaling the tile's position.
 *
 * It can be placed by an integer map. Write a tile's transform as
 * `x -> d^k x + t` (`d = exp(i pi/6)`, `k` even, no mirror) and `t` as its four
 * Z[zeta12] coefficients. The tile's level-1 supertile then sits at
 *
 *     x -> d^k x + L t + (d^k - 1) v
 *
 * for one 4x4 integer matrix `L` and one point `v`, whatever the tile's type
 * and wherever it is. `L` is Z-linear but not complex-linear: it commutes with
 * `d^2` and not with `d`, which is how a map on positions in Z[zeta12] scales
 * by a factor that is not in the ring. Composed with the level mirror `R`, the
 * per-step map on positions satisfies `M^4 - 8 M^2 + 1 = 0`, whose roots
 * square to `4 +- sqrt(15)`: the substitution's area factor, and its Galois
 * conjugate.
 *
 * `L` and `v` are not tabulated: {@link topDownRule} solves for them, exactly,
 * by matching each tile of the level-2 Delta supertile to where its supertile
 * sits in the level-3 Delta supertile (63 tiles, 252 equations, 20 unknowns,
 * one solution). The tests then substitute every type down to level 5 and
 * compare tile for tile with the bottom-up construction.
 *
 * The hexagons have no such rule: their positions all lie on the triangular
 * lattice and do not tell their supertiles apart (see {@link topDownRule}).
 * A hexagon's supertile is placed from its slot path instead, which is the
 * same path with every transform moved up one level
 * ({@link supertileFrameByPath}); on the spectre the two placements agree on
 * every tile.
 *
 * Boards are in the frame substitution produces: after each step the result
 * is reflected by `R`, so every board has unmirrored tiles at multiples of
 * 60 degrees, and `n` steps from one tile reproduce
 * `levelMirror(n) * (level-n supertile)` exactly.
 */

import type { TileFamilyId, TileTypeId } from './families';
import {
  Z_IDENT,
  Z_REFLECT,
  zAdd,
  zBasePairXform,
  zMul,
  zRot,
  zSub,
  zSupertileTransforms,
  type ZAffine,
  type ZVec,
} from './exact';
import { SUPER_RULES } from './tiles';

/**
 * A board tile. On the spectre, type `Gamma` is the Gamma1/Gamma2 pair, which
 * substitutes as one; on the hexagons it is a single hexagon.
 */
export interface TopDownTile {
  /** Slot path from the board's root tile (`''` for the root itself). */
  readonly id: string;
  readonly type: TileTypeId;
  readonly z: ZAffine;
}

/** A drawable leaf: the spectre's Gamma1 and Gamma2 separated, ids as `flatten` writes them. */
export interface TopDownLeaf {
  readonly id: string;
  readonly type: TileTypeId;
  readonly z: ZAffine;
}

export interface TopDownRule {
  /** `L`, row-major, acting on the coefficients `[c0, c1, c2, c3]` of `t`. */
  readonly matrix: readonly (readonly number[])[];
  /** `v`: the supertile of a tile turned by `d^k` about `v` turns about `v` too. */
  readonly centre: ZVec;
}

export function applyMatrix(M: readonly (readonly number[])[], p: ZVec): ZVec {
  const row = (r: number): number => M[r][0] * p[0] + M[r][1] * p[1] + M[r][2] * p[2] + M[r][3] * p[3];
  return [row(0), row(1), row(2), row(3)];
}

/** The 4x4 integer matrix of a Z-linear map on Z[zeta12], from its action on 1, d, d^2, d^3. */
export function matrixOf(f: (p: ZVec) => ZVec): number[][] {
  const cols = [0, 1, 2, 3].map((j) => f([0, 1, 2, 3].map((i) => (i === j ? 1 : 0)) as unknown as ZVec));
  return [0, 1, 2, 3].map((r) => cols.map((c) => c[r]));
}

// ---------------------------------------------------------------------------
// Deriving L and v
// ---------------------------------------------------------------------------

type Frac = readonly [bigint, bigint]; // numerator, positive denominator

const gcd = (a: bigint, b: bigint): bigint => {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y) [x, y] = [y, x % y];
  return x;
};
const frac = (n: bigint, d: bigint): Frac => {
  const g = gcd(n, d) || 1n;
  const s = d < 0n ? -1n : 1n;
  return [(s * n) / g, (s * d) / g];
};
const fSub = (a: Frac, b: Frac): Frac => frac(a[0] * b[1] - b[0] * a[1], a[1] * b[1]);
const fMul = (a: Frac, b: Frac): Frac => frac(a[0] * b[0], a[1] * b[1]);
const fDiv = (a: Frac, b: Frac): Frac => frac(a[0] * b[1], a[1] * b[0]);

/**
 * The unique solution of an exactly consistent integer system, or a throw:
 * Gauss-Jordan over the rationals, then a check that every equation holds and
 * every unknown is an integer.
 */
function solveExact(rows: readonly (readonly number[])[], rhs: readonly number[]): number[] {
  const n = rows[0].length;
  const A: Frac[][] = rows.map((r, i) => [...r.map((x): Frac => [BigInt(x), 1n]), [BigInt(rhs[i]), 1n]]);
  let pivotRow = 0;
  const pivots: number[] = [];
  for (let col = 0; col < n && pivotRow < A.length; col++) {
    const p = A.findIndex((r, i) => i >= pivotRow && r[col][0] !== 0n);
    if (p < 0) continue;
    [A[pivotRow], A[p]] = [A[p], A[pivotRow]];
    const pv = A[pivotRow][col];
    A[pivotRow] = A[pivotRow].map((x) => fDiv(x, pv));
    for (let i = 0; i < A.length; i++) {
      if (i === pivotRow || A[i][col][0] === 0n) continue;
      const f = A[i][col];
      A[i] = A[i].map((x, j) => fSub(x, fMul(f, A[pivotRow][j])));
    }
    pivots.push(col);
    pivotRow++;
  }
  if (pivots.length !== n) throw new Error(`top-down rule: ${n - pivots.length} unknowns left free`);
  for (let i = n; i < A.length; i++) {
    if (A[i][n][0] !== 0n) throw new Error('top-down rule: the equations are inconsistent');
  }
  return pivots.map((_, i) => {
    const [num, den] = A[i][n];
    if (den !== 1n) throw new Error('top-down rule: a non-integer solution');
    return Number(num);
  });
}

/** Unit tiles of a level-`level` supertile of `type`, with each tile's transform at `level` and `level + 1`. */
function tilesAtTwoLevels(
  family: TileFamilyId,
  type: TileTypeId,
  level: number,
): { here: ZAffine; above: ZAffine }[] {
  const out: { here: ZAffine; above: ZAffine }[] = [];
  const walk = (t: string, lv: number, here: ZAffine, above: ZAffine): void => {
    if (lv === 0) {
      out.push({ here, above });
      return;
    }
    const Ts = zSupertileTransforms(family, lv);
    const Tu = zSupertileTransforms(family, lv + 1);
    SUPER_RULES[t].forEach((child, slot) => {
      if (child !== 'null') walk(child, lv - 1, zMul(here, Ts[slot]), zMul(above, Tu[slot]));
    });
  };
  walk(type, level, Z_IDENT, Z_IDENT);
  return out;
}

/** The families top-down substitution supports: every tile turned by a multiple of 60 degrees. */
export type TopDownFamily = Extract<TileFamilyId, 'spectre' | 'hex'>;

const ruleCache = new Map<TopDownFamily, TopDownRule | null>();

/**
 * `L` and `v`, solved from the level-2 Delta supertile: each of its tiles at
 * `x -> d^k x + t` has its supertile at `x -> d^k x + t'` in the level-3 Delta
 * supertile, and `t' = L t + (d^k - 1) v` is linear in the 20 unknowns.
 *
 * `null` when the system has no unique solution. That is the hexagons' case:
 * every hexagon sits on the triangular lattice, a rank-2 part of Z[zeta12], so
 * its position leaves half of `L` undetermined, and the equations are also
 * inconsistent: hexagons at the same place can have their supertiles at
 * different places. Their supertiles are placed by slot path instead
 * ({@link supertileFrameByPath}).
 */
export function topDownRule(family: TopDownFamily = 'spectre'): TopDownRule | null {
  if (ruleCache.has(family)) return ruleCache.get(family) ?? null;
  const rows: number[][] = [];
  const rhs: number[] = [];
  const turned = (k: number): number[][] => matrixOf((p) => zSub(zRot(p, k), p));
  for (const { here, above } of tilesAtTwoLevels(family, 'Delta', 2)) {
    if (here.m !== 0 || above.m !== 0 || here.k !== above.k) {
      throw new Error('top-down rule: level-2 tiles are expected unmirrored and turned like their supertiles');
    }
    const C = turned(here.k);
    for (let r = 0; r < 4; r++) {
      const row = new Array<number>(20).fill(0);
      for (let c = 0; c < 4; c++) row[r * 4 + c] = here.t[c];
      for (let j = 0; j < 4; j++) row[16 + j] = C[r][j];
      rows.push(row);
      rhs.push(above.t[r]);
    }
  }
  let x: number[];
  try {
    x = solveExact(rows, rhs);
  } catch {
    ruleCache.set(family, null);
    return null;
  }
  const rule: TopDownRule = {
    matrix: [0, 1, 2, 3].map((r) => x.slice(r * 4, r * 4 + 4)),
    centre: [x[16], x[17], x[18], x[19]],
  };
  ruleCache.set(family, rule);
  return rule;
}

/**
 * The per-step map on positions: `t -> R(L t)`, the linear part of where a
 * tile's children's frame lands once the result is reflected back.
 */
export function stepMatrix(family: TopDownFamily = 'spectre'): number[][] | null {
  const rule = topDownRule(family);
  if (!rule) return null;
  const { matrix } = rule;
  return matrixOf((p) => zMul(Z_REFLECT, { k: 0, m: 0, t: applyMatrix(matrix, p) }).t);
}

// ---------------------------------------------------------------------------
// Substitution
// ---------------------------------------------------------------------------

/** Where a tile's level-1 supertile sits, from the tile's transform alone (spectre). */
export function supertileFrame(z: ZAffine, family: TopDownFamily = 'spectre'): ZAffine {
  if (z.m !== 0 || z.k % 2 !== 0) {
    throw new Error('top-down substitution takes unmirrored tiles turned by multiples of 60 degrees');
  }
  const rule = topDownRule(family);
  if (!rule) throw new Error(`no position rule for the ${family} family; place by slot path`);
  const { matrix, centre } = rule;
  return { k: z.k, m: 0, t: zAdd(applyMatrix(matrix, z.t), zSub(zRot(centre, z.k), centre)) };
}

/**
 * Where the level-1 supertile of the tile with slot path `s1.s2...sn` sits on
 * a board `n` steps from its root: the same path with every transform moved
 * up one level, `R^n Ts[n+1][s1] Ts[n][s2] ... Ts[2][sn]`. Any family.
 */
export function supertileFrameByPath(id: string, family: TopDownFamily = 'spectre'): ZAffine {
  const slots = id === '' ? [] : id.split('.').map(Number);
  const n = slots.length;
  let z: ZAffine = n % 2 === 0 ? Z_IDENT : Z_REFLECT;
  slots.forEach((slot, i) => {
    z = zMul(z, zSupertileTransforms(family, n + 1 - i)[slot]);
  });
  return z;
}

export function startBoard(type: TileTypeId): TopDownTile[] {
  return [{ id: '', type, z: Z_IDENT }];
}

/** A tile's children, reflected back into the board frame, ids extended by slot. */
export function substituteTile(tile: TopDownTile, family: TopDownFamily = 'spectre'): TopDownTile[] {
  const frame = zMul(
    Z_REFLECT,
    topDownRule(family) ? supertileFrame(tile.z, family) : supertileFrameByPath(tile.id, family),
  );
  const Ts = zSupertileTransforms(family, 1);
  const out: TopDownTile[] = [];
  SUPER_RULES[tile.type].forEach((child, slot) => {
    if (child === 'null') return;
    out.push({
      id: tile.id === '' ? String(slot) : `${tile.id}.${slot}`,
      type: child as TileTypeId,
      z: zMul(frame, Ts[slot]),
    });
  });
  return out;
}

/** The board one level down: every tile `keep` accepts (all by default), substituted. */
export function substituteBoard(
  board: readonly TopDownTile[],
  keep: (tile: TopDownTile) => boolean = () => true,
  family: TopDownFamily = 'spectre',
): TopDownTile[] {
  const out: TopDownTile[] = [];
  for (const tile of board) if (keep(tile)) out.push(...substituteTile(tile, family));
  return out;
}

/**
 * Leaves to draw: on the spectre a Gamma tile becomes Gamma1 (slot 0) and
 * Gamma2 (slot 1); on the hexagons every tile is one leaf.
 */
export function topDownLeaves(board: readonly TopDownTile[], family: TopDownFamily = 'spectre'): TopDownLeaf[] {
  const g2 = zBasePairXform(family);
  const out: TopDownLeaf[] = [];
  for (const tile of board) {
    if (tile.type !== 'Gamma' || !g2) {
      out.push(tile);
      continue;
    }
    const pre = tile.id === '' ? '' : `${tile.id}.`;
    out.push({ id: `${pre}0`, type: 'Gamma1', z: tile.z });
    out.push({ id: `${pre}1`, type: 'Gamma2', z: zMul(tile.z, g2) });
  }
  return out;
}

/** The slot path of a tile's parent (`''` for a child of the root). */
export function parentId(id: string): string {
  const cut = id.lastIndexOf('.');
  return cut < 0 ? '' : id.slice(0, cut);
}
