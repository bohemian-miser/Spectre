/**
 * What the line page's animations morph between, as point lists that match
 * one for one. An outline is cut at its six corners and each edge resampled
 * to the same number of points, so edge j of one supertile moves onto edge j
 * of another and a crossing slides along its own edge. A strand inside a
 * supertile is resampled the same way, and so is the route it is pulled
 * tight into.
 */
import type { HexType, Pt } from '../../core';
import type { CircuitShapes } from '../shapes/circuitShapes';
import type { State } from '../period/period';
import { graphOf, resample, routeCurve } from '../period/scene';
import { strandPath, tracePatch } from './strand';

/** Points per edge of an outline. */
const EDGE_POINTS = 48;
/** Points along a strand or route. */
const STRAND_POINTS = 96;

export interface Box { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number }

const boxOf = (pts: readonly Pt[]): Box => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of pts) {
    x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x);
    y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
  }
  return { x0, y0, x1, y1 };
};

/** An outline as its six edges, each from corner j to corner j + 1 and `per` points long, run in the corners' order. */
export function sixEdges(outline: readonly Pt[], corners: readonly Pt[], per: number): Pt[] {
  const near = (pts: readonly Pt[], c: Pt) => {
    let best = 0, bd = Infinity;
    pts.forEach((p, i) => {
      const e = Math.hypot(p.x - c.x, p.y - c.y);
      if (e < bd) { bd = e; best = i; }
    });
    return best;
  };
  let pts = [...outline];
  const N = pts.length;
  let idx = corners.map((c) => near(pts, c));
  if ((idx[1] - idx[0] + N) % N > (idx[5] - idx[0] + N) % N) {
    pts = pts.reverse();
    idx = corners.map((c) => near(pts, c));
  }
  const out: Pt[] = [];
  for (let j = 0; j < 6; j++) {
    const a = idx[j], b = idx[(j + 1) % 6];
    const run: Pt[] = [];
    for (let i = a; ; i = (i + 1) % N) {
      run.push(pts[i]);
      if (i === b) break;
    }
    out.push(...resample(run, per));
  }
  return out;
}

/** A supertile with its tiles, its strands, and those strands pulled tight into routes between its border crossings. */
export interface BorderScene {
  readonly type: HexType;
  readonly level: number;
  readonly outline: readonly Pt[];
  readonly dots: readonly Pt[];
  /** By route, in order of its lower crossing: [from, to]. */
  readonly routes: readonly (readonly [number, number])[];
  /** By route: the strand from crossing `from` to `to`, through the tiles. */
  readonly strands: readonly (readonly Pt[])[];
  /** By route: the same, drawn as a curve between its two crossings. */
  readonly tight: readonly (readonly Pt[])[];
  readonly tiles: readonly { readonly type: HexType; readonly outline: readonly Pt[] }[];
  readonly box: Box;
}

export function borderScene(cs: CircuitShapes, states: readonly State[], subset: readonly number[], digits: readonly number[], n: number, type: HexType): BorderScene {
  if (cs.maxLevel < n) cs.extend(n);
  const g = graphOf(cs, n, type, states[n][type]);
  const patch = tracePatch(subset, digits, n, type);
  const nearest = (p: Pt) => {
    let best = 0, bd = Infinity;
    g.dots.forEach((q, i) => {
      const e = Math.hypot(p.x - q.x, p.y - q.y);
      if (e < bd) { bd = e; best = i; }
    });
    return best;
  };
  const strands: Pt[][] = g.routes.map(() => []);
  for (const s of patch.strands) {
    if (s.closed) continue;
    const a = nearest(s.ends[0]), b = nearest(s.ends[1]);
    const i = g.routes.findIndex(([p]) => p === Math.min(a, b));
    const path = strandPath(patch, s);
    strands[i] = resample(a < b ? path : path.reverse(), STRAND_POINTS);
  }
  const corners = Array.from({ length: 6 }, (_, j) => cs.corner(n, type, j));
  const outline = sixEdges(g.outline, corners, EDGE_POINTS);
  return {
    type,
    level: n,
    outline,
    dots: g.dots,
    routes: g.routes,
    strands,
    tight: g.routes.map(([p, q]) => routeCurve(g.dots[p], g.dots[q], g.centre, STRAND_POINTS)),
    tiles: patch.tiles.map((t) => ({ type: t.type, outline: t.outline })),
    box: boxOf(outline),
  };
}
