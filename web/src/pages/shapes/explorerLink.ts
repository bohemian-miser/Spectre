/**
 * Opening a circuit in the Explorer's infinite view, at any level: a world
 * whose ancestor chain starts at the circuit's first tile and climbs to the
 * supertile the circuit is born in (`WorldChain`). The first tile is the
 * world's frame, so the view opens on it, and the link's trace seed is the
 * circuit's chord across it, so the Explorer traces exactly that circuit.
 */

import {
  COS30,
  DEFAULT_LINK_STATE,
  SIN30,
  comboToMatchingIndices,
  createUnrootedEngine,
  encodeExplorerState,
  encodeWorldChain,
  zX,
  zY,
  type Pt,
  type TileFamilyId,
  type TileTypeId,
  type WorldChain,
} from '../../core';

/** The chain from a circuit's first tile (the last of `path`, top first) up to its supertile of `type`. */
export function circuitChain(type: TileTypeId, path: readonly { type: TileTypeId; pos: number }[]): WorldChain {
  const steps = path.map((_, i) => {
    // Up from the tile at depth i of the path, into its parent one higher.
    const j = path.length - 1 - i;
    return { parentType: j === 0 ? type : path[j - 1].type, slot: path[j].pos };
  });
  return { anchor: path[path.length - 1].type, steps };
}

export interface CircuitLink {
  readonly family: TileFamilyId;
  readonly subset: readonly number[];
  readonly combo: string;
  /** The supertile the circuit is born in. */
  readonly type: TileTypeId;
  readonly level: number;
  readonly path: readonly { type: TileTypeId; pos: number }[];
  /** The circuit's chord across its first tile, in the supertile's frame. */
  readonly chord: readonly [Pt, Pt];
}

/** The Explorer's hash route for a circuit: infinite view, its rule and combination, its world, its trace. */
export function explorerCircuitHref(base: string, link: CircuitLink): string {
  const chain = circuitChain(link.type, link.path);
  const W = createUnrootedEngine(0, link.family, chain).ancestorWorldXform(link.level);
  const c = COS30[W.k];
  const s = SIN30[W.k];
  const world = (p: Pt) => {
    const y = W.m ? -p.y : p.y;
    return { x: c * p.x - s * y + zX(W.t), y: s * p.x + c * y + zY(W.t) };
  };
  const a = world(link.chord[0]);
  const b = world(link.chord[1]);
  // A quarter of the way along: inside the tile, nearest this chord, nearer its start.
  const at = { x: a.x + 0.25 * (b.x - a.x), y: a.y + 0.25 * (b.y - a.y) };
  const r = (v: number) => Math.round(v * 1000) / 1000;
  const q = encodeExplorerState({
    ...DEFAULT_LINK_STATE,
    family: link.family,
    rootTile: link.type,
    level: link.level,
    subset: link.subset,
    matching: comboToMatchingIndices(link.family, link.subset, link.combo),
    mode: 'infinite',
    worldChain: encodeWorldChain(chain),
    traceSeed: [r(at.x), r(at.y), r(b.x), r(b.y)],
  });
  return `${base.endsWith('/') ? base : `${base}/`}#/explorer?${q.toString()}`;
}
