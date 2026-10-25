/**
 * The precomputed centre map: every pairing of one family at one level, laid
 * out offline by `web/circuit-classes/centremap-sweep.ts` and
 * `centremap-embed.py` (see that folder's README).
 *
 * Under `public/data/centremap/<family>-<level>/`:
 *   meta.json     the rules (each with its first global index), the layout's
 *                 bounds and how it was made;
 *   xy.i16        per pairing, x and y, each scaled to int16 over its bounds;
 *   longest.u16   per pairing, its longest circuit in tiles.
 *
 * Pairings are numbered globally, rule by rule, each rule's in combination
 * index order (`comboDigitsFromIndex`), so a combination string is recovered
 * from the index rather than stored. Search works per digit: a rule, a
 * pattern and tile joins each allow some digits at each position, and a
 * pairing matches when every one of its digits is allowed.
 */

import {
  comboDigitChar,
  comboDigitsFromIndex,
  leafOrder,
  matchesJoins,
  type DigitSpread,
  type EdgeJoin,
  type SelectionPattern,
  type TileFamilyId,
} from '../../core';

export const ATLAS_DIR = 'data/centremap/';

export interface AtlasRule {
  readonly subset: readonly number[];
  readonly optionCounts: readonly number[];
  readonly offset: number;
  readonly total: number;
}

export interface AtlasMeta {
  readonly family: TileFamilyId;
  readonly level: number;
  readonly total: number;
  readonly rules: readonly AtlasRule[];
  readonly landmarks: readonly number[];
  readonly distinct: number;
  readonly bounds: { readonly min: readonly [number, number]; readonly max: readonly [number, number] };
  readonly files: { readonly xy: string; readonly longest: string };
  readonly pca?: { readonly dims: number; readonly variance: number };
  readonly generated?: string;
}

export interface Atlas {
  readonly meta: AtlasMeta;
  /** Layout coordinates, back in UMAP units: x, y per pairing. */
  readonly xy: Float32Array;
  readonly longest: Uint16Array;
  /** Rule index per pairing. */
  readonly ruleOf: Uint8Array;
}

export function atlasUrl(base: string, family: TileFamilyId, level: number, file: string): string {
  return `${base.endsWith('/') ? base : `${base}/`}${ATLAS_DIR}${family}-${level}/${file}`;
}

/** The raw files as an atlas: coordinates unscaled, so both axes share units again. */
export function buildAtlas(meta: AtlasMeta, xy: Int16Array, longest: Uint16Array): Atlas {
  const n = meta.total;
  if (xy.length < 2 * n || longest.length < n) throw new Error(`expected ${n} pairings, got ${xy.length / 2}`);
  const out = new Float32Array(2 * n);
  for (let a = 0; a < 2; a++) {
    const lo = meta.bounds.min[a];
    const span = meta.bounds.max[a] - lo;
    const s = span > 0 ? span / 65534 : 0;
    for (let i = 0; i < n; i++) out[2 * i + a] = lo + (xy[2 * i + a] + 32767) * s;
  }
  const ruleOf = new Uint8Array(n);
  meta.rules.forEach((r, i) => ruleOf.fill(i, r.offset, r.offset + r.total));
  return { meta, xy: out, longest: longest.subarray(0, n), ruleOf };
}

export async function loadAtlas(base: string, family: TileFamilyId, level: number, signal?: AbortSignal): Promise<Atlas> {
  const metaRes = await fetch(atlasUrl(base, family, level, 'meta.json'), { signal });
  if (!metaRes.ok) throw new Error(`meta.json: the server answered ${metaRes.status}`);
  const meta = (await metaRes.json()) as AtlasMeta;
  const [xyRes, longRes] = await Promise.all([
    fetch(atlasUrl(base, family, level, meta.files.xy), { signal }),
    fetch(atlasUrl(base, family, level, meta.files.longest), { signal }),
  ]);
  if (!xyRes.ok) throw new Error(`${meta.files.xy}: the server answered ${xyRes.status}`);
  if (!longRes.ok) throw new Error(`${meta.files.longest}: the server answered ${longRes.status}`);
  return buildAtlas(meta, new Int16Array(await xyRes.arrayBuffer()), new Uint16Array(await longRes.arrayBuffer()));
}

export const ruleName = (r: AtlasRule): string => r.subset.join('');

/** A pairing's rule and combination string. */
export function atlasPairing(atlas: Atlas, index: number): { ruleIndex: number; rule: string; subset: readonly number[]; combo: string } {
  const ruleIndex = atlas.ruleOf[index];
  const r = atlas.meta.rules[ruleIndex];
  const combo = comboDigitsFromIndex(r.optionCounts, index - r.offset)
    .map((d) => comboDigitChar(d) ?? '0')
    .join('');
  return { ruleIndex, rule: ruleName(r), subset: r.subset, combo };
}

export interface AtlasSearch {
  /** A rule name ('' for any). */
  readonly rule: string;
  /** Combination pattern, `?` for any digit. */
  readonly pattern: string;
  readonly joins: readonly EdgeJoin[];
}

/**
 * Per rule, the digits each position allows under a search (null: the rule is
 * out). Joins name one tile type each, so each is a test on one digit.
 */
export function allowedDigits(family: TileFamilyId, rules: readonly AtlasRule[], search: AtlasSearch): (Uint8Array[] | null)[] {
  const types = leafOrder(family);
  const p = search.pattern.trim().toLowerCase();
  return rules.map((r) => {
    if (search.rule && ruleName(r) !== search.rule) return null;
    return r.optionCounts.map((k, pos) => {
      const ok = new Uint8Array(k);
      const joins = search.joins.filter((j) => j.type === types[pos]);
      for (let d = 0; d < k; d++) {
        const ch = comboDigitChar(d) ?? '0';
        if (pos < p.length && p[pos] !== '?' && p[pos] !== ch) continue;
        if (joins.length) {
          const combo = r.optionCounts.map((_, q) => (q === pos ? ch : '0')).join('');
          if (!matchesJoins(family, r.subset, combo, joins)) continue;
        }
        ok[d] = 1;
      }
      return ok;
    });
  });
}

/** 1 per pairing that matches the search, and how many do. */
export function atlasMatches(atlas: Atlas, search: AtlasSearch): { mask: Uint8Array; count: number } {
  const { meta } = atlas;
  const allowed = allowedDigits(meta.family, meta.rules, search);
  const mask = new Uint8Array(meta.total);
  let count = 0;
  meta.rules.forEach((r, ri) => {
    const ok = allowed[ri];
    if (!ok) return;
    const k = r.optionCounts;
    const m = k.length;
    // Walk the combinations in index order: the last digit counts fastest.
    const digits = new Int32Array(m);
    let bad = 0; // positions whose digit is not allowed
    for (let q = 0; q < m; q++) if (!ok[q][0]) bad++;
    for (let i = 0; i < r.total; i++) {
      if (!bad) {
        mask[r.offset + i] = 1;
        count++;
      }
      for (let q = m - 1; q >= 0; q--) {
        const was = ok[q][digits[q]];
        digits[q] = digits[q] + 1 === k[q] ? 0 : digits[q] + 1;
        const now = ok[q][digits[q]];
        bad += was - now;
        if (digits[q] !== 0) break;
      }
    }
  });
  return { mask, count };
}

/** A selection summed up per rule, like `selectionPatterns`, straight from the indices. */
export function atlasPatterns(atlas: Atlas, picked: ArrayLike<number>): SelectionPattern[] {
  const { meta } = atlas;
  const types = leafOrder(meta.family);
  const tallies = meta.rules.map((r) => ({ count: 0, digits: r.optionCounts.map((k) => new Float64Array(k)) }));
  for (let j = 0; j < picked.length; j++) {
    const i = picked[j];
    const ri = atlas.ruleOf[i];
    const r = meta.rules[ri];
    const t = tallies[ri];
    t.count++;
    let rest = i - r.offset;
    for (let q = r.optionCounts.length - 1; q >= 0; q--) {
      const k = r.optionCounts[q];
      t.digits[q][rest % k]++;
      rest = Math.floor(rest / k);
    }
  }
  const out: SelectionPattern[] = [];
  meta.rules.forEach((r, ri) => {
    const t = tallies[ri];
    if (!t.count) return;
    const spread: DigitSpread[] = t.digits.map((counts, position) => ({
      position,
      type: types[position],
      values: [...counts]
        .map((count, d) => ({ digit: comboDigitChar(d) ?? '0', count }))
        .filter((v) => v.count > 0)
        .sort((a, b) => b.count - a.count || a.digit.localeCompare(b.digit)),
    }));
    out.push({
      rule: ruleName(r),
      subset: r.subset,
      count: t.count,
      pattern: spread.map((s) => (s.values.length === 1 ? s.values[0].digit : '?')).join(''),
      spread,
    });
  });
  return out;
}
