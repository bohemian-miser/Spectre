/**
 * Shared pointer-event drag helper (DESIGN.md §1.3 `hooks/usePointerDrag.ts`).
 *
 * Unifies mouse / touch / pen: one `pointerdown` handler to spread onto the
 * target, pointer capture so the gesture survives leaving the element, and
 * Escape-to-cancel. Used by `PanZoom` (drag-to-pan) and by `TileView`'s
 * chord-draw gesture (§6.5).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Pt } from '../core';

export interface DragState {
  readonly pointerId: number;
  /** Client coordinates where the gesture started. */
  readonly start: Pt;
  readonly current: Pt;
  /** `current - start`. */
  readonly delta: Pt;
  /** The element the gesture started on. */
  readonly target: Element;
}

export interface PointerDragOptions {
  /** Return false to reject the gesture (e.g. wrong mouse button). */
  onStart?(state: DragState, event: React.PointerEvent): boolean | void;
  onMove?(state: DragState, event: PointerEvent): void;
  onEnd?(state: DragState, event: PointerEvent): void;
  /** Escape key or `pointercancel`. */
  onCancel?(state: DragState): void;
  /** Only start on this mouse button (default 0 = primary; -1 = any). */
  readonly button?: number;
  readonly disabled?: boolean;
}

export interface PointerDragHandle {
  readonly dragging: boolean;
  readonly onPointerDown: (event: React.PointerEvent) => void;
  cancel(): void;
}

export function usePointerDrag(opts: PointerDragOptions): PointerDragHandle {
  const [dragging, setDragging] = useState(false);
  const stateRef = useRef<DragState | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const finish = useCallback((cancelled: boolean, event?: PointerEvent) => {
    const state = stateRef.current;
    stateRef.current = null;
    setDragging(false);
    if (!state) return;
    if (cancelled) optsRef.current.onCancel?.(state);
    else if (event) optsRef.current.onEnd?.(state, event);
  }, []);

  const cancel = useCallback(() => finish(true), [finish]);

  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      const o = optsRef.current;
      if (o.disabled) return;
      const wanted = o.button ?? 0;
      if (wanted >= 0 && event.button !== wanted) return;

      const target = event.currentTarget as Element;
      const start: Pt = { x: event.clientX, y: event.clientY };
      const state: DragState = {
        pointerId: event.pointerId,
        start,
        current: start,
        delta: { x: 0, y: 0 },
        target,
      };
      if (o.onStart?.(state, event) === false) return;

      stateRef.current = state;
      setDragging(true);
      try {
        (target as Element & { setPointerCapture?(id: number): void }).setPointerCapture?.(
          event.pointerId,
        );
      } catch {
        /* capture is best-effort */
      }
    },
    [],
  );

  useEffect(() => {
    if (!dragging) return;

    const move = (event: PointerEvent): void => {
      const prev = stateRef.current;
      if (!prev || event.pointerId !== prev.pointerId) return;
      const current: Pt = { x: event.clientX, y: event.clientY };
      const next: DragState = {
        ...prev,
        current,
        delta: { x: current.x - prev.start.x, y: current.y - prev.start.y },
      };
      stateRef.current = next;
      optsRef.current.onMove?.(next, event);
    };
    const up = (event: PointerEvent): void => {
      const prev = stateRef.current;
      if (!prev || event.pointerId !== prev.pointerId) return;
      finish(false, event);
    };
    const cancelled = (event: PointerEvent): void => {
      const prev = stateRef.current;
      if (!prev || event.pointerId !== prev.pointerId) return;
      finish(true, event);
    };
    const key = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') finish(true);
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancelled);
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancelled);
      window.removeEventListener('keydown', key);
    };
  }, [dragging, finish]);

  return { dragging, onPointerDown, cancel };
}
