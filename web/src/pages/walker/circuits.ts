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
import { letter, reverseLetter } from '../../core';
import type { ChoiceNode, PossibleWalk, Seen, Stage } from './possible';

/** The least of the word's rotations, read either way round. */
export function circuitKey(seen: readonly Seen[]): string {
  const word = seen.map((s) => letter(s.type, s.entry, s.exit));
  const back = [...word].reverse().map(reverseLetter);
  let best: string[] | null = null;
  for (const w of [word, back]) {
    for (let k = 0; k < w.length; k++) {
      const r = [...w.slice(k), ...w.slice(0, k)];
      if (!best || less(r, best)) best = r;
    }
  }
  return (best ?? []).join(' ');
}

const less = (a: readonly string[], b: readonly string[]): boolean => {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i];
  return false;
};

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

const routeOf = (pw: PossibleWalk, id: number): number[] => {
  const out: number[] = [];
  for (let at: number | null = id; at !== null; at = pw.nodes[at].parent) out.unshift(at);
  return out;
};

export function circuitsOf(pw: PossibleWalk): Circuit[] {
  const groups = new Map<string, { tiles: number; nodes: number[] }>();
  for (const n of pw.nodes) {
    const st = endOf(pw, n);
    if (!st || st.status !== 'closed') continue;
    const key = circuitKey(st.seen);
    (groups.get(key) ?? groups.set(key, { tiles: st.seen.length, nodes: [] }).get(key)!).nodes.push(n.id);
  }
  const routes = new Map<number, number[]>();
  const route = (id: number): number[] => routes.get(id) ?? routes.set(id, routeOf(pw, id)).get(id)!;
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
        const at = pw.nodes[ra[d - 1]];
        const took = pw.nodes[ra[d]].key!, other = pw.nodes[rb[d]].key!;
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
