/**
 * `SharePanel` — copy the deep link and the blog-canonical combination string,
 * and download the current scene as SVG / PNG (DESIGN.md §6.4).
 *
 * The download buttons are *optional callbacks*: only a page that owns a live
 * renderer can serialize one, so the widget stays free of DOM plumbing and
 * simply hides the buttons when no handler is supplied (added in stage 3).
 */

import { useMemo, useState, type ReactNode } from 'react';
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
  /** Serialize the live scene to SVG. Button hidden when omitted. */
  onDownloadSvg?(): void | Promise<void>;
  /** Rasterise the live scene to PNG. Button hidden when omitted. */
  onDownloadPng?(): void | Promise<void>;
  /** Disable both downloads (e.g. the canvas renderer is active). */
  readonly downloadsDisabled?: boolean;
  readonly downloadsHint?: string;
  /** Extra rows (the explorer adds its "include camera" checkbox here). */
  readonly children?: ReactNode;
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
  const {
    state,
    baseUrl,
    route,
    className,
    onDownloadSvg,
    onDownloadPng,
    downloadsDisabled = false,
    downloadsHint,
    children,
  } = props;
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
      {onDownloadSvg ? (
        <button
          type="button"
          disabled={downloadsDisabled}
          title={downloadsDisabled ? downloadsHint : 'Download the scene as SVG'}
          onClick={() => void onDownloadSvg()}
        >
          Download SVG
        </button>
      ) : null}
      {onDownloadPng ? (
        <button
          type="button"
          disabled={downloadsDisabled}
          title={downloadsDisabled ? downloadsHint : 'Download the scene as PNG'}
          onClick={() => void onDownloadPng()}
        >
          Download PNG
        </button>
      ) : null}
      {children}
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
