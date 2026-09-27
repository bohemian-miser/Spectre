/**
 * The Classifications dataset: every combination of every valid rule, sorted
 * into a pattern class by `web/circuit-classes/` (see its README).
 *
 * Two files under `public/data/classifications/`:
 *   meta.json      classes, fields (with quantisation bounds) and blocks;
 *   points.bin.gz  16 bytes a row — the class id, then one byte per field.
 *
 * Rows are grouped in blocks, one per (family, rule), each in combination
 * enumeration order, so a row's combination string is recovered from its index
 * with `comboDigitsFromIndex` rather than stored. Class 255 marks a row the
 * sweep has not reached yet; those are skipped.
 */

import {
  comboDigitChar,
  comboDigitsFromIndex,
  comboOptionCounts,
  type TileFamilyId,
} from '../../core';
import { normalizeBase } from '../../lib/siteNav';

export const DATA_DIR = 'data/classifications/';
export const MISSING_CLASS = 255;

export interface ClassInfo {
  readonly id: string;
  readonly label: string;
}

export interface FieldInfo {
  readonly key: string;
  readonly label: string;
  readonly lo: number;
  readonly hi: number;
  readonly scale: 'linear' | 'log2';
  readonly description: string;
}

export interface BlockInfo {
  readonly family: TileFamilyId;
  readonly rule: string;
  readonly count: number;
  readonly done: number;
  /** First row of the block in the points array. */
  readonly offset: number;
}

export interface ClassificationMeta {
  readonly version: number;
  readonly rowBytes: number;
  readonly classes: readonly ClassInfo[];
  readonly fields: readonly FieldInfo[];
  readonly blocks: readonly BlockInfo[];
  readonly levels: string;
}

export interface ClassificationData {
  readonly meta: ClassificationMeta;
  /** rowBytes per row: class id, then one byte per field. */
  readonly rows: Uint8Array;
  readonly nRows: number;
  /** Block index of every row. */
  readonly blockOf: Uint8Array;
}

export function metaUrl(base: string): string {
  return `${normalizeBase(base)}${DATA_DIR}meta.json`;
}

export function pointsUrl(base: string): string {
  return `${normalizeBase(base)}${DATA_DIR}points.bin.gz`;
}

async function gunzip(buf: ArrayBuffer): Promise<Uint8Array> {
  const bytes = new Uint8Array(buf);
  // A server may already have decoded it (Content-Encoding: gzip).
  if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) return bytes;
  const DS = (globalThis as { DecompressionStream?: typeof DecompressionStream }).DecompressionStream;
  if (!DS) throw new Error('this browser cannot decompress gzip data (no DecompressionStream)');
  const stream = new Blob([bytes]).stream().pipeThrough(new DS('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export function buildData(meta: ClassificationMeta, rows: Uint8Array): ClassificationData {
  const nRows = Math.floor(rows.length / meta.rowBytes);
  const blockOf = new Uint8Array(nRows);
  meta.blocks.forEach((b, i) => blockOf.fill(i, b.offset, b.offset + b.count));
  return { meta, rows, nRows, blockOf };
}

export async function loadClassifications(base: string, signal?: AbortSignal): Promise<ClassificationData> {
  const [metaRes, pointsRes] = await Promise.all([
    fetch(metaUrl(base), { signal }),
    fetch(pointsUrl(base), { signal }),
  ]);
  if (!metaRes.ok) throw new Error(`meta.json: the server answered ${metaRes.status}`);
  if (!pointsRes.ok) throw new Error(`points.bin.gz: the server answered ${pointsRes.status}`);
  const meta = (await metaRes.json()) as ClassificationMeta;
  const rows = await gunzip(await pointsRes.arrayBuffer());
  return buildData(meta, rows);
}

/** A field's value for a row, back in its own units (bin centre). */
export function fieldValue(data: ClassificationData, row: number, field: number): number {
  const f = data.meta.fields[field];
  const q = data.rows[row * data.meta.rowBytes + 1 + field];
  const v = f.lo + (q / 255) * (f.hi - f.lo);
  return f.scale === 'log2' ? Math.max(0, 2 ** v - 1) : v;
}

/** A field's value on its plotting scale (log2(1 + x) for log fields), 0..1. */
export function fieldUnit(data: ClassificationData, row: number, field: number): number {
  return data.rows[row * data.meta.rowBytes + 1 + field] / 255;
}

export function rowClass(data: ClassificationData, row: number): number {
  return data.rows[row * data.meta.rowBytes];
}

const optionCountCache = new Map<string, number[]>();

export function ruleSubset(rule: string): number[] {
  return [...rule].map((ch) => Number.parseInt(ch, 10));
}

/** Combo digits (per leaf type) of a row. */
export function rowDigits(data: ClassificationData, row: number): number[] {
  const b = data.meta.blocks[data.blockOf[row]];
  const key = `${b.family}|${b.rule}`;
  let counts = optionCountCache.get(key);
  if (!counts) {
    counts = comboOptionCounts(b.family, ruleSubset(b.rule));
    optionCountCache.set(key, counts);
  }
  return comboDigitsFromIndex(counts, row - b.offset);
}

export function rowCombo(data: ClassificationData, row: number): string {
  return rowDigits(data, row)
    .map((d) => comboDigitChar(d) ?? '0')
    .join('');
}

/** Row index of a (family, rule, combo), or -1. */
export function findRow(
  data: ClassificationData,
  family: string,
  rule: string,
  combo: string,
): number {
  const bi = data.meta.blocks.findIndex((b) => b.family === family && b.rule === rule);
  if (bi < 0) return -1;
  const b = data.meta.blocks[bi];
  const counts = comboOptionCounts(b.family, ruleSubset(b.rule));
  if (combo.length !== counts.length) return -1;
  let idx = 0;
  for (let i = 0; i < counts.length; i++) {
    const d = Number.parseInt(combo[i], 36);
    if (!(d >= 0 && d < counts[i])) return -1;
    idx = idx * counts[i] + d;
  }
  return b.offset + idx;
}

export const FAMILY_LABEL: Readonly<Record<string, string>> = {
  spectre: 'Tile(1,1)',
  hex: 'Hexagons',
  'spectre-iso': 'Tile(1,1), hex labels',
};

/** Axis ticks in field units, returned as [value, unit position 0..1]. */
export function fieldTicks(f: FieldInfo, maxTicks = 6): [number, number][] {
  const out: [number, number][] = [];
  if (f.scale === 'log2') {
    for (let v = 1; v < 2 ** f.hi; v *= 10) {
      const u = (Math.log2(1 + v) - f.lo) / (f.hi - f.lo);
      if (u >= 0 && u <= 1) out.push([v, u]);
    }
    return [[0, (0 - f.lo) / (f.hi - f.lo)], ...out];
  }
  const span = f.hi - f.lo;
  const raw = span / maxTicks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  for (let v = Math.ceil(f.lo / step) * step; v <= f.hi + 1e-9; v += step) {
    out.push([Number(v.toFixed(6)), (v - f.lo) / span]);
  }
  return out;
}

export function formatValue(f: FieldInfo, v: number): string {
  if (f.scale === 'log2') return Math.round(v).toLocaleString('en-US');
  if (f.key === 'distinct') return String(Math.round(v));
  return v.toFixed(2);
}
