/**
 * Every fate a tail can have, over every placement of its supertile in
 * bigger ones (issue #206).
 *
 * A tail is an arc of a type's table at level n. Its supertile sits as slot
 * s of a parent of type P (`placements.ts`); there the arc lies on one route
 * of P's table at level n + 1, or on a closing walk (`lifts.ts`). The routes
 * at n + 1 are tails of their own, so the fates form a graph over
 * (level, type, arc) rather than one path per placement: the fates of an arc
 * are the union, over its placements, of the closing it lands in or the
 * fates of the arc it lands on. At the top level built an arc is still open
 * (on a certified infinite line or not).
 */
import type { HexType } from '../../core';
import type { BornCircuit, CircuitShapes } from '../shapes/circuitShapes';
import { classOf, closes, LabelSets, LINE, OPEN } from './labels';
import { lift, type Lifts } from './lifts';
import { placements, TYPES, type Placement } from './placements';

export interface FateGraph {
  readonly top: number;
  readonly from: number;
  readonly sets: LabelSets;
  /** fates[m][type][place]: the set of labels of the arc through the place, -1 for a place the type does not have. */
  readonly fates: Record<string, Int32Array>[];
  /** The label of each closing, by level and parent type, in the order of its lifts. */
  readonly closingLabel: (level: number, type: string, closing: number) => number;
  /** The arcs at the top certified as infinite lines. */
  readonly lineAt: ReadonlyMap<string, ReadonlySet<number>>;
}

/**
 * The fates of every arc at levels `from` to `top` - 1. `labelOf` names a
 * closing walk; `lineAt` holds the arcs at `top` certified as infinite lines
 * (per type, the lower end's place).
 */
export function fateGraph(
  cs: CircuitShapes,
  liftsAt: (level: number, type: string) => Lifts,
  labelOf: (c: BornCircuit) => string,
  top: number,
  lineAt: ReadonlyMap<string, ReadonlySet<number>>,
  from = 1,
): FateGraph {
  const sets = new LabelSets();
  const place = placements();
  const open = sets.single(OPEN);
  const line = sets.single(LINE);
  const named = new Map<string, number[]>();
  const closingLabel = (level: number, type: string, i: number): number => {
    const key = `${level}/${type}`;
    let list = named.get(key);
    if (!list) named.set(key, (list = liftsAt(level, type).closings.map((c) => sets.single(labelOf(c)))));
    return list[i];
  };
  const fates: Record<string, Int32Array>[] = [];
  for (let m = top - 1; m >= from; m--) {
    const here: Record<string, Int32Array> = {};
    for (const X of TYPES) {
      const T = cs.levels[m][X];
      const out = new Int32Array(T.size).fill(-1);
      for (const k of T.crossings()) {
        const b = T.mate(k);
        if (b < k) continue;
        let set = -1;
        for (const p of place[X]) set = sets.union(set, landing(m, k, p));
        out[k] = out[b] = set;
      }
      here[X] = out;
    }
    fates[m] = here;
  }
  function landing(m: number, k: number, p: Placement): number {
    const to = lift(liftsAt(m + 1, p.parent), k, p.slot);
    if (!to) throw new Error(`level ${m}: an arc of a ${p.parent}'s slot ${p.slot} goes nowhere`);
    if ('closing' in to) return closingLabel(m + 1, p.parent, to.closing);
    if (m + 1 === top) return lineAt.get(p.parent)?.has(to.arc) ? line : open;
    return fates[m + 1][p.parent][to.arc];
  }
  return { top, from, sets, fates, closingLabel, lineAt };
}

/** How many tails of a type at a level have one fate or several. */
export interface FateCount {
  readonly level: number;
  readonly type: HexType;
  readonly tails: number;
  /** One label (one circuit, or open). */
  readonly oneFate: number;
  /** One class (one chain whichever member, one nugget, unseen, open or line). */
  readonly oneClass: number;
  /** Closing, under some placement, into circuits of two classes or more. */
  readonly closingClasses: number;
  /** Tiles on tails with two closing classes or more, of all tiles on tails. */
  readonly closingClassesShare: number;
  /** Open at the top under some placement. */
  readonly openSomewhere: number;
}

export function fateCounts(cs: CircuitShapes, g: FateGraph): FateCount[] {
  const out: FateCount[] = [];
  const seen = new Map<number, { fates: number; classes: number; closing: number; open: boolean }>();
  const about = (s: number) => {
    let x = seen.get(s);
    if (!x) {
      const names = g.sets.names(s);
      x = { fates: names.length, classes: g.sets.classes(s).length, closing: new Set(names.filter(closes).map(classOf)).size, open: names.some((y) => !closes(y)) };
      seen.set(s, x);
    }
    return x;
  };
  for (let m = g.from; m < g.top; m++) {
    for (const X of TYPES) {
      const T = cs.levels[m][X];
      const f = g.fates[m][X];
      let tails = 0, oneFate = 0, oneClass = 0, closingClasses = 0, openSomewhere = 0, tiles = 0, split = 0;
      for (const k of T.crossings()) {
        if (T.mate(k) < k) continue;
        const x = about(f[k]);
        tails++;
        tiles += T.len(k);
        if (x.fates === 1) oneFate++;
        if (x.classes === 1) oneClass++;
        if (x.closing > 1) {
          closingClasses++;
          split += T.len(k);
        }
        if (x.open) openSomewhere++;
      }
      out.push({ level: m, type: X, tails, oneFate, oneClass, closingClasses, closingClassesShare: tiles ? split / tiles : 0, openSomewhere });
    }
  }
  return out;
}

/** The lowest level at which every tail of every type has one class; `closing`: counting only the circuits it closes into, not being open at the top. */
export function classifiableLevel(counts: readonly FateCount[], closing: boolean): number | null {
  const levels = [...new Set(counts.map((c) => c.level))].sort((a, b) => a - b);
  for (const m of levels) {
    if (counts.filter((c) => c.level === m).every((c) => (closing ? c.closingClasses === 0 : c.oneClass === c.tails))) return m;
  }
  return null;
}

/** A placement path up from a tail: each parent and the slot of the one below, ending where the tail closes or reaches the top. */
export interface Path {
  readonly steps: { readonly parent: HexType; readonly slot: number }[];
  /** The label it ends on, and the level. */
  readonly label: string;
  readonly level: number;
}

/** The shortest path up from the arc through place k of a level-m `type` that ends in class `cls`: the lowest level it closes there at (or the top, for open or line), or null. */
export function pathTo(g: FateGraph, liftsAt: (level: number, type: string) => Lifts, m: number, type: HexType, k: number, cls: string): Path | null {
  const place = placements();
  let frontier = new Map<string, { type: HexType; k: number; steps: Path['steps'] }>([[`${type} ${k}`, { type, k, steps: [] }]]);
  for (let n = m; n < g.top && frontier.size; n++) {
    const next = new Map<string, { type: HexType; k: number; steps: Path['steps'] }>();
    for (const at of frontier.values()) {
      for (const p of place[at.type]) {
        const to = lift(liftsAt(n + 1, p.parent), at.k, p.slot);
        if (!to) continue;
        const steps = [...at.steps, { parent: p.parent, slot: p.slot }];
        if ('closing' in to) {
          const label = g.sets.labels[g.sets.sets[g.closingLabel(n + 1, p.parent, to.closing)][0]];
          if (classOf(label) === cls) return { steps, label, level: n + 1 };
          continue;
        }
        if (n + 1 === g.top) {
          const label = g.sets.names(landingAtTop(g, p.parent, to.arc))[0];
          if (label === cls) return { steps, label, level: n + 1 };
          continue;
        }
        const key = `${p.parent} ${to.arc}`;
        if (!next.has(key) && g.sets.classes(g.fates[n + 1][p.parent][to.arc]).includes(cls)) next.set(key, { type: p.parent, k: to.arc, steps });
      }
    }
    frontier = next;
  }
  return null;
}

/** The set an arc at the top lands in: open, or on a certified line. */
function landingAtTop(g: FateGraph, type: string, k: number): number {
  return g.lineAt.get(type)?.has(k) ? g.sets.single(LINE) : g.sets.single(OPEN);
}

/** A tail with two closing classes or more, and a path to each. */
export interface Split {
  readonly level: number;
  readonly type: HexType;
  readonly a: number;
  readonly b: number;
  readonly tiles: number;
  readonly paths: Path[];
}

/** Up to `most` tails of each level and type that close into two classes or more, with the placements that separate them. */
export function splits(cs: CircuitShapes, g: FateGraph, liftsAt: (level: number, type: string) => Lifts, most = 1): Split[] {
  const out: Split[] = [];
  for (let m = g.from; m < g.top; m++) {
    for (const X of TYPES) {
      const T = cs.levels[m][X];
      let n = 0;
      for (const k of T.crossings()) {
        if (n >= most) break;
        if (T.mate(k) < k) continue;
        const classes = g.sets.classes(g.fates[m][X][k]).filter((c) => c !== OPEN && c !== LINE);
        if (classes.length < 2) continue;
        n++;
        out.push({ level: m, type: X, a: k, b: T.mate(k), tiles: T.len(k), paths: classes.map((c) => pathTo(g, liftsAt, m, X, k, c)!) });
      }
    }
  }
  return out;
}
