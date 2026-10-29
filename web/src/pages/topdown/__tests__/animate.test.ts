import { describe, expect, it } from 'vitest';
import { parentId } from '../../../core';
import { TILE_SPAN, applySimilarity, fitSimilarity, planStep, similarityAffine, tileFrame } from '../animate';
import { boardsFor, drawTiles } from '../board';
import { transPt } from '../../../core';

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

describe('planStep', () => {
  for (const family of ['spectre', 'hex'] as const) {
    it(`${family}: each supertile ends where the board puts it`, () => {
      const boards = boardsFor(family, 'Delta', ['*', '*']);
      const before = drawTiles(boards[1], family);
      const after = drawTiles(boards[2], family);
      const plan = planStep(before, after);
      expect(plan.parents.map((p) => p.id).sort()).toEqual(before.map((t) => t.id).sort());
      for (const p of plan.parents) {
        const kids = after.filter((t) => parentId(t.id) === p.id);
        const cx = kids.reduce((s, t) => s + t.centre.x, 0) / kids.length;
        const cy = kids.reduce((s, t) => s + t.centre.y, 0) / kids.length;
        const old = before.find((t) => t.id === p.id)!;
        const at = transPt(plan.enlarge, old.centre);
        expect(Math.hypot(at.x + p.offset.x - cx, at.y + p.offset.y - cy)).toBeLessThan(1e-9);
        expect(p.start).toBeGreaterThanOrEqual(0);
        expect(p.start).toBeLessThanOrEqual(1 - TILE_SPAN + 1e-12);
      }
    });
  }
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
