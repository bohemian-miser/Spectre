/**
 * The tails at the top level built, followed further through the routes
 * (`SparseRoutes`) up a sampled ancestry, as the Explorer's tail classes
 * follow a patch: each sample is a tile on a tail at the top (a type by its
 * frequency, an arc by its tiles) and a parent, grandparent and so on up to
 * `cap`, each placement drawn by how often it occurs (`placements.ts`). The
 * closing it reaches is named from the combination's circuits (`Catalog`).
 */
import { typeFrequencies } from '../foundations/foundations';
import { RouteLimit, typeIndex, type SparseRoutes } from '../harmonics/sparseRoutes';
import { classKey, nameClosing, type Catalog } from '../explorer/tailClasses';
import type { CircuitShapes } from '../shapes/circuitShapes';
import { liftArc } from './follow';
import { placements, TYPES } from './placements';

/** Where one sampled tail went: a class (`classKey`: `chain <id>`, `nugget <id>`, `unknown`), still `open` at the cap, or `budget` when the routes ran out. */
export interface Followed {
  readonly type: string;
  readonly a: number;
  readonly tiles: number;
  readonly ancestry: readonly { readonly parent: string; readonly slot: number }[];
  readonly fate: string;
  /** The level it closed at; open, the cap; out of routes, the level it was open at. */
  readonly level: number;
}

/** A seeded generator of numbers in [0, 1). */
export function random(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Routes kept at most before the routes are worked out afresh, so memory stays bounded. */
const KEEP = 2e7;

/**
 * Samples `count` tiles on tails at `top` and follows each up to `cap`, at
 * most `routes` routes each. `fresh` gives routes above the build, and the
 * circuits by name, again when those held grow past `KEEP`.
 */
export function followAbove(
  cs: CircuitShapes,
  fresh: () => { R: SparseRoutes; catalog: Catalog },
  top: number,
  cap: number,
  count: number,
  seed = 1,
  routes = 3e5,
  onSample: (done: number) => void = () => {},
): Followed[] {
  let { R, catalog } = fresh();
  const rnd = random(seed);
  const freq = typeFrequencies('hex');
  const place = placements();
  // per type, its arcs and their running tiles
  const arcs = TYPES.map((X) => {
    const T = cs.levels[top][X];
    const at: number[] = [];
    const cum: number[] = [];
    let s = 0;
    for (const k of T.crossings()) {
      if (T.mate(k) < k) continue;
      at.push(k);
      cum.push((s += T.len(k)));
    }
    return { at, cum, total: s };
  });
  const typeCum: number[] = [];
  let ts = 0;
  TYPES.forEach((_, i) => typeCum.push((ts += freq[i] * arcs[i].total)));
  const pick = (cum: readonly number[], x: number): number => {
    let lo = 0, hi = cum.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] > x) hi = mid;
      else lo = mid + 1;
    }
    return lo;
  };
  const out: Followed[] = [];
  for (let i = 0; i < count; i++) {
    const ti = pick(typeCum, rnd() * ts);
    const X = TYPES[ti];
    const k = arcs[ti].at[pick(arcs[ti].cum, rnd() * arcs[ti].total)];
    const ancestry: Followed['ancestry'][number][] = [];
    let below = X;
    for (let n = top; n < cap; n++) {
      let r = rnd();
      const ps = place[below];
      const p = ps.find((x) => (r -= x.weight) < 0) ?? ps[ps.length - 1];
      ancestry.push({ parent: p.parent, slot: p.slot });
      below = p.parent;
    }
    if (R.work.routes > KEEP) ({ R, catalog } = fresh());
    R.limit = R.work.calls + routes;
    let a = k;
    let fate = 'open';
    let level = top;
    try {
      for (; level < cap; level++) {
        const n = level;
        const st = ancestry[n - top];
        const up = liftArc(R, n, a, typeIndex.get(st.parent)!, st.slot, TYPES);
        if (up.kind === 'ends' || up.kind === 'closed') {
          fate = up.kind === 'ends' ? 'ends' : classKey(nameClosing(R, catalog, up.walk, n >= R.base ? 'routes' : 'tables'));
          level = n + 1;
          break;
        }
        a = up.a;
      }
    } catch (err) {
      if (!(err instanceof RouteLimit)) throw err;
      fate = 'budget';
    }
    out.push({ type: X, a: k, tiles: cs.levels[top][X].len(k), ancestry, fate, level });
    onSample(i + 1);
  }
  return out;
}
