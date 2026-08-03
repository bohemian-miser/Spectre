/**
 * Beat 6 — "your turn": nine chips, 512 possible rules, no answers given.
 *
 * The console reports only what the reader could work out by looking: how many
 * tile types end up with an odd number of crossings, how much of the search
 * space they have poked at, and a small celebration when a non-empty rule
 * leaves nobody sad. The kernel is never listed — that comes two sections
 * later, and the reader deserves the chance to beat it there.
 *
 * Progress lives in `localStorage` (best effort; private mode just forgets).
 */

import { useEffect, useMemo, useState } from 'react';
import { EdgeClassLegend } from '../../components';
import {
  CANDIDATE_COUNT,
  CLASSES,
  EXPLORED_KEY,
  MATRIX_ROWS,
  SOLVED_KEY,
  edgesOf,
  loadMasks,
  maskDigits,
  maskLabel,
  maskOf,
  oddTypes,
  saveMasks,
  setOf,
  FAMILY,
} from './presets';
import { FigureControls, Readout } from './Figure';
import { PatchFigure } from './PatchFigure';

export function PuzzleConsole(): JSX.Element {
  const [mask, setMask] = useState(0);
  const [explored, setExplored] = useState<ReadonlySet<number>>(() => new Set<number>());
  const [found, setFound] = useState<ReadonlySet<number>>(() => new Set<number>());

  // Restore progress once, on mount (never during render — StrictMode friendly).
  useEffect(() => {
    setExplored(loadMasks(EXPLORED_KEY));
    setFound(loadMasks(SOLVED_KEY));
  }, []);

  const selected = useMemo(() => setOf(mask), [mask]);
  const subset = useMemo(() => edgesOf(mask), [mask]);
  const sad = useMemo(() => oddTypes(selected), [selected]);
  const clean = mask !== 0 && sad.length === 0;

  useEffect(() => {
    setExplored((prev) => {
      if (prev.has(mask)) return prev;
      const next = new Set(prev).add(mask);
      saveMasks(EXPLORED_KEY, next);
      return next;
    });
    if (!clean) return;
    setFound((prev) => {
      if (prev.has(mask)) return prev;
      const next = new Set(prev).add(mask);
      saveMasks(SOLVED_KEY, next);
      return next;
    });
  }, [mask, clean]);

  return (
    <div className="tails-console">
      <FigureControls label="Puzzle controls">
        <EdgeClassLegend
          family={FAMILY}
          selected={selected}
          onToggle={(major) => setMask((m) => m ^ (1 << major))}
          legend="Switch classes on"
        />
        <button type="button" className="tails-button" onClick={() => setMask(0)}>
          Clear
        </button>
        <button
          type="button"
          className="tails-button"
          onClick={() => setMask(maskOf(CLASSES))}
          title="Every class at once"
        >
          All nine
        </button>
      </FigureControls>

      <div className="tails-readouts">
        <Readout label="rule" value={<code>{maskLabel(mask)}</code>} />
        <Readout
          label="tile types with tails"
          value={`${sad.length} of ${MATRIX_ROWS.length}`}
          tone={mask === 0 ? 'neutral' : clean ? 'good' : 'bad'}
        />
        <Readout
          label="subsets explored"
          value={`${explored.size} of ${CANDIDATE_COUNT}`}
        />
        <Readout label="clean rules found" value={found.size} tone={found.size ? 'good' : 'neutral'} />
      </div>

      {mask === 0 ? (
        <p className="tails-note" role="status">
          The empty rule draws nothing and offends no one. That is the coward's answer — switch
          something on.
        </p>
      ) : clean ? (
        <p className="tails-note is-solved" role="status">
          ✦ Every tile pairs up. {maskLabel(mask)} draws clean — nothing dangles anywhere on the
          floor. Found another one yet? Try combining it with this.
        </p>
      ) : (
        <p className="tails-note is-sad" role="status">
          Odd tiles: {sad.join(', ')}. Each of those is a tile with a tail.
        </p>
      )}

      <PatchFigure
        idPrefix="tails-puzzle"
        level={2}
        subset={subset}
        showStats
        height={400}
        pannable
        ariaLabel={`Level 2 patch under rule ${maskDigits(mask)}`}
      />

      <details className="tails-details">
        <summary>Your finds ({found.size})</summary>
        {found.size === 0 ? (
          <p className="muted">Nothing yet. There is at least one. There is more than one.</p>
        ) : (
          <ul className="tails-found">
            {[...found]
              .sort((a, b) => a - b)
              .map((m) => (
                <li key={m}>
                  <button type="button" className="tails-chip" onClick={() => setMask(m)}>
                    {maskDigits(m)}
                  </button>
                </li>
              ))}
          </ul>
        )}
        <button
          type="button"
          className="tails-button"
          onClick={() => {
            setExplored(new Set());
            setFound(new Set());
            saveMasks(EXPLORED_KEY, []);
            saveMasks(SOLVED_KEY, []);
          }}
        >
          Reset progress
        </button>
      </details>
    </div>
  );
}

export default PuzzleConsole;
