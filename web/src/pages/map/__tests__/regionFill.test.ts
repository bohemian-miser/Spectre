/**
 * Region colours on the infinite view: the tracker must colour every piece,
 * agree with the rooted dual about which pieces share a region, and keep a
 * region's colour when the camera moves.
 */
import { describe, expect, it } from 'vitest';
import {
  buildDualGraph,
  comboToMatchingIndices,
  instanceAffine,
  isAggregateType,
  leafOrder,
  runUnrootedQuery,
  type ViewportCut,
} from '../../../core';
import { buildLeafChordTable } from '../chords';
import { buildRegionMesh, createRegionTracker } from '../regionFill';

const SUBSET = [2, 5, 7, 8];
const table = buildLeafChordTable('spectre', SUBSET, comboToMatchingIndices('spectre', SUBSET, '0100101100'));

function cutAt(cx: number, cy: number, half = 12): ViewportCut {
  const res = runUnrootedQuery({
    id: 1,
    seed: 4242,
    view: { cx, cy, halfW: half, halfH: half },
    budget: 50_000,
  });
  expect(res.cut.cutLevel).toBe(0);
  return res.cut;
}

/** World key of a piece: its tile's position + orientation + mesh row. */
function pieceKeys(cut: ViewportCut, fill: NonNullable<ReturnType<ReturnType<typeof createRegionTracker>['colour']>>) {
  const out = new Map<string, string>();
  for (let i = 0; i < fill.count; i++) {
    const x = (fill.pos[i * 2] + fill.origin.x).toFixed(2);
    const y = (fill.pos[i * 2 + 1] + fill.origin.y).toFixed(2);
    out.set(`${x},${y},${fill.code[i]},${fill.row[i]}`, fill.rgb.slice(i * 3, i * 3 + 3).join(','));
  }
  expect(cut.count).toBeGreaterThan(0);
  return out;
}

describe('buildRegionMesh', () => {
  it('cuts every leaf type into chords + 1 triangulated pieces', () => {
    const mesh = buildRegionMesh(table);
    expect(mesh.rows).toBe(mesh.local.length * mesh.maxPieces);
    mesh.local.forEach((lp, t) => {
      expect(lp.bad).toBe(false);
      expect(lp.polys.length).toBe((table.segments[t]?.length ?? 0) + 1);
    });
    expect(mesh.data.length).toBe(mesh.rows * mesh.verts * 2);
    expect(mesh.verts % 3).toBe(0);
  });
});

describe('createRegionTracker', () => {
  it('emits one coloured instance per piece of every leaf on screen', () => {
    const mesh = buildRegionMesh(table);
    const cut = cutAt(0, 0);
    const fill = createRegionTracker().colour(cut, mesh)!;
    let pieces = 0;
    for (let i = 0; i < cut.count; i++) {
      if (!isAggregateType(cut.type[i])) pieces += mesh.local[cut.type[i]].polys.length;
    }
    expect(fill.count).toBe(pieces);
    // Several regions on screen, so several colours.
    const colours = new Set<string>();
    for (let i = 0; i < fill.count; i++) colours.add(fill.rgb.slice(i * 3, i * 3 + 3).join(','));
    expect(colours.size).toBeGreaterThan(3);
  });

  it('keeps colours where two cuts overlap (panning does not repaint)', () => {
    const mesh = buildRegionMesh(table);
    const tracker = createRegionTracker();
    const a = cutAt(0, 0);
    const before = pieceKeys(a, tracker.colour(a, mesh)!);
    const b = cutAt(6, 4);
    const after = pieceKeys(b, tracker.colour(b, mesh)!);
    let shared = 0;
    let same = 0;
    for (const [k, rgb] of after) {
      const old = before.get(k);
      if (old === undefined) continue;
      shared++;
      if (old === rgb) same++;
    }
    expect(shared).toBeGreaterThan(100);
    // Only a region found to join a bigger one may change colour.
    expect(same / shared).toBeGreaterThan(0.9);
  });

  it('finds exactly the regions the rooted dual finds on the same tiles', () => {
    for (const [fam, subset, combo] of [
      ['spectre', SUBSET, '0100101100'],
      ['hex', [1, 2, 8], '010100000'],
      ['spectre', [1, 5], '0000000000'],
    ] as const) {
      const t = buildLeafChordTable(fam, subset, comboToMatchingIndices(fam, subset, combo));
      const mesh = buildRegionMesh(t);
      const res = runUnrootedQuery({
        id: 3,
        seed: 99,
        family: fam,
        view: { cx: 3, cy: -2, halfW: 10, halfH: 10 },
        budget: 50_000,
      });
      const cut = res.cut;
      expect(cut.cutLevel).toBe(0);
      const fill = createRegionTracker().colour(cut, mesh)!;
      const types = leafOrder(fam);
      const instances = [];
      for (let i = 0; i < cut.count; i++) {
        instances.push({
          type: types[cut.type[i]],
          xform: instanceAffine(cut.pos[i * 2] + cut.origin.x, cut.pos[i * 2 + 1] + cut.origin.y, cut.code[i]),
          id: String(i),
        });
      }
      const chords = Object.fromEntries(types.map((ty, i) => [ty, t.segments[i] ?? []]));
      const dual = buildDualGraph({ family: fam, instances, chords });
      // Same pieces, in the same order: piece p of the fill is piece p of the dual.
      expect(fill.count).toBe(dual.pieceRegion!.length);
      // Pieces of one rooted region all get one colour: the tracker never
      // splits a region the dual has whole.
      const regionToColour = new Map<number, string>();
      for (let p = 0; p < fill.count; p++) {
        const rgb = fill.rgb.slice(p * 3, p * 3 + 3).join(',');
        const r = dual.pieceRegion![p];
        const seen = regionToColour.get(r);
        if (seen === undefined) regionToColour.set(r, rgb);
        else expect(seen, `${fam} piece ${p}`).toBe(rgb);
      }
      expect(regionToColour.size).toBe(dual.nRegions);
    }
  });

  it('resets', () => {
    const tracker = createRegionTracker();
    tracker.colour(cutAt(0, 0), buildRegionMesh(table));
    expect(tracker.size).toBeGreaterThan(0);
    tracker.reset();
    expect(tracker.size).toBe(0);
  });

  it('draws nothing at an aggregate cut', () => {
    const res = runUnrootedQuery({
      id: 2,
      seed: 4242,
      view: { cx: 0, cy: 0, halfW: 2000, halfH: 2000 },
      budget: 20_000,
    });
    expect(res.cut.cutLevel).toBeGreaterThan(0);
    expect(createRegionTracker().colour(res.cut, buildRegionMesh(table))).toBeNull();
  });
});
