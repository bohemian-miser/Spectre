import { describe, expect, it } from 'vitest';
import { analyze, chordControl, curvePieces, curvedChordPieces, leafCentre, localChords, segmentKey, buildSystem, flatten } from '..';
import { pathToD } from '../../lib/overlayPaths';
import { buildLeafChordTable } from '../../pages/map/chords';

describe('strandCurves', () => {
  it('pulls the control point 60% of the way from the chord midpoint to the centre', () => {
    expect(chordControl({ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 10 })).toEqual({ x: 1, y: 6 });
  });

  it('breaks a curve into pieces that start and end on the chord', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 2, y: 0 };
    const pieces = curvePieces(a, b, { x: 1, y: 2 }, 8);
    expect(pieces).toHaveLength(8);
    expect(pieces[0][0]).toBe(a);
    expect(pieces[7][1]).toBe(b);
    pieces.slice(1).forEach((p, i) => expect(p[0]).toBe(pieces[i][1]));
    // The curve's midpoint is a quarter of the way to the control point: y = 1.
    expect(pieces[3][1].y).toBeCloseTo(1, 10);
  });

  it('a curved analysis keeps the same circuits and adds a control point per segment', () => {
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
    expect(d).toContain(' Q ');
    expect(d).not.toContain(' L ');
    expect(pathToD(curved.circuits[0])).not.toContain(' Q ');
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
