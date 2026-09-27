/**
 * Decomposing a combination into independent smaller patterns.
 *
 * A crossing's position depends only on its seam (the class's edge contract),
 * never on which rule is selected. So if a rule R splits into two disjoint
 * valid rules A ⊔ B, and in EVERY tile type the chosen pairing only ever joins
 * two A-crossings or two B-crossings, then the strands of R are exactly the
 * strands of A (under the pairing restricted to A's crossings) laid over the
 * strands of B, with no point in common. Nothing about the combination is new:
 * its circuits and lines are the union of two patterns already classified.
 *
 * For Tile(1,1) the full rule 01235678 splits three ways: 15 ⊔ 023678,
 * 0136 ⊔ 2578 and 0356 ⊔ 1278.
 */

import { connectionPoints } from './edges';
import { leafOrder, type TileFamilyId } from './families';
import { enumerateMatchings, nonCrossingForTile, type Matching } from './matchings';
import { validEdgeSubsets } from './subsets';

export interface RuleSplit {
  /** Two disjoint valid rules whose union is the rule, as sorted digit strings. */
  readonly parts: readonly [string, string];
}

export interface ComboPart {
  readonly rule: string;
  /** Combination digits of the part, per leaf type. */
  readonly digits: readonly number[];
}

export interface Decomposition {
  readonly split: RuleSplit;
  readonly parts: readonly [ComboPart, ComboPart];
}

const ruleKey = (edges: readonly number[]) => [...edges].sort((a, b) => a - b).join('');

/** Every unordered split of `rule` into two non-empty disjoint valid rules. */
export function ruleSplits(family: TileFamilyId, rule: readonly number[]): readonly RuleSplit[] {
  const want = new Set(rule);
  const valid = validEdgeSubsets(family).filter((s) => s.edges.length > 0);
  const out: RuleSplit[] = [];
  for (const a of valid) {
    if (!a.edges.every((e) => want.has(e))) continue;
    const rest = rule.filter((e) => !a.edges.includes(e));
    if (rest.length === 0) continue;
    const b = valid.find((s) => ruleKey(s.edges) === ruleKey(rest));
    if (!b) continue;
    const ka = ruleKey(a.edges);
    const kb = ruleKey(b.edges);
    if (ka < kb) out.push({ parts: [ka, kb] });
  }
  return out;
}

function samePairs(a: Matching, b: Matching): boolean {
  const norm = (m: Matching) =>
    m
      .map(([x, y]) => (x < y ? `${x}-${y}` : `${y}-${x}`))
      .sort()
      .join(',');
  return norm(a) === norm(b);
}

/**
 * Per leaf type and per option digit of the rule: the part digits the option
 * restricts to under `split`, or null when some chord joins A to B.
 */
export interface SplitTable {
  readonly split: RuleSplit;
  /** table[type][digit] = [digitInA, digitInB] | null */
  readonly table: readonly (readonly (readonly [number, number] | null)[])[];
}

const tableCache = new Map<string, SplitTable>();

export function splitTable(family: TileFamilyId, rule: readonly number[], split: RuleSplit): SplitTable {
  const key = `${family}|${ruleKey(rule)}|${split.parts.join('/')}`;
  const hit = tableCache.get(key);
  if (hit) return hit;
  const sel = new Set(rule);
  const partSets = split.parts.map((p) => new Set([...p].map(Number)));
  const table = leafOrder(family).map((type) => {
    const pts = connectionPoints(family, type, sel);
    const side = pts.map((p) => (partSets[0].has(p.edge.major) ? 0 : 1));
    // Local index of each crossing within its own part (order is preserved).
    const local = side.map((s, i) => side.slice(0, i).filter((t) => t === s).length);
    const all = enumerateMatchings(pts.length);
    const options = nonCrossingForTile(family, type, sel);
    const partOptions = split.parts.map((p) => {
      const subset = new Set([...p].map(Number));
      const n = connectionPoints(family, type, subset).length;
      const allP = enumerateMatchings(n);
      const nc = nonCrossingForTile(family, type, subset);
      return nc.length ? nc.map((m) => allP[m]) : [[] as Matching];
    });
    const rows = (options.length ? options.map((m) => all[m]) : [[] as Matching]).map((m) => {
      const halves: [number, number][][] = [[], []];
      for (const [x, y] of m) {
        if (side[x] !== side[y]) return null;
        halves[side[x]].push([local[x], local[y]]);
      }
      const digits = halves.map((h, s) => partOptions[s].findIndex((pm) => samePairs(pm, h)));
      // Every restriction of a non-crossing matching is non-crossing, so this
      // always finds a digit; guard anyway.
      return digits[0] >= 0 && digits[1] >= 0 ? ([digits[0], digits[1]] as const) : null;
    });
    return rows;
  });
  const out = { split, table };
  tableCache.set(key, out);
  return out;
}

/** Every way the combination decomposes (empty when it is indecomposable). */
export function decomposeCombo(
  family: TileFamilyId,
  rule: readonly number[],
  digits: readonly number[],
): readonly Decomposition[] {
  const out: Decomposition[] = [];
  for (const split of ruleSplits(family, rule)) {
    const { table } = splitTable(family, rule, split);
    const a: number[] = [];
    const b: number[] = [];
    let ok = true;
    for (let t = 0; t < table.length && ok; t++) {
      const r = table[t][digits[t]];
      if (!r) ok = false;
      else {
        a.push(r[0]);
        b.push(r[1]);
      }
    }
    if (ok) {
      out.push({
        split,
        parts: [
          { rule: split.parts[0], digits: a },
          { rule: split.parts[1], digits: b },
        ],
      });
    }
  }
  return out;
}
