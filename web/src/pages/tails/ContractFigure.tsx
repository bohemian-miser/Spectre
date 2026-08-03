/**
 * Beat 3 — "edge contract slider": drag the crossing point anywhere along a
 * seam and both tiles follow it, because the `−` side measures the same
 * contract from the other end. Class 0 glues to itself, so its handle is
 * pinned to the seam's centre of symmetry.
 *
 * The shared-dot error readout stays at zero throughout: that is the contract
 * rule doing its job, live.
 */

import { useMemo, useState } from 'react';
import { SeamView, TileView } from '../../components';
import { poseSeam } from '../../lib/seam';
import { edgeClassColor } from '../../lib/palette';
import type { EdgeContracts } from '../../core';
import {
  FAMILY,
  contractAt,
  crossingCount,
  hostOf,
  pairableUnder,
  seamMinorCount,
} from './presets';
import { Chip, FigureControls, Readout } from './Figure';

const CLASSES_ON_OFFER = [2, 5, 7, 0];

export function ContractFigure(): JSX.Element {
  const [major, setMajor] = useState(2);
  const [u, setU] = useState(0.5);

  const minorCount = useMemo(() => seamMinorCount(major), [major]);
  const locked = major === 0;
  const position = locked ? minorCount / 2 : Math.min(u, minorCount);

  const contracts: EdgeContracts = useMemo(
    () => ({ [major]: contractAt(position, minorCount) }),
    [major, position, minorCount],
  );

  const host = useMemo(() => hostOf(major), [major]);
  const demo = useMemo(() => pairableUnder(major), [major]);
  const selected = useMemo(() => new Set([major]), [major]);
  const pose = useMemo(() => poseSeam(FAMILY, host, major, { contracts }), [host, major, contracts]);
  const contract = contractAt(position, minorCount);

  return (
    <div className="tails-split">
      <div className="tails-split-main">
        <FigureControls label="Contract controls">
          {CLASSES_ON_OFFER.map((m) => (
            <Chip
              key={m}
              on={m === major}
              label={`class ${m}`}
              swatch={edgeClassColor(m)}
              onClick={() => {
                setMajor(m);
                setU(0.5);
              }}
            />
          ))}
          <label className="tails-field tails-slider">
            <span>crossing at</span>
            <input
              type="range"
              min={0}
              max={minorCount}
              step={0.05}
              value={position}
              disabled={locked}
              aria-label="Crossing point along the seam"
              title={
                locked
                  ? '0 meets itself — symmetric contracts only'
                  : 'Slide the crossing point along the seam'
              }
              onChange={(e) => setU(Number.parseFloat(e.target.value))}
            />
            <code>
              {contract.minor}.{Math.round(contract.t * 100)}%
            </code>
          </label>
        </FigureControls>

        <SeamView
          key={major}
          family={FAMILY}
          tileA={host}
          seamMajor={major}
          contracts={contracts}
          showLabels
          showSharedDot
          height={280}
        />
      </div>

      <aside className="tails-split-aside">
        <h4>Wherever you like — as long as both sides agree</h4>
        {locked ? (
          <p className="tails-note" role="status">
            0 meets itself — symmetric contracts only. The handle is pinned to the seam's centre;
            anywhere else and the two copies of the rule would miss each other.
          </p>
        ) : (
          <p className="muted">
            The seam is {minorCount} physical edge{minorCount === 1 ? '' : 's'} long, so the contract
            lives anywhere in <code>[0, {minorCount}]</code>. The <code>−</code> side measures the
            same distance from the other end, which is what makes the two dots coincide.
          </p>
        )}
        <div className="tails-readouts">
          <Readout label="seam" value={`${host} · class ${major}`} />
          <Readout
            label="shared-dot error"
            value={pose ? pose.sharedDotError.toExponential(1) : '—'}
            tone={pose && pose.sharedDotError < 1e-6 ? 'good' : 'bad'}
          />
        </div>
        <div className="tails-inline-tile">
          <TileView
            family={FAMILY}
            tileType={demo}
            size={150}
            contracts={contracts}
            selectedEdges={selected}
            matchingIndex={0}
            markOdd
            ariaLabel={`${demo} under class ${major}`}
          />
          <p className="muted">
            {demo} carries {crossingCount(demo, selected)} class-{major} crossing
            {crossingCount(demo, selected) === 1 ? '' : 's'}
            {crossingCount(demo, selected) % 2 === 0
              ? '; its stroke re-routes as the contract moves.'
              : ' — odd, so there is nothing to pair it with.'}
          </p>
        </div>
      </aside>
    </div>
  );
}

export default ContractFigure;
