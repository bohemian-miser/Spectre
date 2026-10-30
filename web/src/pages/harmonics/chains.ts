/**
 * The circuits of a combination as chains: each circuit two levels above
 * the one before, its harmonic.
 *
 * Circuit B is a harmonic of circuit A when B is born two levels above A,
 * runs through the same children of its birth supertile (the same family),
 * and B read at level k + 2 is A read at level k for every k from `floor`
 * up to A's top, at least A's top two levels. Below `floor` the two may
 * differ: they differ by back-and-forth runs across seams, which grow with
 * the circuit (the floor-aware relation of `foundations/foundations.ts`).
 * Where a level was too long to read for either, the agreement is taken as
 * far down as both were read.
 *
 * A chain is a connected set of circuits under that relation, ordered by
 * level. Two circuits two levels apart that agree only at the top levels,
 * not as far down as the floor, are a near link between their chains.
 */
import { sameCyclic, type Reading } from './readings';

/** What a chain needs of a circuit. */
export interface ChainCircuit {
  readonly level: number;
  readonly length: number;
  readonly family: string;
  readonly readings: readonly Reading[];
}

/** Levels below which a harmonic may differ from its fundamental. */
export const FLOOR = 2;
/** Readings longer than this are compared by length only. */
const MAX_TOKENS = 60000;

export interface Agreement {
  /** The lowest level of A from which every level up to A's top agrees (A's level when its top differs). */
  readonly from: number;
  /** Whether the agreement reaches the lowest level both are read at, and that level is above `from`'s floor. */
  readonly limited: boolean;
}

/** How far down B (born two levels above A) reads as A. */
export function agreement(a: ChainCircuit, b: ChainCircuit): Agreement {
  for (let k = a.level - 1; k >= 0; k--) {
    const x = a.readings.find((r) => r.level === k);
    const y = b.readings.find((r) => r.level === k + 2);
    if (!x || !y) return { from: k + 1, limited: true };
    const same = x.tokens.length > MAX_TOKENS || y.tokens.length > MAX_TOKENS ? x.tokens.length === y.tokens.length : sameCyclic(x.tokens, y.tokens);
    if (!same) return { from: k + 1, limited: false };
  }
  return { from: 0, limited: false };
}

/** A pair of the relation: B is A's harmonic, agreeing from level `from` of A up. */
export interface Link {
  readonly a: number;
  readonly b: number;
  readonly from: number;
  readonly limited: boolean;
}

/** Whether an agreement makes B a harmonic of A (born at `level`): from the floor up (or as far down as both are read), and at least two levels. */
export const isHarmonic = (g: Agreement, level: number, floor = FLOOR): boolean => (g.from <= floor || g.limited) && g.from <= level - 2;

/** Every pair of the relation among the circuits. */
export function harmonicLinks(circuits: readonly ChainCircuit[], floor = FLOOR): Link[] {
  const out: Link[] = [];
  circuits.forEach((b, bi) => {
    circuits.forEach((a, ai) => {
      if (a.level + 2 !== b.level || a.family !== b.family) return;
      const g = agreement(a, b);
      if (isHarmonic(g, a.level, floor)) out.push({ a: ai, b: bi, ...g });
    });
  });
  return out;
}

export interface Chain {
  /** Circuit indices, by level (then length). */
  readonly members: readonly number[];
  readonly family: string;
}

/** The connected sets of the relation, members ordered by level; every circuit is in exactly one. Chains are ordered by family, then by their lowest member. */
export function chainsOf(circuits: readonly ChainCircuit[], links: readonly Link[]): Chain[] {
  const root = circuits.map((_, i) => i);
  const find = (i: number): number => (root[i] === i ? i : (root[i] = find(root[i])));
  for (const l of links) root[find(l.a)] = find(l.b);
  const sets = new Map<number, number[]>();
  circuits.forEach((_, i) => (sets.get(find(i)) ?? sets.set(find(i), []).get(find(i))!).push(i));
  const by = (x: number, y: number) => circuits[x].level - circuits[y].level || circuits[x].length - circuits[y].length;
  return [...sets.values()]
    .map((m) => ({ members: m.sort(by), family: circuits[m[0]].family }))
    .sort((x, y) => x.family.length - y.family.length || x.family.localeCompare(y.family) || by(x.members[0], y.members[0]));
}

/** A near link: B, two levels above A and not its harmonic, reads as A at A's top `top` levels (at least two). */
export interface Near {
  readonly a: number;
  readonly b: number;
  readonly top: number;
}

/** How many of A's top levels B (born two levels above A) reads the same at, compared while the readings stay short. */
export function topAgreement(a: ChainCircuit, b: ChainCircuit): number {
  let top = 0;
  for (let k = a.level - 1; k >= 0; k--) {
    const x = a.readings.find((r) => r.level === k);
    const y = b.readings.find((r) => r.level === k + 2);
    if (!x || !y || x.tokens.length > 4000 || !sameCyclic(x.tokens, y.tokens)) break;
    top++;
  }
  return top;
}

/** Near links into the lowest member of each chain: from the circuit two levels down that agrees at most top levels (at least two), then the longest. */
export function nearLinks(circuits: readonly ChainCircuit[], chains: readonly Chain[]): Near[] {
  const out: Near[] = [];
  for (const ch of chains) {
    const bi = ch.members[0];
    const b = circuits[bi];
    let best: Near | null = null;
    circuits.forEach((a, ai) => {
      if (a.level + 2 !== b.level || a.level < 2) return;
      const top = topAgreement(a, b);
      if (top >= 2 && (!best || top > best.top || (top === best.top && a.length > circuits[best.a].length))) best = { a: ai, b: bi, top };
    });
    if (best) out.push(best);
  }
  return out;
}

/** For a circuit in no chain with others: the circuit of its family two levels above or below that reads the same at most top levels (of the lower one), or null when none agrees at any. */
export function closestInFamily(circuits: readonly ChainCircuit[], i: number): { other: number; top: number } | null {
  const c = circuits[i];
  let best: { other: number; top: number } | null = null;
  circuits.forEach((o, j) => {
    if (o.family !== c.family) return;
    const top = o.level === c.level + 2 ? topAgreement(c, o) : o.level === c.level - 2 ? topAgreement(o, c) : 0;
    if (top > 0 && (!best || top > best.top)) best = { other: j, top };
  });
  return best;
}
