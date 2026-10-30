/**
 * A strand rule — the seam classes that carry a strand, each tile type's
 * matching, and the seam contracts — and the combination string that names
 * it (`023468-111000100`).
 *
 * Every page that draws circuits keeps one of these in its own state and
 * hands it to `StrandRuleControls`; this module holds what they share: the
 * rule each family opens with, reading and writing the combination string,
 * keeping the matching in range as the rule changes, and picking a drawn
 * strand under the pointer.
 *
 * Pure — no React, no DOM.
 */

import {
  comboToMatchingIndices,
  familyMajors,
  formatComboShareString,
  leafOrder,
  matchingIndicesToCombo,
  normalizeMatchingVector,
  parseComboShareString,
  type EdgeContracts,
  type Pt,
  type TileFamilyId,
} from '../core';

export interface StrandRule {
  /** Selected seam classes, sorted. */
  readonly subset: readonly number[];
  /** Matching index per leaf type, in `leafOrder(family)` order. */
  readonly matching: readonly number[];
  readonly contracts?: EdgeContracts;
}

/** The combination each family opens with: the site's usual examples. */
export const DEFAULT_SHARE: Readonly<Record<'hex' | 'spectre', string>> = {
  hex: '023468-111000100',
  spectre: '2578-0100101100',
};

/** The rule a family opens with. */
export function defaultRule(family: 'hex' | 'spectre'): StrandRule {
  return ruleFromShare(family, DEFAULT_SHARE[family])!;
}

/**
 * The rule a combination string names, under `contracts` when given, or null
 * when the string is not one: it must parse, name only classes the family
 * has, and carry one digit per leaf type.
 */
export function ruleFromShare(
  family: TileFamilyId,
  share: string,
  contracts?: EdgeContracts,
): StrandRule | null {
  const parsed = parseComboShareString(share);
  if (!parsed) return null;
  const majors = new Set(familyMajors(family));
  if (!parsed.subset.every((m) => majors.has(m))) return null;
  if (parsed.combo.length !== leafOrder(family).length) return null;
  const matching = comboToMatchingIndices(family, parsed.subset, parsed.combo, contracts);
  return {
    subset: parsed.subset,
    matching: normalizeMatchingVector(family, parsed.subset, matching, contracts),
    ...(contracts ? { contracts } : {}),
  };
}

/** The combination string of a rule, or null when some matching crosses itself. */
export function ruleShare(family: TileFamilyId, rule: StrandRule): string | null {
  const combo = matchingIndicesToCombo(family, rule.subset, rule.matching, rule.contracts);
  return combo === null ? null : formatComboShareString(rule.subset, combo);
}

/** `rule` with `next` laid over it, its matching brought back into range. */
export function changeRule(family: TileFamilyId, rule: StrandRule, next: Partial<StrandRule>): StrandRule {
  const merged = { ...rule, ...next };
  return { ...merged, matching: normalizeMatchingVector(family, merged.subset, merged.matching, merged.contracts) };
}

/** The subset with one class switched on or off, kept sorted. */
export function toggleClass(subset: readonly number[], major: number): readonly number[] {
  return subset.includes(major) ? subset.filter((m) => m !== major) : [...subset, major].sort((a, b) => a - b);
}

/** The matching vector with one tile type's index set. */
export function setTileMatching(
  family: TileFamilyId,
  matching: readonly number[],
  type: string,
  index: number,
): readonly number[] {
  return leafOrder(family).map((t, i) => (t === type ? index : matching[i] ?? 0));
}

/** A drawn strand: its points in order, and whether the last joins the first. */
export interface DrawnPath {
  readonly points: readonly Pt[];
  readonly closed: boolean;
}

/** The index of the path drawn nearest `p`, if one passes within `reach`. */
export function pathNear(paths: readonly DrawnPath[], p: Pt, reach: number): number | null {
  let best = -1;
  let bestD = reach;
  paths.forEach((s, i) => {
    const n = s.points.length;
    const last = s.closed ? n : n - 1;
    for (let j = 0; j < last; j++) {
      const a = s.points[j];
      const b = s.points[(j + 1) % n];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len2 = dx * dx + dy * dy;
      const t = len2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2)) : 0;
      const d = Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
  });
  return best < 0 ? null : best;
}
