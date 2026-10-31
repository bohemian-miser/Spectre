/**
 * Straightening worker: builds the patch and its rounds for each level in
 * turn (`pages/limit/straightenData.ts`), posting each level as it is done.
 */

import type { TileFamilyId } from '../core/families';
import { computeStraighten, type StraightenLevel } from '../pages/limit/straightenData';

export type StraightenReply = { readonly data: StraightenLevel } | { readonly error: string };

type WorkerScope = {
  onmessage: ((event: MessageEvent<{ family: TileFamilyId; levels: readonly number[] }>) => void) | null;
  postMessage(message: StraightenReply, transfer?: Transferable[]): void;
};

const scope = globalThis as unknown as WorkerScope;

scope.onmessage = (event) => {
  try {
    for (const level of event.data.levels) {
      const data = computeStraighten(event.data.family, level);
      scope.postMessage({ data }, data.pieces.flatMap((p) => p.rounds.map((r) => r.buffer as ArrayBuffer)));
    }
  } catch (err) {
    scope.postMessage({ error: err instanceof Error ? err.message : String(err) });
  }
};
