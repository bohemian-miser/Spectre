/**
 * Detail panel for one configuration: the numbers at both depths, its unique
 * circuit lengths, the complete tail-length census, and links that rebuild the
 * exact scene in the Explorer.
 */

import {
  LEVEL_LABEL,
  formatCount,
  formatRatio,
  shareString,
  type ConfigRow,
  type LevelKey,
} from './statsData';
import { CircuitLengthSpectrum, TailHistogram } from './ConfigFigures';
import { EXPLORER_LINK_LEVELS, explorerHref, isHeavyLevel } from './explorerLink';
import { selectionColor } from './selectionTheme';

/** "Open in Explorer" — the same scene, rebuilt from the combination string. */
export function ExplorerLinks(props: {
  readonly selection: string;
  readonly combo: string;
  readonly base: string;
  readonly levels?: readonly number[];
}): JSX.Element {
  const { selection, combo, base, levels = EXPLORER_LINK_LEVELS } = props;
  return (
    <p className="stats-explorer-links">
      <span className="muted">Open in Explorer at level</span>{' '}
      {levels.map((level) => (
        <a
          key={level}
          className="stats-explorer-link"
          href={explorerHref(selection, combo, level, base)}
          data-level={level}
          title={
            isHeavyLevel(level)
              ? `Level ${level} is ~270 000 tiles — expect a few seconds of work`
              : `Level ${level}`
          }
        >
          {level}
          {isHeavyLevel(level) ? <span aria-hidden="true"> ⚠</span> : null}
        </a>
      ))}
    </p>
  );
}

function StatTile(props: {
  readonly label: string;
  readonly value: number;
  readonly other: number;
  readonly otherLabel: string;
  readonly note?: string;
}): JSX.Element {
  return (
    <div className="stats-tile">
      <dt>{props.label}</dt>
      <dd>{formatCount(props.value)}</dd>
      <dd className="stats-tile-sub">
        {props.otherLabel}: {formatCount(props.other)}
        {props.note ? ` · ${props.note}` : ''}
      </dd>
    </div>
  );
}

export interface ConfigDetailProps {
  readonly row: ConfigRow;
  readonly level: LevelKey;
  readonly base: string;
  readonly onClose: () => void;
}

export function ConfigDetail(props: ConfigDetailProps): JSX.Element {
  const { row, level, base, onClose } = props;
  const active = level === 'lvl4' ? row.lvl4 : row.lvl6;
  const other = level === 'lvl4' ? row.lvl6 : row.lvl4;
  const otherLabel = level === 'lvl4' ? LEVEL_LABEL.lvl6 : LEVEL_LABEL.lvl4;
  const isNew = new Set(row.newLengthsAtLvl6);

  return (
    <section className="stats-detail" aria-label={`Detail for ${shareString(row)}`}>
      <header className="stats-detail-head">
        <div>
          <h3>
            <span
              className="stats-sel-dot"
              style={{ background: selectionColor(row.selection) }}
              aria-hidden="true"
            />
            <code>{shareString(row)}</code>
          </h3>
          <p className="muted">
            Edge selection {row.selection}, combo {row.combo} · showing {LEVEL_LABEL[level]}
            {row.circuitFree ? ' · circuit-free (space-filling-curve candidate)' : ''}
          </p>
        </div>
        <button type="button" className="stats-close" onClick={onClose} aria-label="Close detail">
          ✕
        </button>
      </header>

      <dl className="stats-tiles">
        <StatTile
          label="Circuits"
          value={active.circuits}
          other={other.circuits}
          otherLabel={otherLabel}
          note={row.circuitRatio ? `${formatRatio(row.circuitRatio)} level 4 → 6` : undefined}
        />
        <StatTile
          label="Tails"
          value={active.tails}
          other={other.tails}
          otherLabel={otherLabel}
          note={row.tailRatio ? formatRatio(row.tailRatio) : undefined}
        />
        <StatTile
          label="Longest circuit"
          value={active.maxCircuit}
          other={other.maxCircuit}
          otherLabel={otherLabel}
          note="segments"
        />
        <StatTile
          label="Longest tail"
          value={active.maxTail}
          other={other.maxTail}
          otherLabel={otherLabel}
          note="segments"
        />
      </dl>

      <h4>Circuit lengths</h4>
      {row.lvl6.circuitLengths.length === 0 ? (
        <p className="stats-empty">
          No circuits at either depth. Under {row.selection} every strand stays an open path for as
          far as the analysis goes — a space-filling-curve <em>candidate</em>, on finite-depth
          evidence.
        </p>
      ) : (
        <>
          <div className="length-chips stats-length-chips">
            {row.lvl6.circuitLengths.map((len) => (
              <span
                key={len}
                className={`length-chip ${isNew.has(len) ? 'is-new' : ''}`}
                title={isNew.has(len) ? 'new at level 6' : 'present at both depths'}
              >
                {formatCount(len)}
              </span>
            ))}
          </div>
          <p className="muted stats-note">
            {row.lvl4.circuitLengths.length} distinct length
            {row.lvl4.circuitLengths.length === 1 ? '' : 's'} at level 4,{' '}
            {row.lvl6.circuitLengths.length} at level 6
            {row.newLengthsAtLvl6.length > 0
              ? ` (${row.newLengthsAtLvl6.length} highlighted as new)`
              : ' — an identical, frozen set'}
            . These are <em>unique</em> lengths: how many circuits share a length is not recorded in
            the dataset.
          </p>
        </>
      )}
      <CircuitLengthSpectrum row={row} />

      <h4>Tail lengths</h4>
      <p className="muted stats-note">
        A complete census — the counts sum to the tail total. {LEVEL_LABEL[level]}:{' '}
        {formatCount(active.tails)} tails across {active.tailLengths.length} distinct length
        {active.tailLengths.length === 1 ? '' : 's'}.
      </p>
      <TailHistogram bins={active.tailLengths} label={`${shareString(row)} at ${LEVEL_LABEL[level]}`} />
      <details className="stats-more">
        <summary>Tail histogram at {otherLabel}</summary>
        <TailHistogram bins={other.tailLengths} label={`${shareString(row)} at ${otherLabel}`} />
      </details>

      <ExplorerLinks selection={row.selection} combo={row.combo} base={base} />
    </section>
  );
}
