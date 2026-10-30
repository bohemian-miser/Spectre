/** Loading the Foundations page's data (`pageData.ts`), and the page's address. */
import { validEdgeSubsets } from '../../core';
import type { PageCombo, PageIndex } from './pageData';

/** The rule whose combinations are precomputed and shown first. */
export const RULE = '023468';
export const SUBSET: readonly number[] = [...RULE].map(Number);
export const subsetOf = (rule: string): number[] => [...rule].map(Number);

export function foundationsDir(base: string, rule = RULE): string {
  return `${base.endsWith('/') ? base : `${base}/`}data/foundations/hex-${rule}/`;
}

async function fetchJson<T>(url: string, signal: AbortSignal | undefined, cache: RequestCache): Promise<T> {
  const res = await fetch(url, { signal, cache });
  if (!res.ok) throw new Error(`the server answered ${res.status}`);
  return (await res.json()) as T;
}

/**
 * Reads a data file, revalidating any copy the browser holds; when the copy
 * it gets is in an older shape than this page reads (`fresh` false), reads
 * it once more past the cache, and gives up with a clear error if it is
 * still old.
 */
async function load<T>(url: string, signal: AbortSignal | undefined, fresh: (x: T) => boolean): Promise<T> {
  const first = await fetchJson<T>(url, signal, 'no-cache');
  if (fresh(first)) return first;
  const again = await fetchJson<T>(url, signal, 'reload');
  if (fresh(again)) return again;
  throw new Error(`${url} is in an older format than this page reads; reload the page`);
}

/** A combination file of the current shape: every foundational row has its ten fields (the nugget flag last), every harmonic row its nine (the place drawn last). */
export const freshCombo = (p: PageCombo): boolean =>
  Array.isArray(p.found) && p.found.every((f) => f.length >= 10) && Array.isArray(p.harm) && p.harm.every((h) => h.length >= 9) && Array.isArray(p.tails);
/** An index of the current shape: every row has its flags. */
export const freshIndex = (i: PageIndex): boolean => Array.isArray(i.combos) && i.combos.every((r) => Array.isArray(r.flags));

/** A rule's precomputed index, or null when the rule has none. */
export async function loadIndex(base: string, rule = RULE, signal?: AbortSignal): Promise<PageIndex | null> {
  const url = `${foundationsDir(base, rule)}index.json`;
  let first: PageIndex;
  try {
    first = await fetchJson<PageIndex>(url, signal, 'no-cache');
  } catch (e) {
    if (signal?.aborted) throw e;
    return null;
  }
  return freshIndex(first) ? first : load<PageIndex>(url, signal, freshIndex);
}
export const loadCombo = (base: string, combo: string, signal?: AbortSignal, rule = RULE): Promise<PageCombo> =>
  load<PageCombo>(`${foundationsDir(base, rule)}${combo}.json`, signal, freshCombo);

export interface Address {
  readonly view: 'combos' | 'monsters';
  readonly rule: string;
  readonly combo: string | null;
  readonly circuit: number | null;
  /** Analysed live to this level, rather than read from precomputed data. */
  readonly level: number | null;
}

let rules: string[] | null = null;
/** The hexagon rules a combination can be chosen in, as their classes. */
export const validRules = (): string[] => (rules ??= validEdgeSubsets('hex').filter((r) => r.edges.length > 0).map((r) => r.edges.join('')));

export function readAddress(search: string): Address {
  const q = new URLSearchParams(search);
  const combo = q.get('combo');
  const circuit = q.get('circuit');
  const rule = q.get('rule');
  const level = q.get('level');
  return {
    view: q.get('view') === 'monsters' ? 'monsters' : 'combos',
    rule: rule && validRules().includes(rule) ? rule : RULE,
    combo: combo && /^[0-9a-z]{9}$/.test(combo) ? combo : null,
    circuit: circuit && /^\d+$/.test(circuit) ? Number(circuit) : null,
    level: level && /^\d+$/.test(level) ? Math.min(12, Math.max(3, Number(level))) : null,
  };
}

export function writeAddress(a: Address): string {
  const q = new URLSearchParams();
  if (a.view === 'monsters') q.set('view', 'monsters');
  if (a.rule !== RULE) q.set('rule', a.rule);
  if (a.combo) q.set('combo', a.combo);
  if (a.level !== null) q.set('level', String(a.level));
  if (a.circuit !== null) q.set('circuit', String(a.circuit));
  const s = q.toString();
  return s ? `?${s}` : '';
}

const root = (base: string): string => (base.endsWith('/') ? base : `${base}/`);

/** The Harmonics page reading the combination up to `level`, opened on a circuit (and with it its chain) when one is named. */
export const harmonicsHref = (base: string, combo: string, level: number, rule = RULE, circuit?: { level: number; length: number }): string =>
  `${root(base)}harmonics.html?rule=${rule}&combo=${combo}&level=${level}${circuit ? `&c=${circuit.level}-${circuit.length}` : ''}`;

/** The Build-up page on the circuit of this many tiles closing at `level`. */
export const buildupHref = (base: string, combo: string, level: number, tiles: number, rule = RULE): string =>
  `${root(base)}buildup.html?rule=${rule}&combo=${combo}&level=${level}&circuit=${tiles}`;

export const nf = (n: number): string => n.toLocaleString('en-US');

/** Tiles in a few characters: 2,079, 14.7k, 171k, 1.83M. */
export function compact(n: number): string {
  if (n < 10000) return nf(n);
  if (n < 1e6) return `${n < 1e5 ? (n / 1e3).toFixed(1) : Math.round(n / 1e3)}k`;
  if (n < 1e9) return `${(n / 1e6).toPrecision(3)}M`;
  return `${(n / 1e9).toPrecision(3)}B`;
}

export const pct = (x: number): string => `${(100 * x).toFixed(1)}%`;

/** Child slots written with spaces: 147 → 1 4 7. */
export const slots = (family: string): string => [...family].join(' ');
