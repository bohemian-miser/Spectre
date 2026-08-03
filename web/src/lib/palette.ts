/**
 * Colour resolution shared by every widget: one function decides what a tile
 * type is filled with, so `TileView`, `TilePalette`, `TilingView` and
 * `TilingCanvas` can never disagree (DESIGN.md §3.9, §6.4 ColorSchemePicker).
 */

import {
  EDGE_CLASS_COLORS,
  NEGATIVE_EDGE_COLOR,
  TILE_PALETTES,
  hexToRgb,
  rgbToCss,
  rgbToHex,
  type ColorSchemeId,
  type TileTypeId,
} from '../core';

const FALLBACK = 'rgb(200,200,200)';

/** CSS fill for a tile type under a colour scheme (+ optional custom wells). */
export function tileColor(
  type: TileTypeId | string,
  scheme: ColorSchemeId = 'bright',
  customColors?: Readonly<Record<string, string>>,
): string {
  if (scheme === 'custom') {
    const raw = customColors?.[type];
    const rgb = raw ? hexToRgb(raw) : null;
    if (rgb) return rgbToCss(rgb);
    const base = TILE_PALETTES.bright[type];
    return base ? rgbToCss(base) : FALLBACK;
  }
  const table = TILE_PALETTES[scheme] ?? TILE_PALETTES.bright;
  const rgb = table[type];
  return rgb ? rgbToCss(rgb) : FALLBACK;
}

/** `#rrggbb` form, for `<input type="color">` wells. */
export function tileColorHex(
  type: TileTypeId | string,
  scheme: ColorSchemeId = 'bright',
  customColors?: Readonly<Record<string, string>>,
): string {
  if (scheme === 'custom') {
    const raw = customColors?.[type];
    const rgb = raw ? hexToRgb(raw) : null;
    if (rgb) return rgbToHex(rgb);
  }
  const table = TILE_PALETTES[scheme === 'custom' ? 'bright' : scheme] ?? TILE_PALETTES.bright;
  const rgb = table[type];
  return rgb ? rgbToHex(rgb) : '#c8c8c8';
}

/** One identity per edge class, site-wide. Negative labels keep the old red. */
export function edgeColor(major: number, sign: 1 | -1 = 1): string {
  if (sign < 0) return NEGATIVE_EDGE_COLOR;
  return EDGE_CLASS_COLORS[major] ?? FALLBACK;
}

/** Class colour ignoring sign — what legends, chips and dots use. */
export function edgeClassColor(major: number): string {
  return EDGE_CLASS_COLORS[major] ?? FALLBACK;
}

/** Display name for an edge class; class 7 keeps its Mystic marker (§3.8). */
export function edgeClassLabel(major: number): string {
  return major === 7 ? '7 (M)' : String(major);
}
