import { describe, expect, it } from 'vitest';
import { stepMatrix } from '../../../core';
import { charPoly, formatPoly, hashToState, pointInPolygon, stateToHash, tileAt, tilesInLasso } from '../board';
import { startMap } from '../map';

describe('url', () => {
  it('round-trips and falls back to the defaults', () => {
    const s = { family: 'spectre' as const, type: 'Sigma' as const, level: 3 };
    expect(hashToState(stateToHash(s))).toEqual(s);
    expect(hashToState('')).toEqual({ family: 'hex', type: 'Delta', level: 2 });
    expect(hashToState('#family=nope&type=Nope&level=9')).toEqual({ family: 'hex', type: 'Delta', level: 2 });
  });
});

describe('picking', () => {
  const tiles = [...startMap('spectre', 'Psi', 1).tiles.values()];

  it('a tile centre picks that tile', () => {
    // the centre of a spectre's vertices lies inside it
    for (const t of tiles) expect(tileAt(tiles, t.centre)?.tile.id).toBe(t.tile.id);
  });

  it('a lasso round the whole map picks every tile', () => {
    const big = [
      { x: -1e3, y: -1e3 },
      { x: 1e3, y: -1e3 },
      { x: 1e3, y: 1e3 },
      { x: -1e3, y: 1e3 },
    ];
    expect(tilesInLasso(tiles, big).sort()).toEqual(tiles.map((t) => t.tile.id).sort());
    expect(tilesInLasso(tiles, big.slice(0, 2))).toEqual([]);
  });

  it('pointInPolygon on a square', () => {
    const sq = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];
    expect(pointInPolygon({ x: 0.5, y: 0.5 }, sq)).toBe(true);
    expect(pointInPolygon({ x: 1.5, y: 0.5 }, sq)).toBe(false);
  });
});

describe('characteristic polynomial', () => {
  it('of the spectre step matrix', () => {
    expect(charPoly(stepMatrix('spectre')!)).toEqual([1, 0, -8, 0, 1]);
    expect(formatPoly([1, 0, -8, 0, 1])).toBe('λ⁴ − 8λ² + 1');
  });

  it('of a diagonal matrix', () => {
    expect(charPoly([[2, 0], [0, 3]])).toEqual([1, -5, 6]);
    expect(formatPoly([1, -5, 6], 'x')).toBe('x² − 5x + 6');
  });
});
