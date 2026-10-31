/**
 * The Identify page's address: a strand named by its rule and combination,
 * a tile it crosses (that tile's slot path in a root supertile of the given
 * level) and the edge it enters that tile by,
 * `identify.html?rule=023468&combo=140000001&tile=3.0.5.1&edge=2&level=4`.
 */

/** The Identify page on a strand. */
export function identifyHref(base: string, p: { subset: readonly number[]; combo: string; tile: string; edge: number; level: number }): string {
  const q = new URLSearchParams({ rule: p.subset.join(''), combo: p.combo, tile: p.tile, edge: String(p.edge), level: String(p.level) });
  return `${base.endsWith('/') ? base : `${base}/`}identify.html?${q.toString()}`;
}

/** The strand an Identify address names, or null unless every part is there and well formed. */
export function readIdentify(search: string): { subset: number[]; combo: string; tile: string; edge: number; level: number } | null {
  const q = new URLSearchParams(search.replace(/^\?/, ''));
  const rule = q.get('rule') ?? '';
  const combo = q.get('combo') ?? '';
  const tile = q.get('tile');
  const edge = q.get('edge') ?? '';
  const level = q.get('level') ?? '';
  if (!/^[0-8]+$/.test(rule) || !/^[0-9a-z]+$/i.test(combo) || tile === null || !/^\d+$/.test(edge) || !/^\d+$/.test(level)) return null;
  const subset = [...rule].map(Number);
  // A hexagon's edges are 0 to 5.
  if (new Set(subset).size !== subset.length || Number(edge) > 5) return null;
  // A tile's slot path in a level-n root has n slots, each 0 to 7.
  const slots = tile === '' ? [] : tile.split('.');
  if (slots.length !== Number(level) || slots.some((s) => !/^[0-7]$/.test(s))) return null;
  return { subset, combo, tile, edge: Number(edge), level: Number(level) };
}
