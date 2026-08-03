/**
 * Turns `analyze()` / `runAnalysis()` output into SVG-ready path data
 * (DESIGN.md §5.1 `CircuitLayer`).
 *
 * Pure: no React, no DOM. `CircuitLayer` maps the returned records straight to
 * `<path>` elements, so overlay construction is unit-testable on a tiny
 * `analyze()` result.
 */

import {
  TAIL_COLOR,
  circuitHueColor,
  pathLength,
  rainbow,
  segmentKey,
  type Path,
  type Pt,
} from '../core';
import { boxOfPoints, unionBox, type Box, EMPTY_BOX } from './viewport';

export type OverlayKind = 'circuit' | 'tail';

export interface OverlayPath {
  /** Stable React key. */
  readonly key: string;
  readonly kind: OverlayKind;
  /** SVG path data in world coordinates. */
  readonly d: string;
  readonly color: string;
  /** Segment count of the *source* path (not of this record). */
  readonly length: number;
  readonly closed: boolean;
  /** Index of the source path within its circuits/tails array. */
  readonly index: number;
}

/** `Path` -> SVG path data. Closed paths get a trailing `Z`. */
export function pathToD(p: Path): string {
  const pts = p.points;
  if (pts.length === 0) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) d += ` L ${pts[i].x} ${pts[i].y}`;
  return p.closed ? `${d} Z` : d;
}

/** `points="x,y x,y …"` form, for `<polyline>`/`<polygon>` consumers. */
export function pathToPoints(p: Path): string {
  return p.points.map((q) => `${q.x},${q.y}`).join(' ');
}

export function pathBox(p: Path): Box {
  return boxOfPoints(p.points);
}

export function pathsBox(paths: readonly Path[]): Box {
  let box = EMPTY_BOX;
  for (const p of paths) box = unionBox(box, pathBox(p));
  return box;
}

/** Open-path endpoints — the `.tail-end` markers of §5.1. */
export function tailEndpoints(tails: readonly Path[]): readonly Pt[] {
  const out: Pt[] = [];
  for (const t of tails) {
    if (t.closed || t.points.length === 0) continue;
    out.push(t.points[0]);
    if (t.points.length > 1) out.push(t.points[t.points.length - 1]);
  }
  return out;
}

type PairList<K, V> = ReadonlyMap<K, V> | readonly (readonly [K, V])[];

function asMap<K, V>(src: PairList<K, V> | undefined): ReadonlyMap<K, V> | undefined {
  if (!src) return undefined;
  return src instanceof Map ? src : new Map(src as readonly (readonly [K, V])[]);
}

export interface OverlayInput {
  readonly circuits: readonly Path[];
  readonly tails: readonly Path[];
  /**
   * From `CircuitAnalysis.circuitColorByLength` (or its array form in
   * `AnalysisResponse.circuitColors`). Derived from the lengths present when
   * omitted, matching `analyze`'s 40°-per-length rule.
   */
  readonly circuitColorByLength?: PairList<number, string>;
  /** From `CircuitAnalysis.segmentColor` / `AnalysisResponse.segmentColors`. */
  readonly segmentColor?: PairList<string, string>;
}

export interface OverlayOptions {
  readonly showCircuits?: boolean;
  readonly showTails?: boolean;
  /**
   * Colour tails along their length instead of flat grey. Because the hue
   * varies *within* a path, rainbow tails are emitted as one record per
   * segment; everything else is one record per path.
   */
  readonly rainbowTails?: boolean;
  /**
   * Safety valve for huge levels: stop emitting records past this count.
   * `buildOverlayPaths` never throws, it just truncates.
   */
  readonly maxRecords?: number;
}

/** Colour map derived the way `analyze` derives it, for callers that lack one. */
export function deriveCircuitColors(circuits: readonly Path[]): ReadonlyMap<number, string> {
  const lengths = [...new Set(circuits.map(pathLength))].sort((a, b) => a - b);
  const out = new Map<number, string>();
  lengths.forEach((len, i) => out.set(len, circuitHueColor(i)));
  return out;
}

/**
 * Build the renderable overlay records. Order is circuits first, then tails, so
 * open paths draw on top of closed ones.
 */
export function buildOverlayPaths(
  input: OverlayInput,
  opts: OverlayOptions = {},
): readonly OverlayPath[] {
  const showCircuits = opts.showCircuits ?? true;
  const showTails = opts.showTails ?? true;
  const max = opts.maxRecords ?? Number.POSITIVE_INFINITY;
  const colorByLength = asMap(input.circuitColorByLength) ?? deriveCircuitColors(input.circuits);
  const segColor = asMap(input.segmentColor);

  const out: OverlayPath[] = [];

  if (showCircuits) {
    for (let i = 0; i < input.circuits.length && out.length < max; i++) {
      const p = input.circuits[i];
      if (p.points.length < 2) continue;
      const len = pathLength(p);
      out.push({
        key: `c${i}`,
        kind: 'circuit',
        d: pathToD(p),
        color: colorByLength.get(len) ?? circuitHueColor(0),
        length: len,
        closed: true,
        index: i,
      });
    }
  }

  if (showTails) {
    for (let i = 0; i < input.tails.length && out.length < max; i++) {
      const p = input.tails[i];
      if (p.points.length < 2) continue;
      const len = pathLength(p);
      if (!opts.rainbowTails) {
        out.push({
          key: `t${i}`,
          kind: 'tail',
          d: pathToD(p),
          color: TAIL_COLOR,
          length: len,
          closed: false,
          index: i,
        });
        continue;
      }
      // Rainbow tails vary hue along the path, so each segment is its own record.
      const segs = p.points.length - 1;
      for (let s = 0; s < segs && out.length < max; s++) {
        const a = p.points[s];
        const b = p.points[s + 1];
        const fromMap = segColor?.get(segmentKey([a, b]));
        out.push({
          key: `t${i}.${s}`,
          kind: 'tail',
          d: `M ${a.x} ${a.y} L ${b.x} ${b.y}`,
          color: fromMap ?? rainbow(segs > 1 ? s / (segs - 1) : 0),
          length: len,
          closed: false,
          index: i,
        });
      }
    }
  }

  return out;
}

/** Paths of a given length — powers the "zoom to an example" chips (§6.4). */
export function pathsOfLength(paths: readonly Path[], length: number): readonly Path[] {
  return paths.filter((p) => pathLength(p) === length);
}

export interface LengthChip {
  readonly length: number;
  readonly count: number;
  readonly color: string;
}

/** Length histogram with the circuit colours attached, for `StatsSummary`. */
export function lengthChips(
  paths: readonly Path[],
  colorByLength?: PairList<number, string>,
  fallback = TAIL_COLOR,
): readonly LengthChip[] {
  const colors = asMap(colorByLength);
  const counts = new Map<number, number>();
  for (const p of paths) {
    const len = pathLength(p);
    counts.set(len, (counts.get(len) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([length, count]) => ({ length, count, color: colors?.get(length) ?? fallback }));
}

/** Same as {@link lengthChips} but from the worker's summary arrays. */
export function summaryChips(
  summary: readonly { readonly length: number; readonly count: number }[],
  colorByLength?: PairList<number, string>,
  fallback = TAIL_COLOR,
): readonly LengthChip[] {
  const colors = asMap(colorByLength);
  return summary.map(({ length, count }) => ({
    length,
    count,
    color: colors?.get(length) ?? fallback,
  }));
}
