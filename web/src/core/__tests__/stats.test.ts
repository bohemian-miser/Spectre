import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  countByEdgeSelection,
  parseCsvRows,
  parsePyDict,
  parsePyList,
  parseStatsCsv,
} from '../stats';
import { LEAF_ORDER } from '../families';

const lvl4 = readFileSync(new URL('../../data/lvl4.csv', import.meta.url), 'utf8');
const lvl6 = readFileSync(new URL('../../data/lvl6.csv', import.meta.url), 'utf8');

describe('stats CSV parsing', () => {
  it('handles quoted fields containing commas', () => {
    const rows = parseCsvRows('a,b\n1,"x, y"\n2,"say ""hi"""\n');
    expect(rows).toEqual([
      ['a', 'b'],
      ['1', 'x, y'],
      ['2', 'say "hi"'],
    ]);
  });

  it('parses Python list and dict literals', () => {
    expect(parsePyList('[3, 4, 5]')).toEqual([3, 4, 5]);
    expect(parsePyList('[]')).toEqual([]);
    expect([...parsePyDict('{2: 491, 1: 118, 3: 1}').entries()]).toEqual([
      [2, 491],
      [1, 118],
      [3, 1],
    ]);
    expect(parsePyDict('{}').size).toBe(0);
  });

  it('parses 270 rows from each dataset with correct types', () => {
    for (const [name, raw] of [['lvl4', lvl4], ['lvl6', lvl6]] as const) {
      const rows = parseStatsCsv(raw);
      expect(rows.length, name).toBe(270);
      for (const r of rows) {
        expect(r.combo.length).toBe(LEAF_ORDER.length);
        expect(Number.isInteger(r.tails)).toBe(true);
        expect(Number.isInteger(r.circuits)).toBe(true);
        expect(r.edgeSelection).toMatch(/^[0-8]+$/);
        expect(r.circuitLengths.every(Number.isFinite)).toBe(true);
        // max_circuit is the largest listed circuit length (0 when none)
        expect(r.maxCircuit).toBe(Math.max(0, ...r.circuitLengths));
        // tail_lengths counts sum to the tail total
        const total = [...r.tailLengths.values()].reduce((a, b) => a + b, 0);
        expect(total).toBe(r.tails);
        expect(r.maxTail).toBe(Math.max(0, ...r.tailLengths.keys()));
      }
    }
  });

  it('reads the first lvl4 row exactly', () => {
    const first = parseStatsCsv(lvl4)[0];
    expect(first).toMatchObject({
      combo: '0000000000',
      tails: 610,
      circuits: 1472,
      maxTail: 3,
      maxCircuit: 5,
      edgeSelection: '2578',
    });
    expect(first.circuitLengths).toEqual([3, 4, 5]);
    expect([...first.tailLengths.entries()]).toEqual([[2, 491], [1, 118], [3, 1]]);
  });

  it('summarizes the six analyzed subsets', () => {
    const counts = countByEdgeSelection(parseStatsCsv(lvl4));
    expect([...counts.entries()].sort((a, b) => b[1] - a[1])).toEqual([
      ['023678', 160],
      ['2578', 64],
      ['1278', 32],
      ['0356', 8],
      ['15', 4],
      ['0136', 2],
    ]);
  });
});
