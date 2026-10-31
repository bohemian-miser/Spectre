/**
 * How far up two tiles of the infinite plane share their ancestry.
 *
 * The unrooted engine names a tile by its slot path from an ancestor on the
 * world's chain: `"d:s.s.s"` is the tile `d` slots below the chain's level-d
 * ancestor (`xray.ts`, `pathFromAncestor`). The chain gives the slots above
 * level d, so any two tiles compare slot by slot from the top down. The
 * level they first differ at is the lowest supertile they share: level 0 is
 * the same tile, level k means one level-k supertile holds both and no
 * smaller one does.
 */

import type { ChainStep } from '../../core';

export interface TileId {
  /** The chain level the slots hang from. */
  readonly d: number;
  /** Slots from the level-(d-1) ancestor down to the tile. */
  readonly slots: readonly number[];
}

export function parseTileId(id: string): TileId | null {
  const m = /^(\d+):([\d.]*)$/.exec(id);
  if (!m) return null;
  return { d: Number(m[1]), slots: m[2] === '' ? [] : m[2].split('.').map(Number) };
}

/** The slot of a tile's level-`level` ancestor in its level-(`level` + 1) ancestor. */
function slotAt(t: TileId, chain: readonly ChainStep[], level: number): number {
  return level >= t.d ? chain[level].slot : t.slots[t.d - 1 - level];
}

/**
 * The level of the lowest supertile holding both tiles. The chain must reach
 * the higher of the two tiles' `d`.
 */
export function sharedLevel(a: TileId, b: TileId, chain: readonly ChainStep[]): number {
  const top = Math.max(a.d, b.d);
  if (chain.length < top) throw new Error(`the chain reaches level ${chain.length}, the tiles hang from level ${top}`);
  // Above `top` both tiles ride the chain, so they agree there.
  for (let level = top - 1; level >= 0; level--) {
    if (slotAt(a, chain, level) !== slotAt(b, chain, level)) return level + 1;
  }
  return 0;
}

/** Levels the colouring tells apart; deeper ones take the last colour. */
export const LEVEL_SPAN = 24;

/** Ink for a shared level, 0..1 RGB: the site's rainbow over the levels; grey for a tile whose level is not known. */
export function levelRgb(level: number): [number, number, number] {
  if (level < 0) return [0.5, 0.5, 0.5];
  const deg = (Math.min(level, LEVEL_SPAN) / LEVEL_SPAN) * 300;
  const l = 0.5 + 0.15 * Math.cos(((deg - 240) * Math.PI) / 180);
  const a = Math.min(l, 1 - l);
  const f = (k0: number): number => {
    const k = (k0 + deg / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [f(0), f(8), f(4)];
}

/** `levelRgb` as CSS. */
export function levelCss(level: number): string {
  const [r, g, b] = levelRgb(level);
  return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
}

/**
 * A function from a tile's id to its shared level with `startId`, over an
 * engine whose chain grows on demand. Ids the engine did not emit, or that
 * do not parse, read as -1.
 */
export function levelOfFrom(
  engine: { chain(): readonly ChainStep[]; ensureLevel(level: number): void },
  startId: string,
): (id: string | undefined) => number {
  const start = parseTileId(startId);
  if (!start) return () => -1;
  const cache = new Map<string, number>();
  return (id) => {
    if (!id) return -1;
    const hit = cache.get(id);
    if (hit !== undefined) return hit;
    const t = parseTileId(id);
    if (!t) return -1;
    engine.ensureLevel(Math.max(t.d, start.d));
    const level = sharedLevel(start, t, engine.chain());
    if (cache.size > 1 << 16) cache.clear();
    cache.set(id, level);
    return level;
  };
}
