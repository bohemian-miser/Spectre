/**
 * What the Explorer's infinite view offers for a traced strand on the
 * hexagons: a circuit goes to Compare (the first pick waits as A, shown as a
 * chip; the second opens Compare on the two), an open strand to Identify.
 */

import { useEffect, useMemo, useState } from 'react';
import { formatRef, sameRef, type CircuitRef } from '../compare/refs';
import { BORN_SEARCH_MAX, circuitRefOf } from '../compare/fromTrace';
import { identifyHref } from '../identify/href';
import type { InfiniteCanvasStatus } from '../map/InfiniteCanvas';
import { useComparePick } from './comparePick';
import { locateTraceStart } from './locate';

const stop = (e: React.PointerEvent): void => e.stopPropagation();

export function TraceActions(props: {
  trace: InfiniteCanvasStatus['trace'] | null;
  rule: { subset: readonly number[]; combo: string } | null;
  seed: number;
  worldChain?: string;
  traceSeed: readonly [number, number, number, number] | null;
}): JSX.Element | null {
  const { trace, rule, seed, worldChain, traceSeed } = props;
  const { pending, pick, clear } = useComparePick();
  const closedLength = trace?.active && trace.status === 'closed' ? trace.steps : null;
  const open = !!trace?.active && trace.status !== null && trace.status !== 'closed';

  // The circuit's name needs its birth level, worked out off the click so the click can open a window.
  const [ref, setRef] = useState<{ length: number; ref: CircuitRef | null } | null>(null);
  useEffect(() => {
    setRef(null);
    if (!rule || closedLength === null) return;
    const id = setTimeout(() => setRef({ length: closedLength, ref: circuitRefOf(rule.subset, rule.combo, closedLength) }), 0);
    return () => clearTimeout(id);
  }, [rule, closedLength]);

  const identify = useMemo(() => {
    if (!open || !rule || !traceSeed) return null;
    const at = locateTraceStart(seed, worldChain, traceSeed);
    return at ? identifyHref(import.meta.env.BASE_URL, { subset: rule.subset, combo: rule.combo, tile: at.tile, edge: at.edge, level: at.level }) : null;
  }, [open, rule, traceSeed, seed, worldChain]);

  if (!rule) return null;

  const ready = ref && ref.length === closedLength ? ref : null;
  return (
    <>
      {closedLength !== null ? (
        ready?.ref === null ? (
          <span data-testid="inf-compare-none">not born by level {BORN_SEARCH_MAX}: too long to compare here</span>
        ) : (
          <button
            type="button"
            className="hud-action"
            disabled={!ready?.ref || (!!pending && sameRef(pending, ready.ref))}
            onPointerDown={stop}
            onClick={() => ready?.ref && pick(ready.ref)}
            title={
              ready?.ref
                ? `${formatRef(ready.ref)}, born at level ${ready.ref.level}: ${pending ? 'compare it with A' : 'keep it as A for the next circuit'}`
                : 'finding the level it is born at'
            }
            data-testid="inf-compare"
          >
            Add to comparison
          </button>
        )
      ) : null}
      {pending ? (
        <span className="hud-chip" data-testid="inf-compare-pending">
          A {formatRef(pending)}
          <button
            type="button"
            aria-label="Clear the circuit waiting to be compared"
            onPointerDown={stop}
            onClick={clear}
            data-testid="inf-compare-clear"
          >
            ×
          </button>
        </span>
      ) : null}
      {identify ? (
        <a href={identify} onPointerDown={stop} data-testid="inf-identify">
          Identify this strand
        </a>
      ) : null}
    </>
  );
}
