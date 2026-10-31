import { describe, expect, it } from 'vitest';
import {
  COS30,
  SIN30,
  buildSystem,
  countTiles,
  createUnrootedEngine,
  flatten,
  instanceAffine,
  leafOrder,
  leafPts,
  mul,
  transPt,
  zX,
  zY,
  type Affine,
  type MetaNode,
  type TileNode,
  type TileTypeId,
  type ZAffine,
} from '../../../core';
import { HEX_CENTRE, HEX_OUTLINE, supertileEdges } from '../../../lib/hexBoard';
import { addressFromId } from '../../../core/transducer';
import { polygonArea } from '../../map/glyphs';
import { countAtDepth, leafMesh, lowestXrayLevel, outlineOf, pathFromAncestor, supertileAt, supertilesAt, tintFromEngine, xrayFromEngine, XRAY_MAX_SUPERTILES } from '../xray';

const HEX_AREA = Math.abs(polygonArea(HEX_OUTLINE));
const segKey = (a: { x: number; y: number }, b: { x: number; y: number }): string =>
  `${Math.round((a.x + b.x) * 500)},${Math.round((a.y + b.y) * 500)}`;

describe('the X-ray’s supertiles', () => {
  it('cover a hexagon patch: each outline encloses as many hexagons as the supertile holds', () => {
    const root = buildSystem('hex', 3).Delta;
    for (let k = 0; k <= 3; k++) {
      const list = supertilesAt('hex', root, 3, k);
      expect(list.length).toBe(countAtDepth(root, 3 - k));
      for (const s of list) expect(Math.abs(polygonArea(outlineOf(s.node, 'hex').full))).toBeCloseTo(countTiles(s.node) * HEX_AREA, 6);
    }
  });

  it('cover a Spectre patch: each outline encloses its tiles’ area', () => {
    const root = buildSystem('spectre', 2).Delta;
    for (const s of supertilesAt('spectre', root, 2, 1)) {
      const area = flatten(s.node).reduce((a, t) => a + Math.abs(polygonArea(leafPts('spectre', t.type))), 0);
      expect(Math.abs(polygonArea(outlineOf(s.node, 'spectre').full))).toBeCloseTo(area, 6);
    }
    // A Gamma pair is one tile: its slot path has one slot per level.
    expect(supertilesAt('spectre', root, 2, 0).every((s) => s.path.split('.').length === 2)).toBe(true);
  });

  it('draw exactly the hexagon edges the transducer puts on supertile boundaries', () => {
    const level = 3;
    const root = buildSystem('hex', level).Delta;
    const tiles = flatten(root).map((t) => ({ id: t.id, xform: t.xform, address: addressFromId('Delta', t.id) }));
    const edges = supertileEdges(tiles, HEX_OUTLINE, level);
    for (let k = 1; k <= level; k++) {
      const want = new Set(edges.filter((e) => e.level >= k).map((e) => segKey({ x: e.x1, y: e.y1 }, { x: e.x2, y: e.y2 })));
      const got = new Set<string>();
      for (const s of supertilesAt('hex', root, level, k)) {
        const loop = outlineOf(s.node, 'hex').full.map((p) => transPt(s.xform, p));
        loop.forEach((p, i) => got.add(segKey(p, loop[(i + 1) % loop.length])));
      }
      expect(got).toEqual(want);
    }
  });

  it('find the supertile under a point: the one whose slot path starts the tile’s', () => {
    const root = buildSystem('hex', 3).Delta;
    const list = supertilesAt('hex', root, 3, 1);
    for (const t of flatten(root)) {
      const s = supertileAt(list, transPt(t.xform, HEX_CENTRE), 'hex');
      expect(s?.path).toBe(t.id.split('.').slice(0, 2).join('.'));
    }
  });

  it('stop the slider where a patch would list too many', () => {
    const root = buildSystem('hex', 7).Delta;
    const k = lowestXrayLevel(root, 7);
    expect(countAtDepth(root, 7 - k)).toBeLessThanOrEqual(XRAY_MAX_SUPERTILES);
    expect(countAtDepth(root, 8 - k)).toBeGreaterThan(XRAY_MAX_SUPERTILES);
  });
});

/** The float placement of an exact engine transform. */
function floatOf(W: ZAffine): Affine {
  const c = COS30[W.k];
  const s = SIN30[W.k];
  const m = W.m ? -1 : 1;
  return [c, -s * m, zX(W.t), s, c * m, zY(W.t)];
}

function walk(root: TileNode, path: string): { node: TileNode; x: Affine } {
  let node = root;
  let x: Affine = [1, 0, 0, 0, 1, 0];
  for (const slot of path === '' ? [] : path.split('.').map(Number)) {
    const c = (node as MetaNode).children.find((ch) => ch.pos === slot)!;
    x = mul(x, c.xform);
    node = c.node;
  }
  return { node, x };
}

describe('the X-ray on the infinite plane', () => {
  it('names each supertile by a slot path that leads, in the chain ancestor, to the same supertile in the same place', () => {
    const engine = createUnrootedEngine(1, 'hex');
    for (const level of [0, 1, 2]) {
      const cut = xrayFromEngine(engine, { cx: 3, cy: -2, halfW: 30, halfH: 20 }, level, 4000);
      expect(cut.tooMany).toBe(false);
      expect(cut.items.length).toBeGreaterThan(0);
      const A = floatOf(engine.ancestorWorldXform(cut.rootLevel));
      const root = buildSystem('hex', cut.rootLevel)[cut.rootType];
      for (const s of cut.items) {
        const { node, x } = walk(root, s.path);
        expect(node.type).toBe(s.type);
        const placed = mul(A, x);
        for (let i = 0; i < 6; i++) expect(placed[i]).toBeCloseTo(s.xform[i], 4); // positions come through f32
      }
    }
  });

  it('colours each single tile under the strands as the supertile its centre lies in', () => {
    const engine = createUnrootedEngine(1, 'hex');
    const view = { cx: 3, cy: -2, halfW: 30, halfH: 20 };
    const level = 2;
    const cut = xrayFromEngine(engine, view, level, 4000);
    const types = [...new Set(cut.items.map((s) => s.type))];
    const rgbOf = (t: TileTypeId) => [types.indexOf(t), 0, 0] as const;
    const tint = tintFromEngine(engine, view, cut, level, rgbOf, 0.3)!;
    expect(tint.count).toBeGreaterThan(100);
    expect(tint.alpha).toBe(0.3);
    expect(tint.mesh).toBe(leafMesh('hex'));
    let placed = 0;
    for (let i = 0; i < tint.count; i++) {
      const pts = leafPts('hex', leafOrder('hex')[tint.row[i]]);
      const mid = { x: pts.reduce((a, p) => a + p.x, 0) / pts.length, y: pts.reduce((a, p) => a + p.y, 0) / pts.length };
      const centre = transPt(instanceAffine(tint.origin.x + tint.pos[2 * i], tint.origin.y + tint.pos[2 * i + 1], tint.code[i]), mid);
      // Independent of the ids: the outline the tile's centre falls in.
      const s = supertileAt(cut.items, centre, 'hex');
      if (!s) continue;
      placed++;
      expect(tint.rgb[3 * i]).toBe(types.indexOf(s.type));
    }
    expect(placed).toBeGreaterThan(tint.count * 0.9);
  });

  it('reads engine ids against the chain', () => {
    const chain = [{ slot: 3 }, { slot: 5 }, { slot: 0 }];
    expect(pathFromAncestor(chain, 3, '1:2.4')).toBe('0.5.2.4');
    expect(pathFromAncestor(chain, 3, '0:')).toBe('0.5.3');
    expect(pathFromAncestor(chain, 2, '3:1')).toBeNull();
  });
});
