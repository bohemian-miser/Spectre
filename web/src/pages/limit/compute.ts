/**
 * Everything the Limit shape page draws, computed level by level: the two
 * outlines (Gamma and the rest) from the hexagon start, the Spectre start
 * and Tile(1,b) with b = SELF_SIMILAR_B, each laid over the limit's key
 * points, and the gaps between them. Pure; `limit.worker.ts` runs it.
 */

import { zToPt } from '../../core/exact';
import { inv, mul, transPt, type Pt } from '../../core/geom';
import {
  INFLATION,
  SELF_SIMILAR_B,
  familyGeometry,
  hexOutline,
  levelQuad,
  limitFrame,
  outlineGap,
  placeOutline,
  quadGap,
  supertileOutline,
  tileABGeometry,
  type TileGeometry,
} from '../../core/limitShape';
import { supertileTransforms } from '../../core/tiles';

export type Kind = 'other' | 'Gamma';
export const KINDS: readonly Kind[] = ['other', 'Gamma'];

/** One level's outlines, x/y interleaved, laid over the limit's key points. */
export interface Outlines {
  /** From the Spectre; one vertex per edge of the outline. */
  readonly spectre: Float64Array;
  /** The same vertices at their homes on the hexagons. */
  readonly hex: Float64Array;
  /** The same vertices in Tile(1,b). */
  readonly selfSimilar: Float64Array;
}

export interface LimitLevel {
  readonly level: number;
  readonly outlines: Readonly<Record<Kind, Outlines>>;
  readonly quadGapHex: number;
  readonly quadGapSpectre: number;
  /** Hausdorff distance between the hexagon and Spectre starts (not Gamma). */
  readonly gapHexSpectre: number;
}

/**
 * Hausdorff distance from a start's outline (not Gamma) to Tile(1,b)'s at the
 * top level, one entry per level below the top.
 */
export interface StartGaps {
  readonly start: string;
  readonly gaps: readonly number[];
}

export interface LimitData {
  readonly levels: readonly LimitLevel[];
  /** The top level's children, Tile(1,b), laid out as in the top level. */
  readonly children: readonly { readonly slot: number; readonly gamma: boolean; readonly pts: Float64Array }[];
  readonly b: Pt;
  readonly inflation: number;
}

const flat = (pts: readonly Pt[]): Float64Array => {
  const out = new Float64Array(pts.length * 2);
  pts.forEach((p, i) => {
    out[2 * i] = p.x;
    out[2 * i + 1] = p.y;
  });
  return out;
};

export const unflat = (a: Float64Array): Pt[] => {
  const out: Pt[] = [];
  for (let i = 0; i < a.length; i += 2) out.push({ x: a[i], y: a[i + 1] });
  return out;
};

const over = (pts: readonly Pt[], geom: TileGeometry, level: number): Pt[] => {
  const F = limitFrame(levelQuad(geom, level));
  return pts.map((p) => transPt(F, p));
};

/** Levels 0 to `top`, and the top level's children. */
export function computeLimit(top: number, onLevel?: (level: number) => void): LimitData {
  const spectreGeom = familyGeometry('spectre');
  const hexGeom = familyGeometry('hex');
  const selfGeom = tileABGeometry({ x: 1, y: 0 }, SELF_SIMILAR_B);
  const levels: LimitLevel[] = [];
  for (let level = 0; level <= top; level++) {
    const outlines = {} as Record<Kind, Outlines>;
    for (const kind of KINDS) {
      const outline = supertileOutline('spectre', level, kind === 'Gamma');
      const root = kind === 'Gamma' ? 'Gamma' : 'Delta';
      outlines[kind] = {
        spectre: flat(over(outline.map((e) => zToPt(e.from)), spectreGeom, level)),
        hex: flat(over(hexOutline(outline, level, root), hexGeom, level)),
        selfSimilar: flat(over(placeOutline(outline, selfGeom, level, root), selfGeom, level)),
      };
    }
    levels.push({
      level,
      outlines,
      quadGapHex: quadGap(levelQuad(hexGeom, level)),
      quadGapSpectre: quadGap(levelQuad(spectreGeom, level)),
      gapHexSpectre: outlineGap(unflat(outlines.other.hex), unflat(outlines.other.spectre)),
    });
    onLevel?.(level);
  }

  // The top level's children: the level below, placed by its slot transform.
  const children: LimitData['children'][number][] = [];
  if (top > 0) {
    const Ts = supertileTransforms(levelQuad(selfGeom, top - 1)).Ts;
    const down = inv(limitFrame(levelQuad(selfGeom, top - 1)));
    const up = limitFrame(levelQuad(selfGeom, top));
    for (let slot = 0; slot < 8; slot++) {
      const gamma = slot === 7;
      const T = mul(up, mul(Ts[slot], down));
      const pts = unflat(levels[top - 1].outlines[gamma ? 'Gamma' : 'other'].selfSimilar).map((p) => transPt(T, p));
      children.push({ slot, gamma, pts: flat(pts) });
    }
  }
  return { levels, children, b: SELF_SIMILAR_B, inflation: INFLATION };
}

/** Each start's distance from the top level, level by level. */
export function compareStarts(data: LimitData): StartGaps[] {
  const top = data.levels.length - 1;
  const ref = unflat(data.levels[top].outlines.other.selfSimilar);
  const below = data.levels.slice(0, top);
  const of = (geom: TileGeometry): number[] =>
    below.map((l) => outlineGap(over(placeOutline(supertileOutline('spectre', l.level, false), geom, l.level, 'Delta'), geom, l.level), ref));
  return [
    { start: 'Hexagon', gaps: below.map((l) => outlineGap(unflat(l.outlines.other.hex), ref)) },
    { start: 'Spectre, Tile(1,1)', gaps: below.map((l) => outlineGap(unflat(l.outlines.other.spectre), ref)) },
    { start: 'Hat, Tile(1,√3)', gaps: of(tileABGeometry({ x: 1, y: 0 }, { x: Math.sqrt(3), y: 0 })) },
    { start: 'Turtle, Tile(√3,1)', gaps: of(tileABGeometry({ x: Math.sqrt(3), y: 0 }, { x: 1, y: 0 })) },
    { start: 'Tile(1,b)', gaps: below.map((l) => outlineGap(unflat(l.outlines.other.selfSimilar), ref)) },
  ];
}
