/**
 * The levels built so far, highest first, each with what it holds: its
 * routes (or how many of them a followed circuit uses, or how many are kept)
 * and the circuits closing at it. A level is opened by clicking its row, a
 * circuit followed by clicking its chip; the last row builds the next level.
 */
import { useEffect, useRef, useState } from 'react';
import type { Closing } from './buildup';

const nf = (n: number) => n.toLocaleString('en-US');
/** Chips shown on a row before the rest are folded away. */
const FOLD = 8;

/** A circuit chip: followed, closing from the kept routes, closing without them, or none of those. */
export type ChipState = 'followed' | 'made' | 'dropped' | null;

export interface Rung {
  readonly level: number;
  /** One line under the level: routes, used routes or kept routes. */
  readonly meta: string;
  readonly metaTitle?: string;
  /** A short tag beside the level, such as where routes are kept. */
  readonly tag?: string;
  /** Drawn faint: a level the kept routes do not reach. */
  readonly dim: boolean;
  readonly circuits: readonly { readonly c: Closing; readonly isNew: boolean; readonly state: ChipState; readonly title: string }[];
}

export function Ladder(props: {
  rungs: readonly Rung[];
  level: number;
  onLevel: (n: number) => void;
  onCircuit: (c: Closing, level: number) => void;
  build: { label: string; disabled: boolean; onClick: () => void };
  /** A line above the rows. */
  hint: string;
}): JSX.Element {
  const { rungs, level } = props;
  const [open, setOpen] = useState<ReadonlySet<number>>(new Set());
  const active = useRef<HTMLLIElement | null>(null);
  // keeps the open level in view, across the row on a phone
  useEffect(() => {
    active.current?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [level]);
  return (
    <nav className="bu-ladder" aria-label="Levels" data-testid="bu-ladder">
      <p className="bu-ladder-hint">{props.hint}</p>
      <ol>
        <li className="bu-rung is-build">
          <button type="button" className="bu-build" disabled={props.build.disabled} onClick={props.build.onClick} data-testid="bu-next">{props.build.label}</button>
        </li>
        {[...rungs].reverse().map((r) => {
          const all = open.has(r.level);
          const shown = all ? r.circuits : r.circuits.filter((x, i) => i < FOLD || x.state === 'followed' || x.state === 'made');
          const folded = r.circuits.length - shown.length;
          return (
            <li key={r.level} ref={r.level === level ? active : undefined}
              className={`bu-rung${r.level === level ? ' is-active' : ''}${r.dim ? ' is-dim' : ''}`} data-testid="bu-rung" data-level={r.level}>
              <button type="button" className="bu-rung-head" onClick={() => props.onLevel(r.level)} aria-current={r.level === level ? 'true' : undefined}>
                <b>{r.level === 0 ? 'Tiles' : `Level ${r.level}`}</b>
                {r.tag && <span className="bu-rung-tag">{r.tag}</span>}
                <span className="bu-rung-meta" title={r.metaTitle}>{r.meta}</span>
              </button>
              {r.circuits.length > 0 && (
                <div className="bu-rung-circuits">
                  {shown.map((x) => (
                    <button key={x.c.key} type="button" className={`bu-chip-c${x.state ? ` is-${x.state}` : ''}${x.isNew ? ' is-new' : ''}`}
                      onClick={() => props.onCircuit(x.c, r.level)} title={x.title} data-testid="bu-circuit" data-kept={x.state === 'made' || x.state === 'dropped' ? String(x.state === 'made') : undefined}>
                      {nf(x.c.length)}
                    </button>
                  ))}
                  {folded > 0 && (
                    <button type="button" className="bu-chip-more" onClick={() => setOpen(new Set([...open, r.level]))}>+{nf(folded)}</button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
