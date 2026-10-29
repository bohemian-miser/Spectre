/**
 * Naming a circuit from outside: its combination and, within the
 * renormalisation of that combination, the level it is born at and its
 * length, which name one distinct circuit (`distinctCircuits` keeps one per
 * level and length). The Compare page takes two such names in its URL hash,
 * `#a=023468-140000001:4:303&b=023468-140000001:6:14679`.
 */

export interface CircuitRef {
  readonly subset: readonly number[];
  readonly combo: string;
  readonly level: number;
  readonly length: number;
}

export const formatRef = (r: CircuitRef): string => `${r.subset.join('')}-${r.combo}:${r.level}:${r.length}`;

export function parseRef(text: string): CircuitRef | null {
  const m = /^(\d+)-([0-9a-z]+):(\d+):(\d+)$/i.exec(text.trim());
  if (!m) return null;
  const subset = [...m[1]].map(Number);
  if (new Set(subset).size !== subset.length || subset.some((c) => c > 8)) return null;
  const level = Number(m[3]);
  const length = Number(m[4]);
  if (level < 1 || level > 12 || length < 1) return null;
  return { subset, combo: m[2], level, length };
}

export const sameRef = (x: CircuitRef, y: CircuitRef): boolean => formatRef(x) === formatRef(y);

/** The two circuits named in a hash, or null unless both are there and parse. */
export function refsFromHash(hash: string): { a: CircuitRef; b: CircuitRef } | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const a = parseRef(params.get('a') ?? '');
  const b = parseRef(params.get('b') ?? '');
  return a && b ? { a, b } : null;
}

export const hashOf = (a: CircuitRef, b: CircuitRef): string => `#a=${formatRef(a)}&b=${formatRef(b)}`;

/** The Compare page on two circuits. */
export function compareHref(base: string, a: CircuitRef, b: CircuitRef): string {
  return `${base.endsWith('/') ? base : `${base}/`}compare.html${hashOf(a, b)}`;
}
