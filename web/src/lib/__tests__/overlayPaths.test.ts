import { describe, expect, it } from 'vitest';
import {
  TAIL_COLOR,
  analyze,
  buildSystem,
  flatten,
  pathLength,
  segmentKey,
  type CircuitAnalysis,
} from '../../core';
import {
  buildOverlayPaths,
  deriveCircuitColors,
  lengthChips,
  pathToD,
  pathToPoints,
  pathsBox,
  pathsOfLength,
  summaryChips,
  tailEndpoints,
} from '../overlayPaths';

/** A small but real analysis: spectre level 2 under the valid subset {1,5}. */
function smallAnalysis(): CircuitAnalysis {
  const instances = flatten(buildSystem('spectre', 2)['Delta']);
  return analyze({
    family: 'spectre',
    instances,
    selected: new Set([1, 5]),
    matchingIndexByType: {},
  });
}

/** A subset that leaves tails, so the open-path branches are covered too. */
function tailyAnalysis(): CircuitAnalysis {
  const instances = flatten(buildSystem('spectre', 1)['Delta']);
  return analyze({
    family: 'spectre',
    instances,
    selected: new Set([1]),
    matchingIndexByType: {},
  });
}

describe('path serialization', () => {
  it('emits M/L data and closes circuits with Z', () => {
    const a = smallAnalysis();
    expect(a.circuits.length).toBeGreaterThan(0);
    const d = pathToD(a.circuits[0]);
    expect(d.startsWith('M ')).toBe(true);
    expect(d.endsWith(' Z')).toBe(true);
    expect(d.split(' L ').length - 1).toBe(a.circuits[0].points.length - 1);
  });

  it('open paths are not closed', () => {
    const a = tailyAnalysis();
    expect(a.tails.length).toBeGreaterThan(0);
    expect(pathToD(a.tails[0]).endsWith(' Z')).toBe(false);
  });

  it('pathToPoints matches the polyline attribute form', () => {
    const p = { points: [{ x: 1, y: 2 }, { x: 3, y: 4 }], closed: false };
    expect(pathToPoints(p)).toBe('1,2 3,4');
    expect(pathToD(p)).toBe('M 1 2 L 3 4');
  });

  it('pathsBox covers every point', () => {
    const a = smallAnalysis();
    const box = pathsBox(a.circuits);
    for (const c of a.circuits) {
      for (const p of c.points) {
        expect(p.x).toBeGreaterThanOrEqual(box.min.x);
        expect(p.x).toBeLessThanOrEqual(box.max.x);
        expect(p.y).toBeGreaterThanOrEqual(box.min.y);
        expect(p.y).toBeLessThanOrEqual(box.max.y);
      }
    }
  });
});

describe('buildOverlayPaths', () => {
  it('emits one record per path and keeps circuits before tails', () => {
    const a = tailyAnalysis();
    const records = buildOverlayPaths({
      circuits: a.circuits,
      tails: a.tails,
      circuitColorByLength: a.circuitColorByLength,
    });
    const drawable = (list: readonly { points: readonly unknown[] }[]) =>
      list.filter((p) => p.points.length >= 2).length;
    expect(records).toHaveLength(drawable(a.circuits) + drawable(a.tails));

    const firstTail = records.findIndex((r) => r.kind === 'tail');
    const lastCircuit = records.map((r) => r.kind).lastIndexOf('circuit');
    if (firstTail >= 0 && lastCircuit >= 0) expect(lastCircuit).toBeLessThan(firstTail);
  });

  it('colours circuits from the analysis map and tails grey', () => {
    const a = tailyAnalysis();
    const records = buildOverlayPaths({
      circuits: a.circuits,
      tails: a.tails,
      circuitColorByLength: a.circuitColorByLength,
    });
    for (const r of records) {
      if (r.kind === 'circuit') expect(r.color).toBe(a.circuitColorByLength.get(r.length));
      else expect(r.color).toBe(TAIL_COLOR);
    }
  });

  it('accepts the worker response array form of the colour maps', () => {
    const a = smallAnalysis();
    const fromMap = buildOverlayPaths({
      circuits: a.circuits,
      tails: [],
      circuitColorByLength: a.circuitColorByLength,
    });
    const fromArray = buildOverlayPaths({
      circuits: a.circuits,
      tails: [],
      circuitColorByLength: [...a.circuitColorByLength.entries()],
    });
    expect(fromArray).toEqual(fromMap);
  });

  it('derives colours identically when none are supplied', () => {
    const a = smallAnalysis();
    const derived = deriveCircuitColors(a.circuits);
    for (const [len, color] of a.circuitColorByLength) expect(derived.get(len)).toBe(color);
  });

  it('splits rainbow tails into per-segment records with the analysis colours', () => {
    const instances = flatten(buildSystem('spectre', 1)['Delta']);
    const a = analyze(
      { family: 'spectre', instances, selected: new Set([1]), matchingIndexByType: {} },
      { rainbowTails: true },
    );
    const records = buildOverlayPaths(
      { circuits: [], tails: a.tails, segmentColor: a.segmentColor },
      { rainbowTails: true },
    );
    const expectedSegments = a.tails.reduce(
      (n, t) => n + Math.max(0, t.points.length - 1),
      0,
    );
    expect(records).toHaveLength(expectedSegments);

    const sample = a.tails.find((t) => t.points.length > 2);
    if (sample) {
      const key = segmentKey([sample.points[0], sample.points[1]]);
      const rec = records.find((r) => r.color === a.segmentColor.get(key));
      expect(rec).toBeDefined();
    }
  });

  it('honours show flags and the truncation guard', () => {
    const a = tailyAnalysis();
    const input = { circuits: a.circuits, tails: a.tails };
    expect(buildOverlayPaths(input, { showTails: false }).every((r) => r.kind === 'circuit')).toBe(
      true,
    );
    expect(
      buildOverlayPaths(input, { showCircuits: false }).every((r) => r.kind === 'tail'),
    ).toBe(true);
    const big = smallAnalysis();
    expect(big.circuits.length).toBeGreaterThan(3);
    expect(
      buildOverlayPaths({ circuits: big.circuits, tails: big.tails }, { maxRecords: 3 }),
    ).toHaveLength(3);
  });
});

describe('summaries', () => {
  it('tailEndpoints returns both ends of every open path', () => {
    const a = tailyAnalysis();
    const ends = tailEndpoints(a.tails);
    expect(ends).toHaveLength(a.tails.filter((t) => t.points.length > 1).length * 2);
  });

  it('lengthChips histogram matches pathLength counts', () => {
    const a = smallAnalysis();
    const chips = lengthChips(a.circuits, a.circuitColorByLength);
    const total = chips.reduce((n, c) => n + c.count, 0);
    expect(total).toBe(a.circuits.length);
    for (const chip of chips) {
      expect(pathsOfLength(a.circuits, chip.length)).toHaveLength(chip.count);
      expect(chip.color).toBe(a.circuitColorByLength.get(chip.length));
    }
    expect(chips.map((c) => c.length)).toEqual([...chips.map((c) => c.length)].sort((x, y) => x - y));
  });

  it('summaryChips mirrors lengthChips for the worker response shape', () => {
    const a = smallAnalysis();
    const summary = [...a.circuitsByLength.entries()]
      .map(([length, list]) => ({ length, count: list.length }))
      .sort((x, y) => x.length - y.length);
    expect(summaryChips(summary, a.circuitColorByLength)).toEqual(
      lengthChips(a.circuits, a.circuitColorByLength),
    );
    expect(summary.every((s) => s.length === pathLength(a.circuitsByLength.get(s.length)![0]))).toBe(
      true,
    );
  });
});
