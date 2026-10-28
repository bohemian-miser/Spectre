/**
 * The distinct circuits of one combination, up to a level, each measured.
 *
 * Level by level, every supertile type's board (`board.ts`) is traced, and
 * its circuits are told apart by `circuitKey`. A circuit's level is the
 * lowest at which some supertile holds it; its roots are the types that do
 * at that level, and its copies are where it sits in them. Collection stops
 * after the level at which `maxCircuits` is passed.
 *
 * A corner is written as its slot chain: the tile's type, then for each level
 * up the slot it sits in and the parent's type, in compact letters
 * (`Ph<6Pi<0G<7`: a Phi in slot 6 of a Pi, in slot 0 of a Gamma, which sits
 * in slot 7). The chain goes up as far as every copy of the circuit agrees;
 * where the slot still agrees but the parent's type does not, it ends with
 * the bare slot.
 */
import { HEX_TYPES, zToPt, type Address, type HexType } from '../src/core';
import { pairingTable, patternOf } from '../src/pages/walker/walk';
import { addressOf, board, traceAll, typeOf, type Board } from './board';
import { TYPE_PREFIX, canonicalWord, centre6, placedOf, tileLetter, wordOrder } from './keys';
import { armDistances, encode, fitCorners, segmentProfile, type Arms, type CornerFit, type Segments } from './sides';

export interface Found {
  readonly key: string;
  readonly word: readonly string[];
  readonly tiles: readonly Address[];
  readonly level: number;
  readonly roots: HexType[];
  /** Copies in the supertiles of the circuit's level, over all roots. */
  copies: number;
  /** Where each copy sits: its board and tiles, and how its walk is turned into the canonical word. */
  readonly at: Copy[];
}

export interface Copy { readonly board: Board; readonly tiles: Int32Array; readonly offset: number; readonly reversed: boolean }

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
        const word = Array.from(s.tiles, (t, i) => tileLetter(typeOf(b, t), s.entries[i], s.exits[i]));
        const can = canonicalWord(word);
        const key = can.word.join('');
        const copy: Copy = { board: b, tiles: s.tiles, offset: can.offset, reversed: can.reversed };
        const f = found.get(key);
        if (!f) found.set(key, { key, word, tiles: Array.from(s.tiles, (t) => addressOf(b, t)), level: L, roots: [root], copies: 1, at: [copy] });
        else if (f.level === L) { if (!f.roots.includes(root)) f.roots.push(root); f.copies++; f.at.push(copy); }
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
    id: c.key,
    length: n,
    order: wordOrder(word),
    corners,
    cornerLetters: corners.corners.map((i) => word[i]),
    arms: armDistances(w, corners.corners),
    segments: segmentProfile(w, ks),
  };
}

/** The board tile of a copy at a position of the canonical word. */
export const copyTile = (c: Copy, p: number): number => {
  const n = c.tiles.length;
  return c.reversed ? c.tiles[n - 1 - ((p + c.offset) % n)] : c.tiles[(p + c.offset) % n];
};

/**
 * Each corner's slot chain, as far up as every copy agrees. Positions one
 * period of the word apart are the same corner turned, so their chains are
 * agreed together.
 */
export function cornerChains(f: Found, corners: readonly number[]): string[] {
  const n = f.word.length;
  const period = n / wordOrder(canonicalWord(f.word).word);
  const chainOf = (positions: readonly number[]): string => {
    const addrs = f.at.flatMap((c) => positions.map((p) => addressOf(c.board, copyTile(c, p))));
    let out: string = TYPE_PREFIX[addrs[0].leaf];
    for (let k = 0; k < addrs[0].path.length; k++) {
      const { slot, parent } = addrs[0].path[k];
      if (!addrs.every((a) => a.path[k]?.slot === slot)) break;
      if (!addrs.every((a) => a.path[k].parent === parent)) { out += `<${slot}`; break; }
      out += `<${slot}${TYPE_PREFIX[parent]}`;
    }
    return out;
  };
  return corners.map((p) => chainOf(corners.filter((q) => (q - p) % period === 0)));
}
