/**
 * The Harmonics page's brute force (`harmonics/bruteForce.ts`, run by
 * `harmonics/bruteJob.ts` in its worker) on the Foundations page: a chain's
 * next member above the build, two levels above a member built or one found
 * before it, then drawn small as the Harmonics page draws one found
 * (`harmonics/found.ts`). The members found are kept for the visit, by rule,
 * combination, chain and the member they go on from, so the chain rows and
 * the Monsters tab show them alike.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BruteResult, Progress } from '../harmonics/bruteForce';
import { createBruteClient, STOPPED, type BruteFrom } from '../harmonics/bruteJob';
import { subsetOf } from './data';
import { BUDGET } from './drawings';

export type BruteCell =
  | { readonly state: 'running'; readonly progress: Progress | null }
  | { readonly state: 'done'; readonly result: BruteResult; readonly pts: Float64Array | null; readonly undrawn?: string }
  | { readonly state: 'failed'; readonly error: string };

/** Where a cell sits: rule, combination, the chain's foundational circuit, the built member the cells go on from, and the level. */
export interface BruteAt {
  readonly rule: string;
  readonly combo: string;
  readonly root: number;
  readonly tip: number;
  readonly level: number;
}

const keyOf = (a: BruteAt): string => `${a.rule}/${a.combo}/${a.root}/${a.tip}@${a.level}`;

/** A member found, as the Monsters tab lists it. */
export interface BruteFound {
  readonly level: number;
  readonly length: number;
}

export interface ChainBrute {
  cell(at: BruteAt): BruteCell | undefined;
  /** Whether a brute force is under way: one runs at a time. */
  readonly running: boolean;
  /** Finds the member at `at.level`: from the built member `start` (its walk as drawn) when it is the first above the build, else from the member found two levels down. */
  run(at: BruteAt, floor: number, start: BruteFrom['circuit'] | null): void;
  stop(): void;
  /** The members found on a chain, by level. */
  foundOn(rule: string, combo: string, root: number): BruteFound[];
}

export function useChainBrute(opts: { forceSync?: boolean } = {}): ChainBrute {
  const client = useRef(createBruteClient({ forceSync: opts.forceSync }));
  useEffect(() => () => client.current.dispose(), []);
  const [cells, setCells] = useState<ReadonlyMap<string, BruteCell>>(new Map());
  const put = useCallback(
    (key: string, c: BruteCell | null) =>
      setCells((m) => {
        const out = new Map(m);
        if (c) out.set(key, c);
        else out.delete(key);
        return out;
      }),
    [],
  );
  const running = useMemo(() => [...cells.values()].some((c) => c.state === 'running'), [cells]);
  const run = useCallback(
    (at: BruteAt, floor: number, start: BruteFrom['circuit'] | null) => {
      const key = keyOf(at);
      const job = { subset: subsetOf(at.rule), combo: at.combo };
      const prev = cells.get(keyOf({ ...at, level: at.level - 2 }));
      const from: BruteFrom | null =
        prev?.state === 'done' && prev.result.found ? { circuit: prev.result.found, addressed: true, floor } : start ? { circuit: start, addressed: false, floor } : null;
      if (!from) return;
      put(key, { state: 'running', progress: null });
      client.current
        .harmonic(job, from, (p) => put(key, { state: 'running', progress: p }))
        .then((result) => {
          put(key, { state: 'done', result, pts: null });
          const f = result.found;
          if (!f) return;
          // drawn after; a drawing that fails leaves the member found, with the reason
          client.current
            .thumb(job, { level: f.level, type: f.type, length: f.length, family: f.family, deep: f.deep }, BUDGET)
            .then((pts) => put(key, { state: 'done', result, pts }))
            .catch((e: unknown) => put(key, { state: 'done', result, pts: null, undrawn: e instanceof Error ? e.message : String(e) }));
        })
        .catch((e: unknown) => {
          const msg = e instanceof Error ? e.message : String(e);
          put(key, msg === STOPPED ? null : { state: 'failed', error: msg });
        });
    },
    [cells, put],
  );
  const stop = useCallback(() => client.current.stop(), []);
  const cell = useCallback((at: BruteAt) => cells.get(keyOf(at)), [cells]);
  const foundOn = useCallback(
    (rule: string, combo: string, root: number) => {
      const head = `${rule}/${combo}/${root}/`;
      const out: BruteFound[] = [];
      for (const [k, c] of cells) if (k.startsWith(head) && c.state === 'done' && c.result.found) out.push({ level: c.result.found.level, length: c.result.found.length });
      return out.sort((a, b) => a.level - b.level || a.length - b.length);
    },
    [cells],
  );
  return { cell, running, run, stop, foundOn };
}
