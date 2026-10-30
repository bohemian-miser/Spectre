/**
 * A level's tables read as the common table plus each type's own entries,
 * and a route read as the child arcs it is made of (`shapes/circuitShapes.ts`).
 *
 * A route of a level-n supertile runs through a sequence of its children,
 * entering each at one of the child's places and leaving at that place's
 * mate. Its composition is the sequence of child types, runs of one type
 * written once with their count (`Xi Delta×2 Phi`); its shape is the same
 * sequence with the counts dropped (`Xi Delta Phi`).
 */
import { buildSystem, transPt, type Affine, type HexType, type MetaNode, type Pt } from '../../core';
import { hexCorners } from '../../core/multiEdge';
import type { CircuitShapes } from '../shapes/circuitShapes';

export type Route = readonly [number, number, number];

/** The level's common table: every place, and each common entry as a route once per pair. */
export interface Common {
  readonly places: Int32Array;
  readonly routes: Route[];
  /** Places whose common mate does not lead back to them (their two ends are common in different types). */
  readonly oneSided: number;
}

export function commonTable(cs: CircuitShapes, n: number): Common {
  const L = Object.values(cs.levels[n])[0].level;
  const routes: Route[] = [];
  let oneSided = 0;
  for (let p = 0; p < L.size; p++) {
    const m = L.mate[p];
    if (m < 0) continue;
    if (L.mate[m] !== p) {
      oneSided++;
      routes.push([p, m, L.arcLen[p]]);
    } else if (m > p) routes.push([p, m, L.arcLen[p]]);
  }
  return { places: Int32Array.from({ length: L.size }, (_, p) => p), routes, oneSided };
}

/** What a type has of its own at a level: its overrides as routes, and the places it does not have. */
export interface OwnPart {
  readonly type: HexType;
  /** Overrides, by place. */
  readonly places: Int32Array;
  /** The overrides as routes [place, its mate, tiles], once per pair. */
  readonly routes: Route[];
  /** Overrides that keep the common mate and tiles and differ only in the route through the children. */
  readonly inside: number;
  readonly absent: Int32Array;
}

export function ownPart(cs: CircuitShapes, n: number, type: HexType): OwnPart {
  const T = cs.levels[n][type];
  const L = T.level;
  const places: number[] = [];
  const routes: Route[] = [];
  const seen = new Set<string>();
  let inside = 0;
  for (const [k, o] of T.ownEntries()) {
    places.push(k);
    if (o.mate === L.mate[k] && o.len === L.arcLen[k]) inside++;
    if (o.mate < 0) continue;
    const a = Math.min(k, o.mate), b = Math.max(k, o.mate);
    if (!seen.has(`${a} ${b}`)) {
      seen.add(`${a} ${b}`);
      routes.push([a, b, o.len]);
    }
  }
  const absent: number[] = [];
  for (let p = 0; p < T.size; p++) if (!T.has(p)) absent.push(p);
  return { type, places: Int32Array.from(places.sort((x, y) => x - y)), routes, inside, absent: Int32Array.from(absent) };
}

/** A type's table rebuilt from the level's common arrays, its overrides and its presence: mate (-1 where absent) and tiles per place. */
export function rebuilt(cs: CircuitShapes, n: number, type: string): { mate: Int32Array; len: Float64Array } {
  const T = cs.levels[n][type];
  const L = T.level;
  const mate = new Int32Array(L.size).fill(-1);
  const len = new Float64Array(L.size);
  for (let p = 0; p < L.size; p++) {
    if (!T.has(p)) continue;
    mate[p] = L.mate[p];
    len[p] = L.arcLen[p];
  }
  for (const [k, o] of T.ownEntries()) {
    mate[k] = o.mate;
    len[k] = o.len;
  }
  return { mate, len };
}

/** One child arc of a route: the child's slot and type, the place it enters by and leaves by (the child's places), and its tiles. */
export interface ChildArc {
  readonly slot: number;
  readonly type: HexType;
  readonly from: number;
  readonly to: number;
  readonly tiles: number;
}

/** The child arcs of the level-n arc of `type` from place k, in the order the strand meets them. */
export function childArcs(cs: CircuitShapes, n: number, type: string, k: number): ChildArc[] {
  return cs.enters(n, type, k).map((e) => {
    const C = cs.levels[n - 1][e.type];
    return { slot: e.slot, type: e.type as HexType, from: e.k, to: C.mate(e.k), tiles: C.len(e.k) };
  });
}

const runs = (types: readonly string[]): [string, number][] => {
  const out: [string, number][] = [];
  for (const t of types) {
    const last = out[out.length - 1];
    if (last && last[0] === t) last[1]++;
    else out.push([t, 1]);
  }
  return out;
};

/** Child types in order, runs of one type written once with their count. */
export const composition = (types: readonly string[]): string => runs(types).map(([t, c]) => (c > 1 ? `${t}×${c}` : t)).join(' ');

/** Child types in order, runs of one type written once. */
export const shapeOf = (types: readonly string[]): string => runs(types).map(([t]) => t).join(' ');

/** A route read from either end: the composition of the direction that sorts first, so a route has one name. */
export function routeName(types: readonly string[]): { composition: string; shape: string } {
  const back = [...types].reverse();
  const a = composition(types), b = composition(back);
  return a <= b ? { composition: a, shape: shapeOf(types) } : { composition: b, shape: shapeOf(back) };
}

/** Routes of one composition at a level. */
export interface CompositionGroup {
  readonly composition: string;
  readonly shape: string;
  readonly count: number;
  /** The most tiles among its routes. */
  readonly most: number;
}

/** A type's routes at one level: how many, the longest, and the routes grouped by composition (most routes first). */
export interface LevelRoutes {
  readonly level: number;
  readonly routes: number;
  readonly longest: { readonly from: number; readonly to: number; readonly tiles: number; readonly composition: string; readonly shape: string }[];
  readonly groups: CompositionGroup[];
}

export function levelRoutes(cs: CircuitShapes, n: number, type: string, longest = 4): LevelRoutes {
  const T = cs.levels[n][type];
  const kids: string[] = [];
  for (const ch of (buildSystem(cs.family, n)[type] as MetaNode).children) kids[ch.pos] = ch.node.type;
  const groups = new Map<string, { composition: string; shape: string; count: number; most: number }>();
  const all: LevelRoutes['longest'][number][] = [];
  for (const k of T.crossings()) {
    const m = T.mate(k);
    if (m <= k) continue;
    const { steps, forward } = T.route(k);
    const types = Array.from(steps, (s) => kids[s & 7]);
    if (!forward) types.reverse();
    const name = routeName(types);
    const tiles = T.len(k);
    const g = groups.get(name.composition) ?? groups.set(name.composition, { ...name, count: 0, most: 0 }).get(name.composition)!;
    g.count++;
    g.most = Math.max(g.most, tiles);
    all.push({ from: k, to: m, tiles, ...name });
  }
  all.sort((a, b) => b.tiles - a.tiles || a.from - b.from);
  return {
    level: n,
    routes: all.length,
    longest: all.slice(0, longest),
    groups: [...groups.values()].sort((a, b) => b.count - a.count || b.most - a.most || a.composition.localeCompare(b.composition)),
  };
}

/** How many level-`stop` arcs the level-n arc from k is drawn with, counted up to `limit`. */
function chords(cs: CircuitShapes, n: number, type: string, k: number, stop: number, limit: number): number {
  if (n <= stop) return 1;
  let c = 0;
  for (const e of cs.enters(n, type, k)) {
    c += chords(cs, n - 1, e.type, e.k, stop, limit - c);
    if (c > limit) break;
  }
  return c;
}

/** The deepest level a level-n arc can be drawn down to in at most `budget` chords. */
export function drawLevel(cs: CircuitShapes, n: number, type: string, k: number, budget: number): number {
  let stop = n - 1;
  while (stop > 0 && chords(cs, n, type, k, stop - 1, budget) <= budget) stop--;
  return stop;
}

/** A child of a level-n supertile as drawn: its slot, type, outline (through its border places in order, or the hexagon at level 0) and transform. */
export interface ChildShape {
  readonly slot: number;
  readonly type: HexType;
  readonly xform: Affine;
  readonly outline: Pt[];
}

/** The children of a level-n `type` in its frame, each outline through at most `budget` of its border places. */
export function childShapes(cs: CircuitShapes, n: number, type: string, budget = 400): ChildShape[] {
  return (buildSystem(cs.family, n)[type] as MetaNode).children.map((ch) => {
    const x = ch.xform as Affine;
    const ct = ch.node.type;
    let outline: Pt[];
    if (n === 1) outline = hexCorners(x);
    else {
      const ring = cs.border(n - 1, ct).flatMap((row) => Array.from(row));
      const every = Math.max(1, Math.ceil(ring.length / budget));
      const pts = cs.levels[n - 1][ct].pts;
      outline = ring.filter((_, i) => i % every === 0).map((p) => transPt(x, pts[p]));
    }
    return { slot: ch.pos, type: ct as HexType, xform: x, outline };
  });
}

/** The route from place k of a level-n `type`, one polyline per child arc (each ending where the next begins), drawn down to level `stop`. */
export function routePieces(cs: CircuitShapes, n: number, type: string, k: number, stop: number): Pt[][] {
  const kids: Affine[] = [];
  for (const ch of (buildSystem(cs.family, n)[type] as MetaNode).children) kids[ch.pos] = ch.xform as Affine;
  return cs.enters(n, type, k).map((e) => {
    const out: Pt[] = [];
    const x = kids[e.slot];
    cs.arc(n - 1, e.type, e.k, x, stop, out);
    const C = cs.levels[n - 1][e.type];
    out.push(transPt(x, C.pts[C.mate(e.k)]));
    return out;
  });
}
