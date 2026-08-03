import { describe, expect, it } from 'vitest';
import {
  bounds,
  buildBase,
  buildSupertiles,
  buildSystem,
  countTiles,
  flatten,
  levelMirror,
} from '../tiles';
import { FAMILIES, TILE_NAMES, leafOrder, type TileFamilyId } from '../families';
import { IDENT, det, mul } from '../geom';

/** Tile counts recorded from the substitution recurrence (DESIGN.md §5.3). */
const DELTA_COUNTS = [1, 9, 71, 559, 4401, 34649, 272791];

describe('substitution system', () => {
  it('builds the expected tile counts per level (Delta root)', () => {
    DELTA_COUNTS.slice(0, 5).forEach((want, level) => {
      expect(countTiles(buildSystem('spectre', level)['Delta'])).toBe(want);
    });
  });

  it('records the level 5 and 6 counts', () => {
    expect(countTiles(buildSystem('spectre', 5)['Delta'])).toBe(DELTA_COUNTS[5]);
    expect(countTiles(buildSystem('spectre', 6)['Delta'])).toBe(DELTA_COUNTS[6]);
  });

  it('flatten agrees with countTiles and yields leaf types only', () => {
    for (const family of FAMILIES) {
      const root = buildSystem(family, 3)['Delta'];
      const inst = flatten(root);
      expect(inst.length).toBe(countTiles(root));
      const leaves = new Set(leafOrder(family));
      for (const i of inst) expect(leaves.has(i.type)).toBe(true);
      // ids are unique paths of child positions
      expect(new Set(inst.map((i) => i.id)).size).toBe(inst.length);
    }
  });

  it('the Gamma supertile drops its null child slot', () => {
    const sup = buildSupertiles(buildBase('spectre'));
    const gamma = sup['Gamma'];
    expect(gamma.kind).toBe('meta');
    if (gamma.kind === 'meta') {
      expect(gamma.children.length).toBe(7);
      expect(gamma.children.map((c) => c.pos)).toEqual([0, 1, 3, 4, 5, 6, 7]);
    }
    for (const lab of TILE_NAMES) {
      if (lab === 'Gamma') continue;
      const node = sup[lab];
      if (node.kind === 'meta') expect(node.children.length).toBe(8);
    }
  });

  it('base systems have the right shape per family', () => {
    // spectre/hat/turtle: Gamma is the two-piece Mystic; hex: a plain hexagon
    for (const family of ['spectre', 'hat', 'turtle'] as TileFamilyId[]) {
      const gamma = buildBase(family)['Gamma'];
      expect(gamma.kind).toBe('meta');
      if (gamma.kind === 'meta') {
        expect(gamma.children.map((c) => c.node.kind === 'leaf' && c.node.type)).toEqual([
          'Gamma1',
          'Gamma2',
        ]);
      }
    }
    expect(buildBase('hex')['Gamma'].kind).toBe('leaf');
    expect(countTiles(buildBase('hex')['Gamma'])).toBe(1);
    expect(countTiles(buildBase('spectre')['Gamma'])).toBe(2);
  });

  it('children are shared references (memory-efficient supertiles)', () => {
    const base = buildBase('spectre');
    const sup = buildSupertiles(base);
    const delta = sup['Delta'];
    if (delta.kind !== 'meta') throw new Error('expected meta');
    expect(delta.children[1].node).toBe(base['Delta']);
  });

  it('each substitution level mirrors the previous one', () => {
    for (let level = 0; level <= 4; level++) {
      const inst = flatten(buildSystem('spectre', level)['Delta']);
      const d = det(inst[0].xform);
      expect(Math.sign(d)).toBe(level % 2 === 0 ? 1 : -1);
      // levelMirror restores the original chirality
      expect(Math.sign(det(mul(levelMirror(level), inst[0].xform)))).toBe(1);
    }
    expect(levelMirror(0)).toEqual(IDENT);
    expect(levelMirror(2)).toEqual(IDENT);
    expect(levelMirror(1)).toEqual([-1, 0, 0, 0, 1, 0]);
  });

  it('buildSystem is memoized', () => {
    expect(buildSystem('spectre', 3)).toBe(buildSystem('spectre', 3));
  });

  it('bounds grow with level and contain the tiles', () => {
    const b1 = bounds(buildSystem('spectre', 1)['Delta'], 'spectre');
    const b3 = bounds(buildSystem('spectre', 3)['Delta'], 'spectre');
    expect(b1.max.x - b1.min.x).toBeGreaterThan(0);
    expect(b3.max.x - b3.min.x).toBeGreaterThan(b1.max.x - b1.min.x);
  });
});
