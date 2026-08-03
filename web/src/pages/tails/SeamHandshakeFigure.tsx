/**
 * Beat 2 — "seam handshake": a Theta glued to a neighbour along one seam, with
 * the physical labels shown from both sides (`2.0A 2.1A 2.2A` against
 * `-2.2A -2.1A -2.0A`) and the single crossing point both tiles agree on.
 *
 * `SeamView` computes that point independently from each tile's contract; the
 * error readout below is the article's proof that the handshake really closes.
 */

import { useMemo, useState } from 'react';
import { SeamView } from '../../components';
import { poseSeam } from '../../lib/seam';
import { edgeClassColor } from '../../lib/palette';
import { classesOf, FAMILY, seamTally } from './presets';
import { Chip, FigureControls } from './Figure';

const TILE_A = 'Theta' as const;

export function SeamHandshakeFigure(): JSX.Element {
  const majors = useMemo(() => classesOf(TILE_A), []);
  const [major, setMajor] = useState(2);

  const pose = useMemo(() => poseSeam(FAMILY, TILE_A, major), [major]);
  const seamsA = useMemo(
    () => seamTally(TILE_A).filter((s) => s.major === major),
    [major],
  );
  const labelsB = pose ? pose.seamB.labels.map((l) => l.raw) : [];

  return (
    <div className="tails-split">
      <div className="tails-split-main">
        <FigureControls label="Seam class">
          {majors.map((m) => (
            <Chip
              key={m}
              on={m === major}
              label={`class ${m}`}
              swatch={edgeClassColor(m)}
              title={`Show Theta's class-${m} seam`}
              onClick={() => setMajor(m)}
            />
          ))}
        </FigureControls>

        <SeamView
          family={FAMILY}
          tileA={TILE_A}
          seamMajor={major}
          showLabels
          showSharedDot
          height={300}
        />
      </div>

      <aside className="tails-split-aside">
        <h4>One handshake, {seamsA[0]?.labels.length ?? 0} knuckles</h4>
        {pose ? (
          <>
            <p>
              <strong>{pose.typeA}</strong> offers{' '}
              <code>{seamsA.map((s) => s.labels.join(' ')).join('  /  ')}</code>.
            </p>
            <p>
              <strong>{pose.typeB}</strong> answers with <code>{labelsB.join(' ')}</code> — the same
              edges, walked the other way.
            </p>
            <p className="muted">
              Both tiles place their crossing point from their own contract. Distance between the
              two answers: <code>{pose.sharedDotError.toExponential(1)}</code> — they meet.
            </p>
            {major === 0 ? (
              <p className="tails-note">
                Class 0 is the loner: it only ever glues to another class 0, so its crossing must
                sit at the seam's own centre of symmetry.
              </p>
            ) : null}
          </>
        ) : (
          <p className="muted">Theta has no class-{major} seam.</p>
        )}
      </aside>
    </div>
  );
}

export default SeamHandshakeFigure;
