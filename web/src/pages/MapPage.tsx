/**
 * `MapPage` — The Infinite Map (BIGMAP stage 2).
 *
 * A WebGL2-instanced, worker-fed viewport over the un-rooted engine: smooth
 * pan (drag + inertia), wheel/pinch zoom-to-cursor, seamless deep zoom and
 * unbounded pan at level-9-equivalent scale and beyond. Camera changes drive
 * debounced worker queries through `queryScheduler` (at most one outstanding,
 * latest camera wins); results are the engine's 10-byte-per-instance wire
 * format, uploaded straight to the GPU. Far LODs draw flavour-colored
 * supertile glyphs (`pages/map/glyphs.ts`).
 *
 * Layout discipline: the canvas is `position:absolute` inside the
 * deterministically-sized `.map-viewport` (see the lvl-5 feedback-loop fix in
 * `.tiling-canvas` / `.explorer-viewport`) — the viewport must NEVER size
 * itself from its own canvas.
 *
 * Precision discipline: the camera center lives in doubles; the renderer only
 * ever sees positions relative to each cut's `origin` (re-anchored by every
 * query), so the GPU never sees huge coordinates.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  SUBSTITUTION_GROWTH,
  type UnrootedQueryRequest,
  type UnrootedQueryResponse,
  type ViewportCut,
} from '../core';
import { createTilingClient, type TilingClient } from '../workers/tilingClient';
import { useElementSize } from '../hooks/useElementSize';
import {
  DEFAULT_SCALE,
  createCamera,
  panBy,
  viewRectFor,
  zoomAt,
  type MapCamera,
} from './map/camera';
import {
  DEFAULT_MAP_STATE,
  MAP_BUDGETS,
  hashToMapState,
  mapStateToHash,
  sameMapState,
  type MapUrlState,
} from './map/mapUrl';
import { createQueryScheduler, type QueryScheduler } from './map/queryScheduler';
import { CANVAS2D_MAX_INSTANCES } from './map/canvasRenderer';
import { createMapRenderer, type MapRenderStats, type MapRenderer } from './map/renderer';
import '../styles/map.css';

export interface MapPageProps {
  /** Mirror state into `location.hash` (default true; tests can opt out). */
  readonly syncUrl?: boolean;
  /** Run tiling queries on the calling thread (tests / no-Worker envs). */
  readonly forceSyncClient?: boolean;
  /** Test seam: replaces `createMapRenderer`. */
  readonly rendererFactory?: (canvas: HTMLCanvasElement) => MapRenderer | null;
}

interface HudInfo {
  readonly count: number;
  readonly cutLevel: number;
  readonly ancestorLevel: number;
  readonly queryMs: number;
  readonly truncated: boolean;
}

interface DrawInfo {
  readonly drawMs: number;
  readonly drawCalls: number;
  readonly scale: number;
  readonly capped: boolean;
}

type Mode = 'pending' | 'webgl2' | 'canvas2d' | 'unsupported';

function formatBudget(b: number): string {
  return b >= 1_000_000 ? `${b / 1_000_000}M` : `${Math.round(b / 1000)}k`;
}

function formatZoom(scale: number): string {
  if (scale >= 1) return `${scale.toFixed(scale >= 30 ? 0 : 1)} px/tile`;
  const tilesPerPx = 1 / scale;
  return `${Math.round(tilesPerPx).toLocaleString('en-US')} tiles/px`;
}

export function MapPage(props: MapPageProps): JSX.Element {
  const syncUrl = props.syncUrl ?? true;

  // --- initial state (read the hash exactly once) ---------------------------
  const initialRef = useRef<MapUrlState | null>(null);
  if (initialRef.current === null) {
    initialRef.current =
      syncUrl && typeof window !== 'undefined'
        ? hashToMapState(window.location.hash)
        : { ...DEFAULT_MAP_STATE };
  }
  const initial = initialRef.current;

  const [seed, setSeed] = useState<number>(initial.seed);
  const [seedDraft, setSeedDraft] = useState<string>(String(initial.seed));
  const [budget, setBudget] = useState<number>(initial.budget);
  const [mode, setMode] = useState<Mode>('pending');
  const [hud, setHud] = useState<HudInfo | null>(null);
  const [drawInfo, setDrawInfo] = useState<DrawInfo | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);

  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const size = useElementSize(hostRef);

  const camRef = useRef<MapCamera>(createCamera(initial.cx, initial.cy, initial.scale));
  const worldRef = useRef({ seed, budget });
  worldRef.current = { seed, budget };
  const hudRef = useRef<HudInfo | null>(hud);
  hudRef.current = hud;
  const sizeRef = useRef(size);
  sizeRef.current = size;

  const clientRef = useRef<TilingClient | null>(null);
  const schedulerRef = useRef<QueryScheduler<UnrootedQueryRequest> | null>(null);
  const rendererRef = useRef<MapRenderer | null>(null);
  const lastCutRef = useRef<ViewportCut | null>(null);
  const drawStatsRef = useRef<MapRenderStats | null>(null);
  const reqSeqRef = useRef(0);
  const rafRef = useRef(0);
  const urlTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inertiaRef = useRef(0);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const velocityRef = useRef({ vx: 0, vy: 0, t: 0 });

  // --- draw ------------------------------------------------------------------
  const draw = useCallback((): void => {
    rafRef.current = 0;
    const renderer = rendererRef.current;
    const { width, height } = sizeRef.current;
    if (!renderer || width <= 0 || height <= 0) return;
    const dpr = Math.min(2, (typeof devicePixelRatio === 'number' ? devicePixelRatio : 1) || 1);
    const stats = renderer.render(camRef.current, width, height, dpr);
    drawStatsRef.current = stats;
    setDrawInfo({
      drawMs: stats.drawMs,
      drawCalls: stats.drawCalls,
      scale: camRef.current.scale,
      capped: stats.capped,
    });
  }, []);

  const scheduleDraw = useCallback((): void => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(draw);
  }, [draw]);

  // --- queries -----------------------------------------------------------------
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

  // --- URL ---------------------------------------------------------------------
  const writeUrl = useCallback((): void => {
    if (!syncUrl || typeof window === 'undefined') return;
    const cam = camRef.current;
    const hash = mapStateToHash({
      seed: worldRef.current.seed,
      budget: worldRef.current.budget,
      cx: cam.cx,
      cy: cam.cy,
      scale: cam.scale,
    });
    if (window.location.hash !== hash) {
      window.history.replaceState(window.history.state, '', hash);
    }
  }, [syncUrl]);

  const writeUrlSoon = useCallback((): void => {
    if (!syncUrl) return;
    if (urlTimerRef.current) clearTimeout(urlTimerRef.current);
    urlTimerRef.current = setTimeout(() => {
      urlTimerRef.current = null;
      writeUrl();
    }, 400);
  }, [syncUrl, writeUrl]);

  const onCameraChanged = useCallback((): void => {
    scheduleDraw();
    requestQuery();
    writeUrlSoon();
  }, [scheduleDraw, requestQuery, writeUrlSoon]);

  // --- client + scheduler lifecycle ---------------------------------------------
  useEffect(() => {
    const client = createTilingClient({ forceSync: props.forceSyncClient });
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
        setQueryError(null);
        setHud({
          count: res.cut.count,
          cutLevel: res.cut.cutLevel,
          ancestorLevel: res.cut.ancestorLevel,
          queryMs: ms,
          truncated: res.cut.truncated,
        });
        scheduleDraw();
      },
      onError: (err) => {
        setQueryError(err instanceof Error ? err.message : String(err));
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
      if (urlTimerRef.current) clearTimeout(urlTimerRef.current);
      urlTimerRef.current = null;
    };
  }, [props.forceSyncClient, scheduleDraw]);

  // --- renderer creation (after the container has a real size) -------------------
  useEffect(() => {
    if (rendererRef.current || mode === 'unsupported') return;
    const canvas = canvasRef.current;
    if (!canvas || size.width <= 0 || size.height <= 0) return;
    const factory =
      props.rendererFactory ??
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
      if (lastCutRef.current) renderer.setCut(lastCutRef.current);
      scheduleDraw();
      requestQuery();
    }
  }, [size.width, size.height, mode, props.rendererFactory, scheduleDraw, requestQuery]);

  // --- resize / seed / budget --------------------------------------------------
  useEffect(() => {
    if (size.width > 0 && size.height > 0) {
      scheduleDraw();
      requestQuery();
    }
  }, [size.width, size.height, scheduleDraw, requestQuery]);

  useEffect(() => {
    requestQuery();
    writeUrlSoon();
  }, [seed, budget, requestQuery, writeUrlSoon]);

  // --- back/forward: apply external hash changes --------------------------------
  useEffect(() => {
    if (!syncUrl || typeof window === 'undefined') return;
    const onHash = (): void => {
      const st = hashToMapState(window.location.hash);
      const cam = camRef.current;
      const cur: MapUrlState = {
        seed: worldRef.current.seed,
        budget: worldRef.current.budget,
        cx: cam.cx,
        cy: cam.cy,
        scale: cam.scale,
      };
      if (sameMapState(st, cur)) return;
      camRef.current = createCamera(st.cx, st.cy, st.scale);
      setSeed(st.seed);
      setSeedDraft(String(st.seed));
      setBudget(st.budget);
      scheduleDraw();
      requestQuery();
    };
    window.addEventListener('hashchange', onHash);
    window.addEventListener('popstate', onHash);
    return () => {
      window.removeEventListener('hashchange', onHash);
      window.removeEventListener('popstate', onHash);
    };
  }, [syncUrl, scheduleDraw, requestQuery]);

  // --- interactions --------------------------------------------------------------
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

  // --- e2e/debug handle -----------------------------------------------------------
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const w = window as unknown as Record<string, unknown>;
    w.__SPECTRE_MAP = {
      getCamera: () => camRef.current,
      setCamera: (c: Partial<MapCamera>) => {
        camRef.current = createCamera(
          c.cx ?? camRef.current.cx,
          c.cy ?? camRef.current.cy,
          c.scale ?? camRef.current.scale,
        );
        onCameraChanged();
      },
      getState: () => ({
        hud: hudRef.current,
        draw: drawStatsRef.current,
        mode: rendererRef.current?.mode ?? null,
        busy: schedulerRef.current?.inFlight ?? false,
      }),
    };
    return () => {
      delete w.__SPECTRE_MAP;
    };
  }, [onCameraChanged]);

  // --- form handlers ----------------------------------------------------------------
  const onSeedSubmit = useCallback(
    (e: React.FormEvent): void => {
      e.preventDefault();
      const n = Number(seedDraft.trim());
      if (!Number.isFinite(n)) {
        setSeedDraft(String(worldRef.current.seed));
        return;
      }
      const next = Math.floor(n) >>> 0;
      setSeedDraft(String(next));
      setSeed(next);
      setHud(null); // the old world's numbers no longer apply
    },
    [seedDraft],
  );

  const resetView = useCallback((): void => {
    stopInertia();
    camRef.current = createCamera(0, 0, DEFAULT_SCALE);
    onCameraChanged();
  }, [onCameraChanged, stopInertia]);

  // --- render -------------------------------------------------------------------------
  const tilesPerGlyph =
    hud && hud.cutLevel > 0 ? Math.round(SUBSTITUTION_GROWTH ** hud.cutLevel) : 1;

  return (
    <section className="map-page">
      <header className="map-header">
        <div className="map-title">
          <h1>The Infinite Map</h1>
          <p className="muted">
            One endless spectre tiling per seed, expanded on demand around the camera — pan and
            zoom without limits.
          </p>
        </div>
        <form className="map-controls" onSubmit={onSeedSubmit}>
          <label className="map-control">
            <span>Seed</span>
            <input
              type="text"
              inputMode="numeric"
              aria-label="World seed"
              value={seedDraft}
              onChange={(e) => setSeedDraft(e.target.value)}
            />
          </label>
          <button type="submit">Reseed</button>
          <label className="map-control">
            <span>Budget</span>
            <select
              aria-label="Instance budget"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
            >
              {MAP_BUDGETS.map((b) => (
                <option key={b} value={b}>
                  {formatBudget(b)}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={resetView}>
            Reset view
          </button>
        </form>
      </header>

      {budget >= 250_000 && (
        <p className="map-caution" role="note">
          Budgets of 250k+ instances can tax integrated GPUs — expect slower frames while zoomed
          out. The LOD cut keeps the map pannable either way.
        </p>
      )}

      <div
        className="map-viewport"
        ref={hostRef}
        role="application"
        aria-label="Infinite spectre map — drag to pan, wheel or pinch to zoom"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        <canvas ref={canvasRef} />

        {mode === 'unsupported' ? (
          <div className="map-warning" data-testid="map-unsupported">
            <strong>No usable canvas renderer.</strong> This page needs WebGL2 (preferred) or a 2D
            canvas context; this browser provides neither, so the map cannot start.
          </div>
        ) : (
          <div className="map-hud" data-testid="map-hud" role="status">
            <span data-testid="hud-mode">{mode === 'pending' ? 'starting…' : mode}</span>
            <span data-testid="hud-instances">
              {(hud?.count ?? 0).toLocaleString('en-US')} instances
            </span>
            <span data-testid="hud-cut">
              {hud
                ? hud.cutLevel === 0
                  ? 'LOD: individual tiles'
                  : `LOD: level-${hud.cutLevel} glyphs (~${tilesPerGlyph.toLocaleString('en-US')} tiles each)`
                : 'LOD: —'}
            </span>
            <span data-testid="hud-depth">
              {hud ? `you are at depth ~${hud.ancestorLevel}` : 'depth ~—'}
            </span>
            <span data-testid="hud-query-ms">
              query {hud ? hud.queryMs.toFixed(1) : '—'} ms
            </span>
            <span data-testid="hud-draw-ms">
              draw {drawInfo ? drawInfo.drawMs.toFixed(1) : '—'} ms ·{' '}
              {drawInfo ? drawInfo.drawCalls : 0} call{drawInfo?.drawCalls === 1 ? '' : 's'}
            </span>
            <span data-testid="hud-zoom">{drawInfo ? formatZoom(drawInfo.scale) : ''}</span>
          </div>
        )}

        {mode === 'canvas2d' && (
          <div className="map-note" data-testid="map-fallback-note">
            WebGL2 unavailable — using the Canvas2D fallback (instance budget capped at{' '}
            {CANVAS2D_MAX_INSTANCES.toLocaleString('en-US')}).
          </div>
        )}
        {hud?.truncated && (
          <div className="map-note" role="note">
            Instance cap hit — zoom out slightly or raise the budget.
          </div>
        )}
        {queryError && (
          <div className="map-warning" role="alert">
            Tiling query failed: {queryError}
          </div>
        )}
      </div>

      <p className="muted map-help">
        Drag to pan (with a flick for inertia) · mouse wheel or pinch to zoom at the cursor ·
        outlines fade in once tiles pass ~10 px · the URL hash tracks seed and camera, so any
        view is shareable.
      </p>
    </section>
  );
}

export default MapPage;
