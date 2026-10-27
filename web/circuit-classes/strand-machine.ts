/**
 * A strand as a Turing machine on the address tape.
 *
 * The tape is a tile's address, bottom up: cell 0 holds the tile's type,
 * cell k + 1 holds the link from its level-k ancestor to the level-(k + 1)
 * one, written `Parent/slot`. The cells above the last one written are the
 * ancestors no step has looked at yet.
 *
 * The control is `neighbour` from `core/transducer.ts` with the pairing on
 * top, one strand step per sweep:
 *
 *   A e   at cell 0, reading the tile's type T: the strand came in through
 *         edge e; leave through its partner x under the pairing, go up as U x.
 *   U e   reading `P/s`: edge e of child s of a P. If that edge is glued
 *         inside the P to child edge (s', e'), write `P/s'` and turn down as
 *         D T' e' (T' the type of child s'). Otherwise it is position i of
 *         P's edge j: write `#i` and go on up as U j.
 *   D T e reading `#i` (on a cell left by the climb): entering edge e of a T
 *         from outside, at position i counted from the other side; the child
 *         there is (s, e') = the (n - 1 - i)th part of T's edge e. Write `T/s`
 *         and go down as D T' e'. Reading a type at cell 0: write T, become
 *         A e.
 *
 * Only the A rows depend on the rule and combination; everything else comes
 * from the substitution tables. The machine halts (the strand is a circuit)
 * when it is back in its start state with the tape it started with; it
 * reads past the written tape (an open strand, unless more ancestors are
 * supplied) when U reaches a blank cell.
 *
 * Usage: tsx strand-machine.ts <rule-combo> <level> [root]
 *   prints the machine's size, checks it against `walkStrand` on every
 *   crossing of a level-<level> supertile, and tabulates its circuits by the
 *   highest cell they touch: how many, the longest, and the rows they use.
 */
import { chordPairing, leafOrder, slotsOfType, type TileTypeId } from '../src/core';
import {
  addressFromId,
  childType,
  edgeParts,
  HEX_TYPES,
  locateChildEdge,
  walkStrand,
  type Address,
  type HexType,
} from '../src/core/transducer';

export type Move = -1 | 0 | 1;
export interface Row { readonly write: string; readonly move: Move; readonly next: string }
/** `${state} ${symbol}` -> row; a missing key halts the machine without a circuit. */
export type Machine = Map<string, Row>;

const link = (p: HexType, s: number) => `${p}/${s}`;

/** The rows that do not depend on the pattern: U and D. */
export function substitutionRows(): Machine {
  const m: Machine = new Map();
  for (const P of HEX_TYPES) {
    for (let s = 0; s < 8; s++) {
      const c = childType(P, s);
      if (!c) continue;
      for (let e = 0; e < 6; e++) {
        const loc = locateChildEdge(P, s, e);
        if (loc.kind === 'inside') {
          const ct = childType(P, loc.s) as HexType;
          m.set(`U${e} ${link(P, s)}`, { write: link(P, loc.s), move: -1, next: `D${ct}${loc.e}` });
        } else m.set(`U${e} ${link(P, s)}`, { write: `#${loc.i}`, move: 1, next: `U${loc.j}` });
      }
    }
  }
  for (const T of HEX_TYPES) {
    for (let e = 0; e < 6; e++) {
      const parts = edgeParts(T, e);
      parts.forEach((_, i) => {
        const part = parts[parts.length - 1 - i];
        const ct = childType(T, part.s) as HexType;
        m.set(`D${T}${e} #${i}`, { write: link(T, part.s), move: -1, next: `D${ct}${part.e}` });
      });
      for (const X of HEX_TYPES) m.set(`D${T}${e} ${X}`, { write: T, move: 0, next: `A${e}` });
    }
  }
  return m;
}

/** The pattern's rows: A e reading T. */
export function patternRows(subset: readonly number[], combo: string): Machine {
  const m: Machine = new Map();
  const order = leafOrder('hex');
  order.forEach((t, ti) => {
    const seams = slotsOfType('hex', t, subset);
    const pairing = chordPairing('hex', t, subset, parseInt(combo[ti], 36));
    seams.forEach((seam, k) => {
      const p = pairing[k];
      if (p === undefined || p < 0) return;
      m.set(`A${seam.edge} ${t}`, { write: t, move: 1, next: `U${seams[p].edge}` });
    });
  });
  return m;
}

export function strandMachine(subset: readonly number[], combo: string): Machine {
  return new Map([...substitutionRows(), ...patternRows(subset, combo)]);
}

export const tapeOf = (a: Address): string[] => [a.leaf, ...a.path.map((l) => link(l.parent, l.slot))];

export interface RunResult {
  readonly end: 'circuit' | 'open' | 'halt' | 'cap';
  /** Strand steps (tiles visited) and machine steps. */
  readonly tiles: number;
  readonly steps: number;
  /** The highest cell read. */
  readonly height: number;
  /** The highest cell read on each strand step. */
  readonly profile: number[];
  /** Rows used. */
  readonly rows: Set<string>;
  /** `id entry` of each tile visited. */
  readonly visited: string[];
}

/** Runs from `A entry` on the tile at `a`, until the start configuration comes back. */
export function run(machine: Machine, a: Address, entry: number, cap = 1e7): RunResult {
  const tape = tapeOf(a);
  const start = tape.slice();
  const startState = `A${entry}`;
  let state = startState;
  let head = 0;
  let steps = 0;
  let height = 0;
  let sweep = 0;
  const profile: number[] = [];
  const rows = new Set<string>();
  const visited: string[] = [];
  const idHere = () => tape.slice(1).map((c) => c.split('/')[1]).reverse().join('.');
  while (steps < cap) {
    if (head >= tape.length) return { end: 'open', tiles: visited.length, steps, height: head, profile, rows, visited };
    if (state === startState && head === 0 && steps > 0 && tape.every((c, i) => c === start[i]))
      return { end: 'circuit', tiles: visited.length, steps, height, profile, rows, visited };
    if (state[0] === 'A' && head === 0) {
      if (steps > 0) profile.push(sweep);
      sweep = 0;
      visited.push(`${idHere()} ${state.slice(1)}`);
    }
    const key = `${state} ${tape[head]}`;
    const row = machine.get(key);
    if (!row) return { end: 'halt', tiles: visited.length, steps, height, profile, rows, visited };
    rows.add(key);
    tape[head] = row.write;
    head += row.move;
    state = row.next;
    steps++;
    height = Math.max(height, head);
    sweep = Math.max(sweep, head);
  }
  return { end: 'cap', tiles: visited.length, steps, height, profile, rows, visited };
}

/** Every tile id of a level-n supertile of `root`. */
export function leafIds(root: HexType, n: number): string[] {
  const out: string[] = [];
  const go = (t: HexType, k: number, id: string) => {
    if (k === n) {
      out.push(id);
      return;
    }
    for (let s = 0; s < 8; s++) {
      const c = childType(t, s);
      if (c) go(c, k + 1, id === '' ? `${s}` : `${id}.${s}`);
    }
  };
  go(root, 0, '');
  return out;
}

/**
 * Merges states that behave alike (Moore's partition refinement): two states
 * stay together while, on every symbol, they write the same, move the same
 * way and go to states in the same block. Returns the number of blocks.
 */
export function minimalStates(machine: Machine, used: ReadonlySet<string>): number {
  const rows = [...used].map((k) => {
    const [state, symbol] = k.split(' ');
    return { state, symbol, row: machine.get(k)! };
  });
  const states = [...new Set(rows.map((r) => r.state))];
  let block = new Map(states.map((s) => [s, s[0]]));
  for (;;) {
    const sig = new Map<string, string>();
    for (const s of states) {
      const parts = rows
        .filter((r) => r.state === s)
        .map((r) => `${r.symbol}>${r.row.write},${r.row.move},${block.get(r.row.next) ?? r.row.next}`)
        .sort();
      sig.set(s, `${block.get(s)}|${parts.join(';')}`);
    }
    const ids = new Map<string, string>();
    const next = new Map(states.map((s) => [s, ids.get(sig.get(s)!) ?? (ids.set(sig.get(s)!, String(ids.size)), String(ids.size - 1))]));
    if (new Set(next.values()).size === new Set(block.values()).size) return ids.size;
    block = next;
  }
}

if (process.argv[1]?.endsWith('strand-machine.ts')) {
  const [spec, lvArg, rootArg] = process.argv.slice(2);
  const [rule, combo] = spec.split('-');
  const subset = [...rule].map(Number);
  const level = Number(lvArg);
  const root = (rootArg ?? 'Delta') as HexType;
  const generic = substitutionRows();
  const pattern = patternRows(subset, combo);
  const machine = new Map([...generic, ...pattern]);
  const states = new Set([...machine.keys()].map((k) => k.split(' ')[0]));
  const symbols = new Set([...machine.keys()].map((k) => k.split(' ')[1]));
  console.log(`${spec}: ${states.size} states, ${symbols.size} symbols, ${machine.size} rows (${pattern.size} from the pattern)`);

  const order = leafOrder('hex');
  const matching = Object.fromEntries(order.map((t: TileTypeId, i: number) => [t, parseInt(combo[i], 36)]));
  const seen = new Set<string>();
  const byHeight = new Map<number, { count: number; longest: number; steps: number; rows: Set<string>; profile: number[] }>();
  let checked = 0;
  let open = 0;
  for (const id of leafIds(root, level)) {
    const a = addressFromId(root, id);
    for (const seam of slotsOfType('hex', a.leaf, subset)) {
      if (seen.has(`${id} ${seam.edge}`)) continue;
      const r = run(machine, a, seam.edge);
      for (const v of r.visited) seen.add(v);
      // Against the recursive algorithm.
      if (checked < 400) {
        const w = walkStrand(subset, matching, { address: a, entry: seam.edge }, 1e6);
        const want = w.end === 'circuit' ? 'circuit' : w.end === 'open' ? 'open' : 'halt';
        if (want !== r.end || (want === 'circuit' && w.states.length !== r.tiles)) throw new Error(`${id} ${seam.edge}: machine ${r.end} ${r.tiles}, walkStrand ${w.end} ${w.states.length}`);
        checked++;
      }
      if (r.end !== 'circuit') {
        open++;
        continue;
      }
      const h = byHeight.get(r.height) ?? { count: 0, longest: 0, steps: 0, rows: new Set<string>(), profile: [] };
      h.count++;
      if (r.tiles > h.longest) {
        h.longest = r.tiles;
        h.steps = r.steps;
        h.profile = r.profile;
      }
      for (const k of r.rows) h.rows.add(k);
      byHeight.set(r.height, h);
    }
  }
  console.log(`checked against walkStrand: ${checked} strands agree; ${open} open strands`);
  console.log('height  circuits  longest (tiles)  machine steps  rows used  states after merging');
  const cumulative = new Set<string>();
  for (const [h, v] of [...byHeight].sort((a, b) => a[0] - b[0])) {
    for (const k of v.rows) cumulative.add(k);
    console.log(`${String(h).padStart(6)}  ${String(v.count).padStart(8)}  ${String(v.longest).padStart(15)}  ${String(v.steps).padStart(13)}  ${String(cumulative.size).padStart(9)}  ${String(minimalStates(machine, cumulative)).padStart(6)}`);
  }
  for (const [h, v] of [...byHeight].sort((a, b) => a[0] - b[0]))
    if (v.longest > 2) console.log(`height ${h}, longest circuit, highest cell per strand step: ${v.profile.join('')}`);
}
