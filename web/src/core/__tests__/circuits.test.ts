import { describe, expect, it } from 'vitest';
import {
  analyze,
  collectSegments,
  localChords,
  pathLength,
  pathSegments,
  pointKey,
  segmentKey,
  tracePaths,
  weldSegments,
  type Segment,
} from '../circuits';
import { runAnalysis } from '../analysis-request';
import { buildSystem, flatten } from '../tiles';
import { leafOrder } from '../families';
import { connectionCount } from '../edges';
import { nonCrossingForTile } from '../matchings';
import type { Pt } from '../geom';

const P = (x: number, y: number): Pt => ({ x, y });
const S = (a: Pt, b: Pt): Segment => [a, b];

function firstNonCrossing(family: 'spectre', subset: number[]): Record<string, number> {
  const sel = new Set(subset);
  const out: Record<string, number> = {};
  for (const t of leafOrder(family)) out[t] = nonCrossingForTile(family, t, sel)[0] ?? 0;
  return out;
}

describe('segment welding', () => {
  it('snaps endpoints within epsilon to one representative', () => {
    const welded = weldSegments([S(P(0, 0), P(1, 0)), S(P(1.02, 0.01), P(2, 0))]);
    expect(pointKey(welded[0][1])).toBe(pointKey(welded[1][0]));
  });

  it('leaves distant endpoints alone and is idempotent', () => {
    const segs = [S(P(0, 0), P(1, 0)), S(P(1.5, 0), P(2, 0))];
    const once = weldSegments(segs);
    expect(pointKey(once[0][1])).not.toBe(pointKey(once[1][0]));
    expect(weldSegments(once)).toEqual(once);
  });

  it('segmentKey is order-independent', () => {
    expect(segmentKey(S(P(1, 2), P(3, 4)))).toBe(segmentKey(S(P(3, 4), P(1, 2))));
  });
});

describe('path tracer (hand-checkable configurations)', () => {
  it('traces a closed square as one circuit', () => {
    const r = tracePaths([
      S(P(0, 0), P(1, 0)),
      S(P(1, 0), P(1, 1)),
      S(P(1, 1), P(0, 1)),
      S(P(0, 1), P(0, 0)),
    ]);
    expect(r.circuits.length).toBe(1);
    expect(r.tails.length).toBe(0);
    expect(r.junctionCount).toBe(0);
    expect(pathLength(r.circuits[0])).toBe(4);
    expect(r.circuits[0].points.length).toBe(4); // closed paths do not repeat the start
    expect(pathSegments(r.circuits[0]).length).toBe(4);
  });

  it('traces an open chain as one tail of the right length', () => {
    const r = tracePaths([
      S(P(0, 0), P(1, 0)),
      S(P(1, 0), P(2, 0)),
      S(P(2, 0), P(3, 0)),
    ]);
    expect(r.circuits.length).toBe(0);
    expect(r.tails.length).toBe(1);
    expect(pathLength(r.tails[0])).toBe(3);
    expect(r.tails[0].points.length).toBe(4);
    expect(r.tails[0].closed).toBe(false);
  });

  it('a single segment is a tail of length 1', () => {
    const r = tracePaths([S(P(0, 0), P(1, 0))]);
    expect(r.tails.length).toBe(1);
    expect(pathLength(r.tails[0])).toBe(1);
  });

  it('splits a degree-3 junction into three chains (the old DFS could not)', () => {
    const c = P(0, 0);
    const r = tracePaths([S(c, P(1, 0)), S(c, P(-1, 0)), S(c, P(0, 1))]);
    expect(r.junctionCount).toBe(1);
    expect(r.circuits.length).toBe(0);
    expect(r.tails.length).toBe(3);
    expect(r.tails.every((t) => pathLength(t) === 1)).toBe(true);
  });

  it('separates a lollipop into a circuit and a tail', () => {
    const j = P(0, 0);
    const r = tracePaths([
      S(P(-1, 0), j), // stem
      S(j, P(1, 0)), // triangle
      S(P(1, 0), P(0.5, 1)),
      S(P(0.5, 1), j),
    ]);
    expect(r.junctionCount).toBe(1);
    expect(r.circuits.length).toBe(1);
    expect(pathLength(r.circuits[0])).toBe(3);
    expect(r.tails.length).toBe(1);
    expect(pathLength(r.tails[0])).toBe(1);
  });

  it('ignores degenerate zero-length chords', () => {
    const r = tracePaths([S(P(0, 0), P(0, 0)), S(P(0, 0), P(1, 0))]);
    expect(r.tails.length).toBe(1);
    expect(pathLength(r.tails[0])).toBe(1);
  });

  it('every segment lands in exactly one path', () => {
    const segs = [
      S(P(0, 0), P(1, 0)),
      S(P(1, 0), P(1, 1)),
      S(P(1, 1), P(0, 0)),
      S(P(5, 5), P(6, 5)),
      S(P(6, 5), P(7, 5)),
    ];
    const r = tracePaths(segs);
    const keys = [...r.circuits, ...r.tails].flatMap((p) => pathSegments(p).map(segmentKey));
    expect(new Set(keys).size).toBe(segs.length);
  });
});

describe('collectSegments', () => {
  it('drops tiles with an odd or empty connection count', () => {
    // Delta under {1} has a single connection point -> no chords at all
    expect(connectionCount('spectre', 'Delta', new Set([1]))).toBe(1);
    expect(localChords('spectre', 'Delta', new Set([1]), 0)).toEqual([]);
    expect(localChords('spectre', 'Delta', new Set([]), 0)).toEqual([]);
  });

  it('emits one chord per matched pair, transformed into world space', () => {
    const inst = flatten(buildSystem('spectre', 0)['Gamma']);
    expect(inst.length).toBe(2);
    const segs = collectSegments({
      family: 'spectre',
      instances: inst,
      selected: new Set([1, 5]),
      matchingIndexByType: { Gamma1: 0, Gamma2: 0 },
    });
    // Gamma1 has two connection points under {1,5}; Gamma2 has none
    expect(connectionCount('spectre', 'Gamma1', new Set([1, 5]))).toBe(2);
    expect(connectionCount('spectre', 'Gamma2', new Set([1, 5]))).toBe(0);
    expect(segs.length).toBe(1);
  });
});

describe('runAnalysis (worker-facing entry point)', () => {
  it('matches analyze() and returns clone-friendly plain data', () => {
    const subset = [2, 5, 7, 8];
    const matchingIndexByType = firstNonCrossing('spectre', subset);
    const direct = analyze({
      family: 'spectre',
      instances: flatten(buildSystem('spectre', 2)['Delta']),
      selected: new Set(subset),
      matchingIndexByType,
    });
    const viaRequest = runAnalysis({
      id: 7,
      family: 'spectre',
      rootTile: 'Delta',
      level: 2,
      subset,
      matchingIndexByType,
    });
    expect(viaRequest.id).toBe(7);
    expect(viaRequest.tileCount).toBe(71);
    expect(viaRequest.circuits.length).toBe(direct.circuits.length);
    expect(viaRequest.tails.length).toBe(direct.tails.length);
    expect(viaRequest.junctionCount).toBe(direct.junctionCount);
    expect(viaRequest.circuitSummary.reduce((n, s) => n + s.count, 0)).toBe(direct.circuits.length);
    expect(viaRequest.tailSummary.reduce((n, s) => n + s.count, 0)).toBe(direct.tails.length);
    expect(Array.isArray(viaRequest.segmentColors)).toBe(true);
    expect(new Map(viaRequest.segmentColors)).toEqual(direct.segmentColor);
    expect(new Map(viaRequest.circuitColors)).toEqual(direct.circuitColorByLength);
    // structured-clone friendly: JSON round-trip preserves everything but Maps
    expect(() => structuredClone(viaRequest)).not.toThrow();
  });
});

describe('analyze on real tilings', () => {
  it('a lone Delta under {1,5} yields one tail and no circuits', () => {
    const a = analyze({
      family: 'spectre',
      instances: flatten(buildSystem('spectre', 0)['Delta']),
      selected: new Set([1, 5]),
      matchingIndexByType: { Delta: 0 },
    });
    expect(a.circuits.length).toBe(0);
    expect(a.tails.length).toBe(1);
    expect(pathLength(a.tails[0])).toBe(1);
  });

  it('conserves segments at level 3 for every valid subset', () => {
    const inst = flatten(buildSystem('spectre', 3)['Delta']);
    for (const subset of [[1, 5], [2, 5, 7, 8], [0, 3, 5, 6]]) {
      const a = analyze({
        family: 'spectre',
        instances: inst,
        selected: new Set(subset),
        matchingIndexByType: firstNonCrossing('spectre', subset),
      });
      const traced = [...a.circuits, ...a.tails].reduce((n, p) => n + pathLength(p), 0);
      const nonDegenerate = a.segments.filter((s) => pointKey(s[0]) !== pointKey(s[1])).length;
      expect(traced).toBe(nonDegenerate);
      // welding is stable
      expect(weldSegments(a.segments)).toEqual(a.segments);
    }
  });

  it('reports no junctions for real spectre tilings (incl. class-0 subsets)', () => {
    // DESIGN.md §3.7/§12.2 anticipated degree-3 nodes where three tiles share a
    // class-0 vertex. With the default contracts they never materialise: every
    // welded node has degree <= 2 at levels 2-4 for all eight valid subsets
    // (checked exhaustively while porting). The junction-safe tracer is still
    // used, and its behaviour is pinned by the synthetic tests above.
    const inst = flatten(buildSystem('spectre', 3)['Delta']);
    for (const subset of [[0, 3, 5, 6], [0, 1, 3, 6], [0, 2, 3, 6, 7, 8], [2, 5, 7, 8]]) {
      const a = analyze({
        family: 'spectre',
        instances: inst,
        selected: new Set(subset),
        matchingIndexByType: firstNonCrossing('spectre', subset),
      });
      expect(a.junctionCount, subset.join('')).toBe(0);
    }
  });

  it('colors circuits by length and tails grey or rainbow', () => {
    const a = analyze({
      family: 'spectre',
      instances: flatten(buildSystem('spectre', 2)['Delta']),
      selected: new Set([2, 5, 7, 8]),
      matchingIndexByType: firstNonCrossing('spectre', [2, 5, 7, 8]),
    });
    const lengths = [...a.circuitsByLength.keys()].sort((x, y) => x - y);
    expect(lengths.length).toBeGreaterThan(0);
    lengths.forEach((len, i) => {
      expect(a.circuitColorByLength.get(len)).toBe(`hsl(${(i * 40) % 360}, 100%, 50%)`);
    });
    for (const [len, list] of a.circuitsByLength) {
      for (const path of list) {
        expect(pathLength(path)).toBe(len);
        for (const seg of pathSegments(path)) {
          expect(a.segmentColor.get(segmentKey(seg))).toBe(a.circuitColorByLength.get(len));
        }
      }
    }
    const tailSeg = pathSegments(a.tails[0])[0];
    expect(a.segmentColor.get(segmentKey(tailSeg))).toBe('#808080');

    const rainbowRun = analyze(
      {
        family: 'spectre',
        instances: flatten(buildSystem('spectre', 2)['Delta']),
        selected: new Set([2, 5, 7, 8]),
        matchingIndexByType: firstNonCrossing('spectre', [2, 5, 7, 8]),
      },
      { rainbowTails: true },
    );
    expect(rainbowRun.segmentColor.get(segmentKey(tailSeg))).toMatch(/^hsl\(/);
  });
});
