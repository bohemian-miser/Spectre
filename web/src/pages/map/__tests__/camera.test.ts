/**
 * Camera math invariants for the map (stage-2 acceptance): zoom-to-cursor
 * keeps the world point under the pointer fixed, pan is exactly invertible,
 * and origin-relative rendering keeps f32 precision safe at world coordinates
 * where the naive path visibly breaks (the whole point of re-anchoring).
 */
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SCALE,
  MAX_SCALE,
  MIN_SCALE,
  clampScale,
  createCamera,
  originRelativeCenter,
  panBy,
  screenToWorld,
  viewRectFor,
  worldToScreen,
  zoomAt,
  levelForScale,
  scaleForLevel,
  scaleForTileCount,
  tilesAtLevel,
} from '../camera';
import { SPECTRE_TILE_AREA, SUBSTITUTION_GROWTH } from '../../../core';

const W = 1280;
const H = 800;

describe('zoom-to-cursor invariant', () => {
  it('keeps the world point under the cursor fixed for arbitrary zooms', () => {
    let cam = createCamera(12.5, -33.25, 20);
    const cursors = [
      [0, 0],
      [W, H],
      [W / 2, H / 2],
      [317, 91],
      [1201.5, 633.25],
    ] as const;
    const factors = [1.1, 0.5, 3.7, 0.9, 1.0015 ** 240, 1 / 1.7];
    for (const [sx, sy] of cursors) {
      for (const f of factors) {
        const before = screenToWorld(cam, sx, sy, W, H);
        const next = zoomAt(cam, sx, sy, f, W, H);
        const after = screenToWorld(next, sx, sy, W, H);
        const scaleRef = Math.max(1e-9, Math.abs(before.x), Math.abs(before.y));
        expect(Math.abs(after.x - before.x) / scaleRef).toBeLessThan(1e-12);
        expect(Math.abs(after.y - before.y) / scaleRef).toBeLessThan(1e-12);
        cam = next;
      }
    }
  });

  it('clamps to the scale limits and is a no-op at the limits', () => {
    const cam = createCamera(0, 0, MAX_SCALE);
    expect(zoomAt(cam, 100, 100, 4, W, H)).toBe(cam);
    const out = createCamera(5, 5, MIN_SCALE);
    expect(zoomAt(out, 100, 100, 0.5, W, H)).toBe(out);
    expect(clampScale(Number.NaN)).toBe(DEFAULT_SCALE);
    expect(clampScale(0)).toBe(MIN_SCALE);
    expect(clampScale(1e9)).toBe(MAX_SCALE);
  });

  it('a zoom sequence in/out returns to (almost) the same camera', () => {
    let cam = createCamera(4, 9, 36);
    for (let i = 0; i < 40; i++) cam = zoomAt(cam, 200, 650, 1.05, W, H); // stays below MAX_SCALE
    for (let i = 0; i < 40; i++) cam = zoomAt(cam, 200, 650, 1 / 1.05, W, H);
    expect(cam.scale).toBeCloseTo(36, 8);
    expect(cam.cx).toBeCloseTo(4, 6);
    expect(cam.cy).toBeCloseTo(9, 6);
  });
});

describe('pan + view rect', () => {
  it('panBy moves the world center opposite the drag, invertibly', () => {
    const cam = createCamera(0, 0, 10);
    const moved = panBy(cam, 50, -30);
    expect(moved.cx).toBeCloseTo(-5, 12);
    expect(moved.cy).toBeCloseTo(3, 12);
    const back = panBy(moved, -50, 30);
    expect(back.cx).toBeCloseTo(0, 12);
    expect(back.cy).toBeCloseTo(0, 12);
  });

  it('screen<->world round-trips', () => {
    const cam = createCamera(1234.5, -77, 3.25);
    for (const [sx, sy] of [
      [0, 0],
      [640, 400],
      [1279, 799],
    ]) {
      const w = screenToWorld(cam, sx, sy, W, H);
      const s = worldToScreen(cam, w.x, w.y, W, H);
      expect(s.x).toBeCloseTo(sx, 8);
      expect(s.y).toBeCloseTo(sy, 8);
    }
  });

  it('viewRectFor covers the screen with margin', () => {
    const cam = createCamera(10, 20, 8);
    const v = viewRectFor(cam, W, H, 1.2);
    expect(v.cx).toBe(10);
    expect(v.cy).toBe(20);
    expect(v.halfW).toBeCloseTo(((W / 2) / 8) * 1.2, 10);
    expect(v.halfH).toBeCloseTo(((H / 2) / 8) * 1.2, 10);
  });
});

describe('origin re-anchoring precision (the GPU never sees huge coordinates)', () => {
  it('origin-relative math stays sub-pixel at 1e9 world units; naive f32 does not', () => {
    // Camera parked a billion units out; a tile 0.3 units from the view center.
    const cam = createCamera(1e9 + 0.25, -1e9 + 0.125, 24);
    const origin = { x: cam.cx, y: cam.cy }; // what the engine emits as cut.origin
    const world = { x: origin.x + 0.3, y: origin.y - 0.2 };

    // Renderer path: instance pos is emitted origin-relative and narrowed to
    // f32 (the wire format), the camera offset likewise.
    const relX = Math.fround(world.x - origin.x);
    const relY = Math.fround(world.y - origin.y);
    const off = originRelativeCenter(cam, origin);
    expect(off.x).toBe(0);
    expect(off.y).toBe(0);
    const screenRel = {
      x: (relX - Math.fround(off.x)) * cam.scale + W / 2,
      y: (relY - Math.fround(off.y)) * cam.scale + H / 2,
    };
    const truth = worldToScreen(cam, world.x, world.y, W, H);
    expect(Math.abs(screenRel.x - truth.x)).toBeLessThan(1e-3); // px
    expect(Math.abs(screenRel.y - truth.y)).toBeLessThan(1e-3);

    // Naive path: absolute world coordinates through f32 (what the shader
    // would see without re-anchoring) — off by many pixels.
    const naive = {
      x: (Math.fround(world.x) - Math.fround(cam.cx)) * cam.scale + W / 2,
      y: (Math.fround(world.y) - Math.fround(cam.cy)) * cam.scale + H / 2,
    };
    const naiveErr = Math.max(Math.abs(naive.x - truth.x), Math.abs(naive.y - truth.y));
    expect(naiveErr).toBeGreaterThan(1); // px — visibly broken
  });

  it('offset stays exact after panning away from the last query origin', () => {
    let cam = createCamera(1e12, 1e12, 2);
    const origin = { x: cam.cx, y: cam.cy };
    cam = panBy(cam, -640, 400); // drag half a screen before the next query lands
    const off = originRelativeCenter(cam, origin);
    expect(off.x).toBeCloseTo(320, 6);
    expect(off.y).toBeCloseTo(-200, 6);
    // f32 narrowing of the SMALL offset is harmless (< 1e-4 world units).
    expect(Math.abs(Math.fround(off.x) - off.x)).toBeLessThan(1e-4);
  });
});

/**
 * Rooted "level" <-> un-rooted zoom — the Explorer's infinite-mode level
 * control. The contract: level L parks the camera where the viewport covers
 * about as many tiles as a rooted level-L patch holds, so one level step is
 * exactly one substitution step.
 */
describe('level <-> zoom (infinite mode level control)', () => {
  const W = 1200;
  const H = 800;

  it('round-trips level → scale → level', () => {
    for (let level = 0; level <= 9; level++) {
      expect(levelForScale(scaleForLevel(level, W, H), W, H)).toBeCloseTo(level, 6);
    }
  });

  it('covers the same tile count a rooted patch of that level holds', () => {
    for (const level of [0, 3, 6, 9]) {
      const s = scaleForLevel(level, W, H);
      const tilesInView = (W / s) * (H / s) / SPECTRE_TILE_AREA;
      expect(tilesInView / tilesAtLevel(level)).toBeCloseTo(1, 6);
    }
  });

  it('addresses the same zoom by tile count as by level', () => {
    for (const level of [0, 2, 5, 8]) {
      expect(scaleForTileCount(tilesAtLevel(level), W, H)).toBeCloseTo(
        scaleForLevel(level, W, H),
        9,
      );
    }
  });

  it('puts about the asked-for number of tiles in view', () => {
    for (const tiles of [1, 500, 30_000, 1_000_000]) {
      const s = scaleForTileCount(tiles, W, H);
      const inView = ((W / s) * (H / s)) / SPECTRE_TILE_AREA;
      expect(inView / tiles).toBeCloseTo(1, 6);
    }
    // Fewer tiles on screen means closer in.
    expect(scaleForTileCount(100, W, H)).toBeGreaterThan(scaleForTileCount(10_000, W, H));
  });

  it('one level step is one substitution step (×sqrt(7.873) ≈ 2.806 zoom)', () => {
    for (let level = 0; level < 9; level++) {
      const ratio = scaleForLevel(level, W, H) / scaleForLevel(level + 1, W, H);
      expect(ratio).toBeCloseTo(Math.sqrt(SUBSTITUTION_GROWTH), 6);
    }
    expect(Math.sqrt(SUBSTITUTION_GROWTH)).toBeCloseTo(2.8059, 3);
  });

  it('stays inside the camera clamp and survives degenerate sizes', () => {
    expect(scaleForLevel(0, 0, 0)).toBeLessThanOrEqual(MAX_SCALE);
    expect(scaleForLevel(31, W, H)).toBeGreaterThanOrEqual(MIN_SCALE);
    expect(levelForScale(MAX_SCALE, W, H)).toBeGreaterThanOrEqual(0);
  });
});
