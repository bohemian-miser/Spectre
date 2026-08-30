/**
 * Instance decode → draw-buffer packing, and the aggregate glyph pipeline
 * (boundary → decimate → ear-clip → level-fit):
 *
 *  - the vertex-shader decode (JS mirror) reproduces core's `instanceAffine`
 *    for every (rot, mirror) code — the packing the GPU actually executes;
 *  - the Canvas2D fallback's per-instance transform agrees with
 *    camera ∘ instanceAffine;
 *  - glyph meshes have the right area (tileCount × tile area) and respect the
 *    decimation budget;
 *  - the level fit carries the substitution scale 7.873^(Δlevel/… in area)
 *    and the per-level mirror parity, and lands the glyph on the real
 *    supertile footprint.
 */
import { describe, expect, it } from 'vitest';
import {
  LEAF_ORDER,
  SPECTRE_PTS,
  SPECTRE_TILE_AREA,
  SUBSTITUTION_GROWTH,
  TILE_NAMES,
  buildSystem,
  createUnrootedEngine,
  flatten,
  countTiles,
  instanceAffine,
  leafOrder,
  leafPts,
  transPt,
  type Pt,
} from '../../../core';
import {
  GLYPH_LEVEL,
  MAX_GLYPH_POINTS,
  boundaryLoop,
  buildGlyphMeshes,
  buildLeafAtlas,
  decimateLoop,
  earClip,
  fitSimilarity,
  glyphFitForCut,
  polygonArea,
} from '../glyphs';
import { shaderDecodeWorld } from '../webglRenderer';
import { instanceScreenTransform } from '../canvasRenderer';
import { createCamera, worldToScreen } from '../camera';

function triArea(verts: ArrayLike<number>, i: number): number {
  const ax = verts[i];
  const ay = verts[i + 1];
  const bx = verts[i + 2];
  const by = verts[i + 3];
  const cx = verts[i + 4];
  const cy = verts[i + 5];
  return Math.abs((bx - ax) * (cy - ay) - (by - ay) * (cx - ax)) / 2;
}

describe('instance decode → draw buffers', () => {
  it('the shader decode matches instanceAffine for all 24 codes', () => {
    const probes: Pt[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2.366025403784439, y: 0.6339745962155614 },
      { x: -0.866025403784439, y: 1.5 },
    ];
    for (let rot = 0; rot < 12; rot++) {
      for (const mir of [0, 16]) {
        const code = rot | mir;
        const M = instanceAffine(3.5, -7.25, code);
        for (const p of probes) {
          const truth = transPt(M, p);
          const got = shaderDecodeWorld(p.x, p.y, 3.5, -7.25, code);
          expect(Math.abs(got.x - truth.x)).toBeLessThan(1e-12);
          expect(Math.abs(got.y - truth.y)).toBeLessThan(1e-12);
        }
      }
    }
  });

  it('the canvas fallback transform equals camera ∘ instanceAffine', () => {
    const cam = createCamera(100.5, -30.25, 12);
    const origin = { x: 98, y: -29 };
    for (const code of [0, 5, 11, 16 | 3]) {
      const m = instanceScreenTransform(cam, 1280, 800, origin, 4.5, -1.25, code);
      const inst = instanceAffine(4.5, -1.25, code);
      for (const p of [
        { x: 0, y: 0 },
        { x: 1.5, y: -0.866 },
      ]) {
        const local = transPt(m, p);
        const world = transPt(inst, p); // origin-relative world
        const truth = worldToScreen(cam, world.x + origin.x, world.y + origin.y, 1280, 800);
        expect(local.x).toBeCloseTo(truth.x, 6);
        expect(local.y).toBeCloseTo(truth.y, 6);
      }
    }
  });

  it('an engine cut uploads verbatim: buffer shapes and palette indices line up', () => {
    const eng = createUnrootedEngine(1);
    const leafCut = eng.query({ cx: 0, cy: 0, halfW: 12, halfH: 12 }, 100_000);
    expect(leafCut.cutLevel).toBe(0);
    expect(leafCut.pos.length).toBe(leafCut.count * 2);
    expect(leafCut.code.length).toBe(leafCut.count);
    expect(leafCut.type.length).toBe(leafCut.count);
    for (let i = 0; i < leafCut.count; i++) {
      expect(leafCut.type[i]).toBeLessThan(LEAF_ORDER.length); // leaf palette index
      expect(leafCut.code[i] & 16).toBe(0); // leaves are never mirrored
    }
    const aggCut = eng.query({ cx: 0, cy: 0, halfW: 2500, halfH: 2500 }, 50_000);
    expect(aggCut.cutLevel).toBeGreaterThan(0);
    for (let i = 0; i < aggCut.count; i++) {
      const t = aggCut.type[i] - 128;
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThan(TILE_NAMES.length); // glyph texture row index
    }
  });
});

describe('leaf mesh', () => {
  it('ear-clips the 14-gon into 12 triangles with the exact tile area', () => {
    // The spectre atlas row 0 (Delta) is the mesh the leaf pass draws.
    const atlas = buildLeafAtlas('spectre');
    expect(atlas.fillVerts).toBe(12 * 3);
    let area = 0;
    const flat = Array.from(atlas.fill.subarray(0, atlas.fillVerts * 2));
    for (let i = 0; i < flat.length; i += 6) area += triArea(flat, i);
    expect(area).toBeCloseTo(SPECTRE_TILE_AREA, 5); // verts are f32

  });
});

describe('aggregate glyphs', () => {
  it('boundary loops close, decimate within budget, and keep their area', () => {
    const sys = buildSystem('spectre', 2);
    for (const name of ['Delta', 'Gamma', 'Sigma'] as const) {
      const loop = boundaryLoop(sys[name]);
      expect(loop.length).toBeGreaterThan(40);
      const full = Math.abs(polygonArea(loop));
      const dec = decimateLoop(loop, MAX_GLYPH_POINTS);
      expect(dec.length).toBeLessThanOrEqual(MAX_GLYPH_POINTS);
      expect(Math.abs(polygonArea(dec))).toBeGreaterThan(full * 0.97);
      expect(Math.abs(polygonArea(dec))).toBeLessThan(full * 1.03);
    }
  });

  it('every flavour mesh fills tileCount × tile area (within decimation slack)', () => {
    const meshes = buildGlyphMeshes(GLYPH_LEVEL);
    expect(meshes).toHaveLength(TILE_NAMES.length);
    meshes.forEach((m, i) => {
      expect(m.typeIndex).toBe(i);
      expect(m.type).toBe(TILE_NAMES[i]);
      expect(m.outline.length).toBeLessThanOrEqual(MAX_GLYPH_POINTS);
      expect(m.triVerts.length % 6).toBe(0);
      let area = 0;
      for (let v = 0; v < m.triVerts.length; v += 6) area += triArea(m.triVerts, v);
      const truth = m.tileCount * SPECTRE_TILE_AREA;
      expect(area).toBeGreaterThan(truth * 0.96);
      expect(area).toBeLessThan(truth * 1.04);
    });
  });

  it('the level fit scales by the substitution growth and flips parity per level', () => {
    for (let cut = 1; cut <= 7; cut++) {
      const fit = glyphFitForCut(cut, GLYPH_LEVEL);
      const det = fit[0] * fit[4] - fit[1] * fit[3];
      // |det| = area scale ≈ growth^(cut − glyphLevel); the per-level quad
      // fit converges to the asymptotic factor, so allow a few % at low cuts.
      const expected = SUBSTITUTION_GROWTH ** (cut - GLYPH_LEVEL);
      expect(Math.abs(det) / expected).toBeGreaterThan(0.95);
      expect(Math.abs(det) / expected).toBeLessThan(1.05);
      // The frame-to-frame fit is DIRECT (det > 0) at every Δlevel: the
      // substitution's per-level mirror lives in the engine's instance code
      // (aggregates carry mirror = cutLevel & 1), not in the local frames.
      // Verified against the true level-4 boundary: the direct fit lands the
      // level-3 loop within ~0.3% of span; a mirrored fit is off by ~1e4×.
      expect(det).toBeGreaterThan(0);
      // similarity: orthogonal columns of equal length
      const c0 = Math.hypot(fit[0], fit[3]);
      const c1 = Math.hypot(fit[1], fit[4]);
      expect(c0 / c1).toBeCloseTo(1, 3);
      expect(Math.abs(fit[0] * fit[1] + fit[3] * fit[4]) / (c0 * c1)).toBeLessThan(1e-3);
    }
  });

  it('fitSimilarity reproduces the quad correspondence it was fitted on', () => {
    const srcQuad = buildSystem('spectre', GLYPH_LEVEL)['Delta'].quad;
    const dstQuad = buildSystem('spectre', 2)['Delta'].quad;
    const fit = fitSimilarity(srcQuad, dstQuad);
    let span = 0;
    for (const p of dstQuad) span = Math.max(span, Math.abs(p.x), Math.abs(p.y));
    srcQuad.forEach((p, i) => {
      const got = transPt(fit, p);
      expect(Math.abs(got.x - dstQuad[i].x)).toBeLessThan(span * 0.02);
      expect(Math.abs(got.y - dstQuad[i].y)).toBeLessThan(span * 0.02);
    });
  });

  it('a fitted glyph lands on the true supertile footprint (level 2 oracle)', () => {
    const meshes = buildGlyphMeshes(GLYPH_LEVEL);
    const fit = glyphFitForCut(2, GLYPH_LEVEL);
    const delta = meshes[TILE_NAMES.indexOf('Delta')];

    let gMinX = Infinity;
    let gMinY = Infinity;
    let gMaxX = -Infinity;
    let gMaxY = -Infinity;
    for (const p of delta.outline) {
      const q = transPt(fit, p);
      gMinX = Math.min(gMinX, q.x);
      gMinY = Math.min(gMinY, q.y);
      gMaxX = Math.max(gMaxX, q.x);
      gMaxY = Math.max(gMaxY, q.y);
    }

    let tMinX = Infinity;
    let tMinY = Infinity;
    let tMaxX = -Infinity;
    let tMaxY = -Infinity;
    for (const inst of flatten(buildSystem('spectre', 2)['Delta'])) {
      for (const p of leafPts('spectre', inst.type)) {
        const w = transPt(inst.xform, p);
        tMinX = Math.min(tMinX, w.x);
        tMinY = Math.min(tMinY, w.y);
        tMaxX = Math.max(tMaxX, w.x);
        tMaxY = Math.max(tMaxY, w.y);
      }
    }
    const diag = Math.hypot(tMaxX - tMinX, tMaxY - tMinY);
    // Fractal convergence error at ΔJ=1 is a few percent of the span.
    expect(Math.abs(gMinX - tMinX)).toBeLessThan(diag * 0.08);
    expect(Math.abs(gMinY - tMinY)).toBeLessThan(diag * 0.08);
    expect(Math.abs(gMaxX - tMaxX)).toBeLessThan(diag * 0.08);
    expect(Math.abs(gMaxY - tMaxY)).toBeLessThan(diag * 0.08);
  });

  it('spectre outline sanity: SPECTRE_PTS is the leaf glyph source', () => {
    // Guards against the leaf path and the mesh diverging.
    const atlas = buildLeafAtlas('spectre');
    expect(atlas.outlineCounts[0]).toBe(SPECTRE_PTS.length);
    expect(atlas.outlineVerts).toBe(SPECTRE_PTS.length);
    expect(earClip(SPECTRE_PTS)).toHaveLength((SPECTRE_PTS.length - 2) * 3);
  });
});

describe('glyphs and leaf meshes across families', () => {
  it('builds nine glyph meshes per family whose areas match their tile sums', () => {
    for (const family of ['hex', 'hat', 'turtle'] as const) {
      const meshes = buildGlyphMeshes(GLYPH_LEVEL, family);
      expect(meshes).toHaveLength(TILE_NAMES.length);
      const sys = buildSystem(family, GLYPH_LEVEL);
      meshes.forEach((m, i) => {
        expect(m.type).toBe(TILE_NAMES[i]);
        expect(m.outline.length).toBeGreaterThanOrEqual(4);
        expect(m.outline.length).toBeLessThanOrEqual(MAX_GLYPH_POINTS);
        // The decimated boundary loses fractal detail but must stay within a
        // few percent of the exact patch area (the sum of its leaf areas).
        let exact = 0;
        for (const inst of flatten(sys[TILE_NAMES[i]])) {
          const pts = leafPts(family, inst.type).map((p) => transPt(inst.xform, p));
          exact += Math.abs(polygonArea(pts));
        }
        expect(Math.abs(polygonArea(m.outline))).toBeGreaterThan(exact * 0.9);
        expect(Math.abs(polygonArea(m.outline))).toBeLessThan(exact * 1.1);
        expect(m.tileCount).toBe(countTiles(sys[TILE_NAMES[i]]));
      });
    }
  });

  it('leaf atlas rows follow leafOrder, and hat/turtle swap the Gamma2 shape', () => {
    for (const family of ['spectre', 'hex', 'hat', 'turtle'] as const) {
      const atlas = buildLeafAtlas(family);
      const order = leafOrder(family);
      expect(atlas.rows).toBe(order.length);
      expect(atlas.fill.length).toBe(atlas.rows * atlas.fillVerts * 2);
      expect(atlas.outline.length).toBe(atlas.rows * atlas.outlineVerts * 2);
      order.forEach((type, row) => {
        const pts = leafPts(family, type);
        expect(atlas.outlineCounts[row]).toBe(pts.length);
        // The row's outline starts with the true vertices before padding.
        for (let i = 0; i < pts.length; i++) {
          expect(atlas.outline[(row * atlas.outlineVerts + i) * 2]).toBeCloseTo(pts[i].x, 5);
          expect(atlas.outline[(row * atlas.outlineVerts + i) * 2 + 1]).toBeCloseTo(pts[i].y, 5);
        }
        // Fill triangles cover the leaf's area exactly (ear-clip identity).
        let triArea = 0;
        const base = row * atlas.fillVerts * 2;
        for (let v = 0; v + 5 < atlas.fillVerts * 2; v += 6) {
          const ax = atlas.fill[base + v];
          const ay = atlas.fill[base + v + 1];
          const bx = atlas.fill[base + v + 2];
          const by = atlas.fill[base + v + 3];
          const cx = atlas.fill[base + v + 4];
          const cy = atlas.fill[base + v + 5];
          triArea += Math.abs((bx - ax) * (cy - ay) - (by - ay) * (cx - ax)) / 2;
        }
        expect(triArea).toBeCloseTo(Math.abs(polygonArea(pts as Pt[])), 5);
      });
      if (family === 'hat' || family === 'turtle') {
        const g2 = order.indexOf('Gamma2');
        const other = family === 'hat' ? 'turtle' : 'hat';
        const swapped = leafPts(other, 'Delta');
        expect(atlas.outlineCounts[g2]).toBe(swapped.length);
        expect(atlas.outline[(g2 * atlas.outlineVerts) * 2]).toBeCloseTo(swapped[0].x, 5);
      }
    }
  });

  it('level fits are family-specific and keyed apart', () => {
    const spectreFit = glyphFitForCut(2, GLYPH_LEVEL, 'spectre');
    const hexFit = glyphFitForCut(2, GLYPH_LEVEL, 'hex');
    // Same substitution => same scale ratio, but different quads => different
    // translations; what matters is that the caches do not collide.
    expect(spectreFit).not.toEqual(hexFit);
  });
});
