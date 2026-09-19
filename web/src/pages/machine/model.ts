/**
 * Page-level model for the strand machine explorer.
 *
 * The automaton itself lives in `core/automaton.ts`; this file is the part the
 * UI needs and the core should not care about: which joins have actually been
 * seen in a patch, what each tile type's keyboard shortcut is, and how to turn
 * the per-type matching choices into the combination string the rest of the site
 * uses.
 */

import {
  DEFAULT_CONTRACTS,
  buildSystem,
  connectionPoints,
  flatten,
  leafOrder,
  nonCrossingForTile,
  slotsOfType,
  transPt,
  type Slot,
  type TileFamilyId,
  type TileTypeId,
} from '../../core';

// ---------------------------------------------------------------------------
// Keyboard
// ---------------------------------------------------------------------------

/**
 * One letter per tile type. Chosen so every spectre type is reachable without a
 * modifier; pressing a letter twice cycles when a type offers several joins.
 */
export const TILE_KEY: Readonly<Record<string, string>> = Object.freeze({
  Delta: 'd',
  Theta: 't',
  Lambda: 'l',
  Xi: 'x',
  Pi: 'p',
  Sigma: 's',
  Phi: 'f',
  Psi: 'y',
  Gamma: 'g',
  Gamma1: 'g',
  Gamma2: 'h',
});

export function keyForType(type: TileTypeId | string): string {
  return TILE_KEY[type] ?? '?';
}

// ---------------------------------------------------------------------------
// Observed joins
// ---------------------------------------------------------------------------

export interface ObservedJoins {
  /** `${slotA.id} | ${slotB.id}`, both orders present. */
  readonly pairs: ReadonlySet<string>;
  readonly tiles: number;
  readonly level: number;
}

const observedCache = new Map<string, ObservedJoins>();

export function joinKey(a: Slot, b: Slot): string {
  return `${a.id} | ${b.id}`;
}

/**
 * Which joins actually occur, measured in a level-`level` patch.
 *
 * Welding uses the same rounded point key the rest of the site welds with
 * (`core/circuits.ts`), which is enough here: the page only needs to tell a
 * reader which of the permitted joins it has ever seen, not to prove anything.
 */
export function observedJoins(
  family: TileFamilyId,
  subset: readonly number[],
  level = 4,
): ObservedJoins {
  const key = `${family}/${[...subset].sort().join(',')}/${level}`;
  const hit = observedCache.get(key);
  if (hit) return hit;

  const selected = new Set(subset);
  const system = buildSystem(family, level);
  const root = system[leafOrder(family)[0]] ?? Object.values(system)[0];
  const instances = flatten(root);

  const local = new Map<string, { pts: ReturnType<typeof connectionPoints>; slots: readonly Slot[] }>();
  const dots = new Map<string, { type: TileTypeId; seam: number }[]>();
  for (const inst of instances) {
    let entry = local.get(inst.type);
    if (!entry) {
      entry = {
        pts: connectionPoints(family, inst.type, selected, DEFAULT_CONTRACTS),
        slots: slotsOfType(family, inst.type, subset),
      };
      local.set(inst.type, entry);
    }
    for (let s = 0; s < entry.pts.length; s++) {
      const p = transPt(inst.xform, entry.pts[s].pt);
      const k = `${p.x.toFixed(3)},${p.y.toFixed(3)}`;
      let list = dots.get(k);
      if (!list) {
        list = [];
        dots.set(k, list);
      }
      list.push({ type: inst.type, seam: s });
    }
  }

  const pairs = new Set<string>();
  for (const list of dots.values()) {
    if (list.length !== 2) continue;
    const a = slotsOfType(family, list[0].type, subset)[list[0].seam];
    const b = slotsOfType(family, list[1].type, subset)[list[1].seam];
    if (!a || !b) continue;
    pairs.add(joinKey(a, b));
    pairs.add(joinKey(b, a));
  }

  const out: ObservedJoins = { pairs, tiles: instances.length, level };
  observedCache.set(key, out);
  return out;
}

// ---------------------------------------------------------------------------
// Combination strings
// ---------------------------------------------------------------------------

/** Tile types that actually offer a choice under this selection. */
export function choosableTypes(
  family: TileFamilyId,
  subset: readonly number[],
): readonly { type: TileTypeId; options: number }[] {
  return leafOrder(family)
    .map((type) => ({ type, options: nonCrossingForTile(family, type, new Set(subset)).length }))
    .filter((x) => x.options > 1);
}

/** A matching record with every type at its first non-crossing option. */
export function defaultMatching(
  family: TileFamilyId,
  subset: readonly number[],
): Record<string, number> {
  const rec: Record<string, number> = {};
  for (const type of leafOrder(family)) {
    rec[type] = nonCrossingForTile(family, type, new Set(subset))[0] ?? 0;
  }
  return rec;
}

/** Set one type to its `choice`-th NON-CROSSING option (not raw matching index). */
export function withChoice(
  family: TileFamilyId,
  subset: readonly number[],
  matching: Readonly<Record<string, number>>,
  type: TileTypeId,
  choice: number,
): Record<string, number> {
  const nc = nonCrossingForTile(family, type, new Set(subset));
  return { ...matching, [type]: nc[Math.min(choice, nc.length - 1)] ?? 0 };
}

/** Which non-crossing option a type is currently on. */
export function choiceOf(
  family: TileFamilyId,
  subset: readonly number[],
  matching: Readonly<Record<string, number>>,
  type: TileTypeId,
): number {
  const nc = nonCrossingForTile(family, type, new Set(subset));
  const i = nc.indexOf(matching[type] ?? 0);
  return i < 0 ? 0 : i;
}
