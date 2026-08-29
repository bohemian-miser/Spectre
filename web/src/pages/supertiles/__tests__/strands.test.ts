import { describe, expect, it } from 'vitest';

import {
  buildSystem,
  comboToMatchingIndices,
  countTiles,
  flatten,
  levelMirror,
  pathLength,
  tracePaths,
  transPt,
  weldSegments,
  type Segment,
} from '../../../core';
import { buildLeafChordTable } from '../../map/chords';
import { explodeSupertile } from '../explode';
import { STRAND_DRAW_BUDGET, buildExplodedStrands } from '../strands';

/** The demo rule: every tile pairs up, and its circuits are well known. */
const SUBSET = [2, 5, 7, 8];
const COMBO = '0100101100';
const table = () => buildLeafChordTable(SUBSET, comboToMatchingIndices('spectre', SUBSET, COMBO));

/** What the rooted analysis sees: the same patch, welded and traced whole. */
function referenceTrace(level: number, rootTile = 'Delta') {
  const chords = table();
  const segs: Segment[] = [];
  for (const inst of flatten(buildSystem('spectre', level)[rootTile], levelMirror(level))) {
    const local = chords.segments[
      ['Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi', 'Gamma2', 'Gamma1'].indexOf(
        inst.type,
      )
    ];
    if (!local) continue;
    for (const [a, b] of local) segs.push([transPt(inst.xform, a), transPt(inst.xform, b)]);
  }
  return tracePaths(weldSegments(segs));
}

describe('buildExplodedStrands — the topology is the tiling’s', () => {
  it('finds exactly the circuits and tails the whole patch has', () => {
    for (const [level, depth] of [
      [3, 1],
      [4, 1],
      [4, 3],
    ] as const) {
      const strands = buildExplodedStrands(explodeSupertile({ level, depth }), table());
      const ref = referenceTrace(level);
      expect(strands.skipped).toBe(false);
      expect(strands.circuitCount).toBe(ref.circuits.length);
      expect(strands.tailCount).toBe(ref.tails.length);
      // …and the same LENGTHS, which is what the colouring keys on.
      const refLengths = [...new Set(ref.circuits.map(pathLength))].sort((a, b) => a - b);
      expect(strands.circuitLengths).toEqual(refLengths);
    }
  });

  it('does not depend on how the pieces are spread out', () => {
    const shape = (gap: number) =>
      buildExplodedStrands(explodeSupertile({ level: 4, depth: 2, gap }), table());
    const tight = shape(0);
    const wide = shape(1.2);
    expect(wide.circuitCount).toBe(tight.circuitCount);
    expect(wide.tailCount).toBe(tight.tailCount);
    expect(wide.circuitLengths).toEqual(tight.circuitLengths);
  });
});

describe('buildExplodedStrands — runs follow their pieces', () => {
  it('draws every run on top of the piece that owns it', () => {
    const layout = explodeSupertile({ level: 3, depth: 1, gap: 0.9 });
    const strands = buildExplodedStrands(layout, table());
    expect(strands.runs.length).toBeGreaterThan(0);

    const boxes = new Map(
      layout.leaves.map((island) => {
        const xs = island.outline.map((p) => p.x);
        const ys = island.outline.map((p) => p.y);
        return [
          island.id,
          {
            minX: Math.min(...xs),
            maxX: Math.max(...xs),
            minY: Math.min(...ys),
            maxY: Math.max(...ys),
          },
        ];
      }),
    );

    // Every point of a run lies inside the exploded box of its own piece. With
    // a gap this wide the pieces are far apart, so this would fail outright if
    // a run were left in patch coordinates or moved by the wrong offset.
    for (const run of strands.runs) {
      const box = boxes.get(run.islandId)!;
      for (const p of run.points) {
        expect(p.x).toBeGreaterThanOrEqual(box.minX - 1e-6);
        expect(p.x).toBeLessThanOrEqual(box.maxX + 1e-6);
        expect(p.y).toBeGreaterThanOrEqual(box.minY - 1e-6);
        expect(p.y).toBeLessThanOrEqual(box.maxY + 1e-6);
      }
    }
  });

  it('at gap 0 a run is the path itself, unmoved', () => {
    const layout = explodeSupertile({ level: 3, depth: 1, gap: 0 });
    const strands = buildExplodedStrands(layout, table());
    const ref = referenceTrace(3);
    // Nothing moved, so every drawn point is a point of the real tracing.
    const refPoints = new Set<string>();
    for (const path of [...ref.circuits, ...ref.tails]) {
      for (const p of path.points) refPoints.add(`${p.x.toFixed(6)},${p.y.toFixed(6)}`);
    }
    for (const run of strands.runs) {
      for (const p of run.points) {
        expect(refPoints.has(`${p.x.toFixed(6)},${p.y.toFixed(6)}`)).toBe(true);
      }
    }
  });

  it('cuts a path where it crosses between pieces, and only there', () => {
    // Spreading the pieces cannot change how many segments were drawn, only
    // how they are grouped: a crossing ends one run and starts another.
    const segsIn = (gap: number): number =>
      buildExplodedStrands(explodeSupertile({ level: 3, depth: 1, gap }), table()).runs.reduce(
        (n, r) => n + r.points.length - 1,
        0,
      );
    expect(segsIn(0.9)).toBe(segsIn(0));

    const tight = buildExplodedStrands(explodeSupertile({ level: 3, depth: 1, gap: 0 }), table());
    const wide = buildExplodedStrands(explodeSupertile({ level: 3, depth: 1, gap: 0.9 }), table());
    // Same segments, but more runs: the pieces really do come apart.
    expect(wide.runs.length).toBe(tight.runs.length);
    expect(wide.runs.length).toBeGreaterThan(tight.circuitCount + tight.tailCount);
  });
});

describe('buildExplodedStrands — limits', () => {
  it('says so rather than freezing on a patch past the budget', () => {
    const layout = explodeSupertile({ level: 6, depth: 1 });
    expect(countTiles(buildSystem('spectre', 6).Delta)).toBeGreaterThan(STRAND_DRAW_BUDGET);
    const strands = buildExplodedStrands(layout, table());
    expect(strands.skipped).toBe(true);
    expect(strands.runs).toEqual([]);
  });

  it('draws nothing at all without a rule', () => {
    const layout = explodeSupertile({ level: 3, depth: 1 });
    expect(buildExplodedStrands(layout, null).runs).toEqual([]);
    const empty = buildLeafChordTable([], comboToMatchingIndices('spectre', [], COMBO));
    expect(buildExplodedStrands(layout, empty).runs).toEqual([]);
  });
});
