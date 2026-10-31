/**
 * Which circuit a strand belongs to, from one of its tiles, level by level.
 *
 * The strand is named by a tile (its slot path under a Delta at the root
 * level) and the edge it enters that tile by. Its ancestors are the
 * supertiles on the slot path; above the root the root is taken as slot 1 of
 * a Delta, where every Delta has a Delta child. At each level k the strand's
 * part inside the level-k ancestor is followed through its children
 * (`CircuitShapes.walkAbove`) from its part one level down: either it closes
 * there, and is a circuit, or it is an arc of the ancestor's table from one
 * border place to another, still open.
 *
 * A closed strand is matched with the circuits of the build by its word
 * (`foundations.wordKey`) and placed in its chain (`harmonics/chains.ts`).
 * An open strand is read at the levels below k as a circuit is
 * (`harmonics/readings.ts`), its backtracks cancelled along the arc, and set
 * against every chain carried above the build: a chain member born at level
 * b, lifted h harmonic steps, closes at b + 2h and reads at level j as the
 * member reads at j - 2h (`buildup/deep.ts`). The arc's reading is placed
 * where it fits best in the candidate's cyclic reading, either way round
 * (the least edit distance to any part of it), and candidates are ranked by
 * how much of the arc's reading they account for.
 */
import { buildSystem, mul, transPt, type Affine, type HexType, type MetaNode, type Pt } from '../../core';
import { HarmonicsEngine, type HarmonicsResult } from '../harmonics/harmonicsJob';
import { alignReadings, cancelBacktracksAt, expandVisits, token, type VisitColumns } from '../harmonics/readings';
import { visitsWithFrames } from '../harmonics/pairView';
import { middleOf, placeOfPath, topReading, type TopReading } from '../buildup/deep';
import { bornAbove, predictHarmonic, wordKey } from '../foundations/foundations';
import type { PageCombo } from '../foundations/pageData';
import { CircuitShapes, placeOf, slotOf, type BornCircuit } from '../shapes/circuitShapes';

/** The type at the root of every slot path. */
export const ROOT: HexType = 'Delta';
const IDENTITY: Affine = [1, 0, 0, 0, 1, 0];

/** The child in a slot of a level-n supertile. */
function childAt(n: number, type: string, slot: number): MetaNode['children'][number] {
  const ch = (buildSystem('hex', n)[type] as MetaNode | undefined)?.children.find((c) => c.pos === slot);
  if (!ch) throw new Error(`a level-${n} ${type} has no child in slot ${slot}`);
  return ch;
}

/** The slot of a Delta's Delta child at level n. */
const deltaSlot = (n: number): number => (buildSystem('hex', n)[ROOT] as MetaNode).children.find((c) => c.node.type === ROOT)!.pos;

/** A tile's ancestors: types[n] is the level-n supertile holding it, slots[n] the slot of the level-(n - 1) one in it. */
export interface Ancestry {
  readonly root: number;
  readonly types: HexType[];
  readonly slots: number[];
}

/** The ancestors of the tile at slot path `tile` under a level-`root` Delta, carried on to level `upTo`. */
export function ancestry(tile: string, root: number, upTo: number): Ancestry {
  const path = tile.split('.').map(Number);
  if (path.length !== root || path.some((s) => !Number.isInteger(s) || s < 0 || s > 7)) throw new Error(`a tile under a level-${root} supertile has ${root} slots`);
  const types: HexType[] = [];
  const slots: number[] = [-1];
  types[root] = ROOT;
  path.forEach((s, i) => {
    const n = root - i;
    types[n - 1] = childAt(n, types[n], s).node.type as HexType;
    slots[n] = s;
  });
  const out: Ancestry = { root, types, slots };
  return grow(out, upTo);
}

/** Ancestors added above the last one known, each a Delta's Delta child. */
function grow(a: Ancestry, upTo: number): Ancestry {
  for (let n = a.types.length; n <= upTo; n++) {
    a.types[n] = ROOT;
    a.slots[n] = deltaSlot(n);
  }
  return a;
}

/** An open strand's part in its level-n ancestor: from border place `entry` to `exit`, through `tiles` tiles. */
export interface Arc {
  readonly level: number;
  readonly type: HexType;
  readonly entry: number;
  readonly exit: number;
  readonly tiles: number;
}

/** What the strand is at a level: still open (its arc), closed (its walk through the children), or ending inside a tile. */
export type Found = { readonly kind: 'open'; readonly arc: Arc } | { readonly kind: 'closed'; readonly circuit: BornCircuit } | { readonly kind: 'ends'; readonly level: number };

/**
 * A strand followed up its tile's ancestors, one level at a time. Level n
 * needs the tables of level n - 1, and level n's own to name the arc's ends.
 */
export class Strand {
  readonly arcs: Arc[] = [];
  readonly exitEdge: number;

  constructor(
    readonly cs: CircuitShapes,
    readonly anc: Ancestry,
    readonly edge: number,
  ) {
    const type = anc.types[0];
    const exit = cs.levels[0][type].mate(edge);
    if (exit < 0) throw new Error(`under this rule no strand enters a ${type} by edge ${edge}`);
    this.exitEdge = exit;
    this.arcs.push({ level: 0, type, entry: edge, exit, tiles: 1 });
  }

  /** The strand at level n, from its arc at level n - 1. */
  up(n: number): Found {
    const prev = this.arcs[n - 1];
    if (!prev || prev.level !== n - 1) throw new Error(`the strand is not open at level ${n - 1}`);
    grow(this.anc, n);
    const { cs } = this;
    const type = this.anc.types[n];
    const slot = this.anc.slots[n];
    const fwd = cs.walkAbove(type, prev.entry * 8 + slot, n - 1);
    if (fwd.closed) return { kind: 'closed', circuit: bornAbove(n, type, fwd) };
    const rev = cs.walkAbove(type, prev.exit * 8 + slot, n - 1);
    const end = (w: { steps: number[] }): number => {
      const last = w.steps[w.steps.length - 1];
      const ch = cs.childOf(n, type, last);
      const m = cs.levels[n - 1][ch.type].mate(placeOf(last));
      return m < 0 ? -1 : placeIndex(cs, n, m * 8 + slotOf(last));
    };
    const exit = end(fwd);
    const entry = end(rev);
    if (exit < 0 || entry < 0) return { kind: 'ends', level: n };
    const tiles = fwd.length + rev.length - prev.tiles;
    const T = cs.levels[n][type];
    if (T.mate(entry) !== exit || T.len(entry) !== tiles) throw new Error(`level ${n}: the walk and the table disagree`);
    const arc: Arc = { level: n, type, entry, exit, tiles };
    this.arcs.push(arc);
    return { kind: 'open', arc };
  }

  /** The tile's frame in its level-n ancestor. */
  tileFrame(n: number): Affine {
    let x = IDENTITY;
    for (let m = n; m >= 1; m--) x = mul(x, childAt(m, this.anc.types[m], this.anc.slots[m]).xform as Affine);
    return x;
  }

  /** The strand's chord across its tile, in the level-n ancestor's frame. */
  chord(n: number): [Pt, Pt] {
    const x = this.tileFrame(n);
    const T = this.cs.levels[0][this.anc.types[0]];
    return [transPt(x, T.pt(this.edge)), transPt(x, T.pt(this.exitEdge))];
  }
}

/** The place of level n that is child crossing `step`. */
function placeIndex(cs: CircuitShapes, n: number, step: number): number {
  const under = Object.values(cs.levels[n])[0].level.under;
  for (let p = 0; p < under.length; p++) if (under[p] === step) return p;
  return -1;
}

/**
 * Cancels backtracks along an open sequence of visits: a visit, a visit to
 * another supertile and a return (A B A) become A, until none is left, the
 * ends kept where they are. Returns the visits kept.
 */
export function cancelOpen(ids: ArrayLike<number>): Int32Array {
  const keep = new Int32Array(ids.length);
  let top = 0;
  for (let i = 0; i < ids.length; i++) {
    if (top >= 2 && ids[keep[top - 2]] === ids[i]) top--;
    else keep[top++] = i;
  }
  return keep.slice(0, top);
}

/** An arc read at a level: its raw visits, and the visits kept once backtracks are cancelled (absent past `RAW_CAP`). */
export interface ArcReading {
  readonly level: number;
  readonly raw: number;
  readonly kept: { readonly type: string[]; readonly slot: number[]; readonly parent: string[]; readonly id: number[] } | null;
}

/** Levels are read downwards until one has more raw visits than this. */
const RAW_CAP = 200000;

/** An open arc's visits one level below it. */
function arcTop(cs: CircuitShapes, arc: Arc): VisitColumns {
  const v: VisitColumns = { level: arc.level - 1, type: [], cross: [], id: [], slot: [], parent: [], tiles: [], up: [] };
  for (const e of cs.enters(arc.level, arc.type, arc.entry)) {
    v.type.push(e.type);
    v.cross.push(e.k);
    v.id.push(e.slot);
    v.slot.push(e.slot);
    v.parent.push(arc.type);
    v.tiles.push(cs.levels[arc.level - 1][e.type].len(e.k));
    v.up.push(-1);
  }
  return v;
}

/** An open arc read at every level below it, down to the first with more than `RAW_CAP` raw visits. */
export function readArc(cs: CircuitShapes, arc: Arc): ArcReading[] {
  const out: ArcReading[] = [];
  let v = arcTop(cs, arc);
  for (;;) {
    if (v.type.length > RAW_CAP) {
      out.push({ level: v.level, raw: v.type.length, kept: null });
      break;
    }
    const keep = cancelOpen(v.id);
    const at = v;
    out.push({
      level: v.level,
      raw: v.type.length,
      kept: { type: Array.from(keep, (i) => at.type[i]), slot: Array.from(keep, (i) => at.slot[i]), parent: Array.from(keep, (i) => at.parent[i]), id: Array.from(keep, (i) => at.id[i]) },
    });
    if (v.level === 0) break;
    v = expandVisits(cs, v);
  }
  return out;
}

/** The arc's tokens at a level, as a circuit closing at `birth` writes them. */
export function arcTokens(r: ArcReading, birth: number): string[] {
  const k = r.kept!;
  return k.type.map((t, i) => token({ id: '', type: t, slot: k.slot[i], parent: k.parent[i], tiles: 0 }, r.level, birth));
}

/** Where a sequence fits best as a run of consecutive tokens of a cyclic one, read either way round. */
export interface Fit {
  readonly distance: number;
  /** The cyclic sequence read backwards. */
  readonly back: boolean;
  /** One past the last token of the run, in the sequence as read (doubled round the cycle). */
  readonly end: number;
}

/** The cyclic sequence as read, either way round, and carried on round the cycle far enough to hold any run as long as `n` plus as many again. */
function around(b: Int32Array, back: boolean, n: number): Int32Array {
  const m = b.length;
  const len = m + Math.min(m, 2 * n);
  const out = new Int32Array(len);
  for (let i = 0; i < len; i++) out[i] = back ? b[m - 1 - (i % m)] : b[i % m];
  return out;
}

/** The least edit distance from `a` to any run of consecutive tokens of the cyclic `b`, either way round. */
export function bestFit(a: Int32Array, b: Int32Array): Fit {
  const n = a.length;
  if (!n) return { distance: 0, back: false, end: 0 };
  if (!b.length) return { distance: n, back: false, end: 0 };
  let best: Fit = { distance: Infinity, back: false, end: 0 };
  for (const back of [false, true]) {
    const t = around(b, back, n);
    const T = t.length;
    let prev = new Int32Array(T + 1);
    let cur = new Int32Array(T + 1);
    for (let i = 1; i <= n; i++) {
      cur[0] = i;
      const ai = a[i - 1];
      for (let j = 1; j <= T; j++) {
        const sub = prev[j - 1] + (ai === t[j - 1] ? 0 : 1);
        const del = prev[j] + 1;
        const ins = cur[j - 1] + 1;
        cur[j] = sub < del ? (sub < ins ? sub : ins) : del < ins ? del : ins;
      }
      [prev, cur] = [cur, prev];
    }
    for (let j = 0; j <= T; j++) if (prev[j] < best.distance) best = { distance: prev[j], back, end: j };
  }
  return best;
}

/**
 * The fit lined up token for token: which tokens of `a` are matched, and
 * the run of `b` it fits (indices into `b` as stored), each with whether it
 * is matched.
 */
export function fitAlignment(a: Int32Array, b: Int32Array, fit: Fit): { matchedA: boolean[]; run: number[]; matchedRun: boolean[] } {
  const n = a.length, m = b.length;
  const t = around(b, fit.back, n);
  const from = Math.max(0, fit.end - 2 * n - 2);
  const W = fit.end - from;
  const d: Int32Array[] = Array.from({ length: n + 1 }, () => new Int32Array(W + 1));
  for (let i = 1; i <= n; i++) {
    d[i][0] = i;
    for (let j = 1; j <= W; j++) d[i][j] = Math.min(d[i - 1][j - 1] + (a[i - 1] === t[from + j - 1] ? 0 : 1), d[i - 1][j] + 1, d[i][j - 1] + 1);
  }
  const matchedA = new Array<boolean>(n).fill(false);
  const hit = new Array<boolean>(W).fill(false);
  let i = n, j = W;
  while (i > 0 && j > 0) {
    if (d[i][j] === d[i - 1][j - 1] + (a[i - 1] === t[from + j - 1] ? 0 : 1)) {
      if (a[i - 1] === t[from + j - 1]) { matchedA[i - 1] = true; hit[j - 1] = true; }
      i--; j--;
    } else if (d[i][j] === d[i - 1][j] + 1) i--;
    else j--;
  }
  const start = j;
  const run: number[] = [];
  const matchedRun: boolean[] = [];
  for (let q = start; q < W; q++) {
    const s = (from + q) % m;
    run.push(fit.back ? m - 1 - s : s);
    matchedRun.push(hit[q]);
  }
  return { matchedA, run, matchedRun };
}

/** Tokens as numbers, the same token the same number. */
class Codes {
  private readonly map = new Map<string, number>();
  of(tokens: readonly string[]): Int32Array {
    return Int32Array.from(tokens, (t) => this.map.get(t) ?? this.map.set(t, this.map.size).get(t)!);
  }
}

/** A circuit of the build as the page names it: where it first closes and its tiles. */
export interface Named {
  readonly level: number;
  readonly length: number;
}

/** A chain of the build: its members, by level. */
export interface ChainView {
  readonly members: readonly Named[];
}

/** What the combination's precomputed analysis says of a circuit: its harmonic order and the foundational circuit its chain starts at. */
export interface KnownPlace {
  readonly order: number;
  readonly root: Named;
}

/** A strand that closed. */
export interface Identified {
  /** The level it closes at here. */
  readonly level: number;
  readonly length: number;
  /** The circuit of the build with the same word, or null when none has it. */
  readonly circuit: Named | null;
  readonly chain: ChainView | null;
  /** Its place in the chain: 0 for the chain's first member. */
  readonly order: number | null;
  readonly known: KnownPlace | null;
}

/** A chain carried above the build as a guess for an open strand. */
export interface Candidate {
  readonly chain: ChainView;
  /** The member lifted, and how many harmonic steps. */
  readonly member: Named;
  readonly steps: number;
  /** The level it would close at. */
  readonly level: number;
  /** Its harmonic order: the member's place in the chain plus the steps. */
  readonly order: number;
  /** Its tiles: from the precomputed analysis, or predicted from the build; null when neither has it. */
  readonly length: number | null;
  readonly lengthFrom: 'data' | 'predicted' | null;
  /** How much of the arc's reading it accounts for: one less the edit distance over the tokens compared. */
  readonly similarity: number;
  /** Tokens of the arc's reading compared, and the levels. */
  readonly tokens: number;
  readonly levels: readonly number[];
}

/** A level of the exploration, for the table. */
export interface LevelRow {
  readonly level: number;
  readonly tiles: number;
  readonly state: 'open' | 'closed' | 'ends';
  readonly best: string | null;
  readonly similarity: number | null;
  /** Visits of the strand's reading the similarity is over (null when it closed). */
  readonly visits: number | null;
  /** Above the root level of the address: the ancestors there are Delta's Delta children. */
  readonly above: boolean;
}

/** Supertiles at one level drawn as outlines, x, y pairs, each with whether its visit is matched. */
export interface Drawn {
  readonly outlines: readonly Float64Array[];
  readonly matched: readonly boolean[];
  /** The strand or circuit: x, y pairs. */
  readonly line: Float64Array;
}

/** The two pictures and the readings lined up. */
export interface View {
  /** The level whose supertiles are drawn and read. */
  readonly level: number;
  /** The strand's ancestor at the level analysed, its supertiles and the strand, and the strand's tile (its chord). */
  readonly frame: Float64Array;
  readonly left: Drawn;
  readonly chord: readonly [number, number, number, number];
  /** The nearest circuit, moved onto the strand where their readings match; null when nothing is matched. */
  readonly right: Drawn | null;
  /** Whether the right picture is mirrored to match. */
  readonly mirrored: boolean;
  readonly tokens: { readonly arc: readonly string[]; readonly arcMatched: readonly boolean[]; readonly near: readonly string[]; readonly nearMatched: readonly boolean[] };
}

export interface Report {
  readonly level: number;
  readonly rows: readonly LevelRow[];
  readonly start: { readonly type: string; readonly edge: number; readonly exit: number };
  readonly found: 'open' | 'closed' | 'ends';
  readonly tiles: number;
  readonly identified: Identified | null;
  readonly candidates: readonly Candidate[];
  readonly view: View | null;
  /** Nothing more will come: closed, ended, at the cap or out of room. */
  readonly done: boolean;
  readonly why: string | null;
  readonly seconds: number;
}

export interface IdentifyJob {
  readonly subset: readonly number[];
  readonly combo: string;
  readonly tile: string;
  readonly edge: number;
  /** The root level of the slot path. */
  readonly level: number;
  /** The highest level built. */
  readonly cap: number;
  /** The combination's precomputed analysis (`foundations`), when there is one. */
  readonly known: PageCombo | null;
}

/** Levels ahead of the build a chain is carried to. */
const AHEAD = 4;
/** Tokens of the arc's reading compared at a level, at most; and the most levels compared. */
const ARC_TOKENS = 400;
const COMPARED_LEVELS = 3;
/** A candidate's reading longer than this at a level is not compared there. */
const NEAR_TOKENS = 30000;
/** Candidates aligned in full after the quick count of shared pairs of tokens. */
const ALIGNED = 12;
/** Tokens a candidate is charged for, as if unmatched, so a fit over a few tokens ranks below a fit over many. */
const PRIOR = 3;
/** Most supertiles drawn, and most points of a strand. */
const DRAW_TOKENS = 300;
const LINE_POINTS = 20000;
/** A level with more places than this is not built. */
const MAX_PLACES = 4e7;

/** A candidate with what it was compared on. */
interface Ranked {
  candidate: Candidate;
  readonly born: BornCircuit;
  readonly levels: readonly { readonly level: number; readonly depth: number; readonly fit: Fit; readonly arc: Int32Array; readonly near: Int32Array }[];
  readonly rank: number;
}

const named = (c: { level: number; length: number }): Named => ({ level: c.level, length: c.length });

/** The circuit with these tiles first closing at this level in the precomputed analysis: its id, harmonic order and chain root. */
function knownRow(known: PageCombo, c: Named): { id: number; order: number; root: number } | null {
  const f = known.found.find((r) => r[1] === c.level && r[2] === c.length);
  if (f) return { id: f[0], order: 0, root: f[0] };
  const h = known.harm.find((r) => r[1] === c.level && r[2] === c.length);
  return h ? { id: h[0], order: h[7], root: h[4] } : null;
}

function knownById(known: PageCombo, id: number): Named | null {
  const f = known.found.find((r) => r[0] === id) ?? known.harm.find((r) => r[0] === id);
  return f ? { level: f[1], length: f[2] } : null;
}

/** The circuit `steps` harmonic steps above circuit `id` in the precomputed analysis: closed in its build, or predicted from the last one closed. */
function knownAbove(known: PageCombo, id: number, steps: number): Named | null {
  let cur = id;
  let at: Named | null = knownById(known, id);
  for (let s = 0; s < steps && at; s++) {
    const h = known.harm.find((r) => r[3] === cur);
    if (h) {
      cur = h[0];
      at = { level: h[1], length: h[2] };
      continue;
    }
    const p = known.pred.find((r) => r[0] === cur && r[3] > 0);
    return s === steps - 1 && p ? { level: p[1] + 2, length: p[3] } : null;
  }
  return at;
}

const toXY = (pts: readonly Pt[]): Float64Array => {
  const out = new Float64Array(2 * pts.length);
  pts.forEach((p, i) => { out[2 * i] = p.x; out[2 * i + 1] = p.y; });
  return out;
};

const placed = (pts: readonly Pt[], x: Affine): Float64Array => toXY(pts.map((p) => transPt(x, p)));

/** The motion (turn, move, and a mirror when it fits better) taking points `q` nearest onto points `p`, pair for pair, by least squares. */
export function motion(p: readonly Pt[], q: readonly Pt[]): { map: (pt: Pt) => Pt; mirrored: boolean } {
  const n = p.length;
  const mean = (s: readonly Pt[]): Pt => ({ x: s.reduce((a, b) => a + b.x, 0) / n, y: s.reduce((a, b) => a + b.y, 0) / n });
  const fitWith = (flip: boolean) => {
    const qq = q.map((v) => ({ x: v.x, y: flip ? -v.y : v.y }));
    const mp = mean(p), mq = mean(qq);
    let c = 0, s = 0;
    for (let i = 0; i < n; i++) {
      const ax = qq[i].x - mq.x, ay = qq[i].y - mq.y, bx = p[i].x - mp.x, by = p[i].y - mp.y;
      c += ax * bx + ay * by;
      s += ax * by - ay * bx;
    }
    const t = n > 1 ? Math.atan2(s, c) : 0;
    const cos = Math.cos(t), sin = Math.sin(t);
    const map = (pt: Pt): Pt => {
      const x = pt.x - mq.x, y = (flip ? -pt.y : pt.y) - mq.y;
      return { x: mp.x + cos * x - sin * y, y: mp.y + sin * x + cos * y };
    };
    let err = 0;
    for (let i = 0; i < n; i++) {
      const m = map(q[i]);
      err += (m.x - p[i].x) ** 2 + (m.y - p[i].y) ** 2;
    }
    return { map, err };
  };
  const a = fitWith(false), b = fitWith(true);
  return b.err < a.err - 1e-9 * (1 + a.err) ? { map: b.map, mirrored: true } : { map: a.map, mirrored: false };
}

const moveLine = (xy: Float64Array, map: (p: Pt) => Pt): Float64Array => {
  const out = new Float64Array(xy.length);
  for (let i = 0; i < xy.length; i += 2) {
    const m = map({ x: xy[i], y: xy[i + 1] });
    out[i] = m.x;
    out[i + 1] = m.y;
  }
  return out;
};

/** Evenly spaced points of a line, at most `n`. */
const capLine = (pts: readonly Pt[], n: number): Pt[] => (pts.length <= n ? [...pts] : Array.from({ length: n }, (_, j) => pts[Math.floor((j * pts.length) / n)]));

/**
 * The analysis of one strand, a level at a time (`step`), from the
 * renormalisation of its combination and the harmonic chains over it
 * (`HarmonicsEngine`).
 */
export class IdentifyEngine {
  readonly harm: HarmonicsEngine;
  readonly strand: Strand;
  private readonly rows: LevelRow[] = [];
  private next = 1;
  private finished = false;
  private readonly reads = new Map<BornCircuit, { depth: number; reading: TopReading }>();
  private readonly words = new Map<BornCircuit, string>();
  private readonly predicted = new Map<BornCircuit, number | null>();
  private readonly codes = new Codes();

  constructor(readonly job: IdentifyJob) {
    this.harm = new HarmonicsEngine({ family: 'hex', subset: job.subset, combo: job.combo, level: 1 });
    this.strand = new Strand(this.harm.cs, ancestry(job.tile, job.level, 1), job.edge);
  }

  get cs(): CircuitShapes {
    return this.harm.cs;
  }

  get done(): boolean {
    return this.finished;
  }

  /** The next level: built, the strand followed into it, and what it is or most likely becomes. */
  step(): Report {
    if (this.finished) throw new Error('the analysis is over');
    const t0 = Date.now();
    const n = this.next++;
    while (this.cs.maxLevel < n) this.harm.next();
    const found = this.strand.up(n);
    const r = this.harm.result();
    let identified: Identified | null = null;
    let candidates: Candidate[] = [];
    let view: View | null = null;
    let tiles = 0;
    let why: string | null = null;
    if (found.kind === 'closed') {
      tiles = found.circuit.length;
      const got = this.identify(found.circuit, r);
      identified = got.identified;
      view = this.closedView(found.circuit, got.rep);
      why = `closes at level ${n}`;
    } else if (found.kind === 'ends') {
      tiles = this.strand.arcs[n - 1].tiles;
      why = `the strand ends inside a tile at level ${n}`;
    } else {
      tiles = found.arc.tiles;
      const reading = readArc(this.cs, found.arc);
      const ranked = this.rank(found.arc, reading, r);
      for (const x of ranked.slice(0, 2)) this.fillLength(x);
      candidates = ranked.slice(0, 5).map((x) => x.candidate);
      view = this.openView(found.arc, reading, ranked[0] ?? null);
    }
    const best = candidates[0] ?? null;
    this.rows.push({
      level: n,
      tiles,
      state: found.kind,
      best: identified ? (identified.circuit ? `the ${identified.circuit.length.toLocaleString('en-US')}` : 'a new circuit') : best ? labelOf(best) : null,
      similarity: identified ? 1 : best ? best.similarity : null,
      visits: !identified && best ? best.tokens : null,
      above: n > this.job.level,
    });
    if (found.kind !== 'open') this.finished = true;
    else if (n >= this.job.cap) {
      this.finished = true;
      why = `stopped at level ${n}, the level asked for`;
    } else if (Object.values(this.cs.levels[n])[0].size * 4.5 > MAX_PLACES) {
      this.finished = true;
      why = `stopped at level ${n}: level ${n + 1} would not fit in memory`;
    }
    return {
      level: n,
      rows: [...this.rows],
      start: { type: this.strand.anc.types[0], edge: this.job.edge, exit: this.strand.exitEdge },
      found: found.kind,
      tiles,
      identified,
      candidates,
      view,
      done: this.finished,
      why,
      seconds: (Date.now() - t0) / 1000,
    };
  }

  private wordOf(c: BornCircuit): string {
    return this.words.get(c) ?? this.words.set(c, wordKey(this.cs, c)).get(c)!;
  }

  /** The circuit of the build a closed strand is, by its word, with its chain. */
  private identify(c: BornCircuit, r: HarmonicsResult): { identified: Identified; rep: BornCircuit | null } {
    const key = wordKey(this.cs, c);
    const at = r.circuits.findIndex((x, i) => x.length === c.length && this.wordOf(this.harm.bornOf(i)) === key);
    const known = this.job.known;
    if (at < 0) return { identified: { level: c.level, length: c.length, circuit: null, chain: null, order: null, known: null }, rep: null };
    const info = r.circuits[at];
    const chain = r.chains.find((ch) => ch.members.includes(at))!;
    const members = chain.members.map((i) => named(r.circuits[i]));
    const kr = known ? knownRow(known, named(info)) : null;
    const root = kr && known ? knownById(known, kr.root) : null;
    return {
      identified: {
        level: c.level,
        length: c.length,
        circuit: named(info),
        chain: { members },
        order: (info.level - members[0].level) / 2,
        known: kr && root ? { order: kr.order, root } : null,
      },
      rep: this.harm.bornOf(at),
    };
  }

  /** A circuit's reading at depths 1 to `depth` below where it closes, read once as deep as asked. */
  private readingOf(c: BornCircuit, depth: number): TopReading {
    const hit = this.reads.get(c);
    if (hit && hit.depth >= depth) return hit.reading;
    const reading = topReading(this.cs, c, depth);
    this.reads.set(c, { depth, reading });
    return reading;
  }

  /** Every chain carried above level k, ranked by how well the arc's reading fits in theirs. */
  private rank(arc: Arc, reading: readonly ArcReading[], r: HarmonicsResult): Ranked[] {
    const k = arc.level;
    // the deepest levels with a short enough reading
    const usable = reading.filter((x) => x.kept && x.kept.type.length <= ARC_TOKENS);
    if (!usable.length) return [];
    const deepest = usable.slice(-COMPARED_LEVELS).map((x) => x.level);
    type Pending = { chain: ChainView; member: Named; order: number; born: BornCircuit; B: number; levels: { level: number; depth: number; arc: Int32Array; near: Int32Array }[] };
    const pending: Pending[] = [];
    for (const ch of r.chains) {
      const members = ch.members.map((i) => ({ i, c: r.circuits[i] }));
      const chain: ChainView = { members: members.map((m) => named(m.c)) };
      const base = members[0].c.level;
      for (let B = k + 1; B <= k + AHEAD; B++) {
        const same = members.filter((m) => m.c.level <= k && (B - m.c.level) % 2 === 0);
        if (!same.length) continue;
        const top = Math.max(...same.map((m) => m.c.level));
        for (const m of same.filter((x) => x.c.level === top)) {
          const born = this.harm.bornOf(m.i);
          const levels = deepest.filter((j) => B - j >= 1 && B - j <= m.c.level);
          if (!levels.length) continue;
          const read = this.readingOf(born, Math.max(...levels.map((j) => B - j)));
          const got: Pending['levels'] = [];
          for (const j of levels) {
            const near = read.tokens[B - j];
            if (!near || !near.length || near.length > NEAR_TOKENS) continue;
            got.push({ level: j, depth: B - j, arc: this.codes.of(arcTokens(reading.find((x) => x.level === j)!, B)), near: this.codes.of(near) });
          }
          if (got.length) pending.push({ chain, member: named(m.c), order: (m.c.level - base) / 2 + (B - m.c.level) / 2, born, B, levels: got });
        }
      }
    }
    // a quick count first: the arc's pairs of consecutive tokens found in the candidate, either way round
    const pairs = (x: Int32Array): Set<number> => {
      const s = new Set<number>();
      for (let i = 0; i < x.length; i++) {
        const a = x[i], b = x[(i + 1) % x.length];
        s.add(a * 65536 + b);
        s.add(b * 65536 + a);
      }
      return s;
    };
    const quick = pending.map((p) => {
      let hit = 0, all = 0;
      for (const l of p.levels) {
        const s = pairs(l.near);
        for (let i = 0; i + 1 < l.arc.length; i++) if (s.has(l.arc[i] * 65536 + l.arc[i + 1])) hit++;
        all += Math.max(1, l.arc.length - 1);
      }
      return hit / (all + PRIOR);
    });
    const order = pending.map((_, i) => i).sort((a, b) => quick[b] - quick[a]).slice(0, ALIGNED);
    const out = order.map((pi) => {
      const p = pending[pi];
      let dist = 0, tokens = 0;
      const levels = p.levels.map((l) => {
        const fit = bestFit(l.arc, l.near);
        dist += fit.distance;
        tokens += l.arc.length;        return { ...l, fit };
      });
      const candidate: Candidate = {
        chain: p.chain,
        member: p.member,
        steps: (p.B - p.member.level) / 2,
        level: p.B,
        order: p.order,
        length: null,
        lengthFrom: null,
        similarity: tokens ? 1 - dist / tokens : 0,
        tokens,
        levels: levels.map((l) => l.level),
      };
      return { candidate, born: p.born, levels, rank: (tokens - dist) / (tokens + PRIOR) };
    });
    // a candidate sharing no visit with the arc is no guess
    return out.filter((x) => x.candidate.similarity > 0).sort((a, b) => b.rank - a.rank || a.candidate.level - b.candidate.level);
  }

  /** A candidate's tiles: from the precomputed analysis, or the harmonic predicted from the build one step up. */
  private fillLength(x: Ranked): void {
    const c = x.candidate;
    const known = this.job.known;
    let length: number | null = null;
    let from: Candidate['lengthFrom'] = null;
    if (known) {
      const row = knownRow(known, c.member);
      const above = row ? knownAbove(known, row.id, c.steps) : null;
      if (above && above.level === c.level) {
        length = above.length;
        from = 'data';
      }
    }
    if (length === null && c.steps === 1 && this.cs.maxLevel >= c.member.level + 1) {
      let got = this.predicted.get(x.born);
      if (got === undefined) {
        try {
          const p = predictHarmonic(this.cs, x.born, 2, 3e5);
          got = p.predicted.length === 1 ? p.predicted[0].length : null;
        } catch {
          got = null;
        }
        this.predicted.set(x.born, got);
      }
      if (got !== null) {
        length = got;
        from = 'predicted';
      }
    }
    x.candidate = { ...c, length, lengthFrom: from };
  }

  /** The supertiles of a level-n arc at level j, with their frames in the arc's ancestor. */
  private arcFrames(arc: Arc, j: number): { v: VisitColumns; xform: Affine[] } {
    const cs = this.cs;
    let v = arcTop(cs, arc);
    let xform = v.slot.map((s) => cs.childOf(arc.level, arc.type, s).xform);
    while (v.level > j) {
      const below = expandVisits(cs, v);
      xform = below.up.map((u, i) => mul(xform[u], cs.childOf(v.level, v.type[u], below.slot[i]).xform));
      v = below;
    }
    return { v, xform };
  }

  /** The lowest level a strand of these raw visits per level is drawn at within `LINE_POINTS`. */
  private static stopFor(raw: (j: number) => number | undefined, top: number): number {
    let s = top;
    while (s > 0 && (raw(s - 1) ?? Infinity) <= LINE_POINTS) s--;
    return s;
  }

  private openView(arc: Arc, reading: readonly ArcReading[], best: Ranked | null): View {
    const cs = this.cs;
    const k = arc.level;
    // the level drawn: the deepest compared for the best candidate with few enough supertiles, or the deepest short reading
    const short = reading.filter((x) => x.kept && x.kept.type.length <= DRAW_TOKENS);
    const compared = best ? best.levels.filter((l) => l.arc.length <= DRAW_TOKENS) : [];
    const j = compared.length ? Math.min(...compared.map((l) => l.level)) : short.length ? short[short.length - 1].level : k - 1;
    const { v, xform } = this.arcFrames(arc, j);
    const keep = cancelOpen(v.id);
    const stop = IdentifyEngine.stopFor((s) => reading.find((x) => x.level === s)?.raw, k - 1);
    const pts: Pt[] = [];
    cs.arc(k, arc.type, arc.entry, IDENTITY, stop, pts);
    pts.push(cs.levels[k][arc.type].pt(arc.exit));
    const leftLine = toXY(capLine(pts, LINE_POINTS));
    const frame = toXY(cs.outline(k, arc.type));
    const chord = this.strand.chord(k);
    const outlineAt = (i: number): Float64Array => placed(cs.outline(j, v.type[i]), xform[i]);
    const middleAt = (i: number): Pt => transPt(xform[i], middleOf(cs, j, v.type[i] as HexType));
    const lv = best?.levels.find((l) => l.level === j);
    let arcMatched: boolean[] = new Array<boolean>(keep.length).fill(false);
    let right: Drawn | null = null;
    let mirrored = false;
    let nearTokens: string[] = [];
    let nearMatched: boolean[] = [];
    if (best && lv) {
      const al = fitAlignment(lv.arc, lv.near, lv.fit);
      arcMatched = al.matchedA;
      const read = this.readingOf(best.born, lv.depth);
      const paths = read.paths[lv.depth];
      const toks = read.tokens[lv.depth];
      const B = best.candidate.level;
      const type = best.born.type as HexType;
      const at = paths.map((id) => placeOfPath(cs.family, B, type, id, lv.depth));
      const middles = at.map((p) => transPt(p.x, middleOf(cs, j, p.type)));
      // matched pairs: the arc's i-th kept visit with the run's token it is aligned to
      const p: Pt[] = [], q: Pt[] = [];
      const runMatched = al.run.filter((_, x) => al.matchedRun[x]);
      let ir = 0;
      for (let ia = 0; ia < lv.arc.length && ir < runMatched.length; ia++) {
        if (!al.matchedA[ia]) continue;
        p.push(middleAt(keep[ia]));
        q.push(middles[runMatched[ir++]]);
      }
      const fit = p.length ? motion(p, q) : { map: (x: Pt) => x, mirrored: false };
      mirrored = fit.mirrored;
      const runSet = new Set(al.run.filter((_, x) => al.matchedRun[x]));
      const drawn = new Set<number>();
      const outlines: Float64Array[] = [];
      const matched: boolean[] = [];
      for (let i = 0; i < at.length && outlines.length < DRAW_TOKENS * 2; i++) {
        if (drawn.has(paths[i])) continue;
        drawn.add(paths[i]);
        outlines.push(moveLine(placed(cs.outline(j, at[i].type), at[i].x), fit.map));
        matched.push(runSet.has(i));
      }
      const line = moveLine(toXY([...middles, middles[0]]), fit.map);
      right = { outlines, matched, line };
      nearTokens = al.run.map((x) => toks[x]);
      nearMatched = al.matchedRun;
    }
    const outlines: Float64Array[] = [];
    const matched: boolean[] = [];
    const seen = new Map<number, number>();
    keep.forEach((i, q) => {
      const id = v.id[i];
      const at = seen.get(id);
      if (at !== undefined) {
        matched[at] ||= arcMatched[q];
        return;
      }
      if (outlines.length >= DRAW_TOKENS) return;
      seen.set(id, outlines.length);
      outlines.push(outlineAt(i));
      matched.push(arcMatched[q]);
    });
    const arcToks = best && lv ? arcTokens({ level: j, raw: v.type.length, kept: { type: Array.from(keep, (i) => v.type[i]), slot: Array.from(keep, (i) => v.slot[i]), parent: Array.from(keep, (i) => v.parent[i]), id: Array.from(keep, (i) => v.id[i]) } }, best.candidate.level) : Array.from(keep, (i) => token({ id: '', type: v.type[i], slot: v.slot[i], parent: v.parent[i], tiles: 0 }, j, k + 1));
    return {
      level: j,
      frame,
      left: { outlines, matched, line: leftLine },
      chord: [chord[0].x, chord[0].y, chord[1].x, chord[1].y],
      right,
      mirrored,
      tokens: { arc: arcToks, arcMatched, near: nearTokens, nearMatched },
    };
  }

  /** A closed strand beside the circuit of the build it is, their readings lined up at a level with few enough supertiles. */
  private closedView(c: BornCircuit, rep: BornCircuit | null): View {
    const cs = this.cs;
    const k = c.level;
    let j = Math.min(k, rep ? rep.level : k) - 1;
    let ours = visitsWithFrames(cs, c, j);
    for (;;) {
      if (j === 0) break;
      const below = visitsWithFrames(cs, c, j - 1);
      if (cancelBacktracksAt(below.v.id, below.v.tiles).keep.length > DRAW_TOKENS) break;
      ours = below;
      j--;
    }
    const birth = rep ? Math.min(rep.level, k) : k;
    const read = (w: { v: VisitColumns }) => {
      const keep = cancelBacktracksAt(w.v.id, w.v.tiles).keep;
      return { keep, tokens: Array.from(keep, (i) => token({ id: '', type: w.v.type[i], slot: w.v.slot[i], parent: w.v.parent[i], tiles: 0 }, j, birth)) };
    };
    const a = read(ours);
    const drawSide = (w: { v: VisitColumns; xform: Affine[] }, keep: Int32Array, hit: readonly boolean[]): { outlines: Float64Array[]; matched: boolean[]; middles: Pt[] } => {
      const outlines: Float64Array[] = [];
      const matched: boolean[] = [];
      const middles: Pt[] = [];
      const seen = new Map<number, number>();
      keep.forEach((i, q) => {
        middles.push(transPt(w.xform[i], middleOf(cs, j, w.v.type[i] as HexType)));
        const at = seen.get(w.v.id[i]);
        if (at !== undefined) { matched[at] ||= hit[q]; return; }
        seen.set(w.v.id[i], outlines.length);
        outlines.push(placed(cs.outline(j, w.v.type[i]), w.xform[i]));
        matched.push(hit[q]);
      });
      return { outlines, matched, middles };
    };
    const stopOf = (circuit: BornCircuit): number => {
      let s = Math.max(0, circuit.level - 1);
      while (s > 0 && visitsWithFrames(cs, circuit, s - 1).v.id.length <= LINE_POINTS) s--;
      return s;
    };
    const line = (circuit: BornCircuit): Float64Array => {
      const pts = cs.shape(circuit, stopOf(circuit));
      return toXY(capLine([...pts, pts[0]], LINE_POINTS));
    };
    const chord = this.strand.chord(k);
    const frame = toXY(cs.outline(k, c.type));
    if (!rep) {
      const left = drawSide(ours, a.keep, a.keep.length ? new Array<boolean>(a.keep.length).fill(false) : []);
      return { level: j, frame, left: { outlines: left.outlines, matched: left.matched, line: line(c) }, chord: [chord[0].x, chord[0].y, chord[1].x, chord[1].y], right: null, mirrored: false, tokens: { arc: a.tokens, arcMatched: a.tokens.map(() => false), near: [], nearMatched: [] } };
    }
    const theirs = visitsWithFrames(cs, rep, j);
    const b = read(theirs);
    const al = alignReadings(a.tokens, b.tokens);
    const matchedA = al ? al.matchedA : a.tokens.map(() => false);
    // B's tokens in its own order, with whether matched
    const inB = new Array<boolean>(b.tokens.length).fill(false);
    if (al) al.matchedB.forEach((m, q) => {
      const i = (al.rotation + q) % b.tokens.length;
      inB[al.back ? b.tokens.length - 1 - i : i] = m;
    });
    const left = drawSide(ours, a.keep, matchedA);
    const right = drawSide(theirs, b.keep, inB);
    const p: Pt[] = [], q: Pt[] = [];
    if (al) {
      const order = al.tokensB.map((_, x) => {
        const i = (al.rotation + x) % b.tokens.length;
        return al.back ? b.tokens.length - 1 - i : i;
      });
      const bm = order.filter((_, x) => al.matchedB[x]);
      let ib = 0;
      matchedA.forEach((m, ia) => {
        if (!m) return;
        const bi = bm[ib++];
        if (bi === undefined) return;
        p.push(left.middles[ia]);
        q.push(right.middles[bi]);
      });
    }
    const fit = p.length ? motion(p, q) : { map: (x: Pt) => x, mirrored: false };
    const rl = line(rep);
    return {
      level: j,
      frame,
      left: { outlines: left.outlines, matched: left.matched, line: line(c) },
      chord: [chord[0].x, chord[0].y, chord[1].x, chord[1].y],
      right: { outlines: right.outlines.map((o) => moveLine(o, fit.map)), matched: right.matched, line: moveLine(rl, fit.map) },
      mirrored: fit.mirrored,
      tokens: { arc: a.tokens, arcMatched: matchedA, near: al ? [...al.tokensB] : b.tokens, nearMatched: al ? [...al.matchedB] : b.tokens.map(() => false) },
    };
  }
}

/** A candidate in a few words: `harmonic 1 of the 303, closing at level 6`. */
export function labelOf(c: Candidate): string {
  const root = c.chain.members[0];
  const base = `the ${root.length.toLocaleString('en-US')}`;
  return c.order === 0 ? `${base}, level ${c.level}` : `harmonic ${c.order} of ${base}, level ${c.level}`;
}

/**
 * A random strand that is still open at the root level: a random tile under
 * a level-`level` Delta and a random edge with a strand through it, tried
 * until one leaves the supertile. `cs` must be built to `level`.
 */
export function randomOpenStrand(cs: CircuitShapes, level: number, random: () => number = Math.random, tries = 400): { tile: string; edge: number } | null {
  for (let t = 0; t < tries; t++) {
    const slots: number[] = [];
    let type: string = ROOT;
    for (let n = level; n >= 1; n--) {
      const kids = (buildSystem('hex', n)[type] as MetaNode).children;
      const ch = kids[Math.floor(random() * kids.length)];
      slots.push(ch.pos);
      type = ch.node.type;
    }
    const edges = cs.levels[0][type].crossings();
    if (!edges.length) continue;
    const edge = edges[Math.floor(random() * edges.length)];
    if (cs.levels[0][type].mate(edge) < 0) continue;
    const tile = slots.join('.');
    const s = new Strand(cs, ancestry(tile, level, level), edge);
    let open = true;
    for (let n = 1; n <= level && open; n++) open = s.up(n).kind === 'open';
    if (open) return { tile, edge };
  }
  return null;
}

/**
 * Tile `index` of a born circuit, counted from the first tile its walk
 * enters, as an address under its supertile: the slots from there down and
 * the edge the strand enters the tile by.
 */
export function tileOf(cs: CircuitShapes, c: BornCircuit, index = 0): { tile: string; edge: number } {
  if (index < 0 || index >= c.length) throw new Error(`a ${c.length}-tile circuit has no tile ${index}`);
  let passed = 0;
  for (const s of c.steps) {
    const first = cs.childOf(c.level, c.type, s);
    if (passed + cs.levels[c.level - 1][first.type].len(first.k) <= index) {
      passed += cs.levels[c.level - 1][first.type].len(first.k);
      continue;
    }
    const slots = [first.pos];
    let type = first.type, k = first.k;
    for (let n = c.level - 1; n > 0; n--) {
      for (const e of cs.enters(n, type, k)) {
        const len = cs.levels[n - 1][e.type].len(e.k);
        if (passed + len <= index) {
          passed += len;
          continue;
        }
        slots.push(e.slot);
        type = e.type;
        k = e.k;
        break;
      }
    }
    return { tile: slots.join('.'), edge: k };
  }
  throw new Error('the walk is shorter than its length');
}
