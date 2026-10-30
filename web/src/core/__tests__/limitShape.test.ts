import { describe, expect, it } from 'vitest';
import { zToPt } from '../exact';
import { TILE_NAMES, leafPts, type TileFamilyId } from '../families';
import { transPt, type Pt } from '../geom';
import {
  INFLATION,
  LIMIT_QUAD,
  SELF_SIMILAR_B,
  familyGeometry,
  hexOutline,
  leafTypeAt,
  levelQuad,
  normalizeQuad,
  outlineGap,
  placeOutline,
  quadGap,
  supertileOutline,
  tileAB,
  tileABGeometry,
} from '../limitShape';
import { buildSystem, flatten, supertileTransforms } from '../tiles';

const key = (p: Pt) => `${Math.round(p.x * 1e6)},${Math.round(p.y * 1e6)}`;
const area = (pts: readonly Pt[]) => {
  let s = 0;
  pts.forEach((p, i) => {
    const q = pts[(i + 1) % pts.length];
    s += p.x * q.y - q.x * p.y;
  });
  return s / 2;
};

/** The boundary of a float patch: leaf edges no other leaf edge runs back along. */
function floatBoundary(family: TileFamilyId, level: number, type: string): Set<string> {
  const runs = new Map<string, number>();
  const edges: [string, string][] = [];
  for (const inst of flatten(buildSystem(family, level)[type])) {
    const pts = leafPts(family, inst.type).map((p) => key(transPt(inst.xform, p)));
    pts.forEach((p, k) => {
      const e: [string, string] = [p, pts[(k + 1) % pts.length]];
      edges.push(e);
      runs.set(`${e[0]}>${e[1]}`, 1);
    });
  }
  return new Set(edges.filter(([a, b]) => !runs.has(`${b}>${a}`)).map(([a]) => a));
}

describe('supertileOutline', () => {
  for (const family of ['spectre', 'hex'] as const) {
    it(`is the boundary of the float patch, for every ${family} type to level 3`, () => {
      for (let level = 0; level <= 3; level++) {
        for (const type of TILE_NAMES) {
          const outline = supertileOutline(family, level, type === 'Gamma');
          const starts = outline.map((e) => key(zToPt(e.from)));
          expect(new Set(starts)).toEqual(floatBoundary(family, level, type));
          // One loop: each edge ends where the next starts.
          outline.forEach((e, i) => expect(zToPt(e.to)).toEqual(zToPt(outline[(i + 1) % outline.length].from)));
        }
      }
    });
  }

  it('encloses the leaves’ area, and Gamma’s is the other less one child', () => {
    const leaf = Math.abs(area(leafPts('spectre', 'Delta')));
    for (let level = 1; level <= 4; level++) {
      for (const type of ['Delta', 'Gamma'] as const) {
        const count = flatten(buildSystem('spectre', level)[type]).length;
        const pts = supertileOutline('spectre', level, type === 'Gamma').map((e) => zToPt(e.from));
        expect(Math.abs(area(pts))).toBeCloseTo(count * leaf, 6);
      }
      const other = Math.abs(area(supertileOutline('spectre', level, false).map((e) => zToPt(e.from))));
      const gamma = Math.abs(area(supertileOutline('spectre', level, true).map((e) => zToPt(e.from))));
      const child = Math.abs(area(supertileOutline('spectre', level - 1, false).map((e) => zToPt(e.from))));
      expect(other - gamma).toBeCloseTo(child, 6);
    }
  });

  it('names each edge by its leaf: the leaf’s own edge, in the leaf’s frame', () => {
    const geom = familyGeometry('spectre');
    for (let level = 0; level <= 4; level++) {
      for (const gamma of [false, true]) {
        const outline = supertileOutline('spectre', level, gamma);
        const placed = placeOutline(outline, geom, level, gamma ? 'Gamma' : 'Delta');
        outline.forEach((e, i) => {
          expect(placed[i].x).toBeCloseTo(zToPt(e.from).x, 9);
          expect(placed[i].y).toBeCloseTo(zToPt(e.from).y, 9);
        });
      }
    }
  });

  it('is the hat family’s outline with the Spectre’s edges stretched to Tile(1,√3)', () => {
    const geom = tileABGeometry({ x: 1, y: 0 }, { x: Math.sqrt(3), y: 0 });
    for (let level = 0; level <= 3; level++) {
      for (const gamma of [false, true]) {
        const spectre = supertileOutline('spectre', level, gamma);
        const hat = supertileOutline('hat', level, gamma);
        expect(hat.map((e) => `${e.id}:${e.edge}`)).toEqual(spectre.map((e) => `${e.id}:${e.edge}`));
        const placed = placeOutline(spectre, geom, level, gamma ? 'Gamma' : 'Delta');
        hat.forEach((e, i) => {
          const j = (i + 1) % hat.length;
          const want = { x: zToPt(hat[j].from).x - zToPt(e.from).x, y: zToPt(hat[j].from).y - zToPt(e.from).y };
          expect(placed[j].x - placed[i].x).toBeCloseTo(want.x, 9);
          expect(placed[j].y - placed[i].y).toBeCloseTo(want.y, 9);
        });
      }
    }
  });

  it('runs along the hexagon supertile’s outline when each vertex is moved to its hexagon home', () => {
    for (let level = 0; level <= 4; level++) {
      for (const gamma of [false, true]) {
        const homes = hexOutline(supertileOutline('spectre', level, gamma), level, gamma ? 'Gamma' : 'Delta');
        const hex = supertileOutline('hex', level, gamma).map((e) => zToPt(e.from));
        expect(outlineGap(homes, hex)).toBeLessThan(1e-9);
      }
    }
  });
});

describe('leafTypeAt', () => {
  it('agrees with the float tree', () => {
    for (const inst of flatten(buildSystem('spectre', 3)['Theta'])) {
      expect(leafTypeAt(3, 'Theta', inst.id)).toBe(inst.type);
    }
  });
});

describe('key points', () => {
  it('LIMIT_QUAD is where a level leaves it', () => {
    const next = normalizeQuad(supertileTransforms(LIMIT_QUAD).quad);
    next.forEach((p, k) => {
      expect(p.x).toBeCloseTo(LIMIT_QUAD[k].x, 12);
      expect(p.y).toBeCloseTo(LIMIT_QUAD[k].y, 12);
    });
  });

  it('every start closes in by 4 − √15 a level, and grows by √(4+√15)', () => {
    for (const family of ['spectre', 'hex', 'hat', 'turtle'] as const) {
      const geom = familyGeometry(family);
      const gap = (n: number) => quadGap(levelQuad(geom, n));
      expect(gap(6) / gap(5)).toBeCloseTo(4 - Math.sqrt(15), 3);
      const size = (n: number) => {
        const q = levelQuad(geom, n);
        return Math.hypot(q[3].x - q[0].x, q[3].y - q[0].y);
      };
      expect(size(8) / size(7)).toBeCloseTo(INFLATION, 6);
    }
  });

  it('Tile(1, SELF_SIMILAR_B) has the limit’s key points at every level', () => {
    const geom = tileABGeometry({ x: 1, y: 0 }, SELF_SIMILAR_B);
    for (let n = 0; n <= 8; n++) expect(quadGap(levelQuad(geom, n))).toBeLessThan(1e-12);
  });

  it('Tile(1, SELF_SIMILAR_B) crosses itself', () => {
    const pts = tileAB({ x: 1, y: 0 }, SELF_SIMILAR_B);
    const cross = (a: Pt, b: Pt, c: Pt) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    const [a, b, c, d] = [pts[1], pts[2], pts[12], pts[13]];
    expect(cross(a, b, c) * cross(a, b, d)).toBeLessThan(0);
    expect(cross(c, d, a) * cross(c, d, b)).toBeLessThan(0);
  });

  it('Tile(1,1) is the Spectre', () => {
    tileAB({ x: 1, y: 0 }, { x: 1, y: 0 }).forEach((p, k) => {
      expect(p.x).toBeCloseTo(leafPts('spectre', 'Delta')[k].x, 12);
      expect(p.y).toBeCloseTo(leafPts('spectre', 'Delta')[k].y, 12);
    });
  });
});

describe('outlineGap', () => {
  it('is the Hausdorff distance', () => {
    const square = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
    const bump = [{ x: 0, y: 0 }, { x: 0.5, y: -0.25 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
    expect(outlineGap(square, square)).toBe(0);
    expect(outlineGap(square, bump)).toBeCloseTo(0.25, 12);
  });
});
