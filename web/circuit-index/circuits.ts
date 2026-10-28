/**
 * The distinct circuits of one combination, up to a level, each measured.
 *
 * Level by level, every supertile type's board (`board.ts`) is traced, and
 * its circuits are told apart by `circuitKey`. A circuit's level is the
 * lowest at which some supertile holds it; its roots are the types that do
 * at that level. Collection stops after the level at which `maxCircuits` is
 * passed.
 */
import { HEX_TYPES, letter, zToPt, type Address, type HexType } from '../src/core';
import { pairingTable, patternOf } from '../src/pages/walker/walk';
import { addressOf, board, traceAll, typeOf } from './board';
import { canonicalWord, centre6, placedKey, placedOf, shortId, wordOrder } from './keys';
import { armDistances, encode, fitCorners, segmentProfile, type Arms, type CornerFit, type Segments } from './sides';

export interface Found {
  readonly key: string;
  readonly word: readonly string[];
  readonly tiles: readonly Address[];
  readonly level: number;
  readonly roots: HexType[];
  /** Copies in the supertiles of the circuit's level, over all roots. */
  copies: number;
}

export interface Collected {
  readonly circuits: readonly Found[];
  /** Highest level traced. */
  readonly level: number;
  /** Open strands of the Delta supertile at that level. */
  readonly open: number;
  readonly longestOpen: number;
}

export function collect(subset: readonly number[], combo: string, maxLevel: number, maxCircuits = 1000, maxLength = 10000): Collected {
  const table = pairingTable(patternOf(subset, combo));
  const found = new Map<string, Found>();
  let open = 0;
  let longestOpen = 0;
  let level = 0;
  for (let L = 1; L <= maxLevel && found.size < maxCircuits; L++) {
    level = L;
    open = 0;
    longestOpen = 0;
    for (const root of HEX_TYPES) {
      const b = board(root, L);
      for (const s of traceAll(b, table, maxLength)) {
        if (s.kind === 'open') {
          if (root === 'Delta') { open++; longestOpen = Math.max(longestOpen, s.tiles.length); }
          continue;
        }
        const word = Array.from(s.tiles, (t, i) => letter(typeOf(b, t), s.entries[i], s.exits[i]));
        const key = canonicalWord(word).word.join('');
        const f = found.get(key);
        if (!f) found.set(key, { key, word, tiles: Array.from(s.tiles, (t) => addressOf(b, t)), level: L, roots: [root], copies: 1 });
        else if (f.level === L) { if (!f.roots.includes(root)) f.roots.push(root); f.copies++; }
      }
    }
  }
  return { circuits: [...found.values()].sort((a, b) => a.word.length - b.word.length || (a.key < b.key ? -1 : 1)), level, open, longestOpen };
}

export interface Measured {
  readonly id: string;
  readonly length: number;
  /** Times the word repeats round the circuit. */
  readonly order: number;
  /** Corners as positions in the canonical word. */
  readonly corners: CornerFit;
  readonly cornerLetters: readonly string[];
  readonly cornerId: string;
  readonly tilesId: string;
  readonly arms: Arms;
  readonly segments: readonly Segments[];
}

/** The circuit read in canonical order: its least rotation, in its least direction. */
export function canonical(c: Pick<Found, 'word' | 'tiles'>): { word: string[]; tiles: Address[] } {
  const can = canonicalWord(c.word);
  const tiles = can.reversed ? [...c.tiles].reverse() : [...c.tiles];
  return { word: can.word, tiles: [...tiles.slice(can.offset), ...tiles.slice(0, can.offset)] };
}

/** `maxK` below 2 skips the equal-part profile. */
export function measure(c: Pick<Found, 'key' | 'word' | 'tiles'>, k = 3, maxK = 12): Measured {
  const { word, tiles } = canonical(c);
  const n = word.length;
  const placed = tiles.map(placedOf);
  const pts = placed.map((p) => { const q = zToPt(centre6(p.T)); return { x: q.x / 6, y: q.y / 6 }; });
  const corners = fitCorners(pts, k);
  const [w] = encode([word]);
  const ks: number[] = [];
  for (let j = 2; j * j <= n && j <= maxK; j++) ks.push(j);
  return {
    id: shortId(c.key),
    length: n,
    order: wordOrder(word),
    corners,
    cornerLetters: corners.corners.map((i) => word[i]),
    cornerId: shortId(placedKey(corners.corners.map((i) => placed[i]))),
    tilesId: shortId(placedKey(placed)),
    arms: armDistances(w, corners.corners),
    segments: segmentProfile(w, ks),
  };
}
