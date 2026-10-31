/**
 * A level-(n + d) supertile drawn as its level-n pieces: each piece a copy
 * of the level-n supertile of its type with its border's routes, and the
 * parent's routes walked through them crossing by crossing
 * (`period.expand`, `period.walkExpansion`). Unlike the animation's steps
 * (`period/scene.ts`), the walked routes are kept at full detail.
 */
import { transPt, type Affine, type HexType, type Pt } from '../../core';
import type { CircuitShapes } from '../shapes/circuitShapes';
import { expand, walkExpansion, type State } from '../period/period';
import { graphOf, pathXform, routeCurve, type Graph } from '../period/scene';

const CHORD_SAMPLES = 10;

export interface Stitched {
  readonly type: HexType;
  readonly from: number;
  readonly to: number;
  readonly parent: Graph;
  readonly pieces: readonly { readonly type: HexType; readonly path: readonly number[]; readonly outline: readonly Pt[]; readonly routes: readonly (readonly Pt[])[] }[];
  /** Per parent route, in the order of `parent.routes`: its walk through the pieces' routes. */
  readonly walks: readonly (readonly Pt[])[];
  /** Closed walks through the pieces. */
  readonly circuits: number;
}

export function stitched(cs: CircuitShapes, states: readonly State[], n: number, d: number, type: HexType): Stitched {
  const to = n + d;
  if (cs.maxLevel < to) cs.extend(to);
  const graphs = new Map<HexType, Graph>();
  const lower = (t: HexType): Graph => graphs.get(t) ?? graphs.set(t, graphOf(cs, n, t, states[n][t])).get(t)!;
  const x = expand(states, to, type, d);
  const xforms: Affine[] = x.pieces.map((p) => pathXform(to, type, p.path));
  const curve = (piece: number, pos: number): Pt[] => {
    const t = x.pieces[piece].type, g = lower(t), X = xforms[piece];
    const f = (p: Pt) => transPt(X, p);
    return routeCurve(f(g.dots[pos]), f(g.dots[states[n][t].mate[pos]]), f(g.centre), CHORD_SAMPLES);
  };
  const pieces = x.pieces.map((p, i) => {
    const g = lower(p.type);
    return {
      type: p.type,
      path: p.path,
      outline: g.outline.map((q) => transPt(xforms[i], q)),
      routes: g.routes.map(([a]) => curve(i, a)),
    };
  });
  const parent = graphOf(cs, to, type, states[to][type]);
  const walked = walkExpansion(x, (i) => states[n][x.pieces[i].type]);
  const byLow = new Map(walked.routes.map((r) => [Math.min(r.from, r.to), r]));
  const walks = parent.routes.map(([p, q]) => {
    const r = byLow.get(p);
    if (!r || Math.max(r.from, r.to) !== q) throw new Error(`${type}: walking the pieces does not give route ${p}–${q}`);
    const pts = r.enters.flatMap((c) => curve(c.piece, c.pos));
    return r.from === p ? pts : pts.reverse();
  });
  return { type, from: n, to, parent, pieces, walks, circuits: walked.circuits.length };
}
