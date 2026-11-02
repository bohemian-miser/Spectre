/**
 * Where each arc of a level-m supertile goes in a level-(m + 1) supertile
 * holding it: the route of the parent's table it lies on, or the closing
 * walk it is part of. One table per parent type and level, read off the
 * build's routes (`CircuitShapes`), so every arc of every child is lifted at
 * once.
 */
import { slotOf, placeOf, type BornCircuit, type CircuitShapes } from '../shapes/circuitShapes';

/** The arcs of a level-m supertile's children, lifted into a level-(m + 1) supertile of `type`. */
export interface Lifts {
  readonly level: number;
  readonly type: string;
  /**
   * Per child crossing `childPlace * 8 + slot`: the parent's route through
   * it, as its lower end's place + 1; a closing, as -1 - its index in
   * `closings`; 0 when no strand passes (an empty slot, or a place the
   * child does not have).
   */
  readonly via: Int32Array;
  /** The closing walks of the parent, each once. */
  readonly closings: readonly BornCircuit[];
}

/** The lifts into a level-`level` supertile of `type` (level 1 to the top built). */
export function liftsOf(cs: CircuitShapes, level: number, type: string): Lifts {
  const below = cs.levels[level - 1];
  const Q = Object.values(below)[0].size;
  const via = new Int32Array(Q * 8);
  const T = cs.levels[level][type];
  const kids = cs.childTypes(level, type);
  const kidAt: string[] = [];
  for (const k of kids) kidAt[k.pos] = k.type;
  const mark = (step: number, v: number): void => {
    const s = slotOf(step);
    const child = below[kidAt[s]];
    via[step] = v;
    const m = child.mate(placeOf(step));
    if (m >= 0) via[m * 8 + s] = v;
  };
  for (const k of T.crossings()) {
    const m = T.mate(k);
    if (m < k) continue;
    for (const step of T.route(k).steps) mark(step, k + 1);
  }
  const closings: BornCircuit[] = [];
  for (const step of cs.closed[level]?.get(type) ?? []) {
    if (via[step] !== 0) continue;
    const w = cs.walkAbove(type, step, level - 1);
    if (!w.closed) throw new Error(`level ${level} ${type}: a closing step does not close`);
    const slots: number[] = [];
    for (const x of w.steps) if (!slots.includes(slotOf(x))) slots.push(slotOf(x));
    const c: BornCircuit = { level, type: type as BornCircuit['type'], length: w.length, slots, steps: w.steps };
    const v = -1 - closings.push(c) + 1;
    for (const x of w.steps) mark(x, v);
  }
  return { level, type, via, closings };
}

/** Where a level-(level - 1) arc entering its supertile at place `a` goes when that supertile is slot `slot` of `lifts`' parent. */
export function lift(l: Lifts, a: number, slot: number): { closing: number } | { arc: number } | null {
  const v = l.via[a * 8 + slot];
  if (v === 0) return null;
  return v < 0 ? { closing: -1 - v } : { arc: v - 1 };
}
