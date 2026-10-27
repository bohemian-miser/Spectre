import { describe, expect, it } from 'vitest';
import { chordFit, radiusOfGyration, referenceShape, runSums, tilePositions } from '../chord-fit';

/** Mean distance per point over the radius of gyration, at start 0. */
function fit(sides: number, k: number, L = 6000): { unsigned: number; signed: number } {
  const p = referenceShape(sides, L);
  const f = chordFit(p, k, [0]);
  const s = L * radiusOfGyration(p);
  return { unsigned: f.unsigned[0] / s, signed: f.signed[0] / s };
}

describe('chord fit against closed forms', () => {
  it('a circle: mean sagitta r (sin(a)/a - cos a), a = pi / k, all outside', () => {
    for (const k of [3, 5, 6]) {
      const a = Math.PI / k;
      const want = Math.sin(a) / a - Math.cos(a);
      const got = fit(0, k);
      expect(got.unsigned).toBeCloseTo(want, 4);
      expect(got.signed).toBeCloseTo(want, 4);
    }
  });

  it('a hexagon cut at its corners: 0 for 6; for 3 the middle corner sits r/2 off, mean r/4, Rg = r sqrt(5/6)', () => {
    expect(fit(6, 6).unsigned).toBeCloseTo(0, 9);
    expect(fit(6, 3).unsigned).toBeCloseTo(0.25 / Math.sqrt(5 / 6), 4);
  });

  it('a triangle cut at its corners: 0 for 3 and for 6', () => {
    expect(fit(3, 3).unsigned).toBeCloseTo(0, 9);
    expect(fit(3, 6).unsigned).toBeCloseTo(0, 9);
  });

  it('signs: a dent inside the chord reads negative, a clockwise circle is turned round and bulges out', () => {
    const square = [
      { x: 0, y: 0 },
      { x: 1, y: 0.5 },
      { x: 2, y: 0 },
      { x: 2, y: 1 },
      { x: 2, y: 2 },
      { x: 1, y: 2 },
      { x: 0, y: 2 },
      { x: 0, y: 1 },
    ];
    expect(runSums(square, 4, 0)).toEqual({ unsigned: [0.5, 0, 0, 0], signed: [-0.5, 0, 0, 0] });
    const clockwise = referenceShape(0, 600).map((p) => ({ x: p.x, y: -p.y }));
    const f = chordFit(tilePositions(clockwise), 3, [0]);
    expect(f.signed[0]).toBeCloseTo(f.unsigned[0], 9);
    expect(f.signed[0]).toBeGreaterThan(0);
  });
});
