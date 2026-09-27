import { describe, expect, it } from 'vitest';
import { comboOptionCounts, mysticCorrespondence, ruleCorrespondences } from '..';

describe('rule correspondences', () => {
  const rows = ruleCorrespondences();
  const byIso = new Map(rows.map((r) => [r.iso, r]));

  it('lines up every iso rule with its hexagon and Tile(1,1) forms', () => {
    expect(rows.map((r) => [r.iso, r.hex, r.spectre])).toEqual([
      ['15', '15', '15'],
      ['1278', '128', '1278'],
      ['2578', '258', '2578'],
      ['01346', '01346', '0136'],
      ['03456', '03456', '0356'],
      ['0234678', '023468', '023678'],
      ['012345678', '01234568', '01235678'],
    ]);
  });

  it('counts combinations per family', () => {
    expect(rows.map((r) => [r.counts.spectre, r.counts.hex, r.counts.iso])).toEqual([
      [4, 4, 4],
      [32, 32, 32],
      [64, 64, 64],
      [2, 8, 8],
      [8, 16, 32],
      [160, 320, 800],
      [625000, 1953125, 3906250],
    ]);
  });

  it('rules without class 6 are the same patterns in all three', () => {
    for (const iso of ['15', '1278', '2578']) {
      const r = byIso.get(iso)!;
      expect(r.identical).toBe(true);
      expect(r.hexAndIso).toBe(r.counts.iso);
      expect(r.hexOnly).toBe(0);
    }
  });

  it('splits the full rule into shared, hexagon-only, Tile(1,1) and iso-only', () => {
    const r = byIso.get('012345678')!;
    expect(r.hexAndIso).toBe(1562500);
    expect(r.hexOnly).toBe(390625);
    expect(r.tileImage).toBe(625000);
    expect(r.isoOnly).toBe(1718750);
    expect(r.hexAndIso + r.hexOnly).toBe(r.counts.hex);
    expect(r.hexAndIso + r.tileImage + r.isoOnly).toBe(r.counts.iso);
  });

  it('the Mystic and the hexagon Gamma differ by a whole factor of the other tiles', () => {
    for (const r of rows) {
      const m = mysticCorrespondence([...r.iso].map(Number));
      const hexRest = r.counts.hex / m.hexGammaOptions;
      const isoRest = r.counts.iso / m.mysticPairs;
      expect(hexRest).toBe(isoRest);
      expect(Number.isInteger(hexRest)).toBe(true);
    }
    expect(comboOptionCounts('hex', [0, 1, 2, 3, 4, 5, 6, 8]).length).toBe(9);
  });
});
