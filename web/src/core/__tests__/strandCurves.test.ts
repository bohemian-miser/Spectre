import { describe, expect, it } from 'vitest';
import { analyze, chordControl, curvePieces, curvedChordPieces, inwardNormal, leafCentre, localChords, orientCurve, pointKey, segmentKey, strandCurve, buildSystem, flatten, type Pt, type TileFamilyId } from '..';
import { pathToD } from '../../lib/overlayPaths';
import { buildLeafChordTable } from '../../pages/map/chords';

describe('strandCurves', () => {
  it('keeps the old centre pull as the fallback bend', () => {
    expect(chordControl({ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 10 })).toEqual({ x: 1, y: 6 });
  });

  it('breaks a curve into pieces that start and end on the chord, whichever way round', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 2, y: 0 };
    const c = { c1: { x: 0, y: 1 }, c2: { x: 2, y: 1 } };
    const pieces = curvePieces(a, b, c, 8);
    expect(pieces).toHaveLength(8);
    expect(pieces[0][0]).toBe(a);
    expect(pieces[7][1]).toBe(b);
    pieces.slice(1).forEach((p, i) => expect(p[0]).toBe(pieces[i][1]));
    // The cubic's midpoint is ¾ of the way to the handles: y = 0.75.
    expect(pieces[3][1].y).toBeCloseTo(0.75, 10);
    // Handles stored the other way round are put back by the start point.
    expect(curvePieces(a, b, { c1: c.c2, c2: c.c1 }, 8)).toEqual(pieces);
    expect(orientCurve(c, b)).toEqual([c.c2, c.c1]);
  });

  it('leaves each edge square: handles along the inward normal, averaged at a corner', () => {
    // Hexagon Delta's edge 0 runs along y = 0 with the tile above it.
    expect(inwardNormal('hex', 'Delta', { x: 0.5, y: 0 })!.y).toBeCloseTo(1, 12);
    expect(inwardNormal('hex', 'Delta', { x: 5, y: 5 })).toBeNull();
    const a = { x: 0.25, y: 0 };
    const b = { x: 0.75, y: 0 };
    const c = strandCurve('hex', 'Delta', a, b);
    // A U-turn on one edge: both handles straight up, 0.4 × the chord.
    expect(c.c1.x).toBeCloseTo(0.25, 12);
    expect(c.c1.y).toBeCloseTo(0.2, 12);
    expect(c.c2.x).toBeCloseTo(0.75, 12);
  });

  it('strands run straight on through every seam, with no kink, on hexagons and on Spectres', () => {
    for (const [family, root, subset] of [
      ['hex', 'Delta', [1, 5]],
      ['spectre', 'Delta', [1, 2, 7, 8]],
      ['spectre', 'Delta', [0, 3, 4, 6]],
    ] as [TileFamilyId, string, number[]][]) {
      const curved = analyze(
        { family, instances: flatten(buildSystem(family, 3)[root]), selected: new Set(subset), matchingIndexByType: {} },
        { curved: true },
      );
      // Each crossing point: the handles of the (one or two) pieces that end there.
      const at = new Map<string, { p: Pt; h: Pt[] }>();
      for (const seg of curved.segments) {
        const c = curved.segmentControl!.get(segmentKey(seg))!;
        for (const p of seg) {
          const e = at.get(pointKey(p)) ?? { p, h: [] };
          e.h.push(orientCurve(c, p)[0]);
          at.set(pointKey(p), e);
        }
      }
      let seams = 0;
      for (const { p, h } of at.values()) {
        if (h.length !== 2) continue;
        seams++;
        const u = { x: h[0].x - p.x, y: h[0].y - p.y };
        const v = { x: h[1].x - p.x, y: h[1].y - p.y };
        const lu = Math.hypot(u.x, u.y);
        const lv = Math.hypot(v.x, v.y);
        // Opposite directions along one line: the tangent carries straight on.
        expect((u.x * v.y - u.y * v.x) / (lu * lv)).toBeCloseTo(0, 6);
        expect((u.x * v.x + u.y * v.y) / (lu * lv)).toBeCloseTo(-1, 6);
      }
      expect(seams).toBeGreaterThan(50);
    }
  });

  it('a curved analysis keeps the same circuits and adds handles per segment', () => {
    const input = {
      family: 'hex' as const,
      instances: flatten(buildSystem('hex', 2)['Delta']),
      selected: new Set([1, 5]),
      matchingIndexByType: {},
    };
    const straight = analyze(input);
    const curved = analyze(input, { curved: true });
    expect(curved.circuits.map((c) => c.points.length)).toEqual(straight.circuits.map((c) => c.points.length));
    expect(straight.segmentControl).toBeUndefined();
    expect(curved.segmentControl!.size).toBe(new Set(curved.segments.map(segmentKey)).size);
    const d = pathToD(curved.circuits[0], curved.segmentControl);
    expect(d).toContain(' C ');
    expect(d).not.toContain(' L ');
    expect(pathToD(curved.circuits[0])).not.toContain(' C ');
  });

  it('the infinite chord table draws curve pieces but keeps straight chords for walking', () => {
    const straight = buildLeafChordTable('hex', [1, 5], [], undefined, false);
    const curved = buildLeafChordTable('hex', [1, 5], [], undefined, true);
    expect(curved.segments).toEqual(straight.segments);
    expect(curved.chordCount).toBe(straight.chordCount);
    expect(curved.vertsPerInstance).toBe(straight.vertsPerInstance * 8);
    expect(curved.drawSegments![0]).toEqual(curvedChordPieces('hex', 'Delta', localChords('hex', 'Delta', new Set([1, 5]), 0)));
    expect(leafCentre('hex', 'Delta').x).toBeCloseTo(0.5, 12);
    expect(leafCentre('hex', 'Delta').y).toBeCloseTo(Math.sqrt(3) / 2, 12);
  });
});
