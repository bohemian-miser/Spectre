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
import { HEX_TYPES } from '../../core';
import type { Seen, Walker } from './possible';

/** How far a path's reading has been checked, and the period the forward check has found so far. */
export interface Reading { readonly n: number; readonly p: number }

export const FRESH: Reading = { n: 0, p: 1 };

const TYPE_INDEX = new Map(HEX_TYPES.map((t, i) => [t, i]));

/** A tile's rank in the order readings are compared by: the start's type and edge first. */
const rankOf = (wk: Walker, type: string, entry: number): number =>
  (type === wk.start && entry === wk.startEdge ? 0 : 1 + TYPE_INDEX.get(type as never)! * 6 + entry);

const forward = (wk: Walker, s: Seen): number => rankOf(wk, s.type, s.entry);
const backward = (wk: Walker, s: Seen): number => rankOf(wk, s.type, s.exit);

/** The reading after the path has walked on to `seen`, or null when the path can no longer be a first reading. */
export function stillFirst(wk: Walker, seen: readonly Seen[], r: Reading): Reading | null {
  let p = r.p;
  for (let i = Math.max(1, r.n); i < seen.length; i++) {
    const a = forward(wk, seen[i]), b = forward(wk, seen[i - p]);
    if (a < b) return null;
    if (a > b) p = i + 1;
  }
  for (let j = r.n; j < seen.length; j++) {
    if (backward(wk, seen[j]) !== 0) continue;
    // back from tile j to the start, against on from the start
    for (let k = 1; k <= j; k++) {
      const a = backward(wk, seen[j - k]), b = forward(wk, seen[k]);
      if (a < b) return null;
      if (a > b) break;
    }
  }
  return { n: seen.length, p };
}

/** Whether a closed circuit, read from the start, is its first reading: from every tile of the start's type and edge, either way round. */
export function firstReading(wk: Walker, seen: readonly Seen[]): boolean {
  const N = seen.length;
  const fw = seen.map((s) => forward(wk, s));
  const bw = seen.map((s) => backward(wk, s));
  // the reading from tile j: forwards, or backwards (tile j, then j - 1, …)
  const at = (j: number, k: number, back: boolean): number => (back ? bw[(((j - k) % N) + N) % N] : fw[(j + k) % N]);
  for (let j = 0; j < N; j++) {
    for (const back of [false, true]) {
      if ((back ? bw[j] : fw[j]) !== 0 || (j === 0 && !back)) continue;
      for (let k = 0; k < N; k++) {
        const a = at(j, k, back), b = fw[k];
        if (a < b) return false;
        if (a > b) break;
      }
    }
  }
  return true;
}
