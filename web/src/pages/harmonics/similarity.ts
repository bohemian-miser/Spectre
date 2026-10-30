/**
 * How alike two circuits two levels apart read: graded links for the
 * chains (`chains.ts`).
 *
 * For A born at level n and B at n + 2 in the same family, A read at level
 * k is set against B read at k + 2 for each level from A's top down to the
 * floor (or to A's top two levels when lower), both read under the same
 * fold (`rows.ts`). Two readings are cyclic token sequences, so their
 * distance is the edit distance (insertions, deletions, substitutions) at
 * the best rotation, read either way round; a level's similarity is one
 * less that distance over the longer reading's length, and the pair's score
 * is the least similarity of the levels compared. At least two levels must
 * be compared for a score. Levels where either reading is missing are
 * passed over, as the exact rule takes the agreement as far down as both
 * are read.
 *
 * Bounds, per level (`bound`):
 *
 * - `exact`: every rotation tried, while the work stays within `EXACT_WORK`.
 * - `at least`: past that, the least distance over the rotations that start
 *   at a token equal to A's first (at most `ROTATIONS`, spread out), each
 *   within a band of the diagonal `BAND` wider than the lengths' difference.
 *   That distance is an upper bound, so the similarity is at least the one
 *   given.
 * - `at most`: when even the banded work passes `BAND_WORK`, or a reading
 *   is over `TOKEN_BUDGET` tokens, only the lengths count: the distance is
 *   at least their difference (at least 1 when the readings are not the
 *   same), so the similarity is at most the one given. Readings over
 *   `LENGTHS_ONLY` tokens are taken as the same when their lengths are,
 *   as the exact rule takes them.
 *
 * Scoring stops going down once a level falls below `MIN_SCORE`: the pair's
 * score is then under it, and that is all that is reported.
 */
import { FLOOR, type ChainCircuit } from './chains';
import { sameCyclic } from './readings';

export const EXACT_WORK = 4e6;
export const ROTATIONS = 12;
export const BAND = 64;
export const BAND_WORK = 6e7;
export const TOKEN_BUDGET = 60000;
/** As `chains.ts` compares them: lengths only past this. */
export const LENGTHS_ONLY = 60000;
/** The lowest threshold offered; scores under it are not worked out further. */
export const MIN_SCORE = 0.5;

/** The edit distance between two sequences, within a band of the diagonal when `band` is given (an upper bound then). */
export function editDistance(a: readonly string[], b: readonly string[], band = Infinity): number {
  const n = a.length, m = b.length;
  if (!n || !m) return n + m;
  let prev = new Float64Array(m + 1), cur = new Float64Array(m + 1);
  for (let j = 0; j <= m; j++) prev[j] = j;
  for (let i = 1; i <= n; i++) {
    const centre = Math.round((i * m) / n);
    const lo = Math.max(1, centre - band), hi = Math.min(m, centre + band);
    cur.fill(Infinity);
    cur[0] = i;
    for (let j = lo; j <= hi; j++) {
      const sub = prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      cur[j] = Math.min(sub, prev[j] + 1, cur[j - 1] + 1);
    }
    [prev, cur] = [cur, prev];
  }
  return prev[m];
}

export type Bound = 'exact' | 'at least' | 'at most';

/** The least edit distance between A and B over B's rotations, read either way round, and how it bounds the true one (see the file's note). */
export function cyclicDistance(a: readonly string[], b: readonly string[]): { distance: number; bound: Bound } {
  const n = a.length, m = b.length;
  if (!n || !m) return { distance: n + m, bound: 'exact' };
  if (n > LENGTHS_ONLY || m > LENGTHS_ONLY) return { distance: Math.abs(n - m), bound: n === m ? 'exact' : 'at most' };
  if (n === m && sameCyclic(a, b)) return { distance: 0, bound: 'exact' };
  const byLength = { distance: Math.max(1, Math.abs(n - m)), bound: 'at most' as Bound };
  if (n > TOKEN_BUDGET || m > TOKEN_BUDGET) return byLength;
  const ways = [b, [...b].reverse()];
  if (n * m * m * 2 <= EXACT_WORK) {
    let best = Infinity;
    for (const bb of ways) for (let r = 0; r < m; r++) best = Math.min(best, editDistance(a, [...bb.slice(r), ...bb.slice(0, r)]));
    return { distance: best, bound: 'exact' };
  }
  const band = Math.abs(n - m) + BAND;
  const starts = ways.map((bb) => {
    const all = bb.flatMap((t, r) => (t === a[0] ? [r] : []));
    const step = Math.max(1, Math.ceil(all.length / ROTATIONS));
    const some = all.filter((_, q) => q % step === 0);
    return some.length ? some : [0];
  });
  if (n * (2 * band + 1) * (starts[0].length + starts[1].length) > BAND_WORK) return byLength;
  let best = Infinity;
  ways.forEach((bb, w) => {
    for (const r of starts[w]) best = Math.min(best, editDistance(a, [...bb.slice(r), ...bb.slice(0, r)], band));
  });
  return { distance: best, bound: 'at least' };
}

/** A level compared: A's level, the two readings' lengths, the similarity (null where either is not read), and how it bounds the true one. */
export interface LevelSimilarity {
  readonly level: number;
  readonly lengths: readonly [number, number];
  readonly similarity: number | null;
  readonly bound: Bound;
}

/** A pair two levels apart in one family with its score: the least similarity over the levels compared (0 when under two levels were). */
export interface Scored {
  readonly a: number;
  readonly b: number;
  readonly score: number;
  readonly levels: readonly LevelSimilarity[];
}

/** The pair's similarity level by level, from A's top down to the floor (or A's top two levels), readings from `tokens` (null where not read). */
export function scorePair(a: ChainCircuit, tokens: (c: 'a' | 'b', level: number) => readonly string[] | null, floor = FLOOR): Omit<Scored, 'a' | 'b'> {
  const levels: LevelSimilarity[] = [];
  let low = 1;
  for (let k = a.level - 1; k >= Math.min(floor, a.level - 2) && k >= 0 && low >= MIN_SCORE; k--) {
    const x = tokens('a', k), y = tokens('b', k + 2);
    if (!x || !y) {
      levels.push({ level: k, lengths: [x?.length ?? 0, y?.length ?? 0], similarity: null, bound: 'exact' });
      continue;
    }
    const { distance, bound } = cyclicDistance(x, y);
    const similarity = 1 - distance / Math.max(x.length, y.length, 1);
    low = Math.min(low, similarity);
    levels.push({ level: k, lengths: [x.length, y.length], similarity, bound });
  }
  const compared = levels.filter((l) => l.similarity !== null);
  return { score: compared.length >= 2 || low < MIN_SCORE ? low : 0, levels };
}

/** Every pair of circuits two levels apart in one family, scored. */
export function scoreAll(circuits: readonly ChainCircuit[], tokens: (i: number, level: number) => readonly string[] | null, floor = FLOOR): Scored[] {
  const out: Scored[] = [];
  circuits.forEach((b, bi) =>
    circuits.forEach((a, ai) => {
      if (a.level + 2 !== b.level || a.family !== b.family) return;
      out.push({ a: ai, b: bi, ...scorePair(a, (w, l) => tokens(w === 'a' ? ai : bi, l), floor) });
    }),
  );
  return out;
}

/** The pairs at or above a threshold, as links for `chainsOf`. */
export const linksAt = (scored: readonly Scored[], threshold: number): Scored[] => scored.filter((s) => s.score >= threshold);
