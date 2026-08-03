/**
 * The data model, checked against the real `public/data/circuit_stats.json`.
 *
 * These assertions are the page's contract with `docs/STATS_NOTES.md`: every
 * headline number the page prints is re-derived here from the shipped file, so
 * a regenerated dataset that moves a story fails the build instead of quietly
 * making the prose wrong.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  StatsDataError,
  circuitFreeRows,
  fibonacciIndex,
  formatCompact,
  formatCount,
  formatRatio,
  parseStatsDataset,
  PHI_6,
  ratioExtremeRows,
  rowsForHolders,
  shareString,
  statAt,
  tailGrowth,
  type StatsDataset,
} from '../statsData';

const RAW: unknown = JSON.parse(
  readFileSync(new URL('../../../../public/data/circuit_stats.json', import.meta.url), 'utf8'),
);

const data: StatsDataset = parseStatsDataset(RAW);

describe('parseStatsDataset — coverage', () => {
  it('reads 270 configurations shared by both depths', () => {
    expect(data.rows).toHaveLength(270);
    expect(data.meta.rowCounts).toEqual({ lvl4: 270, lvl6: 270 });
    expect(new Set(data.rows.map((r) => r.id)).size).toBe(270);
  });

  it('exposes the 6 selections with data, not the 8 app-valid ones', () => {
    expect(data.meta.appValidSelections).toHaveLength(8);
    expect(data.meta.selectionsInData).toHaveLength(6);
    expect([...data.meta.absentFromData].sort()).toEqual(['', '01235678']);
    expect(data.selections.map((s) => [s.selection, s.nCombos])).toEqual([
      ['023678', 160],
      ['2578', 64],
      ['1278', 32],
      ['0356', 8],
      ['15', 4],
      ['0136', 2],
    ]);
  });

  it('totals match the verified dataset headline (finding 6)', () => {
    expect(data.totals.lvl4.circuits).toBe(118244);
    expect(data.totals.lvl6.circuits).toBe(8315567);
    const family = data.selections.find((s) => s.selection === '023678')!;
    expect(family.levels.lvl6.circuits.sumAcrossCombos).toBe(3834233);
  });

  it('carries the units and caveats verbatim', () => {
    expect(data.meta.lengthUnit).toMatch(/segment/i);
    expect(data.meta.lengthUnitExplanation).toMatch(/segment/i);
    expect(data.meta.caveats.length).toBeGreaterThanOrEqual(4);
  });
});

describe('finding 1 — the circuit-free candidates', () => {
  const free = circuitFreeRows(data);

  it('finds exactly four, all in selection 1278, identical at both depths', () => {
    expect(free.map((r) => r.combo).sort()).toEqual([
      '0010100000',
      '0011000000',
      '0100100000',
      '0101000000',
    ]);
    expect(new Set(free.map((r) => r.selection))).toEqual(new Set(['1278']));
    for (const row of free) {
      expect(row.lvl4.circuits).toBe(0);
      expect(row.lvl6.circuits).toBe(0);
      expect(row.lvl4.circuitLengths).toEqual([]);
      expect(row.lvl6.circuitLengths).toEqual([]);
      expect(row.circuitRatio).toBeNull();
    }
  });

  it('describes the flagship 1278/0100100000 exactly', () => {
    const row = data.rowsById.get('1278-0100100000')!;
    expect(shareString(row)).toBe('1278-0100100000');
    expect(row.lvl6.tails).toBe(4);
    expect(row.lvl6.tailLengths).toEqual([
      { length: 1, count: 2 },
      { length: 108864, count: 1 },
      { length: 248348, count: 1 },
    ]);
    expect(row.lvl4.maxTail).toBe(4053);
    expect(row.lvl6.maxTail).toBe(248348);
    expect(row.lvl6.maxTail / row.lvl4.maxTail).toBeCloseTo(61.3, 1);
  });
});

describe('finding 2 — tails depend only on the edge selection', () => {
  it('is constant across every combo of every (level, selection) group', () => {
    for (const s of data.selections) {
      expect(s.tailsPerCombo.lvl4, `${s.selection} lvl4`).not.toBeNull();
      expect(s.tailsPerCombo.lvl6, `${s.selection} lvl6`).not.toBeNull();
    }
  });

  it('is Fibonacci for 2578: 610 = F(15) → 10946 = F(21)', () => {
    const s = data.selections.find((x) => x.selection === '2578')!;
    expect(s.tailsPerCombo.lvl4).toBe(610);
    expect(s.tailsPerCombo.lvl6).toBe(10946);
    expect(fibonacciIndex(610)).toBe(15);
    expect(fibonacciIndex(10946)).toBe(21);
    expect(fibonacciIndex(611)).toBeNull();
  });

  it('clusters the growth ratios at φ⁶, except the frozen 1278', () => {
    expect(PHI_6).toBeCloseTo(17.944, 3);
    const points = tailGrowth(data);
    const frozen = points.filter((p) => (p.ratio ?? 1) <= 1.5);
    expect(frozen.map((p) => p.selection)).toEqual(['1278']);
    expect(frozen[0].lvl4).toBe(4);
    expect(frozen[0].lvl6).toBe(4);
    for (const p of points.filter((x) => (x.ratio ?? 1) > 1.5)) {
      expect(p.ratio, p.selection).toBeGreaterThan(17.8);
      expect(p.ratio, p.selection).toBeLessThan(18.03);
    }
  });
});

describe('finding 3 — frozen vs growing circuit vocabularies', () => {
  it('splits 88 frozen / 182 growing and never loses a length', () => {
    expect(data.growth.stableCircuitLengthSets).toBe(88);
    expect(data.growth.pairsWithNewLengthsAtLvl6).toBe(182);
    expect(data.growth.pairsWithLostLengthsAtLvl6).toBe(0);
    // The model recomputes the same split from the per-combo length sets.
    expect(data.rows.filter((r) => r.stableCircuitLengths)).toHaveLength(88);
    expect(data.rows.every((r) => r.lvl4.circuitLengths.every((l) => r.lvl6.circuitLengths.includes(l)))).toBe(
      true,
    );
  });

  it('attributes the frozen sets to 15 (4/4), 1278 (27/32) and 2578 (57/64)', () => {
    const frozenBySelection = Object.fromEntries(
      data.selections.map((s) => [s.selection, s.nStableCircuitLengthSets]),
    );
    expect(frozenBySelection).toEqual({
      '023678': 0,
      '2578': 57,
      '1278': 27,
      '0356': 0,
      '15': 4,
      '0136': 0,
    });
  });

  it('keeps selection 15 inside {3, 6, 9} at both depths', () => {
    const rows = data.rows.filter((r) => r.selection === '15');
    // Combo order, not CSV order: the four sets are [3], [3,6], [3,6,9] ×2.
    const sets = rows.map((r) => r.lvl6.circuitLengths.join(',')).sort();
    expect(sets).toEqual(['3', '3,6', '3,6,9', '3,6,9']);
    for (const r of rows) {
      expect(r.lvl4.circuitLengths).toEqual(r.lvl6.circuitLengths);
      expect(r.stableCircuitLengths).toBe(true);
    }
    const sel = data.selections.find((s) => s.selection === '15')!;
    expect(sel.levels.lvl4.maxCircuit.max).toBe(9);
    expect(sel.levels.lvl6.maxCircuit.max).toBe(9);
    const ratio =
      sel.levels.lvl6.circuits.sumAcrossCombos / sel.levels.lvl4.circuits.sumAcrossCombos;
    expect(ratio).toBeGreaterThan(70);
    expect(ratio).toBeLessThan(80);
  });
});

describe('findings 4 & 5 — growth and records', () => {
  it('reports circuit growth between ×62.0 and ×139.7', () => {
    expect(data.growth.circuitCountRatio.min).toBeCloseTo(61.98, 2);
    expect(data.growth.circuitCountRatio.max).toBeCloseTo(139.68, 2);
    expect(data.growth.circuitCountRatio.mean).toBeCloseTo(74.83, 2);
    expect(data.growth.circuitCountRatio.median).toBeCloseTo(71.3, 2);
    expect(data.growth.nCircuitBearingPairs).toBe(266);

    const withRatio = data.rows.filter((r) => r.circuitRatio !== null);
    expect(withRatio).toHaveLength(266);
    // NOTE (deviation from docs/STATS_NOTES.md finding 4): the ×139.68 maximum
    // is a THREE-way tie, not the single config the notes name.
    const fastest = ratioExtremeRows(data, 'max');
    expect(fastest.map((r) => r.id)).toEqual([
      '023678-0201000000',
      '023678-0311000000',
      '023678-0401000000',
    ]);
    expect(new Set(fastest.map((r) => `${r.lvl4.circuits}->${r.lvl6.circuits}`))).toEqual(
      new Set(['19->2654']),
    );
    const slowest = ratioExtremeRows(data, 'min');
    expect(slowest.map((r) => r.id)).toEqual(['1278-0000100000', '1278-0001000000']);
    const slowestTen = [...withRatio]
      .sort((a, b) => a.circuitRatio! - b.circuitRatio!)
      .slice(0, 10);
    expect(new Set(slowestTen.map((r) => r.selection))).toEqual(new Set(['1278']));
  });

  it('holds the 27,621-segment record circuit and its tie lists', () => {
    expect(data.records.longestCircuit.lengthSegments).toBe(27621);
    expect(data.records.longestCircuit.holders).toEqual([
      { level: 'lvl6', selection: '023678', combo: '0311000000' },
    ]);
    expect(data.records.longestCircuit.sameConfigMaxCircuitAtLvl4).toBe(332);
    expect(data.records.longestCircuit.growthFactor).toBeCloseTo(83.2, 1);

    const [row] = rowsForHolders(data, data.records.longestCircuit.holders);
    expect(row.lvl6.maxCircuit).toBe(27621);
    expect(row.lvl4.maxCircuit).toBe(332);

    expect(data.records.longestTail.lengthSegments).toBe(248348);
    expect(data.records.longestTail.holders[0].combo).toBe('0100100000');

    expect(data.records.mostDistinctCircuitLengths.nDistinct).toBe(15);
    expect(data.records.mostDistinctCircuitLengths.holders).toHaveLength(7);
    expect(rowsForHolders(data, data.records.mostDistinctCircuitLengths.holders)).toHaveLength(7);
    for (const r of rowsForHolders(data, data.records.mostDistinctCircuitLengths.holders)) {
      expect(r.lvl6.nDistinctCircuitLengths).toBe(15);
    }
  });
});

describe('row integrity', () => {
  it('keeps tail histograms consistent with the tail totals at both depths', () => {
    for (const row of data.rows) {
      for (const level of ['lvl4', 'lvl6'] as const) {
        const s = statAt(row, level);
        const sum = s.tailLengths.reduce((acc, b) => acc + b.count, 0);
        expect(sum, `${row.id} ${level}`).toBe(s.tails);
        if (s.tailLengths.length > 0) {
          expect(s.tailLengths[s.tailLengths.length - 1].length).toBe(s.maxTail);
        }
        expect(s.circuitLengths.length).toBe(s.nDistinctCircuitLengths);
        expect(Math.max(0, ...s.circuitLengths)).toBe(s.maxCircuit);
        expect(s.circuits === 0).toBe(s.circuitLengths.length === 0);
      }
    }
  });
});

describe('parse failures', () => {
  it('rejects non-objects and malformed files with a located message', () => {
    expect(() => parseStatsDataset(null)).toThrow(StatsDataError);
    expect(() => parseStatsDataset({ meta: {} })).toThrow(/circuit_stats\.json/);
    const broken = JSON.parse(JSON.stringify(RAW)) as Record<string, unknown>;
    delete (broken.levels as Record<string, unknown>).lvl6;
    expect(() => parseStatsDataset(broken)).toThrow(/levels\.lvl6/);
  });
});

describe('formatters', () => {
  it('formats counts, ratios and compact axis labels', () => {
    expect(formatCount(8315567)).toBe('8,315,567');
    expect(formatRatio(74.83)).toBe('×74.8');
    expect(formatRatio(139.68)).toBe('×140');
    expect(formatRatio(null)).toBe('—');
    expect(formatCompact(1)).toBe('1');
    expect(formatCompact(1200)).toBe('1.2k');
    expect(formatCompact(250000)).toBe('250k');
    expect(formatCompact(8315567)).toBe('8.3M');
    expect(formatCompact(83155670)).toBe('83M');
  });
});
