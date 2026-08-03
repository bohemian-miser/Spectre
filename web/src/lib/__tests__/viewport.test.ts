import { describe, expect, it } from 'vitest';
import {
  IDENTITY_CAMERA,
  boxFitsInViewport,
  boxOfPoints,
  cameraAffine,
  clampScale,
  expandBox,
  fitToBounds,
  isEmptyBox,
  panBy,
  pinchUpdate,
  roundCamera,
  screenToWorld,
  transformBox,
  unionBox,
  wheelZoom,
  worldToScreen,
  zoomBy,
  zoomTo,
  type Box,
  type Camera,
} from '../viewport';
import { REFLECT_X, transPt } from '../../core';

const CAM: Camera = { x: 137, y: -42, scale: 23.5 };
const BOX: Box = { min: { x: -3, y: -1.5 }, max: { x: 7, y: 4 } };

describe('camera transforms', () => {
  it('round-trips world <-> screen', () => {
    const p = { x: 1.25, y: -0.75 };
    const back = screenToWorld(CAM, worldToScreen(CAM, p));
    expect(back.x).toBeCloseTo(p.x, 10);
    expect(back.y).toBeCloseTo(p.y, 10);
  });

  it('cameraAffine matches worldToScreen', () => {
    const m = cameraAffine(CAM);
    const p = { x: -2.5, y: 3.5 };
    const viaAffine = transPt(m, p);
    const direct = worldToScreen(CAM, p);
    expect(viaAffine.x).toBeCloseTo(direct.x, 10);
    expect(viaAffine.y).toBeCloseTo(direct.y, 10);
  });

  it('clamps scale into the configured limits', () => {
    expect(clampScale(1e9, { maxScale: 100 })).toBe(100);
    expect(clampScale(1e-9, { minScale: 0.5 })).toBe(0.5);
    expect(clampScale(Number.NaN, { minScale: 0.25 })).toBe(0.25);
    expect(clampScale(-4, { minScale: 0.25 })).toBe(0.25);
  });
});

describe('zoom-to-cursor invariant', () => {
  const anchors = [
    { x: 0, y: 0 },
    { x: 640, y: 480 },
    { x: -12.5, y: 900 },
  ];
  const factors = [0.25, 0.9, 1, 1.1, 4, 17];

  it('keeps the world point under the anchor fixed for zoomBy', () => {
    for (const anchor of anchors) {
      const before = screenToWorld(CAM, anchor);
      for (const f of factors) {
        const after = screenToWorld(zoomBy(CAM, anchor, f), anchor);
        expect(after.x).toBeCloseTo(before.x, 9);
        expect(after.y).toBeCloseTo(before.y, 9);
      }
    }
  });

  it('keeps it fixed for zoomTo and wheelZoom too', () => {
    const anchor = { x: 321, y: 77 };
    const before = screenToWorld(CAM, anchor);
    for (const s of [0.5, 12, 1000]) {
      const after = screenToWorld(zoomTo(CAM, anchor, s), anchor);
      expect(after.x).toBeCloseTo(before.x, 9);
      expect(after.y).toBeCloseTo(before.y, 9);
    }
    for (const delta of [-240, -100, 0, 100, 240]) {
      const after = screenToWorld(wheelZoom(CAM, anchor, delta), anchor);
      expect(after.x).toBeCloseTo(before.x, 9);
      expect(after.y).toBeCloseTo(before.y, 9);
    }
  });

  it('scrolling down zooms out and up zooms in', () => {
    const anchor = { x: 100, y: 100 };
    expect(wheelZoom(CAM, anchor, 120).scale).toBeLessThan(CAM.scale);
    expect(wheelZoom(CAM, anchor, -120).scale).toBeGreaterThan(CAM.scale);
  });

  it('respects the clamp while still pinning the anchor', () => {
    const anchor = { x: 50, y: 50 };
    const limits = { minScale: 1, maxScale: 30 };
    const zoomed = zoomBy(CAM, anchor, 1000, limits);
    expect(zoomed.scale).toBe(30);
    const before = screenToWorld(CAM, anchor);
    const after = screenToWorld(zoomed, anchor);
    expect(after.x).toBeCloseTo(before.x, 9);
    expect(after.y).toBeCloseTo(before.y, 9);
  });

  it('ignores nonsense zoom factors', () => {
    expect(zoomBy(CAM, { x: 0, y: 0 }, 0)).toEqual(CAM);
    expect(zoomBy(CAM, { x: 0, y: 0 }, Number.NaN)).toEqual(CAM);
  });
});

describe('panBy', () => {
  it('translates without touching the scale', () => {
    const next = panBy(CAM, 10, -20);
    expect(next).toEqual({ x: 147, y: -62, scale: 23.5 });
  });
});

describe('fitToBounds', () => {
  const size = { width: 800, height: 400 };

  it('centres the box in the viewport', () => {
    const cam = fitToBounds(BOX, size, { padding: 0 });
    const centre = worldToScreen(cam, { x: 2, y: 1.25 });
    expect(centre.x).toBeCloseTo(400, 6);
    expect(centre.y).toBeCloseTo(200, 6);
  });

  it('fits the whole box inside the viewport for many aspect ratios', () => {
    const boxes: Box[] = [
      BOX,
      { min: { x: 0, y: 0 }, max: { x: 100, y: 1 } },
      { min: { x: -5, y: -50 }, max: { x: -4, y: 50 } },
      { min: { x: 2, y: 2 }, max: { x: 3, y: 3 } },
    ];
    const sizes = [size, { width: 300, height: 900 }, { width: 640, height: 640 }];
    for (const b of boxes) {
      for (const s of sizes) {
        const cam = fitToBounds(b, s, { padding: 0.05 });
        expect(boxFitsInViewport(cam, b, s, 1e-6)).toBe(true);
      }
    }
  });

  it('touches at least one axis (it is a fit, not a shrink)', () => {
    const cam = fitToBounds(BOX, size, { padding: 0 });
    const a = worldToScreen(cam, BOX.min);
    const b = worldToScreen(cam, BOX.max);
    const w = Math.abs(b.x - a.x);
    const h = Math.abs(b.y - a.y);
    expect(Math.max(w / size.width, h / size.height)).toBeCloseTo(1, 6);
  });

  it('honours padding', () => {
    const cam = fitToBounds(BOX, size, { padding: 0.1 });
    const a = worldToScreen(cam, BOX.min);
    const b = worldToScreen(cam, BOX.max);
    expect(Math.min(a.x, b.x)).toBeGreaterThan(-1e-6);
    expect(Math.max(w(a, b), 0)).toBeLessThanOrEqual(size.width * 0.8 + 1e-6);
  });

  it('survives degenerate and empty boxes', () => {
    const point: Box = { min: { x: 3, y: 3 }, max: { x: 3, y: 3 } };
    const cam = fitToBounds(point, size);
    expect(Number.isFinite(cam.scale)).toBe(true);
    expect(worldToScreen(cam, { x: 3, y: 3 }).x).toBeCloseTo(400, 6);

    const empty = fitToBounds({ min: { x: Infinity, y: Infinity }, max: { x: -Infinity, y: -Infinity } }, size);
    expect(empty).toEqual({ x: 400, y: 200, scale: 1 });
  });

  it('clamps to zero-size viewports instead of producing NaN', () => {
    const cam = fitToBounds(BOX, { width: 0, height: 0 });
    expect(Number.isFinite(cam.x)).toBe(true);
    expect(Number.isFinite(cam.scale)).toBe(true);
  });
});

function w(a: { x: number }, b: { x: number }): number {
  return Math.abs(b.x - a.x);
}

describe('boxes', () => {
  it('builds, unions and expands', () => {
    const b = boxOfPoints([
      { x: 1, y: 2 },
      { x: -3, y: 5 },
    ]);
    expect(b).toEqual({ min: { x: -3, y: 2 }, max: { x: 1, y: 5 } });
    expect(unionBox(b, { min: { x: 0, y: 0 }, max: { x: 10, y: 1 } })).toEqual({
      min: { x: -3, y: 0 },
      max: { x: 10, y: 5 },
    });
    expect(expandBox(b, 1)).toEqual({ min: { x: -4, y: 1 }, max: { x: 2, y: 6 } });
    expect(isEmptyBox(boxOfPoints([]))).toBe(true);
  });

  it('transformBox mirrors correctly (the substitution reflection)', () => {
    const mirrored = transformBox(REFLECT_X, BOX);
    expect(mirrored).toEqual({ min: { x: -7, y: -1.5 }, max: { x: 3, y: 4 } });
  });
});

describe('pinch', () => {
  const start = { a: { x: 100, y: 100 }, b: { x: 200, y: 100 } };

  it('scales by the spread ratio about the starting midpoint', () => {
    const current = { a: { x: 50, y: 100 }, b: { x: 250, y: 100 } };
    const next = pinchUpdate(IDENTITY_CAMERA, start, current);
    expect(next.scale).toBeCloseTo(2, 9);
    // The world point under the original midpoint is under the new midpoint.
    const anchorWorld = screenToWorld(IDENTITY_CAMERA, { x: 150, y: 100 });
    const now = worldToScreen(next, anchorWorld);
    expect(now.x).toBeCloseTo(150, 9);
    expect(now.y).toBeCloseTo(100, 9);
  });

  it('pans when the spread is unchanged', () => {
    const current = { a: { x: 140, y: 130 }, b: { x: 240, y: 130 } };
    const next = pinchUpdate(CAM, start, current);
    expect(next.scale).toBeCloseTo(CAM.scale, 9);
    expect(next.x).toBeCloseTo(CAM.x + 40, 9);
    expect(next.y).toBeCloseTo(CAM.y + 30, 9);
  });

  it('degenerate pinches do not divide by zero', () => {
    const degenerate = { a: { x: 10, y: 10 }, b: { x: 10, y: 10 } };
    const next = pinchUpdate(CAM, degenerate, degenerate);
    expect(Number.isFinite(next.scale)).toBe(true);
    expect(next.scale).toBeCloseTo(CAM.scale, 9);
  });
});

describe('roundCamera', () => {
  it('matches the 2-decimal `cam` URL encoding', () => {
    expect(roundCamera({ x: 12.499, y: -3.204, scale: 1.7952 })).toEqual({
      x: 12.5,
      y: -3.2,
      scale: 1.8,
    });
  });
});
