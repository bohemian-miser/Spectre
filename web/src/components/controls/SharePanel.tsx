/**
 * `SharePanel` — copy the deep link and the blog-canonical combination string
 * (DESIGN.md §6.4). The SVG/PNG export buttons are wired in stage 3, when the
 * explorer owns a live `TilingView` reference.
 */

import { useMemo, useState } from 'react';
import {
  formatComboShareString,
  matchingIndicesToCombo,
  type ExplorerState,
} from '../../core';
import { shareUrl } from '../../lib/urlState';

export interface SharePanelProps {
  readonly state: ExplorerState;
  /** Base URL; defaults to `location.href` in the browser. */
  readonly baseUrl?: string;
  readonly route?: string;
  readonly className?: string;
}

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function SharePanel(props: SharePanelProps): JSX.Element {
  const { state, baseUrl, route, className } = props;
  const [copied, setCopied] = useState<string | null>(null);

  const base = baseUrl ?? (typeof window !== 'undefined' ? window.location.href : '');
  const url = useMemo(() => shareUrl(state, base, route), [state, base, route]);

  const combo = useMemo(() => {
    const digits = matchingIndicesToCombo(state.family, state.subset, state.matching);
    return digits === null ? null : formatComboShareString(state.subset, digits);
  }, [state]);

  const flash = (label: string) => (ok: boolean) => setCopied(ok ? label : `${label} failed`);

  return (
    <div className={['share-panel', className ?? ''].filter(Boolean).join(' ')}>
      <button type="button" onClick={() => void copy(url).then(flash('Link copied'))}>
        Copy link
      </button>
      <button
        type="button"
        disabled={combo === null}
        title={
          combo === null
            ? 'This state uses a crossing matching, which combination strings cannot express'
            : combo
        }
        onClick={() => combo && void copy(combo).then(flash('Combination copied'))}
      >
        Copy combination string
      </button>
      <code className="share-url">{url}</code>
      {combo ? <code className="share-combo">{combo}</code> : null}
      {copied ? (
        <span className="share-status" role="status">
          {copied}
        </span>
      ) : null}
    </div>
  );
}

export default SharePanel;
