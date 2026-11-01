/**
 * Supertiles built from some of a level's routes only: the ones a followed
 * circuit uses there (`circuitRoutes.ts`), kept, and every other route of
 * that level dropped.
 *
 * A route of the level above is glued from routes of this level, one for
 * each child the strand passes through (`Table.route`). Built from the kept
 * routes alone it is there exactly when every one of those is kept, since a
 * strand that meets a dropped route ends there; a circuit closing at the
 * level above is there on the same condition. So the kept routes of each
 * level follow from the level below's, read off the full tables, and the
 * supertiles need not be built again.
 */
import type { HexType } from '../../core';
import type { BornCircuit, CircuitShapes } from '../shapes/circuitShapes';
import type { LevelUse } from './circuitRoutes';

/** The routes kept at one level: per type, each kept route's lower place. */
export interface KeptLevel {
  readonly level: number;
  readonly byType: ReadonlyMap<HexType, ReadonlySet<number>>;
  /** Kept routes, over every type. */
  readonly routes: number;
  /** Routes of the level's tables, over every type. */
  readonly of: number;
}

/** Routes of every type at a level, once per pair. */
const routesAt = (cs: CircuitShapes, n: number): number =>
  Object.values(cs.levels[n]).reduce((s, T) => s + T.routes(), 0);

/** The lower place of the route through place p of a table. */
const lowerOf = (cs: CircuitShapes, n: number, type: string, p: number): number => {
  const m = cs.levels[n][type].mate(p);
  return m < 0 ? p : Math.min(p, m);
};

/** The routes a circuit uses at a level, kept. */
export function keptFromUse(cs: CircuitShapes, u: LevelUse): KeptLevel {
  const byType = new Map<HexType, ReadonlySet<number>>();
  for (const [type, m] of u.byType) byType.set(type, new Set(m.keys()));
  return { level: u.level, byType, routes: u.routes, of: routesAt(cs, u.level) };
}

/** Whether the route through child crossing `step` of a level-n supertile of `type` is kept one level down. */
const stepKept = (cs: CircuitShapes, n: number, kidType: readonly string[], below: KeptLevel, step: number): boolean => {
  const ct = kidType[step & 7];
  return below.byType.get(ct as HexType)?.has(lowerOf(cs, n - 1, ct, step >>> 3)) ?? false;
};

/** Each slot's child type in a level-n supertile of `type`. */
const kidTypesOf = (cs: CircuitShapes, n: number, type: string): string[] => {
  const out = new Array<string>(8);
  for (const ch of cs.childTypes(n, type)) out[ch.pos] = ch.type;
  return out;
};

/** The routes of the level above `below` that are glued from kept routes alone. */
export function stackKept(cs: CircuitShapes, below: KeptLevel): KeptLevel {
  const n = below.level + 1;
  if (n > cs.maxLevel) throw new Error(`level ${n} is not built`);
  const byType = new Map<HexType, ReadonlySet<number>>();
  let routes = 0, of = 0;
  for (const [type, T] of Object.entries(cs.levels[n])) {
    const kidType = kidTypesOf(cs, n, type);
    const kept = new Set<number>();
    for (const k of T.crossings()) {
      if (T.mate(k) <= k) continue;
      of++;
      const { steps } = T.route(k);
      let ok = true;
      for (let i = 0; i < steps.length && ok; i++) ok = stepKept(cs, n, kidType, below, steps[i]);
      if (ok) kept.add(k);
    }
    if (kept.size) byType.set(type as HexType, kept);
    routes += kept.size;
  }
  return { level: n, byType, routes, of };
}

/** Whether a circuit closing one level above `below` is glued from kept routes alone. */
export function closesFromKept(cs: CircuitShapes, c: BornCircuit, below: KeptLevel): boolean {
  if (c.level !== below.level + 1) return false;
  const kidType = kidTypesOf(cs, c.level, c.type);
  return c.steps.every((s) => stepKept(cs, c.level, kidType, below, s));
}

/**
 * The kept routes at each level from `from` (a circuit's routes there) up
 * to `upTo`, indexed by level; `so far` carries on from levels already
 * worked out, as the supertiles are built higher.
 */
export function keptLevels(cs: CircuitShapes, use: LevelUse, upTo: number, soFar: readonly KeptLevel[] = []): KeptLevel[] {
  const out = soFar.slice();
  if (!out[use.level]) out[use.level] = keptFromUse(cs, use);
  for (let n = use.level + 1; n <= Math.min(upTo, cs.maxLevel); n++) if (!out[n]) out[n] = stackKept(cs, out[n - 1]);
  return out;
}
