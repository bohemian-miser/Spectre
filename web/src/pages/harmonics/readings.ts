/**
 * A circuit read at a level, and which circuits read as which.
 *
 * Read at level k, a circuit is the sequence of level-k supertiles its
 * strand runs through: one visit per arc through a level-k supertile, as the
 * supertile's type, its slot in its parent and the parent's type. Where the
 * strand runs along a seam it crosses it back and forth; a visit followed
 * straight away by a return to the supertile just left (A B A) is cancelled,
 * so the reading records the supertiles the strand runs through and not how
 * often it crosses the seams between them. The supertile a circuit is born
 * in can be of any type, and so can that supertile's children, so types are
 * compared only from two levels below the birth; slots always.
 *
 * Circuit B is a harmonic of circuit A when B is born two levels above A and
 * B read at level k + 2 is A read at level k at every level: B is A with
 * every tile grown into a level-2 supertile.
 *
 * The visits come from the renormalisation (`shapes/circuitShapes.ts`),
 * which keeps every arc's route through its children, so a circuit born at
 * any level can be read without building a patch.
 */
import { buildSystem, type MetaNode } from '../../core';
import type { BornCircuit, CircuitShapes } from '../shapes/circuitShapes';

const SHORT: Record<string, string> = { Gamma: 'G', Delta: 'D', Theta: 'T', Lambda: 'L', Xi: 'X', Pi: 'Pi', Sigma: 'S', Phi: 'Ph', Psi: 'Ps' };

export interface Visit {
  /** The supertile: its slots from the birth supertile down. */
  readonly id: string;
  readonly type: string;
  readonly slot: number;
  readonly parent: string;
  /** Tiles the strand spends in it. */
  readonly tiles: number;
}

/** The raw visits of a born circuit at level k (k below its birth level): one per arc through a level-k supertile. */
export function visitsAt(cs: CircuitShapes, c: BornCircuit, k: number): Visit[] {
  const out: Visit[] = [];
  const descend = (n: number, type: string, cross: number, path: readonly number[], parent: string): void => {
    const L = cs.levels[n][type];
    if (n <= k) {
      out.push({ id: path.join('.'), type, slot: path[path.length - 1], parent, tiles: L.arcLen[cross] });
      return;
    }
    const meta = buildSystem(cs.family, n)[type] as MetaNode;
    const fwd = L.forward[cross] === 1;
    const from = fwd ? cross : L.mate[cross];
    const steps = L.routeSteps.subarray(L.routeStart[from], L.routeStart[from + 1]);
    const enter = (i: number, reversed: boolean): void => {
      const ch = meta.children[L.owner[i]];
      const childType = ch.node.type;
      const loc = reversed ? cs.levels[n - 1][childType].mate[L.local[i]] : L.local[i];
      descend(n - 1, childType, loc, [...path, ch.pos], type);
    };
    if (fwd) for (const i of steps) enter(i, false);
    else for (let q = steps.length - 1; q >= 0; q--) enter(steps[q], true);
  };
  const meta = buildSystem(cs.family, c.level)[c.type] as MetaNode;
  const top = cs.levels[c.level][c.type];
  for (const i of c.steps) {
    const ch = meta.children[top.owner[i]];
    descend(c.level - 1, ch.node.type, top.local[i], [ch.pos], c.type);
  }
  return out;
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

/** A visit's token at level k of a circuit born at level `birth`: `Ph<6D`, with the type left out from the level just below the birth and the parent from the one below that. */
export function token(v: Visit, k: number, birth: number): string {
  const type = k <= birth - 2 ? SHORT[v.type] : '';
  const parent = k <= birth - 3 ? SHORT[v.parent] : '';
  return `${type}<${v.slot}${parent}`;
}

export interface Reading {
  readonly level: number;
  /** Visits before backtracks are cancelled. */
  readonly raw: number;
  readonly tokens: readonly string[];
  readonly tiles: readonly number[];
}

/** The circuit read at every level below its birth, backtracks cancelled. */
export function readings(cs: CircuitShapes, c: BornCircuit): Reading[] {
  const out: Reading[] = [];
  for (let k = 0; k < c.level; k++) {
    const raw = visitsAt(cs, c, k);
    const cut = cancelBacktracks(raw);
    out.push({ level: k, raw: raw.length, tokens: cut.map((v) => token(v, k, c.level)), tiles: cut.map((v) => v.tiles) });
  }
  return out;
}

/** Whether two cyclic token sequences are the same, read either way round. Rotations are tried only where the first token matches. */
export function sameCyclic(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  if (a.length === 0) return true;
  const n = a.length;
  for (const bb of [b, [...b].reverse()]) {
    for (let r = 0; r < n; r++) {
      if (bb[r] !== a[0]) continue;
      let ok = true;
      for (let i = 1; i < n && ok; i++) if (a[i] !== bb[(r + i) % n]) ok = false;
      if (ok) return true;
    }
  }
  return false;
}

export interface Lineage {
  /** Indices into the circuits compared. */
  readonly a: number;
  readonly b: number;
  /** Per level of A, whether B two levels up reads the same. */
  readonly levels: readonly boolean[];
}

/**
 * Every pair where B is born two levels above A and reads the same at every
 * level but possibly the lowest. Readings longer than `maxTokens` are not
 * compared at that level and count as agreeing.
 */
export function lineages(circuits: readonly { readonly level: number; readonly readings: readonly Reading[] }[], maxTokens = 60000): Lineage[] {
  const out: Lineage[] = [];
  circuits.forEach((b, bi) => {
    circuits.forEach((a, ai) => {
      if (a.level + 2 !== b.level) return;
      const levels = a.readings.map((ra, k) => {
        const rb = b.readings[k + 2];
        if (!rb || ra.tokens.length > maxTokens || rb.tokens.length > maxTokens) return ra.tokens.length === rb?.tokens.length;
        return sameCyclic(ra.tokens, rb.tokens);
      });
      if (levels.slice(1).every(Boolean)) out.push({ a: ai, b: bi, levels });
    });
  });
  return out;
}

/** B's visits that A's tiles do not account for, as runs between matched visits: the loops round junctions. Only for readings up to `maxTokens`. */
export function extraRuns(a: readonly string[], b: readonly string[], maxTokens = 1500): { unmatched: number; runs: string[][] } | null {
  if (a.length > maxTokens || b.length > maxTokens || a.length === 0) return null;
  const table = (rb: readonly string[]): number[][] => {
    const d: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(rb.length + 1).fill(0));
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= rb.length; j++) d[i][j] = a[i - 1] === rb[j - 1] ? d[i - 1][j - 1] + 1 : Math.max(d[i - 1][j], d[i][j - 1]);
    return d;
  };
  let best: { lcs: number; seq: readonly string[] } | null = null;
  for (const bb of [b, [...b].reverse()]) {
    for (let r = 0; r < bb.length; r++) {
      if (bb[r] !== a[0]) continue;
      const rb = [...bb.slice(r), ...bb.slice(0, r)];
      const lcs = table(rb)[a.length][rb.length];
      if (!best || lcs > best.lcs) best = { lcs, seq: rb };
    }
  }
  if (!best) return { unmatched: a.length, runs: [b.slice()] };
  const rb = best.seq;
  const d = table(rb);
  const matched = new Array<boolean>(rb.length).fill(false);
  for (let i = a.length, j = rb.length; i > 0 && j > 0;) {
    if (a[i - 1] === rb[j - 1]) { matched[j - 1] = true; i--; j--; }
    else if (d[i - 1][j] >= d[i][j - 1]) i--;
    else j--;
  }
  const runs: string[][] = [];
  let run: string[] = [];
  rb.forEach((t, q) => { if (!matched[q]) run.push(t); else if (run.length) { runs.push(run); run = []; } });
  if (run.length) runs.push(run);
  return { unmatched: a.length - best.lcs, runs };
}
