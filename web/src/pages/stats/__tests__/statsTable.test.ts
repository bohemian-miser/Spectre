/**
 * Filtering + sorting over the real 270-row dataset.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseStatsDataset, statAt, type ConfigRow } from '../statsData';
import {
  DEFAULT_SORT,
  EMPTY_FILTER,
  filterRows,
  nextSort,
  sortRows,
  sortValue,
} from '../statsTable';
import { extent, linearScale, logScale, logTicks, spreadLabels, ticksWithin } from '../scales';

const data = parseStatsDataset(
  JSON.parse(
    readFileSync(new URL('../../../../public/data/circuit_stats.json', import.meta.url), 'utf8'),
  ),
);
const rows = data.rows;

describe('filterRows', () => {
  it('passes everything through by default', () => {
    expect(filterRows(rows)).toHaveLength(270);
    expect(filterRows(rows, EMPTY_FILTER)).toHaveLength(270);
  });

  it('filters by one or more edge selections', () => {
    expect(filterRows(rows, { ...EMPTY_FILTER, selections: ['15'] })).toHaveLength(4);
    expect(filterRows(rows, { ...EMPTY_FILTER, selections: ['15', '0136'] })).toHaveLength(6);
    const only1278 = filterRows(rows, { ...EMPTY_FILTER, selections: ['1278'] });
    expect(only1278).toHaveLength(32);
    expect(only1278.every((r) => r.selection === '1278')).toBe(true);
  });

  it('searches combos and share strings, case-insensitively', () => {
    expect(filterRows(rows, { ...EMPTY_FILTER, query: '2578-0000001100' })).toHaveLength(1);
    // A bare combo can occur in more than one family; the search says so.
    const bare = filterRows(rows, { ...EMPTY_FILTER, query: '  0100100000 ' });
    expect(bare.every((r) => r.combo === '0100100000')).toBe(true);
    expect(bare.map((r) => r.selection)).toContain('1278');
    const prefix = filterRows(rows, { ...EMPTY_FILTER, query: '0311' });
    expect(prefix.length).toBeGreaterThan(0);
    expect(prefix.every((r) => r.id.includes('0311'))).toBe(true);
    expect(filterRows(rows, { ...EMPTY_FILTER, query: 'nope' })).toHaveLength(0);
  });

  it('offers the story predicates', () => {
    expect(filterRows(rows, { ...EMPTY_FILTER, flavor: 'circuit-free' })).toHaveLength(4);
    expect(filterRows(rows, { ...EMPTY_FILTER, flavor: 'stable-lengths' })).toHaveLength(88);
    expect(filterRows(rows, { ...EMPTY_FILTER, flavor: 'new-lengths' })).toHaveLength(182);
  });

  it('combines predicates', () => {
    const out = filterRows(rows, {
      selections: ['1278'],
      query: '01',
      flavor: 'circuit-free',
    });
    expect(out.map((r) => r.combo)).toEqual([
      '0010100000',
      '0011000000',
      '0100100000',
      '0101000000',
    ]);
  });
});

describe('sortRows', () => {
  const ids = (list: readonly ConfigRow[]): string[] => list.map((r) => r.id);

  it('defaults to selection-then-combo order', () => {
    const sorted = sortRows(rows, DEFAULT_SORT);
    expect(sorted[0].id.startsWith('0136-')).toBe(true);
    expect(ids(sorted)).toEqual([...ids(sorted)].sort());
  });

  it('sorts numerically at the active level', () => {
    const desc = sortRows(rows, { key: 'maxCircuit', dir: 'desc', level: 'lvl6' });
    expect(desc[0].id).toBe('023678-0311000000');
    expect(desc[0].lvl6.maxCircuit).toBe(27621);

    const at4 = sortRows(rows, { key: 'maxCircuit', dir: 'desc', level: 'lvl4' });
    expect(at4[0].lvl4.maxCircuit).toBe(
      Math.max(...rows.map((r) => r.lvl4.maxCircuit)),
    );

    const asc = sortRows(rows, { key: 'circuits', dir: 'asc', level: 'lvl6' });
    expect(asc[0].lvl6.circuits).toBe(0);
    expect(asc[asc.length - 1].lvl6.circuits).toBe(
      Math.max(...rows.map((r) => r.lvl6.circuits)),
    );
  });

  it('is a total order — equal values fall back to the configuration order', () => {
    // Every 1278 row has the same tail count, so the tie-break decides.
    const tied = sortRows(
      rows.filter((r) => r.selection === '1278'),
      { key: 'tails', dir: 'desc', level: 'lvl6' },
    );
    expect(ids(tied)).toEqual([...ids(tied)].sort());
    // Sorting twice is idempotent.
    expect(ids(sortRows(tied, { key: 'tails', dir: 'desc', level: 'lvl6' }))).toEqual(ids(tied));
  });

  it('parks the circuit-free rows below every real growth ratio', () => {
    const asc = sortRows(rows, { key: 'circuitRatio', dir: 'asc', level: 'lvl6' });
    expect(asc.slice(0, 4).every((r) => r.circuitFree)).toBe(true);
    expect(sortValue(asc[0], 'circuitRatio', 'lvl6')).toBe(-1);
  });

  it('does not mutate its input', () => {
    const before = ids(rows);
    sortRows(rows, { key: 'tails', dir: 'desc', level: 'lvl4' });
    expect(ids(rows)).toEqual(before);
  });

  it('reads every documented sort key', () => {
    const row = data.rowsById.get('2578-0000001100')!;
    expect(sortValue(row, 'circuits', 'lvl6')).toBe(row.lvl6.circuits);
    expect(sortValue(row, 'tails', 'lvl4')).toBe(row.lvl4.tails);
    expect(sortValue(row, 'maxCircuit', 'lvl6')).toBe(statAt(row, 'lvl6').maxCircuit);
    expect(sortValue(row, 'maxTail', 'lvl6')).toBe(row.lvl6.maxTail);
    expect(sortValue(row, 'distinct', 'lvl6')).toBe(15);
    expect(sortValue(row, 'config', 'lvl6')).toBe(0);
  });
});

describe('nextSort', () => {
  it('flips direction on the same column and starts new numeric columns descending', () => {
    const a = nextSort(DEFAULT_SORT, 'config');
    expect(a).toEqual({ ...DEFAULT_SORT, dir: 'desc' });
    const b = nextSort(DEFAULT_SORT, 'circuits');
    expect(b).toEqual({ ...DEFAULT_SORT, key: 'circuits', dir: 'desc' });
    expect(nextSort(b, 'circuits').dir).toBe('asc');
    expect(nextSort(b, 'config').dir).toBe('asc');
    expect(nextSort(b, 'tails').level).toBe(DEFAULT_SORT.level);
  });
});

describe('scales', () => {
  it('maps a linear domain onto a range', () => {
    const s = linearScale([0, 10], [0, 100]);
    expect(s(0)).toBe(0);
    expect(s(5)).toBe(50);
    expect(s(10)).toBe(100);
  });

  it('maps decades evenly on a log scale and clamps non-positive values', () => {
    const s = logScale([1, 1000], [0, 300]);
    expect(s(1)).toBeCloseTo(0);
    expect(s(10)).toBeCloseTo(100);
    expect(s(1000)).toBeCloseTo(300);
    expect(s(0)).toBeCloseTo(0);
    expect(s(-5)).toBeCloseTo(0);
  });

  it('produces powers of ten covering the domain', () => {
    expect(logTicks(1, 1000)).toEqual([1, 10, 100, 1000]);
    expect(logTicks(3, 250)).toEqual([1, 10, 100, 1000]);
    expect(logTicks(1, 1e9, 4).length).toBeLessThanOrEqual(5);
  });

  it('keeps axis ticks inside the domain', () => {
    const s = logScale([1, 1000], [0, 300]);
    expect(ticksWithin(s.domain)).toEqual([1, 10, 100, 1000]);
    // A sub-decade domain has no round tick to show, so it labels its ends.
    const narrow = logScale([2.25, 8], [0, 100]);
    expect(ticksWithin(narrow.domain)).toEqual([10]);
    expect(ticksWithin([3, 9])).toEqual([3, 9]);
  });

  it('spreads crowded labels without reordering them', () => {
    expect(spreadLabels([100, 101, 140], 13)).toEqual([100, 113, 140]);
    expect(spreadLabels([140, 101, 100], 13)).toEqual([140, 113, 100]);
    expect(spreadLabels([], 13)).toEqual([]);
  });

  it('pads a degenerate extent', () => {
    expect(extent([5])).toEqual([5, 50]);
    expect(extent([])).toEqual([1, 10]);
    expect(extent([2, 9, 4])).toEqual([2, 9]);
  });
});
