/**
 * A circuit's placements and the ways it breaks down into supertiles.
 *
 * A circuit is its word (`core/circuitWord.ts`): the same circuit closes in
 * many supertiles at its level, under every type and along more than one
 * walk. Each of those born circuits is a placement. Read at level k
 * (`readings.ts`), placements need not agree: they can run through
 * different level-k supertiles. A breakdown at level k is one reading, up
 * to rotation and reversal (as `sameCyclic` compares them); each comes with
 * the placements that read so.
 *
 * Two circuits A and B, B born b − a levels above A, are compared level by
 * level: B's breakdowns at level k + b − a against A's at level k, counting
 * the breakdowns both have, those only one has, and how many placements of
 * each read as one the other has.
 *
 * The same word also closes across the seams of supertiles above its level
 * (born again at a higher level); those births are counted but not read.
 */
import { circuitKey, leastRotation } from '../../core/circuitWord';
import type { BornCircuit, CircuitShapes } from '../shapes/circuitShapes';
import { familyOf } from '../shapes/circuitShapes';
import { readDown } from './readings';

/** A reading written so that two readings get the same string exactly when they are the same up to rotation and reversal. */
export function canonicalReading(tokens: readonly string[]): string {
  if (tokens.length === 0) return '';
  const least = (t: readonly string[]): string[] => {
    const r = leastRotation(t);
    return [...t.slice(r), ...t.slice(0, r)];
  };
  const f = least(tokens);
  const b = least([...tokens].reverse());
  for (let i = 0; i < f.length; i++) if (f[i] !== b[i]) return (f[i] < b[i] ? f : b).join(' ');
  return f.join(' ');
}

/** A born circuit's key: its word's (`circuitKey`). */
export const wordKey = (cs: CircuitShapes, c: BornCircuit): string => circuitKey(cs.word(c));

/** The placements of the circuit `c` is one of: every born circuit at its level with its word. Also how many times the word is born at higher levels. */
export function placementsOf(cs: CircuitShapes, c: BornCircuit, key = wordKey(cs, c)): { placements: BornCircuit[]; later: number } {
  const placements: BornCircuit[] = [];
  let later = 0;
  for (const o of cs.born) {
    if (o.length !== c.length || o.level < c.level || wordKey(cs, o) !== key) continue;
    if (o.level === c.level) placements.push(o);
    else later++;
  }
  return { placements, later };
}

export interface Breakdown {
  /** The reading (`canonicalReading`). */
  readonly key: string;
  /** Supertiles in the reading. */
  readonly size: number;
  /** Indices into the circuit's placements that read so. */
  readonly placements: readonly number[];
}

export interface LevelBreakdowns {
  readonly level: number;
  /** Placements read at this level; the rest were too long (`stopAbove`). */
  readonly read: number;
  /** Most placements first. */
  readonly breakdowns: readonly Breakdown[];
}

export interface CircuitBreakdowns {
  readonly level: number;
  readonly length: number;
  readonly word: string;
  readonly placements: readonly BornCircuit[];
  /** Per placement, its family (`familyOf`). */
  readonly families: readonly string[];
  /** Births of the word at higher levels, not read. */
  readonly later: number;
  /** Indexed by level, 0 to the level below the circuit's. */
  readonly levels: readonly LevelBreakdowns[];
}

/** Levels are read for a placement downwards until one has more raw visits than this; that one is the last read (`readDown`). */
export const STOP_ABOVE = 250000;

/** Groups the readings of placements, level by level. */
export function groupReadings(level: number, readings: readonly (ReadonlyMap<number, readonly string[]>)[]): LevelBreakdowns[] {
  const out: LevelBreakdowns[] = [];
  for (let k = 0; k < level; k++) {
    const by = new Map<string, { size: number; placements: number[] }>();
    let read = 0;
    readings.forEach((r, p) => {
      const tokens = r.get(k);
      if (!tokens) return;
      read++;
      const key = canonicalReading(tokens);
      (by.get(key) ?? by.set(key, { size: tokens.length, placements: [] }).get(key)!).placements.push(p);
    });
    const breakdowns = [...by].map(([key, b]) => ({ key, ...b })).sort((x, y) => y.placements.length - x.placements.length || x.size - y.size || (x.key < y.key ? -1 : 1));
    out.push({ level: k, read, breakdowns });
  }
  return out;
}

/** Every placement of the circuit `c` is one of, read at every level below its own, and its breakdowns per level. */
export function breakdownsOf(cs: CircuitShapes, c: BornCircuit, stopAbove = STOP_ABOVE): CircuitBreakdowns {
  const word = wordKey(cs, c);
  const { placements, later } = placementsOf(cs, c, word);
  const readings = placements.map((p) => new Map(readDown(cs, p, stopAbove).readings.map((r) => [r.level, r.tokens] as const)));
  return { level: c.level, length: c.length, word, placements, families: placements.map(familyOf), later, levels: groupReadings(c.level, readings) };
}

/** One level of two circuits compared: A at `level`, B at `levelB`. */
export interface LevelOverlap {
  readonly level: number;
  readonly levelB: number;
  /** Breakdowns both have, only A has, only B has. */
  readonly shared: number;
  readonly onlyA: number;
  readonly onlyB: number;
  /** Per breakdown of each (in its own order), whether the other has it. */
  readonly inB: readonly boolean[];
  readonly inA: readonly boolean[];
  /** Placements of each reading as a breakdown the other has, and placements read. */
  readonly placementsA: { readonly shared: number; readonly read: number };
  readonly placementsB: { readonly shared: number; readonly read: number };
  /** Whether every shared breakdown is read by as many placements of A as of B. */
  readonly sameCounts: boolean;
}

/** A against B, B's level k + (B's level − A's) against A's level k, for every level of A both are read at. A is the lower of the two. */
export function overlap(a: CircuitBreakdowns, b: CircuitBreakdowns): LevelOverlap[] {
  const offset = b.level - a.level;
  const out: LevelOverlap[] = [];
  for (let k = 0; k < a.level; k++) {
    const la = a.levels[k], lb = b.levels[k + offset];
    if (!la || !lb || la.read === 0 || lb.read === 0) continue;
    const keysA = new Set(la.breakdowns.map((x) => x.key)), keysB = new Set(lb.breakdowns.map((x) => x.key));
    const inB = la.breakdowns.map((x) => keysB.has(x.key)), inA = lb.breakdowns.map((x) => keysA.has(x.key));
    const shared = inB.filter(Boolean).length;
    const countB = new Map(lb.breakdowns.map((x) => [x.key, x.placements.length]));
    const sameCounts = la.breakdowns.every((x) => !keysB.has(x.key) || countB.get(x.key) === x.placements.length);
    const weigh = (l: LevelBreakdowns, flags: readonly boolean[]) => l.breakdowns.reduce((s, x, i) => s + (flags[i] ? x.placements.length : 0), 0);
    out.push({
      level: k,
      levelB: k + offset,
      shared,
      onlyA: la.breakdowns.length - shared,
      onlyB: lb.breakdowns.length - shared,
      inB,
      inA,
      placementsA: { shared: weigh(la, inB), read: la.read },
      placementsB: { shared: weigh(lb, inA), read: lb.read },
      sameCounts,
    });
  }
  return out;
}

const nf = (n: number) => n.toLocaleString('en-US');

/** "B reads as A in 7 of 9 breakdowns (152 of 160 placements)", from B's side of a level compared. */
export function readsAs(o: LevelOverlap, nameA: string, nameB: string): string {
  const total = o.shared + o.onlyB;
  return `${nameB} reads as ${nameA} in ${nf(o.shared)} of ${nf(total)} breakdown${total === 1 ? '' : 's'} (${nf(o.placementsB.shared)} of ${nf(o.placementsB.read)} placements)`;
}

/** How a comparison comes out from A's level `from` up: the same breakdowns at every level, some shared at every level, or none shared at some level. */
export function verdict(rows: readonly LevelOverlap[], from = 0): 'same' | 'overlap' | 'differ' {
  const at = rows.filter((o) => o.level >= from);
  if (at.every((o) => o.onlyA === 0 && o.onlyB === 0)) return 'same';
  return at.every((o) => o.shared > 0) ? 'overlap' : 'differ';
}

/** What a page needs of a circuit's breakdowns: counts only, no readings. */
export interface BreakdownSummary {
  readonly level: number;
  readonly length: number;
  readonly placements: number;
  readonly families: number;
  readonly later: number;
  readonly levels: readonly { readonly level: number; readonly read: number; readonly items: readonly { readonly size: number; readonly count: number; readonly families: number }[] }[];
}

export function summarise(b: CircuitBreakdowns): BreakdownSummary {
  return {
    level: b.level,
    length: b.length,
    placements: b.placements.length,
    families: new Set(b.families).size,
    later: b.later,
    levels: b.levels.map((l) => ({
      level: l.level,
      read: l.read,
      items: l.breakdowns.map((x) => ({ size: x.size, count: x.placements.length, families: new Set(x.placements.map((p) => b.families[p])).size })),
    })),
  };
}
