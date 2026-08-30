/**
 * Strand-chord table (BIGMAP stage 3, part 1).
 *
 * What must hold for the map's line pass to be honest:
 *  - the packed RGBA32F table is exactly the ten `localChords` sets, padded to
 *    one row length with `valid = 0` texels the shader discards;
 *  - every chord endpoint sits ON the tile outline (they are seam contract
 *    points, so abutting tiles' ends must be able to coincide);
 *  - fed a REAL `ViewportCut`, the per-instance decode used by both renderers
 *    (`instanceAffine`, mirrored by the GLSL in `shaderDecodeWorld`) turns the
 *    table into world chords that actually WELD across seams — i.e. the lines
 *    drawn on the infinite map are the strand geometry, not decoration.
 */
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONTRACTS,
  LEAF_ORDER,
  SPECTRE_PTS,
  comboToMatchingIndices,
  createUnrootedEngine,
  instanceAffine,
  isAggregateType,
  leafOrder,
  leafPts,
  localChords,
  pointKey,
  transPt,
  weldSegments,
  type Pt,
  type Segment,
} from '../../../core';
import {
  CHORD_ROWS,
  CHORD_STRIDE,
  buildLeafChordTable,
  chordTableKey,
  familyChordReach,
} from '../chords';
import { shaderDecodeWorld } from '../webglRenderer';

const SUBSET = [2, 5, 7, 8];
const COMBO = '0100101100';
const matchingFor = (subset: readonly number[], combo: string): readonly number[] =>
  comboToMatchingIndices('spectre', subset, combo);

/** Distance from `p` to the closed polygon `poly`. */
function distanceToOutline(p: Pt, poly: readonly Pt[]): number {
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy || 1;
    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    best = Math.min(best, Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)));
  }
  return best;
}

describe('leaf chord table', () => {
  it('packs exactly the localChords of every leaf type, padded with valid = 0', () => {
    const matching = matchingFor(SUBSET, COMBO);
    const table = buildLeafChordTable('spectre', SUBSET, matching);

    expect(table.rows).toBe(CHORD_ROWS);
    expect(table.rows).toBe(LEAF_ORDER.length);
    expect(table.vertsPerInstance).toBe(table.maxChords * 2);
    expect(table.data.length).toBe(table.rows * table.vertsPerInstance * CHORD_STRIDE);
    expect(table.maxChords).toBeGreaterThan(0);

    let total = 0;
    LEAF_ORDER.forEach((type, row) => {
      const expected = localChords('spectre', type, new Set(SUBSET), matching[row]);
      const got = table.segments[row];
      expect(got.length).toBe(expected.length);
      total += expected.length;

      const base = row * table.vertsPerInstance * CHORD_STRIDE;
      for (let v = 0; v < table.vertsPerInstance; v++) {
        const at = base + v * CHORD_STRIDE;
        const chord = Math.floor(v / 2);
        if (chord < expected.length) {
          const pt = expected[chord][v % 2];
          expect(table.data[at]).toBeCloseTo(pt.x, 6);
          expect(table.data[at + 1]).toBeCloseTo(pt.y, 6);
          expect(table.data[at + 2]).toBe(1); // valid
        } else {
          expect(table.data[at + 2]).toBe(0); // padding ⇒ clipped by the shader
        }
      }
    });
    expect(table.chordCount).toBe(total);
  });

  it('puts every chord endpoint on the tile outline', () => {
    const matching = matchingFor(SUBSET, COMBO);
    const table = buildLeafChordTable('spectre', SUBSET, matching);
    LEAF_ORDER.forEach((type, row) => {
      const poly = leafPts('spectre', type);
      for (const [a, b] of table.segments[row]) {
        expect(distanceToOutline(a, poly)).toBeLessThan(1e-9);
        expect(distanceToOutline(b, poly)).toBeLessThan(1e-9);
      }
    });
    expect(SPECTRE_PTS.length).toBe(14); // the leaf mesh the shader rides on
  });

  it('is empty for an empty subset and for a subset that pairs nothing', () => {
    const empty = buildLeafChordTable('spectre', [], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(empty.vertsPerInstance).toBe(0);
    expect(empty.chordCount).toBe(0);
    expect(empty.data.length).toBe(0);
    expect(empty.segments).toHaveLength(CHORD_ROWS);

    // Class 4 alone gives every spectre leaf either zero or one connection
    // point, so `localChords` refuses to pair anything (the tails story, §3.8).
    const odd = buildLeafChordTable('spectre', [4], matchingFor([4], '0000000000'));
    expect(odd.chordCount).toBe(0);
    expect(odd.emptyTypes.length).toBe(CHORD_ROWS);
  });

  it('keys distinct configurations apart (memoization contract)', () => {
    const a = chordTableKey('spectre', SUBSET, matchingFor(SUBSET, COMBO));
    const b = chordTableKey('spectre', SUBSET, matchingFor(SUBSET, '0111001100'));
    const c = chordTableKey('spectre', [0, 2, 3, 6, 7, 8], matchingFor([0, 2, 3, 6, 7, 8], COMBO));
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
    expect(a).toBe(chordTableKey('spectre', [8, 7, 5, 2], matchingFor(SUBSET, COMBO)));
    expect(chordTableKey('spectre', SUBSET, [], DEFAULT_CONTRACTS)).not.toBe(
      chordTableKey('spectre', SUBSET, []),
    );
    // Same rule in another family is another table.
    expect(a).not.toBe(chordTableKey('hex', SUBSET, matchingFor(SUBSET, COMBO)));
  });
});

describe('chord buffers from a real ViewportCut', () => {
  const engine = createUnrootedEngine(1);
  const cut = engine.query({ cx: 0, cy: 0, halfW: 30, halfH: 20 }, 20_000);
  const matching = matchingFor(SUBSET, COMBO);
  const table = buildLeafChordTable('spectre', SUBSET, matching);

  /** What the renderers draw: each instance's chords, in world coordinates. */
  const worldChords = (): Segment[] => {
    const out: Segment[] = [];
    for (let i = 0; i < cut.count; i++) {
      const type = cut.type[i];
      if (isAggregateType(type)) continue;
      const M = instanceAffine(
        cut.pos[i * 2] + cut.origin.x,
        cut.pos[i * 2 + 1] + cut.origin.y,
        cut.code[i],
      );
      for (const [a, b] of table.segments[type]) {
        out.push([transPt(M, a), transPt(M, b)] as Segment);
      }
    }
    return out;
  };

  it('produces a leaf cut whose instances all carry a chord row', () => {
    expect(cut.count).toBeGreaterThan(100);
    expect(cut.cutLevel).toBe(0);
    for (let i = 0; i < cut.count; i++) {
      expect(cut.type[i]).toBeLessThan(CHORD_ROWS);
    }
  });

  it('emits exactly chords-per-type × instances segments', () => {
    const perType = new Map<number, number>();
    for (let i = 0; i < cut.count; i++) {
      perType.set(cut.type[i], (perType.get(cut.type[i]) ?? 0) + 1);
    }
    let expected = 0;
    for (const [type, n] of perType) expected += n * table.segments[type].length;
    expect(worldChords()).toHaveLength(expected);
  });

  it('matches the GLSL decode mirrored in shaderDecodeWorld', () => {
    for (let i = 0; i < Math.min(cut.count, 64); i++) {
      const px = cut.pos[i * 2];
      const py = cut.pos[i * 2 + 1];
      const M = instanceAffine(px, py, cut.code[i]);
      for (const [a] of table.segments[cut.type[i]]) {
        const cpu = transPt(M, a);
        const gpu = shaderDecodeWorld(a.x, a.y, px, py, cut.code[i]);
        expect(gpu.x).toBeCloseTo(cpu.x, 9);
        expect(gpu.y).toBeCloseTo(cpu.y, 9);
      }
    }
  });

  it('welds across seams: interior strand ends join in pairs', () => {
    const welded = weldSegments(worldChords(), 0.05);
    const degree = new Map<string, number>();
    for (const [a, b] of welded) {
      for (const p of [a, b]) {
        const k = pointKey(p);
        degree.set(k, (degree.get(k) ?? 0) + 1);
      }
    }
    let paired = 0;
    for (const d of degree.values()) if (d === 2) paired++;
    // Only the viewport's boundary tiles can leave a dangling end; a patch of
    // hundreds of tiles is overwhelmingly interior. (This is the property that
    // makes the drawn lines *strands* rather than disconnected doodles.)
    expect(degree.size).toBeGreaterThan(100);
    expect(paired / degree.size).toBeGreaterThan(0.75);
  });
});

describe('chord tables across families', () => {
  it('hex tables have 9 rows keyed by HEX_LEAF_ORDER and carry their reach', () => {
    const order = leafOrder('hex');
    const matching = comboToMatchingIndices('hex', [1, 5], '000000000');
    const table = buildLeafChordTable('hex', [1, 5], matching);
    expect(table.family).toBe('hex');
    expect(table.rows).toBe(order.length);
    expect(table.segments).toHaveLength(order.length);
    expect(table.reach).toBeCloseTo(familyChordReach('hex'), 12);
    // Every chord endpoint stays inside the declared reach.
    for (const segs of table.segments) {
      for (const [a, b] of segs) {
        expect(Math.hypot(a.x, a.y)).toBeLessThanOrEqual(table.reach + 1e-9);
        expect(Math.hypot(b.x, b.y)).toBeLessThanOrEqual(table.reach + 1e-9);
      }
    }
  });

  it('the hat/turtle reach covers the swapped Gamma2 shape', () => {
    // A turtle vertex sits ~6.25 world units out; the hat family draws its
    // Gamma2 leaves as turtles, so its reach must cover that (the old
    // spectre constant ~4.15 silently under-probed).
    const turtleReach = Math.max(
      ...leafPts('turtle', 'Delta').map((p) => Math.hypot(p.x, p.y)),
    );
    expect(familyChordReach('hat')).toBeGreaterThanOrEqual(turtleReach);
    expect(familyChordReach('turtle')).toBeGreaterThanOrEqual(turtleReach);
    expect(familyChordReach('spectre')).toBeLessThan(turtleReach);
  });

  it('a hex engine cut indexes the hex table without gaps', () => {
    const engine = createUnrootedEngine(1, 'hex');
    const cut = engine.query({ cx: 0, cy: 0, halfW: 20, halfH: 15 }, 20_000);
    const matching = comboToMatchingIndices('hex', [1, 5], '000000000');
    const table = buildLeafChordTable('hex', [1, 5], matching);
    for (let i = 0; i < cut.count; i++) {
      expect(cut.type[i]).toBeLessThan(table.rows);
      expect(table.segments[cut.type[i]]).toBeDefined();
    }
  });
});
