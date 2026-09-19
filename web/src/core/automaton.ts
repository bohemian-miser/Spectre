/**
 * The strand automaton: walking a strand one tile at a time, exactly.
 *
 * A strand in a Spectre tiling is a sequence of chords. Inside a tile the chord
 * is fixed by the combination string; crossing into the next tile is a *choice*,
 * and this module is about exactly which choices exist.
 *
 * Three relations, nested:
 *
 *  1. **Permitted.** Two slots may join when their labels are compatible: same
 *     class, same minor, opposite sign. This is pure label algebra — it asks
 *     nothing of the tiling — and it is a strict SUPERSET of what happens.
 *  2. **Admissible.** A permitted walk that never makes the angles at a tiling
 *     vertex exceed 360 degrees. Every spectre corner is a whole multiple of 30
 *     degrees, so this is an exact integer test, and it is the constraint that
 *     rules out walks no tiling could contain.
 *  3. **Observed.** The joins that actually occur in patches of the tiling. A
 *     subset of permitted, computed by measurement rather than by algebra.
 *
 * The point of separating them: a statement proved over the *permitted* relation
 * needs no atlas and no finite-local-complexity input, so it is worth much more
 * than the same statement checked over the observed one. `ADMISSIBLE` sits in
 * between and is where the interesting arguments live.
 *
 * Everything is exact `Z[zeta12]` integer arithmetic, so joining, closing and
 * overlapping are integer identities rather than tolerances.
 */

import { connectionPoints, parseEdgeLabel, type EdgeLabel } from './edges';
import { segmentsCross } from './matchings';
import type { Pt } from './geom';
import { edgeLabels, leafOrder, type TileFamilyId, type TileTypeId } from './families';
import { enumerateMatchings } from './matchings';
import {
  Z_ONE,
  zAdd,
  zApply,
  zEq,
  zInv,
  zKey,
  zLeafPts,
  zMul,
  zRot,
  zSub,
  zToPt,
  type ZAffine,
  type ZVec,
} from './exact';

// ---------------------------------------------------------------------------
// Slots
// ---------------------------------------------------------------------------

/**
 * One end of a chord: a tile type together with one of its active seams.
 *
 * `seam` indexes the tile's active seams in `connectionPoints` order, which is
 * the order the combination digits are defined against, so it is safe to use as
 * a matching index. `edge` is the index of that seam's `minor == 0` physical
 * edge in the tile's 14-entry label array.
 */
export interface Slot {
  readonly type: TileTypeId;
  readonly seam: number;
  readonly edge: number;
  readonly label: EdgeLabel;
  /** `Delta -5A`, `Psi +5B`, … — stable, human-readable, unique per slot. */
  readonly id: string;
}

const slotCache = new Map<string, readonly Slot[]>();

/** Active slots of one tile type, in `connectionPoints` order. */
export function slotsOfType(
  family: TileFamilyId,
  type: TileTypeId,
  subset: readonly number[],
): readonly Slot[] {
  const key = `${family}/${type}/${[...subset].sort().join(',')}`;
  const hit = slotCache.get(key);
  if (hit) return hit;
  const selected = new Set(subset);
  const labels = edgeLabels(family, type);
  const out: Slot[] = [];
  for (let i = 0; i < labels.length; i++) {
    const label = parseEdgeLabel(labels[i]);
    if (label.minor !== 0 || !selected.has(label.major)) continue;
    const seam = out.length;
    out.push({
      type,
      seam,
      edge: i,
      label,
      id: `${type} ${label.sign < 0 ? '-' : '+'}${label.major}${label.variant}`,
    });
  }
  slotCache.set(key, out);
  return out;
}

/** Every slot of every tile type that carries one. */
export function allSlots(family: TileFamilyId, subset: readonly number[]): readonly Slot[] {
  return leafOrder(family).flatMap((t) => slotsOfType(family, t, subset));
}

/** Sanity bridge: slot count per type equals the core's connection-point count. */
export function slotCountMatchesCore(
  family: TileFamilyId,
  type: TileTypeId,
  subset: readonly number[],
): boolean {
  return (
    slotsOfType(family, type, subset).length ===
    connectionPoints(family, type, new Set(subset)).length
  );
}

// ---------------------------------------------------------------------------
// Chords: the move inside a tile
// ---------------------------------------------------------------------------

/**
 * The chord pairing of a tile type under one matching index, as a permutation
 * of its active seams. `chordOf(...)[s]` is the seam the chord from `s` leads
 * to, or `-1` when the type carries no chord.
 */
export function chordPairing(
  family: TileFamilyId,
  type: TileTypeId,
  subset: readonly number[],
  matchingIndex: number,
): readonly number[] {
  const n = slotsOfType(family, type, subset).length;
  const out = new Array<number>(n).fill(-1);
  if (n < 2 || n % 2 !== 0) return out;
  const matching = enumerateMatchings(n)[matchingIndex];
  if (!matching) return out;
  for (const [a, b] of matching) {
    out[a] = b;
    out[b] = a;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Permitted joins: the move between tiles
// ---------------------------------------------------------------------------

/** Label compatibility: same class, same minor, opposite sign. Variant is free. */
export function labelsJoin(a: EdgeLabel, b: EdgeLabel): boolean {
  return a.major === b.major && a.minor === b.minor && a.sign === -b.sign;
}

/**
 * For each slot, every slot it MAY join by label algebra alone.
 *
 * This asks nothing of the tiling, which is the whole point: it is the superset
 * inside which a tiling's own joins must live.
 */
export function permittedJoins(
  family: TileFamilyId,
  subset: readonly number[],
): ReadonlyMap<string, readonly Slot[]> {
  const slots = allSlots(family, subset);
  const out = new Map<string, Slot[]>();
  for (const a of slots) {
    const list: Slot[] = [];
    for (const b of slots) if (labelsJoin(a.label, b.label)) list.push(b);
    out.set(a.id, list);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Exact geometry of a join
// ---------------------------------------------------------------------------

/**
 * Direction of physical edge `i` as a power of `d = zeta12`: the edge vector is
 * `d^k`. Throws when the edge is not a unit lattice step, which is true of every
 * spectre and hexagon edge but not of the hat/turtle families.
 */
export function edgeDirection(family: TileFamilyId, type: TileTypeId, i: number): number {
  const pts = zLeafPts(family, type);
  const n = pts.length;
  const v = zSub(pts[(i + 1) % n], pts[i]);
  for (let k = 0; k < 12; k++) if (zEq(v, zRot(Z_ONE, k))) return k;
  throw new Error(`edge ${i} of ${family}/${type} is not a unit step`);
}

const norm12 = (k: number): number => ((k % 12) + 12) % 12;

/**
 * Interior angle at vertex `v`, in units of 30 degrees.
 *
 * Exact by construction: every spectre edge is a unit step of `Z[zeta12]`, so
 * consecutive edge directions differ by a whole number of 30-degree steps.
 */
export function interiorAngleUnits(family: TileFamilyId, type: TileTypeId, v: number): number {
  const n = zLeafPts(family, type).length;
  const incoming = edgeDirection(family, type, (v - 1 + n) % n);
  const outgoing = edgeDirection(family, type, v);
  // signed turn in (-6, 6]
  let turn = norm12(outgoing - incoming);
  if (turn > 6) turn -= 12;
  return 6 - turn;
}

/**
 * The exact placement of tile `B` when its edge `edgeB` is glued to tile `A`'s
 * edge `edgeA`, in `A`'s own frame.
 *
 * Two tiles sharing an edge traverse it in opposite directions, so `A`'s edge
 * runs `p -> q` exactly as `B`'s runs `q -> p`. That pins the rigid motion
 * completely: the rotation comes from the two directions and the translation
 * from one endpoint. No mirror is needed — the spectre tiling is chiral and its
 * leaves all carry the same handedness.
 */
export function joinTransform(
  family: TileFamilyId,
  typeA: TileTypeId,
  edgeA: number,
  typeB: TileTypeId,
  edgeB: number,
): ZAffine {
  const a = edgeDirection(family, typeA, edgeA);
  const b = edgeDirection(family, typeB, edgeB);
  // d^k * d^b = -d^a, so k = a - b + 6
  const k = norm12(a - b + 6);
  const ptsA = zLeafPts(family, typeA);
  const ptsB = zLeafPts(family, typeB);
  const nA = ptsA.length;
  const nB = ptsB.length;
  // B's edge START must land on A's edge END
  const head = ptsA[(edgeA + 1) % nA];
  const t = zSub(head, zRot(ptsB[edgeB % nB], k));
  return { k, m: 0, t };
}

// ---------------------------------------------------------------------------
// Walking
// ---------------------------------------------------------------------------

/** One tile of a walk: its type, its exact placement, and how it was entered. */
export interface Placed {
  readonly type: TileTypeId;
  readonly xform: ZAffine;
  /** Seam the strand entered by, or `-1` for the first tile. */
  readonly inSeam: number;
  /** Seam the strand leaves by. */
  readonly outSeam: number;
}

export interface WalkState {
  readonly family: TileFamilyId;
  readonly subset: readonly number[];
  /** Matching index per tile type, `leafOrder` aligned. */
  readonly matching: Readonly<Record<string, number>>;
  readonly tiles: readonly Placed[];
  /** Exact angle units accumulated at each touched vertex, keyed by position. */
  readonly angles: ReadonlyMap<string, number>;
}

/** Start a walk at one tile, entering through `seam`. */
export function startWalk(
  family: TileFamilyId,
  subset: readonly number[],
  matching: Readonly<Record<string, number>>,
  type: TileTypeId,
  seam: number,
): WalkState {
  const pairing = chordPairing(family, type, subset, matching[type] ?? 0);
  const placed: Placed = { type, xform: { k: 0, m: 0, t: [0, 0, 0, 0] }, inSeam: seam, outSeam: pairing[seam] ?? -1 };
  return {
    family,
    subset,
    matching,
    tiles: [placed],
    angles: cornerAngles(family, [placed], new Map()),
  };
}

/** Add each placed tile's interior angles into the running per-vertex totals. */
function cornerAngles(
  family: TileFamilyId,
  tiles: readonly Placed[],
  base: ReadonlyMap<string, number>,
): ReadonlyMap<string, number> {
  const out = new Map(base);
  for (const p of tiles) {
    const pts = zLeafPts(family, p.type);
    for (let v = 0; v < pts.length; v++) {
      const key = zKey(zApply(p.xform, pts[v]));
      out.set(key, (out.get(key) ?? 0) + interiorAngleUnits(family, p.type, v));
    }
  }
  return out;
}

/** A candidate next step of a walk, with everything the UI needs to judge it. */
export interface Option {
  readonly slot: Slot;
  /** Placement of the new tile in the walk's frame. */
  readonly xform: ZAffine;
  /** Seam the new tile's strand would leave by, or `-1` if it carries no chord. */
  readonly outSeam: number;
  /** False when this step would overlap the walk, by angle count or by area. */
  readonly admissible: boolean;
  /** Angle units at the worst vertex after this step (12 = exactly 360). */
  readonly worstAngle: number;
  /** Index of the already-placed tile this step lands on, or -1 for a new one. */
  readonly coincidesWith: number;
  /** True when this step returns the strand to the tile it started from. */
  readonly closes: boolean;
  /** Why the step was rejected, for the UI to show. */
  readonly reason: 'ok' | 'angle' | 'overlap';
}

/**
 * Every permitted next step, each marked admissible or not.
 *
 * The walk leaves the last tile by its `outSeam`; the options are the slots that
 * seam may join, placed exactly, with the angle test applied.
 */
export function options(state: WalkState): readonly Option[] {
  const last = state.tiles[state.tiles.length - 1];
  if (!last || last.outSeam < 0) return [];
  const exitSlot = slotsOfType(state.family, last.type, state.subset)[last.outSeam];
  if (!exitSlot) return [];
  const permitted = permittedJoins(state.family, state.subset).get(exitSlot.id) ?? [];
  const first = state.tiles[0];
  const existing = state.tiles.map((p) => zLeafPts(state.family, p.type).map((v) => zApply(p.xform, v)));

  const out: Option[] = [];
  for (const slot of permitted) {
    const rel = joinTransform(state.family, last.type, exitSlot.edge, slot.type, slot.edge);
    const xform = zMul(last.xform, rel);
    const outSeam =
      chordPairing(state.family, slot.type, state.subset, state.matching[slot.type] ?? 0)[slot.seam] ??
      -1;

    // Landing exactly on a tile the walk already placed is not a new tile: a
    // strand may pass through a four-dot tile twice, and the closing step lands
    // back on the tile it started from. Either way its area is already counted.
    let coincidesWith = -1;
    for (let i = 0; i < state.tiles.length; i++) {
      if (state.tiles[i].type === slot.type && zAffineSame(state.tiles[i].xform, xform)) {
        coincidesWith = i;
        break;
      }
    }

    let worst = 0;
    let reason: 'ok' | 'angle' | 'overlap' = 'ok';
    if (coincidesWith < 0) {
      const placed: Placed = { type: slot.type, xform, inSeam: slot.seam, outSeam };
      const after = cornerAngles(state.family, [placed], state.angles);
      for (const v of after.values()) worst = Math.max(worst, v);
      if (worst > ANGLE_FULL_TURN) reason = 'angle';
      else {
        const poly = zLeafPts(state.family, slot.type).map((v) => zApply(xform, v));
        for (const other of existing) {
          if (polygonsOverlap(poly, other)) {
            reason = 'overlap';
            break;
          }
        }
      }
    } else {
      for (const v of state.angles.values()) worst = Math.max(worst, v);
    }

    const closes =
      coincidesWith === 0 && first !== undefined && slot.seam === first.inSeam;

    out.push({
      slot,
      xform,
      outSeam,
      admissible: reason === 'ok',
      worstAngle: worst,
      coincidesWith,
      closes,
      reason,
    });
  }
  return out;
}

/** 360 degrees, in the 30-degree units {@link interiorAngleUnits} returns. */
export const ANGLE_FULL_TURN = 12;

/**
 * Do two placed tiles overlap in area?
 *
 * The angle test catches every overlap that piles up at a shared vertex, which
 * is most of them; this catches the rest. Tiles have unit edges and lattice
 * vertices, so a fixed epsilon on the float image is safe — the alternative is
 * sign determination for algebraic numbers, which buys nothing here.
 */
export function polygonsOverlap(a: readonly ZVec[], b: readonly ZVec[]): boolean {
  const pa = a.map(zToPt);
  const pb = b.map(zToPt);
  for (let i = 0; i < pa.length; i++) {
    for (let j = 0; j < pb.length; j++) {
      if (
        segmentsCross(
          pa[i],
          pa[(i + 1) % pa.length],
          pb[j],
          pb[(j + 1) % pb.length],
        )
      ) {
        return true;
      }
    }
  }
  return pa.some((p) => strictlyInside(p, pb)) || pb.some((p) => strictlyInside(p, pa));
}

const INSIDE_EPS = 1e-9;

function strictlyInside(p: Pt, poly: readonly Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    // a point on the boundary is not strictly inside
    const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    const within =
      Math.min(a.x, b.x) - INSIDE_EPS <= p.x &&
      p.x <= Math.max(a.x, b.x) + INSIDE_EPS &&
      Math.min(a.y, b.y) - INSIDE_EPS <= p.y &&
      p.y <= Math.max(a.y, b.y) + INSIDE_EPS;
    if (Math.abs(cross) < INSIDE_EPS && within) return false;
    if (a.y > p.y !== b.y > p.y) {
      const x = a.x + ((p.y - a.y) / (b.y - a.y)) * (b.x - a.x);
      if (p.x < x) inside = !inside;
    }
  }
  return inside;
}

function zAffineSame(a: ZAffine, b: ZAffine): boolean {
  return a.k === b.k && a.m === b.m && zEq(a.t, b.t);
}

/** Take one step. A step onto an already-placed tile adds no area or angle. */
export function step(state: WalkState, option: Option): WalkState {
  const placed: Placed = {
    type: option.slot.type,
    xform: option.xform,
    inSeam: option.slot.seam,
    outSeam: option.outSeam,
  };
  return {
    ...state,
    tiles: [...state.tiles, placed],
    angles:
      option.coincidesWith >= 0
        ? state.angles
        : cornerAngles(state.family, [placed], state.angles),
  };
}

export function undo(state: WalkState): WalkState {
  if (state.tiles.length <= 1) return state;
  const tiles = state.tiles.slice(0, -1);
  return { ...state, tiles, angles: cornerAngles(state.family, distinctTiles(tiles), new Map()) };
}

/** Drop repeat visits, so area and angle are counted once per physical tile. */
export function distinctTiles(tiles: readonly Placed[]): readonly Placed[] {
  const seen = new Set<string>();
  const out: Placed[] = [];
  for (const p of tiles) {
    const key = `${p.type}|${p.xform.k}|${p.xform.m}|${p.xform.t.join(',')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

/** The walk's world polygon for each placed tile, for drawing. */
export function walkPolygons(state: WalkState): readonly (readonly ZVec[])[] {
  return state.tiles.map((p) => zLeafPts(state.family, p.type).map((v) => zApply(p.xform, v)));
}

/** 2x the world position of a placed tile's active-seam dot. */
export function slotMidpoint2(
  family: TileFamilyId,
  subset: readonly number[],
  p: Placed,
  seam: number,
): ZVec {
  const slot = slotsOfType(family, p.type, subset)[seam];
  const pts = zLeafPts(family, p.type);
  const n = pts.length;
  const a = zApply(p.xform, pts[slot.edge]);
  const b = zApply(p.xform, pts[(slot.edge + 1) % n]);
  return zAdd(a, b);
}

/** Relative placement of two placed tiles, for reporting a join's germ. */
export function relativePlacement(a: Placed, b: Placed): ZAffine {
  return zMul(zInv(a.xform), b.xform);
}
