/** Loading the Foundations page's data (`pageData.ts`), and the page's address. */
import type { PageCombo, PageIndex } from './pageData';

export const RULE = '023468';
export const SUBSET: readonly number[] = [...RULE].map(Number);

export function foundationsDir(base: string): string {
  return `${base.endsWith('/') ? base : `${base}/`}data/foundations/hex-${RULE}/`;
}

async function load<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`the server answered ${res.status}`);
  return (await res.json()) as T;
}

export const loadIndex = (base: string, signal?: AbortSignal): Promise<PageIndex> => load(`${foundationsDir(base)}index.json`, signal);
export const loadCombo = (base: string, combo: string, signal?: AbortSignal): Promise<PageCombo> => load(`${foundationsDir(base)}${combo}.json`, signal);

export interface Address {
  readonly view: 'combos' | 'monsters';
  readonly combo: string | null;
  readonly circuit: number | null;
}

export function readAddress(search: string): Address {
  const q = new URLSearchParams(search);
  const combo = q.get('combo');
  const circuit = q.get('circuit');
  return {
    view: q.get('view') === 'monsters' ? 'monsters' : 'combos',
    combo: combo && /^[0-9a-z]{9}$/.test(combo) ? combo : null,
    circuit: circuit && /^\d+$/.test(circuit) ? Number(circuit) : null,
  };
}

export function writeAddress(a: Address): string {
  const q = new URLSearchParams();
  if (a.view === 'monsters') q.set('view', 'monsters');
  if (a.combo) q.set('combo', a.combo);
  if (a.circuit !== null) q.set('circuit', String(a.circuit));
  const s = q.toString();
  return s ? `?${s}` : '';
}

const root = (base: string): string => (base.endsWith('/') ? base : `${base}/`);

/** The Harmonics page reading the combination up to `level`. */
export const harmonicsHref = (base: string, combo: string, level: number): string =>
  `${root(base)}harmonics.html?rule=${RULE}&combo=${combo}&level=${level}`;

/** The Build-up page on the circuit of this many tiles closing at `level`. */
export const buildupHref = (base: string, combo: string, level: number, tiles: number): string =>
  `${root(base)}buildup.html?rule=${RULE}&combo=${combo}&level=${level}&circuit=${tiles}`;

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
