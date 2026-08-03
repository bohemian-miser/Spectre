/**
 * Seam gluing math for `SeamView` (DESIGN.md §6.3).
 *
 * A `k.mA` edge glues to a neighbour's `-k.mA` edge traversed in reverse, so
 * posing the neighbour means finding the reflection-free rigid motion that maps
 * B's `-k` seam polyline onto A's `+k` polyline reversed. Contract points then
 * coincide by construction (§3.3) — `sharedDotError` measures that and is the
 * living test of the mirror rule.
 */

import {
  DEFAULT_CONTRACTS,
  IDENT,
  connectionPoint,
  dist,
  leafOrder,
  leafPts,
  metaEdges,
  mul,
  transPt,
  trot,
  ttrans,
  type Affine,
  type EdgeContracts,
  type MetaEdge,
  type Pt,
  type TileFamilyId,
  type TileTypeId,
} from '../core';
import { seamPolyline } from './tilingModel';

/** The seam of `type` with the given class and sign, if it has one. */
export function findSeam(
  family: TileFamilyId,
  type: TileTypeId,
  major: number,
  sign: 1 | -1,
  variant?: string,
): MetaEdge | null {
  for (const s of metaEdges(family, type)) {
    if (s.major !== major || s.sign !== sign) continue;
    if (variant && s.variant !== variant) continue;
    return s;
  }
  return null;
}

export interface SeamPartner {
  readonly type: TileTypeId;
  readonly seam: MetaEdge;
}

/**
 * A leaf type that can sit across a class-`major` seam from `tileA`.
 * Class 0 glues to itself, so the partner carries the same sign.
 */
export function findSeamPartner(
  family: TileFamilyId,
  tileA: TileTypeId,
  major: number,
  signA: 1 | -1 = 1,
  exclude?: TileTypeId,
): SeamPartner | null {
  const wantSign: 1 | -1 = major === 0 ? signA : ((-signA) as 1 | -1);
  const order = leafOrder(family);
  const candidates = [...order.filter((t) => t !== tileA && t !== exclude), tileA];
  for (const type of candidates) {
    const seam = findSeam(family, type, major, wantSign);
    if (seam) return { type, seam };
  }
  return null;
}

/**
 * Rigid motion (rotation + translation, det > 0) mapping the segment
 * `from0 -> from1` onto `to0 -> to1`. Lengths are equal for a real seam, so no
 * scaling is applied; a mismatch would indicate incompatible seams.
 */
export function rigidAlign(from0: Pt, from1: Pt, to0: Pt, to1: Pt): Affine {
  const fa = Math.atan2(from1.y - from0.y, from1.x - from0.x);
  const ta = Math.atan2(to1.y - to0.y, to1.x - to0.x);
  const rot = trot(ta - fa);
  const moved = transPt(rot, from0);
  return mul(ttrans(to0.x - moved.x, to0.y - moved.y), rot);
}

export interface SeamPose {
  readonly typeA: TileTypeId;
  readonly typeB: TileTypeId;
  readonly seamA: MetaEdge;
  readonly seamB: MetaEdge;
  readonly xformA: Affine;
  /** Places B's seam onto A's, traversed in reverse. */
  readonly xformB: Affine;
  /** The crossing point both tiles agree on, in world coordinates. */
  readonly sharedPoint: Pt;
  /** Distance between A's and B's independently computed contract points. */
  readonly sharedDotError: number;
}

/**
 * Pose two tiles across one seam. `xformA` is the identity; `xformB` glues B's
 * `-k` seam to A's `+k` seam with matching orientation reversal.
 */
export function poseSeam(
  family: TileFamilyId,
  typeA: TileTypeId,
  major: number,
  options: {
    readonly tileB?: TileTypeId;
    readonly contracts?: EdgeContracts;
    readonly signA?: 1 | -1;
  } = {},
): SeamPose | null {
  const contracts = options.contracts ?? DEFAULT_CONTRACTS;
  const signA = options.signA ?? 1;
  const seamA = findSeam(family, typeA, major, signA);
  if (!seamA) return null;

  let typeB = options.tileB;
  let seamB: MetaEdge | null = typeB
    ? findSeam(family, typeB, major, major === 0 ? signA : ((-signA) as 1 | -1))
    : null;
  if (!seamB) {
    const partner = findSeamPartner(family, typeA, major, signA);
    if (!partner) return null;
    typeB = partner.type;
    seamB = partner.seam;
  }

  const ptsA = leafPts(family, typeA);
  const ptsB = leafPts(family, typeB as TileTypeId);
  const chainA = seamPolyline(ptsA, seamA);
  const chainB = seamPolyline(ptsB, seamB);
  if (chainA.length < 2 || chainB.length < 2) return null;

  // B's seam start meets A's seam end, and vice versa.
  const xformB = rigidAlign(
    chainB[0],
    chainB[chainB.length - 1],
    chainA[chainA.length - 1],
    chainA[0],
  );

  const dotA = connectionPoint(family, typeA, seamA, contracts);
  const dotB = transPt(xformB, connectionPoint(family, typeB as TileTypeId, seamB, contracts));

  return {
    typeA,
    typeB: typeB as TileTypeId,
    seamA,
    seamB,
    xformA: IDENT,
    xformB,
    sharedPoint: dotA,
    sharedDotError: dist(dotA, dotB),
  };
}
