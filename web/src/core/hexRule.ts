/**
 * A hexagon rule drawn on the Spectre, strand for strand.
 *
 * The 'spectre-iso' labels (families.ts) give every Spectre tile the seams of
 * its hexagon, so a hexagon rule's subset and matching indices apply to the
 * Spectre as they are — except inside the Mystic. The hexagon Gamma is one
 * tile; the Mystic is two (Gamma1, Gamma2) joined by the class-7 seam, and a
 * matching per half can only pass one strand across it. Here the Mystic is
 * treated as ONE tile instead: its outer dots take the hexagon Gamma's
 * pairing directly, and a pair split between the halves runs through its own
 * point on the internal seam, so any number of strands can cross. Gamma2's
 * side-by-side `6` | `-6` dots — the stand-in for the hexagons' Delta–Sigma
 * edge — are always joined.
 *
 * The result is a per-leaf chord table in each leaf's own frame, the same
 * shape `localChords` gives, so both the rooted analysis (`collectSegments`)
 * and the instanced chord tables can draw it.
 */

import type { Segment } from './circuits';
import { DEFAULT_CONTRACTS, connectionPoints, type EdgeContracts } from './edges';
import { HEX_LEAF_ORDER, leafPts } from './families';
import { enumerateMatchings } from './matchings';
import { inv, lerpPt, dist, transPt, type Affine, type Pt } from './geom';
import { buildBase, type MetaNode } from './tiles';

/** The family a hexagon rule is drawn on when it is shown as Spectres. */
export const HEX_RULE_SPECTRE_FAMILY = 'spectre-iso' as const;

/** Gamma1's edges 6–9 (`7.0A`–`7.3A`): the seam between the Mystic's halves. */
const INTERNAL_SEAM_FIRST = 6;
const INTERNAL_SEAM_EDGES = 4;

/** Gamma2's transform inside the Mystic, in Gamma1's frame. */
function gamma2Xform(): Affine {
  const gamma = buildBase(HEX_RULE_SPECTRE_FAMILY)['Gamma'] as MetaNode;
  const child = gamma.children.find((c) => c.node.type === 'Gamma2');
  if (!child) throw new Error('Mystic has no Gamma2');
  return child.xform;
}

const tag = (edge: { sign: number; major: number; variant: string }): string =>
  `${edge.sign < 0 ? '-' : ''}${edge.major}${edge.variant}`;

/** The point `u` of the way along the internal seam (0 = Gamma1 vertex 6). */
function internalSeamPoint(u: number): Pt {
  const pts = leafPts(HEX_RULE_SPECTRE_FAMILY, 'Gamma1');
  const chain = Array.from({ length: INTERNAL_SEAM_EDGES + 1 }, (_, i) => pts[INTERNAL_SEAM_FIRST + i]);
  const lengths = chain.slice(1).map((p, i) => dist(chain[i], p));
  let left = u * lengths.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lengths.length; i++) {
    if (left <= lengths[i] || i === lengths.length - 1) {
      return lerpPt(chain[i], chain[i + 1], Math.min(1, left / lengths[i]));
    }
    left -= lengths[i];
  }
  return chain[chain.length - 1];
}

/**
 * Chords of the Mystic's two halves (each in its own frame) for the hexagon
 * Gamma's matching `matchingIndex` under `subset`.
 */
export function mysticChords(
  subset: ReadonlySet<number>,
  matchingIndex: number,
  contracts: EdgeContracts = DEFAULT_CONTRACTS,
): {
  readonly Gamma1: readonly Segment[];
  readonly Gamma2: readonly Segment[];
  /** The Gamma2 chords a hexagon strand does not have (see `auxChords`). */
  readonly aux: readonly Segment[];
} {
  const g1: Segment[] = [];
  const g2: Segment[] = [];
  const aux: Segment[] = [];
  const toG2 = inv(gamma2Xform());

  const hexTags = connectionPoints('hex', 'Gamma', subset, contracts).map((c) => tag(c.edge));
  const where = new Map<string, { half: 1 | 2; pt: Pt; edge: number }>();
  for (const [half, type] of [
    [1, 'Gamma1'],
    [2, 'Gamma2'],
  ] as const) {
    for (const c of connectionPoints(HEX_RULE_SPECTRE_FAMILY, type, subset, contracts)) {
      where.set(`${half}:${tag(c.edge)}`, { half, pt: c.pt, edge: c.edge.edgeIndices[0] });
    }
  }
  const locate = (t: string) => where.get(`1:${t}`) ?? where.get(`2:${t}`);

  const matching = hexTags.length % 2 === 0 ? enumerateMatchings(hexTags.length)[matchingIndex] : undefined;
  const crossing: { a: Pt; b: Pt; order: number }[] = [];
  for (const [i, j] of matching ?? []) {
    let a = locate(hexTags[i]);
    let b = locate(hexTags[j]);
    if (!a || !b) continue;
    if (a.half === b.half) {
      (a.half === 1 ? g1 : g2).push([a.pt, b.pt]);
      continue;
    }
    if (a.half === 2) [a, b] = [b, a];
    // Nest the crossings: the Gamma1 end nearest the seam's far vertex (10)
    // crosses nearest it too, so a non-crossing matching stays non-crossing.
    crossing.push({ a: a.pt, b: b.pt, order: (a.edge - (INTERNAL_SEAM_FIRST + INTERNAL_SEAM_EDGES) + 14) % 14 });
  }
  crossing.sort((x, y) => y.order - x.order);
  crossing.forEach(({ a, b }, k) => {
    const m = internalSeamPoint((k + 1) / (crossing.length + 1));
    g1.push([a, m]);
    const rest: Segment = [transPt(toG2, m), b];
    g2.push(rest);
    aux.push(rest);
  });

  // The Delta–Sigma bridge: Gamma2's `6` and `-6` dots, always paired.
  const six = where.get('2:6A');
  const minusSix = where.get('2:-6A');
  if (six && minusSix && hexTags.length % 2 === 0) {
    const bridge: Segment = [six.pt, minusSix.pt];
    g2.push(bridge);
    aux.push(bridge);
  }

  return { Gamma1: g1, Gamma2: g2, aux };
}

/**
 * Per-leaf chords for drawing a hexagon rule (subset + matching index per
 * hexagon leaf type) on 'spectre-iso' tiles, keyed by Spectre leaf type, plus
 * the Gamma2 chords a hexagon strand does not have — the second half of each
 * crossing of the Mystic, and the Delta–Sigma bridge. Pass both to `analyze`
 * (`chords`, `auxChords`; the aux segments are the same objects) so a path's
 * length is the hexagons'. Tiles whose hexagon has an odd dot count draw
 * nothing, as `localChords`.
 */
export function hexRuleSpectreDrawing(
  subset: ReadonlySet<number>,
  matchingIndexByType: Readonly<Record<string, number>>,
  contracts: EdgeContracts = DEFAULT_CONTRACTS,
): {
  readonly chords: Readonly<Record<string, readonly Segment[]>>;
  readonly auxChords: Readonly<Record<string, readonly Segment[]>>;
} {
  const chords: Record<string, readonly Segment[]> = {};
  for (const type of HEX_LEAF_ORDER) {
    if (type === 'Gamma') continue;
    const pts = connectionPoints(HEX_RULE_SPECTRE_FAMILY, type, subset, contracts).map((c) => c.pt);
    const m = pts.length >= 2 && pts.length % 2 === 0
      ? enumerateMatchings(pts.length)[matchingIndexByType[type] ?? 0]
      : undefined;
    chords[type] = m ? m.map(([a, b]) => [pts[a], pts[b]] as Segment) : [];
  }
  const mystic = mysticChords(subset, matchingIndexByType['Gamma'] ?? 0, contracts);
  chords['Gamma1'] = mystic.Gamma1;
  chords['Gamma2'] = mystic.Gamma2;
  return { chords, auxChords: { Gamma2: mystic.aux } };
}

/** The chords of {@link hexRuleSpectreDrawing}, keyed by Spectre leaf type. */
export function hexRuleSpectreChords(
  subset: ReadonlySet<number>,
  matchingIndexByType: Readonly<Record<string, number>>,
  contracts: EdgeContracts = DEFAULT_CONTRACTS,
): Readonly<Record<string, readonly Segment[]>> {
  return hexRuleSpectreDrawing(subset, matchingIndexByType, contracts).chords;
}
