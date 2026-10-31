/**
 * Picking circuits for Compare from the Explorer: the first pick waits as A
 * (kept in localStorage, shown as a chip), the second opens Compare on the
 * two in its own window.
 */

import { useCallback, useState } from 'react';
import { compareHref, sameRef, type CircuitRef } from '../compare/refs';
import { readPending, writePending } from '../compare/fromTrace';

/** The window Compare opens in, so later picks update it rather than open another. */
const COMPARE_WINDOW = 'spectre-compare';

export function useComparePick(): { pending: CircuitRef | null; pick(r: CircuitRef): void; clear(): void } {
  const [pending, setPending] = useState<CircuitRef | null>(() => readPending());
  const pick = useCallback((r: CircuitRef): void => {
    const a = readPending();
    if (!a) {
      writePending(r);
      setPending(r);
      return;
    }
    if (sameRef(a, r)) return;
    writePending(null);
    setPending(null);
    window.open(compareHref(import.meta.env.BASE_URL, a, r), COMPARE_WINDOW);
  }, []);
  const clear = useCallback((): void => {
    writePending(null);
    setPending(null);
  }, []);
  return { pending, pick, clear };
}
