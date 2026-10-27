/**
 * The state of the neighbour machine board as one value and one reducer, so
 * a crossing, a growth of the world and the retried crossing after it are a
 * single step and can be tested without a page.
 *
 * The world is one root supertile; every tile in it is named by its slot path.
 * Crossing an edge runs `neighbour()` on the slot path. When the crossing
 * leaves the root, the board waits for a parent: growing gives the root a
 * parent type and a slot, every slot path gains that slot in front, and the
 * waiting crossing is run again in the bigger world.
 */
import { HEX_TYPES, addressFromId, childType, idOf, neighbour, type Address, type HexType, type Neighbour } from '../../core';

export const MAX_LEVEL = 6;

export interface World {
  /** the root supertile: type and level */
  readonly root: HexType;
  readonly level: number;
  /** slot path of the first tile, the one the view is anchored on */
  readonly startId: string;
}

export interface Lookup { readonly from: string; readonly edge: number; readonly result: Neighbour }

export interface Board {
  readonly world: World;
  readonly revealed: ReadonlySet<string>;
  readonly selected: string;
  /** the edge the selected tile was entered through, if a crossing reached it */
  readonly entry: number | null;
  readonly lookup: Lookup | null;
  /** a crossing that left the root and is waiting for a parent */
  readonly pending: { readonly from: string; readonly edge: number } | null;
  readonly trail: readonly string[];
  /** which parent option is previewed while a crossing waits */
  readonly previewIdx: number;
}

export type Action =
  | { type: 'reset'; start: HexType }
  | { type: 'cross'; edge: number; from?: string }
  | { type: 'grow'; parent: HexType; slot: number }
  | { type: 'select'; id: string }
  | { type: 'entry'; edge: number | null }
  | { type: 'preview'; idx: number }
  | { type: 'previewStep'; delta: number }
  | { type: 'clearTrail' };

export const prefixId = (slot: number, id: string): string => (id === '' ? String(slot) : `${slot}.${id}`);

export function initialBoard(start: HexType): Board {
  return { world: { root: start, level: 0, startId: '' }, revealed: new Set(['']), selected: '', entry: null, lookup: null, pending: null, trail: [], previewIdx: 0 };
}

export function addressIn(world: World, id: string): Address | null {
  try {
    const a = addressFromId(world.root, id);
    return a.path.length === world.level ? a : null;
  } catch {
    return null;
  }
}

export interface ParentOption {
  readonly parent: HexType;
  readonly slot: number;
  /** where the waiting crossing lands with this parent, as a slot path in the grown world; null if it still leaves the root */
  readonly landing: string | null;
  readonly landingType: HexType | null;
  /**
   * How many parents the crossing needs, this one included, along the
   * quickest chain that starts with it: 1 if it lands now. null if no chain
   * within the level cap lands it.
   */
  readonly needs: number | null;
  /** with this parent the root sits in its own type, and the edge is still outside */
  readonly repeats: boolean;
}

/** The (parent, slot) pairs that can hold a supertile of this type. */
export function parentsOf(type: HexType): { parent: HexType; slot: number }[] {
  const out: { parent: HexType; slot: number }[] = [];
  for (const P of HEX_TYPES) for (let s = 0; s < 8; s++) if (childType(P, s) === type) out.push({ parent: P, slot: s });
  return out;
}

/** Fewest further parents (0 = lands already) for a crossing of `edge` from `from`, searching up to `depth` levels. */
function parentsNeeded(from: Address, edge: number, depth: number): number | null {
  const nb = neighbour(from, edge);
  if (nb.ok) return 0;
  if (depth <= 0) return null;
  const top = from.path.length ? from.path[from.path.length - 1].parent : from.leaf;
  let best: number | null = null;
  for (const o of parentsOf(top)) {
    const n = parentsNeeded({ leaf: from.leaf, path: [...from.path, o] }, edge, depth - 1);
    if (n !== null && (best === null || n + 1 < best)) best = n + 1;
    if (best === 1) break;
  }
  return best;
}

/**
 * The parents the root can have, ordered by how many parents the waiting
 * crossing needs along the quickest chain that starts with each one, so that
 * taking the first option every time lands the crossing as soon as possible.
 * Everything is computed on the slot path alone.
 */
export function parentOptions(board: Board): ParentOption[] {
  const { world, pending } = board;
  const from = pending ? addressIn(world, pending.from) : null;
  const room = Math.max(0, MAX_LEVEL - world.level - 1);
  const canGrow = world.level < MAX_LEVEL;
  const out: ParentOption[] = parentsOf(world.root).map(({ parent, slot }) => {
    if (!from || !pending || !canGrow) return { parent, slot, landing: null, landingType: null, needs: null, repeats: parent === world.root };
    const grown: Address = { leaf: from.leaf, path: [...from.path, { slot, parent }] };
    const nb = neighbour(grown, pending.edge);
    if (nb.ok) return { parent, slot, landing: idOf(nb.address), landingType: nb.address.leaf, needs: 1, repeats: false };
    const more = parentsNeeded(grown, pending.edge, Math.min(room, 3));
    return { parent, slot, landing: null, landingType: null, needs: more === null ? null : more + 1, repeats: parent === world.root };
  });
  const rank = (o: ParentOption): number => (o.needs === null ? 99 : o.needs) * 2 + (o.repeats ? 1 : 0);
  return out.map((o, i) => ({ o, i })).sort((a, b) => rank(a.o) - rank(b.o) || a.i - b.i).map((x) => x.o);
}

function crossIn(board: Board, edge: number, fromId: string): Board {
  const from = addressIn(board.world, fromId);
  if (!from || edge < 0 || edge > 5 || !Number.isInteger(edge)) return board;
  const result = neighbour(from, edge);
  const lookup: Lookup = { from: fromId, edge, result };
  if (!result.ok) return { ...board, lookup, pending: { from: fromId, edge }, previewIdx: 0 };
  const id = idOf(result.address);
  const revealed = new Set(board.revealed);
  revealed.add(id);
  return { ...board, lookup, revealed, trail: [...board.trail, fromId], selected: id, entry: result.edge, pending: null, previewIdx: 0 };
}

export function reduce(board: Board, action: Action): Board {
  switch (action.type) {
    case 'reset':
      return initialBoard(action.start);
    case 'cross':
      return crossIn(board, action.edge, action.from ?? board.selected);
    case 'grow': {
      const { world, pending } = board;
      if (!pending || world.level >= MAX_LEVEL || childType(action.parent, action.slot) !== world.root) return board;
      const grown: Board = {
        ...board,
        world: { root: action.parent, level: world.level + 1, startId: prefixId(action.slot, world.startId) },
        revealed: new Set([...board.revealed].map((id) => prefixId(action.slot, id))),
        trail: board.trail.map((id) => prefixId(action.slot, id)),
        selected: prefixId(action.slot, board.selected),
        lookup: null,
        pending: null,
        previewIdx: 0,
      };
      return crossIn(grown, pending.edge, prefixId(action.slot, pending.from));
    }
    case 'select':
      return board.revealed.has(action.id) ? { ...board, selected: action.id, entry: null } : board;
    case 'entry':
      return { ...board, entry: action.edge };
    case 'preview': {
      const n = parentOptions(board).length;
      return n ? { ...board, previewIdx: ((action.idx % n) + n) % n } : board;
    }
    case 'previewStep': {
      const n = parentOptions(board).length;
      return n ? { ...board, previewIdx: (((board.previewIdx + action.delta) % n) + n) % n } : board;
    }
    case 'clearTrail':
      return { ...board, trail: [] };
  }
}
