/**
 * Every circuit of a combination, found by walking strands on every tiling at
 * once (`src/pages/walker/possible.ts`).
 *
 * A strand starts on a bare tile of each type, entering by each edge that
 * carries a crossing. Each step moves every ancestor stack still possible;
 * when the stacks disagree on what is seen next, the walk branches, one
 * branch per outcome. A branch that is back on its start tile, entering by
 * its start edge, is a circuit; one whose crossing needs more than
 * `maxLevel` ancestors is cut off as open. Branches are advanced together,
 * one step each per round, so circuits come out shortest first.
 *
 * Every circuit through a tile of type T entered by edge e is found from the
 * start (T, e), so the starts between them find every circuit whose
 * ancestors fit in `maxLevel` levels. Circuits are told apart by
 * `circuitKey` (the word read round the circuit, from any tile, either way).
 */
import { HEX_TYPES, letter, type Address, type HexType } from '../src/core';
import { makeWalker, replay, stepAll, initialWorlds, type Walker, type World } from '../src/pages/walker/possible';
import type { Pattern } from '../src/pages/walker/walk';
import { circuitKey } from './keys';

export interface EnumerateOptions {
  /** Most ancestors a stack may grow to. */
  readonly maxLevel: number;
  /** Branches longer than this are dropped. */
  readonly maxLength: number;
  /** Stop once this many distinct circuits are found. */
  readonly maxCircuits: number;
  /** Stop once the live branches hold this many stacks between them. */
  readonly maxWorlds: number;
}

export const DEFAULT_OPTIONS: EnumerateOptions = { maxLevel: 8, maxLength: 10000, maxCircuits: 1000, maxWorlds: 200000 };

export interface Circuit {
  readonly key: string;
  /** The word as first walked: one letter per tile. */
  readonly word: readonly string[];
  /** The tiles, in one root (the stack of the first world that closed). */
  readonly tiles: readonly Address[];
  /** Fewest ancestors any stack needed to close it. */
  readonly level: number;
  /** Stacks that closed it in the branch that found it. */
  readonly worlds: number;
}

export interface Enumeration {
  readonly circuits: readonly Circuit[];
  /** Branches cut off at `maxLevel` (open strands, or circuits needing more levels). */
  readonly open: number;
  /** Branches dropped at `maxLength`. */
  readonly long: number;
  /** Why the search stopped early, if it did. */
  readonly stopped: 'circuits' | 'worlds' | null;
}

interface Branch {
  readonly wk: Walker;
  worlds: readonly World[];
  word: string[];
}

export function enumerateCircuits(pattern: Pattern, table: Map<HexType, Map<number, number>>, opts: EnumerateOptions = DEFAULT_OPTIONS): Enumeration {
  let live: Branch[] = [];
  for (const t of HEX_TYPES) {
    for (const edge of table.get(t)?.keys() ?? []) {
      const wk = makeWalker(pattern, t, edge, opts.maxLevel);
      live.push({ wk, worlds: initialWorlds(wk), word: [] });
    }
  }
  const found = new Map<string, Circuit>();
  let open = 0;
  let long = 0;
  let stopped: Enumeration['stopped'] = null;
  while (live.length && !stopped) {
    const next: Branch[] = [];
    for (const b of live) {
      const w0 = b.worlds[0];
      const step = letter(w0.at.leaf, w0.entry, b.wk.table.get(w0.at.leaf)!.get(w0.entry)!);
      const outs = stepAll(b.wk, b.worlds);
      outs.forEach((o, i) => {
        if (o.key === 'open') { open++; return; }
        const word = i === outs.length - 1 ? b.word : [...b.word];
        word.push(step);
        if (o.key === 'closes') {
          const key = circuitKey(word);
          if (!found.has(key)) {
            const level = Math.min(...o.worlds.map((w) => w.chain.length));
            const world = o.worlds.find((w) => w.chain.length === level)!;
            found.set(key, { key, word, tiles: replay(b.wk, world, word.length - 1).at, level, worlds: o.worlds.length });
          }
          return;
        }
        if (word.length >= opts.maxLength) { long++; return; }
        next.push({ wk: b.wk, worlds: o.worlds, word });
      });
      if (found.size >= opts.maxCircuits) { stopped = 'circuits'; break; }
    }
    live = next;
    if (!stopped && live.reduce((s, b) => s + b.worlds.length, 0) > opts.maxWorlds) stopped = 'worlds';
  }
  return { circuits: [...found.values()], open, long, stopped };
}
