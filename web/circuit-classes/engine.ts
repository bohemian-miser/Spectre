/**
 * Sweep-side names for the strand-graph engine, which lives in
 * `src/core/strandGraph.ts` so the Classifications page can use it too.
 */
import {
  buildStrandGraph, comboDigitsFromIndex, pairOccurrences, strandComboCount, type StrandGraph,
} from '../src/core';

export type { StrandGraph };
export const buildGraph = buildStrandGraph;
export const comboCount = strandComboCount;
export const partners = pairOccurrences;

export function comboFromIndex(g: StrandGraph, idx: number): number[] {
  return comboDigitsFromIndex(g.options.map((o) => o.length), idx);
}

export function comboString(d: readonly number[]): string {
  return d.map((v) => v.toString(36)).join('');
}
