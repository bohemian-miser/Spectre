/**
 * Keys for circuits, tile sets and corner triples, independent of where the
 * circuit sits in the plane and of where it is read from.
 *
 * - `circuitKey`: the word read round the circuit from its least starting
 *   tile, in the direction that reads least. Two circuits have the same key
 *   exactly when one is the other moved: the letters say how each tile is
 *   glued to the next.
 * - `tileSetKey`: the tiles alone, without the edges the strand uses, so two
 *   combinations whose circuits cover the same tiles get the same key.
 * - `cornerKey`: three (or k) tiles, as placed relative to each other.
 *
 * Tile positions are exact (`core/exact.ts`). A set of placed tiles is
 * written relative to its centroid (scaled by the count to stay integral),
 * in each of the 24 rotations and reflections of the plane, and the least
 * sorted listing is the key.
 */
import { createHash } from 'node:crypto';
import {
  reverseLetter, zAdd, zApply, zConj, zKey, zLeafPts, zMul, zRot, zSupertileTransforms,
  Z_IDENT, type Address, type HexType, type ZAffine, type ZVec,
} from '../src/core';

/** Index of the least rotation of `s` (Booth's algorithm). */
export function leastRotation(s: readonly string[]): number {
  const n = s.length;
  const f = new Array<number>(2 * n).fill(-1);
  let k = 0;
  for (let j = 1; j < 2 * n; j++) {
    const sj = s[j % n];
    let i = f[j - k - 1];
    while (i !== -1 && sj !== s[(k + i + 1) % n]) {
      if (sj < s[(k + i + 1) % n]) k = j - i - 1;
      i = f[i];
    }
    if (sj !== s[(k + i + 1) % n]) {
      if (sj < s[k % n]) k = j;
      f[j - k] = -1;
    } else f[j - k] = i + 1;
  }
  return k % n;
}

const rotate = <T>(s: readonly T[], k: number): T[] => [...s.slice(k), ...s.slice(0, k)];

/** The word walked the other way round. */
export const reverseWord = (w: readonly string[]): string[] => [...w].reverse().map(reverseLetter);

const cmp = (a: readonly string[], b: readonly string[]): number => {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  return 0;
};

/** The word in canonical form: least rotation, least direction. */
export function canonicalWord(w: readonly string[]): { word: string[]; reversed: boolean; offset: number } {
  const f = rotate(w, leastRotation(w));
  const rw = reverseWord(w);
  const r = rotate(rw, leastRotation(rw));
  return cmp(r, f) < 0 ? { word: r, reversed: true, offset: leastRotation(rw) } : { word: f, reversed: false, offset: leastRotation(w) };
}

export const circuitKey = (w: readonly string[]): string => canonicalWord(w).word.join('');

/** A short id for a key, for tables. */
export const shortId = (key: string): string => createHash('sha1').update(key).digest('hex').slice(0, 12);

/** How many times the word repeats round the circuit (its rotational order as a word). */
export function wordOrder(w: readonly string[]): number {
  const n = w.length;
  const fail = new Array<number>(n + 1).fill(0);
  fail[0] = -1;
  for (let i = 1, k = -1; i <= n; i++) {
    while (k >= 0 && w[k] !== w[i - 1]) k = fail[k];
    fail[i] = ++k;
  }
  const p = n - fail[n];
  return n % p === 0 ? n / p : 1;
}

// ---------------------------------------------------------------------------
// Placed tiles
// ---------------------------------------------------------------------------

/** The exact transform of a tile, in the frame of the top of its path. */
export function tileTransform(a: Address): ZAffine {
  let T = Z_IDENT;
  for (let k = a.path.length - 1; k >= 0; k--) T = zMul(T, zSupertileTransforms('hex', k + 1)[a.path[k].slot]);
  return T;
}

const HEX_SUM: ZVec = zLeafPts('hex', 'Delta').reduce((s, p) => zAdd(s, p), [0, 0, 0, 0] as ZVec);

/** Six times the tile's centre. */
export function centre6(T: ZAffine): ZVec {
  const lin = zRot(T.m ? zConj(HEX_SUM) : HEX_SUM, T.k);
  return zAdd(lin, [6 * T.t[0], 6 * T.t[1], 6 * T.t[2], 6 * T.t[3]]);
}

export interface Placed { readonly type: HexType; readonly T: ZAffine }

export const placedOf = (a: Address): Placed => ({ type: a.leaf, T: tileTransform(a) });

/** The 24 isometries of the plane fixing the origin that map the tiling's directions to themselves. */
const FRAMES: readonly ZAffine[] = Array.from({ length: 24 }, (_, i) => ({ k: i % 12, m: (i >= 12 ? 1 : 0) as 0 | 1, t: [0, 0, 0, 0] as ZVec }));

/**
 * The least listing of the tiles, each as type, turn, mirror and centre
 * relative to the centroid, over the 24 frames.
 */
export function placedKey(tiles: readonly Placed[]): string {
  const n = tiles.length;
  const sum = tiles.reduce((s, p) => zAdd(s, centre6(p.T)), [0, 0, 0, 0] as ZVec);
  const rel = tiles.map((p) => {
    const c = centre6(p.T);
    return { type: p.type, k: p.T.k, m: p.T.m, c: [c[0] * n - sum[0], c[1] * n - sum[1], c[2] * n - sum[2], c[3] * n - sum[3]] as ZVec };
  });
  let best: string | null = null;
  for (const F of FRAMES) {
    const items = rel.map((r) => {
      const R = zMul(F, { k: r.k, m: r.m as 0 | 1, t: [0, 0, 0, 0] });
      return `${r.type}/${R.k}/${R.m}/${zKey(zApply(F, r.c))}`;
    }).sort();
    const s = items.join(';');
    if (best === null || s < best) best = s;
  }
  return best!;
}

export const tileSetKey = (tiles: readonly Address[]): string => placedKey(tiles.map(placedOf));
