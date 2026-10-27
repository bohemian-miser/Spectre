/**
 * The walker's view as a link: the pattern, the mode, where the strand
 * starts, and in the landings mode every choice made (as a tree) and which
 * one is being looked at. Opening the link replays the choices, so the same
 * walk, the same branches and the same current point come back.
 *
 *   r=023468 &m=0.0.0.1.0.0.0.0.0 &s=Delta &e=4
 *   &f=4:0.4.0.1        start on this tile of a level-4 Delta instead of a bare tile
 *   &t=0-Phi5_1-Psi4    choice i+1 is landing Phi 5 taken at node 0, …
 *   &c=2 &w=1 &mode=a   current node, whole tree open, choose-each-ancestor mode
 */
import { HEX_TYPES, type HexType } from '../../core';

export interface Choice { readonly parent: number; readonly key: string }

export interface WalkerLink {
  readonly subset: readonly number[];
  readonly matching: readonly number[];
  readonly mode: 'landings' | 'ancestors';
  readonly start: HexType;
  readonly edge: number | null;
  /** A start on a tile of a level-n Delta (the longest-circuit finder), by slot path. */
  readonly find: { readonly level: number; readonly id: string } | null;
  readonly choices: readonly Choice[];
  readonly current: number;
  readonly whole: boolean;
}

/** `Phi 5` -> `Phi5`, `closes` -> `c`, `open` -> `o`. */
const keyOut = (k: string): string => (k === 'closes' ? 'c' : k === 'open' ? 'o' : k.replace(' ', ''));
const keyIn = (k: string): string | null => {
  if (k === 'c') return 'closes';
  if (k === 'o') return 'open';
  const m = /^([A-Za-z]+)([0-5])$/.exec(k);
  return m && HEX_TYPES.includes(m[1] as HexType) ? `${m[1]} ${m[2]}` : null;
};

export function encodeLink(l: WalkerLink): string {
  const q = new URLSearchParams();
  q.set('r', l.subset.join(''));
  q.set('m', l.matching.join('.'));
  if (l.mode === 'ancestors') q.set('mode', 'a');
  q.set('s', l.start);
  if (l.edge !== null) q.set('e', String(l.edge));
  if (l.find) q.set('f', `${l.find.level}:${l.find.id}`);
  if (l.mode === 'landings' && l.choices.length) {
    q.set('t', l.choices.map((c) => `${c.parent}-${keyOut(c.key)}`).join('_'));
    q.set('c', String(l.current));
  }
  if (l.whole) q.set('w', '1');
  return q.toString();
}

/** The link in a query string, or null when it does not name a pattern. Anything malformed is dropped. */
export function decodeLink(search: string): WalkerLink | null {
  const q = new URLSearchParams(search);
  const r = q.get('r');
  const m = q.get('m');
  if (!r || !/^\d+$/.test(r) || !m) return null;
  const matching = m.split('.').map(Number);
  if (matching.some((x) => !Number.isInteger(x) || x < 0)) return null;
  const s = q.get('s') as HexType | null;
  const start = s && HEX_TYPES.includes(s) ? s : 'Delta';
  const e = q.get('e');
  const edge = e !== null && /^[0-5]$/.test(e) ? Number(e) : null;
  const f = /^(\d+):([0-7](\.[0-7])*)$/.exec(q.get('f') ?? '');
  const choices: Choice[] = [];
  for (const part of (q.get('t') ?? '').split('_').filter(Boolean)) {
    const mm = /^(\d+)-(.+)$/.exec(part);
    const key = mm ? keyIn(mm[2]) : null;
    if (!mm || !key || Number(mm[1]) > choices.length) break;
    choices.push({ parent: Number(mm[1]), key });
  }
  const c = Number(q.get('c') ?? 0);
  return {
    subset: [...r].map(Number),
    matching,
    mode: q.get('mode') === 'a' ? 'ancestors' : 'landings',
    start,
    edge,
    find: f ? { level: Number(f[1]), id: f[2] } : null,
    choices,
    current: Number.isInteger(c) && c >= 0 && c <= choices.length ? c : choices.length,
    whole: q.get('w') === '1',
  };
}
