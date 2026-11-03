/**
 * A picture as pixels: the Explorer's rainbow along the strand, a stroke
 * pixel at full opacity, a coverage pixel at the opacity of its coverage
 * (every counted crossing worth the rule's share of the pixel, capped at
 * full). Row 0 is the top (the highest row of the grid), as an image is.
 */

import type { Picture, PixelGrid } from './raster';

const HUES = 1024;
const RGB = new Uint8ClampedArray(3 * HUES);
for (let i = 0; i < HUES; i++) {
  // `core/colors.ts`'s `rainbow()`: hue 0..300 with a lightness lift round blue.
  const deg = (i / (HUES - 1)) * 300;
  const l = 0.5 + 0.15 * Math.cos(((deg - 240) * Math.PI) / 180);
  const a = Math.min(l, 1 - l);
  const f = (k0: number): number => {
    const k = (k0 + deg / 30) % 12;
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  RGB[3 * i] = f(0);
  RGB[3 * i + 1] = f(8);
  RGB[3 * i + 2] = f(4);
}

/** RGBA, 4 bytes a pixel, `g.w * g.h` pixels, row 0 at the top. */
export function paintPicture(picture: Picture, g: PixelGrid, segments: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(4 * g.w * g.h);
  const { idx, cnt } = picture;
  const scale = (HUES - 1) / Math.max(1, segments);
  const each = g.rule.each;
  for (let row = 0; row < g.h; row++) {
    const src = (g.h - 1 - row) * g.w;
    const dst = row * g.w;
    for (let col = 0; col < g.w; col++) {
      const v = idx[src + col];
      if (v < 0) continue;
      const hue = 3 * ((v * scale) | 0);
      const o = 4 * (dst + col);
      out[o] = RGB[hue];
      out[o + 1] = RGB[hue + 1];
      out[o + 2] = RGB[hue + 2];
      out[o + 3] = cnt ? Math.round(255 * Math.min(1, cnt[src + col] * each)) : 255;
    }
  }
  return out;
}
