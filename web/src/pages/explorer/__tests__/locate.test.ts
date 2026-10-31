import { describe, expect, it } from 'vitest';
import { COS30, SIN30, createUnrootedEngine, instanceAffine, instanceTypeId, leafPts, mul, transPt, zX, zY, type Affine, type HexType, type ZAffine } from '../../../core';
import { pointOnEdge, xformInRoot } from '../../../lib/hexBoard';
import { insideLoop } from '../xray';
import { LOCATE_ROOT, locateSeed } from '../locate';

const RULE = [0, 2, 3, 4, 6, 8];

function floatOf(W: ZAffine): Affine {
  const c = COS30[W.k];
  const s = SIN30[W.k];
  const m = W.m ? -1 : 1;
  return [c, -s * m, zX(W.t), s, c * m, zY(W.t)];
}

describe('locating a trace’s start tile', () => {
  it('names the tile and entry edge so the hexagon board puts that edge’s crossing where the strand entered', () => {
    for (const [seedNo, chain] of [
      [1, undefined],
      [7, undefined],
    ] as const) {
      const engine = createUnrootedEngine(seedNo, 'hex', chain);
      const cut = engine.query({ cx: 0, cy: 0, halfW: 12, halfH: 12 }, 1000, { cutLevel: 0 });
      let checked = 0;
      for (let i = 0; i < cut.count; i += 7) {
        const type = instanceTypeId(cut.type[i], 'hex') as HexType;
        const X = instanceAffine(cut.pos[2 * i] + cut.origin.x, cut.pos[2 * i + 1] + cut.origin.y, cut.code[i]);
        const edges = [0, 1, 2, 3, 4, 5].filter((e) => pointOnEdge(type, RULE, e));
        if (edges.length < 2) continue;
        const [entry, exit] = [edges[edges.length - 1], edges[0]];
        const to = transPt(X, pointOnEdge(type, RULE, entry)!);
        const at = transPt(X, pointOnEdge(type, RULE, exit)!);
        const r = (v: number) => Math.round(v * 1000) / 1000;
        const got = locateSeed(engine, [r(at.x), r(at.y), r(to.x), r(to.y)]);
        expect(got).not.toBeNull();
        expect(got!.type).toBe(type);
        expect(got!.edge).toBe(entry);
        expect(engine.ancestorType(got!.level)).toBe(LOCATE_ROOT);
        // The board's placement of that slot path, carried into the plane by the root's place in it.
        const placed = mul(floatOf(engine.ancestorWorldXform(got!.level)), xformInRoot({ root: LOCATE_ROOT, level: got!.level, startId: '' }, got!.tile));
        const p = transPt(placed, pointOnEdge(got!.type as HexType, RULE, got!.edge)!);
        expect(p.x).toBeCloseTo(to.x, 4);
        expect(p.y).toBeCloseTo(to.y, 4);
        expect(insideLoop(leafPts('hex', type).map((q) => transPt(placed, q)), { x: (at.x + to.x) / 2, y: (at.y + to.y) / 2 })).toBe(true);
        checked++;
      }
      expect(checked).toBeGreaterThan(10);
    }
  });

  it('finds nothing off the hexagons', () => {
    expect(locateSeed(createUnrootedEngine(1, 'spectre'), [0, 0, 1, 1])).toBeNull();
  });
});
