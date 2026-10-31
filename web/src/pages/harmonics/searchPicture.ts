/**
 * The brute force drawn as it runs (`bruteForce.ts`): the supertile whose
 * strands are followed, its children, the windows looked through so far and
 * every arc followed, each a line through the child crossings it enters, in
 * the supertile's frame. A sketch takes the arcs' steps as the search makes
 * them and works out points only when a picture is asked for, so a search
 * nobody watches pays nothing for the drawing.
 */
import { mul, transPt, type Affine, type HexType, type Pt } from '../../core';
import { outlineOf } from '../buildup/deep';
import type { CircuitShapes } from '../shapes/circuitShapes';
import type { SparseRoutes } from './sparseRoutes';

/**
 * How an arc followed ended: it left the supertile, ended in a tile, closed
 * (not yet read), closed in another family, closed reading differently from
 * the circuit below, or closed as its harmonic; or it is still being
 * followed.
 */
export type ArcEnd = 'following' | 'open' | 'ends' | 'closed' | 'other' | 'differs' | 'harmonic';

export interface SearchArc {
  /** Its line through the child crossings it enters, x, y pairs, at most `ARC_POINTS` of them (the first and the last kept). */
  readonly pts: Float64Array;
  readonly end: ArcEnd;
  /** Child crossings entered. */
  readonly steps: number;
  /** Tiles, once the walk has ended. */
  readonly length: number;
}

export interface SearchPicture {
  readonly level: number;
  readonly type: string;
  /** The supertile's outline, x, y pairs, closed, in its frame. */
  readonly outline: Float64Array;
  readonly children: readonly { readonly slot: number; readonly type: string; readonly outline: Float64Array }[];
  /** The last `WINDOWS_KEPT` supertiles looked through, the one being looked through last. */
  readonly windows: readonly { readonly level: number; readonly outline: Float64Array }[];
  /** Windows looked through in all. */
  readonly windowCount: number;
  /** The last `ARCS_KEPT` arcs followed, the one being followed last. */
  readonly arcs: readonly SearchArc[];
  /** Arcs followed in all, by how they ended. */
  readonly counts: Readonly<Record<ArcEnd, number>>;
}

export const ARC_POINTS = 200;
export const ARCS_KEPT = 1000;
export const WINDOWS_KEPT = 48;

const ENDS: readonly ArcEnd[] = ['following', 'open', 'ends', 'closed', 'other', 'differs', 'harmonic'];

interface Kept {
  steps: ArrayLike<number>;
  end: ArcEnd;
  length: number;
  count: number;
  pts: Float64Array | null;
}

/** A supertile's search as it is drawn: the arcs followed through its children and the windows looked through. */
export class Sketch {
  private readonly frames = new Map<number, { type: string; xform: Affine }>();
  private readonly outlines = new Map<string, Float64Array>();
  private readonly arcs: Kept[] = [];
  private live: number[] | null = null;
  private readonly windows: { level: number; outline: Float64Array }[] = [];
  private windowCount = 0;
  private readonly counts: Record<ArcEnd, number> = { following: 0, open: 0, ends: 0, closed: 0, other: 0, differs: 0, harmonic: 0 };

  constructor(
    readonly cs: CircuitShapes,
    readonly R: SparseRoutes,
    readonly level: number,
    readonly type: string,
  ) {
    for (const ch of cs.childTypes(level, type)) {
      const c = cs.childOf(level, type, ch.pos);
      this.frames.set(ch.pos, { type: c.type, xform: c.xform });
    }
  }

  /** Crossing a of a level-n supertile of `type`, in its frame: the table's point within the tables, above them the child crossing's point placed by its child. */
  private crossingPt(n: number, type: string, a: number): Pt {
    if (n <= this.R.base) return this.cs.levels[n][type].pt(a);
    const s = a % 8;
    const ch = this.cs.childOf(n, type, s);
    return transPt(ch.xform, this.crossingPt(n - 1, ch.type, (a - s) / 8));
  }

  /** The point of child crossing `step` (`childAddress * 8 + slot`) of the supertile, in its frame. */
  point(step: number): Pt {
    const s = step % 8;
    const ch = this.frames.get(s)!;
    return transPt(ch.xform, this.crossingPt(this.level - 1, ch.type, (step - s) / 8));
  }

  private outline(n: number, type: string): Float64Array {
    const key = `${n}/${type}`;
    let hit = this.outlines.get(key);
    if (!hit) this.outlines.set(key, (hit = outlineOf(this.cs, n, type as HexType, Math.min(3, n))));
    return hit;
  }

  /** The supertile at slot path `path` from this one down is looked through next. */
  window(path: readonly number[]): void {
    let x: Affine = [1, 0, 0, 0, 1, 0];
    let n = this.level;
    let t = this.type;
    for (const s of path) {
      const ch = this.cs.childOf(n, t, s);
      x = mul(x, ch.xform);
      n--;
      t = ch.type;
    }
    const base = this.outline(n, t);
    const outline = new Float64Array(base.length);
    for (let i = 0; i < base.length; i += 2) {
      const p = transPt(x, { x: base[i], y: base[i + 1] });
      outline[i] = p.x;
      outline[i + 1] = p.y;
    }
    this.windows.push({ level: n, outline });
    if (this.windows.length > WINDOWS_KEPT) this.windows.shift();
    this.windowCount++;
  }

  /** An arc is followed from now: `steps` fills as the walk goes. */
  follow(steps: number[]): void {
    this.live = steps;
  }

  /** The arc followed ended; its steps are kept thinned to `ARC_POINTS`. */
  ended(end: Exclude<ArcEnd, 'following'>, length: number): void {
    const steps = this.live ?? [];
    this.live = null;
    this.arcs.push({ steps: thinSteps(steps), end, length, count: steps.length, pts: null });
    this.counts[end]++;
    if (this.arcs.length > ARCS_KEPT) {
      const i = this.arcs.findIndex((a) => a.end === 'open' || a.end === 'ends');
      this.arcs.splice(i < 0 ? 0 : i, 1);
    }
  }

  /** The last arc ended, read: how it closed. */
  relabel(end: 'other' | 'differs' | 'harmonic'): void {
    const a = this.arcs[this.arcs.length - 1];
    if (!a) return;
    this.counts[a.end]--;
    a.end = end;
    this.counts[end]++;
  }

  private line(steps: ArrayLike<number>): Float64Array {
    const out = new Float64Array(2 * steps.length);
    for (let i = 0; i < steps.length; i++) {
      const p = this.point(steps[i]);
      out[2 * i] = p.x;
      out[2 * i + 1] = p.y;
    }
    return out;
  }

  /** The search so far. */
  draw(): SearchPicture {
    const arcs: SearchArc[] = this.arcs.map((a) => ({ pts: (a.pts ??= this.line(a.steps)), end: a.end, steps: a.count, length: a.length }));
    const counts = { ...this.counts };
    if (this.live) {
      arcs.push({ pts: this.line(thinSteps(this.live)), end: 'following', steps: this.live.length, length: 0 });
      counts.following = 1;
    }
    const children = [...this.frames].map(([slot, ch]) => {
      const base = this.outline(this.level - 1, ch.type);
      const outline = new Float64Array(base.length);
      for (let i = 0; i < base.length; i += 2) {
        const p = transPt(ch.xform, { x: base[i], y: base[i + 1] });
        outline[i] = p.x;
        outline[i + 1] = p.y;
      }
      return { slot, type: ch.type, outline };
    });
    return {
      level: this.level,
      type: this.type,
      outline: this.outline(this.level, this.type),
      children,
      windows: this.windows.slice(),
      windowCount: this.windowCount,
      arcs,
      counts,
    };
  }
}

/** At most `ARC_POINTS` of the steps, evenly spaced, the first and the last among them. */
export function thinSteps(steps: readonly number[]): ArrayLike<number> {
  const n = steps.length;
  if (n <= ARC_POINTS) return steps.slice();
  const out = new Float64Array(ARC_POINTS);
  for (let j = 0; j < ARC_POINTS - 1; j++) out[j] = steps[Math.floor((j * (n - 1)) / (ARC_POINTS - 1))];
  out[ARC_POINTS - 1] = steps[n - 1];
  return out;
}

/** Arcs followed, by how they ended, as a sentence. */
export function describeArcs(counts: Readonly<Record<ArcEnd, number>>): string {
  const nf = (n: number) => n.toLocaleString('en-US');
  const total = ENDS.reduce((s, e) => s + counts[e], 0);
  const parts: string[] = [];
  if (counts.open) parts.push(`${nf(counts.open)} leave the supertile`);
  if (counts.ends) parts.push(`${nf(counts.ends)} end in a tile`);
  if (counts.closed) parts.push(`${nf(counts.closed)} closed, being read`);
  if (counts.other) parts.push(`${nf(counts.other)} close in another family`);
  if (counts.differs) parts.push(`${nf(counts.differs)} close reading differently`);
  if (counts.harmonic) parts.push(`${nf(counts.harmonic)} close as the harmonic`);
  if (counts.following) parts.push('one being followed');
  return `${nf(total)} arc${total === 1 ? '' : 's'} followed${parts.length ? `: ${parts.join(', ')}` : ''}`;
}
