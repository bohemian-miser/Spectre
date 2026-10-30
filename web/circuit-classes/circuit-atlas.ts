/**
 * The Circuits page's data: for one rule, its pairings sorted into boundary
 * classes, and for each class its circuit families with silhouettes.
 *
 * For each class's representative the renormalisation (`circuit-shapes.ts`)
 * runs to `level` (and further for space-filling classes, which start late):
 *  - the longest circuit born per level in the Delta supertile, and from the
 *    last two generations a growth per two levels and a dimension
 *    D = ln(growth) / ln(4 + sqrt 15) (the linear size grows by 4 + sqrt 15
 *    over two levels);
 *  - its families: circuits grouped by the set of child slots they run
 *    through (the same in every supertile type), each with the lengths born
 *    at every level;
 *  - silhouettes: the biggest circuit of each family at the deepest level,
 *    and the longest strand still open there, each simplified to at most
 *    `MAX_POINTS` points by drawing coarse arcs as chords.
 *
 * Usage: tsx circuit-atlas.ts <family> <rule> <level> <deepLevel> <out.json>
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { type Pt, type TileFamilyId } from '../src/core';
import { boundaryClasses } from './boundary-classes';
import { CircuitShapes, type BornCircuit } from './circuit-shapes';

const MAX_POINTS = 2500;
const AREA = 4 + Math.sqrt(15);

export type CircuitKind = 'space-filling' | 'thread' | 'triangle' | 'small' | 'none';

export interface AtlasShape {
  readonly what: string;
  readonly level: number;
  readonly length: number;
  /** Drawn to this level (arcs below it are chords). */
  readonly stop: number;
  readonly closed: boolean;
  /** Points scaled into 0..4095 over the bounding box, x then y. */
  readonly pts: readonly number[];
  readonly box: readonly [number, number, number, number];
}

export interface AtlasFamily {
  readonly slots: string;
  readonly firstLevel: number;
  /** Per level from 1: the distinct lengths born (largest first, up to 4), and how many circuits. */
  readonly lengths: readonly (readonly number[])[];
  readonly counts: readonly number[];
  readonly growth: number | null;
}

export interface AtlasClass {
  readonly representative: string;
  readonly members: readonly string[];
  readonly pattern: string;
  readonly kind: CircuitKind;
  readonly dimension: number | null;
  readonly growth: number | null;
  readonly depth: number;
  /** Longest circuit born per level (Delta), from level 1. */
  readonly longest: readonly number[];
  /** Longest open arc through the Delta, per level. */
  readonly openArc: readonly number[];
  readonly families: readonly AtlasFamily[];
  readonly shapes: readonly AtlasShape[];
}

function quantise(what: string, level: number, length: number, stop: number, closed: boolean, pts: readonly Pt[]): AtlasShape {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const p of pts) {
    x0 = Math.min(x0, p.x);
    x1 = Math.max(x1, p.x);
    y0 = Math.min(y0, p.y);
    y1 = Math.max(y1, p.y);
  }
  const s = 4095 / Math.max(x1 - x0, y1 - y0, 1e-9);
  const out: number[] = [];
  for (const p of pts) out.push(Math.round((p.x - x0) * s), Math.round((y1 - p.y) * s));
  return { what, level, length, stop, closed, pts: out, box: [x0, y0, x1, y1] };
}

/** Coarsest drawing level that still has some detail: the finest with at most MAX_POINTS points. */
function draw(f: (stop: number) => Pt[], level: number): { pts: Pt[]; stop: number } {
  for (let stop = 0; stop < level; stop++) {
    const pts = f(stop);
    if (pts.length <= MAX_POINTS) return { pts, stop };
  }
  return { pts: f(level - 1), stop: level - 1 };
}

function kindOf(longest: readonly number[], dimension: number | null): CircuitKind {
  const big = Math.max(0, ...longest);
  if (big === 0) return 'none';
  if (big < 100) return 'small';
  if (dimension === null) return 'small';
  if (dimension >= 1.85) return 'space-filling';
  if (dimension >= 1.6) return 'thread';
  return 'triangle';
}

function analyse(family: TileFamilyId, subset: readonly number[], combo: string, depth: number): Omit<AtlasClass, 'members' | 'pattern' | 'representative'> {
  const cs = new CircuitShapes(family, subset, [...combo].map((ch) => parseInt(ch, 36)), depth, 30);
  const delta = (n: number) => cs.born.filter((b) => b.level === n && b.type === 'Delta');
  const longest = Array.from({ length: depth }, (_, i) => delta(i + 1).reduce((a, b) => Math.max(a, b.length), 0));
  const openArc = Array.from({ length: depth }, (_, i) => {
    const L = cs.levels[i + 1].Delta;
    return Array.from(L.crossings(), (k) => L.len(k)).reduce((a, b) => Math.max(a, b), 0);
  });
  // Growth over two levels of the largest circuit seen so far (generations can skip a level).
  const seen = longest.map((_, i) => Math.max(...longest.slice(0, i + 1)));
  const a = seen[depth - 1];
  const b = seen[depth - 3] ?? 0;
  const growth = a > 100 && b > 0 && a > b ? a / b : null;
  // Length grows by `growth` while the linear size grows by 4 + sqrt 15 (two levels).
  const dimension = growth ? Math.log(growth) / Math.log(AREA) : null;

  // Families: by the set of child slots, across all supertile types.
  const bySlots = new Map<string, BornCircuit[]>();
  for (const c of cs.born) {
    const key = [...new Set(c.slots)].sort((x, y) => x - y).join('');
    (bySlots.get(key) ?? bySlots.set(key, []).get(key)!).push(c);
  }
  const families: AtlasFamily[] = [...bySlots].map(([slots, list]) => {
    const lengths: number[][] = [];
    const counts: number[] = [];
    for (let n = 1; n <= depth; n++) {
      const here = list.filter((c) => c.level === n);
      counts.push(here.length);
      lengths.push([...new Set(here.map((c) => c.length))].sort((x, y) => y - x).slice(0, 4));
    }
    const top = lengths.map((l) => l[0] ?? 0);
    const sTop = top.map((_, i) => Math.max(...top.slice(0, i + 1)));
    const g = sTop[depth - 1] > 100 && (sTop[depth - 3] ?? 0) > 0 && sTop[depth - 1] > sTop[depth - 3] ? sTop[depth - 1] / sTop[depth - 3] : null;
    return { slots, firstLevel: list.reduce((m, c) => Math.min(m, c.level), 99), lengths, counts, growth: g };
  });
  families.sort((x, y) => Math.max(...y.lengths.flat(), 0) - Math.max(...x.lengths.flat(), 0));

  const shapes: AtlasShape[] = [];
  for (const fam of families.slice(0, 4)) {
    const list = bySlots.get(fam.slots)!;
    const best = list.reduce((m, c) => (c.length > m.length || (c.length === m.length && c.type === 'Delta' && m.type !== 'Delta') ? c : m));
    const { pts, stop } = draw((s) => cs.shape(best, s), best.level);
    shapes.push(quantise(`family [${fam.slots}]`, best.level, best.length, stop, true, pts));
  }
  if (openArc[depth - 1] > 100) {
    const { pts, stop } = draw((s) => cs.longestArc(depth, 'Delta', s).pts, depth);
    shapes.push(quantise('longest open strand', depth, openArc[depth - 1], stop, false, pts));
  }
  return { kind: kindOf(longest, dimension), dimension, growth, depth, longest, openArc, families: families.slice(0, 12), shapes };
}

if (process.argv[1]?.endsWith('circuit-atlas.ts')) {
  const [family, rule, levelArg, deepArg, outFile] = process.argv.slice(2);
  const fam = family as TileFamilyId;
  const subset = [...rule].map(Number);
  const level = Number(levelArg);
  const deep = Number(deepArg);
  const { classOf, combos } = boundaryClasses(fam, subset, 4);
  const groups = new Map<number, string[]>();
  combos.forEach((c, i) => (groups.get(classOf[i]) ?? groups.set(classOf[i], []).get(classOf[i])!).push(c));
  // Saved after every class, so a killed run resumes where it stopped.
  const partial = `${outFile}.partial`;
  const done: AtlasClass[] = existsSync(partial) ? (JSON.parse(readFileSync(partial, 'utf8')) as AtlasClass[]) : [];
  const classes: AtlasClass[] = [];
  for (const members of [...groups.values()].sort((a, b) => b.length - a.length)) {
    const t0 = Date.now();
    const representative = members[0];
    const saved = done.find((c) => c.representative === representative);
    if (saved) {
      classes.push(saved);
      continue;
    }
    const pattern = [...representative].map((ch, i) => (members.every((m) => m[i] === ch) ? ch : '?')).join('');
    let res = analyse(fam, subset, representative, level);
    // Late starters (nothing big yet, or space-filling) get the deeper run.
    if (deep > level && (res.kind === 'space-filling' || res.kind === 'small' || res.kind === 'none')) res = analyse(fam, subset, representative, deep);
    classes.push({ representative, members, pattern, ...res });
    writeFileSync(partial, JSON.stringify(classes));
    console.error(`${pattern} (${members.length}): ${res.kind}, D ${res.dimension?.toFixed(2) ?? '-'}, depth ${res.depth}, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  writeFileSync(outFile, JSON.stringify({ family, rule, generated: new Date().toISOString().slice(0, 10), classes }));
  console.error(`wrote ${outFile}`);
}
