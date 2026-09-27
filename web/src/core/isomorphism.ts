/**
 * How the three labellings' rule spaces line up: Tile(1,1) ('spectre'), the
 * hexagons ('hex') and Tile(1,1) with hexagon-matching labels ('spectre-iso').
 *
 * Iso labels are the common ground. Every iso rule R has a hexagon rule
 * R \ {7} (class 7 only exists inside the Mystic) and, when R contains 4, a
 * Tile(1,1) rule R \ {4} (Tile(1,1)'s Sigma has one four-edge class-4 seam
 * where iso has a 6 half and a 4 half). They differ in exactly two places:
 *
 *  - The Mystic. A hexagon Gamma is one tile; the iso Mystic is two
 *    (Gamma1, Gamma2) joined by the class-7 seam, which carries one
 *    crossing. Composing the halves' pairings through that crossing gives a
 *    hexagon Gamma pairing exactly when Gamma2's side-by-side 6 | -6
 *    crossings (the stand-in for the hexagons' Delta–Sigma edge) are joined.
 *    Hexagon pairings that need two or more strands through seam 7 have no
 *    iso equivalent.
 *  - Sigma's split seam. A Tile(1,1) combination becomes an iso one by
 *    joining the two extra crossings to each other in Sigma and in Gamma2,
 *    which only adds a closed two-segment loop at every Sigma–Gamma2 contact.
 *    Those joins leave Gamma2's 6 unjoined to -6, so for rules with class 6
 *    the Tile(1,1) and hexagon images inside iso never meet.
 *
 * Every other tile has the same crossings in the same order in all three, so
 * counts factor as (other tiles) × (Mystic, or hexagon Gamma).
 */

import { connectionPoints } from './edges';
import type { TileFamilyId, TileTypeId } from './families';
import { enumerateMatchings, nonCrossingForTile } from './matchings';
import { comboOptionCounts } from './strandGraph';
import { validEdgeSubsets } from './subsets';

const tagOf = (e: { sign: number; major: number; variant: string }) =>
  `${e.sign < 0 ? '-' : ''}${e.major}${e.variant}`;

/** Each non-crossing option of a tile as a map crossing tag -> partner tag. */
function tagOptions(
  family: TileFamilyId,
  type: TileTypeId,
  rule: ReadonlySet<number>,
): { tags: string[]; options: Map<string, string>[] } {
  const tags = connectionPoints(family, type, rule).map((c) => tagOf(c.edge));
  const all = enumerateMatchings(tags.length);
  const nc = nonCrossingForTile(family, type, rule);
  const ms = nc.length ? nc.map((i) => all[i]) : [[]];
  return {
    tags,
    options: ms.map(
      (m) =>
        new Map(
          m.flatMap(([a, b]) => [
            [tags[a], tags[b]],
            [tags[b], tags[a]],
          ]),
        ),
    ),
  };
}

const pairKey = (m: Map<string, string>) =>
  [...m]
    .filter(([a, b]) => a < b)
    .map(([a, b]) => `${a}~${b}`)
    .sort()
    .join(' ');

export interface MysticCorrespondence {
  /** Gamma1 options × Gamma2 options under the iso rule. */
  readonly mysticPairs: number;
  /** Non-crossing options of the one-tile hexagon Gamma under the hexagon rule. */
  readonly hexGammaOptions: number;
  /** Mystic pairs that act exactly like some hexagon Gamma option. */
  readonly matched: number;
  /** Hexagon Gamma options no Mystic pair reproduces (they need 2+ strands through seam 7). */
  readonly hexUnreached: number;
}

export function mysticCorrespondence(isoRule: readonly number[]): MysticCorrespondence {
  const rule = new Set(isoRule);
  const hexRule = new Set(isoRule.filter((e) => e !== 7));
  const hex = tagOptions('hex', 'Gamma', hexRule);
  const g1 = tagOptions('spectre-iso', 'Gamma1', rule);
  const g2 = tagOptions('spectre-iso', 'Gamma2', rule);
  const hexKeys = hex.options.map(pairKey);
  const reached = new Set<number>();
  let matched = 0;
  const outer = [...g1.tags.filter((t) => t !== '7A'), ...g2.tags.filter((t) => t !== '-7A')];
  for (const a of g1.options) {
    for (const b of g2.options) {
      const out = new Map<string, string>();
      for (const t of outer) {
        let p = (g1.tags.includes(t) ? a : b).get(t) as string;
        if (p === '7A') p = b.get('-7A') as string;
        else if (p === '-7A') p = a.get('7A') as string;
        out.set(t, p);
      }
      if (rule.has(6)) {
        if (out.get('6A') !== '-6A') continue;
        out.delete('6A');
        out.delete('-6A');
      }
      const k = hexKeys.indexOf(pairKey(out));
      if (k >= 0) {
        matched++;
        reached.add(k);
      }
    }
  }
  return {
    mysticPairs: g1.options.length * g2.options.length,
    hexGammaOptions: hex.options.length,
    matched,
    hexUnreached: hex.options.length - reached.size,
  };
}

export interface RuleCorrespondence {
  /** The rule in iso labels, and its hexagon and Tile(1,1) forms ('' if none). */
  readonly iso: string;
  readonly hex: string;
  readonly spectre: string;
  readonly counts: { readonly spectre: number; readonly hex: number; readonly iso: number };
  /** Combinations that are the same pattern in hexagons and iso. */
  readonly hexAndIso: number;
  /** Hexagon combinations with no iso equivalent (2+ strands through seam 7). */
  readonly hexOnly: number;
  /** Iso combinations that are a Tile(1,1) combination plus two-segment loops. */
  readonly tileImage: number;
  /** Iso combinations that are neither. */
  readonly isoOnly: number;
  /** True when all three families are the same patterns, combination for combination. */
  readonly identical: boolean;
}

const product = (xs: readonly number[]) => xs.reduce((a, b) => a * b, 1);
const key = (xs: readonly number[]) => [...xs].sort((a, b) => a - b).join('');

/** One row per non-empty iso rule, smallest first. */
export function ruleCorrespondences(): readonly RuleCorrespondence[] {
  const spectreRules = new Set(validEdgeSubsets('spectre').map((s) => key(s.edges)));
  const hexRules = new Set(validEdgeSubsets('hex').map((s) => key(s.edges)));
  return validEdgeSubsets('spectre-iso')
    .filter((s) => s.edges.length > 0)
    .map((s) => {
      const iso = key(s.edges);
      const hexR = s.edges.filter((e) => e !== 7);
      const hex = hexRules.has(key(hexR)) ? key(hexR) : '';
      const spR = s.edges.filter((e) => e !== 4);
      const spectre = spectreRules.has(key(spR)) ? key(spR) : '';
      const counts = {
        iso: product(comboOptionCounts('spectre-iso', s.edges)),
        hex: hex ? product(comboOptionCounts('hex', hexR)) : 0,
        spectre: spectre ? product(comboOptionCounts('spectre', spR)) : 0,
      };
      const m = mysticCorrespondence(s.edges);
      // The tiles other than the Mystic / hexagon Gamma are the same in both.
      const rest = counts.iso / m.mysticPairs;
      const hexAndIso = rest * m.matched;
      const hexOnly = rest * m.hexUnreached;
      const tileImage = s.edges.includes(6) ? counts.spectre : 0;
      const isoOnly = counts.iso - hexAndIso - tileImage;
      const identical = !s.edges.includes(6) && counts.iso === counts.hex && counts.iso === counts.spectre;
      return { iso, hex, spectre, counts, hexAndIso, hexOnly, tileImage, isoOnly, identical };
    });
}
