/**
 * A supertile's strands welded from its leaf tiles: each tile's crossings
 * placed by its transform, each tile's chords joining them as the
 * combination pairs them, and chords of neighbouring tiles joined where
 * their crossings meet. This reads the tiling, not the borders of
 * `period/period.ts`, so the two can be checked against each other.
 */
import { buildSystem, connectionPoints, flatten, leafOrder, leafPts, transPt, type HexType, type Pt } from '../../core';
import { ruleOptions } from '../shapes/circuitShapes';

export interface Tile {
  /** Slot path from the root, `1.7.0`. */
  readonly id: string;
  readonly type: HexType;
  readonly outline: readonly Pt[];
}

export interface Chord {
  readonly tile: number;
  readonly a: Pt;
  readonly b: Pt;
}

/** A strand inside the patch: its chords in order, each with the end it is entered by. */
export interface Strand {
  readonly chords: readonly { readonly chord: number; readonly from: 'a' | 'b' }[];
  readonly closed: boolean;
  /** For an open strand, the two crossings on the patch's border it ends at. */
  readonly ends: readonly Pt[];
}

export interface Patch {
  readonly tiles: readonly Tile[];
  readonly chords: readonly Chord[];
  readonly strands: readonly Strand[];
}

const key = (p: Pt): string => `${Math.round(p.x * 1000)},${Math.round(p.y * 1000)}`;

/** The level-n supertile of `type`, its tiles' chords, and its strands walked from them. */
export function tracePatch(subset: readonly number[], digits: readonly number[], n: number, type: HexType): Patch {
  const sel = new Set(subset);
  const options = ruleOptions('hex', subset);
  const order = leafOrder('hex');
  const tiles: Tile[] = [];
  const chords: Chord[] = [];
  /** Chord ends meeting at each crossing: chord * 2 + (0 for a, 1 for b). */
  const at = new Map<string, number[]>();
  for (const leaf of flatten(buildSystem('hex', n)[type])) {
    const t = leaf.type as HexType;
    const ti = order.indexOf(t);
    const tile = tiles.length;
    tiles.push({ id: leaf.id, type: t, outline: leafPts('hex', t).map((p) => transPt(leaf.xform, p)) });
    const pts = connectionPoints('hex', t, sel).map((c) => transPt(leaf.xform, c.pt));
    for (const [i, j] of options[ti][digits[ti]] ?? []) {
      const c = chords.length;
      chords.push({ tile, a: pts[i], b: pts[j] });
      for (const [p, end] of [[pts[i], 2 * c], [pts[j], 2 * c + 1]] as const) (at.get(key(p)) ?? at.set(key(p), []).get(key(p))!).push(end);
    }
  }
  const pt = (end: number): Pt => (end & 1 ? chords[end >> 1].b : chords[end >> 1].a);
  const across = (end: number): number | undefined => at.get(key(pt(end)))!.find((x) => x !== end);
  const used = new Uint8Array(chords.length);
  const strands: Strand[] = [];
  /** Walk from chord end `start`, entering its chord there, until the patch's border or back to the start. */
  const walk = (start: number): Strand => {
    const out: { chord: number; from: 'a' | 'b' }[] = [];
    let e = start;
    for (;;) {
      const c = e >> 1;
      used[c] = 1;
      out.push({ chord: c, from: e & 1 ? 'b' : 'a' });
      const next = across(e ^ 1);
      if (next === undefined) return { chords: out, closed: false, ends: [pt(start), pt(e ^ 1)] };
      if (next === start) return { chords: out, closed: true, ends: [] };
      e = next;
    }
  };
  for (const [, ends] of at) if (ends.length === 1 && !used[ends[0] >> 1]) strands.push(walk(ends[0]));
  for (let c = 0; c < chords.length; c++) if (!used[c]) strands.push(walk(2 * c));
  return { tiles, chords, strands };
}

/** A strand's crossings in order, end to end. */
export function strandPath(p: Patch, s: Strand): Pt[] {
  const out: Pt[] = [];
  for (const { chord, from } of s.chords) {
    const c = p.chords[chord];
    if (!out.length) out.push(from === 'a' ? c.a : c.b);
    out.push(from === 'a' ? c.b : c.a);
  }
  return out;
}

/** Along a strand, the runs of consecutive chords whose tiles lie under a slot path prefix (`0`, `5.2`). */
export function runsUnder(p: Patch, s: Strand, prefix: string): { start: number; end: number }[] {
  const inside = (c: number): boolean => {
    const id = p.tiles[p.chords[c].tile].id;
    return id === prefix || id.startsWith(`${prefix}.`);
  };
  const runs: { start: number; end: number }[] = [];
  s.chords.forEach(({ chord }, i) => {
    if (!inside(chord)) return;
    const last = runs[runs.length - 1];
    if (last && last.end === i) last.end = i + 1;
    else runs.push({ start: i, end: i + 1 });
  });
  return runs;
}
