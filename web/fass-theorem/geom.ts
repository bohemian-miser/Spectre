/**
 * Shared exact geometry for the FASS theorem scripts (docs/FASS_THEOREM.md).
 *
 * Everything here is integer arithmetic in Z[zeta12] via `src/core/exact.ts`.
 * A "sub-supertile" is a level-m supertile sitting inside a level-L root at a
 * slot address; its leaf instances are expanded exactly and its outline is
 * recovered by directed-edge cancellation, oriented counter-clockwise.
 */
import {
  SUPER_RULES, edgeLabels, zApply, zKey, zLeafPts, zMul, zInv, zSupertileTransforms,
  zSupertileQuad, zSub, zBasePairXform, Z_IDENT,
  type TileFamilyId, type TileTypeId, type ZAffine, type ZVec,
} from '../src/core';

export const TYPES: readonly TileTypeId[] = ['Gamma','Delta','Theta','Lambda','Xi','Pi','Sigma','Phi','Psi'];

export interface Leaf { readonly type: TileTypeId; readonly xform: ZAffine }

/** Leaf instances of a level-`level` supertile of `type`, in its local frame. */
export function leaves(family: TileFamilyId, type: TileTypeId, level: number, base: ZAffine = Z_IDENT): Leaf[] {
  const out: Leaf[] = [];
  const walk = (t: TileTypeId, x: ZAffine, lv: number): void => {
    if (lv > 0) {
      const Ts = zSupertileTransforms(family, lv);
      const subs = SUPER_RULES[t];
      for (let s = 0; s < 8; s++) if (subs[s] !== 'null') walk(subs[s] as TileTypeId, zMul(x, Ts[s]), lv - 1);
      return;
    }
    if (family !== 'hex' && t === 'Gamma') {
      out.push({ type: 'Gamma1', xform: x });
      out.push({ type: 'Gamma2', xform: zMul(x, zBasePairXform(family)!) });
      return;
    }
    out.push({ type: t, xform: x });
  };
  walk(type, base, level);
  return out;
}

/** d^j for j in 0..11 keyed for lookup. */
export const UNIT_INDEX = new Map<string, number>();
{
  let v: ZVec = [1, 0, 0, 0];
  for (let j = 0; j < 12; j++) { UNIT_INDEX.set(zKey(v), j); v = [-v[3], v[0], v[1] + v[3], v[2]]; }
}

/** Exact signed double-area of a polygon given as ZVec list, projected to floats (sign only). */
function signedArea(pts: readonly ZVec[]): number {
  const HALF = Math.sqrt(3) / 2;
  const x = (p: ZVec) => p[0] + p[1] * HALF + p[2] * 0.5;
  const y = (p: ZVec) => p[1] * 0.5 + p[2] * HALF + p[3];
  let a = 0;
  for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += x(p) * y(q) - x(q) * y(p); }
  return a;
}

export interface Outline {
  /** Boundary vertices in counter-clockwise order (keys). */
  readonly loop: readonly string[];
  readonly coord: ReadonlyMap<string, ZVec>;
  /** For boundary edge i (loop[i] -> loop[i+1]): the leaf index owning it and that leaf's edge index. */
  readonly owner: readonly { leaf: number; edge: number }[];
}

/**
 * Outline of a patch of leaves by directed-edge cancellation. Throws unless the
 * uncancelled edges form exactly one simple loop with every edge used once and
 * no edge shared by three tiles. Oriented counter-clockwise (odd substitution
 * levels are mirror images, so the raw tile orientation alternates).
 */
export function outlineOf(family: TileFamilyId, insts: readonly Leaf[]): Outline {
  const dir = new Map<string, { a: string; b: string; leaf: number; edge: number }>();
  const coord = new Map<string, ZVec>();
  const mult = new Map<string, number>();
  insts.forEach((it, li) => {
    const poly = zLeafPts(family, it.type).map((p) => zApply(it.xform, p));
    for (let i = 0; i < poly.length; i++) {
      const a = zKey(poly[i]); const b = zKey(poly[(i + 1) % poly.length]);
      coord.set(a, poly[i]); coord.set(b, poly[(i + 1) % poly.length]);
      const u = a < b ? `${a}_${b}` : `${b}_${a}`;
      mult.set(u, (mult.get(u) ?? 0) + 1);
      const rev = `${b}>${a}`;
      if (dir.has(rev)) dir.delete(rev);
      else dir.set(`${a}>${b}`, { a, b, leaf: li, edge: i });
    }
  });
  for (const [k, n] of mult) if (n > 2) throw new Error(`edge ${k} shared by ${n} tiles`);
  const next = new Map<string, { b: string; leaf: number; edge: number }>();
  for (const e of dir.values()) {
    if (next.has(e.a)) throw new Error(`boundary vertex ${e.a} has two outgoing edges`);
    next.set(e.a, { b: e.b, leaf: e.leaf, edge: e.edge });
  }
  const start = [...next.keys()].sort()[0];
  const loop: string[] = [start]; const owner: { leaf: number; edge: number }[] = [];
  let cur = start;
  for (;;) {
    const n = next.get(cur)!; owner.push({ leaf: n.leaf, edge: n.edge });
    if (n.b === start) break;
    loop.push(n.b); cur = n.b;
    if (loop.length > next.size) throw new Error('outline did not close');
  }
  if (loop.length !== next.size) throw new Error(`outline has ${next.size} edges but the loop found uses ${loop.length}: several loops`);
  if (signedArea(loop.map((k) => coord.get(k)!)) < 0) {
    // reverse: loop[0], loop[n-1], ..., loop[1]; edge i of the reversed loop is edge (n-1-i) of the old
    const n = loop.length;
    const rl = [loop[0], ...loop.slice(1).reverse()];
    const ro = rl.map((_, i) => owner[(n - 1 - i + n) % n]);
    return { loop: rl, coord, owner: ro };
  }
  return { loop, coord, owner };
}

/** Direction (0..11) of the unit step from key a to key b. */
export function stepDir(coord: ReadonlyMap<string, ZVec>, a: string, b: string): number {
  const d = UNIT_INDEX.get(zKey(zSub(coord.get(b)!, coord.get(a)!)));
  if (d === undefined) throw new Error(`step ${a} -> ${b} is not a unit`);
  return d;
}

/** Sub-supertiles of level m inside a level-L root, with their transforms and slot addresses. */
export function subSupertiles(family: TileFamilyId, root: TileTypeId, L: number, m: number): { type: TileTypeId; xform: ZAffine; addr: number[] }[] {
  const out: { type: TileTypeId; xform: ZAffine; addr: number[] }[] = [];
  const walk = (t: TileTypeId, x: ZAffine, lv: number, addr: number[]): void => {
    if (lv === m) { out.push({ type: t, xform: x, addr }); return; }
    const Ts = zSupertileTransforms(family, lv);
    const subs = SUPER_RULES[t];
    for (let s = 0; s < 8; s++) if (subs[s] !== 'null') walk(subs[s] as TileTypeId, zMul(x, Ts[s]), lv - 1, [...addr, s]);
  };
  walk(root, Z_IDENT, L, []);
  return out;
}

export { zApply, zKey, zMul, zInv, zSub, zSupertileTransforms, zSupertileQuad, edgeLabels, zLeafPts };
export type { TileFamilyId, TileTypeId, ZAffine, ZVec };
