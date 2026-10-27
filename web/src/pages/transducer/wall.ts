/**
 * A wall built level by level: a tile that sits in the same slot of a
 * supertile of its own type, n times over, and one of its edges that stays on
 * the outside at every one of those levels.
 *
 * To see what is across that edge, a few more parents are put on top until
 * the crossing lands (the quickest such chain). The patch is then drawn as two
 * sides: the level-n supertile holding the start tile, and the level-n
 * supertile holding the tile across the edge. Their shared boundary is the
 * wall. As n grows, the near side is the same chain again, and the far side's
 * chain gains one more link; the machine's answer for the infinite chain is
 * the limit of those far-side chains.
 */
import {
  IDENT, buildSystem, flatten, hexTransducer, inv, leafPts, mul, neighbour, parseSym, runPeriodic, sym, transPt,
  type Address, type Affine, type HexType, type Link, type TileNode,
} from '../../core';
import { parentsOf } from './world';

export interface WallPreset { readonly label: string; readonly type: HexType; readonly slot: number; readonly edge: number }

export const WALL_PRESETS: readonly WallPreset[] = [
  { label: 'Gamma in slot 7 of a Gamma, edge 0', type: 'Gamma', slot: 7, edge: 0 },
  { label: 'Gamma in slot 7 of a Gamma, edge 5', type: 'Gamma', slot: 7, edge: 5 },
  { label: 'Psi in slot 2 of a Psi, edge 3', type: 'Psi', slot: 2, edge: 3 },
];

/** Most levels of repetition drawn: two level-4 supertiles are about 7,000 hexagons. */
export const MAX_WALL_LEVELS = 4;

export interface Seg { readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number }
export interface WallTile { readonly id: string; readonly type: HexType; readonly xform: Affine; readonly pts: readonly { x: number; y: number }[]; readonly side: 'near' | 'far' }
export interface Box { readonly minX: number; readonly minY: number; readonly maxX: number; readonly maxY: number }
export interface Rung { readonly level: number; readonly near: string; readonly far: string; readonly machine: string | null }

export interface Wall {
  readonly preset: WallPreset;
  readonly n: number;
  /** the parents put on top so the crossing lands, bottom first */
  readonly closing: readonly Link[];
  readonly nearId: string;
  readonly farId: string;
  readonly farEntry: number;
  readonly tiles: readonly WallTile[];
  /** the outline of each side's supertile at levels 1..n, by level */
  readonly outlines: { readonly near: readonly Seg[][]; readonly far: readonly Seg[][] };
  /** the edges where the two level-n supertiles meet */
  readonly wall: readonly Seg[];
  /** the crossed edge */
  readonly crossed: Seg;
  /** for k = 0..n, the box holding both sides' level-k supertiles (k = 0: the two tiles) */
  readonly frames: readonly Box[];
  /** level by level: the near tile's chain, the far tile's chain, and the machine's answer for the infinite chain */
  readonly rungs: readonly Rung[];
  /** the level at which the two sides first share a supertile, and its type */
  readonly meetLevel: number;
  readonly meetType: HexType;
}

const PTS = leafPts('hex', 'Delta');

/** The shortest chain of parents above `from` (at most `depth`) that makes the crossing of `edge` land. */
function closingChain(from: Address, edge: number, depth: number): Link[] | null {
  let frontier: Link[][] = [[]];
  for (let d = 0; d <= depth; d++) {
    for (const extra of frontier) {
      if (neighbour({ leaf: from.leaf, path: [...from.path, ...extra] }, edge).ok) return extra;
    }
    const next: Link[][] = [];
    for (const extra of frontier) {
      const top = extra.length ? extra[extra.length - 1].parent : from.path.length ? from.path[from.path.length - 1].parent : from.leaf;
      // a different parent from the repeated one first, so the chain does not just extend the wall
      for (const o of parentsOf(top)) next.push([...extra, o]);
    }
    frontier = next;
  }
  return null;
}

/** The node and its transform in the root's frame for a slot path prefix. */
function nodeAt(root: TileNode, ids: readonly number[]): { node: TileNode; xform: Affine } {
  let node = root;
  let x: Affine = IDENT;
  for (const s of ids) {
    if (node.kind !== 'meta') throw new Error('slot path goes below a tile');
    const ch = node.children.find((c) => c.pos === s);
    if (!ch) throw new Error(`no slot ${s} in ${node.type}`);
    x = mul(x, ch.xform);
    node = ch.node;
  }
  return { node, xform: x };
}

const mid = (a: { x: number; y: number }, b: { x: number; y: number }): string => `${Math.round((a.x + b.x) * 5000)},${Math.round((a.y + b.y) * 5000)}`;

/** Edges that occur once among the tiles: the outline of their union. */
function outline(tiles: readonly WallTile[]): Seg[] {
  const count = new Map<string, { n: number; seg: Seg }>();
  for (const t of tiles) for (let e = 0; e < 6; e++) {
    const a = t.pts[e], b = t.pts[(e + 1) % 6];
    const k = mid(a, b);
    const c = count.get(k);
    if (c) c.n++;
    else count.set(k, { n: 1, seg: { x1: a.x, y1: a.y, x2: b.x, y2: b.y } });
  }
  return [...count.values()].filter((c) => c.n === 1).map((c) => c.seg);
}

export function buildWall(preset: WallPreset, n: number): Wall {
  const { type, slot, edge } = preset;
  const near: Address = { leaf: type, path: Array.from({ length: n }, () => ({ slot, parent: type })) };
  if (neighbour(near, edge).ok) throw new Error(`${preset.label}: the edge does not stay outside for ${n} levels`);
  const closing = closingChain(near, edge, 3);
  if (!closing) throw new Error(`${preset.label}: no chain of three parents lands the crossing`);
  const closed: Address = { leaf: near.leaf, path: [...near.path, ...closing] };
  const nb = neighbour(closed, edge);
  if (!nb.ok) throw new Error('unreachable');
  const L = closed.path.length;
  const rootType = closed.path[L - 1].parent;
  const root = buildSystem('hex', L)[rootType];
  const slotsDown = (a: Address): number[] => [...a.path].reverse().map((l) => l.slot);
  const nearSlots = slotsDown(closed), farSlots = slotsDown(nb.address);
  const top = L - n; // slots above the level-n supertiles
  const nearAnc = nodeAt(root, nearSlots.slice(0, top));
  const farAnc = nodeAt(root, farSlots.slice(0, top));
  const toNear = inv(nodeAt(root, nearSlots).xform);

  const side = (anc: { node: TileNode; xform: Affine }, prefix: number[], which: 'near' | 'far'): WallTile[] =>
    flatten(anc.node, mul(toNear, anc.xform)).map((inst) => ({
      id: [...prefix, ...(inst.id === '' ? [] : inst.id.split('.').map(Number))].join('.'),
      type: inst.type as HexType,
      xform: inst.xform,
      pts: PTS.map((p) => transPt(inst.xform, p)),
      side: which,
    }));
  const nearTiles = side(nearAnc, nearSlots.slice(0, top), 'near');
  const farTiles = side(farAnc, farSlots.slice(0, top), 'far');

  /** whether a tile lies in its side's level-k supertile */
  const inside = (t: WallTile, slots: number[], k: number): boolean => {
    const prefix = slots.slice(0, L - k).join('.');
    return t.id === prefix || t.id.startsWith(prefix + '.');
  };
  const outlinesOf = (tiles: WallTile[], slots: number[]): Seg[][] => {
    const out: Seg[][] = [];
    for (let k = 1; k <= n; k++) {
      out.push(outline(tiles.filter((t) => inside(t, slots, k))));
    }
    return out;
  };

  const nearKeys = new Map<string, Seg>();
  for (const t of nearTiles) for (let e = 0; e < 6; e++) nearKeys.set(mid(t.pts[e], t.pts[(e + 1) % 6]), { x1: t.pts[e].x, y1: t.pts[e].y, x2: t.pts[(e + 1) % 6].x, y2: t.pts[(e + 1) % 6].y });
  const wall: Seg[] = [];
  for (const t of farTiles) for (let e = 0; e < 6; e++) {
    const s = nearKeys.get(mid(t.pts[e], t.pts[(e + 1) % 6]));
    if (s) wall.push(s);
  }

  const nearTile = nearTiles.find((t) => t.id === nearSlots.join('.'))!;
  const crossed: Seg = { x1: nearTile.pts[edge].x, y1: nearTile.pts[edge].y, x2: nearTile.pts[(edge + 1) % 6].x, y2: nearTile.pts[(edge + 1) % 6].y };

  const frames: Box[] = [];
  for (let k = 0; k <= n; k++) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const t of [...nearTiles.filter((t) => inside(t, nearSlots, k)), ...farTiles.filter((t) => inside(t, farSlots, k))]) {
      for (const q of t.pts) { minX = Math.min(minX, q.x); minY = Math.min(minY, q.y); maxX = Math.max(maxX, q.x); maxY = Math.max(maxY, q.y); }
    }
    frames.push({ minX, minY, maxX, maxY });
  }

  // the machine's answer for the chain repeated for ever, to compare with the far column
  const run = runPeriodic(hexTransducer(), [sym(type, edge)], [sym(type, slot)]);
  const machine: string[] = [];
  if (run) {
    const out = [...run.prefix];
    while (out.length < n + 1) out.push(...run.period);
    out.slice(0, n + 1).forEach((s, i) => { const p = parseSym(s); machine.push(i === 0 ? `${p.type}, in through edge ${p.n}` : `slot ${p.n} of a ${p.type}`); });
  }
  const rungs: Rung[] = [];
  rungs.push({ level: 0, near: `${type}, edge ${edge}`, far: `${nb.address.leaf}, in through edge ${nb.edge}`, machine: machine[0] ?? null });
  for (let k = 1; k <= n; k++) {
    const l = nb.address.path[k - 1];
    rungs.push({ level: k, near: `slot ${slot} of a ${type}`, far: `slot ${l.slot} of a ${l.parent}`, machine: machine[k] ?? null });
  }

  return {
    preset, n, closing,
    nearId: nearSlots.join('.'), farId: farSlots.join('.'), farEntry: nb.edge,
    tiles: [...nearTiles, ...farTiles],
    outlines: { near: outlinesOf(nearTiles, nearSlots), far: outlinesOf(farTiles, farSlots) },
    wall, crossed, frames, rungs,
    meetLevel: nb.level,
    meetType: closed.path[nb.level - 1].parent,
  };
}
