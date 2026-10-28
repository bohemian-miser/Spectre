/**
 * A level-L supertile as a table of what lies across each edge.
 *
 * Tiles are numbered in slot-path order. For tile i and edge e, `across[6i+e]`
 * is `6j+f` when edge e of tile i is glued to edge f of tile j inside the
 * supertile (found once with `neighbour()`), and -1 on its outline. The table
 * does not depend on the rule or the combination, so one board serves every
 * combination, and tracing a strand is table lookups.
 */
import { HEX_TYPES, childType, neighbour, type Address, type HexType, type Link } from '../src/core';

export interface Board {
  readonly root: HexType;
  readonly level: number;
  readonly n: number;
  /** Per tile: index into `HEX_TYPES`. */
  readonly type: Uint8Array;
  /** Per tile: its slot path from the root down, `level` bytes. */
  readonly slots: Uint8Array;
  readonly across: Int32Array;
}

const TYPE_INDEX = new Map(HEX_TYPES.map((t, i) => [t, i]));

/** Leaves of a depth-d supertile of each type. */
const sizes: Map<HexType, number>[] = [new Map(HEX_TYPES.map((t) => [t, 1]))];
function size(t: HexType, d: number): number {
  while (sizes.length <= d) {
    const prev = sizes[sizes.length - 1];
    sizes.push(new Map(HEX_TYPES.map((p) => {
      let s = 0;
      for (let k = 0; k < 8; k++) { const c = childType(p, k); if (c) s += prev.get(c)!; }
      return [p, s];
    })));
  }
  return sizes[d].get(t)!;
}

/** The tile's address in the board's root. */
export function addressOf(b: Board, i: number): Address {
  const path: Link[] = [];
  let t = b.root;
  for (let d = 0; d < b.level; d++) {
    const s = b.slots[i * b.level + d];
    path.push({ slot: s, parent: t });
    t = childType(t, s)!;
  }
  return { leaf: t, path: path.reverse() };
}

/** The board index of an address in the board's root. */
export function indexOf(b: Board, a: Address): number {
  let i = 0;
  for (let d = 0; d < b.level; d++) {
    const { slot, parent } = a.path[b.level - 1 - d];
    for (let k = 0; k < slot; k++) { const c = childType(parent, k); if (c) i += size(c, b.level - 1 - d); }
  }
  return i;
}

export const typeOf = (b: Board, i: number): HexType => HEX_TYPES[b.type[i]];

const cache = new Map<string, Board>();

export function board(root: HexType, level: number): Board {
  const key = `${root}:${level}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const n = size(root, level);
  const type = new Uint8Array(n);
  const slots = new Uint8Array(n * level);
  let at = 0;
  const stack = new Uint8Array(level);
  const go = (t: HexType, d: number): void => {
    if (d === level) {
      type[at] = TYPE_INDEX.get(t)!;
      slots.set(stack, at * level);
      at++;
      return;
    }
    for (let s = 0; s < 8; s++) {
      const c = childType(t, s);
      if (c) { stack[d] = s; go(c, d + 1); }
    }
  };
  go(root, 0);
  const b: Board = { root, level, n, type, slots, across: new Int32Array(n * 6).fill(-1) };
  for (let i = 0; i < n; i++) {
    let a: Address | null = null;
    for (let e = 0; e < 6; e++) {
      if (b.across[6 * i + e] !== -1) continue;
      a ??= addressOf(b, i);
      const nb = neighbour(a, e);
      if (!nb.ok) continue;
      const j = indexOf(b, nb.address);
      b.across[6 * i + e] = 6 * j + nb.edge;
      b.across[6 * j + nb.edge] = 6 * i + e;
    }
  }
  cache.set(key, b);
  return b;
}

/** Drop cached boards below a level. */
export function forgetBelow(level: number): void {
  for (const [k, b] of cache) if (b.level < level) cache.delete(k);
}

export interface Traced {
  readonly kind: 'circuit' | 'open';
  /** Per tile walked: index and the edges in and out. */
  readonly tiles: Int32Array;
  readonly entries: Uint8Array;
  readonly exits: Uint8Array;
}

/**
 * Every strand of the board under a pairing table (type -> entry -> exit),
 * each once. Circuits are read from their first tile in board order; open
 * strands from one end to the other. A strand longer than `maxLength` is
 * reported as open.
 */
export function traceAll(b: Board, table: Map<HexType, Map<number, number>>, maxLength = Infinity): Traced[] {
  const { n } = b;
  const byType = HEX_TYPES.map((t) => {
    const p = new Int8Array(6).fill(-1);
    for (const [e, x] of table.get(t) ?? []) p[e] = x;
    return p;
  });
  const used = new Uint8Array(n * 6);
  const out: Traced[] = [];
  const tiles: number[] = [];
  const entries: number[] = [];
  const exits: number[] = [];
  /** Walk from tile i entering by e; true when it comes back. */
  const walk = (i: number, e: number): boolean => {
    tiles.length = 0; entries.length = 0; exits.length = 0;
    let t = i;
    let en = e;
    for (;;) {
      const x = byType[b.type[t]][en];
      used[6 * t + en] = 1;
      used[6 * t + x] = 1;
      tiles.push(t); entries.push(en); exits.push(x);
      const nx = b.across[6 * t + x];
      if (nx < 0) return false;
      t = (nx / 6) | 0;
      en = nx % 6;
      if (t === i && en === e) return true;
      if (tiles.length > maxLength) return false;
    }
  };
  for (let i = 0; i < n; i++) {
    const pair = byType[b.type[i]];
    for (let e = 0; e < 6; e++) {
      if (pair[e] < 0 || used[6 * i + e]) continue;
      if (walk(i, e)) {
        out.push({ kind: 'circuit', tiles: Int32Array.from(tiles), entries: Uint8Array.from(entries), exits: Uint8Array.from(exits) });
        continue;
      }
      const ft = Int32Array.from(tiles);
      const fe = Uint8Array.from(entries);
      const fx = Uint8Array.from(exits);
      // Open: walk the other way from the start and join the two halves.
      const back = b.across[6 * i + e];
      if (back < 0) { tiles.length = 0; entries.length = 0; exits.length = 0; } else walk((back / 6) | 0, back % 6);
      const m = tiles.length;
      const T = new Int32Array(m + ft.length);
      const E = new Uint8Array(m + ft.length);
      const X = new Uint8Array(m + ft.length);
      for (let k = 0; k < m; k++) { T[k] = tiles[m - 1 - k]; E[k] = exits[m - 1 - k]; X[k] = entries[m - 1 - k]; }
      T.set(ft, m); E.set(fe, m); X.set(fx, m);
      out.push({ kind: 'open', tiles: T, entries: E, exits: X });
    }
  }
  return out;
}
