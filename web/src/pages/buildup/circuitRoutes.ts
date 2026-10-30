/**
 * The routes a circuit uses. A circuit closing in a level-n supertile enters
 * each of its children at a place and follows that child's route to the
 * mate; each of those routes is made of its own children's routes, and so on
 * down. At every level k below n the circuit is a multiset of level-k
 * routes, each passed some number of times.
 *
 * Arcs are expanded once per distinct (type, place) with their passes
 * carried as a count, so the work at a level is bounded by the size of the
 * level's tables, not by the circuit's length.
 */
import type { HexType } from '../../core';
import type { BornCircuit, CircuitShapes } from '../shapes/circuitShapes';
import { routeName } from './routes';

/** The routes a circuit uses at one level: per type, the route's lower place to its passes. */
export interface LevelUse {
  readonly level: number;
  readonly byType: ReadonlyMap<HexType, ReadonlyMap<number, number>>;
  /** Distinct routes (type and pair of places). */
  readonly routes: number;
  readonly passes: number;
}

/** The routes the circuit uses at each level below its own, indexed by level. */
export function circuitUse(cs: CircuitShapes, c: BornCircuit): LevelUse[] {
  const out: LevelUse[] = [];
  // directed arcs at the current level: `type place` -> passes
  let cur = new Map<string, number>();
  const add = (m: Map<string, number>, type: string, k: number, count: number) => {
    const key = `${type} ${k}`;
    m.set(key, (m.get(key) ?? 0) + count);
  };
  for (const s of c.steps) {
    const ch = cs.childOf(c.level, c.type, s);
    add(cur, ch.type, ch.k, 1);
  }
  for (let n = c.level - 1; n >= 0; n--) {
    const byType = new Map<HexType, Map<number, number>>();
    let routes = 0, passes = 0;
    for (const [key, count] of cur) {
      const [type, ks] = key.split(' ');
      const k = Number(ks);
      const m = cs.levels[n][type].mate(k);
      const lo = m < 0 ? k : Math.min(k, m);
      const t = byType.get(type as HexType) ?? byType.set(type as HexType, new Map()).get(type as HexType)!;
      if (!t.has(lo)) routes++;
      t.set(lo, (t.get(lo) ?? 0) + count);
      passes += count;
    }
    out[n] = { level: n, byType, routes, passes };
    if (n === 0) break;
    const next = new Map<string, number>();
    for (const [key, count] of cur) {
      const [type, ks] = key.split(' ');
      for (const e of cs.enters(n, type, Number(ks))) add(next, e.type, e.k, count);
    }
    cur = next;
  }
  return out;
}

/** A used route described by type, places, tiles, passes and composition (its child types, `routes.ts`). */
export interface UsedRoute {
  readonly type: HexType;
  readonly from: number;
  readonly to: number;
  readonly tiles: number;
  readonly passes: number;
  readonly composition: string;
}

/** The routes used at one level, most passes first. */
export function usedRoutes(cs: CircuitShapes, use: LevelUse): UsedRoute[] {
  const n = use.level;
  const out: UsedRoute[] = [];
  for (const [type, m] of use.byType) {
    const T = cs.levels[n][type];
    for (const [from, passes] of m) {
      const composition = n === 0 ? `${type} ${from}–${T.mate(from)}` : routeName(cs.enters(n, type, from).map((e) => e.type)).composition;
      out.push({ type, from, to: T.mate(from), tiles: T.len(from), passes, composition });
    }
  }
  return out.sort((a, b) => b.passes - a.passes || b.tiles - a.tiles);
}

/** Per composition (type and composition), the passes of the routes with it. */
export function byComposition(routes: readonly UsedRoute[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of routes) m.set(`${r.type}: ${r.composition}`, (m.get(`${r.type}: ${r.composition}`) ?? 0) + r.passes);
  return m;
}
