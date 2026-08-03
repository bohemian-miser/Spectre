/**
 * `PanZoom` — the shared wheel/drag/pinch camera surface (DESIGN.md §5.4).
 *
 * One controller for both renderers: it owns nothing but the camera and hands
 * it to its children, so `TilingView` (SVG) and `TilingCanvas` (Canvas2D) get
 * identical gesture behaviour.
 */

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { usePanZoom, type PanZoomApi, type UsePanZoomOptions } from '../hooks/usePanZoom';

export type { PanZoomApi } from '../hooks/usePanZoom';

export interface PanZoomProps extends UsePanZoomOptions {
  readonly className?: string;
  readonly style?: CSSProperties;
  /** Render prop (gets the live camera) or plain children. */
  readonly children: ReactNode | ((api: PanZoomApi) => ReactNode);
  /** Receives the imperative API (`zoomToFit`, `zoomBy`, `reset`). */
  readonly apiRef?: React.MutableRefObject<PanZoomApi | null>;
  /** Small +/-/fit button cluster in the corner. */
  readonly showControls?: boolean;
  readonly ariaLabel?: string;
}

export function PanZoom({
  className,
  style,
  children,
  apiRef,
  showControls = false,
  ariaLabel,
  ...opts
}: PanZoomProps): JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null);
  const api = usePanZoom(ref, opts);

  useEffect(() => {
    if (apiRef) apiRef.current = api;
  }, [api, apiRef]);

  return (
    <div
      ref={ref}
      className={['panzoom', api.panning ? 'is-panning' : '', className ?? '']
        .filter(Boolean)
        .join(' ')}
      style={{ touchAction: 'none', position: 'relative', overflow: 'hidden', ...style }}
      aria-label={ariaLabel}
    >
      {typeof children === 'function' ? (children as (a: PanZoomApi) => ReactNode)(api) : children}
      {showControls ? (
        <div className="panzoom-controls" data-panzoom-ignore="">
          <button type="button" onClick={() => api.zoomBy(1.25)} aria-label="Zoom in">
            +
          </button>
          <button type="button" onClick={() => api.zoomBy(1 / 1.25)} aria-label="Zoom out">
            −
          </button>
          <button type="button" onClick={() => api.reset()} aria-label="Fit to view">
            ⤢
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default PanZoom;
