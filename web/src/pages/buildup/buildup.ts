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
import { buildSystem, circuitKey, type Address, type HexType, type Link, type MetaNode, type Pt } from '../../core';
import { familyOf, type BornCircuit, type CircuitShapes } from '../shapes/circuitShapes';

interface Layer {
  readonly pts: readonly Pt[];
  readonly mate: Int32Array;
  readonly arcLen: Float64Array;
  readonly outlineChild: Int32Array;
  readonly owner: Int32Array;
  readonly local: Int32Array;
}

const layer = (cs: CircuitShapes, level: number, type: string): Layer => (cs.levels[level] as unknown as Record<string, Layer>)[type];

/** A type's table at a level: its crossings (positions in its own frame) and each route as [from, to, tiles], once per pair. */
export interface Table {
  readonly type: HexType;
  readonly pts: readonly Pt[];
  readonly routes: readonly (readonly [number, number, number])[];
}

export interface Level {
  readonly level: number;
  readonly tables: readonly Table[];
  /** Types with identical tables, together. */
  readonly groups: readonly (readonly HexType[])[];
}

/** Positions to 1/64 and the routes, as one list of integers. */
const contentOf = (pts: readonly Pt[], routes: readonly (readonly [number, number, number])[]): Float64Array => {
  const out = new Float64Array(2 * pts.length + 3 * routes.length + 1);
  let i = 0;
  for (const p of pts) { out[i++] = Math.round(p.x * 64); out[i++] = Math.round(p.y * 64); }
  out[i++] = -1;
  for (const r of routes) { out[i++] = r[0]; out[i++] = r[1]; out[i++] = r[2]; }
  return out;
};

const hashOf = (xs: Float64Array): number => {
  let h = 2166136261;
  for (let i = 0; i < xs.length; i++) h = Math.imul(h ^ (xs[i] | 0), 16777619);
  return h >>> 0;
};

const sameContent = (a: Float64Array, b: Float64Array): boolean => a.length === b.length && a.every((x, i) => x === b[i]);

export function tablesAt(cs: CircuitShapes, level: number): Level {
  const types = Object.keys(cs.levels[level]) as HexType[];
  // same crossings in the same places, joined the same way, through as many tiles
  const byHash = new Map<number, { content: Float64Array; types: HexType[] }[]>();
  const tables = types.map((type) => {
    const L = layer(cs, level, type);
    const routes: [number, number, number][] = [];
    L.mate.forEach((m, i) => { if (m > i) routes.push([i, m, L.arcLen[i]]); });
    const content = contentOf(L.pts, routes);
    const bucket = byHash.get(hashOf(content)) ?? byHash.set(hashOf(content), []).get(hashOf(content))!;
    const same = bucket.find((g) => sameContent(g.content, content));
    if (same) same.types.push(type);
    else bucket.push({ content, types: [type] });
    return { type, pts: L.pts, routes };
  });
  return { level, tables, groups: [...byHash.values()].flat().map((g) => g.types) };
}

/** The tile and edge crossing k of a level-n supertile of this type sits on. */
export function crossingAddress(cs: CircuitShapes, level: number, type: HexType, k: number): { address: Address; edge: number } {
  const links: Link[] = [];
  let t: string = type;
  let i = k;
  for (let n = level; n > 0; n--) {
    const L = layer(cs, n, t);
    const g = L.outlineChild[i];
    const child = (buildSystem(cs.family, n)[t] as MetaNode).children[L.owner[g]];
    links.unshift({ slot: child.pos, parent: t as HexType });
    t = child.node.type;
    i = L.local[g];
  }
  return { address: { leaf: t as HexType, path: links }, edge: cs.crossingEdge(t, i) };
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

/** The circuits closing at each level up to the last built, keyed by their words (`core/circuitWord.ts`). */
export function closingsByLevel(cs: CircuitShapes): Closing[][] {
  const firstSeen = new Map<string, number>();
  const keyOf = new Map<BornCircuit, string>();
  const out: Closing[][] = [];
  for (let n = 0; n <= cs.maxLevel; n++) {
    const at = new Map<string, { circuit: BornCircuit; types: Set<HexType>; copies: number }>();
    for (const c of cs.born) {
      if (c.level !== n) continue;
      const key = keyOf.get(c) ?? circuitKey(cs.word(c));
      keyOf.set(c, key);
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
