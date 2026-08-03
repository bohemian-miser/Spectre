/**
 * Acceptance oracle (DESIGN.md §10.2 / §12.1): running the ported pipeline on
 * the Delta supertile must reproduce the pre-computed rows in
 * `graph_analysis/lvl4.csv` and `lvl6.csv` — circuit counts, tail counts,
 * maxima, the set of circuit lengths and the full tail-length histogram.
 *
 * This simultaneously pins the connection-point geometry, the matching
 * enumeration order, the combination-string codec, welding and the tracer.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { analyze, pathLength } from '../circuits';
import { buildSystem, flatten } from '../tiles';
import { leafOrder } from '../families';
import { comboToMatchingIndices } from '../matchings';
import { parseStatsCsv, type ComboRow } from '../stats';

const lvl4 = parseStatsCsv(readFileSync(new URL('../../data/lvl4.csv', import.meta.url), 'utf8'));
const lvl6 = parseStatsCsv(readFileSync(new URL('../../data/lvl6.csv', import.meta.url), 'utf8'));

interface Summary {
  circuits: number;
  tails: number;
  maxCircuit: number;
  maxTail: number;
  circuitLengths: number[];
  tailLengths: [number, number][];
}

function summarize(level: number, row: ComboRow): Summary {
  const subset = [...row.edgeSelection].map((c) => Number.parseInt(c, 10));
  const indices = comboToMatchingIndices('spectre', subset, row.combo);
  const matchingIndexByType: Record<string, number> = {};
  leafOrder('spectre').forEach((type, i) => (matchingIndexByType[type] = indices[i]));

  const a = analyze({
    family: 'spectre',
    instances: flatten(buildSystem('spectre', level)['Delta']),
    selected: new Set(subset),
    matchingIndexByType,
  });
  return {
    circuits: a.circuits.length,
    tails: a.tails.length,
    maxCircuit: Math.max(0, ...a.circuits.map(pathLength)),
    maxTail: Math.max(0, ...a.tails.map(pathLength)),
    circuitLengths: [...a.circuitsByLength.keys()].sort((x, y) => x - y),
    tailLengths: [...a.tailsByLength.entries()]
      .map(([len, list]) => [len, list.length] as [number, number])
      .sort((x, y) => x[0] - y[0]),
  };
}

function expected(row: ComboRow): Summary {
  return {
    circuits: row.circuits,
    tails: row.tails,
    maxCircuit: row.maxCircuit,
    maxTail: row.maxTail,
    circuitLengths: [...row.circuitLengths].sort((x, y) => x - y),
    tailLengths: [...row.tailLengths.entries()].sort((x, y) => x[0] - y[0]),
  };
}

describe('graph_analysis oracle', () => {
  it('reproduces lvl4.csv row 1 (subset 2578, all-zero combo)', () => {
    const row = lvl4[0];
    expect(row.combo).toBe('0000000000');
    expect(summarize(4, row)).toEqual(expected(row));
  });

  it('reproduces a lvl4 row with a non-zero combo digit', () => {
    const row = lvl4.find((r) => r.combo === '0000000100');
    expect(row).toBeDefined();
    expect(summarize(4, row as ComboRow)).toEqual(expected(row as ComboRow));
  });

  it('reproduces all 270 rows of lvl4.csv', () => {
    for (const row of lvl4) {
      expect(summarize(4, row), `${row.edgeSelection}-${row.combo}`).toEqual(expected(row));
    }
  }, 120000);

  it('reproduces lvl6.csv row 1 (272 791 tiles)', () => {
    expect(summarize(6, lvl6[0])).toEqual(expected(lvl6[0]));
  }, 120000);
});
