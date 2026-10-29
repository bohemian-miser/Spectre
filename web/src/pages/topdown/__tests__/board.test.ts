import { describe, expect, it } from 'vitest';
import { buildSystem, flatten, levelMirror, stepMatrix } from '../../../core';
import {
  boardsFor,
  charPoly,
  drawTiles,
  formatPoly,
  hashToState,
  pointInPolygon,
  stateToHash,
  supertileOutlines,
  tileAt,
  tilesInLasso,
} from '../board';

describe('boards', () => {
  it('substituting everything twice is the level-2 supertile', () => {
    const boards = boardsFor('spectre', 'Xi', ['*', '*']);
    expect(boards.map((b) => b.length)).toEqual([1, 8, 63]);
  });

  it('a partial step keeps only the selected tiles children', () => {
    const [, one] = boardsFor('spectre', 'Delta', ['*']);
    const picked = [one[0].id, one[3].id];
    const two = boardsFor('spectre', 'Delta', ['*', picked])[2];
    expect(new Set(two.map((t) => t.id.split('.')[0]))).toEqual(new Set(picked));
  });

  it('draws the leaves flatten draws', () => {
    for (const family of ['spectre', 'hex'] as const) {
      const tiles = drawTiles(boardsFor(family, 'Gamma', ['*', '*'])[2], family);
      const ref = flatten(buildSystem(family, 2).Gamma, levelMirror(2));
      expect(tiles.reduce((s, t) => s + t.leaves.length, 0)).toBe(ref.length);
    }
  });
});

describe('picking', () => {
  const tiles = drawTiles(boardsFor('spectre', 'Psi', ['*'])[1], 'spectre');

  it('a tile centre picks that tile', () => {
    for (const t of tiles) {
      // the centre of a spectre's vertices lies inside it
      expect(tileAt(tiles, t.centre)?.id).toBe(t.id);
    }
  });

  it('a lasso round the whole board picks every tile', () => {
    const big = [
      { x: -1e3, y: -1e3 },
      { x: 1e3, y: -1e3 },
      { x: 1e3, y: 1e3 },
      { x: -1e3, y: 1e3 },
    ];
    expect(tilesInLasso(tiles, big).sort()).toEqual(tiles.map((t) => t.id).sort());
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

describe('supertile outlines', () => {
  for (const family of ['spectre', 'hex'] as const) it(`${family}: one outline per substituted tile, made of unshared edges`, () => {
    const board = boardsFor(family, 'Delta', ['*', '*'])[2];
    const outlines = supertileOutlines(board, family);
    expect(outlines.map((o) => o.id).sort()).toEqual(['0', '1', '2', '3', '4', '5', '6', '7']);
    // every outline is closed: as many segment ends meet at each vertex as leave it
    for (const o of outlines) {
      const ends = new Map<string, number>();
      for (const seg of o.d.split('M').filter(Boolean)) {
        for (const p of seg.split('L')) {
          const [x, y] = p.split(' ').map(Number);
          const k = `${x.toFixed(6)},${y.toFixed(6)}`;
          ends.set(k, (ends.get(k) ?? 0) + 1);
        }
      }
      for (const n of ends.values()) expect(n % 2).toBe(0);
    }
  });
});

describe('url', () => {
  it('round-trips', () => {
    const s = { family: 'hex' as const, type: 'Sigma' as const, steps: ['*' as const, ['0.1', '3.7'], '*' as const] };
    expect(hashToState(stateToHash(s))).toEqual(s);
    expect(hashToState('')).toEqual({ family: 'spectre', type: 'Delta', steps: ['*'] });
    expect(hashToState('#type=Nope&steps=')).toEqual({ family: 'spectre', type: 'Delta', steps: [] });
  });
});

describe('characteristic polynomial', () => {
  it('of the step matrix', () => {
    expect(charPoly(stepMatrix()!)).toEqual([1, 0, -8, 0, 1]);
    expect(formatPoly([1, 0, -8, 0, 1])).toBe('λ⁴ − 8λ² + 1');
  });

  it('of a diagonal matrix', () => {
    expect(charPoly([[2, 0], [0, 3]])).toEqual([1, -5, 6]);
    expect(formatPoly([1, -5, 6], 'x')).toBe('x² − 5x + 6');
  });
});
