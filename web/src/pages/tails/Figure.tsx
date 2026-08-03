/**
 * The article's figure frame: a captioned `<figure>` with an optional control
 * strip. Every interactive beat of the explainer sits in one of these, so the
 * page has a single, consistent "here is something to play with" affordance.
 */

import type { ReactNode } from 'react';

export interface FigureProps {
  /** Anchor id, e.g. `fig-seam`. */
  readonly id: string;
  readonly title: string;
  /** Short instruction: what the reader should do with this figure. */
  readonly hint?: ReactNode;
  /** Long-form takeaway, rendered under the figure. */
  readonly caption?: ReactNode;
  /** Break out of the prose column (patches, galleries, the matrix). */
  readonly wide?: boolean;
  readonly children: ReactNode;
  readonly className?: string;
}

export function Figure(props: FigureProps): JSX.Element {
  const { id, title, hint, caption, wide = false, children, className } = props;
  return (
    <figure
      id={id}
      className={['tails-figure', wide ? 'is-wide' : '', className ?? '']
        .filter(Boolean)
        .join(' ')}
      aria-labelledby={`${id}-title`}
    >
      <div className="tails-figure-head">
        <h3 id={`${id}-title`}>{title}</h3>
        {hint ? <p className="tails-figure-hint">{hint}</p> : null}
      </div>
      <div className="tails-figure-body">{children}</div>
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}

/** A horizontal strip of controls above or beside a figure's canvas. */
export function FigureControls(props: {
  readonly children: ReactNode;
  readonly label?: string;
  readonly className?: string;
}): JSX.Element {
  return (
    <div
      className={['tails-controls', props.className ?? ''].filter(Boolean).join(' ')}
      role="group"
      aria-label={props.label}
    >
      {props.children}
    </div>
  );
}

/** A labelled number a figure keeps up to date (crossings, circuits, tails…). */
export function Readout(props: {
  readonly label: string;
  readonly value: ReactNode;
  readonly tone?: 'neutral' | 'good' | 'bad';
}): JSX.Element {
  return (
    <div className={`tails-readout is-${props.tone ?? 'neutral'}`}>
      <span className="tails-readout-label">{props.label}</span>
      <strong className="tails-readout-value">{props.value}</strong>
    </div>
  );
}

/** Chip-style toggle used by the puzzle console, presets and profile pickers. */
export function Chip(props: {
  readonly on?: boolean;
  readonly label: ReactNode;
  readonly title?: string;
  readonly swatch?: string;
  readonly disabled?: boolean;
  onClick(): void;
}): JSX.Element {
  return (
    <button
      type="button"
      className={['tails-chip', props.on ? 'is-on' : ''].filter(Boolean).join(' ')}
      aria-pressed={props.on ?? false}
      title={props.title}
      disabled={props.disabled}
      onClick={props.onClick}
    >
      {props.swatch ? (
        <span className="tails-chip-swatch" style={{ background: props.swatch }} />
      ) : null}
      {props.label}
    </button>
  );
}

export default Figure;
