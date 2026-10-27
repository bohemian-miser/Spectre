/**
 * The three sides of a circuit.
 *
 * A circuit is written as its word: one letter per tile, the tile's type and
 * the edges the strand enters and leaves by (`Phi45`). The letter does not
 * change when the tile is turned, so a circuit made of three copies of one
 * side, each turned by 120 degrees, has a side's word three times over.
 * `sideRuns` splits a word into thirds and lists where they disagree.
 */

/** A circuit tile's letter: type, entry edge, exit edge. */
export const letter = (type: string, entry: number, exit: number): string => `${type}${entry}${exit}`;

/** The same tile walked the other way: entry and exit swapped. */
export const reverseLetter = (w: string): string => `${w.slice(0, -2)}${w[w.length - 1]}${w[w.length - 2]}`;

export interface SideRun {
  /** Positions within a third, inclusive. */
  readonly from: number;
  readonly to: number;
  /** The third that differs from the other two, or -1 when all three differ. */
  readonly odd: number;
  /** The odd third is the others' block walked backwards. */
  readonly reversed: boolean;
}

export interface Sides {
  /** The word is cut into thirds starting at this position. */
  readonly offset: number;
  readonly side: number;
  /** Positions within a third, counted from `offset`. */
  readonly runs: readonly SideRun[];
}

/**
 * Where the thirds of `word` disagree, in runs. The thirds are cut at the
 * start of the longest stretch where all three agree, so no run is split
 * across a cut. The word's length must be a multiple of 3.
 */
export function sideRuns(word: readonly string[]): Sides {
  if (word.length % 3) throw new Error('a word of three sides has a length divisible by 3');
  const N = word.length;
  const S = N / 3;
  const agrees = (i: number): boolean => word[i % N] === word[(i + S) % N] && word[i % N] === word[(i + 2 * S) % N];
  // Agreement repeats with period S; find the longest agreeing stretch in one period, cyclically.
  let offset = 0;
  let best = -1;
  for (let i = 0; i < S; i++) {
    if (agrees(i) && !agrees(i + S - 1)) {
      let len = 0;
      while (len < S && agrees(i + len)) len++;
      if (len > best) { best = len; offset = i; }
    }
  }
  const w = [...word.slice(offset), ...word.slice(0, offset)];
  const runs: SideRun[] = [];
  for (let i = 0; i < S; i++) {
    const [a, b, c] = [w[i], w[i + S], w[i + 2 * S]];
    if (a === b && b === c) continue;
    const odd = a === b ? 2 : a === c ? 1 : b === c ? 0 : -1;
    const last = runs[runs.length - 1];
    if (last && last.to === i - 1 && last.odd === odd) runs[runs.length - 1] = { ...last, to: i };
    else runs.push({ from: i, to: i, odd, reversed: false });
  }
  return {
    offset,
    side: S,
    runs: runs.map((r) => {
      if (r.odd < 0) return r;
      const block = (k: number): readonly string[] => w.slice(r.from + k * S, r.to + 1 + k * S);
      const back = block((r.odd + 1) % 3).map(reverseLetter).reverse();
      const odd = block(r.odd);
      return { ...r, reversed: back.every((x, i) => x === odd[i]) };
    }),
  };
}
