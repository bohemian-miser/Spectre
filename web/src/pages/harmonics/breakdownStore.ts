/**
 * The breakdowns of the Harmonics page's circuits (`breakdowns.ts`), worked
 * out in the engine: a second renormalisation that keeps every born circuit
 * (the engine's keeps one per family, level and length), built to the same
 * level, and each circuit's placements read once per level built.
 */
import type { TileFamilyId } from '../../core';
import { CircuitShapes, type BornCircuit } from '../shapes/circuitShapes';
import { breakdownsOf, overlap, STOP_ABOVE, summarise, type BreakdownSummary, type CircuitBreakdowns, type LevelOverlap } from './breakdowns';
import { sharedTokens, sideAt, type Side } from './pairView';
import { readDown } from './readings';

/** One or two circuits' breakdowns, and their overlap level by level when there are two. */
export interface BreakdownSets {
  readonly sets: readonly BreakdownSummary[];
  readonly overlap: readonly LevelOverlap[] | null;
}

export class BreakdownStore {
  private cs: CircuitShapes | null = null;
  private readonly cache = new Map<string, CircuitBreakdowns>();

  constructor(
    private readonly family: TileFamilyId,
    private readonly subset: readonly number[],
    private readonly combo: string,
  ) {}

  private full(level: number): CircuitShapes {
    if (!this.cs) this.cs = new CircuitShapes(this.family, this.subset, [...this.combo].map((ch) => parseInt(ch, 36)), level, 1, false);
    else if (this.cs.maxLevel < level) {
      this.cs.extend(level);
      this.cache.clear();
    }
    return this.cs;
  }

  /** A circuit's breakdowns, `c` being any of its born circuits, with the renormalisation built to `level`. */
  of(c: BornCircuit, level: number): CircuitBreakdowns {
    const cs = this.full(level);
    const key = `${c.level}/${c.type}/${c.length}/${c.steps.join(',')}`;
    const hit = this.cache.get(key);
    if (hit) return hit;
    const b = breakdownsOf(cs, c);
    this.cache.set(key, b);
    return b;
  }

  /** One or two circuits' breakdowns, and their overlap when two (the first at a level no higher than the second's). */
  sets(circuits: readonly BornCircuit[], level: number): BreakdownSets {
    const bs = circuits.map((c) => this.of(c, level));
    if (bs.length === 2 && bs[0].level > bs[1].level) throw new Error('the lower circuit comes first');
    return { sets: bs.map(summarise), overlap: bs.length === 2 ? overlap(bs[0], bs[1]) : null };
  }

  /** Breakdown `index` at level k of a circuit: its first placement over its level-k supertiles, those holding a visit the level's commonest breakdown lacks marked. */
  picture(c: BornCircuit, level: number, k: number, index: number): Side {
    const b = this.of(c, level);
    const cs = this.full(level);
    const at = b.levels[k].breakdowns;
    const reading = (i: number) => readDown(cs, b.placements[at[i].placements[0]], STOP_ABOVE).readings.find((r) => r.level === k);
    const mine = reading(index);
    const common = index === 0 ? mine : reading(0);
    const shared = mine && common ? sharedTokens(common.tokens, mine.tokens).b : null;
    return sideAt(cs, b.placements[at[index].placements[0]], k, shared);
  }
}
