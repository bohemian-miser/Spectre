/**
 * The camera controller behind `PanZoom` (DESIGN.md §5.4).
 *
 * All arithmetic lives in `lib/viewport.ts`; this hook only wires it to pointer
 * and wheel events. Gestures supported: drag-to-pan (primary button / single
 * touch), wheel zoom about the cursor, two-pointer pinch about the midpoint.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Pt } from '../core';
import {
  IDENTITY_CAMERA,
  camerasEqual,
  fitToBounds,
  isEmptyBox,
  panBy,
  pinchUpdate,
  screenToWorld,
  wheelZoom,
  zoomBy,
  type Box,
  type Camera,
  type Size,
} from '../lib/viewport';
import { useElementSize } from './useElementSize';

export interface UsePanZoomOptions {
  /** Controlled camera. Omit for internal state. */
  readonly camera?: Camera;
  readonly defaultCamera?: Camera;
  onCameraChange?(camera: Camera): void;
  /** World box the initial view frames; also the target of `zoomToFit()`. */
  readonly fitBounds?: Box | null;
  /** Change this to force a refit (e.g. `${family}:${level}`). */
  readonly fitKey?: string;
  readonly padding?: number;
  readonly minScale?: number;
  readonly maxScale?: number;
  readonly wheelIntensity?: number;
  /** Disable all gestures (read-only embeds). */
  readonly disabled?: boolean;
}

export interface PanZoomApi {
  readonly camera: Camera;
  readonly size: Size;
  readonly panning: boolean;
  setCamera(camera: Camera): void;
  /** Frame a box (defaults to `fitBounds`). */
  zoomToFit(box?: Box, padding?: number): void;
  /** Multiply the scale about the viewport centre (or an explicit anchor). */
  zoomBy(factor: number, anchor?: Pt): void;
  reset(): void;
  /** Client coordinates -> world coordinates. */
  toWorld(client: Pt): Pt;
}

interface ActivePointer {
  readonly id: number;
  readonly pt: Pt;
}

export function usePanZoom(
  ref: React.RefObject<HTMLElement | null>,
  opts: UsePanZoomOptions = {},
): PanZoomApi {
  const size = useElementSize(ref);
  const [internal, setInternal] = useState<Camera>(opts.defaultCamera ?? IDENTITY_CAMERA);
  const [panning, setPanning] = useState(false);

  const controlled = opts.camera !== undefined;
  const camera = controlled ? (opts.camera as Camera) : internal;

  const cameraRef = useRef(camera);
  cameraRef.current = camera;
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const sizeRef = useRef(size);
  sizeRef.current = size;

  const limits = useMemo(
    () => ({ minScale: opts.minScale, maxScale: opts.maxScale }),
    [opts.minScale, opts.maxScale],
  );
  const limitsRef = useRef(limits);
  limitsRef.current = limits;

  const commit = useCallback(
    (next: Camera) => {
      cameraRef.current = next;
      if (!controlled) setInternal(next);
      optsRef.current.onCameraChange?.(next);
    },
    [controlled],
  );

  const localPoint = useCallback(
    (client: Pt): Pt => {
      const rect = ref.current?.getBoundingClientRect();
      return rect ? { x: client.x - rect.left, y: client.y - rect.top } : client;
    },
    [ref],
  );

  const zoomToFit = useCallback(
    (box?: Box, padding?: number) => {
      const target = box ?? optsRef.current.fitBounds;
      const s = sizeRef.current;
      if (!target || isEmptyBox(target) || s.width <= 0 || s.height <= 0) return;
      commit(
        fitToBounds(target, s, {
          padding: padding ?? optsRef.current.padding,
          ...limitsRef.current,
        }),
      );
    },
    [commit],
  );

  // Initial framing (and refits when fitKey changes). Runs before paint so the
  // first frame is already correct instead of flashing an unfitted scene.
  const fitSignature = `${opts.fitKey ?? ''}|${size.width}x${size.height}`;
  const lastFit = useRef<string>('');
  useLayoutEffect(() => {
    if (opts.camera) return; // controlled: the owner decides framing
    const box = optsRef.current.fitBounds;
    if (!box || isEmptyBox(box)) return;
    if (size.width <= 0 || size.height <= 0) return;
    if (lastFit.current === fitSignature) return;
    lastFit.current = fitSignature;
    commit(fitToBounds(box, size, { padding: optsRef.current.padding, ...limitsRef.current }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitSignature, commit]);

  // --- wheel (attached natively so preventDefault works: React's root wheel
  //     listener is passive) --------------------------------------------------
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (event: WheelEvent): void => {
      if (optsRef.current.disabled) return;
      event.preventDefault();
      const anchor = localPoint({ x: event.clientX, y: event.clientY });
      // deltaMode 1 = lines, 2 = pages; normalize to pixels.
      const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1;
      commit(
        wheelZoom(cameraRef.current, anchor, event.deltaY * scale, {
          intensity: optsRef.current.wheelIntensity,
          ...limitsRef.current,
        }),
      );
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [ref, commit, localPoint]);

  // --- pointer drag / pinch -------------------------------------------------
  const pointers = useRef(new Map<number, ActivePointer>());
  const panAnchor = useRef<{ pointer: Pt; camera: Camera } | null>(null);
  const pinchAnchor = useRef<{ a: Pt; b: Pt; camera: Camera } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const clientOf = (event: PointerEvent): Pt => ({ x: event.clientX, y: event.clientY });

    const beginGesture = (): void => {
      const list = [...pointers.current.values()];
      if (list.length >= 2) {
        pinchAnchor.current = {
          a: localPoint(list[0].pt),
          b: localPoint(list[1].pt),
          camera: cameraRef.current,
        };
        panAnchor.current = null;
      } else if (list.length === 1) {
        pinchAnchor.current = null;
        panAnchor.current = { pointer: localPoint(list[0].pt), camera: cameraRef.current };
      } else {
        pinchAnchor.current = null;
        panAnchor.current = null;
      }
      setPanning(list.length > 0);
    };

    const down = (event: PointerEvent): void => {
      if (optsRef.current.disabled) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      // Interactive children (edges, dots, buttons) opt out of panning.
      if ((event.target as Element | null)?.closest?.('[data-panzoom-ignore]')) return;
      pointers.current.set(event.pointerId, { id: event.pointerId, pt: clientOf(event) });
      try {
        el.setPointerCapture(event.pointerId);
      } catch {
        /* best effort */
      }
      beginGesture();
    };

    const move = (event: PointerEvent): void => {
      if (!pointers.current.has(event.pointerId)) return;
      pointers.current.set(event.pointerId, { id: event.pointerId, pt: clientOf(event) });
      const list = [...pointers.current.values()];

      if (list.length >= 2 && pinchAnchor.current) {
        const start = pinchAnchor.current;
        commit(
          pinchUpdate(
            start.camera,
            { a: start.a, b: start.b },
            { a: localPoint(list[0].pt), b: localPoint(list[1].pt) },
            limitsRef.current,
          ),
        );
        return;
      }
      if (list.length === 1 && panAnchor.current) {
        const start = panAnchor.current;
        const now = localPoint(list[0].pt);
        commit(panBy(start.camera, now.x - start.pointer.x, now.y - start.pointer.y));
      }
    };

    const up = (event: PointerEvent): void => {
      if (!pointers.current.delete(event.pointerId)) return;
      try {
        el.releasePointerCapture(event.pointerId);
      } catch {
        /* best effort */
      }
      beginGesture();
    };

    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('pointerleave', up);
      pointers.current.clear();
    };
  }, [ref, commit, localPoint]);

  const api: PanZoomApi = useMemo(
    () => ({
      camera,
      size,
      panning,
      setCamera: (next: Camera) => {
        if (!camerasEqual(cameraRef.current, next)) commit(next);
      },
      zoomToFit,
      zoomBy: (factor: number, anchor?: Pt) => {
        const s = sizeRef.current;
        const at = anchor ?? { x: s.width / 2, y: s.height / 2 };
        commit(zoomBy(cameraRef.current, at, factor, limitsRef.current));
      },
      reset: () => zoomToFit(),
      toWorld: (client: Pt) => screenToWorld(cameraRef.current, localPoint(client)),
    }),
    [camera, size, panning, commit, zoomToFit, localPoint],
  );

  return api;
}
