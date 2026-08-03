/**
 * Beat 7 — "fingerprints": the way the answers were actually found, before any
 * fancy words. Switch one class on, write down which tile types come out odd,
 * repeat. Two classes with the *same* fingerprint cancel each other exactly.
 *
 * The figure lets the reader hold two classes side by side and watch the
 * combined verdict — 1 and 5 famously wipe each other out.
 */

import { useMemo, useState } from 'react';
import { edgeClassColor } from '../../lib/palette';
import { CLASSES, MATRIX_ROWS, fingerprint, oddTypes } from './presets';
import { Chip, FigureControls } from './Figure';

function sameFingerprint(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((t, i) => t === b[i]);
}

function FingerprintRow(props: {
  readonly label: string;
  readonly types: readonly string[];
  readonly color?: string;
}): JSX.Element {
  return (
    <div className="tails-fingerprint" data-fingerprint={props.types.join(',')}>
      <span className="tails-fingerprint-label">
        {props.color ? (
          <span className="tails-chip-swatch" style={{ background: props.color }} />
        ) : null}
        {props.label}
      </span>
      <span className="tails-fingerprint-types">
        {MATRIX_ROWS.map((type) => (
          <span
            key={type}
            className={['tails-badge', props.types.includes(type) ? 'is-odd' : 'is-even'].join(' ')}
          >
            {type}
          </span>
        ))}
      </span>
    </div>
  );
}

export function FingerprintFigure(): JSX.Element {
  const [a, setA] = useState(1);
  const [b, setB] = useState<number | null>(5);

  const fpA = useMemo(() => fingerprint(a), [a]);
  const fpB = useMemo(() => (b === null ? [] : fingerprint(b)), [b]);
  const combined = useMemo(
    () => oddTypes(new Set(b === null ? [a] : [a, b])),
    [a, b],
  );
  const twins = b !== null && sameFingerprint(fpA, fpB);

  return (
    <div className="tails-fingerprints">
      <FigureControls label="First class">
        <span className="tails-controls-label">class</span>
        {CLASSES.map((m) => (
          <Chip
            key={m}
            on={m === a}
            label={String(m)}
            swatch={edgeClassColor(m)}
            title={`Fingerprint of class ${m}`}
            onClick={() => setA(m)}
          />
        ))}
      </FigureControls>

      <FigureControls label="Second class">
        <span className="tails-controls-label">and</span>
        <Chip on={b === null} label="nothing" onClick={() => setB(null)} />
        {CLASSES.map((m) => (
          <Chip
            key={m}
            on={m === b}
            label={String(m)}
            swatch={edgeClassColor(m)}
            title={`Combine with class ${m}`}
            onClick={() => setB(m)}
          />
        ))}
      </FigureControls>

      <FingerprintRow label={`class ${a}`} types={fpA} color={edgeClassColor(a)} />
      {b === null ? null : (
        <FingerprintRow label={`class ${b}`} types={fpB} color={edgeClassColor(b)} />
      )}
      <FingerprintRow label={b === null ? 'verdict' : `both — {${a}, ${b}}`} types={combined} />

      <p className={['tails-note', combined.length === 0 ? 'is-solved' : 'is-sad'].join(' ')} role="status">
        {combined.length === 0
          ? twins
            ? `Identical fingerprints: every tile class ${a} was going to upset gets upset twice by class ${b}, which is to say, not at all.`
            : 'Nothing left odd — every tile pairs up under this pair of classes.'
          : `${combined.length} tile type${combined.length === 1 ? '' : 's'} still odd: ${combined.join(', ')}.`}
      </p>
    </div>
  );
}

export default FingerprintFigure;
