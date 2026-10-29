/**
 * Combinatorial coordinates and the neighbour transducer for the Spectre
 * hexagons, after Simon Tatham's "Combinatorial coordinates for the aperiodic
 * Spectre tiling" and "Beyond the wall" (quasiblog, 2024).
 *
 * No geometry. A tile is an ADDRESS: its type, which numbered child of which
 * parent type it is, which child of which grandparent type that is, and so
 * on upward. Crossing an edge is a calculation on the address alone, from
 * three tables of the substitution (`data/hexSubstitution.json`, extracted
 * from exact geometry by `fass-theorem/01-tables.ts`):
 *
 *   rules[P][s]   the type of child s (0..7) of a parent of type P
 *   G[P]          which pairs of child edges (s, e) meet INSIDE a P
 *   B[P][j]       the child edges that make up edge j of P, in order
 *   classes[T][j] the class of edge j of T; an edge of class +c meets one of -c
 *
 * `neighbour` is the recursive algorithm: climb the address until the edge
 * being crossed is inside some ancestor's expansion, then come back down.
 * `buildTransducer` turns that into a finite-state transducer by Tatham's
 * construction (adjacency recogniser, reinterpreted as a non-deterministic
 * transducer, made deterministic with pending output). `strandStep` adds a
 * rule and a pairing on top: inside a tile the strand goes to the partner
 * crossing, then crosses that edge with the transducer.
 *
 * Everything here is the hex family (the nine hexagon metatiles). The
 * Spectre itself is one more layer (hexagon to Spectre), which the Explorer
 * does geometrically.
 */
import tables from './data/hexSubstitution.json';
import type { TileTypeId } from './families';
import { chordPairing, slotsOfType } from './automaton';

export type HexType = 'Gamma' | 'Delta' | 'Theta' | 'Lambda' | 'Xi' | 'Pi' | 'Sigma' | 'Phi' | 'Psi';
export const HEX_TYPES: readonly HexType[] = ['Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi'];


interface ChildEdge { readonly s: number; readonly e: number }
const RULES = tables.rules as Readonly<Record<string, readonly string[]>>;
const CLASSES = tables.classes as Readonly<Record<string, readonly number[]>>;
const B = tables.B as Readonly<Record<string, readonly (readonly ChildEdge[])[]>>;
const G = tables.G as unknown as Readonly<Record<string, readonly (readonly [ChildEdge, ChildEdge])[]>>;

export const childType = (parent: HexType, slot: number): HexType | null => {
  const t = RULES[parent][slot];
  return t === 'null' ? null : (t as HexType);
};
export const edgeClass = (type: HexType, edge: number): number => CLASSES[type][edge];
/** The child edges making up edge j of a supertile of type P, in order round the supertile. */
export const edgeParts = (type: HexType, edge: number): readonly ChildEdge[] => B[type][edge];
/** The glued pairs of child edges inside a P. */
export const gluedPairs = (type: HexType): readonly (readonly [ChildEdge, ChildEdge])[] => G[type];

type Located = { readonly kind: 'inside'; readonly s: number; readonly e: number } | { readonly kind: 'outside'; readonly j: number; readonly i: number; readonly n: number };
/** Every child edge of every type, located once: parent, then slot * 6 + edge. */
const LOCATED = new Map<string, (Located | undefined)[]>();

function locate(parent: HexType, s: number, e: number): Located | undefined {
  for (const [a, b] of G[parent]) {
    if (a.s === s && a.e === e) return { kind: 'inside', s: b.s, e: b.e };
    if (b.s === s && b.e === e) return { kind: 'inside', s: a.s, e: a.e };
  }
  for (let j = 0; j < 6; j++) {
    const arc = B[parent][j];
    const i = arc.findIndex((c) => c.s === s && c.e === e);
    if (i >= 0) return { kind: 'outside', j, i, n: arc.length };
  }
  return undefined;
}

/** Where child edge (s, e) sits in a parent of type P: inside, glued to another child edge, or on parent edge j at position i of n. */
export function locateChildEdge(parent: HexType, s: number, e: number): Located {
  let row = LOCATED.get(parent);
  if (!row) {
    row = Array.from({ length: 48 }, (_, k) => locate(parent, Math.floor(k / 6), k % 6));
    LOCATED.set(parent, row);
  }
  const loc = row[s * 6 + e];
  if (!loc) throw new Error(`child edge ${s}.${e} is not in the tables of ${parent}`);
  return loc;
}

// ---------------------------------------------------------------------------
// Addresses
// ---------------------------------------------------------------------------

/** One link of an address: this tile is child `slot` of a parent of type `parent`. */
export interface Link { readonly slot: number; readonly parent: HexType }

/**
 * A tile's address, bottom up: its own type, then the link to its parent,
 * the parent's link to the grandparent, and so on. A finite address describes
 * a tile inside a supertile of type `path[path.length - 1].parent`.
 */
export interface Address { readonly leaf: HexType; readonly path: readonly Link[] }

/** The type of the level-k ancestor (0 = the tile itself). */
export function typeAt(a: Address, level: number): HexType {
  return level === 0 ? a.leaf : a.path[level - 1].parent;
}

/** From a root type and a flatten() id such as '3.7.0' (slots from the root down). */
export function addressFromId(root: HexType, id: string): Address {
  const slots = id === '' ? [] : id.split('.').map(Number);
  const links: Link[] = [];
  let t: HexType = root;
  for (const s of slots) {
    links.push({ slot: s, parent: t });
    const c = childType(t, s);
    if (!c) throw new Error(`no child ${s} of ${t}`);
    t = c;
  }
  return { leaf: t, path: links.reverse() };
}

/** The flatten() id of an address (slots from the root down). */
export function idOf(a: Address): string {
  return [...a.path].reverse().map((l) => l.slot).join('.');
}

/** 'Xi, slot 5 of Delta, slot 1 of Gamma'. */
export function formatAddress(a: Address): string {
  return [a.leaf, ...a.path.map((l) => `slot ${l.slot} of ${l.parent}`)].join(', ');
}

/** The inverse of formatAddress; null unless every link is a slot of that parent type holding the type below. */
export function parseAddress(text: string): Address | null {
  const parts = text.split(',').map((x) => x.trim()).filter(Boolean);
  if (!parts.length) return null;
  const leaf = HEX_TYPES.find((t) => t.toLowerCase() === parts[0].toLowerCase());
  if (!leaf) return null;
  const path: Link[] = [];
  let t: HexType = leaf;
  for (const p of parts.slice(1)) {
    const m = /^slot ([0-7]) of ([A-Za-z]+)$/i.exec(p);
    if (!m) return null;
    const parent = HEX_TYPES.find((x) => x.toLowerCase() === m[2].toLowerCase());
    if (!parent || childType(parent, Number(m[1])) !== t) return null;
    path.push({ slot: Number(m[1]), parent });
    t = parent;
  }
  return { leaf, path };
}

export const sameAddress = (a: Address, b: Address): boolean =>
  a.leaf === b.leaf && a.path.length === b.path.length && a.path.every((l, i) => l.slot === b.path[i].slot && l.parent === b.path[i].parent);

// ---------------------------------------------------------------------------
// The recursive neighbour algorithm, with a trace
// ---------------------------------------------------------------------------

export type TraceStep =
  | { kind: 'up'; level: number; type: HexType; edge: number; parent: HexType; slot: number; parentEdge: number; i: number; n: number }
  | { kind: 'inside'; level: number; parent: HexType; from: { s: number; e: number }; to: { s: number; e: number } }
  | { kind: 'down'; level: number; type: HexType; edge: number; i: number; n: number; child: { s: number; e: number }; childType: HexType }
  | { kind: 'top'; level: number; type: HexType; edge: number };

export type Neighbour =
  | { ok: true; address: Address; edge: number; trace: readonly TraceStep[]; /** the level at which the crossing was inside an expansion */ level: number }
  | { ok: false; trace: readonly TraceStep[]; /** the level whose parent is missing */ level: number };

/**
 * The tile across edge `edge` of the tile at `address`, and the edge of that
 * tile we arrive through. Climbs while the edge is on the outside of each
 * ancestor's expansion, crosses inside the first ancestor where it is not,
 * then descends the matching sub-edges in reverse order.
 */
export function neighbour(address: Address, edge: number): Neighbour {
  const trace: TraceStep[] = [];
  const climb: { i: number; n: number }[] = [];
  let k = 0;
  let e = edge;
  for (;;) {
    const t = typeAt(address, k);
    if (k >= address.path.length) {
      trace.push({ kind: 'top', level: k, type: t, edge: e });
      return { ok: false, trace, level: k };
    }
    const { slot, parent } = address.path[k];
    const loc = locateChildEdge(parent, slot, e);
    if (loc.kind === 'inside') {
      trace.push({ kind: 'inside', level: k + 1, parent, from: { s: slot, e }, to: { s: loc.s, e: loc.e } });
      // Descend: the path above level k is unchanged, the slot at level k is loc.s,
      // and below it each level's slot comes from the reversed sub-edge position.
      const links: Link[] = address.path.slice(k + 1);
      let type: HexType = childType(parent, loc.s) as HexType;
      let entry = loc.e;
      const newLinks: Link[] = [{ slot: loc.s, parent }];
      for (let m = k - 1; m >= 0; m--) {
        const { i, n } = climb[m];
        const part = B[type][entry][n - 1 - i];
        const ct = childType(type, part.s) as HexType;
        trace.push({ kind: 'down', level: m + 1, type, edge: entry, i: n - 1 - i, n, child: { s: part.s, e: part.e }, childType: ct });
        newLinks.unshift({ slot: part.s, parent: type });
        type = ct;
        entry = part.e;
      }
      return { ok: true, address: { leaf: type, path: [...newLinks, ...links] }, edge: entry, trace, level: k + 1 };
    }
    trace.push({ kind: 'up', level: k, type: t, edge: e, parent, slot, parentEdge: loc.j, i: loc.i, n: loc.n });
    climb[k] = { i: loc.i, n: loc.n };
    e = loc.j;
    k++;
  }
}

/** `neighbour` without the trace, for walks that take many steps: the same tile and edge, or the level whose parent is missing. */
export function neighbourOf(address: Address, edge: number): { ok: true; address: Address; edge: number; level: number } | { ok: false; level: number } {
  const climb: Located[] = [];
  let e = edge;
  for (let k = 0; ; k++) {
    if (k >= address.path.length) return { ok: false, level: k };
    const { slot, parent } = address.path[k];
    const loc = locateChildEdge(parent, slot, e);
    if (loc.kind === 'inside') {
      const path: Link[] = address.path.slice(k);
      path[0] = { slot: loc.s, parent };
      let type = childType(parent, loc.s) as HexType;
      let entry = loc.e;
      for (let m = k - 1; m >= 0; m--) {
        const { i, n } = climb[m] as { i: number; n: number };
        const part = B[type][entry][n - 1 - i];
        path.unshift({ slot: part.s, parent: type });
        type = childType(type, part.s) as HexType;
        entry = part.e;
      }
      return { ok: true, address: { leaf: type, path }, edge: entry, level: k + 1 };
    }
    climb[k] = loc;
    e = loc.j;
  }
}

// ---------------------------------------------------------------------------
// The finite-state transducer
// ---------------------------------------------------------------------------

/** An input or output symbol: the first is 'type:edge', the rest 'parent:slot'. */
export type Sym = string;
export const sym = (type: HexType, n: number): Sym => `${type}:${n}`;
export const parseSym = (s: Sym): { type: HexType; n: number } => {
  const [t, n] = s.split(':');
  return { type: t as HexType, n: Number(n) };
};

/** Address and edge as the symbol sequence the transducer reads. */
export function symbolsOf(a: Address, edge: number): Sym[] {
  return [sym(a.leaf, edge), ...a.path.map((l) => sym(l.parent, l.slot))];
}
/** Back from an output symbol sequence to an address and entry edge. */
export function addressOfSymbols(out: readonly Sym[]): { address: Address; edge: number } {
  const first = parseSym(out[0]);
  return { address: { leaf: first.type, path: out.slice(1).map((s) => { const p = parseSym(s); return { slot: p.n, parent: p.type }; }) }, edge: first.n };
}

/**
 * A state of the adjacency recogniser: either we are matching a pair of
 * tiles at the same level, 'pair' (left leaving edge j of a T, right entering
 * edge j' of a U), or the two strings have met inside an expansion and must
 * now agree symbol for symbol, 'acc' (both are a P).
 */
type NfaState = { kind: 'start' } | { kind: 'pair'; T: HexType; j: number; U: HexType; jj: number } | { kind: 'acc'; P: HexType };
const nfaKey = (s: NfaState): string => (s.kind === 'start' ? 'start' : s.kind === 'pair' ? `${s.T}.${s.j}|${s.U}.${s.jj}` : `acc ${s.P}`);
const nfaOf = (key: string): NfaState => {
  if (key === 'start') return { kind: 'start' };
  if (key.startsWith('acc ')) return { kind: 'acc', P: key.slice(4) as HexType };
  const [l, r] = key.split('|');
  const [T, j] = l.split('.');
  const [U, jj] = r.split('.');
  return { kind: 'pair', T: T as HexType, j: Number(j), U: U as HexType, jj: Number(jj) };
};

/** All transitions of the non-deterministic transducer from one state on one input symbol. */
function nfaStep(state: NfaState, input: Sym): { to: NfaState; out: Sym }[] {
  const { type, n } = parseSym(input);
  const res: { to: NfaState; out: Sym }[] = [];
  if (state.kind === 'start') {
    const c = CLASSES[type][n];
    for (const U of HEX_TYPES) for (let jj = 0; jj < 6; jj++) if (CLASSES[U][jj] === -c) res.push({ to: { kind: 'pair', T: type, j: n, U, jj }, out: sym(U, jj) });
    return res;
  }
  if (state.kind === 'acc') {
    if (childType(type, n) === state.P) res.push({ to: { kind: 'acc', P: type }, out: input });
    return res;
  }
  // pair: input says the left T is child n of a `type`
  if (childType(type, n) !== state.T) return res;
  const loc = locateChildEdge(type, n, state.j);
  if (loc.kind === 'inside') {
    if (childType(type, loc.s) === state.U && loc.e === state.jj) res.push({ to: { kind: 'acc', P: type }, out: sym(type, loc.s) });
    return res;
  }
  const c = CLASSES[type][loc.j];
  for (const P2 of HEX_TYPES) for (let J2 = 0; J2 < 6; J2++) {
    if (CLASSES[P2][J2] !== -c) continue;
    const arc = B[P2][J2];
    const part = arc[loc.n - 1 - loc.i];
    if (childType(P2, part.s) === state.U && part.e === state.jj) res.push({ to: { kind: 'pair', T: type, j: loc.j, U: P2, jj: J2 }, out: sym(P2, part.s) });
  }
  return res;
}

export interface DfaItem { readonly nfa: string; readonly pending: readonly Sym[] }
export interface DfaState {
  readonly id: number;
  readonly items: readonly DfaItem[];
  /** Every possibility has met inside an expansion with nothing held back: the neighbour is known. */
  readonly accepting: boolean;
  /** input symbol -> [next state id, output emitted] */
  readonly next: ReadonlyMap<Sym, readonly [number, readonly Sym[]]>;
}
export interface Transducer { readonly states: readonly DfaState[]; readonly start: number; readonly alphabet: readonly Sym[] }

const stateKey = (items: readonly DfaItem[]): string => items.map((it) => `${it.nfa}#${it.pending.join(',')}`).sort().join(';');

/**
 * Tatham's construction: the deterministic transducer whose states are sets
 * of (recogniser state, pending output). On each input it follows every
 * possibility, emits the longest output prefix all of them agree on, and
 * keeps the rest pending. Builds the reachable part only.
 */
export function buildTransducer(limits = { states: 20000, pending: 24 }): Transducer {
  const alphabet: Sym[] = [];
  for (const T of HEX_TYPES) for (let j = 0; j < 6; j++) alphabet.push(sym(T, j));
  for (const P of HEX_TYPES) for (let s = 0; s < 8; s++) if (childType(P, s)) alphabet.push(sym(P, s));
  const ids = new Map<string, number>();
  const states: { id: number; items: DfaItem[]; accepting: boolean; next: Map<Sym, [number, Sym[]]> }[] = [];
  const intern = (items: DfaItem[]): number => {
    const key = stateKey(items);
    let id = ids.get(key);
    if (id === undefined) {
      id = states.length;
      ids.set(key, id);
      states.push({ id, items, accepting: items.length > 0 && items.every((it) => it.nfa.startsWith('acc ') && it.pending.length === 0), next: new Map() });
      if (states.length > limits.states) throw new Error('transducer construction did not terminate (state cap)');
    }
    return id;
  };
  const start = intern([{ nfa: 'start', pending: [] }]);
  for (let q = 0; q < states.length; q++) {
    const st = states[q];
    for (const input of alphabet) {
      const nextItems = new Map<string, DfaItem>();
      for (const it of st.items) {
        for (const tr of nfaStep(nfaOf(it.nfa), input)) {
          const item: DfaItem = { nfa: nfaKey(tr.to), pending: [...it.pending, tr.out] };
          const k = `${item.nfa}#${item.pending.join(',')}`;
          if (!nextItems.has(k)) nextItems.set(k, item);
        }
      }
      if (nextItems.size === 0) continue;
      const list = [...nextItems.values()];
      // the common prefix of every pending output is certain: emit it
      let common = 0;
      for (;;) {
        const s0 = list[0].pending[common];
        if (s0 === undefined || list.some((it) => it.pending[common] !== s0)) break;
        common++;
      }
      const emitted = list[0].pending.slice(0, common);
      const trimmed = list.map((it) => ({ nfa: it.nfa, pending: it.pending.slice(common) }));
      if (trimmed.some((it) => it.pending.length > limits.pending)) throw new Error('transducer construction did not terminate (pending output grows)');
      st.next.set(input, [intern(trimmed), emitted]);
    }
  }
  return { states, start, alphabet };
}

let cached: Transducer | null = null;
/** The hexagon transducer, built once. */
export function hexTransducer(): Transducer {
  if (!cached) cached = buildTransducer();
  return cached;
}

export interface RunStep { readonly input: Sym; readonly from: number; readonly to: number; readonly emitted: readonly Sym[] }
export interface Run { readonly steps: readonly RunStep[]; readonly output: readonly Sym[]; readonly state: number; readonly accepted: boolean; readonly stuck: boolean }

/** Feed an address through the transducer, one symbol at a time. */
export function runTransducer(tr: Transducer, a: Address, edge: number): Run {
  const steps: RunStep[] = [];
  const output: Sym[] = [];
  let q = tr.start;
  for (const input of symbolsOf(a, edge)) {
    const n = tr.states[q].next.get(input);
    if (!n) return { steps, output, state: q, accepted: false, stuck: true };
    steps.push({ input, from: q, to: n[0], emitted: n[1] });
    output.push(...n[1]);
    q = n[0];
  }
  return { steps, output, state: q, accepted: tr.states[q].accepting, stuck: false };
}

/**
 * Tatham's infinite wall: an address that is `prefix` then `period` repeated
 * for ever. Runs the transducer until (state, position in the period) repeats,
 * and returns the output in the same form, or null if it jams.
 */
export function runPeriodic(tr: Transducer, prefix: readonly Sym[], period: readonly Sym[], cap = 10000):
  { prefix: Sym[]; period: Sym[]; steps: RunStep[] } | null {
  const steps: RunStep[] = [];
  const out: Sym[] = [];
  let q = tr.start;
  const feed = (input: Sym): boolean => {
    const n = tr.states[q].next.get(input);
    if (!n) return false;
    steps.push({ input, from: q, to: n[0], emitted: n[1] });
    out.push(...n[1]);
    q = n[0];
    return true;
  };
  for (const s of prefix) if (!feed(s)) return null;
  const seen = new Map<string, number>(); // (state, pos in period) -> output length when first seen
  for (let i = 0; i < cap; i++) {
    const pos = i % period.length;
    const key = `${q}@${pos}`;
    const before = seen.get(key);
    if (before !== undefined) return { prefix: out.slice(0, before), period: out.slice(before), steps };
    seen.set(key, out.length);
    if (!feed(period[pos])) return null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// A pattern on top: strands
// ---------------------------------------------------------------------------

export interface StrandState { readonly address: Address; /** the edge the strand came in through */ readonly entry: number }

export type StrandStep =
  | { ok: true; /** the edge the strand leaves through, after the pairing inside the tile */ exit: number; neighbour: Extract<Neighbour, { ok: true }>; next: StrandState }
  | { ok: false; reason: 'no-crossing' | 'unpaired' | 'needs-parent'; exit?: number; neighbour?: Neighbour };

/**
 * One step of a strand: inside the tile, from the entry crossing to its
 * partner under the pairing (`matching` = matching index per type, as the
 * combination digits select); then across that edge with the recursive
 * algorithm. Only edges of selected classes carry crossings.
 */
export function strandStep(subset: readonly number[], matching: Readonly<Record<string, number>>, state: StrandState): StrandStep {
  const seams = slotsOfType('hex', state.address.leaf as TileTypeId, subset);
  const seam = seams.findIndex((s) => s.edge === state.entry);
  if (seam < 0) return { ok: false, reason: 'no-crossing' };
  const partner = chordPairing('hex', state.address.leaf as TileTypeId, subset, matching[state.address.leaf] ?? 0)[seam];
  if (partner === undefined || partner < 0) return { ok: false, reason: 'unpaired' };
  const exit = seams[partner].edge;
  const nb = neighbour(state.address, exit);
  if (!nb.ok) return { ok: false, reason: 'needs-parent', exit, neighbour: nb };
  return { ok: true, exit, neighbour: nb, next: { address: nb.address, entry: nb.edge } };
}

export interface StrandWalk {
  readonly states: readonly StrandState[];
  readonly exits: readonly number[];
  /** 'circuit' when the strand returned to where it started; 'open' when it left the top supertile; 'cap' when it ran out of steps. */
  readonly end: 'circuit' | 'open' | 'cap' | 'unpaired';
}

/** Follow a strand until it closes, leaves the top supertile, or hits `cap` steps. */
export function walkStrand(subset: readonly number[], matching: Readonly<Record<string, number>>, start: StrandState, cap = 100000): StrandWalk {
  const states: StrandState[] = [start];
  const exits: number[] = [];
  let cur = start;
  for (let i = 0; i < cap; i++) {
    const st = strandStep(subset, matching, cur);
    if (!st.ok) return { states, exits, end: st.reason === 'needs-parent' ? 'open' : 'unpaired' };
    exits.push(st.exit);
    cur = st.next;
    if (sameAddress(cur.address, start.address) && cur.entry === start.entry) return { states, exits, end: 'circuit' };
    states.push(cur);
  }
  return { states, exits, end: 'cap' };
}
