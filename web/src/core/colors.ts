/**
 * Palettes and colors — ports `config.ts` colmaps, the `leadColors` table
 * (tiles.ts:202–214) and `utils.getRainbowColor`.
 */

export type ColorSchemeId = 'bright' | 'fig53' | 'mystics' | 'pride' | 'custom';

export type Rgb = readonly [number, number, number];

/** config.colmap_orig */
export const PALETTE_BRIGHT: Readonly<Record<string, Rgb>> = {
  Gamma: [255, 255, 255],
  Gamma1: [255, 255, 255],
  Gamma2: [255, 255, 255],
  Delta: [220, 220, 220],
  Theta: [255, 191, 191],
  Lambda: [255, 160, 122],
  Xi: [255, 242, 0],
  Pi: [135, 206, 250],
  Sigma: [245, 245, 220],
  Phi: [0, 255, 0],
  Psi: [0, 255, 255],
};

/** config.colmap53 — colors from Figure 5.3 of the paper. */
export const PALETTE_FIG53: Readonly<Record<string, Rgb>> = {
  Gamma: [203, 157, 126],
  Gamma1: [203, 157, 126],
  Gamma2: [203, 157, 126],
  Delta: [163, 150, 133],
  Theta: [208, 215, 150],
  Lambda: [184, 205, 178],
  Xi: [211, 177, 144],
  Pi: [218, 197, 161],
  Sigma: [191, 146, 126],
  Phi: [228, 213, 167],
  Psi: [224, 223, 156],
};

/** config.colmap_mystics */
export const PALETTE_MYSTICS: Readonly<Record<string, Rgb>> = {
  Gamma: [196, 201, 169],
  Gamma1: [196, 201, 169],
  Gamma2: [156, 160, 116],
  Delta: [247, 252, 248],
  Theta: [247, 252, 248],
  Lambda: [247, 252, 248],
  Xi: [247, 252, 248],
  Pi: [247, 252, 248],
  Sigma: [247, 252, 248],
  Phi: [247, 252, 248],
  Psi: [247, 252, 248],
};

/** config.colmap_pride */
export const PALETTE_PRIDE: Readonly<Record<string, Rgb>> = {
  Gamma: [255, 255, 255],
  Gamma1: [97, 57, 21],
  Gamma2: [0, 0, 0],
  Delta: [2, 129, 33],
  Theta: [0, 76, 255],
  Lambda: [118, 0, 136],
  Xi: [229, 0, 0],
  Pi: [255, 175, 199],
  Sigma: [115, 215, 238],
  Phi: [255, 141, 0],
  Psi: [255, 238, 0],
};

export const TILE_PALETTES: Record<Exclude<ColorSchemeId, 'custom'>, Readonly<Record<string, Rgb>>> = {
  bright: PALETTE_BRIGHT,
  fig53: PALETTE_FIG53,
  mystics: PALETTE_MYSTICS,
  pride: PALETTE_PRIDE,
};

export const COLOR_SCHEME_IDS: readonly ColorSchemeId[] = [
  'bright',
  'fig53',
  'mystics',
  'pride',
  'custom',
];

export function rgbToCss(c: Rgb): string {
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

export function rgbToHex(c: Rgb): string {
  return `#${c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
}

export function hexToRgb(hex: string): Rgb | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = Number.parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** The raw `leadColors` table, keyed by a label's leading character. */
export const EDGE_LEAD_COLORS: Readonly<Record<string, Rgb>> = {
  '-': [218, 143, 143],
  '0': [143, 187, 218],
  '1': [255, 191, 135],
  '2': [150, 208, 150],
  '3': [235, 147, 148],
  '4': [202, 179, 222],
  '5': [198, 171, 165],
  '6': [241, 187, 225],
  '7': [191, 191, 191],
  '8': [222, 222, 145],
  '9': [139, 223, 231],
};

/** One identity per edge class, site-wide (dots, labels, subset chips). */
export const EDGE_CLASS_COLORS: Readonly<Record<number, string>> = Object.freeze(
  Object.fromEntries(
    Array.from({ length: 10 }, (_, k) => [k, rgbToCss(EDGE_LEAD_COLORS[String(k)])]),
  ),
);

/** Color the old code used for any negatively-signed label ('-' lead char). */
export const NEGATIVE_EDGE_COLOR = rgbToCss(EDGE_LEAD_COLORS['-']);

/** Grey used for open paths when rainbow tails are off (analysis.ts:289). */
export const TAIL_COLOR = '#808080';

/** utils.getRainbowColor — perceptually flattened hue ramp over t in [0,1]. */
export function rainbow(t: number): string {
  const h = t * 300;
  const l = 50 + 15 * Math.cos((h - 240) * (Math.PI / 180));
  return `hsl(${h}, 100%, ${l}%)`;
}

/** Circuit colors step 40 degrees of hue per distinct length (analysis.ts:257). */
export function circuitHueColor(step: number): string {
  return `hsl(${(step * 40) % 360}, 100%, 50%)`;
}

/**
 * Solid ink for a circuit of `length` segments, addressed by the LENGTH
 * itself rather than a patch-relative rank — so a circuit of a given length
 * is the same colour in every view, on every screen, and across shared
 * links. Hue and lightness advance along Roberts' R2 low-discrepancy
 * sequence (multipliers 1/ρ and 1/ρ² for the plastic number ρ), which is
 * irrational on both axes: two different lengths never share a colour, where
 * a fixed hue step would repeat exactly every 360/step lengths.
 */
export function circuitLengthRgb(length: number): Rgb {
  const n = Math.abs(Math.round(length));
  const h = (n * 0.7548776662466927) % 1;
  const l = 0.38 + 0.26 * ((n * 0.5698402909980532) % 1);
  // hsl → rgb at s = 1.
  const a = Math.min(l, 1 - l);
  const f = (ch: number): number => {
    const k = (ch + h * 12) % 12;
    return l - a * Math.max(-1, Math.min(Math.min(k - 3, 9 - k), 1));
  };
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}
