import { describe, expect, it } from 'vitest';
import {
  IDENT,
  det,
  inv,
  mul,
  radians,
  toSvgMatrix,
  transPt,
  trot,
  ttrans,
  type Affine,
} from '../geom';

/** Independent transcription of the old p5-based utils.ts, for equivalence. */
const legacy = {
  inv: (T: number[]): number[] => {
    const d = T[0] * T[4] - T[1] * T[3];
    return [
      T[4] / d,
      -T[1] / d,
      (T[1] * T[5] - T[2] * T[4]) / d,
      -T[3] / d,
      T[0] / d,
      (T[2] * T[3] - T[0] * T[5]) / d,
    ];
  },
  mul: (A: number[], B: number[]): number[] => [
    A[0] * B[0] + A[1] * B[3],
    A[0] * B[1] + A[1] * B[4],
    A[0] * B[2] + A[1] * B[5] + A[2],
    A[3] * B[0] + A[4] * B[3],
    A[3] * B[1] + A[4] * B[4],
    A[3] * B[2] + A[4] * B[5] + A[5],
  ],
};

describe('geom', () => {
  it('mul/inv match the legacy implementation', () => {
    const A: Affine = [0.5, -0.25, 3, 1.5, 2, -4];
    const B: Affine = mul(trot(0.7), ttrans(2, -3));
    expect(mul(A, B)).toEqual(legacy.mul([...A], [...B]));
    expect(inv(A)).toEqual(legacy.inv([...A]));
  });

  it('inv is a true inverse', () => {
    const M = mul(ttrans(3, -2), trot(radians(37)));
    const round = mul(M, inv(M));
    round.forEach((v, i) => expect(v).toBeCloseTo(IDENT[i], 12));
  });

  it('transPt applies the row-major layout', () => {
    expect(transPt([2, 0, 1, 0, 3, -1], { x: 4, y: 5 })).toEqual({ x: 9, y: 14 });
  });

  it('rotation preserves length and orientation', () => {
    const r = trot(radians(90));
    const p = transPt(r, { x: 1, y: 0 });
    expect(p.x).toBeCloseTo(0, 12);
    expect(p.y).toBeCloseTo(1, 12);
    expect(det(r)).toBeCloseTo(1, 12);
  });

  it('toSvgMatrix reorders row-major to column-major', () => {
    // Row-major [a b c / d e f] -> matrix(a, d, b, e, c, f)
    expect(toSvgMatrix([1, 2, 3, 4, 5, 6])).toEqual([1, 4, 2, 5, 3, 6]);
    // and the SVG matrix must transform points the same way we do
    const M: Affine = [0.3, -0.9, 12, 0.9, 0.3, -4];
    const [a, b, c, d, e, f] = toSvgMatrix(M);
    const p = { x: 2, y: -7 };
    const viaSvg = { x: a * p.x + c * p.y + e, y: b * p.x + d * p.y + f };
    expect(viaSvg.x).toBeCloseTo(transPt(M, p).x, 12);
    expect(viaSvg.y).toBeCloseTo(transPt(M, p).y, 12);
  });
});
