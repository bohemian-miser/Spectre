import { describe, expect, it } from 'vitest';
import { connectionPoints } from '../edges';
import { leafPts } from '../families';
import { transPt } from '../geom';
import { buildHexSpectreMorph } from '../morph';
import { buildSystem, flatten } from '../tiles';

const LEVEL = 3;
const key = (x: number, y: number) => `${Math.round(x * 1000)},${Math.round(y * 1000)}`;
const area = (a: Float64Array) => {
  let s = 0;
  const n = a.length / 2;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    s += a[2 * i] * a[2 * j + 1] - a[2 * j] * a[2 * i + 1];
  }
  return Math.abs(s / 2);
};

describe('buildHexSpectreMorph', () => {
  const morph = buildHexSpectreMorph({
    rootTile: 'Delta',
    level: LEVEL,
    subset: [0, 1, 2, 3, 4, 5, 6, 8],
    matchingIndexByType: { Gamma: 3 },
  });
  const hex = flatten(buildSystem('hex', LEVEL)['Delta']);
  const spectre = flatten(buildSystem('spectre-iso', LEVEL)['Delta']);

  it('ends on the Spectre patch exactly', () => {
    expect(morph.tiles).toHaveLength(spectre.length);
    morph.tiles.forEach((t, i) => {
      const pts = leafPts('spectre-iso', spectre[i].type).map((p) => transPt(spectre[i].xform, p));
      pts.forEach((p, k) => {
        expect(t.to[2 * k]).toBeCloseTo(p.x, 9);
        expect(t.to[2 * k + 1]).toBeCloseTo(p.y, 9);
      });
    });
  });

  it('starts on the hexagon patch: every hexagon corner, and exactly its area', () => {
    const corners = new Set<string>();
    let hexArea = 0;
    for (const inst of hex) {
      const pts = leafPts('hex', inst.type).map((p) => transPt(inst.xform, p));
      pts.forEach((p) => corners.add(key(p.x, p.y)));
      hexArea += area(new Float64Array(pts.flatMap((p) => [p.x, p.y])));
    }
    const seen = new Set<string>();
    let fromArea = 0;
    for (const t of morph.tiles) {
      for (let k = 0; k < t.from.length; k += 2) seen.add(key(t.from[k], t.from[k + 1]));
      fromArea += area(t.from);
    }
    for (const c of corners) expect(seen.has(c), c).toBe(true);
    expect(fromArea).toBeCloseTo(hexArea, 6);
  });

  it('keeps tiles glued: a shared Spectre vertex has one hexagon position', () => {
    const home = new Map<string, string>();
    for (const t of morph.tiles) {
      for (let k = 0; k < t.to.length; k += 2) {
        const at = key(t.to[k], t.to[k + 1]);
        const from = key(t.from[k], t.from[k + 1]);
        expect(home.get(at) ?? from, at).toBe(from);
        home.set(at, from);
      }
    }
  });

  it('starts every strand end on a hexagon dot, bar the Mystic internal crossings', () => {
    const dots = new Set<string>();
    const sel = new Set([0, 1, 2, 3, 4, 5, 6, 8]);
    for (const inst of hex) {
      for (const c of connectionPoints('hex', inst.type, sel)) {
        const p = transPt(inst.xform, c.pt);
        dots.add(key(p.x, p.y));
      }
    }
    let onDot = 0;
    for (const c of morph.chords) {
      if (dots.has(key(c.from[0], c.from[1]))) onDot++;
      if (dots.has(key(c.from[2], c.from[3]))) onDot++;
    }
    // Only the Mystic's internal crossings are not dots: this Gamma pairing
    // sends three strands across, each ending twice on the internal seam.
    const mystics = spectre.filter((i) => i.type === 'Gamma1').length;
    expect(2 * morph.chords.length - onDot).toBe(6 * mystics);
    expect(morph.chords.every((c) => c.color.length > 0)).toBe(true);
  });
});
