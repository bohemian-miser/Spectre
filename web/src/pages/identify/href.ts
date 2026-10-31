/**
 * The Identify page's address: a strand named by its rule, combination, a
 * tile's slot path under a Delta at the root level, and the edge the strand
 * enters that tile by.
 * `identify.html?rule=023468&combo=140000001&tile=1.7.0.3&edge=2&level=4`.
 */

export interface IdentifyTarget {
  readonly subset: readonly number[];
  readonly combo: string;
  readonly tile: string;
  readonly edge: number;
  readonly level: number;
}

/** The Identify page on a strand. */
export function identifyHref(base: string, p: { subset: readonly number[]; combo: string; tile: string; edge: number; level: number }): string {
  const q = new URLSearchParams({ rule: p.subset.join(''), combo: p.combo, tile: p.tile, edge: String(p.edge), level: String(p.level) });
  return `${base.endsWith('/') ? base : `${base}/`}identify.html?${q.toString()}`;
}

/** The strand an address names, or null unless every part is there and well formed. */
export function readIdentify(search: string): { subset: readonly number[]; combo: string; tile: string; edge: number; level: number } | null {
  const q = new URLSearchParams(search);
  const rule = q.get('rule') ?? '';
  const combo = q.get('combo') ?? '';
  const tile = q.get('tile') ?? '';
  const edge = q.get('edge') ?? '';
  const level = q.get('level') ?? '';
  if (!/^[0-8]{1,9}$/.test(rule) || new Set(rule).size !== rule.length) return null;
  if (!/^[0-9a-z]{9}$/.test(combo)) return null;
  if (!/^[0-5]$/.test(edge) || !/^\d{1,2}$/.test(level)) return null;
  const L = Number(level);
  if (!/^[0-7](\.[0-7])*$/.test(tile) || tile.split('.').length !== L) return null;
  return { subset: [...rule].map(Number), combo, tile, edge: Number(edge), level: L };
}
