/**
 * Where a strand can land when it leaves a tile through an edge, and which
 * ancestor stacks put it there.
 *
 * Leaving edge `e` of a tile of type T, the tile across depends on T's
 * ancestors: T is slot s1 of a P1, which is slot s2 of a P2, and so on up to
 * the first ancestor inside which the edge is glued. Every such stack, up to
 * `maxDepth` ancestors, is run through `neighbour()`; stacks that settle are
 * grouped by the tile type and edge they land on. Stacks still on the outside
 * at `maxDepth` are counted as unsettled (the edge runs along the outline of
 * every ancestor so far).
 */
import { HEX_TYPES, childType, edgeLabels, neighbour, type HexType, type Link } from '../../core';

export interface Landing {
  readonly type: HexType;
  readonly edge: number;
  /** Ancestor stacks that land here, bottom up; each settles at its last link. */
  readonly stacks: readonly (readonly Link[])[];
}

export interface Landings {
  readonly from: { readonly type: HexType; readonly edge: number };
  readonly landings: readonly Landing[];
  /** Stacks with `maxDepth` ancestors that have not settled yet. */
  readonly unsettled: number;
}

const parentsOf = (t: HexType): Link[] => {
  const out: Link[] = [];
  for (const P of HEX_TYPES) for (let s = 0; s < 8; s++) if (childType(P, s) === t) out.push({ slot: s, parent: P });
  return out;
};

const cache = new Map<string, Landings>();

export function landings(type: HexType, edge: number, maxDepth: number): Landings {
  const key = `${type}|${edge}|${maxDepth}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const groups = new Map<string, { type: HexType; edge: number; stacks: Link[][] }>();
  let unsettled = 0;
  const grow = (path: Link[]): void => {
    const top = path.length ? path[path.length - 1].parent : type;
    for (const link of parentsOf(top)) {
      const p = [...path, link];
      const nb = neighbour({ leaf: type, path: p }, edge);
      if (nb.ok) {
        const k = `${nb.address.leaf}|${nb.edge}`;
        const g = groups.get(k) ?? groups.set(k, { type: nb.address.leaf, edge: nb.edge, stacks: [] }).get(k)!;
        g.stacks.push(p);
      } else if (p.length < maxDepth) grow(p);
      else unsettled++;
    }
  };
  grow([]);
  const out: Landings = {
    from: { type, edge },
    landings: [...groups.values()].sort((a, b) => b.stacks.length - a.stacks.length || HEX_TYPES.indexOf(a.type) - HEX_TYPES.indexOf(b.type) || a.edge - b.edge),
    unsettled,
  };
  cache.set(key, out);
  return out;
}

/** An edge's class label as the Explorer writes it, signed: `+2A`, `-3A`. */
export function classLabel(type: HexType, edge: number): string {
  const l = edgeLabels('hex', type)[edge] ?? '';
  const m = /^(-?)(\d+)\.\d+([A-Z])$/.exec(l);
  return m ? `${m[1] === '-' ? '−' : '+'}${m[2]}${m[3]}` : l;
}
