/**
 * A rendered patch of one combination, drawn by the thumbnail worker. Keeps
 * showing the previous image until the new one arrives, so sweeping the
 * pointer across the plot never flashes blank.
 */

import { useEffect, useRef, useState } from 'react';
import type { TileFamilyId } from '../../core';
import type { ThumbnailClient } from '../../workers/thumbnailClient';

export interface ThumbnailProps {
  readonly client: ThumbnailClient;
  readonly family: TileFamilyId;
  readonly subset: readonly number[];
  readonly digits: readonly number[];
  readonly level: number;
  /** CSS px; rendered at devicePixelRatio. */
  readonly size: number;
  readonly dark: boolean;
  readonly building: boolean;
  /** Requests on the same channel supersede each other. */
  readonly channel: string;
}

export function Thumbnail(props: ThumbnailProps): JSX.Element {
  const { client, family, subset, digits, level, size, dark, channel } = props;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<'rendering' | 'ready' | 'error'>('rendering');
  const [ms, setMs] = useState<number | null>(null);
  const digitKey = digits.join(',');
  const subsetKey = subset.join('');

  useEffect(() => {
    let live = true;
    const dpr = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
    const px = Math.round(size * dpr);
    setStatus('rendering');
    client
      .render(
        {
          family,
          subset: [...subsetKey].map(Number),
          level,
          digits: digitKey.split(',').map(Number),
          size: px,
          dark,
        },
        channel,
      )
      .then((reply) => {
        if (!live || !reply) return;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        canvas.width = reply.size;
        canvas.height = reply.size;
        ctx.putImageData(new ImageData(new Uint8ClampedArray(reply.rgba), reply.size, reply.size), 0, 0);
        setMs(reply.ms);
        setStatus('ready');
      })
      .catch(() => {
        if (live) setStatus('error');
      });
    return () => {
      live = false;
    };
  }, [client, channel, family, subsetKey, digitKey, level, size, dark]);

  return (
    <div className="cls-thumb" style={{ width: size, height: size }}>
      <canvas ref={canvasRef} style={{ width: size, height: size }} />
      {status !== 'ready' && (
        <span className="cls-thumb-status" role="status">
          {status === 'error'
            ? 'Could not render this patch.'
            : props.building
              ? `Building the level-${level} patch for this rule (once per rule)…`
              : 'Rendering…'}
        </span>
      )}
      {status === 'ready' && ms !== null && ms > 400 && (
        <span className="cls-thumb-note">{(ms / 1000).toFixed(1)} s</span>
      )}
    </div>
  );
}
