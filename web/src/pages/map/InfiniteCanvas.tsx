/**
 * `InfiniteCanvas` — the un-rooted viewport, extracted from `MapPage` so the
 * Explorer's "infinite" mode embeds the SAME renderer, camera, scheduler and
 * worker client rather than a second copy of them (BIGMAP stage 3).
 *
 * Owns: the canvas element, the camera (drag + inertia + wheel/pinch
 * zoom-to-cursor), the tiling worker client, the newest-wins query scheduler,
 * and the WebGL2/Canvas2D renderer lifecycle. Owns NO page chrome and NO URL
 * — the embedding page keeps those, receiving camera and status through
 * callbacks and driving the view through `apiRef`.
 *
 * Layout discipline (unchanged from stage 2): the host is a
 * deterministically-sized container supplied by the caller's CSS class, and
 * the canvas is `position:absolute; inset:0` inside it. The container must
 * NEVER size itself from the canvas — that is the level-5 layout-creep bug.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from 'react';
import type { UnrootedQueryRequest, UnrootedQueryResponse } from '../../core';
import { useElementSize } from '../../hooks/useElementSize';
import { createTilingClient, type TilingClient } from '../../workers/tilingClient';
import { DEFAULT_SCALE, createCamera, panBy, viewRectFor, zoomAt, type MapCamera } from './camera';
import { CANVAS2D_MAX_INSTANCES } from './canvasRenderer';
import type { LeafChordTable } from './chords';
import { createQueryScheduler, type QueryScheduler } from './queryScheduler';
import { createMapRenderer } from './renderer';
import type {
  MapRenderStats,
  MapRenderStyle,
  MapRenderer,
  RendererMode,
} from './rendererTypes';

export type InfiniteCanvasMode = 'pending' | RendererMode | 'unsupported';

export interface InfiniteCutInfo {
  readonly count: number;
  readonly cutLevel: number;
  readonly ancestorLevel: number;
  readonly queryMs: number;
  readonly truncated: boolean;
}

export interface InfiniteDrawInfo {
  readonly drawMs: number;
  readonly drawCalls: number;
  readonly scale: number;
  readonly capped: boolean;
  readonly chordsDrawn: number;
}

export interface InfiniteCanvasStatus {
  readonly mode: InfiniteCanvasMode;
  readonly cut: InfiniteCutInfo | null;
  readonly draw: InfiniteDrawInfo | null;
  readonly error: string | null;
  /** Viewport size in CSS px, so HUDs can report depth without measuring. */
  readonly size: { readonly width: number; readonly height: number };
}

export interface InfiniteCanvasApi {
  getCamera(): MapCamera;
  setCamera(next: Partial<MapCamera>): void;
  /** Viewport size in CSS px (0×0 before first layout). */
  getSize(): { width: number; height: number };
  getStatus(): InfiniteCanvasStatus;
  /** True while a tiling query is outstanding. */
  isBusy(): boolean;
}

export interface InfiniteCanvasProps {
  readonly seed: number;
  readonly budget: number;
  /** Strand chords to draw, or null for tiles only. */
  readonly chords?: LeafChordTable | null;
  readonly style?: MapRenderStyle | null;
  /** Camera used on mount only; afterwards the component owns it. */
  readonly initialCamera?: MapCamera;
  onCameraChange?(cam: MapCamera): void;
  onStatusChange?(status: InfiniteCanvasStatus): void;
  /** Run tiling queries on the calling thread (tests / no-Worker envs). */
  readonly forceSyncClient?: boolean;
  /** Test seam: replaces `createMapRenderer`. */
  readonly rendererFactory?: (canvas: HTMLCanvasElement) => MapRenderer | null;
  readonly apiRef?: MutableRefObject<InfiniteCanvasApi | null>;
  /** Host class — MUST give the element a deterministic size. */
  readonly className?: string;
  readonly ariaLabel?: string;
  /** HUD / notes rendered on top of the canvas. */
  readonly children?: ReactNode;
}

export function InfiniteCanvas(props: InfiniteCanvasProps): JSX.Element {
  const {
    seed,
    budget,
    chords = null,
    style = null,
    onCameraChange,
    onStatusChange,
    forceSyncClient,
    rendererFactory,
    apiRef,
    className = 'map-viewport',
    ariaLabel = 'Infinite spectre map — drag to pan, wheel or pinch to zoom',
    children,
  } = props;

  // `mode` is real state (not just status): the renderer effect must re-run
  // when a lost context resets it to 'pending'.
  const [mode, setMode] = useState<InfiniteCanvasMode>('pending');

  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const size = useElementSize(hostRef);

  const camRef = useRef<MapCamera>(props.initialCamera ?? createCamera(0, 0, DEFAULT_SCALE));
  const worldRef = useRef({ seed, budget });
  worldRef.current = { seed, budget };
  const sizeRef = useRef(size);
  sizeRef.current = size;

  const clientRef = useRef<TilingClient | null>(null);
  const schedulerRef = useRef<QueryScheduler<UnrootedQueryRequest> | null>(null);
  const rendererRef = useRef<MapRenderer | null>(null);
  const lastCutRef = useRef<Parameters<MapRenderer['setCut']>[0] | null>(null);
  const chordsRef = useRef<LeafChordTable | null>(chords);
  const styleRef = useRef<MapRenderStyle | null>(style);
  const statusRef = useRef<InfiniteCanvasStatus>({
    mode: 'pending',
    cut: null,
    draw: null,
    error: null,
    size: { width: 0, height: 0 },
  });
  const reqSeqRef = useRef(0);
  const rafRef = useRef(0);
  const inertiaRef = useRef(0);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const velocityRef = useRef({ vx: 0, vy: 0, t: 0 });

  // Callbacks live in refs so the client/scheduler effect never re-runs (and
  // never tears down the worker) just because a parent re-rendered.
  const statusCbRef = useRef(onStatusChange);
  statusCbRef.current = onStatusChange;
  const cameraCbRef = useRef(onCameraChange);
  cameraCbRef.current = onCameraChange;

  const publish = useCallback((patch: Partial<InfiniteCanvasStatus>): void => {
    const next = { ...statusRef.current, ...patch };
    statusRef.current = next;
    statusCbRef.current?.(next);
  }, []);

  // --- draw ------------------------------------------------------------------
  const draw = useCallback((): void => {
    rafRef.current = 0;
    const renderer = rendererRef.current;
    const { width, height } = sizeRef.current;
    if (!renderer || width <= 0 || height <= 0) return;
    const dpr = Math.min(2, (typeof devicePixelRatio === 'number' ? devicePixelRatio : 1) || 1);
    const stats: MapRenderStats = renderer.render(camRef.current, width, height, dpr);
    publish({
      draw: {
        drawMs: stats.drawMs,
        drawCalls: stats.drawCalls,
        scale: camRef.current.scale,
        capped: stats.capped,
        chordsDrawn: stats.chordsDrawn,
      },
    });
  }, [publish]);

  const scheduleDraw = useCallback((): void => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(draw);
  }, [draw]);

  // --- queries ----------------------------------------------------------------
  const requestQuery = useCallback((): void => {
    const scheduler = schedulerRef.current;
    const { width, height } = sizeRef.current;
    if (!scheduler || width <= 0 || height <= 0) return;
    const { seed: s, budget: b } = worldRef.current;
    const effBudget =
      rendererRef.current?.mode === 'canvas2d' ? Math.min(b, CANVAS2D_MAX_INSTANCES) : b;
    scheduler.request({
      id: ++reqSeqRef.current,
      seed: s >>> 0,
      view: viewRectFor(camRef.current, width, height),
      budget: effBudget,
    });
  }, []);

  const onCameraChanged = useCallback((): void => {
    scheduleDraw();
    requestQuery();
    cameraCbRef.current?.(camRef.current);
  }, [scheduleDraw, requestQuery]);

  // --- client + scheduler lifecycle -------------------------------------------
  useEffect(() => {
    const client = createTilingClient({ forceSync: forceSyncClient });
    clientRef.current = client;
    const scheduler = createQueryScheduler<
      UnrootedQueryRequest,
      { res: UnrootedQueryResponse; ms: number }
    >({
      run: async (req) => {
        const t0 = performance.now();
        const res = await client.query(req);
        return { res, ms: performance.now() - t0 };
      },
      onResult: ({ res, ms }) => {
        if (res.seed !== (worldRef.current.seed >>> 0)) return; // stale seed
        lastCutRef.current = res.cut;
        rendererRef.current?.setCut(res.cut);
        publish({
          error: null,
          cut: {
            count: res.cut.count,
            cutLevel: res.cut.cutLevel,
            ancestorLevel: res.cut.ancestorLevel,
            queryMs: ms,
            truncated: res.cut.truncated,
          },
        });
        scheduleDraw();
      },
      onError: (err) => {
        publish({ error: err instanceof Error ? err.message : String(err) });
      },
      minIntervalMs: 120,
    });
    schedulerRef.current = scheduler;
    return () => {
      scheduler.dispose();
      client.dispose();
      schedulerRef.current = null;
      clientRef.current = null;
      rendererRef.current?.dispose();
      rendererRef.current = null;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      if (inertiaRef.current) cancelAnimationFrame(inertiaRef.current);
      inertiaRef.current = 0;
    };
  }, [forceSyncClient, scheduleDraw, publish]);

  // --- renderer creation (after the container has a real size) ----------------
  useEffect(() => {
    if (rendererRef.current || mode === 'unsupported') return;
    const canvas = canvasRef.current;
    if (!canvas || size.width <= 0 || size.height <= 0) return;
    const factory =
      rendererFactory ??
      ((c: HTMLCanvasElement) =>
        createMapRenderer(c, {
          onContextLost: () => {
            rendererRef.current?.dispose();
            rendererRef.current = null;
            setMode('pending'); // re-runs this effect and recreates
          },
        }));
    let renderer: MapRenderer | null = null;
    try {
      renderer = factory(canvas);
    } catch {
      renderer = null;
    }
    rendererRef.current = renderer;
    setMode(renderer ? renderer.mode : 'unsupported');
    if (renderer) {
      renderer.setStyle(styleRef.current);
      renderer.setChords(chordsRef.current);
      if (lastCutRef.current) renderer.setCut(lastCutRef.current);
      scheduleDraw();
      requestQuery();
    }
  }, [size.width, size.height, mode, rendererFactory, scheduleDraw, requestQuery]);

  // Mirror the renderer mode into the published status.
  useEffect(() => {
    publish({ mode });
  }, [mode, publish]);

  // --- resize / seed / budget --------------------------------------------------
  useEffect(() => {
    publish({ size: { width: size.width, height: size.height } });
    if (size.width > 0 && size.height > 0) {
      scheduleDraw();
      requestQuery();
    }
  }, [size.width, size.height, scheduleDraw, requestQuery, publish]);

  useEffect(() => {
    requestQuery();
  }, [seed, budget, requestQuery]);

  // --- chords / style ----------------------------------------------------------
  useEffect(() => {
    chordsRef.current = chords ?? null;
    rendererRef.current?.setChords(chords ?? null);
    scheduleDraw();
  }, [chords, scheduleDraw]);

  useEffect(() => {
    styleRef.current = style ?? null;
    rendererRef.current?.setStyle(style ?? null);
    scheduleDraw();
  }, [style, scheduleDraw]);

  // --- interactions ------------------------------------------------------------
  const stopInertia = useCallback((): void => {
    if (inertiaRef.current) cancelAnimationFrame(inertiaRef.current);
    inertiaRef.current = 0;
  }, []);

  const maybeStartInertia = useCallback((): void => {
    const v = velocityRef.current;
    if (performance.now() - v.t > 120) return; // stale gesture
    if (Math.hypot(v.vx, v.vy) < 0.15) return;
    let last = performance.now();
    const step = (): void => {
      inertiaRef.current = 0;
      const t = performance.now();
      const dt = Math.min(64, t - last);
      last = t;
      camRef.current = panBy(camRef.current, v.vx * dt, v.vy * dt);
      const decay = Math.exp(-dt / 180);
      v.vx *= decay;
      v.vy *= decay;
      onCameraChanged();
      if (Math.hypot(v.vx, v.vy) > 0.02) inertiaRef.current = requestAnimationFrame(step);
    };
    inertiaRef.current = requestAnimationFrame(step);
  }, [onCameraChanged]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>): void => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      stopInertia();
      hostRef.current?.setPointerCapture(e.pointerId);
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      velocityRef.current = { vx: 0, vy: 0, t: performance.now() };
    },
    [stopInertia],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>): void => {
      const pointers = pointersRef.current;
      const entry = pointers.get(e.pointerId);
      if (!entry) return;
      const host = hostRef.current;
      if (!host) return;
      if (pointers.size === 1) {
        const dx = e.clientX - entry.x;
        const dy = e.clientY - entry.y;
        entry.x = e.clientX;
        entry.y = e.clientY;
        camRef.current = panBy(camRef.current, dx, dy);
        const t = performance.now();
        const dt = Math.max(1, t - velocityRef.current.t);
        velocityRef.current = {
          vx: 0.5 * velocityRef.current.vx + 0.5 * (dx / dt),
          vy: 0.5 * velocityRef.current.vy + 0.5 * (dy / dt),
          t,
        };
        onCameraChanged();
      } else if (pointers.size === 2) {
        const rect = host.getBoundingClientRect();
        let other: { x: number; y: number } | null = null;
        for (const [id, p] of pointers) {
          if (id !== e.pointerId) other = p;
        }
        if (!other) return;
        const oldMidX = (entry.x + other.x) / 2;
        const oldMidY = (entry.y + other.y) / 2;
        const oldDist = Math.hypot(entry.x - other.x, entry.y - other.y);
        entry.x = e.clientX;
        entry.y = e.clientY;
        const newMidX = (entry.x + other.x) / 2;
        const newMidY = (entry.y + other.y) / 2;
        const newDist = Math.hypot(entry.x - other.x, entry.y - other.y);
        camRef.current = panBy(camRef.current, newMidX - oldMidX, newMidY - oldMidY);
        if (oldDist > 8 && newDist > 8) {
          camRef.current = zoomAt(
            camRef.current,
            newMidX - rect.left,
            newMidY - rect.top,
            newDist / oldDist,
            rect.width,
            rect.height,
          );
        }
        onCameraChanged();
      }
    },
    [onCameraChanged],
  );

  const onPointerEnd = useCallback(
    (e: React.PointerEvent<HTMLDivElement>): void => {
      if (!pointersRef.current.delete(e.pointerId)) return;
      if (pointersRef.current.size === 0) maybeStartInertia();
    },
    [maybeStartInertia],
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const onWheel = (e: WheelEvent): void => {
      e.preventDefault();
      stopInertia();
      const rect = host.getBoundingClientRect();
      const factor = Math.pow(1.0015, -e.deltaY);
      camRef.current = zoomAt(
        camRef.current,
        e.clientX - rect.left,
        e.clientY - rect.top,
        factor,
        rect.width,
        rect.height,
      );
      onCameraChanged();
    };
    host.addEventListener('wheel', onWheel, { passive: false });
    return () => host.removeEventListener('wheel', onWheel);
  }, [onCameraChanged, stopInertia]);

  // --- imperative handle --------------------------------------------------------
  useEffect(() => {
    if (!apiRef) return;
    apiRef.current = {
      getCamera: () => camRef.current,
      setCamera: (next) => {
        stopInertia();
        camRef.current = createCamera(
          next.cx ?? camRef.current.cx,
          next.cy ?? camRef.current.cy,
          next.scale ?? camRef.current.scale,
        );
        onCameraChanged();
      },
      getSize: () => sizeRef.current,
      getStatus: () => statusRef.current,
      isBusy: () => schedulerRef.current?.inFlight ?? false,
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, onCameraChanged, stopInertia]);

  return (
    <div
      className={className}
      ref={hostRef}
      role="application"
      aria-label={ariaLabel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
    >
      <canvas ref={canvasRef} />
      {children}
    </div>
  );
}

export default InfiniteCanvas;
