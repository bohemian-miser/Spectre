/**
 * One reading per circuit.
 *
 * A circuit through the start tile (its type, entered by the start edge) at
 * m places can be read from each of them, and walked either way round; each
 * reading is a different path of the search. The readings are compared as
 * words, tile by tile, each tile ranked by its type and entry edge with the
 * start's first, and only the first in that order is kept.
 *
 * A path is cut as soon as it cannot be the first reading of anything it
 * closes on:
 * - forwards: it has come back to the start's type and edge, and the tiles
 *   from there read earlier than the tiles from the start (checked one tile
 *   at a time, as the FKM algorithm tests a prenecklace,
 *   https://en.wikipedia.org/wiki/Lyndon_word#Generation);
 * - backwards: it leaves a tile of the start's type by the start edge, and
 *   reading back from there to the start reads earlier than reading on from
 *   the start.
 * A tie that runs back past the start is settled when the path closes
 * (`firstReading`), with the whole circuit known.
 */
import { HEX_TYPES, type HexType } from '../../core';
import type { Seen, Walker } from './possible';

/** How far a path's reading has been checked, and the period the forward check has found so far. */
export interface Reading { readonly n: number; readonly p: number }

export const FRESH: Reading = { n: 0, p: 1 };

const TYPE_INDEX = new Map(HEX_TYPES.map((t, i) => [t, i]));

/** A walked tile as one byte: its type's index times 6, plus the edge it is entered by. */
export const tileCode = (type: HexType, entry: number): number => TYPE_INDEX.get(type)! * 6 + entry;

/** The tile a code stands for, left by the edge the pattern pairs with its entry. */
export const seenOf = (wk: Walker, code: number): Seen => {
  const type = HEX_TYPES[(code / 6) | 0], entry = code % 6;
  return { type, entry, exit: wk.exits[type][entry] };
};

/**
 * Each code's rank in the order readings are compared by, the start's type
 * and edge first: read forwards (by the entry edge) and backwards (by the exit edge).
 */
interface Ranks { readonly fw: Uint8Array; readonly bw: Uint8Array }

const ranksOf = new WeakMap<Walker, Ranks>();

function ranks(wk: Walker): Ranks {
  const hit = ranksOf.get(wk);
  if (hit) return hit;
  const fw = new Uint8Array(HEX_TYPES.length * 6), bw = new Uint8Array(HEX_TYPES.length * 6);
  const rankOf = (type: HexType, edge: number): number => (type === wk.start && edge === wk.startEdge ? 0 : 1 + tileCode(type, edge));
  HEX_TYPES.forEach((type, t) => {
    for (let e = 0; e < 6; e++) {
      fw[t * 6 + e] = rankOf(type, e);
      const exit = wk.exits[type][e];
      bw[t * 6 + e] = exit < 0 ? 255 : rankOf(type, exit);
    }
  });
  const r = { fw, bw };
  ranksOf.set(wk, r);
  return r;
}

/** The reading after the path (its first `n` codes) has walked on, or null when the path can no longer be a first reading. */
export function stillFirst(wk: Walker, codes: Uint8Array, n: number, r: Reading): Reading | null {
  const { fw, bw } = ranks(wk);
  let p = r.p;
  for (let i = Math.max(1, r.n); i < n; i++) {
    const a = fw[codes[i]], b = fw[codes[i - p]];
    if (a < b) return null;
    if (a > b) p = i + 1;
  }
  for (let j = r.n; j < n; j++) {
    if (bw[codes[j]] !== 0) continue;
    // back from tile j to the start, against on from the start
    for (let k = 1; k <= j; k++) {
      const a = bw[codes[j - k]], b = fw[codes[k]];
      if (a < b) return null;
      if (a > b) break;
    }
  }
  return { n, p };
}

/** Whether a closed circuit (its `n` codes), read from the start, is its first reading: from every tile of the start's type and edge, either way round. */
export function firstReading(wk: Walker, codes: Uint8Array, n: number): boolean {
  const { fw: F, bw: B } = ranks(wk);
  const N = n;
  // the reading from tile j: forwards, or backwards (tile j, then j - 1, …)
  const at = (j: number, k: number, back: boolean): number => (back ? B[codes[(((j - k) % N) + N) % N]] : F[codes[(j + k) % N]]);
  for (let j = 0; j < N; j++) {
    for (const back of [false, true]) {
      if ((back ? B[codes[j]] : F[codes[j]]) !== 0 || (j === 0 && !back)) continue;
      for (let k = 0; k < N; k++) {
        const a = at(j, k, back), b = F[codes[k]];
        if (a < b) return false;
        if (a > b) break;
      }
    }
  }
  return true;
}
