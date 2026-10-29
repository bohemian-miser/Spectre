/**
 * The circuits a tree of choices closes on, and how each relates to the
 * smaller ones: where its branch leaves theirs, and which supertiles decide
 * that fork.
 *
 * Branches that close on the same circuit with the start tile at another
 * place along it read the same word from another tile, so circuits are told
 * apart by the word read round them from the tile where it reads least, in
 * the direction that reads least.
 */
import { circuitKey as keyOfWord, tileLetter } from '../../core';
import type { ChoiceNode, Fork, PossibleWalk, Seen, Stage } from './possible';

/** The circuit's word: a letter per tile (`core/circuitWord.ts`). */
export const wordOf = (seen: readonly Seen[]): string[] => seen.map((s) => tileLetter(s.type, s.entry, s.exit));

/** The key every page names a circuit by: its word from the tile where it reads least, the way round it reads least. */
export const circuitKey = (seen: readonly Seen[]): string => keyOfWord(wordOf(seen));

/** Where a circuit's branch leaves a smaller circuit's branch. */
export interface Branching {
  /** The smaller circuit's key and length. */
  readonly from: string;
  readonly fromTiles: number;
  /** The fork: its node, its step, the landing towards each circuit. */
  readonly node: number;
  readonly step: number;
  readonly took: string;
  readonly other: string;
  /** The level that decides the fork (1 = parent), and the positions there that lead to `took`. */
  readonly level: number | null;
  readonly cells: readonly string[];
}

export interface Circuit {
  readonly key: string;
  readonly tiles: number;
  /** The branches that close on it, by node, fewest choices first. */
  readonly nodes: readonly number[];
  /** Choices on the branch with fewest. */
  readonly choices: number;
  /** Where it leaves the smaller circuit whose branch it shares longest; null for the smallest. */
  readonly branching: Branching | null;
}

/** Where the walk from a node ended, if it has. */
const endOf = (pw: PossibleWalk, n: ChoiceNode): Stage | null => n.end ?? (n.id === pw.current && pw.stage.status !== 'walking' && pw.stage.status !== 'choice' ? pw.stage : null);

/** A node of a tree of choices as `circuitsIn` reads it: the walk's own tree, or a search's (`search.ts`). */
export interface TreeNode {
  readonly id: number;
  readonly parent: number | null;
  readonly key: string | null;
  readonly fork?: Fork | null;
  readonly end?: { readonly status: string; readonly seen?: readonly Seen[] } | null;
}

export const circuitsOf = (pw: PossibleWalk): Circuit[] => circuitsIn(pw.nodes.map((n) => ({ ...n, end: endOf(pw, n) })));

export function circuitsIn(tree: readonly TreeNode[]): Circuit[] {
  const groups = new Map<string, { tiles: number; nodes: number[] }>();
  for (const n of tree) {
    const seen = n.end?.status === 'closed' ? n.end.seen : undefined;
    if (!seen) continue;
    const key = circuitKey(seen);
    (groups.get(key) ?? groups.set(key, { tiles: seen.length, nodes: [] }).get(key)!).nodes.push(n.id);
  }
  const routes = new Map<number, number[]>();
  const route = (id: number): number[] => {
    const hit = routes.get(id);
    if (hit) return hit;
    const out: number[] = [];
    for (let at: number | null = id; at !== null; at = tree[at].parent) out.unshift(at);
    routes.set(id, out);
    return out;
  };
  const sorted = [...groups].sort((a, b) => a[1].tiles - b[1].tiles || (a[0] < b[0] ? -1 : 1));
  return sorted.map(([key, g]) => {
    const nodes = [...g.nodes].sort((a, b) => route(a).length - route(b).length || a - b);
    let best: { depth: number; branching: Branching } | null = null;
    for (const [hKey, h] of sorted) {
      if (h.tiles >= g.tiles) break;
      for (const a of g.nodes) for (const b of h.nodes) {
        const ra = route(a), rb = route(b);
        let d = 0;
        while (d < ra.length && d < rb.length && ra[d] === rb[d]) d++;
        // ra[d - 1] is the last node both branches pass; they part at its fork
        if (d === 0 || d >= ra.length || d >= rb.length) continue;
        if (best && (d - 1 < best.depth || (d - 1 === best.depth && h.tiles <= best.branching.fromTiles))) continue;
        const at = tree[ra[d - 1]];
        const took = tree[ra[d]].key!, other = tree[rb[d]].key!;
        const option = at.fork?.options.find((o) => o.key === took);
        best = {
          depth: d - 1,
          branching: { from: hKey, fromTiles: h.tiles, node: at.id, step: at.fork?.step ?? 0, took, other, level: option?.level ?? null, cells: option?.cells ?? [] },
        };
      }
    }
    return { key, tiles: g.tiles, nodes, choices: route(nodes[0]).length - 1, branching: best?.branching ?? null };
  });
}

/** A circuit the tree has closed on: its key and length, the first branch that closed on it, that branch's choices, and how many branches close on it. */
export interface Found { readonly key: string; readonly tiles: number; readonly node: number; readonly choices: number; readonly branches: number }

const keys = new WeakMap<Stage, string>();

/**
 * The circuits closed on so far, in the order their first branches were
 * made. `explore` makes the nodes breadth first, so a circuit reached in
 * fewer choices comes first.
 */
export function foundCircuits(pw: PossibleWalk): Found[] {
  const by = new Map<string, { key: string; tiles: number; node: number; choices: number; branches: number }>();
  for (const n of pw.nodes) {
    const st = endOf(pw, n);
    if (!st || st.status !== 'closed') continue;
    const key = keys.get(st) ?? keys.set(st, circuitKey(st.seen)).get(st)!;
    const f = by.get(key);
    if (f) { f.branches++; continue; }
    let choices = 0;
    for (let at = n.parent; at !== null; at = pw.nodes[at].parent) choices++;
    by.set(key, { key, tiles: st.seen.length, node: n.id, choices, branches: 1 });
  }
  return [...by.values()];
}

/** The circuits a search's records close on (`search.ts`), by the same rule as `foundCircuits`: in the order their first branches were made. */
export function foundIn(nodes: readonly { readonly id: number; readonly depth: number; readonly end?: { readonly status: string; readonly seen?: readonly Seen[] } }[]): Found[] {
  const by = new Map<string, { key: string; tiles: number; node: number; choices: number; branches: number }>();
  for (const n of nodes) {
    const seen = n.end?.status === 'closed' ? n.end.seen : undefined;
    if (!seen) continue;
    const key = wordKeys.get(seen) ?? wordKeys.set(seen, circuitKey(seen)).get(seen)!;
    const f = by.get(key);
    if (f) f.branches++;
    else by.set(key, { key, tiles: seen.length, node: n.id, choices: n.depth, branches: 1 });
  }
  return [...by.values()];
}

const wordKeys = new WeakMap<readonly Seen[], string>();
