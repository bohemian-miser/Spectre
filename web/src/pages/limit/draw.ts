/**
 * Canvas drawing for the Limit shape page: outlines in the limit's frame
 * (key points first at 0, last at 1), fitted to a box.
 */

import type { Pt } from '../../core/geom';

export interface Box {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

export interface Palette {
  readonly bg: string;
  readonly text: string;
  readonly muted: string;
  readonly hex: string;
  readonly spectre: string;
  readonly selfSimilar: string;
}

const LIGHT = { hex: '#2a78d6', spectre: '#eb6834', selfSimilar: '#1baf7a' };
const DARK = { hex: '#3987e5', spectre: '#d95926', selfSimilar: '#199e70' };

export function paletteFrom(el: Element, dark: boolean): Palette {
  const css = getComputedStyle(el);
  const v = (name: string, d: string) => css.getPropertyValue(name).trim() || d;
  return {
    bg: v('--canvas-bg', dark ? '#0f1318' : '#fbfaf7'),
    text: v('--text', dark ? '#e6e9ee' : '#1d2430'),
    muted: v('--muted', '#7a8494'),
    ...(dark ? DARK : LIGHT),
  };
}

export function boxOf(arrays: readonly Float64Array[]): Box {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const a of arrays) {
    for (let i = 0; i < a.length; i += 2) {
      if (a[i] < minX) minX = a[i];
      if (a[i] > maxX) maxX = a[i];
      if (a[i + 1] < minY) minY = a[i + 1];
      if (a[i + 1] > maxY) maxY = a[i + 1];
    }
  }
  return { minX, minY, maxX, maxY };
}

/** World → canvas: the box fitted inside `w × h` less `pad`, y up. */
export interface View {
  readonly scale: number;
  readonly ox: number;
  readonly oy: number;
}

export function viewOf(box: Box, w: number, h: number, pad: number): View {
  const scale = Math.min((w - 2 * pad) / (box.maxX - box.minX), (h - 2 * pad) / (box.maxY - box.minY));
  return {
    scale,
    ox: w / 2 - (scale * (box.minX + box.maxX)) / 2,
    oy: h / 2 + (scale * (box.minY + box.maxY)) / 2,
  };
}

export const toCanvas = (v: View, p: Pt): Pt => ({ x: v.ox + v.scale * p.x, y: v.oy - v.scale * p.y });

/** A closed outline, optionally between two outlines of the same vertices. */
export function tracePath(ctx: CanvasRenderingContext2D, v: View, a: Float64Array, b?: Float64Array, t = 0): void {
  ctx.beginPath();
  for (let i = 0; i < a.length; i += 2) {
    const x = b ? a[i] + (b[i] - a[i]) * t : a[i];
    const y = b ? a[i + 1] + (b[i + 1] - a[i + 1]) * t : a[i + 1];
    const cx = v.ox + v.scale * x;
    const cy = v.oy - v.scale * y;
    if (i === 0) ctx.moveTo(cx, cy);
    else ctx.lineTo(cx, cy);
  }
  ctx.closePath();
}

/** Mix two `#rrggbb` colours. */
export function mix(a: string, b: string, t: number): string {
  const p = (s: string, i: number) => parseInt(s.slice(1 + 2 * i, 3 + 2 * i), 16);
  const c = [0, 1, 2].map((i) => Math.round(p(a, i) + (p(b, i) - p(a, i)) * t));
  return `#${c.map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

/** Hold at each end, ease across: 0 → 1 → 0 over one period. */
export function pingPong(time: number, period: number): number {
  const p = (((time / period) % 1) + 1) % 1;
  const tri = p < 0.5 ? 2 * p : 2 - 2 * p;
  const s = Math.max(0, Math.min(1, (tri - 0.12) / 0.76));
  return s * s * (3 - 2 * s);
}
