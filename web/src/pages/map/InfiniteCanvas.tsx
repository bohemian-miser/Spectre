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
import {
  COS30,
  DEFAULT_FIND_CEILING,
  clampFindCeiling,
  SIN30,
  circuitLengthRgb,
  isAggregateType,
  pathLength,
  tracePaths,
  weldSegments,
  type Pt,
  type Segment,
  type UnrootedQueryRequest,
  type UnrootedQueryResponse,
  type ViewRect,
} from '../../core';
import { useElementSize } from '../../hooks/useElementSize';
import { createTilingClient, type TilingClient } from '../../workers/tilingClient';
import {
  DEFAULT_SCALE,
  VIEW_MARGIN,
  createCamera,
  panBy,
  scaleForTileCount,
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
  recentTiles,
  transitionCounts,
  hitTestChord,
  isTerminal,
  startTrail,
  trailGeometry,
  trailLength,
  trimTrail,
  type ChordEnd,
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

/**
 * The walk feeder: while auto-following, the walk is fed by its OWN leaf-LOD
 * queries centred on the head, decoupled from whatever the display is showing
 * — so the chase keeps running while the camera is zoomed out to glyph LOD,
 * and a fresh head-centred cut (a different engine descent than the
 * display's) is what may confirm a dead end.
 *
 * The rect is ADAPTIVE (half-extent in world units): it starts small and
 * grows ×1.5 every time the walk drinks a whole feed and asks for more, up
 * to a ceiling that still fits the feed budget at leaf LOD — a full-speed
 * chase on a fast machine ends up swallowing ~30k tiles per query instead
 * of ~800. A paced chase, or one that stopped consuming, shrinks it back:
 * big rects are pure waste when the walk is only sipping.
 */
const FEED_HALF_MIN = 40;
const FEED_HALF_MAX = 240;
const FEED_GROW = 1.5;
const FEED_BUDGET = 100_000;

/**
 * Find-all-circuits: ceilings for welding + tracing the whole display cut on
 * the main thread per query (~tens of ms at the instance cap), and for how
 * many found circuits are drawn (each is its own trail pass; the LONGEST win
 * a seat when there are more).
 */
/**
 * Recent tiles handed to the HUD each publish. A ticker shows a few dozen; the
 * walk's ring holds more, and copying only what is shown keeps the status
 * object small on a status that is published many times a second.
 */
const TICKER_TILES = 64;

/*
 * The find-all ceiling and its clamp live in `core/serialize`, next to the URL
 * state that carries them, so the codec and this component cannot drift apart.
 */

/**
 * Most circuits drawn at once — a bound on draw calls, nothing more. Measured
 * at 1.8 ms for 1202 calls, so this is generous rather than tight; the find
 * pass that produces them costs hundreds of ms and is the real limit.
 *
 * What gets dropped when it binds matters more than the number. It must never
 * be "the shortest": circuit length is exactly what the colours encode, so
 * trimming by length quietly deletes a whole size class. A single screen at
 * circuit zoom holds ~1150, so at this cap the on-screen set effectively never
 * competes with itself.
 */
const MAX_FOUND_CIRCUITS = 4_000;

/**
 * A found circuit's centre in ABSOLUTE world coordinates. Its geometry is
 * stored relative to the cut it was found in, so two sightings of the same
 * loop from different cameras carry different `xy` and the same centre — which
 * is what makes it usable both as an identity and as a distance.
 */
function circuitKey(g: TrailGeometry): string {
  const c = circuitCentre(g);
  return `${c.x.toFixed(2)}:${c.y.toFixed(2)}:${g.totalLength.toFixed(2)}`;
}

function circuitCentre(g: TrailGeometry): { x: number; y: number } {
  const n = Math.max(1, g.pointCount - 1); // the last point repeats the first
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < n; i++) {
    sx += g.xy[i * 2];
    sy += g.xy[i * 2 + 1];
  }
  return { x: g.origin.x + sx / n, y: g.origin.y + sy / n };
}
/**
 * `zoomToCircuitView` aims at this fraction of the binding ceiling rather than
 * at the ceiling itself. The tile count a viewport holds is an area estimate,
 * so landing exactly on the limit would flip to "too coarse" on the first pan.
 */
const CIRCUIT_VIEW_HEADROOM = 0.8;

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
  /** Finished strands kept lit (the keep-circuits / keep-tails toggles). */
  readonly circuits: number;
  /** Circuits found on screen by the find-all toggle. */
  readonly found: number;
  /** True when find-all is on but the cut is too big/coarse to analyse. */
  readonly foundSkipped: boolean;
  /**
   * The drawn circuits are HELD from a closer view: the camera has since gone
   * past what find-all can compute, and the persist toggle kept them.
   */
  readonly foundStale: boolean;
  /**
   * Leaf types of the tiles the last steps crossed, oldest first — what the
   * ticker names. Bounded by the walk's own ring, so this stays the same size
   * however long the chase runs.
   */
  readonly tiles: readonly number[];
  /**
   * The whole chase's directed tile-type transition counts, row-major
   * `from * TRANSITION_TYPES + to`. A fixed 100 counters however long the walk
   * runs — unlike {@link tiles} this is not a window, so the graph that draws
   * it shows every step ever taken by THIS chase, not just the recent ones.
   */
  readonly transitions: readonly number[];
  /**
   * Total steps the chase has taken, odometer-style. The ticker keys its chips
   * off this so a sliding window keeps the SAME chip identities frame to
   * frame — without it every publish looks like a whole new list.
   */
  readonly steps: number;
}

const NO_TRACE: InfiniteTraceInfo = Object.freeze({
  active: false,
  status: null,
  points: 0,
  length: 0,
  circuits: 0,
  found: 0,
  foundSkipped: false,
  foundStale: false,
  tiles: Object.freeze([]) as readonly number[],
  transitions: Object.freeze([]) as readonly number[],
  steps: 0,
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
  /**
   * Zoom to the widest view that find-all can still analyse — as far out as
   * the display can go while the engine is still emitting individual tiles
   * within the find pass's ceiling. Only the scale moves; the centre stays.
   * Returns the scale it set, or null before the first layout.
   */
  zoomToCircuitView(): number | null;
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
  /**
   * Keep a strand that genuinely ENDED (a tail) coloured when the next strand
   * is traced. Off drops the kept tails.
   */
  readonly keepTails?: boolean;
  /**
   * Find EVERY circuit in the current display cut and colour each by its
   * length — the rooted analysis's weld+trace run over whatever is on screen,
   * refreshed as the camera moves. Needs a leaf cut of at most
   * {@link findCeiling} tiles; coarser views skip and say so.
   */
  readonly findCircuits?: boolean;
  /**
   * Keep the circuits found at a leaf cut on screen when the camera zooms out
   * past what find-all can compute. The geometries are world-anchored, so they
   * keep drawing in the right place at any zoom — this is the only way to see
   * a whole neighbourhood's circuits at once, since finding them needs
   * individual tiles but appreciating the pattern does not.
   */
  readonly persistFound?: boolean;
  /**
   * Ceiling on the tiles find-all will analyse in one pass, and so the widest
   * view `zoomToCircuitView` will park at. Higher shows more circuits at once
   * and costs more time per cut. Defaults to {@link DEFAULT_FIND_CEILING}.
   */
  readonly findCeiling?: number;
  /**
   * Chase pace, in tiles per second — the walk explores that many tiles and
   * no more, so it can be watched tile by tile. null/undefined = full speed.
   */
  readonly followPace?: number | null;
  /**
   * A tapped chord to replay a trace from: world coordinates
   * `[atX, atY, toX, toY]` (the shareable-link seed). When set and nothing is
   * traced yet, the camera jumps there and the trace starts as soon as a leaf
   * cut holds the chord — the same walk the original tap started.
   */
  readonly traceSeed?: readonly [number, number, number, number] | null;
  /**
   * The chord the current trace grew from, whenever one starts (null when the
   * trace is cleared) — what a page writes into the URL to make the chase
   * shareable.
   */
  onTraceSeed?(seed: readonly [number, number, number, number] | null): void;
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
    keepTails = false,
    findCircuits = false,
    persistFound = false,
    findCeiling = DEFAULT_FIND_CEILING,
    followPace = null,
    traceSeed = null,
    onTraceSeed,
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
  const keepTailsRef = useRef(keepTails);
  keepTailsRef.current = keepTails;
  const findOnRef = useRef(findCircuits);
  findOnRef.current = findCircuits;
  const persistFoundRef = useRef(persistFound);
  persistFoundRef.current = persistFound;
  const findCeilingRef = useRef(clampFindCeiling(findCeiling));
  findCeilingRef.current = clampFindCeiling(findCeiling);
  /** Circuits the find-all toggle carved out of the current display cut. */
  const foundRef = useRef<readonly TrailGeometry[]>([]);
  /** Identities of everything in `foundRef`, so a re-find is not a duplicate. */
  const foundKeysRef = useRef<Set<string>>(new Set());
  const foundInfoRef = useRef({ found: 0, skipped: false, stale: false });
  const followRafRef = useRef(0);
  const followLastRef = useRef(0);
  const paceRef = useRef(followPace);
  paceRef.current = followPace;
  const paceTokensRef = useRef(0);
  const paceLastRef = useRef(0);
  const feedSchedulerRef = useRef<QueryScheduler<UnrootedQueryRequest> | null>(null);
  const feedSeqRef = useRef(0);
  const feedHalfRef = useRef(FEED_HALF_MIN);
  /** Head position of a dead end awaiting confirmation by a head-centred cut. */
  const endPendingRef = useRef<Pt | null>(null);
  /** A shared-link seed chord waiting for a cut that contains it. */
  const replayRef = useRef<readonly [number, number, number, number] | null>(null);
  const traceSeedCbRef = useRef(onTraceSeed);
  traceSeedCbRef.current = onTraceSeed;
  /** Kept finished strands (circuits and tails), newest last. */
  const keptRef = useRef<readonly { geom: TrailGeometry; kind: 'circuit' | 'tail' }[]>([]);
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
    const circuits = keptRef.current.length;
    const { found, skipped, stale } = foundInfoRef.current;
    publish({
      trace: trail
        ? {
            active: true,
            status: trail.status,
            points: trail.count,
            length: trailLength(trail),
            circuits,
            found,
            foundSkipped: skipped,
            foundStale: stale,
            tiles: recentTiles(trail, TICKER_TILES),
            transitions: transitionCounts(trail),
            steps: trail.steps,
          }
        : circuits || found || skipped
          ? { ...NO_TRACE, circuits, found, foundSkipped: skipped, foundStale: stale }
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
    // The gentle cap keeps a nearby chase watchable; once the head has pulled
    // more than ~1.5 viewports ahead the exponential runs uncapped, so a
    // full-throttle walk is caught up with instead of lost.
    if (step > maxStep && dist < viewportWorld * 1.5) step = maxStep;
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

  /** Hand the renderer everything that stays lit: kept strands + found circuits. */
  const syncOverlays = useCallback((): void => {
    rendererRef.current?.setCircuits([
      ...keptRef.current.map((k) => k.geom),
      ...foundRef.current,
    ]);
  }, []);

  const setKept = useCallback(
    (next: readonly { geom: TrailGeometry; kind: 'circuit' | 'tail' }[]): void => {
      keptRef.current = next;
      syncOverlays();
    },
    [syncOverlays],
  );

  /**
   * A found circuit's identity across cuts. The same loop found again from a
   * different camera arrives with a different `origin` and may start at a
   * different vertex, but not at a different place or a different length — so
   * its absolute centroid and length name it. Quantised well inside the f32
   * error on origin-relative coordinates, and well under the gap between two
   * genuinely different circuits.
   */
  /**
   * Weld + trace the whole display cut and colour every closed circuit by its
   * length — the same pipeline the rooted analysis runs, over whatever the
   * camera happens to hold. Synchronous by design: at the instance ceiling it
   * is tens of milliseconds, and cuts arrive at most every 120 ms.
   */
  const recomputeFound = useCallback((): void => {
    const had = foundRef.current.length > 0 || foundInfoRef.current.skipped;
    const apply = (geoms: readonly TrailGeometry[], skipped: boolean): void => {
      foundRef.current = geoms;
      if (geoms.length === 0) foundKeysRef.current.clear();
      foundInfoRef.current = { found: geoms.length, skipped, stale: false };
      syncOverlays();
      publishTrace();
      scheduleDraw();
    };
    const table = chordsRef.current;
    const cut = lastCutRef.current;
    if (!findOnRef.current || !table || table.chordCount === 0 || !cut) {
      if (had) apply([], false);
      return;
    }
    if (cut.cutLevel !== 0 || cut.truncated || cut.count > findCeilingRef.current) {
      // Too coarse to FIND circuits — but the ones already found are
      // world-anchored, so they can go on being drawn while the camera pulls
      // back. That is the point of the persist toggle: finding needs
      // individual tiles, seeing the pattern they make does not.
      if (persistFoundRef.current && foundRef.current.length > 0) {
        foundInfoRef.current = { found: foundRef.current.length, skipped: false, stale: true };
        publishTrace();
        return;
      }
      apply([], true);
      return;
    }
    const segs: Segment[] = [];
    for (let i = 0; i < cut.count; i++) {
      const tb = cut.type[i];
      if (isAggregateType(tb)) continue;
      const local = table.segments[tb];
      if (!local || local.length === 0) continue;
      const code = cut.code[i];
      const rot = code & 15;
      const mir = (code & 16) !== 0 ? -1 : 1;
      const co = COS30[rot];
      const si = SIN30[rot];
      const px = cut.pos[i * 2] + cut.origin.x;
      const py = cut.pos[i * 2 + 1] + cut.origin.y;
      for (const [a, b] of local) {
        segs.push([
          { x: co * mir * a.x - si * a.y + px, y: si * mir * a.x + co * a.y + py },
          { x: co * mir * b.x - si * b.y + px, y: si * mir * b.x + co * b.y + py },
        ]);
      }
    }
    const { circuits } = tracePaths(weldSegments(segs));
    let geoms: TrailGeometry[] = [];
    for (const path of circuits) {
      const pts = path.points;
      const n = pts.length;
      if (n < 3) continue;
      const xy = new Float32Array((n + 1) * 2);
      const arc = new Float32Array(n + 1);
      let total = 0;
      for (let i = 0; i <= n; i++) {
        const q = pts[i % n];
        xy[i * 2] = q.x - cut.origin.x;
        xy[i * 2 + 1] = q.y - cut.origin.y;
        if (i > 0) {
          const r = pts[i - 1];
          total += Math.hypot(q.x - r.x, q.y - r.y);
        }
        arc[i] = total;
      }
      const rgb = circuitLengthRgb(pathLength(path));
      geoms.push({
        color: [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255],
        origin: cut.origin,
        xy,
        arc,
        pointCount: n + 1,
        totalLength: total,
        version: 1,
      });
    }
    // What this cut can see, by identity — which is also the set that must
    // survive any trimming below.
    const here = new Set(geoms.map(circuitKey));

    if (persistFoundRef.current) {
      // "Keep them" means KEEP them: a circuit found here stays found when the
      // camera moves on and this cut no longer contains it. Without the merge
      // the set is only ever what is on screen right now, so coming back to a
      // leaf cut silently threw away everything found anywhere else.
      const merged = [...foundRef.current];
      // Self-healing: the keys are only consulted here, so a run with the
      // toggle OFF (which replaces the list wholesale) can leave them stale.
      // Rebuilding on the mismatch keeps that from suppressing a real find.
      if (foundKeysRef.current.size !== foundRef.current.length) {
        foundKeysRef.current = new Set(foundRef.current.map(circuitKey));
      }
      const keys = foundKeysRef.current;
      for (const g of geoms) {
        const key = circuitKey(g);
        if (keys.has(key)) continue;
        keys.add(key);
        merged.push(g);
      }
      geoms = merged;
    }

    if (geoms.length > MAX_FOUND_CIRCUITS) {
      // Trimming by length was a bug: it always kept the longest, so once the
      // accumulated set filled up, every short circuit found afterwards was
      // evicted the moment it arrived — including ones in plain view. Nothing
      // on screen may be dropped, and what IS dropped goes by distance from
      // the camera, which has nothing to do with a circuit's size.
      const cam = camRef.current;
      const near = (g: TrailGeometry): number => {
        const c = circuitCentre(g);
        return (c.x - cam.cx) ** 2 + (c.y - cam.cy) ** 2;
      };
      const onScreen: TrailGeometry[] = [];
      const rest: TrailGeometry[] = [];
      for (const g of geoms) (here.has(circuitKey(g)) ? onScreen : rest).push(g);

      if (onScreen.length >= MAX_FOUND_CIRCUITS) {
        // One cut alone over the cap: keep what is nearest the middle of the
        // view, still nothing to do with length.
        geoms = onScreen.sort((a, b) => near(a) - near(b)).slice(0, MAX_FOUND_CIRCUITS);
      } else {
        rest.sort((a, b) => near(a) - near(b));
        geoms = [...onScreen, ...rest.slice(0, MAX_FOUND_CIRCUITS - onScreen.length)];
      }
      // Whatever was dropped must be forgettable again, or it could never come
      // back once the camera returns to it.
      foundKeysRef.current = new Set(geoms.map(circuitKey));
    }
    apply(geoms, false);
  }, [syncOverlays, publishTrace, scheduleDraw]);
  const recomputeFoundRef = useRef(recomputeFound);
  recomputeFoundRef.current = recomputeFound;

  /**
   * Move the outgoing trail over to the kept list when a new trace starts: a
   * CLOSED circuit under the keep-circuits toggle; anything else — a genuine
   * dead end, a junction stop, or a chase simply abandoned mid-strand — is a
   * tail-shaped rainbow the user coloured, kept under keep-tails. What was
   * chased stays on screen; the toggles are what let it go instead.
   */
  const archiveFinishedTrail = useCallback((): void => {
    const old = trailRef.current;
    if (!old || old.count < 2) return;
    const kind =
      old.status === 'closed'
        ? keepCircuitsRef.current
          ? ('circuit' as const)
          : null
        : keepTailsRef.current
          ? ('tail' as const)
          : null;
    if (!kind) return;
    const geom = trailGeometry(old);
    if (!geom) return;
    // Same strand, traced again, is not a second strand.
    const key = circuitKey(geom);
    if (keptRef.current.some((k) => circuitKey(k.geom) === key)) return;
    setKept([...keptRef.current.slice(-(MAX_KEPT_CIRCUITS - 1)), { geom, kind }]);
  }, [setKept]);

  /**
   * Steps the pace limit allows right now: undefined = unlimited, 0 = starved
   * this tick (come back next frame). A token bucket capped at one second of
   * pace, shared by display-fed and feeder-fed advances.
   */
  const paceBudget = useCallback((): number | undefined => {
    const pace = paceRef.current;
    if (pace == null || pace <= 0) return undefined;
    const now = performance.now();
    const dt = Math.min(1000, Math.max(0, now - (paceLastRef.current || now)));
    paceLastRef.current = now;
    paceTokensRef.current = Math.min(pace, paceTokensRef.current + (pace * dt) / 1000);
    return Math.floor(paceTokensRef.current);
  }, []);

  const runWalkRef = useRef<(() => void) | null>(null);
  const scheduleWalkTick = useCallback((): void => {
    if (walkRafRef.current) return;
    walkRafRef.current = requestAnimationFrame(() => {
      walkRafRef.current = 0;
      runWalkRef.current?.();
    });
  }, []);

  /** Ask the feeder for a fresh leaf cut centred on the walk's head. */
  const requestFeed = useCallback((): void => {
    const trail = trailRef.current;
    const scheduler = feedSchedulerRef.current;
    if (!trail || isTerminal(trail.status) || !scheduler || !chordsRef.current) return;
    const half = feedHalfRef.current;
    scheduler.request({
      id: ++feedSeqRef.current,
      seed: worldRef.current.seed >>> 0,
      view: { cx: trail.head.x, cy: trail.head.y, halfW: half, halfH: half },
      budget: FEED_BUDGET,
    });
  }, []);

  /**
   * Keep the feeder pumping wherever the display cannot feed the walk: while
   * auto-following (any zoom — the chase must not care what LOD is on
   * screen), and while a dead end awaits its head-centred confirmation.
   */
  const maybeFeed = useCallback((): void => {
    const trail = trailRef.current;
    if (!trail || isTerminal(trail.status)) return;
    if (trail.status !== 'frontier' && trail.status !== 'offscreen') return;
    if (!followOnRef.current && !endPendingRef.current) return;
    requestFeed();
  }, [requestFeed]);

  /**
   * Advance the walk against one chord index and its covered rect, applying
   * the pace limit, the follow window, and the dead-end confirmation rule:
   * an `'end'` from a DISPLAY cut is only a candidate (rare engine states can
   * under-cover a rect; measured and fixed in `unrooted.ts`, but belt on
   * braces here) — it demotes to `'frontier'` and a head-centred feed cut is
   * asked to confirm. Only an `'end'` seen by a feed cut, whose rect is
   * centred on the head by construction, is believed.
   */
  const advanceAgainst = useCallback(
    (index: ChordIndex | null, covered: ViewRect | null, fromFeed: boolean): void => {
      const trail = trailRef.current;
      if (!trail || isTerminal(trail.status)) return;
      const budget = paceBudget();
      if (budget === 0) {
        scheduleWalkTick(); // pace-starved: tokens regrow next frame
        return;
      }
      const hold = followOnRef.current ? followHoldRef.current : null;
      const stepsBefore = trail.steps;
      advanceWalk(trail, index, {
        // A truncated cut has holes in it, so a missing chord there proves
        // nothing about the strand — never call an end on one.
        covered,
        hold,
        ...(budget !== undefined ? { maxSteps: budget } : {}),
      });
      if (budget !== undefined) {
        paceTokensRef.current = Math.max(0, paceTokensRef.current - (trail.steps - stepsBefore));
      }
      if (hold != null) trimTrail(trail, hold);
      if (trail.status === 'closed' && !trail.color) {
        // A closed circuit stops being a rainbow: it gets the solid ink of
        // its length, the same colour that circuit has everywhere else.
        // `steps` is the tile count now that the tapped chord is counted, so
        // this is the circuit's length outright — no off-by-one to undo. Get
        // it wrong and the live circuit wears a different colour from the one
        // find-all gives the very same loop.
        const rgb = circuitLengthRgb(trail.steps);
        trail.color = [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255];
        trail.version++;
        trail.geom = null;
        // Re-tracing a circuit that is already kept must not draw it twice.
        // The two copies are identical, so they stack — and their stroke caps
        // land at whichever chord each trace happened to start from, which is
        // what made the second one look like an offset duplicate. The live
        // trail is drawn anyway, so the kept copy of the SAME loop goes.
        const geom = trailGeometry(trail);
        if (geom) {
          const key = circuitKey(geom);
          const rest = keptRef.current.filter((k) => circuitKey(k.geom) !== key);
          if (rest.length !== keptRef.current.length) setKept(rest);
        }
      }
      if (trail.status === 'end' && !fromFeed) {
        trail.status = 'frontier';
        endPendingRef.current = { x: trail.head.x, y: trail.head.y };
        requestFeed();
      } else if (trail.status === 'end') {
        endPendingRef.current = null; // confirmed by a head-centred cut
      } else if (trail.steps !== stepsBefore) {
        endPendingRef.current = null; // the walk moved on — no end after all
      }
      rendererRef.current?.setTrail(trailGeometry(trail));
      publishTrace();
      scheduleDraw();
      if (fromFeed) {
        // Size the next feed to the walk's appetite: a full-speed walk that
        // drank the whole rect and wants more gets a bigger one; a paced or
        // stalled walk gets the small one back.
        const consumed = trail.status === 'frontier' && trail.steps > stepsBefore;
        feedHalfRef.current =
          consumed && paceRef.current == null
            ? Math.min(FEED_HALF_MAX, feedHalfRef.current * FEED_GROW)
            : FEED_HALF_MIN;
      }
      // 'walking' means the step cap was reached with more to do; another
      // slice is queued so a walk crossing a wide viewport never blocks the
      // frame it is drawn in.
      if (trail.status === 'walking') scheduleWalkTick();
      ensureFollow();
      maybeFeed();
    },
    [paceBudget, scheduleWalkTick, publishTrace, scheduleDraw, ensureFollow, maybeFeed, requestFeed],
  );
  const advanceAgainstRef = useRef(advanceAgainst);
  advanceAgainstRef.current = advanceAgainst;

  /** Walk as far as the tiles currently on screen allow, then stop and wait. */
  const runWalk = useCallback((): void => {
    const trail = trailRef.current;
    if (!trail || isTerminal(trail.status)) return;
    const index = ensureIndex();
    if (!index && followOnRef.current) {
      // The display is at glyph LOD (or too dense to index): the chase must
      // not stall or read 'offscreen' — the feeder keeps it walking.
      maybeFeed();
      ensureFollow();
      return;
    }
    const cut = lastCutRef.current;
    advanceAgainst(index, cut && !cut.truncated ? coveredRef.current : null, false);
  }, [ensureIndex, advanceAgainst, maybeFeed, ensureFollow]);
  runWalkRef.current = runWalk;

  /** Report the chord the current trace grew from (the shareable seed). */
  const publishSeed = useCallback((hit: ChordEnd | null): void => {
    traceSeedCbRef.current?.(
      hit
        ? [
            Math.round(hit.at.x * 1000) / 1000,
            Math.round(hit.at.y * 1000) / 1000,
            Math.round(hit.to.x * 1000) / 1000,
            Math.round(hit.to.y * 1000) / 1000,
          ]
        : null,
    );
  }, []);

  const clearTrace = useCallback((): void => {
    if (walkRafRef.current) cancelAnimationFrame(walkRafRef.current);
    walkRafRef.current = 0;
    stopFollow();
    endPendingRef.current = null;
    replayRef.current = null;
    const hadFound = foundRef.current.length > 0;
    if (!trailRef.current && keptRef.current.length === 0 && !hadFound) return;
    trailRef.current = null;
    rendererRef.current?.setTrail(null);
    // Found circuits accumulate while "keep them" is on, so clearing has to
    // let go of them too — otherwise there is no way back to an empty screen.
    if (hadFound) {
      foundRef.current = [];
      foundKeysRef.current.clear();
      foundInfoRef.current = { found: 0, skipped: false, stale: false };
    }
    if (keptRef.current.length || hadFound) setKept(keptRef.current.length ? [] : keptRef.current);
    publishSeed(null);
    publishTrace();
    scheduleDraw();
  }, [publishTrace, publishSeed, scheduleDraw, setKept, stopFollow]);

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
      endPendingRef.current = null;
      replayRef.current = null; // a real tap supersedes a shared-link seed
      // A circuit or tail the last walk finished stays lit under the new trace.
      archiveFinishedTrail();
      trailRef.current = startTrail(hit);
      publishSeed(hit);
      runWalk();
      return true;
    },
    [ensureIndex, runWalk, archiveFinishedTrail, publishSeed],
  );

  /**
   * Start the shared-link trace once a leaf cut holds its chord. One shot:
   * the first cut that COULD answer (chord point inside its covered rect,
   * walkable index built) either finds the chord and starts the walk, or
   * proves the link's rule no longer draws it and gives up quietly.
   */
  const tryReplay = useCallback((): void => {
    const seed = replayRef.current;
    if (!seed || trailRef.current || !traceOnRef.current) return;
    const index = ensureIndex();
    if (!index) return;
    const cov = coveredRef.current;
    if (!cov) return;
    if (Math.abs(seed[0] - cov.cx) > cov.halfW || Math.abs(seed[1] - cov.cy) > cov.halfH) return;
    const hit = hitTestChord(index, { x: seed[0], y: seed[1] }, 1.5);
    replayRef.current = null;
    if (!hit) return;
    // Aim the walk the way the shared tap aimed it.
    const flip =
      Math.hypot(hit.at.x - seed[0], hit.at.y - seed[1]) >
      Math.hypot(hit.to.x - seed[0], hit.to.y - seed[1]);
    // Flipping only swaps which end the walk leaves from; it is the same
    // chord, so it keeps the same tile.
    const oriented: ChordEnd = flip ? { at: hit.to, to: hit.at, leafType: hit.leafType } : hit;
    trailRef.current = startTrail(oriented);
    publishSeed(oriented);
    runWalk();
  }, [ensureIndex, publishSeed, runWalk]);
  const tryReplayRef = useRef(tryReplay);
  tryReplayRef.current = tryReplay;

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
        } else if (!trail) {
          tryReplayRef.current?.(); // a shared-link seed may be waiting for this cut
        }
        recomputeFoundRef.current?.(); // find-all works per display cut
      },
      onError: (err) => {
        publish({ error: err instanceof Error ? err.message : String(err) });
      },
      minIntervalMs: 120,
    });
    schedulerRef.current = scheduler;
    // The walk feeder: small head-centred leaf queries of its own, so the
    // chase neither depends on the display's LOD nor trusts a single cut
    // about a dead end. Results never reach the renderer's tile scene.
    const feedScheduler = createQueryScheduler<
      UnrootedQueryRequest,
      { res: UnrootedQueryResponse; ms: number }
    >({
      run: async (req) => {
        const t0 = performance.now();
        const res = await client.query(req);
        return { res, ms: performance.now() - t0 };
      },
      onResult: ({ res }, req) => {
        if (res.seed !== (worldRef.current.seed >>> 0)) return;
        const trail = trailRef.current;
        if (!trail || isTerminal(trail.status)) return;
        const table = chordsRef.current;
        if (!table || res.cut.cutLevel !== 0) return;
        const index = buildChordIndex(res.cut, table);
        advanceAgainstRef.current?.(index, res.cut.truncated ? null : req.view, true);
      },
      onError: () => {
        // Best-effort: the display query is what surfaces engine errors.
      },
      minIntervalMs: 40,
    });
    feedSchedulerRef.current = feedScheduler;
    return () => {
      scheduler.dispose();
      feedScheduler.dispose();
      client.dispose();
      schedulerRef.current = null;
      feedSchedulerRef.current = null;
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
      if (keptRef.current.length) renderer.setCircuits(keptRef.current.map((k) => k.geom));
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
    recomputeFoundRef.current?.(); // found circuits belong to the rule too
    scheduleDraw();
  }, [chords, clearTrace, scheduleDraw]);

  useEffect(() => {
    if (!trace) clearTrace();
  }, [trace, clearTrace]);

  useEffect(() => {
    if (follow) {
      ensureFollow();
      maybeFeed();
    } else stopFollow();
  }, [follow, ensureFollow, stopFollow, maybeFeed]);

  // Pace changes take effect at once: reset the bucket and nudge the walk so
  // a speed-up does not wait for the next cut to be noticed.
  useEffect(() => {
    paceTokensRef.current = 0;
    paceLastRef.current = performance.now();
    if (trailRef.current && !isTerminal(trailRef.current.status)) runWalk();
  }, [followPace, runWalk]);

  // A shared-link seed: jump the camera to the chord and trace it as soon as
  // a cut holds it. The prop also echoes back after every locally-started
  // trace (pages mirror it into the URL) — the live trail guards against
  // treating the echo as a new request.
  const traceSeedKey = traceSeed ? traceSeed.join(',') : '';
  useEffect(() => {
    if (!traceSeed || trailRef.current) return;
    replayRef.current = traceSeed;
    camRef.current = createCamera(traceSeed[0], traceSeed[1], camRef.current.scale);
    onCameraChanged();
    tryReplay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [traceSeedKey]);

  // Toggling a keep switch off lets that kind of kept strand go.
  useEffect(() => {
    if (keepCircuits) return;
    const next = keptRef.current.filter((k) => k.kind !== 'circuit');
    if (next.length === keptRef.current.length) return;
    setKept(next);
    publishTrace();
    scheduleDraw();
  }, [keepCircuits, setKept, publishTrace, scheduleDraw]);

  useEffect(() => {
    recomputeFound();
  }, [findCircuits, recomputeFound]);

  useEffect(() => {
    if (keepTails) return;
    const next = keptRef.current.filter((k) => k.kind !== 'tail');
    if (next.length === keptRef.current.length) return;
    setKept(next);
    publishTrace();
    scheduleDraw();
  }, [keepTails, setKept, publishTrace, scheduleDraw]);

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
      zoomToCircuitView: () => {
        const { width, height } = sizeRef.current;
        if (width <= 0 || height <= 0) return null;
        // Two ceilings bind: the find pass's own, and the engine's instance
        // budget (past which it cuts to supertile glyphs and there are no
        // individual tiles to weld at all). Aim just inside the lower one, so
        // the view sits at the boundary rather than tipping over it.
        //
        // The count that matters is the CUT's, and the cut covers the padded
        // query rect rather than the viewport — 1.2× per axis is 1.44× the
        // area, so sizing the viewport to the ceiling overshoots it by half
        // as much again.
        const ceiling = Math.min(findCeilingRef.current, worldRef.current.budget);
        const inViewport = (ceiling * CIRCUIT_VIEW_HEADROOM) / VIEW_MARGIN ** 2;
        const scale = scaleForTileCount(inViewport, width, height);
        stopInertia();
        camRef.current = createCamera(camRef.current.cx, camRef.current.cy, scale);
        onCameraChanged();
        return scale;
      },
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
