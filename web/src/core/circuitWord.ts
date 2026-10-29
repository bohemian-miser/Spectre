/**
 * A circuit's word, and the key that says which circuit it is.
 *
 * A circuit is written as its word: one letter per tile, the shortest prefix
 * of the tile type's name that no other type shares, then the entry and exit
 * edges (`D23` is a Delta entered by edge 2 and left by edge 3; `Ph50`,
 * `Ps01`). The letter does not change when the tile is turned, so a circuit
 * moved anywhere in the tiling has the same word.
 *
 * `circuitKey` reads the word from the tile where it reads least, in the
 * direction that reads least: two circuits have the same key exactly when
 * one is the other moved. Every page names circuits by it: the circuit
 * index, the walker's search, and the renormalisation's circuits
 * (`shapes/circuitShapes.ts`).
 */
import type { HexType } from './transducer';
import { reverseLetter } from './circuitSides';

/** Shortest prefix of each type's name that no other type shares. */
export const TYPE_PREFIX: Readonly<Record<HexType, string>> = {
  Gamma: 'G', Delta: 'D', Theta: 'T', Lambda: 'L', Xi: 'X', Pi: 'Pi', Sigma: 'S', Phi: 'Ph', Psi: 'Ps',
};

/** A circuit tile's letter: type prefix, entry edge, exit edge. */
export const tileLetter = (type: HexType, entry: number, exit: number): string => `${TYPE_PREFIX[type]}${entry}${exit}`;

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
