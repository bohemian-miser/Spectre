/**
 * The members the Identify page draws over their supertiles and reads in
 * rows (`harmonics/ChainViews.tsx`): the strand at a level it has climbed
 * to, and what it is set against, a candidate and the built members of the
 * candidate's chain.
 *
 * Each member is read as `harmonics/rows.ts` reads a circuit, its rows
 * starting below the level it is born at, which the members line up by. An
 * open strand's piece at level n (its arc in its level-n ancestor) is read
 * as if born where its candidate closes, as the identification compares
 * them: at the same levels. At level n and above it is one visit a level,
 * its ancestor; its backtracks are cancelled along the arc, not round a
 * loop; and its reading is paired with a circuit's where it fits best
 * (`fitPairs`). A candidate above the build is its chain member's reading
 * at the same depths below where it closes (`buildup/deep.ts`), drawn over
 * the supertiles of that reading placed in a supertile of its level, its
 * line through their middles.
 */
import { transPt, type Affine, type HexType, type Pt } from '../../core';
import type { Box } from '../../lib/viewport';
import { Geometry, walkedLine } from '../buildup/viewer';
import { middleOf, placeOfPath } from '../buildup/deep';
import { CircuitRows, chainRows, READ_CAP, type ChainRows, type Fold } from '../harmonics/rows';
import { drawSide, lineOf, sharedTokens, SUPERTILE_CAP, supertilesOf, unsharedIds, type Agreement, type ChainPicture, type Side } from '../harmonics/pairView';
import { arcsOf, circuitDescent, visitsIn, type Descent } from '../harmonics/levelWalk';
import { cancelOpen, pathOf, type VisitColumns } from '../harmonics/readings';
import type { BornCircuit, CircuitShapes } from '../shapes/circuitShapes';
import { fitPairs, type Arc, type IdentifyEngine, type Named, type Strand } from './identify';

const IDENTITY: Affine = [1, 0, 0, 0, 1, 0];

/** A member: the strand's piece at a level climbed (read as born at `birth`), a circuit of the build, or a chain member carried up to `level`. */
export type MemberSpec =
  | { readonly kind: 'strand'; readonly level: number; readonly birth: number }
  | { readonly kind: 'built'; readonly level: number; readonly length: number }
  | { readonly kind: 'predicted'; readonly from: Named; readonly level: number };

export const specKey = (s: MemberSpec): string =>
  s.kind === 'strand' ? `strand ${s.level} ${s.birth}` : s.kind === 'built' ? `built ${s.level} ${s.length}` : `predicted ${s.from.level} ${s.from.length} ${s.level}`;

/** An open strand's piece read in rows: its ancestors above the arc, the arc's route below. */
class StrandRows extends CircuitRows {
  constructor(
    cs: CircuitShapes,
    readonly strand: Strand,
    readonly arc: Arc,
    birth: number,
  ) {
    strand.reach(birth + 1);
    super(cs, { level: birth, type: strand.anc.types[birth] as BornCircuit['type'], length: arc.tiles, slots: [], steps: [] });
  }

  /** The level-n ancestor's slot path from the birth level down, as one number (base 8). */
  ancestorId(n: number): number {
    let id = 0;
    for (let m = this.c.level; m > n; m--) id = id * 8 + this.strand.anc.slots[m];
    return id;
  }

  protected visitsOf(level: number): VisitColumns {
    const { arc, cs } = this;
    const anc = this.strand.anc;
    const up = level < this.c.level - 1 ? 0 : -1;
    if (level >= arc.level)
      return { level, type: [anc.types[level]], cross: [-1], id: [this.ancestorId(level)], slot: [anc.slots[level + 1]], parent: [anc.types[level + 1]], tiles: [arc.tiles], up: [up] };
    if (level < arc.level - 1) return super.visitsOf(level);
    const v: VisitColumns = { level, type: [], cross: [], id: [], slot: [], parent: [], tiles: [], up: [] };
    const top = this.ancestorId(arc.level);
    for (const e of cs.enters(arc.level, arc.type, arc.entry)) {
      v.type.push(e.type);
      v.cross.push(e.k);
      v.id.push(top * 8 + e.slot);
      v.slot.push(e.slot);
      v.parent.push(arc.type);
      v.tiles.push(cs.levels[level][e.type].len(e.k));
      v.up.push(up);
    }
    return v;
  }

  protected fixpoint(v: VisitColumns): Int32Array {
    return cancelOpen(v.id);
  }

  protected pair(level: number, other: CircuitRows, lo: number, fold: Fold): { ab: Int32Array; ba: Int32Array } | null {
    return fitPairs(this.fold(level, fold).tokens, other.fold(lo, fold).tokens);
  }
}

/** A chain member's reading carried up to `level`: its kept visits at each depth below where it closes. */
class PredictedRows extends CircuitRows {
  constructor(
    cs: CircuitShapes,
    readonly from: CircuitRows,
    level: number,
  ) {
    super(cs, { ...from.c, level, length: 0 });
  }

  protected visitsOf(level: number): VisitColumns {
    const at = this.from.c.level - (this.c.level - level);
    const v = this.from.visits(at);
    const keep = this.from.fold(at, 'fixpoint').keep;
    const pick = <T,>(xs: readonly T[]): T[] => Array.from(keep, (i) => xs[i]);
    return { level, type: pick(v.type), cross: pick(v.cross), id: pick(v.id), slot: pick(v.slot), parent: pick(v.parent), tiles: pick(v.tiles), up: pick(v.up).map(() => -1) };
  }

  starts(): null {
    return null;
  }
}

/** A member as drawn: its rows; where its visits come from, walked at levels up to the descent's top; above that (or without one) each listed visit's frame and its line; and its line drawn finer for a view. */
interface Source {
  readonly rows: CircuitRows;
  /** An open strand. */
  readonly open: boolean;
  readonly descent: Descent | null;
  readonly listed: { frames(level: number): readonly Affine[]; line(level: number): Float64Array } | null;
  detail(level: number, view: Box | null, budget: number): { stop: number; pts: Float64Array; capped: boolean };
}

const boxOf = (pts: readonly Pt[]) => {
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
};

/**
 * Arcs drawn down to a level for a view, as `HarmonicsEngine.detail` draws a
 * circuit: as fine as `level - 2` while the crossings in view stay within
 * about `budget`, children out of view passed over; `rawAt(s)` is the visits
 * at level s; `end` closes the line (null) or ends it at a point.
 */
function drawDown(
  g: Geometry,
  outline: readonly Pt[],
  arcs: readonly { n: number; type: string; k: number; x: Affine }[],
  end: Pt | null,
  rawAt: (s: number) => number,
  level: number,
  view: Box | null,
  budget: number,
): { stop: number; pts: Float64Array; capped: boolean } {
  let share = 1;
  if (view) {
    const b = boxOf(outline);
    const w = Math.max(0, Math.min(b.x1, view.max.x) - Math.max(b.x0, view.min.x)), h = Math.max(0, Math.min(b.y1, view.max.y) - Math.max(b.y0, view.min.y));
    share = Math.min(1, (4 * w * h) / ((b.x1 - b.x0) * (b.y1 - b.y0) || 1));
  }
  for (let s = Math.max(0, level - 2); s <= level; s++) {
    if (s < level && rawAt(s) * share > budget) continue;
    const got = walkedLine(
      (out) => {
        for (const a of arcs) g.walk(a.n, a.type, a.k, a.x, s, view, out);
      },
      end,
      budget,
      s === level,
    );
    if (got) return { stop: s, ...got };
  }
  throw new Error('no level to draw at');
}

/** The members of an identification: sources made once each, pictures and rows of any list of them. */
export class Members {
  private readonly sources = new Map<string, Source>();
  private geometry: Geometry | null = null;

  constructor(readonly engine: IdentifyEngine) {}

  private get cs(): CircuitShapes {
    return this.engine.cs;
  }

  private get g(): Geometry {
    return (this.geometry ??= new Geometry(this.cs));
  }

  /** The built circuit with these tiles first closing at this level, by its index in the build. */
  private builtIndex(n: Named): number {
    const i = this.engine.harm.result().circuits.findIndex((c) => c.level === n.level && c.length === n.length);
    if (i < 0) throw new Error(`the build has no ${n.length}-tile circuit at level ${n.level}`);
    return i;
  }

  /** The born circuit behind a built member, or behind the chain member a predicted one is carried from. */
  born(spec: MemberSpec): BornCircuit {
    if (spec.kind === 'strand') throw new Error('the strand is not a circuit of the build');
    return this.engine.harm.bornOf(this.builtIndex(spec.kind === 'built' ? spec : spec.from));
  }

  private source(spec: MemberSpec): Source {
    const key = specKey(spec);
    let s = this.sources.get(key);
    if (!s) this.sources.set(key, (s = this.make(spec)));
    return s;
  }

  private circuitSource(c: BornCircuit, detail?: (level: number, view: Box | null, budget: number) => ReturnType<Source['detail']>): Source {
    const cs = this.cs;
    const rows = new CircuitRows(cs, c);
    const descent = circuitDescent(arcsOf(cs), c);
    return {
      rows,
      open: false,
      descent,
      listed: null,
      detail:
        detail ??
        ((level, view, budget) =>
          drawDown(
            this.g,
            cs.outline(c.level, c.type),
            c.steps.map((st) => {
              const ch = cs.childOf(c.level, c.type, st);
              return { n: c.level - 1, type: ch.type, k: ch.k, x: ch.xform };
            }),
            null,
            (s) => visitsIn(descent, s),
            level,
            view,
            budget,
          )),
    };
  }

  private make(spec: MemberSpec): Source {
    const cs = this.cs;
    if (spec.kind === 'built') {
      const ci = this.builtIndex(spec);
      return this.circuitSource(this.engine.harm.bornOf(ci), (level, view, budget) => this.engine.harm.detail(this.builtIndex(spec), level, view, budget));
    }
    if (spec.kind === 'predicted') {
      const from = new CircuitRows(cs, this.born(spec));
      const rows = new PredictedRows(cs, from, spec.level);
      const type = rows.c.type as HexType;
      const placed = (level: number) => {
        const v = rows.visits(level);
        return v.id.map((id) => placeOfPath(cs.family, spec.level, type, id, spec.level - level));
      };
      const line = (level: number) => lineOf(placed(level).map((p) => transPt(p.x, middleOf(cs, level, p.type))));
      return {
        rows,
        open: false,
        descent: null,
        listed: { frames: (level) => placed(level).map((p) => p.x), line },
        detail: (level) => {
          const pts = line(level);
          const out = new Float64Array(pts.length + 2);
          out.set(pts);
          out[pts.length] = pts[0];
          out[pts.length + 1] = pts[1];
          return { stop: level, pts: out, capped: false };
        },
      };
    }
    const strand = this.engine.strand;
    const closed = this.engine.closed;
    if (closed && closed.level === spec.level) return this.circuitSource(closed);
    const arc = strand.arcs[spec.level];
    if (!arc) throw new Error(`the strand has not climbed to level ${spec.level}`);
    const rows = new StrandRows(cs, strand, arc, spec.birth);
    const exit = cs.levels[arc.level][arc.type].pt(arc.exit);
    const descent: Descent = { arcs: arcsOf(cs), birth: spec.birth, top: arc.level, first: [{ type: arc.type, cross: arc.entry, id: rows.ancestorId(arc.level), xform: IDENTITY }], end: exit };
    return {
      rows,
      open: true,
      descent,
      // above the arc's level, its one visit: the ancestor
      listed: {
        frames: () => [IDENTITY],
        line: (level) => {
          const pts: Pt[] = [];
          cs.arc(arc.level, arc.type, arc.entry, IDENTITY, level, pts);
          pts.push(exit);
          return lineOf(pts);
        },
      },
      detail: (level, view, budget) =>
        drawDown(this.g, cs.outline(arc.level, arc.type), [{ n: arc.level, type: arc.type, k: arc.entry, x: IDENTITY }], exit, (s) => visitsIn(descent, s), level, view, budget),
    };
  }

  /** The members over their supertiles, the lowest-born at level k, each against the one before. */
  picture(specs: readonly MemberSpec[], k: number, fold: Fold = 'fixpoint'): ChainPicture {
    const src = specs.map((s) => this.source(s));
    const base = Math.min(...src.map((s) => s.rows.c.level));
    const levels = src.map((s) => k + s.rows.c.level - base);
    const walked = (j: number) => !!src[j].descent && levels[j] <= src[j].descent!.top;
    const counts = src.map((s, j) => {
      if (walked(j)) return visitsIn(s.descent!, levels[j]);
      try {
        return s.rows.visits(levels[j]).type.length;
      } catch {
        return Infinity;
      }
    });
    const read = (j: number) => (counts[j] <= READ_CAP ? src[j].rows.fold(levels[j], fold) : null);
    const steps: Agreement[] = [];
    const shared: (readonly boolean[] | null)[] = src.map(() => null);
    const matched = src.map(() => new Set<number>());
    const links = src.map(() => new Map<number, string>());
    for (let j = 1; j < src.length; j++) {
      const lo = read(j - 1), hi = read(j);
      if (!lo || !hi) {
        steps.push('unread');
        continue;
      }
      const strand = src[j - 1].open ? j - 1 : src[j].open ? j : -1;
      if (strand < 0) {
        const m = sharedTokens(lo.tokens, hi.tokens);
        steps.push(m.state);
        shared[j] = m.b;
        if (j === 1) shared[0] = m.a;
        continue;
      }
      const other = strand === j ? j - 1 : j;
      const a = strand === j ? hi : lo, b = strand === j ? lo : hi;
      const p = fitPairs(a.tokens, b.tokens);
      if (!p) {
        steps.push('long');
        continue;
      }
      steps.push(p.ab.every((x) => x >= 0) ? 'same' : 'differs');
      shared[strand] = Array.from(p.ab, (x) => x >= 0);
      const va = src[strand].rows.visits(levels[strand]), vb = src[other].rows.visits(levels[other]);
      const depth = src[other].rows.c.level - levels[other];
      p.ab.forEach((r, q) => {
        if (r < 0) return;
        const id = vb.id[b.keep[r]];
        matched[other].add(id);
        links[strand].set(va.id[a.keep[q]], pathOf(id, depth));
      });
    }
    const sides = src.map((s, j): Side => {
      const level = levels[j];
      const r = read(j);
      const unshared = () => (r ? unsharedIds(s.rows.visits(level).id, r.keep, shared[j]) : new Set<number>());
      if (walked(j)) return { ...drawSide(s.descent!, level, { unshared: unshared(), matched: matched[j], link: links[j] }), open: s.open };
      const v = s.rows.visits(level);
      const { count, supertiles } = supertilesOf(this.cs, v, s.listed!.frames(level), s.rows.c.level - level, unshared(), matched[j], links[j]);
      return { level, visits: v.type.length, every: 1, count, supertiles, circuit: s.listed!.line(level), open: s.open };
    });
    return { k, sides, steps };
  }

  /** The members read row by row down to level k for the lowest-born (`rows.ts`). */
  rows(specs: readonly MemberSpec[], k: number, fold: Fold = 'fixpoint'): ChainRows {
    return chainRows(
      specs.map((s) => this.source(s).rows),
      k,
      SUPERTILE_CAP,
      fold,
    );
  }

  /** A member drawn for a view, as fine as the budget allows. */
  detail(spec: MemberSpec, level: number, view: Box | null, budget: number): { stop: number; pts: Float64Array; capped: boolean } {
    return this.source(spec).detail(level, view, budget);
  }
}
