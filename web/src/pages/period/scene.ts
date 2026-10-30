/**
 * What the animation draws: a level-(n + d) supertile of one type as its
 * level-n pieces, each with its border (crossings and the routes joining
 * them), the welds where pieces meet, the routes of the big supertile walked
 * through the pieces, the same routes as the big supertile's own table, and
 * that table beside the level-n table of the same type. Every graph also has
 * a drawn-straight form: its crossings spaced evenly along the six edges of a
 * regular hexagon, so two borders with the same crossings joined the same way
 * come out as the same picture.
 *
 * Combinatorics come from `period.ts`; positions from the renormalisation's
 * places (`shapes/circuitShapes.ts`) and the supertiles' transforms.
 */
import {
  buildSystem, childType, mul, transPt, zApply, zKey, zLeafPts, zSupertileTransforms, zToPt,
  type Affine, type HexType, type MetaNode, type Pt, type ZVec,
} from '../../core';
import type { CircuitShapes } from '../shapes/circuitShapes';
import { expand, sameBorder, walkExpansion, type Border, type State } from './period';

/** Points a route is drawn through while it changes shape. */
export const ROUTE_SAMPLES = 96;
const CHORD_SAMPLES = 10;
/** Highest level drawn with its exact outline; higher ones are drawn through their corners and crossings. */
const MAX_OUTLINE_LEVEL = 8;
/** Pull of a route's curve toward the middle of its supertile. */
const BEND = 0.55;

/** A border drawn: positions by border position, corners, outline, routes as [from, to] with from < to. */
export interface Graph {
  readonly type: HexType;
  readonly level: number;
  readonly dots: readonly Pt[];
  readonly corners: readonly Pt[];
  readonly outline: readonly Pt[];
  readonly centre: Pt;
  /** Fitted size: mean distance of the corners from the centre. */
  readonly radius: number;
  /** Farthest the outline reaches from the centre. */
  readonly extent: number;
  readonly routes: readonly (readonly [number, number])[];
  /** The same border drawn straight, round a regular hexagon with the graph's centre and radius. */
  readonly straight: readonly Pt[];
  /** 1 when the corners run anticlockwise, -1 when clockwise; the straight hexagon runs the same way. */
  readonly sense: 1 | -1;
  /** Turn (radians) taking the graph's corner 0 to the straight hexagon's. */
  readonly turn: number;
}

export interface Piece {
  readonly path: readonly number[];
  readonly graph: Graph;
}

export interface Scene {
  readonly type: HexType;
  readonly base: number;
  readonly depth: number;
  readonly pieces: readonly Piece[];
  /** Welded crossings, each pair at one point. */
  readonly welds: readonly Pt[];
  readonly parent: Graph;
  /** The level-n border of the same type. */
  readonly lower: Graph;
  /** Per parent route (in the order of `parent.routes`): its path through the pieces, and the same as the parent's curve, ROUTE_SAMPLES points each. */
  readonly routePaths: readonly { readonly through: readonly Pt[]; readonly own: readonly Pt[] }[];
  /** Closed walks inside, through the pieces. */
  readonly circuits: readonly (readonly Pt[])[];
  /** Whether the parent's border is the lower one's. */
  readonly same: boolean;
  /** Crossings drawn on the pieces. */
  readonly pieceCrossings: number;
}

const lerp = (p: Pt, q: Pt, t: number): Pt => ({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });

/** The curve a route is drawn as: bent toward the middle of its supertile. */
export function routeCurve(p: Pt, q: Pt, c: Pt, samples: number): Pt[] {
  const m = lerp(p, q, 0.5);
  const k = lerp(m, c, BEND);
  return Array.from({ length: samples }, (_, i) => {
    const t = i / (samples - 1);
    const a = (1 - t) * (1 - t), b = 2 * t * (1 - t), d = t * t;
    return { x: a * p.x + b * k.x + d * q.x, y: a * p.y + b * k.y + d * q.y };
  });
}

/** `pts` resampled to `n` points evenly spaced along it. */
export function resample(pts: readonly Pt[], n: number): Pt[] {
  if (pts.length === 1) return Array.from({ length: n }, () => pts[0]);
  const acc = [0];
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const total = acc[acc.length - 1] || 1;
  const out: Pt[] = [];
  let j = 1;
  for (let i = 0; i < n; i++) {
    const s = (total * i) / (n - 1);
    while (j < pts.length - 1 && acc[j] < s) j++;
    const span = acc[j] - acc[j - 1] || 1;
    out.push(lerp(pts[j - 1], pts[j], Math.min(1, Math.max(0, (s - acc[j - 1]) / span))));
  }
  return out;
}

/** A supertile's outline as directed unit edges, cached by level and type. */
const edgeCache = new Map<string, readonly (readonly [ZVec, ZVec])[]>();

/**
 * The outline of a level-n supertile of `type` in its frame, exactly: its
 * children's outlines placed by the level's slot transforms, every edge that
 * two children share (met once each way) cancelled.
 */
function outlineEdges(n: number, type: HexType): readonly (readonly [ZVec, ZVec])[] {
  const key = `${n}/${type}`;
  const hit = edgeCache.get(key);
  if (hit) return hit;
  let out: (readonly [ZVec, ZVec])[];
  if (n === 0) {
    const pts = zLeafPts('hex', type);
    out = pts.map((p, i) => [p, pts[(i + 1) % pts.length]] as const);
  } else {
    const Ts = zSupertileTransforms('hex', n);
    const live = new Map<string, readonly [ZVec, ZVec]>();
    for (let s = 0; s < 8; s++) {
      const c = childType(type, s);
      if (!c) continue;
      for (const [a, b] of outlineEdges(n - 1, c)) {
        const pa = zApply(Ts[s], a), pb = zApply(Ts[s], b);
        const back = `${zKey(pb)}>${zKey(pa)}`;
        if (live.has(back)) live.delete(back);
        else live.set(`${zKey(pa)}>${zKey(pb)}`, [pa, pb]);
      }
    }
    out = [...live.values()];
  }
  edgeCache.set(key, out);
  return out;
}

/** The outline of a level-n supertile of `type` as one closed walk of points, in its frame. */
export function trueOutline(n: number, type: HexType): Pt[] {
  const edges = outlineEdges(n, type);
  const next = new Map<string, ZVec>();
  for (const [a, b] of edges) next.set(zKey(a), b);
  const start = edges[0][0];
  const out: Pt[] = [zToPt(start)];
  let at = edges[0][1];
  for (let i = 0; i < edges.length && zKey(at) !== zKey(start); i++) {
    out.push(zToPt(at));
    at = next.get(zKey(at))!;
  }
  return out;
}

/** Most points an outline is drawn with. */
const OUTLINE_POINTS = 1200;
const thinned = (pts: Pt[]): Pt[] => {
  if (pts.length <= OUTLINE_POINTS) return pts;
  const k = Math.ceil(pts.length / OUTLINE_POINTS);
  return pts.filter((_, i) => i % k === 0);
};

/** Corner 0 of the straight hexagon, at this angle from its centre. */
export const STRAIGHT_START = (5 * Math.PI) / 6;

/** A type's border at a level, drawn in its own frame from the renormalisation's places. */
export function graphOf(cs: CircuitShapes, n: number, type: HexType, border: Border): Graph {
  const places = cs.border(n, type).flatMap((r) => [...r]);
  if (places.length !== border.mate.length) throw new Error(`${type} at level ${n}: ${places.length} places for ${border.mate.length} crossings`);
  const pts = cs.levels[n][type].pts;
  const dots = places.map((p) => pts[p]);
  const corners = Array.from({ length: 6 }, (_, j) => cs.corner(n, type, j));
  const centre = { x: corners.reduce((a, p) => a + p.x, 0) / 6, y: corners.reduce((a, p) => a + p.y, 0) / 6 };
  const radius = corners.reduce((a, p) => a + Math.hypot(p.x - centre.x, p.y - centre.y), 0) / 6;
  let area = 0;
  for (let j = 0; j < 6; j++) area += corners[j].x * corners[(j + 1) % 6].y - corners[(j + 1) % 6].x * corners[j].y;
  const sense = area >= 0 ? 1 : -1;
  const a0 = Math.atan2(corners[0].y - centre.y, corners[0].x - centre.x);
  let turn = STRAIGHT_START - a0;
  while (turn > Math.PI) turn -= 2 * Math.PI;
  while (turn <= -Math.PI) turn += 2 * Math.PI;
  // the straight hexagon, corner j at STRAIGHT_START + j * 60 degrees the way the corners run
  const hex = Array.from({ length: 6 }, (_, j) => {
    const a = STRAIGHT_START + (sense * j * Math.PI) / 3;
    return { x: centre.x + radius * Math.cos(a), y: centre.y + radius * Math.sin(a) };
  });
  const straight: Pt[] = [];
  for (let j = 0; j < 6; j++) {
    const m = border.perEdge[j];
    for (let i = 0; i < m; i++) straight.push(lerp(hex[j], hex[(j + 1) % 6], (i + 1) / (m + 1)));
  }
  const routes: [number, number][] = [];
  border.mate.forEach((q, p) => { if (q > p) routes.push([p, q]); });
  const outline = n <= MAX_OUTLINE_LEVEL ? thinned(trueOutline(n, type)) : cs.outline(n, type);
  const extent = Math.max(radius, ...outline.map((p) => Math.hypot(p.x - centre.x, p.y - centre.y)));
  return { type, level: n, dots, corners, outline, centre, radius, extent, routes, straight, sense, turn };
}

const placed = (g: Graph, x: Affine): Graph => {
  const f = (p: Pt) => transPt(x, p);
  return { ...g, dots: g.dots.map(f), corners: g.corners.map(f), outline: g.outline.map(f), centre: f(g.centre), straight: g.straight.map(f) };
};

/** The transform of the descendant at this slot path, in the frame of a level-`level` supertile of `type`. */
function pathXform(level: number, type: HexType, path: readonly number[]): Affine {
  let x: Affine = [1, 0, 0, 0, 1, 0];
  let t: string = type;
  path.forEach((s, i) => {
    const ch = (buildSystem('hex', level - i)[t] as MetaNode).children.find((c) => c.pos === s)!;
    x = mul(x, ch.xform as Affine);
    t = ch.node.type;
  });
  return x;
}

/** A level-(n + depth) supertile of `type` as its level-n pieces. `cs` must be built to level n + depth. */
export function buildScene(cs: CircuitShapes, states: readonly State[], n: number, depth: number, type: HexType): Scene {
  const top = n + depth;
  const x = expand(states, top, type, depth);
  const pieces = x.pieces.map((p) => ({ path: p.path, graph: placed(graphOf(cs, n, p.type, states[n][p.type]), pathXform(top, type, p.path)) }));
  const parent = graphOf(cs, top, type, states[top][type]);
  const lower = graphOf(cs, n, type, states[n][type]);
  const walked = walkExpansion(x, (i) => states[n][x.pieces[i].type]);
  const chordPts = (piece: number, pos: number): Pt[] => {
    const g = pieces[piece].graph;
    return routeCurve(g.dots[pos], g.dots[states[n][x.pieces[piece].type].mate[pos]], g.centre, CHORD_SAMPLES);
  };
  const byFrom = new Map(walked.routes.map((r) => [Math.min(r.from, r.to), r]));
  const routePaths = parent.routes.map(([p, q]) => {
    const r = byFrom.get(p);
    if (!r || Math.max(r.from, r.to) !== q) throw new Error(`${type}: walking the pieces does not give route ${p}–${q}`);
    const through = r.enters.flatMap((c) => chordPts(c.piece, c.pos));
    if (r.from !== p) through.reverse();
    return { through: resample(through, ROUTE_SAMPLES), own: routeCurve(parent.dots[p], parent.dots[q], parent.centre, ROUTE_SAMPLES) };
  });
  const circuits = walked.circuits.map((w) => w.flatMap((c) => chordPts(c.piece, c.pos)));
  const welds = x.welds.map(([a]) => pieces[a.piece].graph.dots[a.pos]);
  return {
    type, base: n, depth, pieces, welds, parent, lower, routePaths, circuits,
    same: sameBorder(states[top][type], states[n][type]),
    pieceCrossings: pieces.reduce((a, p) => a + p.graph.dots.length, 0),
  };
}

/** Crossings the pieces of a level-(n + depth) supertile carry, before building its scene. */
export function pieceCrossings(states: readonly State[], n: number, depth: number, type: HexType): number {
  return expand(states, n + depth, type, depth).pieces.reduce((a, p) => a + states[n][p.type].mate.length, 0);
}
