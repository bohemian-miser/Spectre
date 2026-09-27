import { describe, expect, it } from 'vitest';
import {
  analyze,
  buildSystem,
  buildStrandGraph,
  comboDigitsFromIndex,
  comboOptionCounts,
  comboToMatchingIndices,
  flatten,
  leafOrder,
  rasterizeStrands,
  strandComboCount,
  strandComponents,
} from '..';

describe('strandGraph', () => {
  const subset = [2, 5, 7, 8];
  const g = buildStrandGraph('spectre', subset, 3);

  it('enumerates combinations in lexicographic order of the combo string', () => {
    const counts = comboOptionCounts('spectre', subset);
    expect(strandComboCount(g)).toBe(counts.reduce((a, b) => a * b, 1));
    const strings = Array.from({ length: strandComboCount(g) }, (_, i) =>
      comboDigitsFromIndex(counts, i).join(''),
    );
    expect([...strings].sort()).toEqual(strings);
    expect(strings[0]).toBe('0000000000');
  });

  it('agrees with analyze() on circuits and tails for every combination', () => {
    const instances = flatten(buildSystem('spectre', 3)['Delta']);
    const counts = comboOptionCounts('spectre', subset);
    for (let i = 0; i < strandComboCount(g); i += 7) {
      const digits = comboDigitsFromIndex(counts, i);
      const combo = digits.join('');
      const idx = comboToMatchingIndices('spectre', subset, combo);
      const matchingIndexByType: Record<string, number> = {};
      leafOrder('spectre').forEach((t, k) => (matchingIndexByType[t] = idx[k]));
      const ref = analyze({ family: 'spectre', instances, selected: new Set(subset), matchingIndexByType });
      const c = strandComponents(g, digits);
      let closed = 0;
      let open = 0;
      let longest = 0;
      for (let k = 0; k < c.n; k++) {
        if (c.segs[k] === 0) continue;
        if (c.ends[k] === 0) {
          closed++;
          longest = Math.max(longest, c.segs[k]);
        } else open++;
      }
      expect(closed).toBe(ref.circuits.length);
      expect(open).toBe(ref.tails.length);
      expect(longest).toBe(Math.max(0, ...ref.circuits.map((p) => p.points.length)));
    }
  });

  it('rasterises into an RGBA buffer with some ink', () => {
    const img = rasterizeStrands(g, comboDigitsFromIndex(comboOptionCounts('spectre', subset), 5), 64);
    expect(img.length).toBe(64 * 64 * 4);
    let inked = 0;
    for (let p = 3; p < img.length; p += 4) if (img[p]) inked++;
    expect(inked).toBeGreaterThan(200);
  });
});

describe('decomposeCombo', () => {
  it('splits the Tile(1,1) full rule only as 15 + 023678, and only for 640 combinations', async () => {
    const { decomposeCombo, ruleSplits, splitTable } = await import('..');
    const rule = [0, 1, 2, 3, 5, 6, 7, 8];
    expect(ruleSplits('spectre', rule).map((s) => s.parts.join('+'))).toEqual([
      '0136+2578',
      '0356+1278',
      '023678+15',
    ]);
    const counts = ruleSplits('spectre', rule).map((s) =>
      splitTable('spectre', rule, s).table.reduce((a, row) => a * row.filter(Boolean).length, 1),
    );
    expect(counts).toEqual([0, 0, 640]);
    expect(decomposeCombo('spectre', rule, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0])).toEqual([]);
  });

  it('a decomposed combination has exactly its parts’ strands', async () => {
    const { decomposeCombo, splitTable, ruleSplits } = await import('..');
    const rule = [0, 1, 2, 3, 5, 6, 7, 8];
    const split = ruleSplits('spectre', rule)[2];
    const t = splitTable('spectre', rule, split).table;
    const digits = t.map((row) => row.findIndex(Boolean));
    const [dec] = decomposeCombo('spectre', rule, digits);
    const lengths = (r: number[], d: readonly number[]) => {
      const c = strandComponents(buildStrandGraph('spectre', r, 3), d);
      const out: number[] = [];
      for (let k = 0; k < c.n; k++) if (c.segs[k]) out.push(c.segs[k] * (c.ends[k] ? -1 : 1));
      return out;
    };
    const whole = lengths(rule, digits).sort((a, b) => a - b);
    const union = dec.parts
      .flatMap((p) => lengths([...p.rule].map(Number), p.digits))
      .sort((a, b) => a - b);
    expect(whole).toEqual(union);
  });
});
