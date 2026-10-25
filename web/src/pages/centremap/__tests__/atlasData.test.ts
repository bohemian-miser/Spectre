import { describe, expect, it } from 'vitest';
import { comboOptionCounts, matchesJoins, matchesPattern, selectionPatterns, validEdgeSubsets, type EdgeJoin } from '../../../core';
import { atlasMatches, atlasPairing, atlasPatterns, buildAtlas, type AtlasMeta } from '../atlasData';

function fakeAtlas() {
  let offset = 0;
  const rules = validEdgeSubsets('hex')
    .filter((s) => s.edges.length)
    .slice(0, 6)
    .map((s) => {
      const optionCounts = comboOptionCounts('hex', s.edges);
      const total = optionCounts.reduce((a, b) => a * b, 1);
      const r = { subset: s.edges, optionCounts, offset, total };
      offset += total;
      return r;
    });
  const meta: AtlasMeta = {
    family: 'hex',
    level: 3,
    total: offset,
    rules,
    landmarks: [],
    distinct: offset,
    bounds: { min: [-2, 10], max: [2, 30] },
    files: { xy: 'xy.i16', longest: 'longest.u16' },
  };
  const xy = new Int16Array(2 * offset);
  for (let i = 0; i < offset; i++) {
    xy[2 * i] = -32767 + ((i * 7919) % 65535);
    xy[2 * i + 1] = 32767;
  }
  return buildAtlas(meta, xy, new Uint16Array(offset));
}

describe('atlasData', () => {
  const atlas = fakeAtlas();
  const n = atlas.meta.total;

  it('unscales the layout to its bounds', () => {
    expect(atlas.xy[1]).toBeCloseTo(30, 4);
    for (let i = 0; i < n; i++) expect(Math.abs(atlas.xy[2 * i])).toBeLessThanOrEqual(2.0001);
  });

  it('matches a search digit by digit, as the string tests would', () => {
    const joins: EdgeJoin[] = [{ type: 'Gamma', a: 0, b: 3 }];
    const searches = [
      { rule: '', pattern: '', joins: [] },
      { rule: '', pattern: '1?0', joins: [] },
      { rule: atlasPairing(atlas, n - 1).rule, pattern: '?1', joins: [] },
      { rule: '', pattern: '', joins },
    ];
    for (const s of searches) {
      const { mask, count } = atlasMatches(atlas, s);
      let want = 0;
      for (let i = 0; i < n; i++) {
        const p = atlasPairing(atlas, i);
        const hit = (!s.rule || p.rule === s.rule) && matchesPattern(p.combo, s.pattern) && matchesJoins('hex', p.subset, p.combo, s.joins);
        expect(mask[i]).toBe(hit ? 1 : 0);
        if (hit) want++;
      }
      expect(count).toBe(want);
    }
  });

  it('sums up a selection like selectionPatterns', () => {
    const picked = Array.from({ length: n }, (_, i) => i).filter((i) => i % 3 === 0);
    const items = picked.map((i) => atlasPairing(atlas, i));
    const want = selectionPatterns('hex', items);
    const got = atlasPatterns(atlas, picked);
    expect(got.map((p) => [p.rule, p.count, p.pattern])).toEqual(want.map((p) => [p.rule, p.count, p.pattern]));
    expect(got[0].spread).toEqual(want[0].spread);
  });
});
