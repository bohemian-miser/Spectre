/**
 * The dual of the strand graph: regions between the strands, joined across
 * each strand. On a rooted patch every complete strand splits the patch in
 * two, so with no junctions and no dead ends the dual is a tree with one more
 * region than there are strands.
 */
import { describe, expect, it } from 'vitest';
import { analyze, localChords, type Segment } from '../circuits';
import { buildDualGraph, localPieces } from '../dual';
import { leafOrder, leafPts, type TileFamilyId } from '../families';
import { hexRuleSpectreDrawing } from '../hexRule';
import { nonCrossingForTile } from '../matchings';
import { validEdgeSubsets } from '../subsets';
import { buildSystem, flatten } from '../tiles';
import { pt } from '../geom';

const SQUARE = [pt(0, 0), pt(1, 0), pt(1, 1), pt(0, 1)];

function polyArea(pts: readonly { x: number; y: number }[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a) / 2;
}

describe('localPieces', () => {
  it('leaves a tile without chords whole', () => {
    const lp = localPieces(SQUARE, []);
    expect(lp.polys).toHaveLength(1);
    expect(lp.area[0]).toBeCloseTo(1);
  });

  it('cuts a square into chords + 1 pieces whose areas add up', () => {
    // Two parallel chords: left strip, middle, right strip.
    const chords: Segment[] = [
      [pt(0.25, 0), pt(0.25, 1)],
      [pt(0.75, 1), pt(0.75, 0)],
    ];
    const lp = localPieces(SQUARE, chords);
    expect(lp.bad).toBe(false);
    expect(lp.polys).toHaveLength(3);
    expect([...lp.area].sort()).toEqual([0.25, 0.25, 0.5].map((x) => expect.closeTo(x)));
    for (const [a, b] of lp.chordSides) expect(a).not.toBe(b);
    // Every sub-segment belongs to a piece and the 8 of them cover the boundary.
    expect(lp.subMid).toHaveLength(8);
  });

  it('cuts off a corner', () => {
    const lp = localPieces(SQUARE, [[pt(0.5, 0), pt(1, 0.5)]]);
    expect(lp.polys).toHaveLength(2);
    expect([...lp.area].sort()).toEqual([0.125, 0.875].map((x) => expect.closeTo(x)));
  });

  it('refuses crossing chords', () => {
    const lp = localPieces(SQUARE, [
      [pt(0.5, 0), pt(0.5, 1)],
      [pt(0, 0.5), pt(1, 0.5)],
    ]);
    expect(lp.bad).toBe(true);
    expect(lp.polys).toHaveLength(1);
  });
});

function chordsFor(
  family: TileFamilyId,
  sel: ReadonlySet<number>,
  record: Record<string, number>,
): Record<string, readonly Segment[]> {
  const out: Record<string, readonly Segment[]> = {};
  for (const t of leafOrder(family)) out[t] = localChords(family, t, sel, record[t] ?? 0);
  return out;
}

describe('buildDualGraph', () => {
  const families: TileFamilyId[] = ['spectre', 'hex', 'hat', 'turtle'];
  for (const family of families) {
    it(`${family}: regions = strands + 1 and the dual is a tree (level 2, every rule)`, () => {
      const instances = flatten(buildSystem(family, 2)['Delta']);
      const patchArea = instances.reduce((a, i) => a + polyArea(leafPts(family, i.type)), 0);
      let checked = 0;
      let seed = 99;
      const rand = (n: number) => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed % n;
      };
      for (const vs of validEdgeSubsets(family)) {
        const sel = new Set(vs.edges);
        for (let trial = 0; trial < 3; trial++) {
          const record: Record<string, number> = {};
          for (const t of leafOrder(family)) {
            const nc = nonCrossingForTile(family, t, sel);
            record[t] = nc.length ? nc[rand(nc.length)] : 0;
          }
          const chords = chordsFor(family, sel, record);
          const dual = buildDualGraph({ family, instances, chords });
          const res = analyze({ family, instances, selected: sel, matchingIndexByType: record, chords });

          expect(dual.badTiles).toBe(0);
          const area = dual.regionArea.reduce((a, b) => a + b, 0);
          expect(area).toBeCloseTo(patchArea, 6);
          expect(dual.regionBoundary.some((b) => b === 1)).toBe(true);
          if (res.junctionCount === 0 && dual.danglingChords === 0) {
            expect(dual.nRegions).toBe(res.circuits.length + res.tails.length + 1);
            expect(dual.isTree).toBe(true);
            // Every closed circuit has its inside one level deeper than its outside.
            if (res.circuits.length) expect(dual.maxDepth).toBeGreaterThan(0);
            checked++;
          }
        }
      }
      expect(checked).toBeGreaterThan(0);
    });
  }

  it('works on the hexagon rule drawn on Spectres (Mystic chords)', () => {
    const family: TileFamilyId = 'spectre-iso';
    const instances = flatten(buildSystem(family, 2)['Delta']);
    const sel = new Set([1, 2, 8]);
    const record: Record<string, number> = {};
    for (const t of leafOrder('hex')) {
      const nc = nonCrossingForTile('hex', t, sel);
      record[t] = nc.length ? nc[nc.length - 1] : 0;
    }
    const { chords } = hexRuleSpectreDrawing(sel, record);
    const dual = buildDualGraph({ family, instances, chords });
    expect(dual.badTiles).toBe(0);
    expect(dual.nRegions).toBeGreaterThan(1);
  });

  it('returns piece polygons covering the patch', () => {
    const family: TileFamilyId = 'spectre';
    const instances = flatten(buildSystem(family, 1)['Delta']);
    const sel = new Set([2, 5, 7, 8]);
    const chords = chordsFor(family, sel, {});
    const dual = buildDualGraph({ family, instances, chords });
    const start = dual.pieceStart!;
    const xy = dual.pieceXY!;
    let area = 0;
    for (let p = 0; p + 1 < start.length; p++) {
      const pts = [];
      for (let k = start[p]; k < start[p + 1]; k++) pts.push({ x: xy[2 * k], y: xy[2 * k + 1] });
      area += polyArea(pts);
    }
    // Unsigned, so a corner cut off outside a reflex vertex adds a little.
    const patchArea = instances.reduce((a, i) => a + polyArea(leafPts(family, i.type)), 0);
    expect(dual.regionArea.reduce((a, b) => a + b, 0)).toBeCloseTo(patchArea, 6);
    expect(area).toBeGreaterThanOrEqual(patchArea - 1e-6);
    expect(dual.pieceRegion!.length).toBe(start.length - 1);
  });
});

describe('runAnalysis with dual', () => {
  it('returns the dual only when asked, and pieces only when asked', async () => {
    const { runAnalysis } = await import('../analysis-request');
    const base = {
      id: 1,
      family: 'spectre' as const,
      rootTile: 'Delta' as const,
      level: 2,
      subset: [2, 5, 7, 8],
      matchingIndexByType: {},
    };
    expect(runAnalysis(base).dual).toBeUndefined();
    const graphOnly = runAnalysis({ ...base, dual: true });
    expect(graphOnly.dual?.nRegions).toBeGreaterThan(1);
    expect(graphOnly.dual?.pieceXY).toBeUndefined();
    const withFills = runAnalysis({ ...base, dual: true, dualPieces: true });
    expect(withFills.dual?.pieceXY?.length).toBeGreaterThan(0);
    expect(withFills.dual?.nRegions).toBe(graphOnly.dual?.nRegions);
  });
});
