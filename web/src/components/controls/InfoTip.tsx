/**
 * `InfoTip` — the little ⓘ next to a control, holding the paragraph that used
 * to sit under it.
 *
 * The Explorer's sidebar had grown longer in prose than in controls, which
 * pushed the controls themselves off the screen. The explanations are still
 * worth having — several of them are the only place a non-obvious behaviour is
 * written down — so they move in here: one click away, next to the thing they
 * describe, and out of the way until asked for.
 *
 * A `<details>` is doing the work rather than a hover tooltip: it is keyboard-
 * and touch-reachable for free, it needs no positioning logic, and it cannot
 * end up open with the pointer somewhere else.
 */

import type { ReactNode } from 'react';

export interface InfoTipProps {
  /** What the tip is about, for screen readers: "about Auto-follow". */
  readonly label: string;
  readonly children: ReactNode;
  readonly className?: string;
}

export function InfoTip(props: InfoTipProps): JSX.Element {
  const { label, children, className } = props;
  return (
    <details className={['info-tip', className ?? ''].filter(Boolean).join(' ')}>
      <summary aria-label={`About ${label}`} title={`About ${label}`}>
        <span aria-hidden="true">i</span>
      </summary>
      <div className="info-tip-body" role="note">
        {children}
      </div>
    </details>
  );
}

export default InfoTip;
