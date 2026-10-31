/**
 * Numbers `(a + b sqrt(3)) / d` with BigInt parts, for the tests' brute-force
 * pictures: written apart from `raster.ts`, which decides the same question
 * in scaled integers.
 */

export interface Q3 {
  readonly a: bigint;
  readonly b: bigint;
  readonly d: bigint;
}

export const q3 = (a: bigint, b = 0n, d = 1n): Q3 => (d < 0n ? { a: -a, b: -b, d: -d } : { a, b, d });

export const add = (x: Q3, y: Q3): Q3 => q3(x.a * y.d + y.a * x.d, x.b * y.d + y.b * x.d, x.d * y.d);
export const neg = (x: Q3): Q3 => q3(-x.a, -x.b, x.d);
export const sub = (x: Q3, y: Q3): Q3 => add(x, neg(y));
export const mul = (x: Q3, y: Q3): Q3 => q3(x.a * y.a + 3n * x.b * y.b, x.a * y.b + x.b * y.a, x.d * y.d);

/** Sign of the number. */
export function sign(x: Q3): number {
  const { a, b } = x;
  if (a >= 0n && b >= 0n) return a === 0n && b === 0n ? 0 : 1;
  if (a <= 0n && b <= 0n) return -1;
  const s = a * a - 3n * b * b;
  const v = s > 0n ? 1 : s < 0n ? -1 : 0;
  return a > 0n ? v : -v;
}

/** `k * 2^e` as a rational. */
export const dyadic = (k: number, e: number): Q3 => (e >= 0 ? q3(BigInt(k) << BigInt(e)) : q3(BigInt(k), 0n, 1n << BigInt(-e)));

/** A lattice point `(i / 4, j sqrt(3) / 4)`. */
export const latticePt = (i: number, j: number): [Q3, Q3] => [q3(BigInt(i), 0n, 4n), q3(0n, BigInt(j), 4n)];

/** Whether the centre of pixel (m, n) of level s lies within `num/den` pixels of segment A -> B. */
export function coversBrute(ai: number, aj: number, bi: number, bj: number, m: number, n: number, s: number, num: number, den: number): boolean {
  const cx = dyadic(2 * m + 1, s - 1);
  const cy = dyadic(2 * n + 1, s - 1);
  const [ax, ay] = latticePt(ai, aj);
  const [bx, by] = latticePt(bi, bj);
  const rr = mul(q3(BigInt(num), 0n, BigInt(den)), dyadic(1, s));
  const r2 = mul(rr, rr);
  const d2 = (px: Q3, py: Q3): Q3 => {
    const x = sub(cx, px);
    const y = sub(cy, py);
    return add(mul(x, x), mul(y, y));
  };
  if (sign(sub(d2(ax, ay), r2)) <= 0) return true;
  if (sign(sub(d2(bx, by), r2)) <= 0) return true;
  const ex = sub(bx, ax);
  const ey = sub(by, ay);
  const cxa = sub(cx, ax);
  const cya = sub(cy, ay);
  const dot = add(mul(cxa, ex), mul(cya, ey));
  const L = add(mul(ex, ex), mul(ey, ey));
  if (sign(dot) <= 0 || sign(sub(dot, L)) >= 0) return false;
  const cross = sub(mul(ex, cya), mul(ey, cxa));
  return sign(sub(mul(cross, cross), mul(r2, L))) <= 0;
}
