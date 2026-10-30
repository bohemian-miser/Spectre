/**
 * What the animation draws, one step at a time: every type's supertile at
 * level n with its border (crossings, and the routes joining them), and every
 * type's supertile at level n + d as its level-n pieces, each piece a copy of
 * the level-n supertile of its type placed by the substitution's transforms,
 * with the parent's routes walked through the pieces' routes and the same
 * routes as the parent's own.
 *
 * Combinatorics come from `period.ts`; positions from the renormalisation's
 * places (`shapes/circuitShapes.ts`), the supertiles' transforms, and exact
 * outlines in Z[zeta12].
 */
import {
  HEX_TYPES, buildSystem, childType, mul, transPt, zApply, zKey, zLeafPts, zSupertileTransforms, zToPt,
  type Affine, type HexType, type MetaNode, type Pt, type ZVec,
} from '../../core';
import type { CircuitShapes } from '../shapes/circuitShapes';
import { expand, sameState, walkExpansion, type Border, type State } from './period';

/** Points a route is drawn through while it changes shape. */
export const ROUTE_SAMPLES = 64;
const CHORD_SAMPLES = 8;
/** Pull of a route's curve toward the middle of its supertile. */
const BEND = 0.55;
/** Outline points the pieces of a step's nine parents are drawn with, together. */
const PIECE_POINTS = 60000;
/** Highest level drawn with its exact outline; higher ones are drawn through their corners and crossings. */
const MAX_OUTLINE_LEVEL = 8;

/** A type's border at a level, drawn in its frame: crossings by border position, outline, routes as [from, to] with from < to. */
export interface Graph {
  readonly type: HexType;
  readonly level: number;
  readonly dots: readonly Pt[];
  readonly outline: readonly Pt[];
  readonly centre: Pt;
  /** Farthest the outline reaches from the centre. */
  readonly extent: number;
  /** The outline's bounding box: middle, width and height. */
  readonly mid: Pt;
  readonly width: number;
  readonly height: number;
  readonly routes: readonly (readonly [number, number])[];
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

/** `pts` cut to at most `n` points, every k-th kept. */
export const thinned = (pts: readonly Pt[], n: number): Pt[] => {
  if (pts.length <= n) return [...pts];
  const k = Math.ceil(pts.length / n);
  return pts.filter((_, i) => i % k === 0);
};

/** A type's border at a level, drawn in its own frame from the renormalisation's places. */
export function graphOf(cs: CircuitShapes, n: number, type: HexType, border: Border, outlinePoints = 1200): Graph {
  const places = cs.border(n, type).flatMap((r) => [...r]);
  if (places.length !== border.mate.length) throw new Error(`${type} at level ${n}: ${places.length} places for ${border.mate.length} crossings`);
  const pts = cs.levels[n][type].pts;
  const dots = places.map((p) => pts[p]);
  const corners = Array.from({ length: 6 }, (_, j) => cs.corner(n, type, j));
  const centre = { x: corners.reduce((a, p) => a + p.x, 0) / 6, y: corners.reduce((a, p) => a + p.y, 0) / 6 };
  const routes: [number, number][] = [];
  border.mate.forEach((q, p) => { if (q > p) routes.push([p, q]); });
  const full = n <= MAX_OUTLINE_LEVEL ? trueOutline(n, type) : cs.outline(n, type);
  const extent = Math.max(...full.map((p) => Math.hypot(p.x - centre.x, p.y - centre.y)));
  const xs = full.map((p) => p.x), ys = full.map((p) => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  return { type, level: n, dots, outline: thinned(full, outlinePoints), centre, extent, routes, mid: { x: (x0 + x1) / 2, y: (y0 + y1) / 2 }, width: x1 - x0, height: y1 - y0 };
}

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

/** A level-(n + d) supertile of one type as its level-n pieces. */
export interface Build {
  readonly type: HexType;
  readonly parent: Graph;
  /** Each piece: its type and the transform from its frame to the parent's. */
  readonly pieces: readonly { readonly type: HexType; readonly xform: Affine }[];
  /** Per parent route (in the order of `parent.routes`): its walk through the pieces and the parent's own curve, ROUTE_SAMPLES points each, in the parent's frame. */
  readonly routePaths: readonly { readonly through: readonly Pt[]; readonly own: readonly Pt[] }[];
  /** Closed walks inside, through the pieces, in the parent's frame. */
  readonly circuits: readonly (readonly Pt[])[];
}

/** One step of the animation: every type at level `from`, and every type at level `to` built from them. */
export interface Step {
  readonly from: number;
  readonly to: number;
  readonly lower: Readonly<Record<HexType, Graph>>;
  /** Each type's level-n outline as the pieces are drawn, cut to keep the pieces of all nine parents drawable. */
  readonly pieceOutline: Readonly<Record<HexType, readonly Pt[]>>;
  readonly builds: Readonly<Record<HexType, Build>>;
  /** The lowest level shown so far, if any, whose borders level `to` repeats. */
  readonly repeats: number | null;
}

/** Crossings the pieces of the nine level-(n + d) supertiles carry together. */
export function stepCrossings(states: readonly State[], n: number, d: number): number {
  let s = 0;
  for (const t of HEX_TYPES) for (const p of expand(states, n + d, t, d).pieces) s += states[n][p.type].mate.length;
  return s;
}

/** The steps from level `from`, `d` levels at a time, `count` of them. `cs` is built up as far as they need. */
export function stepsOf(cs: CircuitShapes, states: readonly State[], from: number, d: number, count: number): Step[] {
  const top = from + d * count;
  if (cs.maxLevel < top) cs.extend(top);
  const graphs = new Map<string, Graph>();
  const graph = (n: number, t: HexType): Graph => {
    const k = `${n}/${t}`;
    return graphs.get(k) ?? graphs.set(k, graphOf(cs, n, t, states[n][t])).get(k)!;
  };
  const steps: Step[] = [];
  for (let j = 0; j < count; j++) {
    const n = from + d * j, to = n + d;
    const builds = {} as Record<HexType, Build>;
    for (const type of HEX_TYPES) {
      const x = expand(states, to, type, d);
      const pieces = x.pieces.map((p) => ({ type: p.type, xform: pathXform(to, type, p.path) }));
      const parent = graph(to, type);
      const walked = walkExpansion(x, (i) => states[n][x.pieces[i].type]);
      const chordPts = (piece: number, pos: number): Pt[] => {
        const g = graph(n, pieces[piece].type), X = pieces[piece].xform;
        const f = (p: Pt) => transPt(X, p);
        return routeCurve(f(g.dots[pos]), f(g.dots[states[n][pieces[piece].type].mate[pos]]), f(g.centre), CHORD_SAMPLES);
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
      builds[type] = { type, parent, pieces, routePaths, circuits };
    }
    let repeats: number | null = null;
    for (let m = from; m < to && repeats === null; m += d) if (sameState(states[m], states[to])) repeats = m;
    const pieces = HEX_TYPES.reduce((a, t) => a + builds[t].pieces.length, 0);
    const pieceOutline = Object.fromEntries(HEX_TYPES.map((t) => [t, thinned(graph(n, t).outline, Math.max(16, Math.floor(PIECE_POINTS / pieces)))])) as Record<HexType, Pt[]>;
    steps.push({ from: n, to, lower: Object.fromEntries(HEX_TYPES.map((t) => [t, graph(n, t)])) as Record<HexType, Graph>, pieceOutline, builds, repeats });
  }
  return steps;
}
