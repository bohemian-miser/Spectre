/**
 * `ViewportTools` — the row along the top of the viewport: record, show/hide
 * the stats overlay, fullscreen, follow the traced strand, then the page's
 * own tools. It lives
 * INSIDE the `InfiniteCanvas` host on purpose: the Fullscreen API displays
 * only the fullscreen element's subtree, so any control that must survive
 * going fullscreen (starting and above all STOPPING a take) has to be in
 * here — the page header with the primary Record button vanishes with the
 * rest of the page.
 *
 * Overlay discipline (same as the transition graph): absolutely positioned,
 * so the viewport's deterministic layout is untouched, and pointer events
 * stop here so a press neither pans the map nor taps a strand.
 *
 * The fullscreen button is offered only where the API can fullscreen a div
 * ({@link fullscreenEnabled}) — iPhone Safari cannot, and an inert button
 * would be a lie. Recording notes (saved/failed) are echoed into the cluster
 * while fullscreen, because the page-level note is not on screen then.
 */

import { useCallback, useEffect, useState } from 'react';
import type { InfiniteCanvasApi } from './InfiniteCanvas';
import type { CanvasRecordingControl } from './useRecording';
import {
  FULLSCREEN_EVENTS,
  exitFullscreen,
  fullscreenElement,
  fullscreenEnabled,
  requestFullscreen,
} from './fullscreen';

export interface ViewportToolsProps {
  readonly apiRef: { readonly current: InfiniteCanvasApi | null };
  /**
   * The page's recording control (`useCanvasRecording`) — the SAME object
   * the page-level Record button uses, so the two buttons never disagree
   * about whether a take is running.
   */
  readonly rec: CanvasRecordingControl;
  /** Stats overlay visibility, shown as a toggle when `onToggleHud` is given. */
  readonly hudShown?: boolean;
  onToggleHud?(): void;
  /** Whether the camera follows the traced strand, shown as a toggle when `onToggleFollow` is given. */
  readonly followOn?: boolean;
  onToggleFollow?(): void;
  /** The page's own tools, after the buttons in the row. */
  readonly children?: React.ReactNode;
}

/** `● Rec` / `■ 1:07` — the cluster is small; the page button has the words. */
export function compactRecordingLabel(recording: boolean, elapsed: number): string {
  if (!recording) return '● Rec';
  return `■ ${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;
}

export function ViewportTools(props: ViewportToolsProps): JSX.Element {
  const { apiRef, rec, hudShown, onToggleHud, followOn, onToggleFollow } = props;
  const [isFull, setIsFull] = useState<boolean>(() => fullscreenElement() !== null);

  useEffect(() => {
    const onChange = (): void => setIsFull(fullscreenElement() !== null);
    for (const ev of FULLSCREEN_EVENTS) document.addEventListener(ev, onChange);
    return () => {
      for (const ev of FULLSCREEN_EVENTS) document.removeEventListener(ev, onChange);
    };
  }, []);

  const toggleFullscreen = useCallback((): void => {
    if (fullscreenElement() !== null) {
      exitFullscreen();
      return;
    }
    const host = apiRef.current?.getHost();
    if (host) void requestFullscreen(host);
  }, [apiRef]);

  // Pointer events end here: a press must not pan the map or tap a strand.
  const swallow = useCallback((e: { stopPropagation(): void }): void => {
    e.stopPropagation();
  }, []);

  return (
    <div
      className="viewport-tools"
      data-testid="viewport-tools"
      onPointerDown={swallow}
      onPointerUp={swallow}
      onClick={swallow}
    >
      <button
        type="button"
        className={rec.recording ? 'is-recording' : undefined}
        data-testid="tools-record"
        aria-pressed={rec.recording}
        title="Record the canvas to a movie file — press again to stop and save"
        onClick={rec.toggle}
      >
        {compactRecordingLabel(rec.recording, rec.elapsed)}
      </button>
      {onToggleHud ? (
        <button
          type="button"
          data-testid="tools-stats"
          aria-pressed={hudShown ?? true}
          title="Show or hide the stats overlay"
          onClick={onToggleHud}
        >
          Stats
        </button>
      ) : null}
      {fullscreenEnabled() ? (
        <button
          type="button"
          data-testid="tools-fullscreen"
          aria-pressed={isFull}
          title="Fill the screen with the canvas — biggest picture, best for recording"
          onClick={toggleFullscreen}
        >
          {isFull ? 'Exit full screen' : 'Full screen'}
        </button>
      ) : null}
      {onToggleFollow ? (
        <label className="viewport-tools-check" title="Keep the camera on the traced strand">
          <input type="checkbox" data-testid="tools-follow" checked={followOn ?? false} onChange={onToggleFollow} />
          Follow
        </label>
      ) : null}
      {props.children}
      {isFull && rec.note ? (
        <span className="viewport-tools-note" role="status">
          {rec.note}
        </span>
      ) : null}
    </div>
  );
}

export default ViewportTools;
