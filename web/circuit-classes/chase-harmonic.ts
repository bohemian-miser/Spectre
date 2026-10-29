/**
 * Searching for a circuit's harmonic with the Circuit walker's own search,
 * cut down by what the harmonic is known to be.
 *
 * The harmonic B of a circuit A is A with every tile grown into a level-2
 * supertile (`harmonics.ts`): B's ancestors at level k + 2 are A's at level
 * k. So A, walked on every stack at once and replayed on its closing stacks,
 * says which cells (an ancestor's type and the slot below it) B's stacks can
 * hold from level 3 up. In the search for B, a fork that is decided at level
 * 3 or above keeps only the landings whose deciding cells, two levels down,
 * are cells A uses; forks decided at levels 1 and 2 are searched as before.
 * The rule never drops a landing on B's own branch.
 *
 * Both circuits are first traced on a patch, only to know A's word and B's
 * start tile. Prints the search with and without the rule: forks opened (by
 * the level that decides them), branches, landings dropped, and the circuits
 * closed on.
 *
 *   npx tsx circuit-classes/chase-harmonic.ts 023468-000100000 5 6 18 441
 *   npx tsx circuit-classes/chase-harmonic.ts 023468-000100000 5 6 18 441 all   # from every start tile and edge
 */
import { buildSystem, comboToMatchingIndices, flatten, leafOrder, slotsOfType, type MetaNode, type TileTypeId } from '../src/core';
import { HEX_TYPES, addressFromId, idOf, strandStep, type HexType } from '../src/core/transducer';
import { advance, followWord, makeWalker, replay, startWalk, type Outcome, type Seen, type Stage, type Walker } from '../src/pages/walker/possible';
import { patternOf } from '../src/pages/walker/walk';

/** The word of the first circuit of each length inside a level-`level` supertile of type `root`. */
export function wordsByLength(subset: readonly number[], combo: string, level: number, root: HexType): Map<number, Seen[]> {
  const mi = comboToMatchingIndices('hex', subset, combo);
  const matching: Record<string, number> = Object.fromEntries(leafOrder('hex').map((t, i) => [t, mi[i] ?? 0]));
  const seen = new Set<string>();
  const words = new Map<number, Seen[]>();
  for (const t of flatten(buildSystem('hex', level)[root] as MetaNode)) {
    const a = addressFromId(root, t.id);
    for (const seam of slotsOfType('hex', a.leaf as TileTypeId, subset)) {
      if (seen.has(`${t.id} ${seam.edge}`)) continue;
      const word: Seen[] = [];
      let cur = { address: a, entry: seam.edge };
      let closed = false;
      for (let i = 0; i < 300000; i++) {
        seen.add(`${idOf(cur.address)} ${cur.entry}`);
        const st = strandStep(subset, matching, cur);
        if (!st.ok) break;
        word.push({ type: cur.address.leaf, entry: cur.entry, exit: st.exit });
        cur = st.next;
        if (idOf(cur.address) === t.id && cur.entry === seam.edge) { closed = true; break; }
      }
      if (closed && !words.has(word.length)) words.set(word.length, word);
    }
  }
  return words;
}

/** The cells (type and slot, as `Delta1`) that a circuit's tiles have at each level, over every stack its walk closes on. */
export function cellsUsed(wk: Walker, word: readonly Seen[]): Set<string>[] {
  const pw = followWord(startWalk(wk), word, 100000);
  if (pw.stage.status !== 'closed') throw new Error(`the walk did not close: ${pw.stage.status}`);
  const cells: Set<string>[] = [];
  for (const w of pw.stage.worlds) {
    for (const a of replay(wk, w, word.length).at) {
      a.path.forEach((l, k) => (cells[k + 1] ?? (cells[k + 1] = new Set())).add(`${l.parent}${l.slot}`));
    }
  }
  return cells;
}

function applyOutcome(stage: Stage, wk: Walker, o: Outcome): Stage {
  const w0 = stage.worlds[0];
  const exit = wk.table.get(w0.at.leaf)!.get(w0.entry)!;
  const seen = [...stage.seen, { type: w0.at.leaf, entry: w0.entry, exit }];
  return { worlds: o.worlds, seen, status: o.key === 'closes' ? 'closed' : o.key === 'open' ? 'open' : 'walking', pending: [], corners: stage.corners };
}

/** The level that decides a fork (1 = parent) and, per landing, the cells there that lead to it, as `forkOf` finds them. */
function deciders(stage: Stage): { level: number | null; cells: string[][] } {
  const sets = stage.pending.map((o) => {
    const by: Set<string>[] = [];
    for (const w of o.worlds) w.chain.forEach((l, k) => (by[k] ?? (by[k] = new Set())).add(l.parent));
    return by;
  });
  const depth = Math.max(0, ...sets.map((x) => x.length));
  let level: number | null = null;
  for (let k = 0; k < depth && level === null; k++) {
    const keys = sets.map((x) => [...(x[k] ?? [])].sort().join(','));
    if (new Set(keys).size > 1) level = k;
  }
  const cells = stage.pending.map((o) => (level === null ? [] : [...new Set(o.worlds.flatMap((w) => (w.chain[level!] ? [`${w.chain[level!].parent}${w.chain[level!].slot}`] : [])))]));
  return { level: level === null ? null : level + 1, cells };
}

export interface Search {
  readonly closed: readonly number[];
  readonly forks: number;
  readonly forksByLevel: ReadonlyMap<number | null, number>;
  readonly branches: number;
  readonly dropped: number;
}

/**
 * The walker's search from a bare start tile, shortest branch first, every
 * landing at every fork; with `cells`, a fork decided at level 3 or above
 * keeps only the landings whose cells two levels down are in `cells`.
 */
export function search(wk: Walker, cells: readonly Set<string>[] | null, limits: { forks: number; tiles: number }): Search {
  const start: Stage = { worlds: [{ chain: [], at: { leaf: wk.start, path: [] }, entry: wk.startEdge }], seen: [], status: 'walking', pending: [], corners: [] };
  const run = (st: Stage): Stage => { let s = st; while (s.status === 'walking' && s.seen.length < limits.tiles) s = advance(wk, s); return s; };
  const queue: Stage[] = [run(start)];
  const closed: number[] = [];
  const forksByLevel = new Map<number | null, number>();
  let forks = 0, branches = 1, dropped = 0;
  while (queue.length) {
    let at = 0;
    for (let i = 1; i < queue.length; i++) if (queue[i].seen.length < queue[at].seen.length) at = i;
    const st = queue.splice(at, 1)[0];
    if (st.status === 'closed') { closed.push(st.seen.length); continue; }
    if (st.status !== 'choice' || forks >= limits.forks) continue;
    forks++;
    const d = deciders(st);
    forksByLevel.set(d.level, (forksByLevel.get(d.level) ?? 0) + 1);
    st.pending.forEach((o, i) => {
      if (cells && d.level !== null && d.level >= 3 && !d.cells[i].some((c) => cells[d.level! - 2]?.has(c))) { dropped++; return; }
      branches++;
      queue.push(run(applyOutcome(st, wk, o)));
    });
  }
  return { closed, forks, forksByLevel, branches, dropped };
}

if (process.argv[1]?.endsWith('chase-harmonic.ts')) {
  const [spec, lvArg, maxArg, lenA, lenB, mode] = process.argv.slice(2);
  const [rule, combo] = spec.split('-');
  const subset = [...rule].map(Number);
  const maxLevel = Number(maxArg);
  const pattern = patternOf(subset, combo);
  const words = wordsByLength(subset, combo, Number(lvArg), 'Delta');
  const wordA = words.get(Number(lenA)), wordB = words.get(Number(lenB));
  if (!wordA || !wordB) throw new Error(`circuits of ${lenA} and ${lenB} tiles are needed; found ${[...words.keys()].sort((a, b) => a - b).join(' ')}`);
  const cells = cellsUsed(makeWalker(pattern, wordA[0].type, wordA[0].entry, maxLevel, false), wordA);
  console.log(`A: ${lenA} tiles; cells used per level: ${cells.map((s, k) => (s ? `${k}: ${s.size}` : '')).filter(Boolean).join(', ')}`);
  const starts = mode === 'all'
    ? HEX_TYPES.flatMap((t) => slotsOfType('hex', t, subset).map((s) => ({ type: t, entry: s.edge })))
    : [{ type: wordB[0].type, entry: wordB[0].entry }];
  for (const s of starts) {
    for (const rule of mode === 'all' ? [cells] : [cells, null]) {
      const wk = makeWalker(pattern, s.type, s.entry, maxLevel, false);
      const t0 = Date.now();
      const r = search(wk, rule, { forks: Number(process.env.FORKS ?? 5000), tiles: Number(lenB) + 10 });
      const lens = new Map<number, number>();
      for (const c of r.closed) lens.set(c, (lens.get(c) ?? 0) + 1);
      const byLevel = [...r.forksByLevel].sort((a, b) => (a[0] ?? 99) - (b[0] ?? 99)).map(([l, n]) => `${l ?? 'top'}: ${n}`).join(', ');
      console.log(`${rule ? 'with the rule   ' : 'without the rule'} from ${s.type} ${s.entry}: ${r.forks} forks (decided at level ${byLevel}), ${r.branches} branches, ${r.dropped} landings dropped, ${Date.now() - t0} ms; closed on ${[...lens].sort((a, b) => a[0] - b[0]).map(([l, k]) => `${l} x${k}`).join(', ') || 'nothing'}`);
    }
  }
}
