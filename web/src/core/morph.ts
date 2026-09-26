/**
 * Hexagons ↔ Spectres morph: where every Spectre vertex and strand end sits in
 * the hexagon tiling, so a patch can be animated from one shape to the other.
 *
 * Both families come out of the same substitution tree, so a tile has the
 * same id in both (the hexagon `Gamma` at `P` is the Mystic `P.0` + `P.1`),
 * and under the 'spectre-iso' labels a Spectre seam and its hexagon edge
 * carry the same label. A Spectre vertex that starts (or ends) an edge of
 * seam `k` therefore has a natural home on the hexagon's `k` edge: the seam's
 * minors spread evenly along it. Vertices with no hexagon counterpart — the
 * Mystic's internal seam, and Gamma2's thin `6` | `-6` wedge — slide between
 * their nearest placed neighbours along the outline.
 *
 * Every world vertex gets ONE target (the mean of what the tiles meeting
 * there propose), so neighbouring tiles stay glued at every step of the
 * morph. Strand ends are the tiles' crossing dots, which move from the
 * hexagon dot to the Spectre dot of the same seam, or the Mystic's internal
 * crossings, which ride its internal seam.
 */

import { analyze, segmentKey, type Segment } from './circuits';
import { DEFAULT_CONTRACTS, connectionPoints, parseEdgeLabel, type EdgeContracts } from './edges';
import { edgeLabels, leafPts, type TileTypeId } from './families';
import { lerpPt, transPt, type Pt } from './geom';
import { HEX_RULE_SPECTRE_FAMILY, hexRuleSpectreDrawing } from './hexRule';
import { buildSystem, flatten, type TileInstance } from './tiles';

export interface MorphTile {
  /** Spectre leaf type (the hexagon Gamma is two: Gamma1 and Gamma2). */
  readonly type: TileTypeId;
  /** Hexagon-side vertex positions, world coordinates, x/y interleaved. */
  readonly from: Float64Array;
  /** Spectre vertex positions, world coordinates, x/y interleaved. */
  readonly to: Float64Array;
}

export interface MorphChord {
  /** [ax, ay, bx, by] on the hexagon side. */
  readonly from: readonly [number, number, number, number];
  /** [ax, ay, bx, by] on the Spectre side. */
  readonly to: readonly [number, number, number, number];
  /** The strand's colour in the (hexagon-length) circuit analysis. */
  readonly color: string;
}

export interface HexSpectreMorph {
  readonly tiles: readonly MorphTile[];
  readonly chords: readonly MorphChord[];
}

export interface HexSpectreMorphInput {
  readonly rootTile: TileTypeId;
  readonly level: number;
  /** A hexagon rule: subset and matching index per hexagon leaf type. */
  readonly subset: readonly number[];
  readonly matchingIndexByType: Readonly<Record<string, number>>;
  readonly contracts?: EdgeContracts;
  readonly rainbowTails?: boolean;
  /** Skip the strands (no analysis is run). */
  readonly lines?: boolean;
}

const key = (p: Pt): string => `${Math.round(p.x * 1000)},${Math.round(p.y * 1000)}`;

class Mean {
  private readonly acc = new Map<string, [number, number, number]>();
  add(k: string, p: Pt): void {
    const a = this.acc.get(k);
    if (a) {
      a[0] += p.x;
      a[1] += p.y;
      a[2] += 1;
    } else this.acc.set(k, [p.x, p.y, 1]);
  }
  get(k: string): Pt | undefined {
    const a = this.acc.get(k);
    return a ? { x: a[0] / a[2], y: a[1] / a[2] } : undefined;
  }
}

const hexIdOf = (inst: TileInstance): string =>
  inst.type === 'Gamma1' || inst.type === 'Gamma2' ? inst.id.replace(/\.[01]$/, '') : inst.id;

/**
 * For each vertex of a Spectre leaf, its hexagon-local home, or null when it
 * has none. Keyed by Spectre leaf type; memoized (pure label arithmetic).
 */
const homeCache = new Map<string, readonly (Pt | null)[]>();
function vertexHomes(type: TileTypeId): readonly (Pt | null)[] {
  const hit = homeCache.get(type);
  if (hit) return hit;
  const hexType: TileTypeId = type === 'Gamma1' || type === 'Gamma2' ? 'Gamma' : type;
  const hexPts = leafPts('hex', hexType);
  const hexLabels = edgeLabels('hex', hexType).map(parseEdgeLabel);
  const labels = edgeLabels(HEX_RULE_SPECTRE_FAMILY, type).map(parseEdgeLabel);
  // Seam lengths in minors, over the whole hexagon tile (the Mystic's class-2
  // seam runs from Gamma2 into Gamma1).
  const mates =
    hexType === 'Gamma'
      ? [...edgeLabels(HEX_RULE_SPECTRE_FAMILY, 'Gamma1'), ...edgeLabels(HEX_RULE_SPECTRE_FAMILY, 'Gamma2')].map(
          parseEdgeLabel,
        )
      : labels;
  const seamLength = (l: (typeof labels)[number]): number =>
    1 + Math.max(...mates.filter((m) => m.sign === l.sign && m.major === l.major && m.variant === l.variant).map((m) => m.minor));
  /** Where along its hexagon edge an edge of this label starts/ends, or null. */
  const along = (edge: number, end: boolean): Pt | null => {
    const l = labels[edge];
    const e = hexLabels.findIndex((h) => h.sign === l.sign && h.major === l.major && h.variant === l.variant);
    if (e < 0) return null;
    const n = seamLength(l);
    // A `-k.m` edge glues to `k.m` reversed, so negative seams count down.
    const start = l.sign > 0 ? l.minor / n : (n - 1 - l.minor) / n;
    const f = end ? start + 1 / n : start;
    return lerpPt(hexPts[e], hexPts[(e + 1) % hexPts.length], f);
  };
  const n = labels.length;
  const out = labels.map((_, k) => along(k, false) ?? along((k - 1 + n) % n, true));
  homeCache.set(type, out);
  return out;
}

/** Build the morph for a hexagon rule on a rooted patch. */
export function buildHexSpectreMorph(input: HexSpectreMorphInput): HexSpectreMorph {
  const contracts = input.contracts ?? DEFAULT_CONTRACTS;
  const selected = new Set(input.subset);
  const hexRoot = buildSystem('hex', input.level)[input.rootTile] ?? buildSystem('hex', input.level)['Delta'];
  const specSys = buildSystem(HEX_RULE_SPECTRE_FAMILY, input.level);
  const specRoot = specSys[input.rootTile] ?? specSys['Delta'];
  const hexById = new Map(flatten(hexRoot).map((i) => [i.id, i]));
  const spec = flatten(specRoot);

  // --- vertices -------------------------------------------------------------
  const placed = new Mean();
  const worldPts = spec.map((inst) => leafPts(HEX_RULE_SPECTRE_FAMILY, inst.type).map((p) => transPt(inst.xform, p)));
  spec.forEach((inst, t) => {
    const hex = hexById.get(hexIdOf(inst));
    if (!hex) return;
    vertexHomes(inst.type).forEach((home, k) => {
      if (home) placed.add(key(worldPts[t][k]), transPt(hex.xform, home));
    });
  });
  // Vertices nobody could place slide between their placed neighbours.
  const slid = new Mean();
  spec.forEach((_, t) => {
    const pts = worldPts[t];
    const n = pts.length;
    const at = pts.map((p) => placed.get(key(p)));
    for (let k = 0; k < n; k++) {
      if (at[k]) continue;
      let back = 1;
      while (back < n && !at[(k - back + n) % n]) back++;
      let fwd = 1;
      while (fwd < n && !at[(k + fwd) % n]) fwd++;
      const a = at[(k - back + n) % n];
      const b = at[(k + fwd) % n];
      if (a && b) slid.add(key(pts[k]), lerpPt(a, b, back / (back + fwd)));
    }
  });
  const target = (p: Pt): Pt => placed.get(key(p)) ?? slid.get(key(p)) ?? p;

  const tiles: MorphTile[] = spec.map((inst, t) => {
    const pts = worldPts[t];
    const from = new Float64Array(pts.length * 2);
    const to = new Float64Array(pts.length * 2);
    pts.forEach((p, k) => {
      const q = target(p);
      from[k * 2] = q.x;
      from[k * 2 + 1] = q.y;
      to[k * 2] = p.x;
      to[k * 2 + 1] = p.y;
    });
    return { type: inst.type, from, to };
  });

  if (input.lines === false || selected.size === 0) return { tiles, chords: [] };

  // --- strands --------------------------------------------------------------
  const drawing = hexRuleSpectreDrawing(selected, input.matchingIndexByType, contracts);
  const tagOf = (e: { sign: number; major: number; variant: string }) =>
    `${e.sign < 0 ? '-' : ''}${e.major}${e.variant}`;
  const hexDots = new Map<string, Map<string, Pt>>();
  const hexDotsOf = (type: TileTypeId): Map<string, Pt> => {
    let m = hexDots.get(type);
    if (!m) {
      m = new Map(connectionPoints('hex', type, selected, contracts).map((c) => [tagOf(c.edge), c.pt]));
      hexDots.set(type, m);
    }
    return m;
  };
  // Hexagon dot of every Spectre dot that has one; Gamma2's `6` | `-6` pick
  // theirs up from the Delta and Sigma across the seam.
  const dotHome = new Mean();
  for (const inst of spec) {
    const hex = hexById.get(hexIdOf(inst));
    if (!hex) continue;
    const homes = hexDotsOf(hex.type);
    for (const c of connectionPoints(HEX_RULE_SPECTRE_FAMILY, inst.type, selected, contracts)) {
      const h = homes.get(tagOf(c.edge));
      if (h) dotHome.add(key(transPt(inst.xform, c.pt)), transPt(hex.xform, h));
    }
  }
  /** A strand end that is not a dot lies on its tile's outline: ride it. */
  const onOutline = (t: number, p: Pt): Pt => {
    const pts = worldPts[t];
    for (let k = 0; k < pts.length; k++) {
      const a = pts[k];
      const b = pts[(k + 1) % pts.length];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const u = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / (len * len);
      const q = lerpPt(a, b, u);
      if (u >= -1e-6 && u <= 1 + 1e-6 && Math.hypot(q.x - p.x, q.y - p.y) < 1e-6) {
        return lerpPt(target(a), target(b), u);
      }
    }
    return p;
  };

  const collected: Segment[] = [];
  const ends: [Pt, Pt][] = [];
  spec.forEach((inst, t) => {
    for (const [a, b] of drawing.chords[inst.type] ?? []) {
      const wa = transPt(inst.xform, a);
      const wb = transPt(inst.xform, b);
      collected.push([wa, wb]);
      ends.push([dotHome.get(key(wa)) ?? onOutline(t, wa), dotHome.get(key(wb)) ?? onOutline(t, wb)]);
    }
  });

  // Colours from the same analysis the Spectre view runs (hexagon lengths);
  // `analyze` keeps collection order, which the loop above reproduces.
  const analysis = analyze(
    {
      family: HEX_RULE_SPECTRE_FAMILY,
      instances: spec,
      selected,
      matchingIndexByType: input.matchingIndexByType,
      contracts,
      chords: drawing.chords,
      auxChords: drawing.auxChords,
    },
    { rainbowTails: input.rainbowTails },
  );
  const chords: MorphChord[] = collected.map(([wa, wb], i) => {
    const [ha, hb] = ends[i];
    const welded = analysis.segments[i];
    return {
      from: [ha.x, ha.y, hb.x, hb.y],
      to: [wa.x, wa.y, wb.x, wb.y],
      color: (welded && analysis.segmentColor.get(segmentKey(welded))) ?? '#444',
    };
  });
  return { tiles, chords };
}
