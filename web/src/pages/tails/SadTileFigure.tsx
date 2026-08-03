/**
 * Beat 5 — "the sad tile": Theta owns three class-2 seams, so three lines come
 * charging in and one of them has nobody to leave with.
 *
 * The toggle draws the three-way join we are *not* allowing (that would be a
 * train station, not a weave); the default draws the honest pairing, with the
 * third crossing left dangling. Delta under class 1 is the same problem in its
 * purest form: one crossing, no partner, ever.
 */

import { useMemo, useState } from 'react';
import { TileView, type OverlayChord } from '../../components';
import { FAMILY, crossingCount, seamIndicesOfClass } from './presets';
import { Chip, FigureControls, Readout } from './Figure';

const THETA_CLASS = 2;
const DELTA_CLASS = 1;

export function SadTileFigure(): JSX.Element {
  const [showJunction, setShowJunction] = useState(false);

  const thetaSeams = useMemo(() => seamIndicesOfClass('Theta', THETA_CLASS), []);
  const thetaSelected = useMemo(() => new Set([THETA_CLASS]), []);
  const deltaSelected = useMemo(() => new Set([DELTA_CLASS]), []);

  const overlays: readonly OverlayChord[] = useMemo(() => {
    const [a, b, c] = thetaSeams;
    if (a === undefined || b === undefined || c === undefined) return [];
    return showJunction
      ? ([
          [a, b],
          [b, c],
          [c, a],
        ] as const)
      : ([[a, b]] as const);
  }, [thetaSeams, showJunction]);

  const thetaCount = crossingCount('Theta', thetaSelected);
  const deltaCount = crossingCount('Delta', deltaSelected);

  return (
    <div className="tails-duo">
      <div className="tails-duo-cell">
        <FigureControls label="Theta pairing">
          <Chip
            on={showJunction}
            label="show the rejected three-way join"
            onClick={() => setShowJunction((v) => !v)}
          />
        </FigureControls>
        <TileView
          family={FAMILY}
          tileType="Theta"
          size={260}
          selectedEdges={thetaSelected}
          overlays={overlays}
          markOdd
          interaction="hover"
          ariaLabel="Theta with three class-2 crossings"
        />
        <div className="tails-readouts">
          <Readout label="class-2 crossings" value={thetaCount} tone="bad" />
          <Readout label="parity" value={thetaCount % 2 === 0 ? 'even' : 'odd'} tone="bad" />
        </div>
        <p className="muted">
          {showJunction
            ? 'Three chords into one junction: nothing dangles, but the drawing has stopped being a weave. Not the crayon I am holding.'
            : 'One happy pair, one crossing left over. Three is odd. Theta is sad.'}
        </p>
      </div>

      <div className="tails-duo-cell">
        <h4>Maximum sadness</h4>
        <TileView
          family={FAMILY}
          tileType="Delta"
          size={260}
          selectedEdges={deltaSelected}
          markOdd
          interaction="hover"
          ariaLabel="Delta with a single class-1 crossing"
        />
        <div className="tails-readouts">
          <Readout label="class-1 crossings" value={deltaCount} tone="bad" />
          <Readout label="pairs possible" value={0} tone="bad" />
        </div>
        <p className="muted">
          Delta owns exactly one 1-seam, so a line barges in and simply stops. It does not even get
          a junction to refuse.
        </p>
      </div>
    </div>
  );
}

export default SadTileFigure;
