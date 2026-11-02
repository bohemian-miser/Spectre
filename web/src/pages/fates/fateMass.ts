/**
 * The tiles on the tails at one level, followed up through every placement
 * at once, each placement taking its share of a supertile's copies
 * (`placements.ts`): where they close, level by level, and what is still
 * open at the top. Each type's tails start weighted by the type's
 * frequency, as the Foundations shares weight them, so the result is the
 * share of the tails' tiles, over every copy of every supertile, that each
 * fate takes. `tailFates` (`foundations/pageData.ts`) works the same shares
 * out from the account of chords; the two agree when the account splits a
 * tail with several fates by how often each placement occurs.
 */
import type { BornCircuit, CircuitShapes } from '../shapes/circuitShapes';
import { typeFrequencies } from '../foundations/foundations';
import { lift, type Lifts } from './lifts';
import { placements, TYPES } from './placements';

export interface FateMass {
  readonly from: number;
  readonly top: number;
  /** Per label, the share of the tails' tiles closing into it at each level (index = level). */
  readonly closed: Map<string, number[]>;
  /** Shares still open at the top, on a certified line or not. */
  readonly open: number;
  readonly line: number;
}

export function fateMass(
  cs: CircuitShapes,
  liftsAt: (level: number, type: string) => Lifts,
  labelOf: (c: BornCircuit) => string,
  top: number,
  lineAt: ReadonlyMap<string, ReadonlySet<number>>,
  from: number,
): FateMass {
  const freq = typeFrequencies('hex');
  const place = placements();
  let mass: Record<string, Float64Array> = {};
  let total = 0;
  TYPES.forEach((X, xi) => {
    const T = cs.levels[from][X];
    const v = new Float64Array(T.size);
    for (const k of T.crossings()) {
      if (T.mate(k) < k) continue;
      v[k] = freq[xi] * T.len(k);
      total += v[k];
    }
    mass[X] = v;
  });
  const closed = new Map<string, number[]>();
  const named = new Map<string, string[]>();
  const add = (label: string, level: number, x: number): void => {
    const row = closed.get(label) ?? closed.set(label, new Array<number>(top + 1).fill(0)).get(label)!;
    row[level] += x / total;
  };
  for (let m = from; m < top; m++) {
    const next: Record<string, Float64Array> = Object.fromEntries(TYPES.map((P) => [P, new Float64Array(cs.levels[m + 1][P].size)]));
    for (const X of TYPES) {
      const T = cs.levels[m][X];
      const v = mass[X];
      for (const k of T.crossings()) {
        if (!v[k] || T.mate(k) < k) continue;
        for (const p of place[X]) {
          const to = lift(liftsAt(m + 1, p.parent), k, p.slot)!;
          const x = v[k] * p.weight;
          if ('arc' in to) next[p.parent][to.arc] += x;
          else {
            const key = `${m + 1}/${p.parent}`;
            let list = named.get(key);
            if (!list) named.set(key, (list = liftsAt(m + 1, p.parent).closings.map(labelOf)));
            add(list[to.closing], m + 1, x);
          }
        }
      }
    }
    mass = next;
  }
  let open = 0, line = 0;
  for (const P of TYPES) {
    const v = mass[P];
    const lines = lineAt.get(P);
    for (let k = 0; k < v.length; k++) {
      if (!v[k]) continue;
      if (lines?.has(k)) line += v[k] / total;
      else open += v[k] / total;
    }
  }
  return { from, top, closed, open, line };
}

