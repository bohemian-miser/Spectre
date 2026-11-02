/**
 * The fates of one combination's tails, put together: the classified build
 * (`comboAnalysis.classifyCombo`), every arc's fates over every placement
 * (`fateSets.ts`), the placement-weighted shares against the account's
 * (`fateMass.ts`), the infinite lines (`lines.ts`), and the remainder in
 * the limit with its reasons (`remainder.ts`, from tails followed above the
 * build, `above.ts`). What `circuit-classes/tail-fates.ts` writes per
 * combination.
 */
import { classifyCombo, type Classified, type ComboAnalysis, type Progress } from '../foundations/comboAnalysis';
import { pageCombo, project, tailFates, type PageCombo } from '../foundations/pageData';
import { Catalog } from '../explorer/tailClasses';
import { SparseRoutes } from '../harmonics/sparseRoutes';
import { followAbove, type Followed } from './above';
import { fateMass } from './fateMass';
import { classifiableLevel, fateCounts, fateGraph, splits, type FateCount, type Split } from './fateSets';
import { classOf } from './labels';
import { liftsOf, type Lifts } from './lifts';
import { lineArcs } from './lines';
import { cycleName } from './placements';
import { remainderOf, type Remainder } from './remainder';

/** Per level: the account's tail fates (`tailFates`) against the placement-weighted push, by class, and the largest difference. */
export interface WeightCheck {
  readonly level: number;
  readonly account: Record<string, number>;
  readonly pushed: Record<string, number>;
  readonly diff: number;
}

export interface Investigation {
  readonly rule: string;
  readonly combo: string;
  /** The top level built (classified levels + 1). */
  readonly top: number;
  readonly counts: FateCount[];
  /** The lowest level at which every tail of every type closes into one class under every placement (null: none below the top). */
  readonly classifiable: number | null;
  /** The same, counting being open at the top as a class of its own. */
  readonly classifiableWithOpen: number | null;
  readonly splits: Split[];
  readonly weights: WeightCheck[];
  /** Per level: arcs certified as infinite lines (type, cycle, tiles), and the account's share on them. */
  readonly lines: { level: number; share: number; arcs: { type: string; cycle: string; tiles: number }[] }[];
  readonly remainder: Remainder;
  /** The account's share of chords on circuits in the limit (`project`). */
  readonly limit: number;
  /** The analysis, as the Foundations sweep writes it. */
  readonly analysis: ComboAnalysis;
  readonly seconds: number;
}

export interface Options {
  readonly levels: number;
  /** Tails followed above the build, and the level they are followed to. */
  readonly samples: number;
  readonly cap: number;
  /** Routes worked out at most per tail followed. */
  readonly routes?: number;
  readonly seed?: number;
  readonly onProgress?: Progress;
}

/** The lifts into every type at every level of a build, each worked out once. */
export function liftCache(c: Classified): (level: number, type: string) => Lifts {
  const kept = new Map<string, Lifts>();
  return (level, type) => {
    const key = `${level}/${type}`;
    let l = kept.get(key);
    if (!l) kept.set(key, (l = liftsOf(c.cs, level, type)));
    return l;
  };
}

/** The account's fates of the tails at level L by class, against the push from L, both to the top. */
export function weightCheck(p: PageCombo, c: Classified, liftsAt: (level: number, type: string) => Lifts, L: number): WeightCheck {
  const top = p.tails.length - 1;
  const row = tailFates(p, L).find((f) => L + f.k === top)!;
  const accountShares: Record<string, number> = { open: row.open, unseen: row.unseen, nuggets: row.nuggets };
  for (const [root, v] of row.chains) accountShares[`chain ${root}`] = v;
  const m = fateMass(c.cs, liftsAt, c.bucket, top, lineArcs(c.lines[top]), L);
  const pushed: Record<string, number> = { open: m.open + m.line, unseen: 0, nuggets: 0 };
  for (const [label, row2] of m.closed) {
    const k = classOf(label);
    const key = k.startsWith('nugget') ? 'nuggets' : k;
    pushed[key] = (pushed[key] ?? 0) + row2.reduce((a, b) => a + b, 0);
  }
  let diff = 0;
  for (const k of new Set([...Object.keys(accountShares), ...Object.keys(pushed)])) diff = Math.max(diff, Math.abs((accountShares[k] ?? 0) - (pushed[k] ?? 0)));
  return { level: L, account: accountShares, pushed, diff };
}

export function investigate(subset: readonly number[], combo: string, o: Options): Investigation {
  const t0 = Date.now();
  const say = o.onProgress ?? (() => {});
  const c = classifyCombo(subset, combo, o.levels, say);
  const top = o.levels + 1;
  const p = pageCombo(c.analysis);
  const liftsAt = liftCache(c);
  say('following every placement', 0, 1);
  const g = fateGraph(c.cs, liftsAt, c.bucket, top, lineArcs(c.lines[top]));
  const counts = fateCounts(c.cs, g);
  say('checking the weights', 0, 1);
  const weights = Array.from({ length: top - 1 }, (_, i) => weightCheck(p, c, liftsAt, i + 1));
  const lines = c.lines.map((list, n) => ({
    level: n,
    share: p.lines?.[n] ?? 0,
    arcs: list.map((x) => ({ type: x.cycle.type as string, cycle: cycleName(x.cycle), tiles: c.cs.levels[n][x.cycle.type].len(x.places[2]) })),
  }));
  say('following tails above the build', 0, 1);
  const fresh = () => {
    const R = new SparseRoutes(c.cs);
    return { R, catalog: new Catalog(c.cs, R, p) };
  };
  const followed: Followed[] = o.samples > 0 ? followAbove(c.cs, fresh, top, o.cap, o.samples, o.seed ?? 1, o.routes, (d) => say('following tails above the build', d, o.samples)) : [];
  const remainder = remainderOf(p, followed, o.cap);
  return {
    rule: subset.join(''),
    combo,
    top,
    counts,
    classifiable: classifiableLevel(counts, true),
    classifiableWithOpen: classifiableLevel(counts, false),
    splits: splits(c.cs, g, liftsAt, 1),
    weights,
    lines,
    remainder,
    limit: project(p).limit,
    analysis: c.analysis,
    seconds: (Date.now() - t0) / 1000,
  };
}

