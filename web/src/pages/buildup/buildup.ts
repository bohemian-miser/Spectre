/**
 * The supertiles of a combination built up level by level
 * (`shapes/circuitShapes.ts`), read as tables and circuits.
 *
 * A supertile type's table at a level lists, for each crossing on its
 * border, the crossing a strand entering there leaves by and the tiles it
 * takes on the way. A level's tables are made from the tables of the
 * children one level down, as each type lays out its children; a strand
 * that closes up inside a supertile instead of reaching its border is a
 * circuit closing at that level. Types whose tables are identical behave
 * the same from outside, though they are built differently inside.
 *
 * A crossing's address is the tile and edge it sits on: the slots from the
 * supertile down to that tile, and the tile's edge.
 */
import { circuitKey, type Address, type HexType, type Link, type Pt } from '../../core';
import { familyOf, type BornCircuit, type CircuitShapes } from '../shapes/circuitShapes';

/** A type's table at a level: its crossings (places of the level), where the level's places sit, and each route as [from, to, tiles], once per pair. */
export interface Table {
  readonly type: HexType;
  readonly crossings: Int32Array;
  /** Every place of the level, in the frame the level's types share. */
  readonly pts: readonly Pt[];
  readonly routes: readonly (readonly [number, number, number])[];
}

export interface Level {
  readonly level: number;
  readonly tables: readonly Table[];
  /** Types with identical tables, together. */
  readonly groups: readonly (readonly HexType[])[];
}

const routesOf = (cs: CircuitShapes, level: number, type: string): [number, number, number][] => {
  const T = cs.levels[level][type];
  const routes: [number, number, number][] = [];
  for (const k of T.crossings()) {
    const m = T.mate(k);
    if (m > k) routes.push([k, m, T.len(k)]);
  }
  return routes;
};

const hashOf = (xs: Float64Array): number => {
  let h = 2166136261;
  for (let i = 0; i < xs.length; i++) h = Math.imul(h ^ xs[i], 16777619);
  return h >>> 0;
};

/** The types with identical tables: the same places, joined the same way, through as many tiles. */
export function groupsAt(cs: CircuitShapes, level: number): HexType[][] {
  const byHash = new Map<number, { content: Float64Array; types: HexType[] }[]>();
  for (const type of Object.keys(cs.levels[level]) as HexType[]) {
    const T = cs.levels[level][type];
    const crossings = T.crossings();
    let routes = 0;
    for (const k of crossings) if (T.mate(k) > k) routes++;
    const content = new Float64Array(crossings.length + 1 + 3 * routes);
    content.set(crossings);
    content[crossings.length] = -1;
    let at = crossings.length + 1;
    for (const k of crossings) {
      const m = T.mate(k);
      if (m <= k) continue;
      content[at++] = k;
      content[at++] = m;
      content[at++] = T.len(k);
    }
    const h = hashOf(content);
    const bucket = byHash.get(h) ?? byHash.set(h, []).get(h)!;
    const same = bucket.find((g) => g.content.length === content.length && g.content.every((x, i) => x === content[i]));
    if (same) same.types.push(type);
    else bucket.push({ content, types: [type] });
  }
  return [...byHash.values()].flat().map((g) => g.types);
}

export function tablesAt(cs: CircuitShapes, level: number): Level {
  const types = Object.keys(cs.levels[level]) as HexType[];
  const tables = types.map((type) => ({ type, crossings: cs.levels[level][type].crossings(), pts: cs.levels[level][type].pts, routes: routesOf(cs, level, type) }));
  return { level, tables, groups: groupsAt(cs, level) };
}

/** The tile and edge crossing k of a level-n supertile of this type sits on. */
export function crossingAddress(cs: CircuitShapes, level: number, type: HexType, k: number): { address: Address; edge: number } {
  const links: Link[] = [];
  let t: string = type;
  let p = k;
  for (let n = level; n > 0; n--) {
    const child = cs.childOf(n, t, cs.levels[n][t].level.under[p]);
    links.unshift({ slot: child.pos, parent: t as HexType });
    t = child.type;
    p = child.k;
  }
  return { address: { leaf: t as HexType, path: links }, edge: cs.crossingEdge(t, p) };
}

/** A circuit closing at a level: the first of its kind kept, with the types it closed in and whether it closed lower down already. */
export interface Closing {
  readonly key: string;
  readonly length: number;
  readonly family: string;
  readonly circuit: BornCircuit;
  /** Types (of the supertile it closes in) it closes in at this level, with copies. */
  readonly types: readonly HexType[];
  readonly copies: number;
  /** The lowest level it closes at. */
  readonly first: number;
}

/** Each circuit's key, worked out once: a big circuit's word runs to millions of tiles. */
const keyOf = new WeakMap<BornCircuit, string>();
const codesKeyOf = new WeakMap<BornCircuit, string>();

/** Index of the least rotation of `s` (Booth's algorithm, as `leastRotation` in `core/circuitWord.ts`). */
function leastRotationOf(s: Uint16Array): number {
  const n = s.length;
  const f = new Int32Array(2 * n).fill(-1);
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

/** A word as numbers (`CircuitShapes.wordCodes`) from the tile where it reads least, in the direction that reads least: equal exactly when the circuits' words are (`circuitKey`). */
export function canonicalCodes(w: Uint16Array): Uint16Array {
  const n = w.length;
  const rotated = (s: Uint16Array, r: number) => {
    const out = new Uint16Array(n);
    out.set(s.subarray(r));
    out.set(s.subarray(0, r), n - r);
    return out;
  };
  // walked the other way round: the tiles in reverse, each entered by its exit
  const back = new Uint16Array(n);
  for (let i = 0; i < n; i++) {
    const c = w[n - 1 - i];
    back[i] = (c & ~63) | ((c & 7) << 3) | ((c >> 3) & 7);
  }
  const f = rotated(w, leastRotationOf(w));
  const b = rotated(back, leastRotationOf(back));
  for (let i = 0; i < n; i++) if (f[i] !== b[i]) return f[i] < b[i] ? f : b;
  return f;
}

/** Canonical words met so far, by length and hash, so a key stands for one word only. */
const wordsByHash = new Map<string, Uint16Array[]>();

/** A circuit's key: its length and a hash of its canonical word, told apart from any other word with the same hash. */
export function codeKey(w: Uint16Array): string {
  const c = canonicalCodes(w);
  let h1 = 2166136261, h2 = 0x9e3779b9;
  for (let i = 0; i < c.length; i++) {
    h1 = Math.imul(h1 ^ c[i], 16777619);
    h2 = Math.imul(h2 ^ c[i], 0x85ebca6b) + i;
  }
  const at = `${c.length}:${(h1 >>> 0).toString(36)}${(h2 >>> 0).toString(36)}`;
  const seen = wordsByHash.get(at) ?? wordsByHash.set(at, []).get(at)!;
  let i = seen.findIndex((o) => o.length === c.length && o.every((x, q) => x === c[q]));
  if (i < 0) i = seen.push(c) - 1;
  return i === 0 ? at : `${at}/${i}`;
}

/** The circuits closing at each level up to the last built, keyed by their words (`codeKey`). */
export function closingsByLevel(cs: CircuitShapes): Closing[][] {
  const firstSeen = new Map<string, number>();
  const out: Closing[][] = [];
  for (let n = 0; n <= cs.maxLevel; n++) {
    const at = new Map<string, { circuit: BornCircuit; types: Set<HexType>; copies: number }>();
    for (const c of cs.born) {
      if (c.level !== n) continue;
      const key = codesKeyOf.get(c) ?? codeKey(cs.wordCodes(c));
      codesKeyOf.set(c, key);
      const e = at.get(key) ?? at.set(key, { circuit: c, types: new Set(), copies: 0 }).get(key)!;
      e.types.add(c.type as HexType);
      e.copies++;
    }
    for (const key of at.keys()) if (!firstSeen.has(key)) firstSeen.set(key, n);
    out.push([...at].map(([key, e]) => ({
      key, length: e.circuit.length, family: familyOf(e.circuit), circuit: e.circuit, types: [...e.types], copies: e.copies, first: firstSeen.get(key)!,
    })).sort((a, b) => a.length - b.length));
  }
  return out;
}

/** Where a circuit first closes as the supertiles are built up: the level, its family there, and the types it closes in. */
export interface FirstClosing {
  readonly level: number;
  readonly family: string;
  readonly types: readonly HexType[];
}

/**
 * The lowest level each of these circuits closes at (`closingsByLevel`'s
 * `first`), building levels only until every one has closed or `upTo` is
 * built. Only circuits of the lengths asked for are read as words. Where a
 * circuit closes in several types at its first level, its family is the
 * Delta's, the copy `CircuitShapes` keeps with `onePerLength`. A circuit
 * that has not closed by `upTo` is left out.
 */
export function firstClosings(cs: CircuitShapes, circuits: readonly { readonly key: string; readonly length: number }[], upTo: number): Map<string, FirstClosing> {
  const out = new Map<string, FirstClosing>();
  const left = new Map<number, Set<string>>();
  for (const c of circuits) (left.get(c.length) ?? left.set(c.length, new Set()).get(c.length)!).add(c.key);
  for (let n = 0; n <= upTo && left.size > 0; n++) {
    if (n > cs.maxLevel) cs.extend(n);
    const at = new Map<string, { circuit: BornCircuit; types: Set<HexType> }>();
    for (const c of cs.born) {
      const keys = c.level === n ? left.get(c.length) : undefined;
      if (!keys) continue;
      const key = keyOf.get(c) ?? circuitKey(cs.word(c));
      keyOf.set(c, key);
      if (!keys.has(key)) continue;
      const e = at.get(key) ?? at.set(key, { circuit: c, types: new Set() }).get(key)!;
      if (c.type === 'Delta' && e.circuit.type !== 'Delta') e.circuit = c;
      e.types.add(c.type as HexType);
    }
    for (const [key, e] of at) {
      out.set(key, { level: n, family: familyOf(e.circuit), types: [...e.types] });
      const keys = left.get(e.circuit.length)!;
      keys.delete(key);
      if (keys.size === 0) left.delete(e.circuit.length);
    }
  }
  return out;
}
