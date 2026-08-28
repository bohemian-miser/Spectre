import { describe, expect, it } from 'vitest';

import { buildSystem, countTiles, flatten, levelMirror, mul } from '../../../core';
import {
  DEFAULT_OUTLINE_BUDGET,
  MAX_DEPTH,
  MAX_EXPLODE_LEVEL,
  MAX_GAP,
  MIN_EXPLODE_LEVEL,
  clampExplodeDepth,
  clampExplodeLevel,
  clampGap,
  explodeSupertile,
  islandTiles,
  type Island,
} from '../explode';

const boxOf = (pts: readonly { x: number; y: number }[]) => {
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
};

describe('explodeSupertile — structure', () => {
  it('takes a supertile apart into exactly the children the rule names', () => {
    const layout = explodeSupertile({ level: 3, rootTile: 'Delta', depth: 1 });
    // Delta: ['Xi','Delta','Xi','Phi','Sigma','Pi','Phi','Gamma'] — eight slots.
    expect(layout.leaves.map((i) => i.type)).toEqual([
      'Xi',
      'Delta',
      'Xi',
      'Phi',
      'Sigma',
      'Pi',
      'Phi',
      'Gamma',
    ]);
    expect(layout.leaves.map((i) => i.slot)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    // Each piece is one substitution level below the whole.
    expect(layout.leaves.every((i) => i.level === 2)).toBe(true);
  });

  it('gives Gamma seven pieces — its slot 2 is empty', () => {
    const layout = explodeSupertile({ level: 3, rootTile: 'Gamma', depth: 1 });
    expect(layout.leaves).toHaveLength(7);
    expect(layout.leaves.map((i) => i.slot)).toEqual([0, 1, 3, 4, 5, 6, 7]);
  });

  it('conserves tiles: the pieces account for every spectre in the whole', () => {
    for (const depth of [1, 2, 3]) {
      const layout = explodeSupertile({ level: 4, depth });
      const summed = layout.leaves.reduce((n, i) => n + i.tileCount, 0);
      expect(summed).toBe(layout.tileCount);
      expect(layout.tileCount).toBe(countTiles(buildSystem('spectre', 4)['Delta']));
    }
  });

  it('nests: a deeper explode separates the pieces of the pieces', () => {
    const one = explodeSupertile({ level: 3, depth: 1 });
    const two = explodeSupertile({ level: 3, depth: 2 });
    expect(one.leaves).toHaveLength(8);
    // Eight pieces, each into its own seven or eight.
    expect(two.leaves.length).toBeGreaterThan(one.leaves.length * 6);
    expect(two.leaves.every((i) => i.depth === 2)).toBe(true);
    expect(two.leaves.every((i) => i.id.includes('.'))).toBe(true);
  });

  it('cannot explode deeper than the hierarchy goes', () => {
    // A level-1 supertile has exactly one round to give, whatever is asked.
    const layout = explodeSupertile({ level: 1, depth: MAX_DEPTH });
    expect(layout.leaves.every((i) => i.depth === 1)).toBe(true);
    expect(layout.leaves.every((i) => i.level === 0)).toBe(true);
  });
});

describe('explodeSupertile — the gap', () => {
  it('gap 0 reproduces the true tiling: every piece keeps its real transform', () => {
    const level = 3;
    const layout = explodeSupertile({ level, depth: 1, gap: 0 });
    const root = buildSystem('spectre', level)['Delta'];
    if (root.kind !== 'meta') throw new Error('expected a meta node');
    const view = levelMirror(level);

    layout.leaves.forEach((island, i) => {
      const expected = mul(view, root.children[i].xform);
      island.xform.forEach((v, k) => expect(v).toBeCloseTo(expected[k], 12));
    });
  });

  it('gap 0 also leaves the tiles themselves exactly where the tiling puts them', () => {
    const level = 3;
    const layout = explodeSupertile({ level, depth: 1, gap: 0 });
    const exact = flatten(buildSystem('spectre', level)['Delta'], levelMirror(level));
    const exploded = layout.leaves.flatMap((i) => islandTiles(i));
    expect(exploded).toHaveLength(exact.length);
    // Same tiles, same places — the layout is the tiling until the gap opens.
    const key = (t: { xform: readonly number[] }): string =>
      t.xform.map((v) => v.toFixed(9)).join(',');
    expect(new Set(exploded.map(key))).toEqual(new Set(exact.map(key)));
  });

  it('opening the gap grows the scene and separates every piece from its neighbours', () => {
    const closed = explodeSupertile({ level: 3, depth: 1, gap: 0 });
    const open = explodeSupertile({ level: 3, depth: 1, gap: 0.5 });
    const a = boxOf([closed.bounds.min, closed.bounds.max]);
    const b = boxOf([open.bounds.min, open.bounds.max]);
    expect(b.w).toBeGreaterThan(a.w);
    expect(b.h).toBeGreaterThan(a.h);
    // Each piece moved outward from the centre, none toward it.
    const centre = {
      x: (closed.bounds.min.x + closed.bounds.max.x) / 2,
      y: (closed.bounds.min.y + closed.bounds.max.y) / 2,
    };
    open.leaves.forEach((island, i) => {
      const was = closed.leaves[i].center;
      const now = island.center;
      const before = Math.hypot(was.x - centre.x, was.y - centre.y);
      const after = Math.hypot(now.x - centre.x, now.y - centre.y);
      expect(after).toBeGreaterThanOrEqual(before - 1e-9);
    });
  });

  it('moves pieces without rotating or resizing them', () => {
    const closed = explodeSupertile({ level: 3, depth: 1, gap: 0 });
    const open = explodeSupertile({ level: 3, depth: 1, gap: 0.8 });
    open.leaves.forEach((island, i) => {
      // A pure translation leaves the linear part of the affine untouched.
      for (const k of [0, 1, 3, 4]) {
        expect(island.xform[k]).toBeCloseTo(closed.leaves[i].xform[k], 12);
      }
    });
  });

  it('pushes each nested round less far than the one above it', () => {
    const open = explodeSupertile({ level: 4, depth: 2, gap: 1 });
    const tight = explodeSupertile({ level: 4, depth: 2, gap: 0 });

    /**
     * A nested piece inherits its parent's displacement, so the round's OWN
     * push is what is left after the parent's is taken back out — measured
     * against the piece's own size, since deeper pieces are smaller.
     */
    const ownPush = (openKids: readonly Island[], tightKids: readonly Island[], parent: number): number => {
      const spans = openKids.map((k) => boxOf(k.outline).w);
      const rel = openKids.map((k, i) => {
        const moved = Math.hypot(k.center.x - tightKids[i].center.x, k.center.y - tightKids[i].center.y);
        return Math.abs(moved - parent) / spans[i];
      });
      return rel.reduce((s, d) => s + d, 0) / rel.length;
    };

    // The root is never pushed, so its children's travel IS their own push.
    const outer = ownPush(open.root.children, tight.root.children, 0);
    const parentMoved = Math.hypot(
      open.root.children[0].center.x - tight.root.children[0].center.x,
      open.root.children[0].center.y - tight.root.children[0].center.y,
    );
    const inner = ownPush(
      open.root.children[0].children,
      tight.root.children[0].children,
      parentMoved,
    );
    expect(inner).toBeLessThan(outer);
  });
});

describe('explodeSupertile — drawing budget', () => {
  it('keeps the drawn outline under budget however many pieces there are', () => {
    for (const [level, depth] of [
      [3, 1],
      [5, 1],
      [4, 3],
      [6, 1],
    ] as const) {
      const layout = explodeSupertile({ level, depth });
      const points = layout.leaves.reduce((n, i) => n + i.outline.length, 0);
      // The share-out is per piece, so allow the rounding slack of one piece.
      expect(points).toBeLessThanOrEqual(DEFAULT_OUTLINE_BUDGET + layout.leaves.length);
      expect(layout.leaves.every((i) => i.outline.length >= 3)).toBe(true);
    }
  });

  it('spends the budget on detail when there are few pieces', () => {
    const few = explodeSupertile({ level: 5, depth: 1 });
    const many = explodeSupertile({ level: 5, depth: 3 });
    expect(few.pointsPerIsland).toBeGreaterThan(many.pointsPerIsland);
  });
});

describe('explode inputs', () => {
  it('clamps the level, depth and gap to what the view can honour', () => {
    expect(clampExplodeLevel(0)).toBe(MIN_EXPLODE_LEVEL);
    expect(clampExplodeLevel(99)).toBe(MAX_EXPLODE_LEVEL);
    expect(clampExplodeLevel(Number.NaN)).toBe(MIN_EXPLODE_LEVEL);
    expect(clampExplodeDepth(0)).toBe(1);
    expect(clampExplodeDepth(9)).toBe(MAX_DEPTH);
    expect(clampGap(-1)).toBe(0);
    expect(clampGap(99)).toBe(MAX_GAP);
    expect(clampGap(0.333)).toBe(0.33);
    expect(clampGap(Number.NaN)).toBeGreaterThan(0);
  });
});
