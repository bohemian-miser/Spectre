/**
 * Tiny scale helpers for the hand-rolled SVG charts (no chart dependency —
 * DESIGN.md §2 "Charts (stats page)": hand-rolled SVG bars/tables).
 *
 * Everything here is pure arithmetic so the axes can be unit tested.
 */

export interface Scale {
  (value: number): number;
  readonly domain: readonly [number, number];
  readonly range: readonly [number, number];
}

function makeScale(
  fn: (v: number) => number,
  domain: readonly [number, number],
  range: readonly [number, number],
): Scale {
  return Object.assign(fn, { domain, range }) as Scale;
}

export function linearScale(
  domain: readonly [number, number],
  range: readonly [number, number],
): Scale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0 || 1;
  return makeScale((v) => r0 + ((v - d0) / span) * (r1 - r0), domain, range);
}

/** Log10 scale; values ≤ 0 clamp to the domain minimum (they have no log). */
export function logScale(
  domain: readonly [number, number],
  range: readonly [number, number],
): Scale {
  const d0 = Math.max(domain[0], Number.MIN_VALUE);
  const d1 = Math.max(domain[1], d0 * 10);
  const [r0, r1] = range;
  const l0 = Math.log10(d0);
  const span = Math.log10(d1) - l0 || 1;
  return makeScale(
    (v) => r0 + ((Math.log10(Math.max(v, d0)) - l0) / span) * (r1 - r0),
    [d0, d1],
    range,
  );
}

/** Powers of ten covering [min, max], always at least two of them. */
export function logTicks(min: number, max: number, limit = 8): number[] {
  const lo = Math.floor(Math.log10(Math.max(min, Number.MIN_VALUE)));
  const hi = Math.ceil(Math.log10(Math.max(max, 10)));
  const all: number[] = [];
  for (let e = lo; e <= hi; e++) all.push(10 ** e);
  if (all.length <= limit) return all;
  // Thin out evenly, always keeping the ends.
  const step = Math.ceil(all.length / limit);
  const kept = all.filter((_, i) => i % step === 0);
  if (kept[kept.length - 1] !== all[all.length - 1]) kept.push(all[all.length - 1]);
  return kept;
}

/**
 * Decade ticks that actually fall inside a scale's domain. `logTicks` covers
 * the domain (its ends can sit outside it, which would draw labels off the
 * plot); this trims to what fits, falling back to the domain ends when a
 * domain spans less than one decade.
 */
export function ticksWithin(domain: readonly [number, number], limit = 8): number[] {
  const inside = logTicks(domain[0], domain[1], limit).filter(
    (t) => t >= domain[0] && t <= domain[1],
  );
  return inside.length > 0 ? inside : [Math.round(domain[0]), Math.round(domain[1])];
}

/** Extent of a list, padded so a single-valued list still has a span. */
export function extent(values: readonly number[], fallback: readonly [number, number] = [1, 10]): [number, number] {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return [fallback[0], fallback[1]];
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  return min === max ? [min, min * 10 || 10] : [min, max];
}

/**
 * Push label positions apart so near-equal values stay readable (two
 * selections can sit one tail apart — 10 946 vs 10 945 — and would otherwise
 * print on top of each other). Order is preserved; only spacing changes.
 */
export function spreadLabels(ys: readonly number[], minGap: number): number[] {
  const order = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y);
  const out = new Array<number>(ys.length).fill(0);
  let prev = -Infinity;
  for (const { y, i } of order) {
    const v = Math.max(y, prev + minGap);
    out[i] = v;
    prev = v;
  }
  return out;
}
