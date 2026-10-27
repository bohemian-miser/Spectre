/**
 * The circuit walker's state: the neighbour machine board (`transducer/world.ts`)
 * with a strand on it. A step reads the tile's type and the edge the strand
 * came in by, leaves through the partner edge under the combination, and
 * crosses it with `neighbour()`. When the crossing needs an ancestor the
 * world does not have, the walk waits for one to be chosen. The walk is a
 * circuit when it is back on its start tile, entering by its start edge.
 */
import {
  chordPairing, comboToMatchingIndices, flatten, buildSystem, leafOrder, slotsOfType, walkStrand, addressFromId,
  type HexType, type MetaNode, type TileTypeId,
} from '../../core';
import { initialBoard, reduce, type Board, type World } from '../transducer/world';

export interface Pattern {
  readonly subset: readonly number[];
  /** Matching index per type, in `leafOrder('hex')` order (as the Explorer's state holds it). */
  readonly matching: readonly number[];
}

/** The pattern of a combination string. */
export const patternOf = (subset: readonly number[], combo: string): Pattern => ({ subset, matching: comboToMatchingIndices('hex', subset, combo) });

/** Matching index per type, by name. */
export const matchingByType = (pattern: Pattern): Map<HexType, number> =>
  new Map(leafOrder('hex').map((t, i) => [t as HexType, pattern.matching[i] ?? 0]));

/** One strand step: the tile's type, the edges in and out, and the level where the crossing settled. */
export interface StepRecord { readonly type: HexType; readonly entry: number; readonly exit: number; readonly height: number }

export interface Walk {
  readonly board: Board;
  /** The edge the strand first entered the start tile by. */
  readonly startEdge: number | null;
  readonly steps: readonly StepRecord[];
  /** A step whose crossing waits for an ancestor. */
  readonly waiting: Omit<StepRecord, 'height'> | null;
  readonly closed: boolean;
}

export type WalkAction =
  | { type: 'reset'; start: HexType }
  | { type: 'startEdge'; edge: number }
  | { type: 'step'; pattern: Pattern }
  | { type: 'run'; pattern: Pattern; cap: number }
  | { type: 'grow'; parent: HexType; slot: number }
  | { type: 'preview'; idx: number }
  | { type: 'previewStep'; delta: number }
  | { type: 'place'; world: World; edge: number };

export function initialWalk(start: HexType): Walk {
  return { board: initialBoard(start), startEdge: null, steps: [], waiting: null, closed: false };
}

/** Per type, the partner of each edge carrying a crossing (edge -> edge). */
export function pairingTable(pattern: Pattern): Map<HexType, Map<number, number>> {
  const out = new Map<HexType, Map<number, number>>();
  leafOrder('hex').forEach((t, ti) => {
    const seams = slotsOfType('hex', t, pattern.subset);
    const pairing = chordPairing('hex', t, pattern.subset, pattern.matching[ti] ?? 0);
    const m = new Map<number, number>();
    seams.forEach((s, k) => { if (pairing[k] >= 0) m.set(s.edge, seams[pairing[k]].edge); });
    out.set(t as HexType, m);
  });
  return out;
}

const typeOf = (board: Board, id: string): HexType => addressFromId(board.world.root, id).leaf;

function arrive(walk: Walk, board: Board, rec: Omit<StepRecord, 'height'>): Walk {
  if (board.pending) return { ...walk, board, waiting: rec };
  const height = board.lookup?.result.level ?? 0;
  const closed = board.selected === board.world.startId && board.entry === walk.startEdge;
  return { ...walk, board, waiting: null, steps: [...walk.steps, { ...rec, height }], closed };
}

function step(walk: Walk, table: Map<HexType, Map<number, number>>): Walk {
  const { board } = walk;
  if (walk.closed || walk.waiting || board.entry === null) return walk;
  const type = typeOf(board, board.selected);
  const exit = table.get(type)?.get(board.entry);
  if (exit === undefined) return walk;
  return arrive(walk, reduce(board, { type: 'cross', edge: exit }), { type, entry: board.entry, exit });
}

export function reduceWalk(walk: Walk, action: WalkAction): Walk {
  switch (action.type) {
    case 'reset':
      return initialWalk(action.start);
    case 'startEdge': {
      if (walk.steps.length || walk.waiting) return walk;
      return { ...walk, startEdge: action.edge, board: reduce(walk.board, { type: 'entry', edge: action.edge }) };
    }
    case 'step':
      return step(walk, pairingTable(action.pattern));
    case 'run': {
      const table = pairingTable(action.pattern);
      let w = walk;
      for (let i = 0; i < action.cap; i++) {
        const next = step(w, table);
        if (next === w) break;
        w = next;
        if (w.waiting || w.closed) break;
      }
      return w;
    }
    case 'grow': {
      if (!walk.waiting) return walk;
      return arrive(walk, reduce(walk.board, { type: 'grow', parent: action.parent, slot: action.slot }), walk.waiting);
    }
    case 'preview':
    case 'previewStep':
      return { ...walk, board: reduce(walk.board, action) };
    case 'place': {
      const id = action.world.startId;
      const board: Board = { ...initialBoard(action.world.root), world: action.world, revealed: new Set([id]), selected: id, entry: action.edge };
      return { board, startEdge: action.edge, steps: [], waiting: null, closed: false };
    }
  }
}

export interface FoundCircuit { readonly id: string; readonly edge: number; readonly length: number }

/** The longest circuit of a level-n supertile of `root`, by walking a strand from every crossing. */
export function longestCircuit(pattern: Pattern, root: HexType, level: number): FoundCircuit | null {
  const matching: Record<string, number> = Object.fromEntries(matchingByType(pattern));
  const seen = new Set<string>();
  let best: FoundCircuit | null = null;
  for (const inst of flatten(buildSystem('hex', level)[root] as MetaNode)) {
    for (const seam of slotsOfType('hex', inst.type as TileTypeId, pattern.subset)) {
      if (seen.has(`${inst.id} ${seam.edge}`)) continue;
      const w = walkStrand(pattern.subset, matching, { address: addressFromId(root, inst.id), entry: seam.edge }, 200000);
      for (const s of w.states) seen.add(`${[...s.address.path].reverse().map((l) => l.slot).join('.')} ${s.entry}`);
      if (w.end === 'circuit' && (!best || w.states.length > best.length)) best = { id: inst.id, edge: seam.edge, length: w.states.length };
    }
  }
  return best;
}

