/**
 * The walk on every tiling at once, with each bundle of stacks stored as a
 * merged graph instead of a list.
 *
 * A world of the walk (`src/pages/walker/possible.ts`) is the start tile's
 * ancestor stack `chain` and the current tile `at` in the same root. Read
 * bottom up, level k holds two links: the start tile's ancestor link and the
 * current tile's. A world is the string of those pairs, and a bundle (worlds
 * that have seen the same tiles) is a set of such strings, all sharing the
 * current tile's type and entry edge. The set is kept as a merged graph:
 * nodes read the pair at one level, and nodes whose upper parts are the same
 * are stored once.
 *
 * A step runs `neighbour()` through the graph instead of per world. The climb
 * reads one level at a time, upward, and carries the edge it climbs and the
 * position along it; where the crossing settles, the current tile's links
 * below are rebuilt top down from the climb, and everything above is kept as
 * the same subgraph. A world whose climb reaches its top is extended by every
 * possible parent, as the walk does, up to `maxLevel` (beyond it: `open`).
 * Results that see the same landing are merged, and those whose every pair
 * agrees, landing on the start tile by the start edge, are split off as
 * `closes`. Every world stays in the graph as one path.
 */
import { HEX_TYPES, childType, edgeParts, locateChildEdge, type HexType, type Link } from '../src/core';
import type { World } from '../src/pages/walker/possible';

// ---------------------------------------------------------------------------
// Merged graphs of pairs
// ---------------------------------------------------------------------------

/** A level: the start tile's ancestor link and the current tile's. */
export interface Pair { readonly chain: Link; readonly at: Link }

const pairs: Pair[] = [];
const pairIds = new Map<string, number>();
const pairOf = (chain: Link, at: Link): number => {
  const k = `${chain.parent}:${chain.slot}/${at.parent}:${at.slot}`;
  let id = pairIds.get(k);
  if (id === undefined) { id = pairs.length; pairs.push({ chain, at }); pairIds.set(k, id); }
  return id;
};
const sameLink = (a: Link, b: Link): boolean => a.slot === b.slot && a.parent === b.parent;

interface Node {
  /** A world may end here (its stack has this many levels). */
  readonly final: boolean;
  /** Pair id -> node above, sorted by pair id. */
  readonly out: readonly (readonly [number, number])[];
}

const nodes: Node[] = [];
const nodeIds = new Map<string, number>();

/** The node with these edges, made once. */
function node(final: boolean, out: Iterable<readonly [number, number]>): number {
  const sorted = [...out].sort((a, b) => a[0] - b[0]);
  const k = `${final ? 1 : 0}|${sorted.map(([p, n]) => `${p}>${n}`).join(',')}`;
  let id = nodeIds.get(k);
  if (id === undefined) { id = nodes.length; nodes.push({ final, out: sorted }); nodeIds.set(k, id); }
  return id;
}

/** The empty set, and the set holding only the empty string (a stack that ends here). */
export const EMPTY = node(false, []);
export const END = node(true, []);

const unionMemo = new Map<string, number>();
/** Every path of a or b. */
export function union(a: number, b: number): number {
  if (a === b || b === EMPTY) return a;
  if (a === EMPTY) return b;
  const k = a < b ? `${a},${b}` : `${b},${a}`;
  const hit = unionMemo.get(k);
  if (hit !== undefined) return hit;
  const out = new Map<number, number>(nodes[a].out);
  for (const [p, n] of nodes[b].out) out.set(p, out.has(p) ? union(out.get(p)!, n) : n);
  const id = node(nodes[a].final || nodes[b].final, out);
  unionMemo.set(k, id);
  return id;
}

const countMemo = new Map<number, number>();
/** How many worlds a graph holds. */
export function count(n: number): number {
  const hit = countMemo.get(n);
  if (hit !== undefined) return hit;
  const c = (nodes[n].final ? 1 : 0) + nodes[n].out.reduce((s, [, m]) => s + count(m), 0);
  countMemo.set(n, c);
  return c;
}

/** How many nodes a graph uses. */
export function size(n: number): number {
  const seen = new Set<number>();
  const go = (m: number): void => { if (seen.has(m)) return; seen.add(m); for (const [, k] of nodes[m].out) go(k); };
  go(n);
  return seen.size;
}

const splitMemo = new Map<number, readonly [number, number]>();
/** The paths whose every pair has equal links, and the rest. */
function splitEqual(n: number): readonly [number, number] {
  const hit = splitMemo.get(n);
  if (hit) return hit;
  const eq: [number, number][] = [];
  const ne: [number, number][] = [];
  for (const [p, m] of nodes[n].out) {
    if (sameLink(pairs[p].chain, pairs[p].at)) {
      const [e, x] = splitEqual(m);
      if (e !== EMPTY) eq.push([p, e]);
      if (x !== EMPTY) ne.push([p, x]);
    } else ne.push([p, m]);
  }
  const r = [node(nodes[n].final, eq), node(false, ne)] as const;
  splitMemo.set(n, r);
  return r;
}

/** The fewest levels of any world in the graph. */
export function minDepth(n: number): number {
  if (nodes[n].final) return 0;
  return 1 + Math.min(...nodes[n].out.map(([, m]) => minDepth(m)));
}

/** One world of the graph with the fewest levels, as the start tile's chain and the current tile's links. */
export function shallowest(n: number): { chain: Link[]; at: Link[] } {
  const chain: Link[] = [];
  const at: Link[] = [];
  let m = n;
  while (!nodes[m].final) {
    const d = minDepth(m);
    const [p, k] = nodes[m].out.find(([, x]) => minDepth(x) === d - 1)!;
    chain.push(pairs[p].chain);
    at.push(pairs[p].at);
    m = k;
  }
  return { chain, at };
}

/** Every world of the graph (for tests; the count can be large). */
export function* paths(n: number, chain: Link[] = [], at: Link[] = []): Generator<{ chain: Link[]; at: Link[] }> {
  if (nodes[n].final) yield { chain: [...chain], at: [...at] };
  for (const [p, m] of nodes[n].out) {
    chain.push(pairs[p].chain); at.push(pairs[p].at);
    yield* paths(m, chain, at);
    chain.pop(); at.pop();
  }
}

/** The graph holding exactly these worlds. */
export function fromWorlds(worlds: readonly Pick<World, 'chain' | 'at'>[]): number {
  let g = EMPTY;
  for (const w of worlds) {
    let m = END;
    for (let k = w.chain.length - 1; k >= 0; k--) m = node(false, [[pairOf(w.chain[k], w.at.path[k]), m]]);
    g = union(g, m);
  }
  return g;
}

// ---------------------------------------------------------------------------
// A step
// ---------------------------------------------------------------------------

const PARENTS = new Map<HexType, Link[]>(HEX_TYPES.map((t) => {
  const out: Link[] = [];
  for (const P of HEX_TYPES) for (let s = 0; s < 8; s++) if (childType(P, s) === t) out.push({ slot: s, parent: P });
  return [t, out];
}));

/** Where a crossing lands, the current tile's new links below the level being returned to (top down), and the graph from that level up. */
interface Part { readonly key: string; readonly below: readonly Link[]; readonly node: number }

interface Climb { readonly e: number; readonly at: readonly { readonly i: number; readonly n: number }[] }

const stepMemo = new Map<string, readonly Part[]>();

/**
 * The crossing out of edge `climb.e` of a tile of type `t` at level `k`, for
 * every world of graph `n` (the levels from k up), with `maxLevel` levels at
 * most.
 */
function cross(n: number, k: number, t: HexType, climb: Climb, maxLevel: number): readonly Part[] {
  const memoKey = `${n}|${k}|${t}|${climb.e}|${climb.at.map((c) => `${c.i}/${c.n}`).join(',')}|${maxLevel}`;
  const hit = stepMemo.get(memoKey);
  if (hit) return hit;
  const parts: Part[] = [];
  const edge = (pair: Pair, above: number): void => {
    const a = pair.at;
    const loc = locateChildEdge(a.parent, a.slot, climb.e);
    if (loc.kind === 'inside') {
      // Settles inside the parent at level k+1: rebuild the current tile's links below it.
      let type = childType(a.parent, loc.s) as HexType;
      let entry = loc.e;
      const below: Link[] = [];
      for (let m = k - 1; m >= 0; m--) {
        const { i, n: len } = climb.at[m];
        const sub = edgeParts(type, entry)[len - 1 - i];
        below.push({ slot: sub.s, parent: type });
        type = childType(type, sub.s) as HexType;
        entry = sub.e;
      }
      parts.push({ key: `${type} ${entry}`, below, node: node(false, [[pairOf(pair.chain, { slot: loc.s, parent: a.parent }), above]]) });
      return;
    }
    for (const r of cross(above, k + 1, a.parent, { e: loc.j, at: [...climb.at, { i: loc.i, n: loc.n }] }, maxLevel)) {
      if (r.key === 'open') { parts.push({ key: 'open', below: [], node: EMPTY }); continue; }
      const [mine, ...rest] = r.below;
      parts.push({ key: r.key, below: rest, node: node(false, [[pairOf(pair.chain, mine), r.node]]) });
    }
  };
  for (const [p, above] of nodes[n].out) edge(pairs[p], above);
  if (nodes[n].final) {
    // The climb reached the top of these stacks: give them every parent, or stop at maxLevel.
    if (k >= maxLevel) parts.push({ key: 'open', below: [], node: EMPTY });
    else for (const link of PARENTS.get(t)!) edge({ chain: link, at: link }, END);
  }
  // Merge parts that land alike.
  const merged = new Map<string, Part>();
  for (const p of parts) {
    const mk = `${p.key}|${p.below.map((l) => `${l.parent}:${l.slot}`).join(',')}`;
    const prev = merged.get(mk);
    merged.set(mk, prev ? { ...p, node: union(prev.node, p.node) } : p);
  }
  const out = [...merged.values()];
  stepMemo.set(memoKey, out);
  return out;
}

/** A bundle: worlds on a tile of one type, entered by one edge. */
export interface Bundle { readonly type: HexType; readonly entry: number; readonly graph: number }

export interface GraphOutcome {
  /** `Psi 4`, `closes` or `open`, as `stepAll` names them. */
  readonly key: string;
  readonly bundle: Bundle | null;
}

export interface GraphWalker {
  readonly start: HexType;
  readonly startEdge: number;
  readonly maxLevel: number;
  readonly table: Map<HexType, Map<number, number>>;
}

export const startBundle = (wk: GraphWalker): Bundle => ({ type: wk.start, entry: wk.startEdge, graph: END });

/** Every world of the bundle one step on, grouped by what it sees, as `stepAll` groups them (no seams). */
export function stepBundle(wk: GraphWalker, b: Bundle): GraphOutcome[] {
  const exit = wk.table.get(b.type)?.get(b.entry);
  if (exit === undefined) return [];
  const groups = new Map<string, number>();
  for (const p of cross(b.graph, 0, b.type, { e: exit, at: [] }, wk.maxLevel)) {
    groups.set(p.key, union(groups.get(p.key) ?? EMPTY, p.node));
  }
  const out: GraphOutcome[] = [];
  for (const [key, g] of groups) {
    if (key === 'open') { out.push({ key, bundle: null }); continue; }
    const [type, edge] = key.split(' ');
    if (type === wk.start && Number(edge) === wk.startEdge) {
      const [home, rest] = splitEqual(g);
      if (home !== EMPTY) out.push({ key: 'closes', bundle: { type: wk.start, entry: wk.startEdge, graph: home } });
      if (rest !== EMPTY) out.push({ key, bundle: { type: wk.start, entry: wk.startEdge, graph: rest } });
    } else out.push({ key, bundle: { type: type as HexType, entry: Number(edge), graph: g } });
  }
  return out;
}

/** The bundle's worlds as the list `stepAll` works on. */
export function worldsOf(b: Bundle): World[] {
  const out: World[] = [];
  for (const { chain, at } of paths(b.graph)) {
    out.push({ chain, at: { leaf: b.type, path: at }, entry: b.entry });
  }
  return out;
}

/** Sizes of the shared tables. */
export const stats = (): Record<string, number> => ({ nodes: nodes.length, steps: stepMemo.size, unions: unionMemo.size, pairs: pairs.length });

/** Drop the step memo (it is keyed by graph node, which stays valid; this only frees memory). */
export function forgetSteps(): void { stepMemo.clear(); }

// ---------------------------------------------------------------------------
// Every circuit of a combination
// ---------------------------------------------------------------------------

export interface GraphCircuit {
  readonly key: string;
  /** The word as first walked: one letter per tile. */
  readonly word: readonly string[];
  /** Fewest levels of any world that closes it. */
  readonly level: number;
  /** Worlds that close it in the branch that found it. */
  readonly worlds: number;
  /** One of those worlds, with the fewest levels: the start tile's ancestor links. */
  readonly chain: readonly Link[];
}

export interface GraphEnumeration {
  readonly circuits: readonly GraphCircuit[];
  /** Branches that leave a level-`maxLevel` stack. */
  readonly open: number;
  /** Branches dropped at `maxLength`. */
  readonly long: number;
  /** Steps taken, over every branch. */
  readonly steps: number;
  readonly stopped: 'circuits' | null;
}

/**
 * Every circuit through a tile of each type entered by each crossing edge,
 * walking every branch one step per round, shortest first. Circuits are told
 * apart by `circuitKey`.
 */
export function enumerateCircuits(
  table: Map<HexType, Map<number, number>>,
  opts: { maxLevel: number; maxLength: number; maxCircuits: number },
  letter: (type: HexType, entry: number, exit: number) => string,
  keyOf: (word: readonly string[]) => string,
): GraphEnumeration {
  // Words share their prefixes: each branch holds its last letter and a link back.
  interface Letters { readonly letter: string; readonly prev: Letters | null; readonly length: number }
  interface Branch { readonly wk: GraphWalker; bundle: Bundle; word: Letters | null }
  const spell = (w: Letters | null): string[] => { const out: string[] = []; for (let x = w; x; x = x.prev) out.push(x.letter); return out.reverse(); }
  let live: Branch[] = [];
  for (const t of HEX_TYPES) {
    for (const edge of table.get(t)?.keys() ?? []) {
      const wk: GraphWalker = { start: t, startEdge: edge, maxLevel: opts.maxLevel, table };
      live.push({ wk, bundle: startBundle(wk), word: null });
    }
  }
  const found = new Map<string, GraphCircuit>();
  let open = 0;
  let long = 0;
  let steps = 0;
  let stopped: GraphEnumeration['stopped'] = null;
  while (live.length && !stopped) {
    const next: Branch[] = [];
    for (const b of live) {
      steps++;
      const step = letter(b.bundle.type, b.bundle.entry, table.get(b.bundle.type)!.get(b.bundle.entry)!);
      const outs = stepBundle(b.wk, b.bundle);
      const word: Letters = { letter: step, prev: b.word, length: (b.word?.length ?? 0) + 1 };
      for (const o of outs) {
        if (o.key === 'open') { open++; continue; }
        if (o.key === 'closes') {
          const letters = spell(word);
          const key = keyOf(letters);
          if (!found.has(key)) {
            const g = o.bundle!.graph;
            found.set(key, { key, word: letters, level: minDepth(g), worlds: count(g), chain: shallowest(g).chain });
          }
          continue;
        }
        if (word.length >= opts.maxLength) { long++; continue; }
        next.push({ wk: b.wk, bundle: o.bundle!, word });
      }
      if (found.size >= opts.maxCircuits) { stopped = 'circuits'; break; }
    }
    live = next;
  }
  return { circuits: [...found.values()], open, long, steps, stopped };
}
