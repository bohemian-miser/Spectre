/**
 * Hexagons ↔ Spectres morph: where every Spectre vertex and strand end sits in
 * the hexagon tiling, so a patch can be animated from one shape to the other.
 *
 * The two patches come out of the substitution turned ~21° against each other
 * and at different scales (a hexagon's edge is the Spectre's, but the Spectre
 * patch is 1/0.53 wider). Left alone, a morph would spin the whole patch as
 * it went. So the Spectre patch is fitted over the hexagon patch first
 * (`hexSpectreAlignment`: the least-squares similarity over the tiles'
 * centres), and everything on the Spectre side is given in the hexagons'
 * coordinates. What the fit leaves is local — under half a unit per tile —
 * so the morph is each vertex gliding into place and the camera can stay put.
 * The Explorer draws its Spectre view of a hexagon rule under the same fit
 * (`buildTilingModel`'s `alignToHex`), so the morph ends on that view.
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
import { lerpPt, mul, transPt, type Affine, type Pt } from './geom';
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
  /**
   * The similarity that fitted the Spectre patch over the hexagon patch:
   * Spectre world → hexagon world. Every `to` above is already through it
   * (the identity when `align` was off).
   */
  readonly align: Affine;
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
  /**
   * Fit the Spectre side over the hexagons (default true), so the morph has
   * no net rotation or scale. Off, both sides are the patches as built.
   */
  readonly align?: boolean;
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
 * The least-squares similarity (rotation, uniform scale, shift) taking points
 * `b` on to points `a`, as an affine.
 */
export function fitSimilarity(a: readonly Pt[], b: readonly Pt[]): Affine {
  const n = Math.min(a.length, b.length);
  if (n === 0) return [1, 0, 0, 0, 1, 0];
  let max = 0, may = 0, mbx = 0, mby = 0;
  for (let i = 0; i < n; i++) {
    max += a[i].x;
    may += a[i].y;
    mbx += b[i].x;
    mby += b[i].y;
  }
  max /= n;
  may /= n;
  mbx /= n;
  mby /= n;
  let sxx = 0, sxy = 0, nb = 0;
  for (let i = 0; i < n; i++) {
    const ax = a[i].x - max, ay = a[i].y - may, bx = b[i].x - mbx, by = b[i].y - mby;
    sxx += bx * ax + by * ay;
    sxy += bx * ay - by * ax;
    nb += bx * bx + by * by;
  }
  if (nb === 0) return [1, 0, max - mbx, 0, 1, may - mby];
  const theta = Math.atan2(sxy, sxx);
  const s = Math.hypot(sxx, sxy) / nb;
  const c = s * Math.cos(theta);
  const d = s * Math.sin(theta);
  return [c, -d, max - (c * mbx - d * mby), d, c, may - (d * mbx + c * mby)];
}

const alignCache = new Map<string, Affine>();

/**
 * The similarity that lays the 'spectre-iso' patch of `rootTile` at `level`
 * over the hexagon patch: Spectre world → hexagon world. Fitted by least
 * squares over the tiles' centres (a Mystic's two halves against their
 * Gamma), it converges with level to ~21.3° and ×0.530; what it leaves is
 * under half a unit per tile. Memoized.
 */
export function hexSpectreAlignment(rootTile: TileTypeId, level: number): Affine {
  const lv = Math.max(0, Math.floor(level));
  const key = `${rootTile}:${lv}`;
  const hit = alignCache.get(key);
  if (hit) return hit;
  const hexSys = buildSystem('hex', lv);
  const specSys = buildSystem(HEX_RULE_SPECTRE_FAMILY, lv);
  const hex = flatten(hexSys[rootTile] ?? hexSys['Delta']);
  const spec = flatten(specSys[rootTile] ?? specSys['Delta']);
  // An affine map keeps centroids, so a tile's centre is its transform on the leaf's.
  const centreOf = (pts: readonly Pt[]): Pt => {
    let x = 0, y = 0;
    for (const p of pts) {
      x += p.x / pts.length;
      y += p.y / pts.length;
    }
    return { x, y };
  };
  const hexCentre = centreOf(leafPts('hex', 'Delta'));
  const specCentre = centreOf(leafPts(HEX_RULE_SPECTRE_FAMILY, 'Delta'));
  const hexById = new Map(hex.map((i) => [i.id, transPt(i.xform, hexCentre)]));
  const a: Pt[] = [];
  const b: Pt[] = [];
  const halves = new Map<string, Pt>();
  for (const inst of spec) {
    const h = hexById.get(hexIdOf(inst));
    if (!h) continue;
    const c = transPt(inst.xform, specCentre);
    if (inst.type === 'Gamma1' || inst.type === 'Gamma2') {
      // The Mystic's centre: the mean of its halves', once both are in.
      const id = hexIdOf(inst);
      const other = halves.get(id);
      if (!other) {
        halves.set(id, c);
        continue;
      }
      a.push(h);
      b.push({ x: (c.x + other.x) / 2, y: (c.y + other.y) / 2 });
      continue;
    }
    a.push(h);
    b.push(c);
  }
  const out = fitSimilarity(a, b);
  alignCache.set(key, out);
  return out;
}

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
  // The Spectre side, fitted over the hexagons (see the header).
  const align: Affine = input.align === false ? [1, 0, 0, 0, 1, 0] : hexSpectreAlignment(input.rootTile, input.level);
  const specXform = spec.map((inst) => mul(align, inst.xform));

  // --- vertices -------------------------------------------------------------
  const placed = new Mean();
  const worldPts = spec.map((inst, t) => leafPts(HEX_RULE_SPECTRE_FAMILY, inst.type).map((p) => transPt(specXform[t], p)));
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

  if (input.lines === false || selected.size === 0) return { tiles, chords: [], align };

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
  spec.forEach((inst, t) => {
    const hex = hexById.get(hexIdOf(inst));
    if (!hex) return;
    const homes = hexDotsOf(hex.type);
    for (const c of connectionPoints(HEX_RULE_SPECTRE_FAMILY, inst.type, selected, contracts)) {
      const h = homes.get(tagOf(c.edge));
      if (h) dotHome.add(key(transPt(specXform[t], c.pt)), transPt(hex.xform, h));
    }
  });
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
      const wa = transPt(specXform[t], a);
      const wb = transPt(specXform[t], b);
      collected.push([wa, wb]);
      ends.push([dotHome.get(key(wa)) ?? onOutline(t, wa), dotHome.get(key(wb)) ?? onOutline(t, wb)]);
    }
  });

  // Colours from the same analysis the Spectre view runs (hexagon lengths);
  // `analyze` keeps collection order, which the loop above reproduces. It
  // runs on the patch as built: colours don't care where it sits.
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
  return { tiles, chords, align };
}
