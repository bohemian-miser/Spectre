/**
 * Beat 10 — "the matchmaker": a valid rule guarantees every tile an *even*
 * number of crossings, but says nothing about which crossing pairs with which.
 *
 * Two editors, two tiles with four crossings each, three moods apiece. Drag
 * from one dot to another, or scrub the slider; the ghost strokes show the
 * options not taken.
 */

import { useMemo, useState } from 'react';
import { MatchingSlider } from '../../components';
import { tileMatchingInfo } from '../../lib/matchingModel';
import type { TileTypeId } from '../../core';
import { FAMILY, maskLabel, maskOf } from './presets';
import { Readout } from './Figure';

interface EditorProps {
  readonly tileType: TileTypeId;
  readonly edges: readonly number[];
}

function Editor({ tileType, edges }: EditorProps): JSX.Element {
  const selected = useMemo(() => new Set(edges), [edges]);
  const info = useMemo(
    () => tileMatchingInfo(FAMILY, tileType, selected),
    [tileType, selected],
  );
  const [value, setValue] = useState(0);

  return (
    <div className="tails-duo-cell">
      <h4>
        {tileType} under {maskLabel(maskOf(edges))}
      </h4>
      <MatchingSlider
        family={FAMILY}
        tileType={tileType}
        selectedEdges={selected}
        value={value}
        onChange={setValue}
        ghostMatchings
        tileSize={200}
      />
      <div className="tails-readouts">
        <Readout label="crossings" value={info.pointCount} tone="good" />
        <Readout label="matchings" value={info.total} />
        <Readout label="non-crossing" value={info.nonCrossing.length} />
      </div>
    </div>
  );
}

export function MatchmakerFigure(): JSX.Element {
  return (
    <div className="tails-duo">
      <Editor tileType="Psi" edges={[1, 5]} />
      <Editor tileType="Theta" edges={[2, 5, 7, 8]} />
    </div>
  );
}

export default MatchmakerFigure;
