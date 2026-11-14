import { describe, expect, it } from 'vitest';
import { comboToMatchingIndices, createUnrootedEngine, type Pt } from '../../../core';
import { buildLeafChordTable } from '../../map/chords';
import { findTableOf } from '../../map/findPass';
import { cutCircuits, shapeKey } from '../circuits';

const POLY: Pt[] = [
  { x: 0, y: 0 },
  { x: 2, y: 0 },
  { x: 3, y: 1.5 },
  { x: 1, y: 2.25 },
  { x: -0.5, y: 1 },
];

const moved = (pts: readonly Pt[], deg: number, dx: number, dy: number): Pt[] => {
  const c = Math.cos((deg * Math.PI) / 180);
  const s = Math.sin((deg * Math.PI) / 180);
  return pts.map((p) => ({ x: c * p.x - s * p.y + dx, y: s * p.x + c * p.y + dy }));
};

describe('shapeKey', () => {
  it('is the same for every congruent copy', () => {
    const key = shapeKey(POLY);
    expect(shapeKey(moved(POLY, 37, 10.5, -3))).toBe(key);
    expect(shapeKey([...POLY.slice(2), ...POLY.slice(0, 2)])).toBe(key);
    expect(shapeKey([...POLY].reverse())).toBe(key);
    expect(shapeKey(POLY.map((p) => ({ x: -p.x, y: p.y })))).toBe(key);
  });

  it('tells different shapes apart', () => {
    const bent = POLY.map((p, i) => (i === 2 ? { x: 3.2, y: 1.5 } : p));
    expect(shapeKey(bent)).not.toBe(shapeKey(POLY));
  });
});

describe('cutCircuits', () => {
  const cut = createUnrootedEngine(1, 'hex').query({ cx: 0, cy: 0, halfW: 30, halfH: 30 }, 200_000);
  const subset = [0, 2, 3, 4, 6, 8];
  const table = buildLeafChordTable('hex', subset, comboToMatchingIndices('hex', subset, '000000000'));
  const circuits = cutCircuits(cut, findTableOf(table));

  it('finds closed circuits with a tile per step', () => {
    expect(circuits.length).toBeGreaterThan(20);
    for (const c of circuits) {
      expect(c.tiles.length).toBe(c.points.length);
      for (const t of c.tiles) expect(t).toBeGreaterThanOrEqual(0);
    }
  });

  it('groups only circuits of one length under a shape', () => {
    const lengths = new Map<string, Set<number>>();
    for (const c of circuits) {
      const set = lengths.get(c.shape) ?? new Set<number>();
      set.add(c.points.length);
      lengths.set(c.shape, set);
    }
    for (const set of lengths.values()) expect(set.size).toBe(1);
    // Several circuits share each common shape.
    expect(lengths.size).toBeLessThan(circuits.length / 4);
  });
});
