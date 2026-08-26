/**
 * `InfiniteCanvas` — the un-rooted viewport, extracted from `MapPage` so the
 * Explorer's "infinite" mode embeds the SAME renderer, camera, scheduler and
 * worker client rather than a second copy of them (BIGMAP stage 3).
 *
 * Owns: the canvas element, the camera (drag + inertia + wheel/pinch
 * zoom-to-cursor), the tiling worker client, the newest-wins query scheduler,
 * the WebGL2/Canvas2D renderer lifecycle, and — when `trace` is on — the
 * tapped strand. Owns NO page chrome and NO URL — the embedding page keeps
 * those, receiving camera and status through callbacks and driving the view
 * through `apiRef`.
 *
 * Tap-to-trace (`strandWalk.ts` does the geometry): a tap picks the strand
 * under the pointer and colours it onward in ONE direction, as far as the
 * tiles the engine has actually emitted. Then it waits. Every cut that lands
 * with the walk's head near it resumes the walk, so panning is what feeds the
 * line — and because the trail is kept in world coordinates rather than as
 * viewport pixels, panning back shows exactly what was drawn.
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
import type { UnrootedQueryRequest, UnrootedQueryResponse, ViewRect } from '../../core';
import { useElementSize } from '../../hooks/useElementSize';
import { createTilingClient, type TilingClient } from '../../workers/tilingClient';
import {
  DEFAULT_SCALE,
  createCamera,
  panBy,
  screenToWorld,
  viewRectFor,
  zoomAt,
  type MapCamera,
} from './camera';
import { CANVAS2D_MAX_INSTANCES } from './canvasRenderer';
import type { LeafChordTable } from './chords';
import { createQueryScheduler, type QueryScheduler } from './queryScheduler';
import { createMapRenderer } from './renderer';
import {
  MAX_CHORD_REACH,
  advanceWalk,
  buildChordIndex,
  hitTestChord,
  isTerminal,
  startTrail,
  trailGeometry,
  trailLength,
  trimTrail,
  type ChordIndex,
  type StrandTrail,
  type WalkStatus,
} from './strandWalk';
import type {
  MapRenderStats,
  MapRenderStyle,
  MapRenderer,
  RendererMode,
  TrailGeometry,
} from './rendererTypes';

export type InfiniteCanvasMode = 'pending' | RendererMode | 'unsupported';

/**
 * A pointer movement (CSS px) and duration under which a press counts as a
 * TAP rather than the start of a pan. Generous on distance because a finger
 * always slides a little.
 */
const TAP_SLOP_PX = 8;
const TAP_MAX_MS = 700;

/** Tap target for picking a strand, in CSS px — a fingertip, not a pixel. */
const TAP_PICK_RADIUS_PX = 16;

/**
 * Follow-mode camera: exponential approach to the walk's head with this time
 * constant (ms), capped at {@link FOLLOW_MAX_VIEWPORTS_PER_S} so a head a
 * whole screen ahead is chased, not teleported to.
 */
const FOLLOW_TAU_MS = 300;
const FOLLOW_MAX_VIEWPORTS_PER_S = 0.9;

/**
 * Most kept circuits. Each is a frozen geometry the renderers draw every
 * frame; past this the OLDEST is let go, which in practice needs a session of
 * dedicated circuit hunting to reach.
 */
const MAX_KEPT_CIRCUITS = 64;

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
  readonly trailPoints: number;
}

/** State of the tapped strand: how far it has been coloured, and why it stopped. */
export interface InfiniteTraceInfo {
  readonly active: boolean;
  readonly status: WalkStatus | null;
  readonly points: number;
  /**
   * Coloured length in world units (a tile edge is 1). Odometer-style: the
   * follow mode's trail window may hold fewer points, but this keeps counting
   * everything walked.
   */
  readonly length: number;
  /** Closed circuits kept lit (the keep-circuits toggle). */
  readonly circuits: number;
}

const NO_TRACE: InfiniteTraceInfo = Object.freeze({
  active: false,
  status: null,
  points: 0,
  length: 0,
  circuits: 0,
});

export interface InfiniteCanvasStatus {
  readonly mode: InfiniteCanvasMode;
  readonly cut: InfiniteCutInfo | null;
  readonly draw: InfiniteDrawInfo | null;
  readonly trace: InfiniteTraceInfo;
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
  /**
   * Start a trace at a viewport position (CSS px from the host's top-left) —
   * what a tap does, exposed so pages and tests can drive it directly.
   * Returns false when no strand was within reach.
   */
  traceAt(x: number, y: number): boolean;
  /** Drop the traced strand. */
  clearTrace(): void;
}

export interface InfiniteCanvasProps {
  readonly seed: number;
  readonly budget: number;
  /** Strand chords to draw, or null for tiles only. */
  readonly chords?: LeafChordTable | null;
  readonly style?: MapRenderStyle | null;
  /**
   * Tapping the canvas traces the strand under the pointer. Needs `chords`:
   * without a strand rule there is no line to follow. Turning it off drops any
   * trace in progress.
   */
  readonly trace?: boolean;
  /**
   * Auto-follow: the camera chases the walk's head, and the queries that
   * movement fires are what feed the walk — the same loop panning by hand
   * drives, run by the camera itself. The user keeps the wheel: zoom is never
   * touched (only cx/cy), and a drag suspends the chase until release.
   */
  readonly follow?: boolean;
  /**
   * Most trail points held while `follow` is on (a moving window behind the
   * head; older points are let go). null/undefined = keep everything, the
   * manual-tracing behaviour.
   */
  readonly followHold?: number | null;
  /**
   * Keep a strand that closed into a circuit coloured when the next strand is
   * traced. Off drops the kept circuits.
   */
  readonly keepCircuits?: boolean;
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
    trace = false,
    follow = false,
    followHold = null,
    keepCircuits = false,
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
    trace: NO_TRACE,
    error: null,
    size: { width: 0, height: 0 },
  });
  const reqSeqRef = useRef(0);
  const rafRef = useRef(0);
  const inertiaRef = useRef(0);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const velocityRef = useRef({ vx: 0, vy: 0, t: 0 });
  const tapRef = useRef<{ id: number; x: number; y: number; t: number } | null>(null);

  // --- traced strand ----------------------------------------------------------
  const traceOnRef = useRef(trace);
  traceOnRef.current = trace;
  const followOnRef = useRef(follow);
  followOnRef.current = follow;
  const followHoldRef = useRef(followHold);
  followHoldRef.current = followHold;
  const keepCircuitsRef = useRef(keepCircuits);
  keepCircuitsRef.current = keepCircuits;
  const followRafRef = useRef(0);
  const followLastRef = useRef(0);
  /** Kept closed circuits, newest last (frozen geometry, renderer-shared). */
  const circuitsRef = useRef<readonly TrailGeometry[]>([]);
  const trailRef = useRef<StrandTrail | null>(null);
  // Rebuilt lazily from the newest cut — a walk that has nothing to do (or
  // nowhere to go) must not pay for an index it will not read.
  const indexRef = useRef<ChordIndex | null>(null);
  const indexCutRef = useRef<unknown>(null);
  /** The rect the newest cut was queried with: the region it covers in full. */
  const coveredRef = useRef<ViewRect | null>(null);
  const walkRafRef = useRef(0);

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
        trailPoints: stats.trailPoints,
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

  // --- traced strand -----------------------------------------------------------
  const publishTrace = useCallback((): void => {
    const trail = trailRef.current;
    const circuits = circuitsRef.current.length;
    publish({
      trace: trail
        ? {
            active: true,
            status: trail.status,
            points: trail.count,
            length: trailLength(trail),
            circuits,
          }
        : circuits
          ? { ...NO_TRACE, circuits }
          : NO_TRACE,
    });
  }, [publish]);

  /** The newest cut's chord index, built on first use and cached per cut. */
  const ensureIndex = useCallback((): ChordIndex | null => {
    const cut = lastCutRef.current;
    const table = chordsRef.current;
    if (!cut || !table) return null;
    if (indexCutRef.current !== cut) {
      indexCutRef.current = cut;
      indexRef.current = buildChordIndex(cut, table);
    }
    return indexRef.current;
  }, []);

  // --- follow (the camera chases the head) ------------------------------------
  const stopFollow = useCallback((): void => {
    if (followRafRef.current) cancelAnimationFrame(followRafRef.current);
    followRafRef.current = 0;
  }, []);

  /**
   * One follow frame: nudge the camera toward the walk's head. The loop
   * re-arms itself while there is a live walk to chase; it never touches
   * `scale`, so wheel/pinch zoom composes with it freely, and it holds still
   * while a pointer is down so a drag is not fought over.
   */
  const followTick = useCallback((): void => {
    followRafRef.current = 0;
    const trail = trailRef.current;
    if (!followOnRef.current || !trail || isTerminal(trail.status)) return;
    followRafRef.current = requestAnimationFrame(followTick);
    if (pointersRef.current.size > 0) {
      followLastRef.current = performance.now();
      return;
    }
    const now = performance.now();
    const dt = Math.min(64, Math.max(1, now - followLastRef.current));
    followLastRef.current = now;
    const cam = camRef.current;
    const { width, height } = sizeRef.current;
    const dx = trail.head.x - cam.cx;
    const dy = trail.head.y - cam.cy;
    const dist = Math.hypot(dx, dy);
    // Converged (sub-pixel): keep ticking cheaply, but write nothing.
    if (dist * cam.scale < 0.5) return;
    let step = dist * (1 - Math.exp(-dt / FOLLOW_TAU_MS));
    const viewportWorld = Math.min(width, height) / cam.scale;
    const maxStep = ((FOLLOW_MAX_VIEWPORTS_PER_S * viewportWorld) / 1000) * dt;
    if (step > maxStep) step = maxStep;
    camRef.current = {
      cx: cam.cx + (dx / dist) * step,
      cy: cam.cy + (dy / dist) * step,
      scale: cam.scale,
    };
    onCameraChanged();
  }, [onCameraChanged]);

  const ensureFollow = useCallback((): void => {
    if (followRafRef.current) return;
    const trail = trailRef.current;
    if (!followOnRef.current || !trail || isTerminal(trail.status)) return;
    followLastRef.current = performance.now();
    followRafRef.current = requestAnimationFrame(followTick);
  }, [followTick]);

  const setCircuits = useCallback(
    (next: readonly TrailGeometry[]): void => {
      circuitsRef.current = next;
      rendererRef.current?.setCircuits(next);
    },
    [],
  );

  /** Move a trail that closed into a circuit over to the kept list. */
  const archiveIfClosedCircuit = useCallback((): void => {
    const old = trailRef.current;
    if (!old || old.status !== 'closed' || !keepCircuitsRef.current) return;
    const geom = trailGeometry(old);
    if (!geom) return;
    setCircuits([...circuitsRef.current.slice(-(MAX_KEPT_CIRCUITS - 1)), geom]);
  }, [setCircuits]);

  /**
   * Walk as far as the tiles currently on screen allow, then stop and wait.
   *
   * `'walking'` means the step cap was reached with more to do, so another
   * slice is queued for the next frame — that keeps a walk that crosses a
   * whole wide viewport from blocking the one it is drawn in.
   */
  const runWalk = useCallback((): void => {
    const trail = trailRef.current;
    if (!trail || isTerminal(trail.status)) return;
    const index = ensureIndex();
    const cut = lastCutRef.current;
    advanceWalk(trail, index, {
      // A truncated cut has holes in it, so a missing chord there proves
      // nothing about the strand — never call an end on one.
      covered: cut && !cut.truncated ? coveredRef.current : null,
    });
    // The follow window: while the camera does the chasing, the trail lets go
    // behind the head so an endless walk holds a bounded line.
    const hold = followHoldRef.current;
    if (followOnRef.current && hold != null) trimTrail(trail, hold);
    rendererRef.current?.setTrail(trailGeometry(trail));
    publishTrace();
    scheduleDraw();
    if (trail.status === 'walking' && !walkRafRef.current) {
      walkRafRef.current = requestAnimationFrame(() => {
        walkRafRef.current = 0;
        runWalk();
      });
    }
    ensureFollow();
  }, [ensureIndex, publishTrace, scheduleDraw, ensureFollow]);

  const clearTrace = useCallback((): void => {
    if (walkRafRef.current) cancelAnimationFrame(walkRafRef.current);
    walkRafRef.current = 0;
    stopFollow();
    if (!trailRef.current && circuitsRef.current.length === 0) return;
    trailRef.current = null;
    rendererRef.current?.setTrail(null);
    if (circuitsRef.current.length) setCircuits([]);
    publishTrace();
    scheduleDraw();
  }, [publishTrace, scheduleDraw, setCircuits, stopFollow]);

  /** Start a trace at a viewport position in CSS px. */
  const traceAt = useCallback(
    (x: number, y: number): boolean => {
      const { width, height } = sizeRef.current;
      if (width <= 0 || height <= 0) return false;
      const index = ensureIndex();
      if (!index) return false;
      const cam = camRef.current;
      const world = screenToWorld(cam, x, y, width, height);
      const hit = hitTestChord(index, world, TAP_PICK_RADIUS_PX / cam.scale);
      if (!hit) return false;
      if (walkRafRef.current) cancelAnimationFrame(walkRafRef.current);
      walkRafRef.current = 0;
      // A circuit the last walk closed stays lit under the new trace.
      archiveIfClosedCircuit();
      trailRef.current = startTrail(hit);
      runWalk();
      return true;
    },
    [ensureIndex, runWalk, archiveIfClosedCircuit],
  );

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
      onResult: ({ res, ms }, req) => {
        if (res.seed !== (worldRef.current.seed >>> 0)) return; // stale seed
        lastCutRef.current = res.cut;
        coveredRef.current = req.view;
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
        // Fresh tiles are exactly what a paused walk was waiting for. Skip the
        // index build when the head is nowhere near them — panning the other
        // way must not cost a rebuild per query.
        const trail = trailRef.current;
        if (trail && !isTerminal(trail.status)) {
          const reach = 2 * MAX_CHORD_REACH;
          const near =
            Math.abs(trail.head.x - req.view.cx) <= req.view.halfW + reach &&
            Math.abs(trail.head.y - req.view.cy) <= req.view.halfH + reach;
          if (near) runWalk();
          else if (trail.status !== 'frontier') {
            trail.status = 'frontier';
            publishTrace();
          }
        }
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
      if (walkRafRef.current) cancelAnimationFrame(walkRafRef.current);
      walkRafRef.current = 0;
      if (followRafRef.current) cancelAnimationFrame(followRafRef.current);
      followRafRef.current = 0;
    };
  }, [forceSyncClient, scheduleDraw, publish, runWalk, publishTrace]);

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
      // A lost context takes the trail's buffers with it; the walk itself lives
      // in world doubles on this side, so it survives and just re-uploads.
      if (trailRef.current) renderer.setTrail(trailGeometry(trailRef.current));
      if (circuitsRef.current.length) renderer.setCircuits(circuitsRef.current);
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

  // A trace belongs to one world: another seed is another tiling, and the line
  // it followed does not exist there.
  useEffect(() => {
    clearTrace();
  }, [seed, clearTrace]);

  // --- chords / style ----------------------------------------------------------
  useEffect(() => {
    chordsRef.current = chords ?? null;
    indexCutRef.current = null; // the cached index was built for the old rule
    rendererRef.current?.setChords(chords ?? null);
    // The traced line is the OLD rule's geometry; under a new one it would be
    // a rainbow over nothing. Drop it rather than let it lie.
    clearTrace();
    scheduleDraw();
  }, [chords, clearTrace, scheduleDraw]);

  useEffect(() => {
    if (!trace) clearTrace();
  }, [trace, clearTrace]);

  useEffect(() => {
    if (follow) ensureFollow();
    else stopFollow();
  }, [follow, ensureFollow, stopFollow]);

  // Toggling keep-circuits off lets the kept circuits go.
  useEffect(() => {
    if (keepCircuits || circuitsRef.current.length === 0) return;
    setCircuits([]);
    publishTrace();
    scheduleDraw();
  }, [keepCircuits, setCircuits, publishTrace, scheduleDraw]);

  // A shrunken hold applies at once — the walk may be idle at a frontier and
  // would otherwise not trim until it next advances.
  useEffect(() => {
    const trail = trailRef.current;
    if (!follow || followHold == null || !trail || trail.count <= followHold) return;
    trimTrail(trail, followHold);
    rendererRef.current?.setTrail(trailGeometry(trail));
    publishTrace();
    scheduleDraw();
  }, [follow, followHold, publishTrace, scheduleDraw]);

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
      // A press is a candidate tap until it moves, gains a second finger, or
      // outstays its welcome.
      tapRef.current =
        pointersRef.current.size === 1
          ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() }
          : null;
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
      const tap = tapRef.current;
      if (
        tap &&
        (Math.abs(e.clientX - tap.x) > TAP_SLOP_PX || Math.abs(e.clientY - tap.y) > TAP_SLOP_PX)
      ) {
        tapRef.current = null; // this is a drag, not a tap
      }
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
      const tap = tapRef.current;
      tapRef.current = null;
      if (
        tap &&
        tap.id === e.pointerId &&
        e.type !== 'pointercancel' &&
        performance.now() - tap.t <= TAP_MAX_MS &&
        traceOnRef.current
      ) {
        const rect = hostRef.current?.getBoundingClientRect();
        if (rect) traceAt(e.clientX - rect.left, e.clientY - rect.top);
      }
      if (pointersRef.current.size === 0) maybeStartInertia();
    },
    [maybeStartInertia, traceAt],
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
      traceAt,
      clearTrace,
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, onCameraChanged, stopInertia, traceAt, clearTrace]);

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
