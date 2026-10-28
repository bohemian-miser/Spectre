/**
 * Crossing a seam above the top of a stack.
 *
 * A stack of supertiles that stops at level d has a root, and a crossing that
 * climbs out of the root through its edge j has no common ancestor to come
 * back down in. Whatever lies across is a level-d supertile of some type U,
 * entered by an edge jj of the opposite class; that pair of glued edges,
 * `(root, j | U, jj)`, is a `Pair`. Coming down U's edge jj by the positions
 * the crossing climbed by gives the tile across, so each pair names one tile.
 *
 * Growing the near stack by one parent link moves the pair up a level (as the
 * transducer's recogniser does, `nfaStep` in `transducer.ts`): either both
 * supertiles are children of that parent and the seam is inside it (they
 * meet), or the far supertile is a child of some far parent glued to the
 * near parent along a longer edge (a pair one level up), or neither, and the
 * pair dies. The pairs form a finite graph. A pair is `alive` when some
 * sequence of parents never kills it: it either meets in a common ancestor or
 * runs along an infinite wall. Only live pairs are offered across a seam.
 */
import {
  HEX_TYPES, childType, edgeClass, edgeParts, locateChildEdge, neighbour,
  type Address, type HexType, type Link,
} from './transducer';

/** Edge j of a level-d supertile of type `near`, glued to edge jj of one of type `far`. */
export interface Pair { readonly near: HexType; readonly j: number; readonly far: HexType; readonly jj: number }

export const pairKey = (p: Pair): string => `${p.near}.${p.j}|${p.far}.${p.jj}`;

/** One level up from a pair, given the near parent link. */
export type Growth =
  | { readonly kind: 'meet'; /** the far supertile's slot in the common parent */ readonly farSlot: number }
  | { readonly kind: 'pair'; readonly pair: Pair; /** the far supertile's link to its own parent */ readonly farLink: Link };

/** Every way the pair continues when the near supertile is child `link.slot` of a `link.parent`. */
export function growPair(p: Pair, link: Link): Growth[] {
  const { parent: P, slot: s } = link;
  if (childType(P, s) !== p.near) return [];
  const loc = locateChildEdge(P, s, p.j);
  if (loc.kind === 'inside') return childType(P, loc.s) === p.far && loc.e === p.jj ? [{ kind: 'meet', farSlot: loc.s }] : [];
  const out: Growth[] = [];
  const c = edgeClass(P, loc.j);
  for (const P2 of HEX_TYPES) for (let J2 = 0; J2 < 6; J2++) {
    if (edgeClass(P2, J2) !== -c) continue;
    const arc = edgeParts(P2, J2);
    if (arc.length !== loc.n) continue;
    const part = arc[loc.n - 1 - loc.i];
    if (childType(P2, part.s) === p.far && part.e === p.jj) out.push({ kind: 'pair', pair: { near: P, j: loc.j, far: P2, jj: J2 }, farLink: { slot: part.s, parent: P2 } });
  }
  return out;
}

const parentsOf = (t: HexType): Link[] => {
  const out: Link[] = [];
  for (const P of HEX_TYPES) for (let s = 0; s < 8; s++) if (childType(P, s) === t) out.push({ slot: s, parent: P });
  return out;
};

let live: Set<string> | null = null;

/** The pairs some sequence of parents never kills: the largest set where each pair has a way on into the set or a meeting. */
function livePairs(): Set<string> {
  if (live) return live;
  const all: Pair[] = [];
  for (const T of HEX_TYPES) for (let j = 0; j < 6; j++) for (const U of HEX_TYPES) for (let jj = 0; jj < 6; jj++) {
    if (edgeClass(U, jj) === -edgeClass(T, j)) all.push({ near: T, j, far: U, jj });
  }
  const next = new Map(all.map((p) => [pairKey(p), parentsOf(p.near).flatMap((l) => growPair(p, l))]));
  const alive = new Set(all.map(pairKey));
  for (let changed = true; changed;) {
    changed = false;
    for (const p of all) {
      const k = pairKey(p);
      if (alive.has(k) && !next.get(k)!.some((g) => g.kind === 'meet' || alive.has(pairKey(g.pair)))) {
        alive.delete(k);
        changed = true;
      }
    }
  }
  live = alive;
  return alive;
}

export const pairAlive = (p: Pair): boolean => livePairs().has(pairKey(p));

/**
 * How a crossing climbed out of its root: the root's edge, and per level
 * below it the position along the edge (i of n) and the class of the edge
 * crossed at that level, which the tile or supertile across must oppose.
 */
export interface Climb { readonly edge: number; readonly at: readonly { readonly i: number; readonly n: number; readonly cls: number }[] }

/** The climb of a crossing that leaves the root of `address`, or null when it settles inside. */
export function climbOut(address: Address, edge: number): Climb | null {
  const nb = neighbour(address, edge);
  if (nb.ok) return null;
  const at: { i: number; n: number; cls: number }[] = [];
  let top = edge;
  for (const t of nb.trace) {
    if (t.kind === 'up') at[t.level] = { i: t.i, n: t.n, cls: edgeClass(t.type, t.edge) };
    if (t.kind === 'top') top = t.edge;
  }
  return { edge: top, at };
}

/** Down edge `edge` of a supertile of type `root`, at the positions a climb came up by (reversed): the tile reached, and the edge it is entered through. */
export function comeDown(root: HexType, edge: number, climb: Climb): { address: Address; edge: number } | null {
  let type = root;
  let entry = edge;
  const links: Link[] = [];
  for (let m = climb.at.length - 1; m >= 0; m--) {
    const { i, n, cls } = climb.at[m];
    const arc = edgeParts(type, entry);
    if (arc.length !== n) return null;
    const part = arc[n - 1 - i];
    const ct = childType(type, part.s);
    if (!ct || edgeClass(ct, part.e) !== -cls) return null;
    links.unshift({ slot: part.s, parent: type });
    type = ct;
    entry = part.e;
  }
  return { address: { leaf: type, path: links }, edge: entry };
}

/** Every live supertile that can sit across the root's edge where a crossing leaves it, and the tile across in each. */
export function across(address: Address, edge: number): { pair: Pair; address: Address; edge: number }[] {
  const climb = climbOut(address, edge);
  if (!climb) return [];
  const root = address.path.length ? address.path[address.path.length - 1].parent : address.leaf;
  const out: { pair: Pair; address: Address; edge: number }[] = [];
  for (const U of HEX_TYPES) for (let jj = 0; jj < 6; jj++) {
    const pair = { near: root, j: climb.edge, far: U, jj };
    if (edgeClass(U, jj) !== -edgeClass(root, climb.edge) || !pairAlive(pair)) continue;
    const down = comeDown(U, jj, climb);
    if (down) out.push({ pair, ...down });
  }
  return out;
}

/** The fewest near parents that bring a pair to a common ancestor, or null when every way on runs along a wall for ever. */
export function meetingOf(p: Pair): { links: Link[]; farLinks: Link[]; farSlot: number } | null {
  type Path = { pair: Pair; links: Link[]; farLinks: Link[] };
  const seen = new Set([pairKey(p)]);
  let layer: Path[] = [{ pair: p, links: [], farLinks: [] }];
  while (layer.length) {
    const next: Path[] = [];
    for (const q of layer) for (const l of parentsOf(q.pair.near)) for (const g of growPair(q.pair, l)) {
      if (g.kind === 'meet') return { links: [...q.links, l], farLinks: q.farLinks, farSlot: g.farSlot };
      const k = pairKey(g.pair);
      if (seen.has(k) || !pairAlive(g.pair)) continue;
      seen.add(k);
      next.push({ pair: g.pair, links: [...q.links, l], farLinks: [...q.farLinks, g.farLink] });
    }
    layer = next;
  }
  return null;
}
