/**
 * The hierarchy builder: a start tile, an edge to cross, and parents chosen
 * one at a time until the crossing lands. Every chain tried is kept as a
 * branch of one tree of choices, so going back and choosing differently adds
 * a branch instead of losing the old one.
 *
 * `sceneOf` places a chain: every tile of the root supertile, anchored on the
 * start tile so nothing moves when a parent is added, each tile marked with
 * its band (the level of the smallest supertile it shares with the start
 * tile), the outline of the start tile's supertile at every level, and, once
 * the crossing lands, the far tile's supertiles below the level where the two
 * sides meet and the wall between them.
 */
import {
  buildSystem, flatten, inv, leafPts, mul, neighbour, transPt,
  type Address, type Affine, type HexType, type Link, type Neighbour,
} from '../../core';
import { rankParents, type ParentOption } from './world';

/** Most parents a chain may have: a level-5 supertile is about 27,000 tiles. */
export const MAX_BUILD_LEVEL = 5;

export interface ChoiceNode {
  readonly id: number;
  readonly parent: number | null;
  /** the parent chosen at this node; null at the root of the tree (the start tile alone) */
  readonly link: Link | null;
  readonly children: readonly number[];
}

export interface Build {
  readonly start: HexType;
  readonly edge: number;
  readonly nodes: readonly ChoiceNode[];
  readonly current: number;
}

export type BuildAction =
  | { type: 'start'; start: HexType }
  | { type: 'edge'; edge: number }
  | { type: 'choose'; link: Link }
  | { type: 'goto'; id: number }
  | { type: 'up' };

export function initialBuild(start: HexType, edge = 0): Build {
  return { start, edge, nodes: [{ id: 0, parent: null, link: null, children: [] }], current: 0 };
}

/** The parents chosen on the way to a node, bottom first. */
export function chainOf(build: Build, id: number): Link[] {
  const out: Link[] = [];
  for (let n: ChoiceNode | undefined = build.nodes[id]; n && n.link; n = n.parent === null ? undefined : build.nodes[n.parent]) out.push(n.link);
  return out.reverse();
}

export const addressOf = (build: Build, id: number): Address => ({ leaf: build.start, path: chainOf(build, id) });

/** What crossing the edge does at a node: lands, or is still on the outside. */
export const crossingAt = (build: Build, id: number): Neighbour => neighbour(addressOf(build, id), build.edge);

/** The parents that can be chosen at a node, best first; none once the crossing has landed or at the level cap. */
export function optionsAt(build: Build, id: number): ParentOption[] {
  const a = addressOf(build, id);
  if (a.path.length >= MAX_BUILD_LEVEL || neighbour(a, build.edge).ok) return [];
  return rankParents(a, build.edge, MAX_BUILD_LEVEL - a.path.length - 1);
}

export function reduceBuild(build: Build, action: BuildAction): Build {
  switch (action.type) {
    case 'start':
      return initialBuild(action.start, build.edge);
    case 'edge':
      return Number.isInteger(action.edge) && action.edge >= 0 && action.edge < 6 ? { ...build, edge: action.edge } : build;
    case 'choose': {
      const here = build.nodes[build.current];
      const same = here.children.find((c) => {
        const l = build.nodes[c].link!;
        return l.slot === action.link.slot && l.parent === action.link.parent;
      });
      if (same !== undefined) return { ...build, current: same };
      if (!optionsAt(build, build.current).some((o) => o.parent === action.link.parent && o.slot === action.link.slot)) return build;
      const id = build.nodes.length;
      const nodes = build.nodes.map((n) => (n.id === here.id ? { ...n, children: [...n.children, id] } : n));
      return { ...build, nodes: [...nodes, { id, parent: here.id, link: action.link, children: [] }], current: id };
    }
    case 'goto':
      return build.nodes[action.id] ? { ...build, current: action.id } : build;
    case 'up': {
      const p = build.nodes[build.current].parent;
      return p === null ? build : { ...build, current: p };
    }
  }
}

export interface Pt { readonly x: number; readonly y: number }
export interface Seg { readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number }
export interface Box { readonly minX: number; readonly minY: number; readonly maxX: number; readonly maxY: number }

export interface SceneTile {
  readonly id: string;
  readonly type: HexType;
  readonly xform: Affine;
  readonly pts: readonly Pt[];
  /** level of the smallest supertile holding both this tile and the start tile (0: the start tile) */
  readonly band: number;
  /** the same for the far tile, once the crossing lands */
  readonly farBand: number | null;
}

export interface Scene {
  /** level of the root supertile: the number of parents chosen */
  readonly level: number;
  readonly tiles: readonly SceneTile[];
  readonly startId: string;
  /** outline of the start tile's supertile, for levels 1..level (index k−1) */
  readonly outlines: readonly Seg[][];
  readonly crossed: Seg;
  readonly landed: null | {
    readonly farId: string;
    readonly farType: HexType;
    readonly farEdge: number;
    /** level of the smallest supertile holding both sides */
    readonly meet: number;
    /** outline of the far tile's supertile, for levels 1..meet−1 */
    readonly farOutlines: readonly Seg[][];
    /** where the two sides' level-(meet−1) supertiles touch */
    readonly wall: readonly Seg[];
  };
  /** for k = 0..level, the box holding the level-k supertiles of both sides (k = 0: the two tiles) */
  readonly frames: readonly Box[];
}

const PTS = leafPts('hex', 'Delta');

const commonPrefix = (a: readonly string[], b: readonly string[]): number => {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
};

const segOf = (a: Pt, b: Pt): Seg => ({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
const midKey = (a: Pt, b: Pt): string => `${Math.round((a.x + b.x) * 5000)},${Math.round((a.y + b.y) * 5000)}`;

/** Places a chain of parents above `start`, as described at the top of this file. */
export function sceneOf(start: HexType, edge: number, chain: readonly Link[]): Scene {
  const L = chain.length;
  const rootType = L ? chain[L - 1].parent : start;
  const root = buildSystem('hex', L)[rootType];
  const startSlots = [...chain].reverse().map((l) => String(l.slot));
  const startId = startSlots.join('.');
  const insts = flatten(root);
  const startInst = insts.find((i) => i.id === startId)!;
  const toStart = inv(startInst.xform);

  const nb = neighbour({ leaf: start, path: [...chain] }, edge);
  const farSlots = nb.ok ? [...nb.address.path].reverse().map((l) => String(l.slot)) : null;

  const tiles: SceneTile[] = insts.map((inst) => {
    const ids = inst.id === '' ? [] : inst.id.split('.');
    const xform = mul(toStart, inst.xform);
    return {
      id: inst.id,
      type: inst.type as HexType,
      xform,
      pts: PTS.map((p) => transPt(xform, p)),
      band: L - commonPrefix(ids, startSlots),
      farBand: farSlots ? L - commonPrefix(ids, farSlots) : null,
    };
  });

  // each edge once, with the bands on its two sides (one side only on the root's outline)
  const edges = new Map<string, { seg: Seg; a: SceneTile; b: SceneTile | null }>();
  for (const t of tiles) for (let e = 0; e < 6; e++) {
    const p = t.pts[e], q = t.pts[(e + 1) % 6];
    const k = midKey(p, q);
    const seen = edges.get(k);
    if (seen) seen.b = t;
    else edges.set(k, { seg: segOf(p, q), a: t, b: null });
  }

  // an edge is on the outline of the level-k supertile when exactly one side is inside it
  const outlinesBy = (band: (t: SceneTile) => number, upTo: number): Seg[][] => {
    const out: Seg[][] = Array.from({ length: upTo }, () => []);
    for (const { seg, a, b } of edges.values()) {
      const ba = band(a), bb = b ? band(b) : L + 1;
      for (let k = Math.max(1, Math.min(ba, bb)); k < Math.max(ba, bb) && k <= upTo; k++) out[k - 1].push(seg);
    }
    return out;
  };
  const outlines = outlinesBy((t) => t.band, L);

  const startTile = tiles.find((t) => t.id === startId)!;
  const crossed = segOf(startTile.pts[edge], startTile.pts[(edge + 1) % 6]);

  let landed: Scene['landed'] = null;
  if (nb.ok && farSlots) {
    const farId = farSlots.join('.');
    const meet = nb.level;
    const farOutlines = outlinesBy((t) => t.farBand!, meet - 1);
    const wall: Seg[] = [];
    for (const { seg, a, b } of edges.values()) {
      if (!b) continue;
      const near = (t: SceneTile): boolean => t.band < meet;
      const far = (t: SceneTile): boolean => t.farBand! < meet;
      if ((near(a) && far(b)) || (far(a) && near(b))) wall.push(seg);
    }
    landed = { farId, farType: nb.address.leaf, farEdge: nb.edge, meet, farOutlines, wall };
  }

  const frames: Box[] = [];
  for (let k = 0; k <= L; k++) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const t of tiles) {
      if (t.band > k && !(landed && t.farBand! <= k)) continue;
      for (const q of t.pts) { minX = Math.min(minX, q.x); minY = Math.min(minY, q.y); maxX = Math.max(maxX, q.x); maxY = Math.max(maxY, q.y); }
    }
    frames.push({ minX, minY, maxX, maxY });
  }

  return { level: L, tiles, startId, outlines, crossed, landed, frames };
}
