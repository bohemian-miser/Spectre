import { describe, expect, it } from 'vitest';
import { zKey, zToPt } from '../exact';
import { leafPts, type TileFamilyId } from '../families';
import { transPt, type Pt } from '../geom';
import { pieceCorners, straightenPatch, straightenRounds } from '../straighten';
import { buildSystem, flatten } from '../tiles';

const key = (p: Pt) => `${Math.round(p.x * 1e6)},${Math.round(p.y * 1e6)}`;

/**
 * From the float patch's leaves: for each vertex, the highest level k at
 * which three or more regions touch it (level-k supertiles, and outside when
 * the vertex is on the patch's boundary).
 */
function bruteCorners(family: TileFamilyId, level: number): Map<string, number> {
  const top = level + 2;
  const touching = new Map<string, string[][]>();
  const runs = new Set<string>();
  const edges: [string, string][] = [];
  for (const leaf of flatten(buildSystem(family, top).Delta)) {
    const slots = leaf.id.split('.').slice(0, top);
    const pts = leafPts(family, leaf.type).map((p) => key(transPt(leaf.xform, p)));
    pts.forEach((p, k) => {
      const list = touching.get(p) ?? [];
      list.push(slots);
      touching.set(p, list);
      const q = pts[(k + 1) % pts.length];
      edges.push([p, q]);
      runs.add(`${p}>${q}`);
    });
  }
  const rim = new Set(edges.filter(([a, b]) => !runs.has(`${b}>${a}`)).flat());
  const out = new Map<string, number>();
  for (const [p, list] of touching) {
    let best = -1;
    for (let k = 0; k <= level; k++) {
      const groups = new Set(list.map((s) => s.slice(0, top - k).join('.')));
      if (groups.size + (rim.has(p) ? 1 : 0) >= 3) best = k;
    }
    out.set(p, best);
  }
  return out;
}

describe('straightenPatch', () => {
  for (const family of ['spectre', 'hex'] as const) {
    it(`gives every ${family} outline vertex the corner level the float patch's leaves give it, to level 2`, () => {
      for (let level = 0; level <= 2; level++) {
        const brute = bruteCorners(family, level);
        for (const piece of straightenPatch(family, level).pieces) {
          piece.pts.forEach((p, k) => expect([piece.id, k, piece.corner[k]]).toEqual([piece.id, k, brute.get(key(zToPt(p)))]));
        }
      }
    });
  }

  it('moves a seam shared by two pieces the same way from both sides, every round', () => {
    for (const family of ['spectre', 'hex'] as const) {
      const level = 3;
      let worst = 0;
      let shared = 0;
      const patch = straightenPatch(family, level);
      const seen = new Map<string, Float64Array[]>();
      for (const piece of patch.pieces) {
        const rounds = straightenRounds(piece, level);
        piece.pts.forEach((p, k) => {
          const at = rounds.map((r) => Float64Array.of(r[2 * k], r[2 * k + 1]));
          const other = seen.get(zKey(p));
          if (!other) return void seen.set(zKey(p), at);
          shared++;
          at.forEach((q, r) => (worst = Math.max(worst, Math.abs(q[0] - other[r][0]), Math.abs(q[1] - other[r][1]))));
        });
      }
      expect(shared).toBeGreaterThan(1000);
      expect(worst).toBeLessThan(1e-9);
    }
  }, 20000);

  it('leaves every interior Spectre supertile from level 1 a hexagon on its corners', () => {
    for (let level = 1; level <= 3; level++) {
      const interior = straightenPatch('spectre', level).pieces.filter((p) => p.interior);
      expect(interior.length).toBeGreaterThan(0);
      for (const piece of interior) expect(pieceCorners(piece, level)).toHaveLength(6);
    }
  });
});
