import { describe, expect, it } from 'vitest';
import { transPt } from '../../../core';
import { TILE_SPAN, applySimilarity, fitSimilarity, planClusters, similarityAffine, tileFrame } from '../animate';

describe('fitSimilarity', () => {
  const pts = [
    { x: 0, y: 0 },
    { x: 3, y: 1 },
    { x: -2, y: 5 },
    { x: 4, y: -3 },
  ];
  for (const mirror of [false, true]) {
    it(`recovers a ${mirror ? 'mirrored' : 'direct'} similarity`, () => {
      const s = { a: { x: 1.7, y: -2.1 }, b: { x: 5, y: -4 }, mirror };
      const fit = fitSimilarity(pts.map((p) => ({ from: p, to: applySimilarity(s, p) })));
      expect(fit.mirror).toBe(mirror);
      for (const p of pts) {
        const q = applySimilarity(fit, p);
        const r = transPt(similarityAffine(fit), p);
        const w = applySimilarity(s, p);
        expect(Math.hypot(q.x - w.x, q.y - w.y)).toBeLessThan(1e-9);
        expect(Math.hypot(r.x - w.x, r.y - w.y)).toBeLessThan(1e-9);
      }
    });
  }
});

describe('planClusters', () => {
  it('sweeps left to right and slides each cluster from its tile to its place', () => {
    const plan = planClusters([
      { id: 'b', tileCentre: { x: 5, y: 0 }, clusterCentre: { x: 5.5, y: 1 } },
      { id: 'a', tileCentre: { x: -5, y: 0 }, clusterCentre: { x: -4, y: 0 } },
      { id: 'c', tileCentre: { x: 9, y: 0 }, clusterCentre: { x: 9, y: 0 } },
    ]);
    expect(plan.map((p) => [p.id, p.start])).toEqual([
      ['b', (1 - TILE_SPAN) / 2],
      ['a', 0],
      ['c', 1 - TILE_SPAN],
    ]);
    expect(plan[0].offset).toEqual({ x: -0.5, y: -1 });
  });
});

describe('tileFrame', () => {
  it('starts hidden and away, ends shown and in place', () => {
    expect(tileFrame(0.2, 0)).toEqual({ shown: 0, remaining: 1 });
    expect(tileFrame(0.2, 1)).toEqual({ shown: 1, remaining: 0 });
    const mid = tileFrame(0, TILE_SPAN * 0.45);
    expect(mid.shown).toBe(1);
    expect(mid.remaining).toBe(1);
  });
});
