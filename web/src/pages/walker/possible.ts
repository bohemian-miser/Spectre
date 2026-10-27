/**
 * A strand walked on every tiling at once.
 *
 * The start tile's ancestors are not chosen up front. The walk carries the set
 * of ancestor stacks still possible (each one a `World`: the stack, and where
 * the strand is in it). A step moves every world; a world whose crossing
 * leaves its stack is split into one world per parent its top can have, and
 * the step is retried in each. Worlds are then grouped by what is seen: the
 * tile type landed on and the edge it is entered through, or that the strand
 * is back where it started. One group: the step is taken. Several: the walk
 * stops at a choice, and choosing a group keeps only its worlds.
 *
 * Stacks are extended only when a step needs it, so two stacks that differ
 * above every level the walk has read are never told apart.
 */
import { HEX_TYPES, childType, neighbour, type Address, type HexType, type Link } from '../../core';
import type { Pattern } from './walk';
import { pairingTable } from './walk';

export interface World {
  /** The start tile's ancestors, bottom up. */
  readonly chain: readonly Link[];
  /** The current tile, in the same root. */
  readonly at: Address;
  readonly entry: number;
}

export interface Outcome {
  /** `Psi 5`, `closes`, or `open` (still leaving at the level cap). */
  readonly key: string;
  readonly type: HexType | null;
  readonly edge: number | null;
  readonly worlds: readonly World[];
}

const parentsOf = (t: HexType): Link[] => {
  const out: Link[] = [];
  for (const P of HEX_TYPES) for (let s = 0; s < 8; s++) if (childType(P, s) === t) out.push({ slot: s, parent: P });
  return out;
};

const topOf = (w: World, start: HexType): HexType => (w.chain.length ? w.chain[w.chain.length - 1].parent : start);

const sameAddress = (a: Address, b: Address): boolean =>
  a.leaf === b.leaf && a.path.length === b.path.length && a.path.every((l, i) => l.slot === b.path[i].slot && l.parent === b.path[i].parent);

export interface Walker {
  readonly start: HexType;
  readonly startEdge: number;
  readonly maxLevel: number;
  readonly table: Map<HexType, Map<number, number>>;
}

export const makeWalker = (pattern: Pattern, start: HexType, startEdge: number, maxLevel: number): Walker => ({
  start, startEdge, maxLevel, table: pairingTable(pattern),
});

/** Every world after one step, grouped by what is seen. */
export function stepAll(wk: Walker, worlds: readonly World[]): Outcome[] {
  const groups = new Map<string, { type: HexType | null; edge: number | null; worlds: World[] }>();
  const add = (key: string, type: HexType | null, edge: number | null, w: World): void => {
    (groups.get(key) ?? groups.set(key, { type, edge, worlds: [] }).get(key)!).worlds.push(w);
  };
  const go = (w: World): void => {
    const exit = wk.table.get(w.at.leaf)?.get(w.entry);
    if (exit === undefined) return;
    const nb = neighbour(w.at, exit);
    if (nb.ok) {
      const next: World = { chain: w.chain, at: nb.address, entry: nb.edge };
      const home = sameAddress(nb.address, { leaf: wk.start, path: w.chain }) && nb.edge === wk.startEdge;
      if (home) add('closes', null, null, next);
      else add(`${nb.address.leaf} ${nb.edge}`, nb.address.leaf, nb.edge, next);
      return;
    }
    if (w.chain.length >= wk.maxLevel) { add('open', null, null, w); return; }
    for (const link of parentsOf(topOf(w, wk.start))) go({ chain: [...w.chain, link], at: { leaf: w.at.leaf, path: [...w.at.path, link] }, entry: w.entry });
  };
  for (const w of worlds) go(w);
  return [...groups.entries()]
    .map(([key, g]) => ({ key, ...g }))
    .sort((a, b) => b.worlds.length - a.worlds.length);
}

export const initialWorlds = (wk: Walker): World[] => [{ chain: [], at: { leaf: wk.start, path: [] }, entry: wk.startEdge }];

/** One step of the walk, as seen: the tile, the edge in and the edge out. */
export interface Seen { readonly type: HexType; readonly entry: number; readonly exit: number }

export type Status = 'walking' | 'choice' | 'closed' | 'open' | 'stuck';

export interface Stage {
  readonly worlds: readonly World[];
  readonly seen: readonly Seen[];
  readonly status: Status;
  /** The outcomes to choose between, when `status` is 'choice'. */
  readonly pending: readonly Outcome[];
}

/** One landing offered at a fork, with the bundle of stacks behind it. */
export interface ForkOption {
  readonly key: string;
  readonly type: HexType | null;
  readonly edge: number | null;
  readonly stacks: number;
  /** The level that tells the options apart (1 = parent), and this option's ancestor types there. */
  readonly level: number | null;
  readonly deciders: readonly HexType[];
  /** Per decider, how many of its slots at that level lead here. */
  readonly slotsPer: readonly number[];
  /** The ancestor positions at that level that lead here: type and slot, as `Delta1`. */
  readonly cells: readonly string[];
}

/** Where the walk from a node next stopped: the step, the tile and edge it left by, and every landing offered. */
export interface Fork {
  readonly step: number;
  readonly from: { readonly type: HexType; readonly exit: number };
  readonly options: readonly ForkOption[];
}

/** A choice made: the stage after it. Node 0 is the start. */
export interface ChoiceNode {
  readonly id: number;
  readonly parent: number | null;
  /** The outcome chosen to get here. */
  readonly key: string | null;
  readonly children: readonly number[];
  readonly stage: Stage;
  /** The next choice reached from here, once it has been. */
  readonly fork: Fork | null;
}

/**
 * The options at a choice, each with the ancestor types that decide it: at
 * the lowest level where the options' sets of types differ.
 */
export function forkOf(wk: Walker, stage: Stage): Fork {
  const w = stage.worlds[0];
  const sets = stage.pending.map((o) => typesByLevel(o.worlds).map((m) => new Set(m.keys())));
  const depth = Math.max(0, ...sets.map((x) => x.length));
  let level: number | null = null;
  for (let k = 0; k < depth && level === null; k++) {
    const keys = sets.map((x) => [...(x[k] ?? [])].sort().join(','));
    if (new Set(keys).size > 1) level = k;
  }
  return {
    step: stage.seen.length + 1,
    from: { type: w.at.leaf, exit: wk.table.get(w.at.leaf)!.get(w.entry)! },
    options: stage.pending.map((o, i) => ({
      key: o.key,
      type: o.type,
      edge: o.edge,
      stacks: o.worlds.length,
      level: level === null ? null : level + 1,
      deciders: level === null ? [] : HEX_TYPES.filter((t) => sets[i][level!]?.has(t)),
      slotsPer: level === null ? [] : HEX_TYPES.filter((t) => sets[i][level!]?.has(t)).map((t) => {
        const slots = new Set<number>();
        for (const w of stage.pending[i].worlds) {
          const l = w.chain[level!];
          if (l && l.parent === t) slots.add(l.slot);
        }
        return slots.size;
      }),
      cells: level === null ? [] : [...new Set(stage.pending[i].worlds.flatMap((w) => (w.chain[level!] ? [`${w.chain[level!].parent}${w.chain[level!].slot}`] : [])))],
    })),
  };
}

export interface PossibleWalk {
  readonly walker: Walker;
  readonly nodes: readonly ChoiceNode[];
  readonly current: number;
  /** The stage being walked (the current node's, plus any forced steps since). */
  readonly stage: Stage;
}

function apply(stage: Stage, wk: Walker, o: Outcome): Stage {
  const w = stage.worlds[0];
  const exit = wk.table.get(w.at.leaf)!.get(w.entry)!;
  const seen = [...stage.seen, { type: w.at.leaf, entry: w.entry, exit }];
  const status: Status = o.key === 'closes' ? 'closed' : o.key === 'open' ? 'open' : 'walking';
  return { worlds: o.worlds, seen, status, pending: [] };
}

/** One step: taken if every world agrees, otherwise the stage stops at a choice. */
export function advance(wk: Walker, stage: Stage): Stage {
  if (stage.status !== 'walking') return stage;
  const out = stepAll(wk, stage.worlds);
  if (out.length === 0) return { ...stage, status: 'stuck' };
  if (out.length === 1) return apply(stage, wk, out[0]);
  return { ...stage, status: 'choice', pending: out };
}

export function startWalk(wk: Walker, worlds?: readonly World[]): PossibleWalk {
  const stage: Stage = { worlds: worlds ?? initialWorlds(wk), seen: [], status: 'walking', pending: [] };
  return { walker: wk, nodes: [{ id: 0, parent: null, key: null, children: [], stage, fork: null }], current: 0, stage };
}

export type PossibleAction =
  | { type: 'step' }
  | { type: 'run'; cap: number }
  | { type: 'choose'; key: string }
  | { type: 'goto'; id: number }
  /** Go back to a node, walk on to its fork, and choose there. */
  | { type: 'chooseAt'; id: number; key: string };

export function reducePossible(pw: PossibleWalk, action: PossibleAction): PossibleWalk {
  const wk = pw.walker;
  switch (action.type) {
    case 'step':
      return { ...pw, stage: advance(wk, pw.stage) };
    case 'run': {
      let s = pw.stage;
      for (let i = 0; i < action.cap && s.status === 'walking'; i++) s = advance(wk, s);
      return { ...pw, stage: s };
    }
    case 'choose': {
      const o = pw.stage.pending.find((x) => x.key === action.key);
      if (pw.stage.status !== 'choice' || !o) return pw;
      const here = pw.nodes[pw.current];
      const again = here.children.find((c) => pw.nodes[c].key === o.key);
      if (again !== undefined) return { ...pw, current: again, stage: pw.nodes[again].stage };
      const stage = apply(pw.stage, wk, o);
      const id = pw.nodes.length;
      const fork = here.fork ?? forkOf(wk, pw.stage);
      const nodes = pw.nodes.map((n) => (n.id === pw.current ? { ...n, fork, children: [...n.children, id] } : n));
      return { ...pw, nodes: [...nodes, { id, parent: pw.current, key: o.key, children: [], stage, fork: null }], current: id, stage };
    }
    case 'chooseAt': {
      const back = reducePossible(reducePossible(pw, { type: 'goto', id: action.id }), { type: 'run', cap: 100000 });
      return reducePossible(back, { type: 'choose', key: action.key });
    }
    case 'goto': {
      const n = pw.nodes[action.id];
      return n ? { ...pw, current: n.id, stage: n.stage } : pw;
    }
  }
}

/** The tiles a world's strand visits (its addresses, in its own root) and the level each crossing settled at. */
export function replay(wk: Walker, world: World, steps: number): { at: Address[]; levels: number[] } {
  let at: Address = { leaf: wk.start, path: [...world.chain] };
  let entry = wk.startEdge;
  const out: Address[] = [at];
  const levels: number[] = [];
  for (let i = 0; i < steps; i++) {
    const exit = wk.table.get(at.leaf)!.get(entry)!;
    const nb = neighbour(at, exit);
    if (!nb.ok) break;
    at = nb.address;
    entry = nb.edge;
    out.push(at);
    levels.push(nb.level);
  }
  return { at: out, levels };
}

/** Per level above the start tile, the ancestor types still possible across the worlds. */
export function typesByLevel(worlds: readonly World[]): Map<HexType, number>[] {
  const depth = Math.max(0, ...worlds.map((w) => w.chain.length));
  return Array.from({ length: depth }, (_, k) => {
    const m = new Map<HexType, number>();
    for (const w of worlds) if (w.chain[k]) m.set(w.chain[k].parent, (m.get(w.chain[k].parent) ?? 0) + 1);
    return m;
  });
}

/** The choices made, in the order they were made: each node's parent and the landing taken. */
export const choicesOf = (pw: PossibleWalk): { parent: number; key: string }[] =>
  pw.nodes.slice(1).map((n) => ({ parent: n.parent!, key: n.key! }));

/**
 * Makes the same choices again, in order, so the nodes get the same ids;
 * then goes to `current`. A choice that is no longer on offer stops the replay.
 */
export function replayChoices(pw: PossibleWalk, choices: readonly { parent: number; key: string }[], current: number): PossibleWalk {
  let w = pw;
  for (const c of choices) {
    if (!w.nodes[c.parent]) break;
    const next = reducePossible(w, { type: 'chooseAt', id: c.parent, key: c.key });
    if (next.nodes.length === w.nodes.length) break;
    w = next;
  }
  return reducePossible(w.nodes[current] ? reducePossible(w, { type: 'goto', id: current }) : w, { type: 'run', cap: 100000 });
}
