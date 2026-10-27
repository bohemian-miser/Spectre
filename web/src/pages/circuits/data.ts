/**
 * The circuit atlas: one rule's pairings in boundary classes, each class with
 * its circuit families and silhouettes. Written by
 * `web/circuit-classes/circuit-atlas.ts` (see its header and the README) to
 * `public/data/circuit-atlas/<family>-<rule>.json`.
 */

import type { TileFamilyId } from '../../core';

export type CircuitKind = 'space-filling' | 'thread' | 'triangle' | 'small' | 'none';

export interface AtlasShape {
  readonly what: string;
  readonly level: number;
  readonly length: number;
  readonly stop: number;
  readonly closed: boolean;
  /** x, y pairs scaled into 0..4095 (y down). */
  readonly pts: readonly number[];
  readonly box: readonly [number, number, number, number];
}

export interface AtlasFamily {
  readonly slots: string;
  readonly firstLevel: number;
  readonly lengths: readonly (readonly number[])[];
  readonly counts: readonly number[];
  readonly growth: number | null;
}

export interface AtlasClass {
  readonly representative: string;
  readonly members: readonly string[];
  readonly pattern: string;
  readonly kind: CircuitKind;
  readonly dimension: number | null;
  readonly growth: number | null;
  readonly depth: number;
  readonly longest: readonly number[];
  readonly openArc: readonly number[];
  readonly families: readonly AtlasFamily[];
  readonly shapes: readonly AtlasShape[];
}

export interface Atlas {
  readonly family: TileFamilyId;
  readonly rule: string;
  readonly generated: string;
  readonly classes: readonly AtlasClass[];
}

/** The atlases shipped with the site. */
export const ATLASES: readonly { readonly family: TileFamilyId; readonly rule: string; readonly label: string }[] = [
  { family: 'hex', rule: '023468', label: 'Hexagons, rule 023468' },
];

export const KIND_ORDER: readonly CircuitKind[] = ['space-filling', 'thread', 'triangle', 'small', 'none'];

export const KIND_LABEL: Record<CircuitKind, string> = {
  'space-filling': 'Space-filling',
  thread: 'Threads',
  triangle: 'Triangle fractals',
  small: 'Small circuits only',
  none: 'No circuits',
};

export const KIND_BLURB: Record<CircuitKind, string> = {
  'space-filling': 'Circuits that fill the area they span (dimension near 2): the monsters.',
  thread: 'Thin fractal circuits, between the triangles and the space-fillers (dimension 1.6 to 1.85).',
  triangle: 'The common kind: triangles and bow-ties at every scale (dimension near 1.45).',
  small: 'Only small circuits close by the deepest level computed.',
  none: 'No circuit closes by the deepest level computed.',
};

export function atlasUrl(base: string, family: TileFamilyId, rule: string): string {
  return `${base.endsWith('/') ? base : `${base}/`}data/circuit-atlas/${family}-${rule}.json`;
}

export async function loadAtlas(base: string, family: TileFamilyId, rule: string, signal?: AbortSignal): Promise<Atlas> {
  const res = await fetch(atlasUrl(base, family, rule), { signal });
  if (!res.ok) throw new Error(`the server answered ${res.status}`);
  return (await res.json()) as Atlas;
}

/** An SVG path for a silhouette (closed circuits end with Z). */
export function shapePath(s: AtlasShape): string {
  const p = s.pts;
  if (p.length < 4) return '';
  let d = `M${p[0]} ${p[1]}`;
  for (let i = 2; i < p.length; i += 2) d += `L${p[i]} ${p[i + 1]}`;
  return s.closed ? `${d}Z` : d;
}

/** How many tiles across the silhouette is, roughly (hexagon width 2). */
export function shapeSpan(s: AtlasShape): number {
  const [x0, y0, x1, y1] = s.box;
  return Math.max(x1 - x0, y1 - y0) / 2;
}
