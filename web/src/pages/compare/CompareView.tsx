/**
 * Two circuits side by side, named from outside (`refs.ts`): each drawn,
 * their Fourier terms compared (`corners/Compare.tsx`), and their readings
 * lined up level by level (`ReadingsTable.tsx`). The Compare page is this
 * view on the two circuits in its URL; other pages link to it or embed it.
 */

import { useEffect, useRef, useState } from 'react';
import type { TileTypeId } from '../../core';
import { TermsCompare } from '../corners/Compare';
import type { CircuitInfo } from '../harmonics/harmonicsJob';
import { explorerCircuitHref } from '../shapes/explorerLink';
import { createCompareClient, type CompareResult } from './compareJob';
import { compareHref, formatRef, type CircuitRef } from './refs';
import { ReadingsTable } from './ReadingsTable';
import '../../styles/corners.css';
import '../../styles/shapes.css';
import '../../styles/harmonics.css';

const nf = (n: number) => n.toLocaleString('en-US');

function glyphPath(outline: Float64Array, size: number): string {
  const n = outline.length / 2;
  if (!n) return '';
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < n; i++) {
    cx += outline[2 * i];
    cy += outline[2 * i + 1];
  }
  cx /= n;
  cy /= n;
  let reach = 0;
  for (let i = 0; i < n; i++) reach = Math.max(reach, Math.abs(outline[2 * i] - cx), Math.abs(outline[2 * i + 1] - cy));
  const k = (size * 0.92) / 2 / (reach || 1);
  let d = '';
  for (let i = 0; i < n; i++) d += `${i ? 'L' : 'M'}${((outline[2 * i] - cx) * k).toFixed(1)} ${(-(outline[2 * i + 1] - cy) * k).toFixed(1)}`;
  return `${d}Z`;
}

export function CircuitGlyph(props: { circuit: CircuitInfo; size: number; colour: string; label: string }): JSX.Element {
  const { size } = props;
  return (
    <svg className="shapes-glyph" width={size} height={size} viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`} role="img" aria-label={props.label}>
      <path d={glyphPath(props.circuit.outlines[0] ?? new Float64Array(0), size)} fill="none" stroke={props.colour} strokeWidth={1.2} strokeLinejoin="round" />
    </svg>
  );
}

export const describeCircuit = (c: CircuitInfo) => `${nf(c.length)} tiles, born at level ${c.level} in a ${c.type}, through children ${c.family}`;

function explorerHref(base: string, ref: CircuitRef, c: CircuitInfo): string {
  return explorerCircuitHref(base, {
    family: 'hex',
    subset: ref.subset,
    combo: ref.combo,
    type: c.type as TileTypeId,
    level: c.level,
    path: c.first.path.map(([type, pos]) => ({ type: type as TileTypeId, pos })),
    chord: [
      { x: c.first.chord[0], y: c.first.chord[1] },
      { x: c.first.chord[2], y: c.first.chord[3] },
    ],
  });
}

export function CompareView(props: { a: CircuitRef; b: CircuitRef; base?: string; forceSync?: boolean }): JSX.Element {
  const { a, b } = props;
  const base = props.base ?? import.meta.env.BASE_URL;
  const client = useRef(createCompareClient({ forceSync: props.forceSync }));
  const [result, setResult] = useState<CompareResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const key = `${formatRef(a)} ${formatRef(b)}`;
  useEffect(() => {
    let on = true;
    setResult(null);
    setError(null);
    client.current
      .run(a, b)
      .then((r) => on && setResult(r))
      .catch((e: unknown) => on && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      on = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => () => client.current.dispose(), []);

  if (error) return <p className="shapes-note">Could not compute: {error}</p>;
  if (!result) return <p className="shapes-note" data-testid="compare-loading">Computing {formatRef(a)} and {formatRef(b)}…</p>;
  const A = result.a.info;
  const B = result.b.info;
  const sameCombo = a.subset.join('') === b.subset.join('') && a.combo === b.combo;
  const agree = result.rows.filter((r) => r.state === 'same').length;
  const compared = result.rows.filter((r) => r.state === 'same' || r.state === 'differs').length;
  return (
    <div className="compare-view" data-testid="compare-view">
      <h2 data-testid="compare-title">
        A: {nf(A.length)} tiles at level {A.level} of {formatRef(a).split(':')[0]}; B: {nf(B.length)} tiles at level {B.level}
        {sameCombo ? '' : ` of ${formatRef(b).split(':')[0]}`}
      </h2>
      <p className="shapes-note" data-testid="compare-summary">
        B&apos;s level k + {result.offset} is lined up with A&apos;s level k: the same at {agree} of the {compared} levels compared
        {compared ? `, ${result.rows.filter((r) => r.state === 'same').map((r) => r.level).join(', ') || 'none'}` : ''}.{' '}
        <a href={compareHref(base, b, a)}>Swap</a>.
      </p>
      <div className="harm-pair">
        <figure>
          <CircuitGlyph circuit={A} size={220} colour="var(--k1)" label={describeCircuit(A)} />
          <figcaption>
            A: {describeCircuit(A)}; drawn at level {A.drawnFrom}. <a href={explorerHref(base, a, A)}>Explorer</a>
          </figcaption>
        </figure>
        <figure>
          <CircuitGlyph circuit={B} size={220} colour="var(--k2)" label={describeCircuit(B)} />
          <figcaption>
            B: {describeCircuit(B)}; drawn at level {B.drawnFrom}. <a href={explorerHref(base, b, B)}>Explorer</a>
          </figcaption>
        </figure>
      </div>
      <h3>Fourier terms</h3>
      <p className="shapes-note">
        Each circuit&apos;s loop is its tiles, or the ends of its arcs at the finest level drawn ({A.drawnFrom} and {B.drawnFrom}), sampled evenly, about its
        centroid over its radius of gyration; B is turned, restarted and if need be mirrored onto A.
      </p>
      <TermsCompare
        a={{ loop: { xy: result.a.loop.xy, n: result.a.loop.n }, rg: result.a.loop.rg, length: A.length, label: `A, ${nf(A.length)} L${A.level}` }}
        b={{ loop: { xy: result.b.loop.xy, n: result.b.loop.n }, rg: result.b.loop.rg, length: B.length, label: `B, ${nf(B.length)} L${B.level}` }}
      />
      <h3>Readings</h3>
      <ReadingsTable b={B} a={A} rows={result.rows} nameA="of A" testId="compare-readings" />
    </div>
  );
}
