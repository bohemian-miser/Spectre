/**
 * Beat 1 — "single-tile edge hover": one lone Spectre, its fourteen physical
 * edges, and the six *seams* those edges group into.
 *
 * Hovering either the tile or a row of the tally lights the same class on both,
 * which is the whole point: a seam is one handshake, however many knuckles.
 */

import { useMemo, useState } from 'react';
import { TileView, type EdgeRef } from '../../components';
import { MATRIX_ROWS, seamTally, type SeamInfo } from './presets';
import { FAMILY } from './presets';
import { FigureControls } from './Figure';
import type { TileTypeId } from '../../core';

export function TileAnatomyFigure(): JSX.Element {
  const [type, setType] = useState<TileTypeId>('Delta');
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [showLabels, setShowLabels] = useState(true);

  const seams = useMemo(() => seamTally(type), [type]);
  const hovered: SeamInfo | undefined = seams.find((s) => s.id === hoverId);
  const highlightMajors = useMemo(
    () => (hovered ? new Set([hovered.major]) : undefined),
    [hovered],
  );

  return (
    <div className="tails-split">
      <div className="tails-split-main">
        <FigureControls label="Tile anatomy controls">
          <label className="tails-field">
            <span>Tile</span>
            <select
              aria-label="Tile type"
              value={type}
              onChange={(e) => {
                setType(e.target.value as TileTypeId);
                setHoverId(null);
              }}
            >
              {MATRIX_ROWS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="tails-field tails-field-check">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => setShowLabels(e.target.checked)}
            />
            <span>edge labels</span>
          </label>
        </FigureControls>

        <TileView
          family={FAMILY}
          tileType={type}
          size={300}
          showEdgeLabels={showLabels}
          highlightMajors={highlightMajors}
          interaction="hover"
          onEdgeHover={(edge: EdgeRef | null) => setHoverId(edge?.metaEdgeId ?? null)}
          ariaLabel={`${type} tile — hover an edge to light its seam`}
        />
      </div>

      <aside className="tails-split-aside">
        <h4>
          {type}: {seams.length} seams, {seams.reduce((n, s) => n + s.labels.length, 0)} physical
          edges
        </h4>
        <ul className="tails-seam-list">
          {seams.map((seam) => (
            <li
              key={seam.id}
              className={['tails-seam', hoverId === seam.id ? 'is-hovered' : '']
                .filter(Boolean)
                .join(' ')}
              data-seam-id={seam.id}
              onPointerEnter={() => setHoverId(seam.id)}
              onPointerLeave={() => setHoverId(null)}
            >
              <span className="tails-seam-swatch" style={{ background: seam.color }} />
              <strong>{seam.name}</strong>
              <em>{seam.labels.join(' · ')}</em>
            </li>
          ))}
        </ul>
        <p className="muted">
          {hovered
            ? `Seam ${hovered.name}: ${hovered.labels.length} physical edge${
                hovered.labels.length === 1 ? '' : 's'
              } (${hovered.labels.join(', ')}) — one handshake with one neighbour.`
            : 'Hover an edge (or a row) to see the seam it belongs to.'}
        </p>
      </aside>
    </div>
  );
}

export default TileAnatomyFigure;
