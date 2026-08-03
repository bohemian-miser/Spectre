import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONTRACTS,
  FAMILIES,
  IDENT,
  REFLECT_X,
  connectionPoints,
  countTiles,
  det,
  edgeLabels,
  leafOrder,
  leafPts,
  metaEdges,
  straightOutline,
  curvyOutline,
  transPt,
  type TileTypeId,
} from '../../core';
import {
  buildTilingModel,
  instanceTransform,
  polylineD,
  seamPolyline,
  tileConnectionPoints,
  tileCountAt,
  tileDefId,
  tileOutline,
  tileParts,
  tilePartsBox,
  tilesWithDots,
} from '../tilingModel';
import { isEmptyBox } from '../viewport';

describe('outline memoization', () => {
  it('returns the identical string on repeat calls', () => {
    const a = tileOutline('spectre', 'Delta', false);
    expect(tileOutline('spectre', 'Delta', false)).toBe(a);
    expect(a).toBe(straightOutline(leafPts('spectre', 'Delta')));
    expect(tileOutline('spectre', 'Delta', true)).toBe(
      curvyOutline(leafPts('spectre', 'Delta')),
    );
  });

  it('def ids are unique per prefix and type', () => {
    expect(tileDefId('tv1', 'Delta')).toBe('tv1-tile-Delta');
    expect(tileDefId('tv2', 'Delta')).not.toBe(tileDefId('tv1', 'Delta'));
  });
});

describe('buildTilingModel', () => {
  it('matches the DESIGN.md tile-count budget for spectre Delta', () => {
    const expected = [1, 9, 71, 559, 4401];
    expected.forEach((count, level) => {
      const model = buildTilingModel({ family: 'spectre', rootTile: 'Delta', level });
      expect(model.tileCount).toBe(count);
      expect(model.instances).toHaveLength(count);
      expect(tileCountAt('spectre', 'Delta', level)).toBe(count);
    });
  });

  it('emits one def per distinct leaf type present', () => {
    const model = buildTilingModel({ family: 'spectre', rootTile: 'Delta', level: 3 });
    const types = new Set(model.instances.map((i) => i.type));
    expect(model.defs.map((d) => d.type).sort()).toEqual([...types].sort());
    expect(new Set(model.defs.map((d) => d.type)).size).toBe(model.defs.length);
    for (const def of model.defs) {
      expect(def.d).toBe(tileOutline('spectre', def.type, false));
    }
  });

  it('memoizes per (family, root, level, curvy, chirality)', () => {
    const a = buildTilingModel({ family: 'spectre', rootTile: 'Delta', level: 2 });
    expect(buildTilingModel({ family: 'spectre', rootTile: 'Delta', level: 2 })).toBe(a);
    expect(buildTilingModel({ family: 'spectre', rootTile: 'Delta', level: 2, curvy: true })).not.toBe(a);
  });

  it('stabilizes chirality: odd levels get the compensating mirror', () => {
    for (const level of [0, 1, 2, 3]) {
      const stable = buildTilingModel({ family: 'spectre', rootTile: 'Delta', level });
      const raw = buildTilingModel({
        family: 'spectre',
        rootTile: 'Delta',
        level,
        stabilizeChirality: false,
      });
      expect(raw.viewTransform).toEqual(IDENT);
      expect(stable.viewTransform).toEqual(level % 2 === 0 ? IDENT : REFLECT_X);

      // Raw leaf transforms mirror at odd depths; the view transform undoes it.
      const sample = stable.instances[0];
      expect(det(sample.xform) < 0).toBe(level % 2 === 1);
      expect(det(instanceTransform(stable, sample))).toBeGreaterThan(0);
    }
  });

  it('bounds cover every transformed vertex and follow the view transform', () => {
    const model = buildTilingModel({ family: 'spectre', rootTile: 'Delta', level: 1 });
    expect(isEmptyBox(model.bounds)).toBe(false);
    for (const inst of model.instances) {
      const m = instanceTransform(model, inst);
      for (const p of leafPts('spectre', inst.type)) {
        const w = transPt(m, p);
        expect(w.x).toBeGreaterThanOrEqual(model.bounds.min.x - 1e-9);
        expect(w.x).toBeLessThanOrEqual(model.bounds.max.x + 1e-9);
        expect(w.y).toBeGreaterThanOrEqual(model.bounds.min.y - 1e-9);
        expect(w.y).toBeLessThanOrEqual(model.bounds.max.y + 1e-9);
      }
    }
  });

  it('handles every family and root tile', () => {
    for (const family of FAMILIES) {
      const model = buildTilingModel({ family, rootTile: 'Gamma', level: 2 });
      expect(model.instances.length).toBeGreaterThan(0);
      expect(model.tileCount).toBe(countTiles(model.root));
      expect(model.defs.length).toBeGreaterThan(0);
    }
  });
});

describe('tile parts', () => {
  it('splits the Mystic into Gamma1 + Gamma2 outside the hex family', () => {
    for (const family of ['spectre', 'hat', 'turtle'] as const) {
      const parts = tileParts(family, 'Gamma');
      expect(parts.map((p) => p.type)).toEqual(['Gamma1', 'Gamma2']);
      expect(parts[0].xform).toEqual(IDENT);
      expect(parts[1].xform).not.toEqual(IDENT);
      expect(parts[0].pts).toBe(leafPts(family, 'Gamma1'));
      expect(parts[1].pts).toBe(leafPts(family, 'Gamma2'));
    }
    expect(tileParts('hex', 'Gamma').map((p) => p.type)).toEqual(['Gamma']);
  });

  it('leaf types are a single identity-posed part', () => {
    const parts = tileParts('spectre', 'Delta');
    expect(parts).toHaveLength(1);
    expect(parts[0].xform).toEqual(IDENT);
    expect(isEmptyBox(tilePartsBox(parts))).toBe(false);
  });
});

describe('seam polylines', () => {
  it('chains consecutive vertices for every seam of every tile', () => {
    for (const family of FAMILIES) {
      for (const type of leafOrder(family)) {
        const pts = leafPts(family, type);
        for (const seam of metaEdges(family, type)) {
          const chain = seamPolyline(pts, seam);
          expect(chain).toHaveLength(seam.edgeIndices.length + 1);
          // Consecutive chain entries are the two ends of one physical edge.
          seam.edgeIndices.forEach((edgeIndex, k) => {
            expect(chain[k]).toBe(pts[edgeIndex]);
            expect(chain[k + 1]).toBe(pts[(edgeIndex + 1) % pts.length]);
          });
        }
      }
    }
  });

  it('polylineD emits M then one L per following point', () => {
    expect(polylineD([{ x: 0, y: 0 }, { x: 1, y: 2 }, { x: 3, y: 4 }])).toBe('M 0 0 L 1 2 L 3 4');
    expect(polylineD([])).toBe('');
  });

  it('handles the wrap-around seam (Sigma class 4)', () => {
    const sigma = metaEdges('spectre', 'Sigma').find((s) => s.major === 4);
    expect(sigma).toBeDefined();
    expect(sigma!.edgeIndices.length).toBe(4);
    const chain = seamPolyline(leafPts('spectre', 'Sigma'), sigma!);
    expect(chain).toHaveLength(5);
  });
});

describe('connection point memoization', () => {
  it('matches core connectionPoints exactly', () => {
    const selected = new Set([2, 5, 7, 8]);
    for (const family of FAMILIES) {
      for (const type of leafOrder(family)) {
        expect(tileConnectionPoints(family, type, selected)).toEqual(
          connectionPoints(family, type, selected, DEFAULT_CONTRACTS),
        );
      }
    }
  });

  it('re-keys on custom contracts', () => {
    const selected = new Set([2]);
    const base = tileConnectionPoints('spectre', 'Delta', selected);
    const moved = tileConnectionPoints('spectre', 'Delta', selected, {
      2: { minor: 2, t: 0.6 },
    });
    expect(moved[0].pt).not.toEqual(base[0].pt);
  });

  it('tilesWithDots lists exactly the tiles the legend should show', () => {
    const selected = new Set([1, 5]);
    const listed = tilesWithDots('spectre', selected);
    for (const type of leafOrder('spectre') as TileTypeId[]) {
      const has = edgeLabels('spectre', type).some((raw) => {
        const [major] = raw.replace('-', '').split('.');
        const minor = raw.replace('-', '').split('.')[1];
        return selected.has(Number(major)) && minor.startsWith('0');
      });
      expect(listed.includes(type)).toBe(has);
    }
  });
});
