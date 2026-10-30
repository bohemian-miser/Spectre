/**
 * A level's routes split into the ones every type shares and what each type
 * has beyond them (`shapes/circuitShapes.ts` keeps them as one common table
 * with each type's absences and overrides; this only reads them).
 *
 * The core is the routes every type but Gamma has, identical in each: both
 * crossings, joined to each other, through as many tiles. Gamma is left out
 * of it, its border differing most. A type's extras are its routes that are
 * not in the core: routes the others lack, and routes that run differently.
 */
import type { CircuitShapes } from '../shapes/circuitShapes';

/** A route as [crossing, the crossing it leads to (-1: it ends inside), tiles], once per pair, the lower crossing first. */
export type Route = readonly [number, number, number];

/** The types the core is taken over. */
export const CORE_TYPES = ['Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi'] as const;

/** The core at a level: the routes every type in `CORE_TYPES` has, identical in each. */
export function coreRoutes(cs: CircuitShapes, n: number): Route[] {
  const Ts = CORE_TYPES.map((t) => cs.levels[n][t]);
  const out: Route[] = [];
  for (const k of Ts[0].crossings()) {
    const m = Ts[0].mate(k), len = Ts[0].len(k);
    if (m >= 0 && m < k) continue;
    if (Ts.every((T) => T.has(k) && T.mate(k) === m && T.len(k) === len && (m < 0 || T.has(m)))) out.push([k, m, len]);
  }
  return out;
}

/** A type's routes beyond the core: every route of its table not in the core. */
export function extraRoutes(cs: CircuitShapes, n: number, type: string, core: readonly Route[]): Route[] {
  const T = cs.levels[n][type];
  const inCore = new Set(core.map((r) => `${r[0]} ${r[1]} ${r[2]}`));
  const out: Route[] = [];
  for (const k of T.crossings()) {
    const m = T.mate(k);
    if (m >= 0 && m < k) continue;
    const r: Route = [k, m, T.len(k)];
    if (!inCore.has(`${r[0]} ${r[1]} ${r[2]}`)) out.push(r);
  }
  return out;
}

/** A type's table rebuilt from the level's common arrays, its overrides and its presence: mate (-1 where absent) and tiles per crossing. */
export function rebuilt(cs: CircuitShapes, n: number, type: string): { mate: Int32Array; len: Float64Array } {
  const T = cs.levels[n][type];
  const L = T.level;
  const mate = new Int32Array(L.size).fill(-1);
  const len = new Float64Array(L.size);
  for (let p = 0; p < L.size; p++) {
    if (!T.has(p)) continue;
    mate[p] = L.mate[p];
    len[p] = L.arcLen[p];
  }
  for (const [k, o] of T.ownEntries()) {
    mate[k] = o.mate;
    len[k] = o.len;
  }
  return { mate, len };
}
