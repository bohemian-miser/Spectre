/**
 * Harmonic search over the strands of a rooted patch: which strands read at
 * level m + 2k as a chosen circuit reads at level m.
 *
 * A strand is given by its tiles in order, each tile by its slot path from
 * the patch root as one number (`slotPathCode`), so the level-j supertile
 * holding a tile is the code over 8^j. Read at level j, a strand is the
 * sequence of level-j supertiles it runs through, one visit per run of
 * tiles in the same supertile (cyclically for a circuit), each visit a
 * token of the supertile's type and its slot in its parent, as the
 * Harmonics page reads circuits (`harmonics/readings.ts`), then folded as
 * there (`harmonics/rows.ts`): `fixpoint` cancels every backtrack (an open
 * strand's ends stay put, `cancelOpen`), `weave` folds only weaving across a
 * seam, `none` nothing.
 *
 * The circuit's level-m reading is set against every other strand's level
 * m + 2k reading two ways, and a strand's score is the better:
 *
 * - `whole`, for a circuit: one less the cyclic edit distance over the
 *   longer reading (`harmonics/similarity.ts`), either way round.
 * - `part`: the shorter reading placed where it fits best along the longer
 *   (a run of consecutive tokens; round the loop for a circuit), either way
 *   round: one less that edit distance over the shorter reading's length. A
 *   strand shorter than the circuit counts only when its reading holds at
 *   least `PART_SHARE` of the circuit's tokens, so a short arc of two or
 *   three visits does not match everything.
 *
 * Strands that stay inside one level-(m + 2k) supertile read as one token
 * and are not scored; of the rest, the longest `STRAND_CAP` are.
 */
import { TYPE_PREFIX, type HexType, type MetaNode, type TileNode } from '../../core';
import { cancelBacktracksAt, cancelOpen } from '../harmonics/readings';
import { weaveKeep, type Fold } from '../harmonics/rows';
import { cyclicDistance } from '../harmonics/similarity';

/** Most strands scored in one search (the longest that leave a supertile of the level read). */
export const STRAND_CAP = 2000;
/** A strand shorter than the circuit matches in part only with at least this share of the circuit's reading. */
export const PART_SHARE = 1 / 3;
/** Fewest tokens a part match is made of. */
export const PART_MIN_TOKENS = 3;
/** Work (cells of the edit table) past which a loop placed in part is tried at `PART_ROTATIONS` of its rotations only. */
export const PART_WORK = 2e7;
export const PART_ROTATIONS = 24;

/** The supertiles of a patch by slot path: their types, looked up from the root once each. */
export class PatchAncestors {
  private readonly nodes: Map<number, TileNode>[] = [];

  constructor(
    readonly root: TileNode,
    readonly level: number,
  ) {
    for (let j = 0; j <= level; j++) this.nodes.push(new Map());
    this.nodes[level].set(0, root);
  }

  /** The level-j supertile with code `at` (a tile's code over 8^j). */
  node(j: number, at: number): TileNode {
    const hit = this.nodes[j].get(at);
    if (hit) return hit;
    const parent = this.node(j + 1, Math.floor(at / 8));
    const slot = at % 8;
    const child = parent.kind === 'leaf' ? null : (parent as MetaNode).children.find((c) => c.pos === slot);
    if (!child) throw new Error(`no child in slot ${slot} of a level-${j + 1} ${parent.type}`);
    this.nodes[j].set(at, child.node);
    return child.node;
  }

  type(j: number, at: number): string {
    return this.node(j, at).type;
  }
}

/** A supertile's token: its type's letters and its slot in its parent (`Ph<6`); the root has no slot. */
export function supertileToken(anc: PatchAncestors, j: number, at: number): string {
  const type = anc.type(j, at);
  const letters = TYPE_PREFIX[type as HexType] ?? type;
  return j < anc.level ? `${letters}<${at % 8}` : letters;
}

/** A strand read at one level: the supertile of every visit, the visits the fold keeps, and their tokens. */
export interface StrandReading {
  readonly level: number;
  readonly visits: Int32Array;
  readonly keep: Int32Array;
  readonly tokens: readonly string[];
}

/** The visits of a strand at level j: the level-j supertile of each run of its tiles (a circuit's first and last run are one when they meet). */
export function visitsAt(tiles: ArrayLike<number>, closed: boolean, j: number): Int32Array {
  const scale = 8 ** j;
  const out: number[] = [];
  for (let i = 0; i < tiles.length; i++) {
    const at = Math.floor(tiles[i] / scale);
    if (out.length === 0 || out[out.length - 1] !== at) out.push(at);
  }
  if (closed && out.length > 1 && out[0] === out[out.length - 1]) out.pop();
  if (closed && out.length > 2) {
    // Start the loop where no weaving runs across the start, so a one-pass fold sees each stretch whole.
    const n = out.length;
    const at = (q: number) => out[(q + n) % n];
    for (let s = 0; s < n; s++) {
      if (at(s) !== at(s - 2) && at(s + 1) !== at(s - 1)) return Int32Array.from({ length: n }, (_, q) => at(s + q));
    }
  }
  return Int32Array.from(out);
}

/** The visits a fold keeps (indices). */
export function foldVisits(visits: Int32Array, closed: boolean, fold: Fold): Int32Array {
  if (fold === 'none') return Int32Array.from(visits, (_, i) => i);
  if (fold === 'weave') return weaveKeep(visits);
  return closed ? cancelBacktracksAt(visits, new Float64Array(visits.length)).keep : cancelOpen(visits);
}

/** A strand read at level j under a fold. */
export function readStrand(anc: PatchAncestors, tiles: ArrayLike<number>, closed: boolean, j: number, fold: Fold): StrandReading {
  const visits = visitsAt(tiles, closed, j);
  const keep = foldVisits(visits, closed, fold);
  return { level: j, visits, keep, tokens: Array.from(keep, (i) => supertileToken(anc, j, visits[i])) };
}

/** The least edit distance from pattern `p` to a run of consecutive tokens of text `t`; a loop (`pCyclic`) at any rotation, `t` round and round once when `tCyclic`; either way round. */
export function fitInside(p: readonly string[], pCyclic: boolean, t: readonly string[], tCyclic: boolean): number {
  const n = p.length;
  if (!n) return 0;
  if (!t.length) return n;
  const m = t.length;
  const text = tCyclic ? Array.from({ length: m + Math.min(m, 2 * n) }, (_, i) => t[i % m]) : t;
  const T = text.length;
  let rotations: number[] = [0];
  if (pCyclic) {
    rotations = Array.from({ length: n }, (_, r) => r);
    if (n * n * T * 2 > PART_WORK) {
      const step = n / PART_ROTATIONS;
      rotations = Array.from({ length: PART_ROTATIONS }, (_, q) => Math.floor(q * step));
    }
  }
  let prev = new Int32Array(T + 1);
  let cur = new Int32Array(T + 1);
  let best = n;
  for (const back of [false, true]) {
    for (const r of rotations) {
      prev.fill(0);
      for (let i = 1; i <= n; i++) {
        const q = (r + i - 1) % n;
        const pi = p[back ? n - 1 - q : q];
        cur[0] = i;
        for (let j = 1; j <= T; j++) {
          const sub = prev[j - 1] + (pi === text[j - 1] ? 0 : 1);
          const del = prev[j] + 1;
          const ins = cur[j - 1] + 1;
          cur[j] = sub < del ? (sub < ins ? sub : ins) : del < ins ? del : ins;
        }
        [prev, cur] = [cur, prev];
      }
      for (let j = 0; j <= T; j++) if (prev[j] < best) best = prev[j];
      if (best === 0) return 0;
    }
  }
  return best;
}

export type MatchKind = 'whole' | 'part';

export interface Score {
  readonly score: number;
  readonly match: MatchKind;
}

/**
 * The circuit's reading `a` against a strand's reading `b` (see the file's
 * note); null when neither way applies: the strand is too short to match
 * in part and not a circuit, or its whole score cannot reach `atLeast`.
 */
export function scoreReading(a: readonly string[], b: readonly string[], bClosed: boolean, atLeast = 0): Score | null {
  const n = a.length, m = b.length;
  if (!n || !m) return null;
  let whole: number | null = null;
  if (bClosed && 1 - Math.abs(n - m) / Math.max(n, m) >= atLeast) {
    whole = 1 - cyclicDistance(a, b).distance / Math.max(n, m);
  }
  let part: number | null = null;
  if (m >= n) part = 1 - fitInside(a, true, b, bClosed) / n;
  else if (m >= Math.max(PART_MIN_TOKENS, Math.ceil(n * PART_SHARE))) part = 1 - fitInside(b, bClosed, a, true) / m;
  if (whole === null && part === null) return null;
  if (part === null || (whole !== null && whole >= part)) return { score: whole!, match: 'whole' };
  return { score: part, match: 'part' };
}

/** A search: the circuit (an index into `strands`), the level it is read at, the steps up, the fold and the least score listed. */
export interface SearchParams {
  readonly circuit: number;
  readonly m: number;
  readonly k: number;
  readonly fold: Fold;
  readonly threshold: number;
}

export interface Strand {
  readonly closed: boolean;
  /** Its tiles' codes, in order along it. */
  readonly tiles: ArrayLike<number>;
}

export interface Hit {
  /** Index into the strands searched. */
  readonly strand: number;
  readonly closed: boolean;
  readonly tiles: number;
  /** Tokens in its level-(m + 2k) reading. */
  readonly tokens: number;
  readonly score: number;
  readonly match: MatchKind;
  /** The level-(m + 2k) supertiles it runs through (codes, each once). */
  readonly supertiles: Int32Array;
}

export interface SearchResult {
  readonly m: number;
  readonly level: number;
  /** The circuit's level-m reading and the supertiles it runs through there. */
  readonly reading: readonly string[];
  readonly circuitSupertiles: Int32Array;
  /** Strands that leave a level-(m + 2k) supertile, and how many of them were scored. */
  readonly candidates: number;
  readonly scored: number;
  /** Strands at or above the threshold, best first. */
  readonly hits: readonly Hit[];
}

const distinct = (visits: Int32Array): Int32Array => Int32Array.from(new Set(visits));

/** Whether a strand's tiles lie in more than one level-j supertile. */
function leaves(tiles: ArrayLike<number>, j: number): boolean {
  if (!tiles.length) return false;
  const scale = 8 ** j;
  const first = Math.floor(tiles[0] / scale);
  for (let i = 1; i < tiles.length; i++) if (Math.floor(tiles[i] / scale) !== first) return true;
  return false;
}

/** Every strand scored against the circuit (see the file's note). */
export function searchHarmonics(anc: PatchAncestors, strands: readonly Strand[], p: SearchParams): SearchResult {
  const level = p.m + 2 * p.k;
  if (p.m < 0 || level > anc.level) throw new Error(`level ${level} is above the patch`);
  const c = strands[p.circuit];
  const a = readStrand(anc, c.tiles, c.closed, p.m, p.fold);
  const candidates: number[] = [];
  strands.forEach((s, i) => {
    if (i !== p.circuit && leaves(s.tiles, level)) candidates.push(i);
  });
  const scored = candidates.sort((x, y) => strands[y].tiles.length - strands[x].tiles.length || x - y).slice(0, STRAND_CAP);
  const hits: Hit[] = [];
  for (const i of scored) {
    const s = strands[i];
    const b = readStrand(anc, s.tiles, s.closed, level, p.fold);
    const sc = scoreReading(a.tokens, b.tokens, s.closed, p.threshold);
    if (!sc || sc.score < p.threshold) continue;
    hits.push({ strand: i, closed: s.closed, tiles: s.tiles.length, tokens: b.tokens.length, ...sc, supertiles: distinct(b.visits) });
  }
  hits.sort((x, y) => y.score - x.score || y.tiles - x.tiles || x.strand - y.strand);
  return { m: p.m, level, reading: a.tokens, circuitSupertiles: distinct(a.visits), candidates: candidates.length, scored: scored.length, hits };
}
