/**
 * The levels above the last one built, from what the built levels show.
 *
 * Counted exactly, for any level: the tiles in a supertile of each type and
 * the crossings on its border (so the routes of its table), from the
 * substitution alone: a supertile's tiles are its children's, and each edge's
 * crossings are those of the child edges it is made of (`edgeParts`).
 *
 * Predicted: the circuits. A chain is a run of new circuits, one every two
 * levels in one family, each reading as the one before at its top levels
 * (the levels just below where it closes, read as in
 * `harmonics/readings.ts`): the harmonics. Above the build each chain is
 * carried on two levels at a time, its next member read at those top levels
 * as its last built one, placement for placement. That is what is drawn of
 * it: the supertiles its reading runs through, a few levels below the one it
 * closes in. Its tiles are not counted: the readings cancel the strand's
 * runs back and forth across seams, and those runs hold most of the tiles.
 */
import { buildSystem, edgeParts, mul, transPt, type Affine, type HexType, type MetaNode, type Pt } from '../../core';
import { cancelBacktracksAt, expandVisits, sameCyclic, token, topVisits, type VisitColumns } from '../harmonics/readings';
import type { BornCircuit, CircuitShapes } from '../shapes/circuitShapes';
import { familyOf } from '../shapes/circuitShapes';
import type { Closing } from './buildup';

/** The deepest level of a circuit's reading compared or drawn, counted down from where it closes. */
export const MAX_DEPTH = 8;
/** A reading stops at the first level with more visits than this. */
const MAX_VISITS = 400000;

/** Per type at a level: tiles in the supertile and crossings on its border, exactly. */
export interface LevelCount {
  readonly level: number;
  readonly tiles: ReadonlyMap<HexType, bigint>;
  readonly crossings: ReadonlyMap<HexType, bigint>;
}

/** Tiles and border crossings of every type, levels 0 to `upTo`, from the substitution and the level-0 crossings of `cs`. */
export function levelCounts(cs: CircuitShapes, upTo: number): LevelCount[] {
  const types = Object.keys(cs.levels[0]) as HexType[];
  let tiles = new Map(types.map((t) => [t, 1n]));
  let rows = new Map(types.map((t) => [t, cs.border(0, t).map((r) => BigInt(r.length))]));
  const sum = (xs: readonly bigint[]) => xs.reduce((a, b) => a + b, 0n);
  const out: LevelCount[] = [{ level: 0, tiles, crossings: new Map(types.map((t) => [t, sum(rows.get(t)!)])) }];
  for (let n = 1; n <= upTo; n++) {
    const sys = buildSystem(cs.family, n);
    const nextTiles = new Map<HexType, bigint>();
    const nextRows = new Map<HexType, bigint[]>();
    for (const t of types) {
      const kids: HexType[] = [];
      for (const ch of (sys[t] as MetaNode).children) kids[ch.pos] = ch.node.type as HexType;
      nextTiles.set(t, sum((sys[t] as MetaNode).children.map((ch) => tiles.get(ch.node.type as HexType)!)));
      nextRows.set(t, Array.from({ length: 6 }, (_, j) => sum(edgeParts(t, j).map((p) => rows.get(kids[p.s])![p.e]))));
    }
    tiles = nextTiles;
    rows = nextRows;
    out.push({ level: n, tiles, crossings: new Map(types.map((t) => [t, sum(rows.get(t)!)])) });
  }
  return out;
}

/** A circuit read at its top levels: per depth d (1 for the level just below where it closes), the visits kept once backtracks are cancelled, as tokens and as slot paths (base 8, from the supertile it closes in). */
export interface TopReading {
  readonly tokens: readonly (readonly string[])[];
  readonly paths: readonly (readonly number[])[];
}

/** `c` read from depth 1 down to `depth` (index 0 unused), stopping early at a level with too many visits. */
export function topReading(cs: CircuitShapes, c: BornCircuit, depth = MAX_DEPTH): TopReading {
  const tokens: string[][] = [[]];
  const paths: number[][] = [[]];
  let v: VisitColumns = topVisits(cs, c);
  for (let d = 1; d <= Math.min(depth, c.level); d++) {
    if (d > 1) v = expandVisits(cs, v);
    if (v.type.length > MAX_VISITS) break;
    const k = c.level - d;
    const cut = cancelBacktracksAt(v.id, v.tiles);
    const at = v;
    tokens.push(Array.from(cut.keep, (i) => token({ id: '', type: at.type[i], slot: at.slot[i], parent: at.parent[i], tiles: 0 }, k, c.level)));
    paths.push(Array.from(cut.keep, (i) => at.id[i]));
  }
  return { tokens, paths };
}

/** How many top levels B (born two levels above A) reads as A at, from depth 1 down. */
export function topAgreement(a: TopReading, b: TopReading): number {
  let d = 1;
  while (d < a.tokens.length && d < b.tokens.length && sameCyclic(a.tokens[d], b.tokens[d])) d++;
  return d - 1;
}

export interface ChainMember {
  readonly level: number;
  readonly length: number;
  readonly circuit: BornCircuit;
  readonly reading: TopReading;
}

export interface Chain {
  readonly family: string;
  /** Built members, by level, two levels apart. */
  readonly members: readonly ChainMember[];
  /** Top levels the last built member reads as the one before at: how far down the next is taken to read as it. */
  readonly depth: number;
}

/**
 * The chains among the circuits first closing at levels up to `upTo`: each
 * new circuit joined to the new circuit of its family two levels below that
 * reads the same at the most top levels, at least two. Chains of at least
 * two members.
 */
export function chainsOf(cs: CircuitShapes, closings: readonly (readonly Closing[])[], upTo = closings.length - 1): Chain[] {
  const fresh: ChainMember[] = [];
  for (let n = 1; n <= upTo; n++) {
    for (const c of closings[n] ?? []) if (c.first === n) fresh.push({ level: n, length: c.length, circuit: c.circuit, reading: topReading(cs, c.circuit) });
  }
  const before = new Map<ChainMember, { a: ChainMember; depth: number }>();
  const taken = new Set<ChainMember>();
  for (const b of fresh) {
    let best: { a: ChainMember; depth: number } | null = null;
    for (const a of fresh) {
      if (a.level + 2 !== b.level || familyOf(a.circuit) !== familyOf(b.circuit) || taken.has(a)) continue;
      const depth = topAgreement(a.reading, b.reading);
      if (depth >= 2 && (!best || depth > best.depth)) best = { a, depth };
    }
    if (best) {
      before.set(b, best);
      taken.add(best.a);
    }
  }
  const out: Chain[] = [];
  for (const top of fresh) {
    if (!before.has(top) || [...before.values()].some((x) => x.a === top)) continue;
    const members = [top];
    for (let m = before.get(top); m; m = before.get(m.a)) members.unshift(m.a);
    out.push({ family: familyOf(top.circuit), members, depth: before.get(top)!.depth });
  }
  return out.sort((x, y) => x.family.localeCompare(y.family) || x.members[0].length - y.members[0].length);
}

/** A chain carried on to a level above its last built member. */
export interface Predicted {
  readonly level: number;
  readonly chain: Chain;
  /** Its supertile's type: the last member's. */
  readonly type: HexType;
  /** Its reading at depths 1 to the chain's depth: the last member's. */
  readonly reading: TopReading;
  /** Members of the chain between its last built one and this one. */
  readonly steps: number;
}

/** The members the chains predict at `level`, above their last built members. */
export function predictAt(chains: readonly Chain[], level: number): Predicted[] {
  const out: Predicted[] = [];
  for (const chain of chains) {
    const last = chain.members[chain.members.length - 1];
    const steps = (level - last.level) / 2;
    if (steps < 1 || !Number.isInteger(steps)) continue;
    const reading = { tokens: last.reading.tokens.slice(0, chain.depth + 1), paths: last.reading.paths.slice(0, chain.depth + 1) };
    out.push({ level, chain, type: last.circuit.type as HexType, reading, steps });
  }
  return out;
}

/** A level-n supertile of `type`, placed by its slot path below (base 8, `depth` slots, top first): its type and placement. */
export function placeOfPath(family: CircuitShapes['family'], n: number, type: HexType, path: number, depth: number): { type: HexType; x: Affine } {
  const slots: number[] = [];
  for (let d = 0; d < depth; d++, path = Math.floor(path / 8)) slots.unshift(path % 8);
  let x: Affine = [1, 0, 0, 0, 1, 0];
  let t = type;
  slots.forEach((s, i) => {
    const ch = (buildSystem(family, n - i)[t] as MetaNode).children.find((c) => c.pos === s);
    if (!ch) throw new Error(`a level-${n - i} ${t} has no child in slot ${s}`);
    x = mul(x, ch.xform as Affine);
    t = ch.node.type as HexType;
  });
  return { type: t, x };
}

/** The middle of a level-n supertile: its corners' mean, in its frame. */
export function middleOf(cs: CircuitShapes, n: number, type: HexType): Pt {
  let x = 0, y = 0;
  for (let j = 0; j < 6; j++) {
    const p = cs.corner(n, type, j);
    x += p.x;
    y += p.y;
  }
  return { x: x / 6, y: y / 6 };
}

/**
 * A level-n supertile's outline in its frame, drawn through its children's
 * corners `fine` levels down: each edge is the child edges it is made of,
 * each run backwards, the child being mirrored. x, y pairs, closed.
 */
export function outlineOf(cs: CircuitShapes, n: number, type: HexType, fine: number): Float64Array {
  const edge = (m: number, t: HexType, j: number, f: number, x: Affine, out: number[]): void => {
    // the points from corner j up to (not including) corner j + 1
    if (f === 0 || m === 0) {
      const p = transPt(x, cs.corner(m, t, j));
      out.push(p.x, p.y);
      return;
    }
    const kids: MetaNode['children'][number][] = [];
    for (const ch of (buildSystem(cs.family, m)[t] as MetaNode).children) kids[ch.pos] = ch;
    for (const part of edgeParts(t, j)) {
      const ch = kids[part.s];
      const cx = mul(x, ch.xform as Affine);
      // the child's edge part.e, run from its end back to its start
      const run: number[] = [];
      edge(m - 1, ch.node.type as HexType, part.e, f - 1, cx, run);
      const end = transPt(cx, cs.corner(m - 1, ch.node.type as HexType, (part.e + 1) % 6));
      out.push(end.x, end.y);
      for (let i = run.length - 2; i >= 2; i -= 2) out.push(run[i], run[i + 1]);
    }
  };
  const out: number[] = [];
  for (let j = 0; j < 6; j++) edge(n, type, j, fine, [1, 0, 0, 0, 1, 0], out);
  out.push(out[0], out[1]);
  return Float64Array.from(out);
}

/** A predicted circuit drawn by its reading at `depth`: the middle of each supertile it runs through, in order, closed. */
export function readingPolyline(cs: CircuitShapes, p: Predicted, depth: number): Float64Array {
  const paths = p.reading.paths[depth];
  const out = new Float64Array(2 * paths.length + 2);
  paths.forEach((id, i) => {
    const at = placeOfPath(cs.family, p.level, p.type, id, depth);
    const m = transPt(at.x, middleOf(cs, p.level - depth, at.type));
    out[2 * i] = m.x;
    out[2 * i + 1] = m.y;
  });
  out[2 * paths.length] = out[0];
  out[2 * paths.length + 1] = out[1];
  return out;
}
