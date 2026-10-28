/**
 * The Corners page's circuits: per class of a rule, the biggest circuit of
 * each family at its last few generations, as tile positions sampled evenly
 * by tile count. Written by `web/circuit-classes/corner-paths.ts` to
 * `public/data/corners/<family>-<rule>/` (an index plus one file per class).
 */

import type { Loop } from './measure';

export interface CircuitMeta {
  readonly family: string;
  readonly aliases: readonly string[];
  readonly level: number;
  readonly type: string;
  readonly length: number;
  readonly rg: number;
  readonly samples: number;
  readonly box: readonly [number, number, number];
}

export interface CornerClass {
  readonly combo: string;
  readonly pattern: string;
  readonly kind: string;
  readonly members: number;
  readonly maxLevel: number;
  readonly circuits: readonly CircuitMeta[];
}

export interface CornerIndex {
  readonly family: string;
  readonly rule: string;
  readonly samples: number;
  readonly generated: string;
  readonly classes: readonly CornerClass[];
}

export interface Circuit extends CircuitMeta {
  readonly loop: Loop;
}

export const RULE = { family: 'hex', rule: '023468' } as const;

export function cornersDir(base: string): string {
  return `${base.endsWith('/') ? base : `${base}/`}data/corners/${RULE.family}-${RULE.rule}/`;
}

export async function loadIndex(base: string, signal?: AbortSignal): Promise<CornerIndex> {
  const res = await fetch(`${cornersDir(base)}index.json`, { signal });
  if (!res.ok) throw new Error(`the server answered ${res.status}`);
  return (await res.json()) as CornerIndex;
}

/** Positions from little-endian Int16 over the bounding square (x0, y0, side). */
export function decodeLoop(pts: string, box: readonly [number, number, number], n: number): Loop {
  const bin = atob(pts);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const view = new DataView(bytes.buffer);
  const xy = new Float64Array(2 * n);
  for (let i = 0; i < 2 * n; i++) xy[i] = box[i % 2] + ((view.getInt16(2 * i, true) + 32768) / 65535) * box[2];
  return { xy, n };
}

export async function loadClass(base: string, combo: string, signal?: AbortSignal): Promise<Circuit[]> {
  const res = await fetch(`${cornersDir(base)}${combo}.json`, { signal });
  if (!res.ok) throw new Error(`the server answered ${res.status}`);
  const f = (await res.json()) as { circuits: (CircuitMeta & { pts: string })[] };
  return f.circuits.map(({ pts, ...meta }) => ({ ...meta, loop: decodeLoop(pts, meta.box, meta.samples) }));
}

/** "family [147]" or "families [147], [13], [17]" when the same circuit is biggest in several. */
export function familyLabel(c: CircuitMeta): string {
  return c.aliases.length ? `[${c.family}] = ${c.aliases.map((a) => `[${a}]`).join(' = ')}` : `[${c.family}]`;
}
