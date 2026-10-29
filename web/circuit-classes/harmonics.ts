/**
 * Harmonics: the circuits of a combination that are the same circuit two
 * levels up.
 *
 * A circuit is read at level k as the level-k supertiles its strand runs
 * through, in order: one visit per maximal run of tiles inside the same
 * level-k supertile, as the type of the supertile, its slot in its parent and
 * the parent's type (`Ph<6D`). Where the strand runs along a seam between two
 * supertiles it crosses the seam back and forth; a visit followed by a
 * return to the supertile just left (A B A) is cancelled, so the reading
 * records the supertiles the strand runs through and not how often it
 * crosses the seams between them. A circuit's height is the level of the
 * smallest supertile it lies in (the highest crossing on it). The supertile
 * that closes it can be of any type, and so can that supertile's children, so
 * types are compared only from two levels below the height; slots always.
 *
 * Circuit B is a harmonic of circuit A when B's height is A's plus two and B
 * read at level k + 2 is A read at level k, at every level: B is A with every
 * tile grown into a level-2 supertile. The script traces every circuit of a
 * level-L supertile, lists what each reads at every level, and finds the
 * harmonic pairs. Where two levels agree everywhere but at the lowest, it
 * says what the strand does at level 2 that the tiles do not: those are the
 * loops round a junction of three supertiles.
 *
 *   npx tsx circuit-classes/harmonics.ts 023468-000000000 6
 *   npx tsx circuit-classes/harmonics.ts 023468-000100000 5 Psi
 */
import { buildSystem, comboToMatchingIndices, flatten, leafOrder, slotsOfType, type MetaNode, type TileTypeId } from '../src/core';
import { addressFromId, idOf, strandStep, type Address, type HexType } from '../src/core/transducer';

const SHORT: Record<string, string> = { Gamma: 'G', Delta: 'D', Theta: 'T', Lambda: 'L', Xi: 'X', Pi: 'Pi', Sigma: 'S', Phi: 'Ph', Psi: 'Ps' };

/** One tile of a circuit: its address and the level at which the crossing out of it settled. */
export interface Step { readonly addr: Address; readonly entry: number; readonly exit: number; readonly level: number }

export interface Circuit {
  readonly word: string;
  readonly length: number;
  /** The level of the smallest supertile holding it. */
  readonly height: number;
  readonly copies: number;
  /** The first copy traced. */
  readonly steps: readonly Step[];
}

/** One visit: the supertile (its slot path within the root), its token, and the tiles the strand spent in it. */
export interface Visit { readonly id: string; readonly tok: string; readonly tiles: number }

const letter = (s: Step): string => `${SHORT[s.addr.leaf]}${s.entry}${s.exit}`;
const reverseLetter = (w: string): string => `${w.slice(0, -2)}${w[w.length - 1]}${w[w.length - 2]}`;

/** The least rotation of a cyclic word, read either way. */
export function canonical(word: readonly string[]): string {
  let best: string | null = null;
  for (const w of [word, [...word].reverse().map(reverseLetter)]) {
    for (let k = 0; k < w.length; k++) {
      const r = [...w.slice(k), ...w.slice(0, k)].join(' ');
      if (best === null || r < best) best = r;
    }
  }
  return best ?? '';
}

/** Every circuit inside a level-`level` supertile of type `root`, each distinct word once with its number of copies. */
export function traceCircuits(subset: readonly number[], combo: string, level: number, root: HexType, cap = 300000): Circuit[] {
  const mi = comboToMatchingIndices('hex', subset, combo);
  const matching: Record<string, number> = Object.fromEntries(leafOrder('hex').map((t, i) => [t, mi[i] ?? 0]));
  const seen = new Set<string>();
  const byWord = new Map<string, { length: number; height: number; copies: number; steps: Step[] }>();
  for (const t of flatten(buildSystem('hex', level)[root] as MetaNode)) {
    const a = addressFromId(root, t.id);
    for (const seam of slotsOfType('hex', a.leaf as TileTypeId, subset)) {
      if (seen.has(`${t.id} ${seam.edge}`)) continue;
      const steps: Step[] = [];
      let cur = { address: a, entry: seam.edge };
      let closed = false;
      for (let i = 0; i < cap; i++) {
        seen.add(`${idOf(cur.address)} ${cur.entry}`);
        const st = strandStep(subset, matching, cur);
        if (!st.ok) break;
        steps.push({ addr: cur.address, entry: cur.entry, exit: st.exit, level: st.neighbour.level });
        cur = st.next;
        if (idOf(cur.address) === t.id && cur.entry === seam.edge) { closed = true; break; }
      }
      if (!closed) continue;
      const word = canonical(steps.map(letter));
      const height = Math.max(...steps.map((s) => s.level));
      const c = byWord.get(word);
      if (c) { c.copies++; if (height < c.height) { c.height = height; c.steps = steps; } }
      else byWord.set(word, { length: steps.length, height, copies: 1, steps });
    }
  }
  return [...byWord.entries()].map(([word, c]) => ({ word, ...c })).sort((a, b) => a.length - b.length || (a.word < b.word ? -1 : 1));
}

/** Cancels every backtrack A B A (cyclically) until none is left; the tiles of the three visits are kept on A. */
export function cancelBacktracks(visits: readonly Visit[]): Visit[] {
  let out = [...visits];
  for (;;) {
    const n = out.length;
    let hit = -1;
    for (let i = 0; i < n && hit < 0; i++) if (n > 2 && out[(i + 2) % n].id === out[i].id && out[(i + 1) % n].id !== out[i].id) hit = i;
    if (hit < 0) return out;
    const idx = [hit, (hit + 1) % n, (hit + 2) % n];
    const merged: Visit = { ...out[hit], tiles: idx.reduce((s, q) => s + out[q].tiles, 0) };
    const set = new Set(idx);
    out = out.flatMap((v, q) => (q === hit ? [merged] : set.has(q) ? [] : [v]));
  }
}

/**
 * The circuit read at level k: its visits to level-k supertiles in order,
 * from the first visit after a crossing above level k, backtracks cancelled.
 * Types are left out from the level just below the height, where they vary
 * from copy to copy; `depth` is the number of slots in the root's ids.
 */
export function readingAt(c: Circuit, k: number, depth: number, cancel = true): Visit[] {
  const steps = c.steps;
  const n = steps.length;
  const first = steps.findIndex((s) => s.level > k);
  if (first < 0) return [];
  const visits: Visit[] = [];
  let i = (first + 1) % n;
  let count = 0;
  while (count < n) {
    const s0 = steps[i];
    let j = i;
    let tiles = 1;
    while (steps[j].level <= k) { j = (j + 1) % n; count++; tiles++; }
    count++;
    const type = k <= c.height - 2 ? SHORT[k === 0 ? s0.addr.leaf : s0.addr.path[k - 1].parent] : '';
    const link = s0.addr.path[k];
    const parent = link && k <= c.height - 3 ? SHORT[link.parent] : '';
    visits.push({ id: idOf(s0.addr).split('.').slice(0, depth - k).join('.'), tok: `${type}${link ? `<${link.slot}${parent}` : ''}`, tiles });
    i = (j + 1) % n;
  }
  return cancel ? cancelBacktracks(visits) : visits;
}

/** Whether two readings are the same cyclic sequence of tokens, either way round. */
export function sameReading(a: readonly Visit[], b: readonly Visit[]): boolean {
  if (a.length !== b.length) return false;
  const ta = a.map((v) => v.tok);
  for (const tb of [b.map((v) => v.tok), b.map((v) => v.tok).reverse()]) {
    for (let r = 0; r < tb.length; r++) if (ta.every((x, i) => x === tb[(i + r) % tb.length])) return true;
  }
  return false;
}

/** B's visits that A's tiles do not account for, as runs between the visits that match (longest common subsequence over all rotations). */
export function extras(a: readonly Visit[], b: readonly Visit[]): { unmatchedA: number; runs: Visit[][] } {
  const ta = a.map((v) => v.tok);
  let best: { lcs: number; seq: readonly Visit[] } | null = null;
  const table = (rb: readonly Visit[]): number[][] => {
    const d: number[][] = Array.from({ length: ta.length + 1 }, () => new Array<number>(rb.length + 1).fill(0));
    for (let i = 1; i <= ta.length; i++) for (let j = 1; j <= rb.length; j++) d[i][j] = ta[i - 1] === rb[j - 1].tok ? d[i - 1][j - 1] + 1 : Math.max(d[i - 1][j], d[i][j - 1]);
    return d;
  };
  for (const bb of [b, [...b].reverse()]) {
    for (let r = 0; r < bb.length; r++) {
      const rb = [...bb.slice(r), ...bb.slice(0, r)];
      const lcs = table(rb)[ta.length][rb.length];
      if (!best || lcs > best.lcs) best = { lcs, seq: rb };
    }
  }
  if (!best) return { unmatchedA: ta.length, runs: [] };
  const rb = best.seq;
  const d = table(rb);
  const matched = new Array<boolean>(rb.length).fill(false);
  for (let i = ta.length, j = rb.length; i > 0 && j > 0;) {
    if (ta[i - 1] === rb[j - 1].tok) { matched[j - 1] = true; i--; j--; }
    else if (d[i - 1][j] >= d[i][j - 1]) i--;
    else j--;
  }
  const runs: Visit[][] = [];
  let run: Visit[] = [];
  rb.forEach((v, q) => { if (!matched[q]) run.push(v); else if (run.length) { runs.push(run); run = []; } });
  if (run.length) runs.push(run);
  return { unmatchedA: ta.length - best.lcs, runs };
}

export interface Harmonic {
  readonly a: Circuit;
  readonly b: Circuit;
  /** Per level of A, whether B two levels up reads the same. */
  readonly levels: readonly boolean[];
  /** At level 0, B's extra visits in runs, when the readings differ there. */
  readonly extra: ReturnType<typeof extras> | null;
}

/** Every pair where B's height is A's plus two and the readings agree at every level but possibly the lowest. */
export function harmonics(circuits: readonly Circuit[], depth: number): Harmonic[] {
  const out: Harmonic[] = [];
  for (const b of circuits) for (const a of circuits) {
    if (a.height + 2 !== b.height || a.length >= b.length) continue;
    const levels = Array.from({ length: a.height }, (_, k) => sameReading(readingAt(a, k, depth), readingAt(b, k + 2, depth)));
    if (!levels.slice(1).every(Boolean)) continue;
    out.push({ a, b, levels, extra: levels[0] ? null : extras(readingAt(a, 0, depth), readingAt(b, 2, depth)) });
  }
  return out;
}

if (process.argv[1]?.endsWith('harmonics.ts')) {
  const [spec, lvArg, rootArg] = process.argv.slice(2);
  const [rule, combo] = spec.split('-');
  const subset = [...rule].map(Number);
  const level = Number(lvArg);
  const root = (rootArg ?? 'Delta') as HexType;
  const circuits = traceCircuits(subset, combo, level, root);
  console.log(`${spec} in a level-${level} ${root}: ${circuits.length} distinct circuits`);
  console.log('\n| tiles | height | copies | visits per level, 0 up (backtracks cancelled) |\n|---|---|---|---|');
  for (const c of circuits) {
    const sizes = Array.from({ length: c.height }, (_, k) => readingAt(c, k, level).length);
    console.log(`| ${c.length} | ${c.height} | ${c.copies} | ${sizes.join(' ')} |`);
  }
  console.log('\nHarmonics: B read at level k + 2 is A read at level k.\n');
  for (const h of harmonics(circuits, level)) {
    const where = h.levels.every(Boolean) ? 'at every level' : `at every level above the tiles`;
    console.log(`${h.a.length} -> ${h.b.length} tiles (heights ${h.a.height} -> ${h.b.height}, x${(h.b.length / h.a.length).toFixed(2)}): the same ${where}`);
    if (h.extra) {
      const shapes = new Map<string, number>();
      for (const run of h.extra.runs) { const key = run.map((v) => `${v.tok}(${v.tiles})`).join(' '); shapes.set(key, (shapes.get(key) ?? 0) + 1); }
      console.log(`  at level 2, B has ${h.extra.runs.length} extra runs of visits and misses ${h.extra.unmatchedA} of A's tiles:`);
      for (const [k, n] of [...shapes].sort((x, y) => y[1] - x[1])) console.log(`    ${n} x [${k}]`);
    }
  }
}
