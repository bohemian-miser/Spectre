/**
 * The Classifications dataset: every combination of every valid rule, sorted
 * into a pattern class by `web/circuit-classes/` (see its README).
 *
 * Two files under `public/data/classifications/`:
 *   meta.json      classes, fields (with quantisation bounds) and blocks;
 *   points.bin.gz  one byte for the class id, then one byte per field.
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
  /** Whole numbers: shown without decimals. */
  readonly integer?: boolean;
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

/** A field's value -> its unit position 0..1 (inverse of the quantisation). */
export function valueToUnit(f: FieldInfo, v: number): number {
  const s = f.scale === 'log2' ? Math.log2(1 + Math.max(0, v)) : v;
  return (s - f.lo) / (f.hi - f.lo);
}

/** A unit position 0..1 -> the field's value. */
export function unitToValue(f: FieldInfo, u: number): number {
  const s = f.lo + u * (f.hi - f.lo);
  return f.scale === 'log2' ? Math.max(0, 2 ** s - 1) : s;
}

/**
 * Axis ticks between unit positions u0..u1, as [value, unit position].
 * Log fields tick at 0 and powers of ten; integer fields at whole steps.
 */
export function fieldTicks(f: FieldInfo, u0 = 0, u1 = 1, maxTicks = 6): [number, number][] {
  const out: [number, number][] = [];
  const inRange = (u: number) => u >= u0 - 1e-9 && u <= u1 + 1e-9;
  if (f.scale === 'log2') {
    for (let v = 0; v < 2 ** f.hi; v = v === 0 ? 1 : v * 10) {
      const u = valueToUnit(f, v);
      if (inRange(u)) out.push([v, u]);
    }
    if (out.length >= 3) return out;
    // A narrow log range: add the 2s and 5s so the axis still reads.
    const more: [number, number][] = [];
    for (let d = 1; d < 2 ** f.hi; d *= 10) {
      for (const m of [1, 2, 5]) {
        const u = valueToUnit(f, m * d);
        if (inRange(u)) more.push([m * d, u]);
      }
    }
    return more;
  }
  const v0 = unitToValue(f, u0);
  const v1 = unitToValue(f, u1);
  const raw = Math.max((v1 - v0) / maxTicks, f.integer ? 1 : 1e-6);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((st) => st >= raw && (!f.integer || Number.isInteger(st))) ?? raw;
  for (let v = Math.ceil(v0 / step - 1e-9) * step; v <= v1 + 1e-9; v += step) {
    out.push([Number(v.toFixed(6)), valueToUnit(f, v)]);
  }
  return out;
}

/** Short tick label: 1k, 10k, 1M for big numbers. */
export function tickLabel(v: number): string {
  if (v >= 1e6) return `${Number((v / 1e6).toFixed(1))}M`;
  if (v >= 1e4) return `${Number((v / 1e3).toFixed(1))}k`;
  return String(v);
}

export function formatValue(f: FieldInfo, v: number): string {
  if (f.scale === 'log2' || f.integer) return Math.round(v).toLocaleString('en-US');
  return v.toFixed(2);
}
