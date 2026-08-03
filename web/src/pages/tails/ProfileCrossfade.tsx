/**
 * Beat 11 — "circuits vs. wanderers": one rule, one patch, two matchmaking
 * profiles. Profile A dissolves into a lace of small circuits; profile B — the
 * Explorer's `2578-0100101100` — collapses into a line that refuses to die.
 *
 * Both scenes are mounted and crossfaded, so the toggle is a genuine A/B of the
 * same floor rather than a reload. Counts come from the same analysis the
 * Explorer runs (cached by request signature, so the visible layer and the
 * readouts never disagree).
 */

import { useMemo, useState } from 'react';
import { useCircuitAnalysis } from '../../hooks/useCircuitAnalysis';
import { FAMILY, PROFILES, explorerHref, matchingRecord } from './presets';
import { Chip, FigureControls, Readout } from './Figure';
import { PatchFigure } from './PatchFigure';

function longest(summary: readonly { length: number; count: number }[]): number {
  return summary.reduce((m, s) => Math.max(m, s.length), 0);
}

export function ProfileCrossfade(): JSX.Element {
  const [activeId, setActiveId] = useState(PROFILES[0].id);
  const [level, setLevel] = useState(3);

  const records = useMemo(
    () => PROFILES.map((p) => matchingRecord(p.subset, p.combo)),
    [],
  );
  const activeIndex = Math.max(
    0,
    PROFILES.findIndex((p) => p.id === activeId),
  );
  const active = PROFILES[activeIndex];

  const analysis = useCircuitAnalysis(
    {
      family: FAMILY,
      rootTile: 'Delta',
      level,
      subset: [...active.subset],
      matchingIndexByType: records[activeIndex],
    },
    { workerMinLevel: 3 },
  );
  const result = analysis.result;

  return (
    <div className="tails-crossfade-figure">
      <FigureControls label="Matching profile">
        {PROFILES.map((p) => (
          <Chip key={p.id} on={p.id === activeId} label={p.label} onClick={() => setActiveId(p.id)} />
        ))}
        <span className="tails-stepper">
          <button
            type="button"
            aria-label="Smaller patch"
            disabled={level <= 2}
            onClick={() => setLevel((l) => Math.max(2, l - 1))}
          >
            −
          </button>
          <strong data-testid="crossfade-level">level {level}</strong>
          <button
            type="button"
            aria-label="Bigger patch"
            disabled={level >= 4}
            onClick={() => setLevel((l) => Math.min(4, l + 1))}
          >
            +
          </button>
        </span>
      </FigureControls>

      <div className="tails-crossfade" style={{ height: 440 }}>
        {PROFILES.map((p, i) => (
          <div
            key={p.id}
            className={['tails-crossfade-layer', p.id === activeId ? 'is-active' : ''].join(' ')}
            aria-hidden={p.id === activeId ? undefined : true}
          >
            <PatchFigure
              idPrefix={`tails-profile-${p.id}`}
              level={level}
              subset={p.subset}
              matchingIndexByType={records[i]}
              showDots={false}
              markOddTiles={false}
              tailEndMarkers={level <= 3}
              showOutlines={level <= 3}
              strokeWidth={level >= 4 ? 0.16 : 0.12}
              height="100%"
              pannable
              showZoomControls={p.id === activeId}
            />
          </div>
        ))}
      </div>

      <div className="tails-readouts">
        <Readout label="profile" value={<code>{`${active.subset.join('')}-${active.combo}`}</code>} />
        <Readout
          label="circuits"
          value={result ? result.circuits.length.toLocaleString() : '…'}
          tone={result && result.circuits.length > 0 ? 'good' : 'bad'}
        />
        <Readout
          label="wanderers"
          value={result ? result.tails.length.toLocaleString() : '…'}
          tone="neutral"
        />
        <Readout
          label="longest circuit"
          value={result ? longest(result.circuitSummary).toLocaleString() : '…'}
        />
        <Readout
          label="longest wanderer"
          value={result ? longest(result.tailSummary).toLocaleString() : '…'}
          tone="bad"
        />
      </div>

      <p className="muted">
        {active.blurb}. Same rule, same tiles, same crossings — only the matchmaking differs.{' '}
        <a href={explorerHref(active.subset, { level, combo: active.combo })}>
          Open this exact scene in the Explorer
        </a>
        .
      </p>
    </div>
  );
}

export default ProfileCrossfade;
