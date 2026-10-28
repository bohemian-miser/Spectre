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
 * above every level the walk has read are never told apart. Above
 * `maxLevel` a stack is not extended to cross: a crossing that leaves its
 * root goes over a seam (`core/seam.ts`) into each live supertile that can
 * sit across, one world each, and the walk goes on on the far side. The seam
 * moves up a level only when the walk reads above it, keeping the pairs that
 * still fit; a world whose two sides meet in a common ancestor is an ordinary
 * stack again.
 */
import {
  HEX_TYPES, across, childType, climbOut, comeDown, growPair, meetingOf, neighbour, pairAlive, pairKey,
  type Address, type HexType, type Link, type Pair,
} from '../../core';
import type { Pattern } from './walk';
import { pairingTable } from './walk';

export interface World {
  /** The start tile's ancestors, bottom up. */
  readonly chain: readonly Link[];
  /** The current tile: in the same root, or with `far`, in the supertile across the seam. */
  readonly at: Address;
  readonly entry: number;
  /** The root's edge glued to the far supertile's, when the stack is two supertiles across a seam. */
  readonly seam?: Pair;
  readonly far?: boolean;
}

export interface Outcome {
  /** `Psi 5`, `closes`, or `open` (leaving a level-`maxLevel` stack, when the walker crosses no seams). */
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
  /** Stacks are extended to cross up to this level; above it, crossings go over a seam. */
  readonly maxLevel: number;
  /** Whether crossings go over seams above `maxLevel`; without, a strand leaving a level-`maxLevel` stack is `open`. */
  readonly seams: boolean;
  readonly table: Map<HexType, Map<number, number>>;
}

export const makeWalker = (pattern: Pattern, start: HexType, startEdge: number, maxLevel: number, seams = true): Walker => ({
  start, startEdge, maxLevel, seams, table: pairingTable(pattern),
});

/** The world's tile one level up, on its side of the seam: the near side takes the link, the far side its own. */
const raise = (a: Address, link: Link): Address => ({ leaf: a.leaf, path: [...a.path, link] });

/**
 * Stacks whose strand, at a step, leaves its supertile along a second wall
 * that goes on for ever: while the seam moves up for that one crossing, the
 * seam's pair, the side the strand is on and the edge it leaves by come back
 * to what they were a level or more below. Whether the crossing climbs on
 * depends on nothing else, so that stack can repeat those levels for ever:
 * two walls meet there. They are not followed further.
 * In each, the tiles across the second wall are found from the side the
 * strand is on, as at the first seam: `tiles` counts the stacks where that is
 * one tile, per tile; `unforced` the stacks where it is more than one.
 */
export interface Corner {
  readonly step: number;
  readonly stacks: number;
  readonly tiles: readonly { readonly tile: string; readonly stacks: number }[];
  readonly unforced: number;
}

/** Every world after one step, grouped by what is seen; and the stacks that stop at a corner of two walls. */
export function stepAll(wk: Walker, worlds: readonly World[]): { outcomes: Outcome[]; corner: Omit<Corner, 'step'> } {
  const corner = { stacks: 0, tiles: new Map<string, number>(), unforced: 0 };
  const groups = new Map<string, { type: HexType | null; edge: number | null; worlds: World[] }>();
  const add = (key: string, type: HexType | null, edge: number | null, w: World): void => {
    (groups.get(key) ?? groups.set(key, { type, edge, worlds: [] }).get(key)!).worlds.push(w);
  };
  const isHome = (w: World): boolean => !w.far && sameAddress(w.at, { leaf: wk.start, path: w.chain }) && w.entry === wk.startEdge;
  const land = (w: World): void => (isHome(w) ? add('closes', null, null, w) : add(`${w.at.leaf} ${w.entry}`, w.at.leaf, w.entry, w));
  // `climbing`: on this crossing, the states the seam has been moved up through
  const go = (w: World, climbing: ReadonlySet<string> = new Set()): void => {
    const exit = wk.table.get(w.at.leaf)?.get(w.entry);
    if (exit === undefined) return;
    const nb = neighbour(w.at, exit);
    if (nb.ok) { land({ ...w, at: nb.address, entry: nb.edge }); return; }
    if (w.seam) {
      const climb = climbOut(w.at, exit)!;
      if (climb.edge === (w.far ? w.seam.jj : w.seam.j)) {
        // back over the seam
        const down = w.far ? comeDown(w.seam.near, w.seam.j, climb) : comeDown(w.seam.far, w.seam.jj, climb);
        if (down) land({ ...w, at: down.address, entry: down.edge, far: !w.far });
        return;
      }
      const state = `${pairKey(w.seam)} ${w.far ? 'far' : 'near'} ${climb.edge}`;
      if (climbing.has(state)) {
        corner.stacks++;
        const tiles = new Set(across(w.at, exit).map((o) => `${o.address.leaf} ${o.edge}`));
        if (tiles.size === 1) for (const t of tiles) corner.tiles.set(t, (corner.tiles.get(t) ?? 0) + 1);
        else corner.unforced++;
        return;
      }
      // the walk reads above the seam: move it up a level, keeping the pairs that fit
      const seen = new Set(climbing).add(state);
      for (const link of parentsOf(topOf(w, wk.start))) {
        for (const g of growPair(w.seam, link)) {
          const chain = [...w.chain, link];
          if (g.kind === 'meet') go({ chain, at: raise(w.at, w.far ? { slot: g.farSlot, parent: link.parent } : link), entry: w.entry }, seen);
          else if (pairAlive(g.pair)) go({ chain, at: raise(w.at, w.far ? g.farLink : link), entry: w.entry, seam: g.pair, far: w.far }, seen);
        }
      }
      return;
    }
    if (w.chain.length >= wk.maxLevel) {
      // with no room above maxLevel, the strand is cut off as open
      if (!wk.seams) { add('open', null, null, w); return; }
      for (const o of across(w.at, exit)) land({ chain: w.chain, at: o.address, entry: o.edge, seam: o.pair, far: true });
      return;
    }
    for (const link of parentsOf(topOf(w, wk.start))) go({ chain: [...w.chain, link], at: raise(w.at, link), entry: w.entry });
  };
  for (const w of worlds) go(w);
  const outcomes = [...groups.entries()]
    .map(([key, g]) => ({ key, ...g }))
    .sort((a, b) => b.worlds.length - a.worlds.length);
  const tiles = [...corner.tiles].map(([tile, stacks]) => ({ tile, stacks })).sort((a, b) => b.stacks - a.stacks);
  return { outcomes, corner: { stacks: corner.stacks, tiles, unforced: corner.unforced } };
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
  /** The steps where some stacks stopped at a corner of two walls. */
  readonly corners: readonly Corner[];
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
  /** The stacks at the fork this node was chosen at, after its step, for every landing offered. */
  readonly before?: readonly World[];
  /** Where the walk from here ended with no choice to make, once `explore` has walked it. */
  readonly end?: Stage;
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
  /** How far `explore` has got: the next node to walk, and whether nothing is left within its limits. */
  readonly explored?: { readonly next: number; readonly done: boolean };
}

function apply(stage: Stage, wk: Walker, o: Outcome): Stage {
  const w = stage.worlds[0];
  const exit = wk.table.get(w.at.leaf)!.get(w.entry)!;
  const seen = [...stage.seen, { type: w.at.leaf, entry: w.entry, exit }];
  const status: Status = o.key === 'closes' ? 'closed' : o.key === 'open' ? 'open' : 'walking';
  return { worlds: o.worlds, seen, status, pending: [], corners: stage.corners };
}

/** One step: taken if every world agrees, otherwise the stage stops at a choice. */
export function advance(wk: Walker, stage: Stage): Stage {
  if (stage.status !== 'walking') return stage;
  const { outcomes: out, corner } = stepAll(wk, stage.worlds);
  const here = corner.stacks ? { ...stage, corners: [...stage.corners, { step: stage.seen.length + 1, ...corner }] } : stage;
  if (out.length === 0) return { ...here, status: corner.stacks ? 'open' : 'stuck' };
  if (out.length === 1) return apply(here, wk, out[0]);
  return { ...here, status: 'choice', pending: out };
}

export function startWalk(wk: Walker, worlds?: readonly World[]): PossibleWalk {
  const stage: Stage = { worlds: worlds ?? initialWorlds(wk), seen: [], status: 'walking', pending: [], corners: [] };
  return { walker: wk, nodes: [{ id: 0, parent: null, key: null, children: [], stage, fork: null }], current: 0, stage };
}

export type PossibleAction =
  | { type: 'step' }
  | { type: 'run'; cap: number }
  | { type: 'choose'; key: string }
  | { type: 'goto'; id: number }
  /** Go back to a node, walk on to its fork, and choose there. */
  | { type: 'chooseAt'; id: number; key: string }
  /** Take every landing for about `budgetMs` (see `explore`); `restart` walks the nodes again from the first. */
  | { type: 'explore'; limits: Limits; budgetMs: number; restart?: boolean };

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
      return { ...pw, nodes: [...nodes, { id, parent: pw.current, key: o.key, children: [], stage, fork: null, before: pw.stage.pending.flatMap((x) => x.worlds) }], current: id, stage };
    }
    case 'chooseAt': {
      const back = reducePossible(reducePossible(pw, { type: 'goto', id: action.id }), { type: 'run', cap: 100000 });
      return reducePossible(back, { type: 'choose', key: action.key });
    }
    case 'goto': {
      const n = pw.nodes[action.id];
      return n ? { ...pw, current: n.id, stage: n.end ?? n.stage } : pw;
    }
    case 'explore': {
      const r = explore(pw, action.limits, action.restart ? 0 : pw.explored?.next ?? 0, action.budgetMs);
      return { ...r.pw, explored: { next: r.next, done: r.done } };
    }
  }
}

/** The tiles a world's strand visits (its addresses, in its own root) and the level each crossing settled at. */
export function replay(wk: Walker, world: World, steps: number): { at: Address[]; levels: number[] } {
  let at: Address = { leaf: wk.start, path: [...concreteChain(world)] };
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

/** The world's stack, with a seam closed by the fewest parents that bring its two sides into a common ancestor. */
export function concreteChain(w: World): readonly Link[] {
  if (!w.seam) return w.chain;
  const m = meetingOf(w.seam);
  return m ? [...w.chain, ...m.links] : w.chain;
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
 * then goes to `current`. A choice no longer on offer is dropped with the
 * choices made below it, and the ids after it close up.
 */
export function replayChoices(pw: PossibleWalk, choices: readonly { parent: number; key: string }[], current: number): PossibleWalk {
  let w = pw;
  // old node id -> new node id, for the nodes made again
  const ids = new Map<number, number>([[0, 0]]);
  choices.forEach((c, i) => {
    const parent = ids.get(c.parent);
    if (parent === undefined) return;
    const next = reducePossible(w, { type: 'chooseAt', id: parent, key: c.key });
    const made = next.nodes[next.current];
    if (made.parent !== parent || made.key !== c.key) return;
    w = next;
    ids.set(i + 1, made.id);
  });
  // the current node, or its nearest ancestor made again
  let at: number | undefined = current;
  while (at !== undefined && at > 0 && !ids.has(at)) at = at <= choices.length ? choices[at - 1].parent : undefined;
  const here = ids.get(at ?? 0) ?? 0;
  return reducePossible(reducePossible(w, { type: 'goto', id: here }), { type: 'run', cap: 100000 });
}

/** How far `explore` goes: forks opened in all, and tiles along any one branch. */
export interface Limits { readonly forks: number; readonly tiles: number }

/**
 * Takes every landing at every fork, in the order the nodes were made (so
 * the forks reached first open first), until `limits.forks` forks are open.
 * A branch ends at a circuit, where every stack stops at a corner, or after
 * `limits.tiles` tiles; its end is kept on its node. Works for about
 * `budgetMs` and stops; `next` is the first node not yet walked, and `done`
 * whether nothing is left within the limits. The current node is kept.
 */
export function explore(pw: PossibleWalk, limits: Limits, from = 0, budgetMs = Infinity): { pw: PossibleWalk; next: number; done: boolean } {
  const wk = pw.walker;
  const t0 = Date.now();
  let nodes = [...pw.nodes];
  let forks = nodes.filter((n) => n.fork).length;
  let id = from;
  for (; id < nodes.length; id++) {
    if (Date.now() - t0 > budgetMs) break;
    const node = nodes[id];
    if (node.end) continue;
    if (node.fork && node.fork.options.every((o) => node.children.some((c) => nodes[c].key === o.key))) continue;
    // walk on from the node to its fork, or to where the branch ends
    let st = node.id === pw.current ? pw.stage : node.stage;
    while (st.status === 'walking' && st.seen.length < limits.tiles) st = advance(wk, st);
    if (st.status !== 'choice') { nodes[id] = { ...node, end: st }; continue; }
    const fork = node.fork ?? forkOf(wk, st);
    if (!node.fork) {
      if (forks >= limits.forks) continue;
      forks++;
    }
    nodes[id] = { ...nodes[id], fork };
    for (const o of st.pending) {
      if (nodes[id].children.some((c) => nodes[c].key === o.key)) continue;
      const child = nodes.length;
      nodes = [...nodes, { id: child, parent: id, key: o.key, children: [], stage: apply(st, wk, o), fork: null, before: st.pending.flatMap((x) => x.worlds) }];
      nodes[id] = { ...nodes[id], children: [...nodes[id].children, child] };
    }
  }
  const done = id >= nodes.length;
  return { pw: { ...pw, nodes }, next: id, done };
}

/** Where the walk from a node stops: at its fork, where its branch ends, or after `cap` steps. */
export function stageAhead(pw: PossibleWalk, id: number, cap: number): Stage {
  const node = pw.nodes[id];
  let st = node.end ?? (id === pw.current ? pw.stage : node.stage);
  for (let i = 0; i < cap && st.status === 'walking'; i++) st = advance(pw.walker, st);
  return st;
}

/** Where the walk stops after taking landing `key` at a node's fork, without adding it to the tree. */
export function stageAfter(pw: PossibleWalk, id: number, key: string, cap: number): Stage {
  const st = stageAhead(pw, id, cap);
  const o = st.status === 'choice' ? st.pending.find((x) => x.key === key) : undefined;
  if (!o) return st;
  let next = apply(st, pw.walker, o);
  for (let i = 0; i < cap && next.status === 'walking'; i++) next = advance(pw.walker, next);
  return next;
}

/**
 * Walks a known circuit again from its first tile: runs, and at each fork
 * takes the landing the circuit goes to next (`closes` when it is back at
 * the start). Stops at a fork whose landings do not include it.
 */
export function followWord(pw: PossibleWalk, word: readonly Seen[], cap: number): PossibleWalk {
  let w = reducePossible(pw, { type: 'run', cap });
  while (w.stage.status === 'choice') {
    const n = w.stage.seen.length;
    const key = n + 1 >= word.length ? 'closes' : `${word[n + 1].type} ${word[n + 1].entry}`;
    if (!w.stage.pending.some((o) => o.key === key)) break;
    w = reducePossible(reducePossible(w, { type: 'choose', key }), { type: 'run', cap });
  }
  return w;
}

/** A circuit's tiles read from tile `k` on, or with `back`, from tile `k` the other way round. */
export function rotateWord(word: readonly Seen[], k: number, back = false): Seen[] {
  const N = word.length;
  const at = (i: number): Seen => word[((i % N) + N) % N];
  return Array.from({ length: N }, (_, i) => {
    if (!back) return at(k + i);
    const s = at(k - i);
    return { type: s.type, entry: s.exit, exit: s.entry };
  });
}

/** The circuits ahead of a stage, as far as a search went. */
export interface Ahead {
  /** Fewest and most tiles, counted from the stage, of the circuits found. */
  readonly min: number | null;
  readonly max: number | null;
  /** Some branch was still walking when the search stopped: longer circuits may lie beyond. */
  readonly open: boolean;
  /** The landings to take for the shortest circuit found. */
  readonly path: readonly string[] | null;
}

/**
 * The circuits ahead of a stage: its branches walked shortest first (by
 * tiles), taking each landing at each fork, to at most `choices` choices,
 * `forks` forks opened and `tiles` tiles in all. With `first`, stops at the
 * shortest circuit.
 */
export function circuitsAhead(wk: Walker, from: Stage, limits: { choices: number; forks: number; tiles: number }, first = false): Ahead {
  const base = from.seen.length;
  const run = (st: Stage): Stage => {
    let s = st;
    while (s.status === 'walking' && s.seen.length - base < limits.tiles) s = advance(wk, s);
    return s;
  };
  // a queue kept in order of tiles walked
  const queue: { st: Stage; keys: string[] }[] = [{ st: run(from), keys: [] }];
  let min: number | null = null, max: number | null = null, path: string[] | null = null, open = false, forks = 0;
  while (queue.length) {
    let at = 0;
    for (let i = 1; i < queue.length; i++) if (queue[i].st.seen.length < queue[at].st.seen.length) at = i;
    const { st, keys } = queue.splice(at, 1)[0];
    if (st.status === 'closed') {
      const n = st.seen.length - base;
      if (min === null) { min = n; path = keys; if (first) break; }
      max = Math.max(max ?? n, n);
      continue;
    }
    if (st.status === 'walking') { open = true; continue; }
    if (st.status !== 'choice') continue;
    if (keys.length >= limits.choices || forks >= limits.forks) { open = true; continue; }
    forks++;
    for (const o of st.pending) queue.push({ st: run(apply(st, wk, o)), keys: [...keys, o.key] });
  }
  if (queue.length) open = true;
  return { min, max, open, path };
}

