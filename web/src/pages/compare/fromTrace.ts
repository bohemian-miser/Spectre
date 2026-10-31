/**
 * A circuit traced in the Explorer, named the way Compare names circuits:
 * its combination, the level it is born at in the renormalisation, and its
 * length. The level is the lowest at which `CircuitShapes` sees a circuit of
 * that length born, which is the level `distinctCircuits` keeps it at.
 *
 * One circuit is held as Compare's "A" between traces (the first pick); the
 * second pick opens Compare on the two.
 */

import { CircuitShapes } from '../shapes/circuitShapes';
import { formatRef, parseRef, type CircuitRef } from './refs';

/** Deepest level searched for a circuit's birth (the Shapes page goes this far too). */
export const BORN_SEARCH_MAX = 9;

const built = new Map<string, CircuitShapes>();

/**
 * The level at which a circuit of `length` tiles is first born under this
 * hexagon rule and combination, or null if none is by `maxLevel`.
 */
export function bornLevel(subset: readonly number[], combo: string, length: number, maxLevel: number = BORN_SEARCH_MAX): number | null {
  const key = `${subset.join('')}-${combo}`;
  let cs = built.get(key);
  if (!cs) {
    cs = new CircuitShapes('hex', subset, [...combo].map((ch) => parseInt(ch, 36)), 0, 1, true);
    built.set(key, cs);
    while (built.size > 4) built.delete(built.keys().next().value!);
  }
  for (let n = 1; n <= maxLevel; n++) {
    if (cs.maxLevel < n) cs.extend(n);
    if (cs.born.some((c) => c.level === n && c.length === length)) return n;
  }
  return null;
}

/** The Compare name of a traced circuit, or null if it is not born by `maxLevel`. */
export function circuitRefOf(subset: readonly number[], combo: string, length: number, maxLevel?: number): CircuitRef | null {
  const level = bornLevel(subset, combo, length, maxLevel);
  return level === null ? null : { subset: [...subset], combo, level, length };
}

const PENDING_KEY = 'spectre.compare.pending';

/** The circuit picked as Compare's A, waiting for a B. */
export function readPending(): CircuitRef | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? parseRef(raw) : null;
  } catch {
    return null;
  }
}

export function writePending(ref: CircuitRef | null): void {
  try {
    if (ref) localStorage.setItem(PENDING_KEY, formatRef(ref));
    else localStorage.removeItem(PENDING_KEY);
  } catch {
    // Storage blocked: the pick lasts as long as the page does.
  }
}
