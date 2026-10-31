/**
 * Runs the harmonic search (`harmonicSearch.ts`) in a worker, or on the page
 * where workers are missing. A patch's strands are sent once (`load`); each
 * search after that sends only its settings, and only the newest search's
 * answer is delivered.
 */

import { buildSystem, type TileFamilyId, type TileTypeId } from '../../core';
import { PatchAncestors, searchHarmonics, type SearchParams, type SearchResult, type Strand } from './harmonicSearch';

/** A rooted patch's strands: circuits first, then open strands, as the analysis lists them. */
export interface PatchStrands {
  /** Names the patch and its analysis; a search names the patch it means. */
  readonly key: string;
  readonly family: TileFamilyId;
  readonly rootType: TileTypeId;
  readonly level: number;
  readonly circuits: readonly Int32Array[];
  readonly tails: readonly Int32Array[];
}

export type WorkerIn = { type: 'load'; patch: PatchStrands } | { type: 'search'; id: number; key: string; params: SearchParams };
type WorkerOut = { id: number; result: SearchResult } | { id: number; error: string };

/** A loaded patch: its supertiles and strands, searched as asked. */
export class HarmonicPatch {
  readonly key: string;
  private readonly anc: PatchAncestors;
  private readonly strands: Strand[];

  constructor(p: PatchStrands) {
    this.key = p.key;
    this.anc = new PatchAncestors(buildSystem(p.family, p.level)[p.rootType], p.level);
    this.strands = [...p.circuits.map((tiles) => ({ closed: true, tiles })), ...p.tails.map((tiles) => ({ closed: false, tiles }))];
  }

  search(params: SearchParams): SearchResult {
    return searchHarmonics(this.anc, this.strands, params);
  }
}

export interface HarmonicSearchClient {
  /** Search the patch (loading it first when it is not the one held); resolves null when a newer search overtook it. */
  search(patch: PatchStrands, params: SearchParams): Promise<SearchResult | null>;
  dispose(): void;
}

export function createHarmonicSearchClient(opts: { forceSync?: boolean } = {}): HarmonicSearchClient {
  let worker: Worker | null = null;
  if (!opts.forceSync && typeof Worker !== 'undefined') {
    try {
      worker = new Worker(new URL('./harmonicSearch.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      worker = null;
    }
  }
  let latest = 0;
  if (!worker) {
    let held: HarmonicPatch | null = null;
    return {
      search: (patch, params) => {
        const id = ++latest;
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            if (id !== latest) return resolve(null);
            try {
              if (held?.key !== patch.key) held = new HarmonicPatch(patch);
              resolve(held.search(params));
            } catch (err) {
              reject(err instanceof Error ? err : new Error(String(err)));
            }
          }, 0);
        });
      },
      dispose: () => {},
    };
  }
  const w = worker;
  let loaded: string | null = null;
  const pending = new Map<number, { resolve(r: SearchResult | null): void; reject(e: Error): void }>();
  w.onmessage = (e: MessageEvent<WorkerOut>) => {
    const p = pending.get(e.data.id);
    pending.delete(e.data.id);
    if (!p) return;
    if ('error' in e.data) p.reject(new Error(e.data.error));
    else p.resolve(e.data.id === latest ? e.data.result : null);
  };
  w.onerror = (e) => {
    for (const p of pending.values()) p.reject(new Error(e.message || 'the harmonic search worker failed'));
    pending.clear();
  };
  return {
    search: (patch, params) => {
      if (loaded !== patch.key) {
        w.postMessage({ type: 'load', patch } satisfies WorkerIn);
        loaded = patch.key;
      }
      const id = ++latest;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        w.postMessage({ type: 'search', id, key: patch.key, params } satisfies WorkerIn);
      });
    },
    dispose: () => {
      pending.clear();
      w.terminate();
    },
  };
}
