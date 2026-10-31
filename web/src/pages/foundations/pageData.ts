/**
 * What the Foundations page reads, cut from an analysis (`comboAnalysis.ts`, run
 * by the sweep or the page's worker) by `pageCombo`: per combination its
 * circuits (chains and nuggets), how each prediction fared, and the shares
 * of chords by chain, class and harmonic order level by level; and an index
 * of every combination with its monsters and flags. The page derives the
 * account, the tail attribution, the back-test and the forecast from these,
 * with the functions here.
 */
import type { ComboAnalysis, SweepVerdict } from './comboAnalysis';

/** The parts of an analysis the page uses. */
export type SweepFile = Pick<
  ComboAnalysis,
  'rule' | 'combo' | 'levels' | 'floor' | 'settled' | 'lastNew' | 'growth' | 'closings' | 'predictions' | 'shares' | 'above' | 'assumption'
>;

/** How a prediction from a circuit fared: its harmonic two levels up closed as predicted; the predicted circuit closed, one seen lower down; nothing was predicted and nothing closed; a harmonic closed that was not predicted; another circuit's harmonic closed; or the level is above the build. */
export type Verdict = 'confirmed' | 'built' | 'none' | 'missed' | 'other' | 'forecast';

const VERDICTS: Record<SweepVerdict, Verdict> = {
  confirmed: 'confirmed',
  built: 'built',
  none: 'none',
  missed: 'missed',
  other: 'other',
  'not built': 'other',
  forecast: 'forecast',
};

/**
 * A foundational circuit: id, level it first closes at, tiles, the child
 * slots of each place it closes in there (space-separated, the place drawn
 * first), child crossings, copies over every place, level and type, types it
 * closes in, the place drawn (its index in `closingGroups`), places at every
 * level, and whether it is a nugget (1) or starts a chain (0).
 */
export type FoundRow = [id: number, level: number, length: number, families: string, steps: number, copies: number, types: number, place: number, places: number, nugget: number];
/** A harmonic: id, level it first closes at, tiles, the circuit two levels down it is the harmonic of, the foundational circuit its chain starts at, its places at that level, how many of them read as a place of `of`, its order (1 two levels above the foundational circuit), and the place drawn (its index in `closingGroups`). */
export type HarmRow = [id: number, level: number, length: number, of: number, root: number, places: number, matched: number, order: number, place: number];
/** A prediction: the circuit predicted from, its level, the verdict, and the predicted circuit's tiles (0 when none). */
export type PredRow = [from: number, level: number, verdict: Verdict, length: number];
/** Shares closing at each level, 0 to levels + 1: the chain's root, class (0 nugget, 1 foundational, 2 harmonic), harmonic order, and the shares. */
export type ShareRow = [root: number, cls: 0 | 1 | 2, order: number, shares: number[]];

export interface PageCombo {
  readonly rule: string;
  readonly combo: string;
  /** The highest level classified; one more is built for what the tails close into. */
  readonly levels: number;
  readonly floor: number;
  /** Whether the top two levels close nothing foundational at this floor. */
  readonly settled: boolean;
  /** The highest level a foundational circuit first closes at. */
  readonly lastNew: number;
  /** How many times a supertile's chords grow a level. */
  readonly growth: number;
  readonly found: FoundRow[];
  readonly harm: HarmRow[];
  readonly pred: PredRow[];
  /** Per level 0 to levels + 1, the share of chords on tails (each type weighted by its frequency). */
  readonly tails: number[];
  readonly shares: ShareRow[];
  /** Per level, the share closing into circuits at levels + 1 that are no known word and were not predicted. */
  readonly unseen: number[];
  /** At levels + 1: places whose word is a known circuit, places predicted as harmonics, and unseen circuits (tiles, places, word key). */
  readonly above: { readonly known: number; readonly predicted: number; readonly unseen: [length: number, places: number, word: string][] };
  /** Harmonics' copies per type against their parents' two levels down: pairs checked, pairs that differ. */
  readonly assumption: { readonly checked: number; readonly exceptions: number };
}

export interface IndexRow {
  readonly combo: string;
  readonly levels: number;
  readonly floor: number;
  readonly settled: boolean;
  readonly lastNew: number;
  /** Foundational circuits, and how many of them are nuggets. */
  readonly found: number;
  readonly nuggets: number;
  /** Tiles of the largest foundational circuit. */
  readonly largest: number;
  readonly monsters: number;
  /** Predictions that missed a harmonic the build has, or found another circuit's. */
  readonly misses: number;
  /** Share of chords on tails at the top level classified. */
  readonly tails: number;
  readonly flags: Flag[];
}

export interface Monster {
  readonly combo: string;
  readonly floor: number;
  readonly id: number;
  readonly level: number;
  readonly length: number;
  /** The child slots of each place it closes in at its first level, space-separated. */
  readonly families: string;
  /** Starts a chain or is a nugget at floor + 4 or later. */
  readonly late: boolean;
  /** At least `GIANT` tiles. */
  readonly giant: boolean;
  /** The members of its chain after it, by level: tiles, and how each is known (`ChainMember`); none for a nugget. */
  readonly chain: [level: number, length: number, mark: ChainMember['mark']][];
  /** Shares its chain is forecast to close above the top level built: its circuits closing again, and its members to come; null where not forecast. */
  readonly again: number | null;
  readonly toCome: number | null;
  /** Why its members to come are not forecast, or null. */
  readonly stop: Stop | null;
}

/** A late monster is explained when it starts a chain: its harmonics are built or predicted, and forecast on. */
export const explained = (m: Monster): boolean => m.chain.length > 0;

export interface PageIndex {
  readonly rule: string;
  readonly combos: IndexRow[];
  readonly monsters: Monster[];
}

/** A foundational circuit at least this long is a giant. */
export const GIANT = 100000;

/** Whether a foundational circuit is a monster: late (from floor + 4) or a giant. */
export const isLate = (level: number, floor: number): boolean => level >= floor + 4;
export const isGiant = (length: number): boolean => length >= GIANT;

const round = (x: number): number => Math.round(x * 1e7) / 1e7;

/** An analysis cut to what the page shows. */
export function pageCombo(d: SweepFile): PageCombo {
  const byId = new Map(d.closings.map((c) => [c.id, c] as const));
  const orderOf = (id: number): number => {
    let n = 0;
    for (let c = byId.get(id)!; c.of !== null; c = byId.get(c.of)!) n++;
    return n;
  };
  const found: FoundRow[] = [];
  const harm: HarmRow[] = [];
  for (const c of d.closings) {
    if (c.status === 'foundational') found.push([c.id, c.level, c.length, c.families.join(' '), c.steps, c.copies, c.types, c.place, c.places, c.nugget ? 1 : 0]);
    else harm.push([c.id, c.level, c.length, c.of!, c.root, c.families.length, c.matched, orderOf(c.id), c.place]);
  }
  const pred: PredRow[] = d.predictions.map((p) => [p.from, p.level, VERDICTS[p.verdict], p.walk?.length ?? 0]);
  const shares: ShareRow[] = [];
  const n = d.shares.tails.length;
  let unseen: number[] = new Array<number>(n).fill(0);
  for (const [key, values] of Object.entries(d.shares.closings)) {
    if (key === 'unseen') { unseen = values.map(round); continue; }
    const [root, cls, order] = key.split('|');
    shares.push([Number(root), cls === 'nugget' ? 0 : cls === 'foundational' ? 1 : 2, Number(order), values.map(round)]);
  }
  shares.sort((a, b) => a[0] - b[0] || a[2] - b[2]);
  return {
    rule: d.rule,
    combo: d.combo,
    levels: d.levels,
    floor: d.floor,
    settled: d.settled,
    lastNew: d.lastNew,
    growth: d.growth,
    found,
    harm,
    pred,
    tails: d.shares.tails.map(round),
    shares,
    unseen,
    above: { known: d.above.known, predicted: d.above.predicted, unseen: d.above.unseen.map((u) => [u.length, u.places, u.word]) },
    assumption: { checked: d.assumption.checked, exceptions: d.assumption.exceptions.length },
  };
}

const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);

/** Forecast columns the account chart draws past the top level built, before the limit. */
export const AHEAD = 4;
/** Two members close again alike when their ratios, level by level from their first closing, agree to this share. */
const ALIKE = 0.05;
/** Shares below this are too coarse (rounded to 1e-7) to take a ratio of. */
const FINE = 1e-5;

/** Why a chain's members to come are not forecast. */
export type Stop = 'one' | 'split' | 'gap' | 'ended' | 'loop' | 'growing' | 'again';

export const STOP_TEXT: Record<Stop, string> = {
  one: 'one member, so no ratio between members',
  split: 'two members of one order first close at different levels, and their shares are counted together',
  gap: 'its last two members first close more than two levels apart',
  ended: 'a member due within the build did not close: the chain has ended',
  loop: "its last member's harmonic is a circuit seen lower down: the chain closes into itself",
  growing: "its members' shares do not fall",
  again: 'its closings again do not yet fall at the top level',
};

/**
 * A chain (or a nugget) fitted for the forecast. A member's shares, level by
 * level from where it first closes, are its predecessor's times one ratio:
 * the harmonic closes in as many places per supertile as its parent two
 * levels down, its tiles grow by a factor that settles, and a supertile's
 * chords by the growth squared. The ratio is taken age by age over the last
 * two members; the earlier ones check it.
 */
export interface ChainFit {
  readonly root: number;
  readonly nugget: boolean;
  /** Its members (a nugget: itself) by order: the level each first closes at and its share there. */
  readonly members: readonly { readonly order: number; readonly level: number; readonly share: number }[];
  /** A member's share over its predecessor's, two levels down; null when not fitted. */
  readonly ratio: number | null;
  /** How the closings again of the members to come fall a level, far from their first; null when not fitted. */
  readonly again: number | null;
  /** Why its members to come are not forecast, or null. */
  readonly stop: Stop | null;
  /** Shares closing above the top level built: its circuits closing again there, and its members to come with their closings again. */
  readonly closingAgain: number;
  readonly toCome: number;
}

/** The shares one circuit (or, past the forecast columns, a chain's members to come) closes level by level, to the last forecast column, and beyond it in all. */
interface Line {
  readonly root: number;
  readonly cls: 0 | 1 | 2;
  /** Harmonic order; Infinity for the members past the forecast columns. */
  readonly order: number;
  /** The level it first closes at; Infinity past the forecast columns. */
  readonly born: number;
  /** Per level 0 to the last forecast column: built to the top, forecast past it. */
  readonly values: number[];
  readonly rest: number;
}

export interface Projection {
  /** The top level built, and the last forecast column. */
  readonly top: number;
  readonly ahead: number;
  readonly lines: readonly Line[];
  readonly fits: readonly ChainFit[];
  /** The share of chords on circuits in the limit: closed by the top level, and forecast above it. */
  readonly limit: number;
}

/** A ratio by age (levels since first closing): known to `known`, `far` past it (null when it cannot be fitted). */
interface ByAge {
  at(age: number): number | null;
  readonly known: number;
  readonly far: number | null;
}

/** A share carried on from `age` by its ratios: the next `steps` levels, then the rest in all; null when the ratios cannot carry it. */
function carry(v: number, age: number, r: ByAge, steps: number): { values: number[]; rest: number } | null {
  if (!(v > 0)) return { values: new Array<number>(steps).fill(0), rest: 0 };
  const values: number[] = [];
  for (let s = 0; s < steps; s++) {
    const q = r.at(++age);
    if (q === null) return null;
    values.push((v *= q));
  }
  let rest = 0;
  while (age < r.known) {
    v *= r.at(++age)!;
    rest += v;
  }
  if (v > 0) {
    if (r.far === null || r.far >= 1) return null;
    rest += (v * r.far) / (1 - r.far);
  }
  return { values, rest };
}

/**
 * The forecast past the top level built. Each circuit closes again by the
 * ratios of its own shares, level by level from where it first closed, and
 * where it has none yet (or no more), of its predecessors' that fall alike;
 * past every level known, by the last ratio. Each chain fitted goes on with
 * members two levels apart, each `ratio` times its predecessor's share where
 * it first closes and closing again as its predecessors do.
 */
export function project(p: PageCombo, ahead = AHEAD): Projection {
  const T = p.tails.length - 1;
  const H = T + ahead;
  const byRoot = new Map<number, ShareRow[]>();
  for (const r of p.shares) if (r[3].some((v) => v > 0)) (byRoot.get(r[0]) ?? byRoot.set(r[0], []).get(r[0])!).push(r);
  const lines: Line[] = [];
  const fits: ChainFit[] = [];
  for (const [root, rows] of byRoot) {
    rows.sort((a, b) => a[2] - b[2]);
    const born = rows.map((r) => r[3].findIndex((v) => v > 0));
    const v = (i: number, age: number): number => rows[i][3][born[i] + age];
    const oldest = (i: number): number => T - born[i];
    /** Row i's ratio at an age it has, 0 once it has stopped closing. */
    const own = (i: number, age: number): number => (v(i, age - 1) > 0 ? v(i, age) / v(i, age - 1) : 0);
    const alike = (k: number, i: number): boolean => {
      for (let a = 1; a <= Math.min(oldest(k), oldest(i)); a++) {
        if (v(k, a - 1) < FINE || v(i, a - 1) < FINE) continue;
        const x = own(k, a), y = own(i, a);
        if (Math.abs(x - y) > ALIKE * Math.max(x, y)) return false;
      }
      return true;
    };
    const byAge = (i: number): ByAge => {
      const src = [i];
      for (let k = i - 1; k >= 0 && alike(k, i); k--) src.push(k);
      const deep = src.reduce((a, b) => (oldest(b) > oldest(a) ? b : a));
      const known = oldest(deep);
      const far = known >= 2 ? own(deep, known) : v(deep, known) > 0 ? null : 0;
      return {
        known,
        far,
        at: (age) => {
          for (const k of src) if (age <= oldest(k)) return own(k, age);
          return far;
        },
      };
    };
    let closingAgain = 0;
    rows.forEach((r, i) => {
      const c = carry(r[3][T], oldest(i), byAge(i), H - T) ?? { values: new Array<number>(H - T).fill(0), rest: 0 };
      closingAgain += sum(c.values) + c.rest;
      lines.push({ root, cls: r[1], order: r[2], born: born[i], values: [...r[3], ...c.values], rest: c.rest });
    });
    const nugget = rows[0][1] === 0;
    const members = rows.map((r, i) => ({ order: r[2], level: born[i], share: r[3][born[i]] }));
    const n = rows.length;
    let stop: Stop | null = null;
    let ratio: number | null = null;
    let again: number | null = null;
    let toCome = 0;
    if (!nugget) {
      const levelsOf = new Map<number, Set<number>>();
      for (const h of p.harm) if (h[4] === root) (levelsOf.get(h[7]) ?? levelsOf.set(h[7], new Set()).get(h[7])!).add(h[1]);
      const last = members[n - 1];
      const lastId = last.order === 0 ? root : p.harm.find((h) => h[4] === root && h[7] === last.order && h[1] === last.level)?.[0];
      const verdict = lastId === undefined ? undefined : p.pred.find((x) => x[0] === lastId);
      if ([...levelsOf.values()].some((s) => s.size > 1)) stop = 'split';
      else if (n < 2) stop = 'one';
      else if (last.level - members[n - 2].level !== 2) stop = 'gap';
      else if (last.level + 2 <= T || verdict?.[2] === 'none' || (verdict?.[2] === 'forecast' && !verdict[3])) stop = 'ended';
      else if (verdict?.[2] === 'built') stop = 'loop';
      else {
        let logs = 0, count = 0;
        for (let a = 0; a <= Math.min(oldest(n - 1), oldest(n - 2)); a++) {
          if (a > 0 && (v(n - 1, a) < FINE || v(n - 2, a) < FINE)) continue;
          logs += Math.log(v(n - 1, a) / v(n - 2, a));
          count++;
        }
        ratio = Math.exp(logs / count);
        const r = byAge(n - 1);
        const whole = carry(1, 0, r, 0);
        again = r.far;
        if (ratio >= 1) stop = 'growing';
        else if (!whole) stop = 'again';
        else {
          const each = 1 + whole.rest;
          let k = 1;
          for (; last.level + 2 * k <= H; k++) {
            const at = last.level + 2 * k;
            const s = last.share * ratio ** k;
            const c = carry(s, 0, r, H - at)!;
            const values = new Array<number>(at).fill(0);
            values.push(s, ...c.values);
            lines.push({ root, cls: 2, order: last.order + k, born: at, values, rest: c.rest });
            toCome += s + sum(c.values) + c.rest;
          }
          const rest = ((last.share * ratio ** k) / (1 - ratio)) * each;
          lines.push({ root, cls: 2, order: Infinity, born: Infinity, values: new Array<number>(H + 1).fill(0), rest });
          toCome += rest;
        }
      }
    } else {
      again = byAge(0).far;
    }
    fits.push({ root, nugget, members, ratio: stop ? (stop === 'growing' ? ratio : null) : ratio, again, stop, closingAgain, toCome });
  }
  const forecast = sum(lines.map((l) => sum(l.values.slice(T + 1)) + l.rest));
  return { top: T, ahead: H, lines, fits, limit: 1 - p.tails[T] + forecast };
}

/** How the account chart splits the closed chords. */
export type Split = 'class' | 'order' | 'chain';

export interface Segment {
  /** Stable key: the colour follows it. */
  readonly key: string;
  readonly label: string;
  /** Per column (`Account.columns`), the share of chords in this segment. */
  readonly values: number[];
  /** A part of the tails: chords that close later, or that nothing known accounts for. */
  readonly tail?: boolean;
}

export interface Account {
  /** The levels 0 to the top built, then `AHEAD` levels forecast, then the limit (level null). */
  readonly columns: readonly { readonly level: number | null; readonly forecast: boolean }[];
  readonly segments: Segment[];
  readonly projection: Projection;
  /** How far the forecast takes more than the tails hold (0 when it does not); the tails' parts are scaled down to fit. */
  readonly over: number;
}

/** The largest chains shown on their own when splitting by chain; the rest are grouped. */
export const CHAINS_SHOWN = 6;

/**
 * The account chart's segments, bottom up: nuggets, then the chains split
 * by class (foundational, harmonics), by harmonic order, or by chain (the
 * largest `CHAINS_SHOWN`, then the others), then circuits at the level
 * above the build that no known circuit explains; then the tails, split by
 * what becomes of them: chords that circuits known by the top level close
 * later (in the build, or forecast past it), and the rest, not accounted
 * for. Without a split the tails that close later are told apart by when
 * their circuit first closes: a foundational circuit found later, a
 * harmonic of a chain known by the column, or a circuit closing again. Past
 * the top level the closings are forecast, and the last column is the
 * limit. In every column the segments add up to 1, but for rounding.
 */
export function account(p: PageCombo, split: Split): Account {
  const pr = project(p);
  const T = pr.top;
  const H = pr.ahead;
  const columns = [...Array.from({ length: H + 1 }, (_, m) => ({ level: m, forecast: m > T })), { level: null, forecast: true }];
  const C = columns.length;
  const total = (l: Line): number => sum(l.values) + l.rest;
  const cum = (l: Line): number[] => {
    const out: number[] = [];
    let acc = 0;
    for (let m = 0; m <= H; m++) out.push((acc += l.values[m]));
    out.push(total(l));
    return out;
  };
  const sumOf = (ls: readonly Line[], f: (l: Line) => number[]): number[] => {
    const out = new Array<number>(C).fill(0);
    for (const l of ls) f(l).forEach((x, c) => (out[c] += x));
    return out;
  };
  const closed = (ls: readonly Line[]) => sumOf(ls, cum);
  const later = (ls: readonly Line[], keep: (l: Line, m: number) => boolean = () => true) =>
    sumOf(ls, (l) => {
      const c = cum(l);
      const t = total(l);
      return c.map((x, i) => (i < C - 1 && keep(l, i) ? t - x : 0));
    });
  const lines = pr.lines;
  const nuggets = lines.filter((l) => l.cls === 0);
  const chains = lines.filter((l) => l.cls !== 0);
  const foundAt = new Map<number, number>();
  for (const l of lines) foundAt.set(l.root, Math.min(foundAt.get(l.root) ?? Infinity, l.born));
  const name = (root: number): string => {
    const f = p.found.find((x) => x[0] === root);
    return f ? `chain of ${f[2].toLocaleString('en-US')} at level ${f[1]}` : `chain ${root}`;
  };
  const closedSegs: Segment[] = [{ key: 'nugget', label: 'Nuggets', values: closed(nuggets) }];
  const tailSegs: Segment[] = [];
  if (split === 'class') {
    closedSegs.push({ key: 'found', label: 'Chains: foundational', values: closed(chains.filter((l) => l.cls === 1)) });
    closedSegs.push({ key: 'harm', label: 'Chains: harmonics', values: closed(chains.filter((l) => l.cls === 2)) });
  } else if (split === 'order') {
    const shown = chains.filter((l) => l.born <= H);
    const top = Math.max(0, ...shown.map((l) => l.order));
    for (let o = 0; o <= top; o++) {
      const ls = chains.filter((l) => l.order === o || (o === top && l.order > top));
      const up = o === top && chains.some((l) => l.order > top);
      closedSegs.push({ key: `order${Math.min(o, ORDERS - 1)}-${o}`, label: o === 0 ? 'Foundational (order 0)' : `Harmonic order ${o}${up ? ' and up' : ''}`, values: closed(ls) });
    }
  }
  if (split === 'chain') {
    const roots = [...new Set(chains.map((l) => l.root))];
    const built = (root: number): number => sum(p.shares.filter((r) => r[0] === root && r[1] !== 0).map((r) => sum(r[3])));
    roots.sort((a, b) => built(b) - built(a));
    roots.slice(0, CHAINS_SHOWN).forEach((root, i) => {
      const ls = chains.filter((l) => l.root === root);
      const label = name(root);
      closedSegs.push({ key: `chain${i}`, label: label[0].toUpperCase() + label.slice(1), values: closed(ls) });
      tailSegs.push({ key: `later-chain${i}`, label: `Tails: ${label}`, values: later(ls), tail: true });
    });
    const others = chains.filter((l) => roots.indexOf(l.root) >= CHAINS_SHOWN);
    if (others.length) {
      closedSegs.push({ key: 'chains-other', label: 'Other chains', values: closed(others) });
      tailSegs.push({ key: 'later-chains-other', label: 'Tails: other chains', values: later(others), tail: true });
    }
    tailSegs.unshift({ key: 'later-nugget', label: 'Tails: nuggets', values: later(nuggets), tail: true });
  } else {
    tailSegs.push({ key: 'later-found', label: 'Tails: foundational circuits found later', values: later(lines, (l, m) => foundAt.get(l.root)! > m), tail: true });
    tailSegs.push({ key: 'later-next', label: 'Tails: next harmonics of known chains', values: later(chains, (l, m) => foundAt.get(l.root)! <= m && l.born > m), tail: true });
    tailSegs.push({ key: 'later-again', label: 'Tails: known circuits closing again', values: later(lines, (l, m) => l.born <= m), tail: true });
  }
  let u = 0;
  const unseen = [...p.unseen.map((x) => (u += x)), ...new Array<number>(C - p.unseen.length).fill(u)];
  closedSegs.push({ key: 'unseen', label: 'Unseen circuits', values: unseen });
  // the tails' parts that close later, and the rest; past the top, the closings forecast there come out of the tails at the top
  const unaccounted = new Array<number>(C).fill(0);
  let over = 0;
  for (let c = 0; c < C; c++) {
    const past = c > T ? closedSegs.map((s) => s.values[c] - s.values[T]) : [];
    const known = sum(tailSegs.map((s) => s.values[c])) + sum(past);
    const left = p.tails[Math.min(c, T)] - known;
    if (left >= 0) unaccounted[c] = left;
    else {
      // the forecast takes more than the tails hold: its parts scaled to fit
      over = Math.max(over, -left);
      const k = known > 0 ? Math.max(0, p.tails[Math.min(c, T)]) / known : 0;
      for (const s of tailSegs) s.values[c] *= k;
      closedSegs.forEach((s, i) => c > T && (s.values[c] = s.values[T] + past[i] * k));
    }
  }
  tailSegs.push({ key: 'unaccounted', label: 'Tails: not accounted for', values: unaccounted, tail: true });
  return { columns, segments: [...closedSegs, ...tailSegs], projection: pr, over };
}

/** The account's segments alone. */
export const segments = (p: PageCombo, split: Split): Segment[] => account(p, split).segments;

/** Harmonic orders with a colour of their own; higher orders share the last. */
export const ORDERS = 5;

/** What the tails at level L become, k levels up: shares of those tails closing into each chain (largest first), into nuggets, into unseen circuits, and still open. */
export interface TailFate {
  readonly k: number;
  readonly chains: [root: number, share: number][];
  readonly nuggets: number;
  readonly unseen: number;
  readonly open: number;
}

/**
 * The tails at level L followed up: every chord on them closes, k levels
 * up or sooner, into a circuit that closes at levels L + 1 to L + k (a
 * circuit closing at level m is made of chords on tails at every level below
 * m), or is still on a tail at L + k. The shares are of the chords on tails
 * at L, so each row adds up to 1, but for rounding.
 */
export function tailFates(p: PageCombo, L: number): TailFate[] {
  const out: TailFate[] = [];
  const base = p.tails[L];
  if (!(base > 0)) return out;
  for (let k = 1; L + k < p.tails.length; k++) {
    const within = (r: ShareRow): number => sum(r[3].slice(L + 1, L + k + 1));
    const byRoot = new Map<number, number>();
    let nuggets = 0;
    for (const r of p.shares) {
      if (r[1] === 0) nuggets += within(r);
      else byRoot.set(r[0], (byRoot.get(r[0]) ?? 0) + within(r));
    }
    out.push({
      k,
      chains: [...byRoot].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([r, v]) => [r, v / base]),
      nuggets: nuggets / base,
      unseen: sum(p.unseen.slice(L + 1, L + k + 1)) / base,
      open: p.tails[L + k] / base,
    });
  }
  return out;
}

export interface BackTest {
  readonly level: number;
  /** Of the chords on tails at this level: closing (to the level above the build) into circuits whose chain was known by this level, into ones found later or unseen, and still open there. */
  readonly explained: number;
  readonly unexplained: number;
  readonly open: number;
  /** The foundational circuits first closing at the next level, and the share of this level's tails their chains close. */
  readonly found: [root: number, share: number][];
}

/**
 * The back-test: at each level L from 2 up, the circuits known by L (their
 * chains' later members included) against what the tails at L close into, to
 * the level above the build. The unexplained part falls by exactly the
 * chains first found at L + 1.
 */
export function backTest(p: PageCombo): BackTest[] {
  const first = new Map(p.found.map((f) => [f[0], f[1]] as const));
  const out: BackTest[] = [];
  const top = p.tails.length - 1;
  for (let L = 2; L < top; L++) {
    const base = p.tails[L];
    if (!(base > 0)) continue;
    let explained = 0, unexplained = sum(p.unseen.slice(L + 1));
    const newRoots = new Map<number, number>();
    for (const r of p.shares) {
      const v = sum(r[3].slice(L + 1));
      const at = first.get(r[0]) ?? Infinity;
      if (at <= L) explained += v;
      else {
        unexplained += v;
        if (at === L + 1) newRoots.set(r[0], (newRoots.get(r[0]) ?? 0) + v);
      }
    }
    out.push({ level: L, explained: explained / base, unexplained: unexplained / base, open: p.tails[top] / base, found: [...newRoots].map(([r, v]) => [r, v / base]) });
  }
  return out;
}

/** One chain's forecast from a level: what its next members are expected to take. */
export interface ChainForecast {
  readonly root: number;
  /** The level its last member known by then first closes at, and that member's share there. */
  readonly level: number;
  readonly share: number;
  /** The share falls by q a member (two levels). */
  readonly q: number;
}

/**
 * Where a chain's members first close, with their shares there: per
 * harmonic order, the first level its bucket (`ShareRow`) takes chords, to
 * the level above the build (where a member is a predicted harmonic). A
 * member's later closings, in more places, are not counted here.
 */
function births(p: PageCombo, root: number): [level: number, order: number, share: number][] {
  const f = p.found.find((x) => x[0] === root);
  if (!f || f[9]) return [];
  const byOrder = new Map<number, number[]>();
  for (const r of p.shares) {
    if (r[0] !== root || r[1] === 0) continue;
    const acc = byOrder.get(r[2]) ?? byOrder.set(r[2], new Array<number>(r[3].length).fill(0)).get(r[2])!;
    r[3].forEach((v, m) => (acc[m] += v));
  }
  const out: [number, number, number][] = [];
  for (const [order, v] of [...byOrder].sort((a, b) => a[0] - b[0])) {
    const level = v.findIndex((x) => x > 0);
    if (level >= 0) out.push([level, order, v[level]]);
  }
  return out;
}

/**
 * The forecast from level L, made from what is known by L: each chain known
 * by L (foundational by L, at least two members first closed by L, no
 * member due by L missing, and the last member's predicted harmonic not a
 * circuit seen lower down, which would close the chain into itself) goes on
 * with members two levels apart, each taking q times its predecessor's
 * share where it first closes, q the ratio of its last two members. That
 * is the place counts (a harmonic closing in as many places per supertile of
 * each type as its parent, the one assumption, checked in `assumption`)
 * times the tiles (growing as over the last two members) over the chords of
 * a supertile (growing by the substitution's growth squared every two
 * levels). Nuggets and the later closings of known circuits are not
 * forecast.
 */
export function forecastChains(p: PageCombo, L: number): ChainForecast[] {
  const out: ChainForecast[] = [];
  for (const f of p.found) {
    if (f[1] > L || f[9]) continue;
    const known = births(p, f[0]).filter(([level]) => level <= L);
    if (known.length < 2) continue;
    const [lv, order, s] = known[known.length - 1];
    // a member due by L that did not close ends the chain
    if (lv + 2 <= L) continue;
    // so does a last member whose harmonic, predicted from the tables up to L, is a circuit seen lower down: the chain closes into itself
    const last = order === 0 ? f[0] : p.harm.find((h) => h[4] === f[0] && h[7] === order && h[1] === lv)?.[0];
    if (last !== undefined && lv + 1 <= L && p.pred.some((x) => x[0] === last && x[2] === 'built')) continue;
    const prev = known[known.length - 2][2];
    const q = prev > 0 ? s / prev : NaN;
    if (s > 0 && q > 0 && q < 1) out.push({ root: f[0], level: lv, share: s, q });
  }
  return out;
}

/** The forecast's members first closing in (L, upTo]: their expected shares, summed. Above `upTo`, the rest of the geometric series. */
export function forecastBetween(fc: readonly ChainForecast[], upTo: number): { within: number; beyond: number } {
  let within = 0, beyond = 0;
  for (const c of fc) {
    // members at c.level + 2, + 4, ...: share · q^j
    const inside = Math.max(0, Math.floor((upTo - c.level) / 2));
    const total = (c.share * c.q) / (1 - c.q);
    const w = (c.share * c.q * (1 - c.q ** inside)) / (1 - c.q);
    within += w;
    beyond += total - w;
  }
  return { within, beyond };
}

export interface ForecastCheck {
  readonly level: number;
  /** Shares of chords: the chains known by `level`, their members first closing above it to the top built, forecast and actual. */
  readonly forecast: number;
  readonly actual: number;
}

/** The forecast made at each level, against what the build shows above it: the members of chains known then, first closing between that level and the top. */
export function forecastChecks(p: PageCombo): ForecastCheck[] {
  const top = p.tails.length - 1;
  const out: ForecastCheck[] = [];
  for (let L = 2; L < top; L++) {
    const fc = forecastChains(p, L);
    if (!fc.length) continue;
    let actual = 0;
    for (const c of fc) for (const [level, , s] of births(p, c.root)) if (level > c.level && level <= top) actual += s;
    out.push({ level: L, forecast: forecastBetween(fc, top).within, actual });
  }
  return out;
}

/**
 * The tails at the top level built that the known chains are expected to
 * take, with their members forecast from the top level: against the tails
 * there, the rest is room for later closings of known circuits, for new
 * circuits and for open strands.
 */
export function expectedTails(p: PageCombo): { expected: number; actual: number; chains: [root: number, share: number][] } {
  const top = p.tails.length - 1;
  const fc = forecastChains(p, top);
  const chains: [number, number][] = fc.map((c) => [c.root, forecastBetween([c], top).beyond]);
  return { expected: sum(chains.map((c) => c[1])), actual: p.tails[top], chains: chains.sort((a, b) => b[1] - a[1]) };
}

export type Flag = 'unseen' | 'open' | 'nuggets' | 'gap' | 'forecast' | 'assumption';

export const FLAG_TEXT: Record<Flag, string> = {
  unseen: 'tails close into a circuit seen nowhere below',
  open: 'the tails not closed do not shrink',
  nuggets: 'only nuggets, and the tails stay large',
  gap: 'circuits found at the top levels close tails no known chain explains',
  forecast: "a chain's forecast from some level takes more than the build shows: the chain closes into itself one level later",
  assumption: "a harmonic closes in a different number of places than its parent",
};

/** A combination's flags, from its data. */
export function flagsOf(p: PageCombo): Flag[] {
  const out: Flag[] = [];
  const top = p.tails.length - 1;
  if (p.above.unseen.length) out.push('unseen');
  if (p.tails[top] >= 0.97 * p.tails[top - 1] && p.tails[top] > 0) out.push('open');
  if (!p.found.some((f) => !f[9]) && p.tails[p.levels] > 0.2) out.push('nuggets');
  const bt = backTest(p).filter((b) => b.level >= p.levels - 1);
  if (bt.some((b) => b.unexplained > 1e-9)) out.push('gap');
  const e = expectedTails(p);
  if (e.expected > e.actual || forecastChecks(p).some((c) => c.forecast > 1.25 * c.actual + 1e-6)) out.push('forecast');
  if (p.assumption.exceptions) out.push('assumption');
  return out;
}

/** The monsters of a combination: its foundational circuits at floor + 4 or later, or giants. */
export function monstersOf(p: PageCombo): Monster[] {
  const list = p.found.filter(([, level, length]) => isLate(level, p.floor) || isGiant(length));
  if (!list.length) return [];
  const fits = project(p).fits;
  return list.map(([id, level, length, families]) => {
    const fit = fits.find((x) => x.root === id);
    const chain = chainOf(p, id).flatMap((st) => st.members.map((m): [number, number, ChainMember['mark']] => [st.level, m.length, m.mark]));
    const r6 = (x: number): number => Math.round(x * 1e6) / 1e6;
    return {
      combo: p.combo,
      floor: p.floor,
      id,
      level,
      length,
      families,
      late: isLate(level, p.floor),
      giant: isGiant(length),
      chain,
      again: fit ? r6(fit.closingAgain) : null,
      toCome: fit && !fit.nugget && !fit.stop ? r6(fit.toCome) : null,
      stop: fit?.stop ?? null,
    };
  });
}

/** A combination's row of the index. */
export function indexRow(p: PageCombo): IndexRow {
  return {
    combo: p.combo,
    levels: p.levels,
    floor: p.floor,
    settled: p.settled,
    lastNew: p.lastNew,
    found: p.found.length,
    nuggets: p.found.filter((f) => f[9]).length,
    largest: Math.max(0, ...p.found.map((f) => f[2])),
    monsters: monstersOf(p).length,
    misses: p.pred.filter((x) => x[2] === 'missed' || x[2] === 'other').length,
    tails: p.tails[p.levels],
    flags: flagsOf(p),
  };
}

export function pageIndex(rule: string, combos: readonly PageCombo[]): PageIndex {
  const sorted = [...combos].sort((a, b) => a.combo.localeCompare(b.combo));
  return { rule, combos: sorted.map(indexRow), monsters: sorted.flatMap(monstersOf) };
}

/** One member of a chain: its tiles, and how it is known. */
export interface ChainMember {
  readonly id: number | null;
  readonly length: number;
  /**
   * built: closed, not predicted (below the levels predictions start at);
   * confirmed: predicted from two levels down, then closed as predicted;
   * missed: closed, but nothing was predicted;
   * predicted: predicted for a level above the build;
   * other: the walk predicted is another circuit's harmonic.
   */
  readonly mark: 'built' | 'confirmed' | 'missed' | 'predicted' | 'other';
  /** Predicted: the member two levels down it is predicted from. */
  readonly from?: number;
}

export interface ChainStep {
  readonly level: number;
  readonly members: readonly ChainMember[];
}

/**
 * The chain a foundational circuit starts, by level: the harmonics built,
 * each with how its prediction fared, then what was predicted from the last
 * of them above the build. The foundational circuit itself is not listed.
 */
export function chainOf(p: PageCombo, id: number): ChainStep[] {
  const f = p.found.find((x) => x[0] === id);
  if (!f) return [];
  const predFrom = new Map<number, PredRow>();
  for (const x of p.pred) predFrom.set(x[0], x);
  const steps: ChainStep[] = [];
  let tip: number[] = [id];
  // harmonics by `of`: a harmonic closes two levels above a place of its parent, which may close again above where it first closes
  for (;;) {
    const built = p.harm.filter((h) => tip.includes(h[3]));
    if (built.length) {
      for (const level of [...new Set(built.map((h) => h[1]))].sort((a, b) => a - b)) {
        steps.push({
          level,
          members: built.filter((h) => h[1] === level).map((h) => {
            const v = predFrom.get(h[3])?.[2];
            return { id: h[0], length: h[2], mark: v === 'confirmed' ? 'confirmed' : v === 'missed' ? 'missed' : 'built' };
          }),
        });
      }
      tip = built.map((h) => h[0]);
      continue;
    }
    const after = new Map<number, ChainMember[]>();
    for (const t of tip) {
      const x = predFrom.get(t);
      if (!x || !x[3] || (x[2] !== 'forecast' && x[2] !== 'other')) continue;
      const level = x[1] + 2;
      (after.get(level) ?? after.set(level, []).get(level)!).push({ id: null, length: x[3], mark: x[2] === 'forecast' ? 'predicted' : 'other', from: t });
    }
    for (const [level, members] of [...after].sort((a, b) => a[0] - b[0])) steps.push({ level, members });
    break;
  }
  return steps;
}

const pct = (x: number): string => `${(100 * x).toFixed(x < 0.01 ? 2 : 1)}%`;
const span = (a: number, b: number): string => (a === b ? `level ${a}` : `levels ${a} to ${b}`);

/** What the data shows for a combination, and what of it is proven: sentences generated from the data. */
export function provenNote(p: PageCombo): string[] {
  const L = p.levels;
  const top = p.tails.length - 1;
  const out: string[] = [];
  if (p.settled) out.push(`Nothing foundational first closes at ${span(p.lastNew + 1, L)} (built to ${L}); not proven beyond.`);
  else out.push(`A foundational circuit first closes at level ${p.lastNew} of the ${L} built, at every floor tried, so the floor is not settled.`);
  out.push(`Any circuit closing above level ${top} is made of chords on tails at level ${top}: at most ${pct(p.tails[top])} of them (proven).`);
  const unseen = p.above.unseen.length;
  out.push(
    unseen
      ? `At level ${top}, ${unseen} circuit${unseen > 1 ? 's' : ''} close${unseen > 1 ? '' : 's'} that ${unseen > 1 ? 'are' : 'is'} no known circuit and no predicted harmonic.`
      : `Every circuit closing at level ${top} (one above the classified levels) is a known circuit (${p.above.known} places) or a predicted harmonic (${p.above.predicted} places).`,
  );
  const n = (v: Verdict): number => p.pred.filter((x) => x[2] === v).length;
  const checked = p.pred.length - n('forecast');
  if (checked) {
    const parts = [
      n('confirmed') && `${n('confirmed')} closed as the harmonic predicted`,
      n('built') && `${n('built')} closed as a circuit seen lower down`,
      n('none') && `${n('none')} predicted nothing and nothing closed`,
      n('missed') && `${n('missed')} predicted nothing where a harmonic closed`,
      n('other') && `${n('other')} found another circuit's harmonic`,
    ].filter(Boolean);
    out.push(`Of ${checked} predictions checked against the build, ${parts.join(', ')}.`);
  }
  if (p.assumption.checked)
    out.push(
      `The forecast's one assumption, that a harmonic closes in as many places per supertile of each type as its parent two levels down, held in ${p.assumption.checked - p.assumption.exceptions} of ${p.assumption.checked} checks.`,
    );
  return out;
}
