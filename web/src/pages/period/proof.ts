/**
 * The facts the page's argument rests on, computed from a run of the
 * borders (`period.ts`): whether the borders repeat, whether any circuit
 * closes in the levels that decide all the others, and, for the Psi, the
 * pieces of the infinite line: one route through every tile, Psi children
 * whose crossings are all welded, and a chain of Psi supertiles each buried
 * in one a few levels up.
 */
import { HEX_TYPES, childType, type HexType } from '../../core';
import { burialDepth, compose, type Run } from './period';

export interface Repeat {
  readonly start: number;
  readonly length: number;
  /** Circuits closing at levels 1 to start + length, by level: these decide every level's. */
  readonly circuits: readonly number[];
}

export function repeatOf(r: Run): Repeat | null {
  if (!r.period) return null;
  const { start, length } = r.period;
  return { start, length, circuits: r.circuits.slice(1, start + length + 1).map((c) => HEX_TYPES.reduce((a, t) => a + c[t], 0)) };
}

/** Leaf tiles of each type in a level-n supertile of each type. */
export function leafCounts(n: number): Record<HexType, Record<HexType, number>>[] {
  const unit = (t: HexType) => Object.fromEntries(HEX_TYPES.map((x) => [x, x === t ? 1 : 0])) as Record<HexType, number>;
  const out = [Object.fromEntries(HEX_TYPES.map((t) => [t, unit(t)])) as Record<HexType, Record<HexType, number>>];
  for (let k = 1; k <= n; k++) {
    const prev = out[k - 1];
    out.push(Object.fromEntries(HEX_TYPES.map((t) => {
      const sum = Object.fromEntries(HEX_TYPES.map((x) => [x, 0])) as Record<HexType, number>;
      for (let s = 0; s < 8; s++) {
        const c = childType(t, s);
        if (c) for (const x of HEX_TYPES) sum[x] += prev[c][x];
      }
      return [t, sum];
    })) as Record<HexType, Record<HexType, number>>);
  }
  return out;
}

export interface Line {
  /** Psi crossings at each level. */
  readonly crossings: readonly number[];
  /** By level: the Psi's tiles, the chords on its one route, and the chords of all its tiles. */
  readonly levels: readonly { readonly level: number; readonly tiles: number; readonly onRoute: number; readonly chords: number }[];
  /** Psi children's slots, and whether every crossing of the child is welded inside the parent at every level built. */
  readonly slots: readonly { readonly slot: number; readonly welded: boolean }[];
  /** A repeating word of those slots putting each Psi in the next, and the levels until each is buried. */
  readonly chain: { readonly word: readonly number[]; readonly depth: number } | null;
  /** Every tile type has a chord. */
  readonly everyTypeHasChord: boolean;
}

export function lineOf(r: Run): Line {
  const top = r.states.length - 1;
  const leaves = leafCounts(top);
  const levels = r.states.map((s, n) => {
    const m = leaves[n].Psi;
    return {
      level: n,
      tiles: HEX_TYPES.reduce((a, x) => a + m[x], 0),
      onRoute: s.Psi.mate.length === 2 ? s.Psi.chords[0] : 0,
      chords: HEX_TYPES.reduce((a, x) => a + (m[x] * r.states[0][x].mate.length) / 2, 0),
    };
  });
  const slots = [0, 1, 2, 3, 4, 5, 6, 7].filter((s) => childType('Psi', s) === 'Psi').map((slot) => ({
    slot,
    welded: r.states.slice(0, top).every((s) => !compose(s, 'Psi').border.some((c) => c.slot === slot)),
  }));
  const usable = slots.filter((s) => s.welded).map((s) => s.slot);
  const words: number[][] = [...usable.map((s) => [s]), ...usable.flatMap((a) => usable.filter((b) => b !== a).map((b) => [a, b]))];
  let chain: Line['chain'] = null;
  for (const word of words) {
    const depth = burialDepth('Psi', word);
    if (depth !== null && (!chain || depth < chain.depth)) chain = { word, depth };
  }
  return {
    crossings: r.states.map((s) => s.Psi.mate.length),
    levels,
    slots,
    chain,
    everyTypeHasChord: HEX_TYPES.every((t) => r.states[0][t].mate.length > 0),
  };
}

/** Whether the run shows the infinite line: borders repeating, no circuit, the Psi one route through every tile, and a chain that buries. */
export function isLine(r: Run, line: Line): boolean {
  const rep = repeatOf(r);
  return !!rep && rep.circuits.every((c) => c === 0) && line.crossings.every((c) => c === 2) && line.everyTypeHasChord && line.chain !== null;
}
