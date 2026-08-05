/**
 * `MapPage` — The Infinite Map (BIGMAP stage 2 + stage 3 strand lines).
 *
 * A WebGL2-instanced, worker-fed viewport over the un-rooted engine: smooth
 * pan (drag + inertia), wheel/pinch zoom-to-cursor, seamless deep zoom and
 * unbounded pan at level-9-equivalent scale and beyond. The viewport itself
 * lives in `pages/map/InfiniteCanvas` (shared with the Explorer's infinite
 * mode); this page owns the chrome, the URL hash and the strand-rule controls.
 *
 * Strand lines (stage 3, part 1): the active edge subset plus each leaf type's
 * matching decide that type's in-tile chords — a purely LOCAL fact, so the
 * lines can be drawn at ANY depth without tracing a single circuit. They are
 * therefore uncoloured: circuit identity/colour is stage 3 part 2 (the
 * hierarchical router), and the HUD never claims more than is drawn.
 *
 * ONE strand can still be coloured, though, and by the same local argument:
 * tap it and `InfiniteCanvas` follows it chord by chord across the tiles that
 * are loaded, painting a rainbow over the length walked. That is a fact about
 * geometry the walk has actually visited — not a claim about the circuit it
 * belongs to, whose global identity still needs the router.
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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_LINE_SCALE,
  LINE_SCALE_STEP,
  MIN_LINE_SCALE,
  SUBSTITUTION_GROWTH,
  comboToMatchingIndices,
  edgesToSubset,
  subsetToString,
} from '../core';
import { EdgeSubsetPicker } from '../components';
import { DEFAULT_SCALE, createCamera, type MapCamera } from './map/camera';
import { buildLeafChordTable, type LeafChordTable } from './map/chords';
import {
  InfiniteCanvas,
  type InfiniteCanvasApi,
  type InfiniteCanvasStatus,
} from './map/InfiniteCanvas';
import {
  COMBO_LENGTH,
  DEFAULT_MAP_STATE,
  MAP_BUDGETS,
  formatBudget,
  hashToMapState,
  mapStateToHash,
  normalizeCombo,
  sameMapState,
  type MapUrlState,
} from './map/mapUrl';
import { CANVAS2D_MAX_INSTANCES } from './map/canvasRenderer';
import { describeWalk } from './map/strandWalk';
import type { MapRenderer } from './map/renderer';
import type { MapRenderStyle } from './map/rendererTypes';
import '../styles/map.css';

export interface MapPageProps {
  /** Mirror state into `location.hash` (default true; tests can opt out). */
  readonly syncUrl?: boolean;
  /** Run tiling queries on the calling thread (tests / no-Worker envs). */
  readonly forceSyncClient?: boolean;
  /** Test seam: replaces `createMapRenderer`. */
  readonly rendererFactory?: (canvas: HTMLCanvasElement) => MapRenderer | null;
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
  const [lineWidth, setLineWidth] = useState<number>(initial.lineWidth ?? DEFAULT_LINE_SCALE);
  const [noOverlap, setNoOverlap] = useState<boolean>(initial.noOverlap ?? false);
  const [lines, setLines] = useState<boolean>(initial.lines ?? false);
  const [trace, setTrace] = useState<boolean>(initial.trace ?? true);
  const [subset, setSubset] = useState<readonly number[]>(
    initial.subset ?? DEFAULT_MAP_STATE.subset ?? [],
  );
  const [combo, setCombo] = useState<string>(
    normalizeCombo(initial.combo ?? DEFAULT_MAP_STATE.combo ?? ''),
  );
  const [status, setStatus] = useState<InfiniteCanvasStatus>({
    mode: 'pending',
    cut: null,
    draw: null,
    trace: { active: false, status: null, points: 0, length: 0 },
    error: null,
    size: { width: 0, height: 0 },
  });

  const apiRef = useRef<InfiniteCanvasApi | null>(null);
  const camRef = useRef<MapCamera>(createCamera(initial.cx, initial.cy, initial.scale));
  const initialCameraRef = useRef<MapCamera>(camRef.current);
  const statusRef = useRef(status);
  statusRef.current = status;
  const urlTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const worldRef = useRef({ seed, budget, lines, trace, subset, combo, lineWidth, noOverlap });
  worldRef.current = { seed, budget, lines, trace, subset, combo, lineWidth, noOverlap };

  // --- strand chords ----------------------------------------------------------
  const matching = useMemo(
    () => comboToMatchingIndices('spectre', subset, combo),
    [subset, combo],
  );
  const chords = useMemo<LeafChordTable | null>(
    () => (lines ? buildLeafChordTable(subset, matching) : null),
    [lines, subset, matching],
  );

  const renderStyle = useMemo<MapRenderStyle>(
    () => ({ lineScale: lineWidth, noOverlap }),
    [lineWidth, noOverlap],
  );

  // --- URL ---------------------------------------------------------------------
  const writeUrl = useCallback((): void => {
    if (!syncUrl || typeof window === 'undefined') return;
    const cam = camRef.current;
    const w = worldRef.current;
    const hash = mapStateToHash({
      seed: w.seed,
      budget: w.budget,
      lineWidth: w.lineWidth,
      noOverlap: w.noOverlap,
      cx: cam.cx,
      cy: cam.cy,
      scale: cam.scale,
      lines: w.lines,
      trace: w.trace,
      subset: w.subset,
      combo: w.combo,
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

  useEffect(
    () => () => {
      if (urlTimerRef.current) clearTimeout(urlTimerRef.current);
      urlTimerRef.current = null;
    },
    [],
  );

  const onCameraChange = useCallback(
    (cam: MapCamera): void => {
      camRef.current = cam;
      writeUrlSoon();
    },
    [writeUrlSoon],
  );

  useEffect(() => {
    writeUrlSoon();
  }, [seed, budget, lines, trace, subset, combo, lineWidth, noOverlap, writeUrlSoon]);

  // --- back/forward: apply external hash changes --------------------------------
  useEffect(() => {
    if (!syncUrl || typeof window === 'undefined') return;
    const onHash = (): void => {
      const st = hashToMapState(window.location.hash);
      const cam = camRef.current;
      const w = worldRef.current;
      const cur: MapUrlState = {
        seed: w.seed,
        budget: w.budget,
        lineWidth: w.lineWidth,
        noOverlap: w.noOverlap,
        cx: cam.cx,
        cy: cam.cy,
        scale: cam.scale,
        lines: w.lines,
        trace: w.trace,
        subset: w.subset,
        combo: w.combo,
      };
      if (sameMapState(st, cur)) return;
      setSeed(st.seed);
      setSeedDraft(String(st.seed));
      setBudget(st.budget);
      setLineWidth(st.lineWidth ?? DEFAULT_LINE_SCALE);
      setNoOverlap(st.noOverlap ?? false);
      setLines(st.lines ?? false);
      setTrace(st.trace ?? true);
      setSubset(st.subset ?? []);
      setCombo(normalizeCombo(st.combo ?? ''));
      apiRef.current?.setCamera({ cx: st.cx, cy: st.cy, scale: st.scale });
    };
    window.addEventListener('hashchange', onHash);
    window.addEventListener('popstate', onHash);
    return () => {
      window.removeEventListener('hashchange', onHash);
      window.removeEventListener('popstate', onHash);
    };
  }, [syncUrl]);

  // --- e2e/debug handle -----------------------------------------------------------
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const w = window as unknown as Record<string, unknown>;
    w.__SPECTRE_MAP = {
      getCamera: () => camRef.current,
      setCamera: (c: Partial<MapCamera>) => apiRef.current?.setCamera(c),
      getState: () => ({
        hud: statusRef.current.cut,
        draw: statusRef.current.draw,
        mode: statusRef.current.mode === 'pending' ? null : statusRef.current.mode,
        busy: apiRef.current?.isBusy() ?? false,
        lines: worldRef.current.lines,
        chords: chords?.chordCount ?? 0,
      }),
    };
    return () => {
      delete w.__SPECTRE_MAP;
    };
  }, [chords]);

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
      setStatus((s) => ({ ...s, cut: null })); // the old world's numbers no longer apply
    },
    [seedDraft],
  );

  const resetView = useCallback((): void => {
    apiRef.current?.setCamera({ cx: 0, cy: 0, scale: DEFAULT_SCALE });
  }, []);

  // --- render -------------------------------------------------------------------------
  const hud = status.cut;
  const drawInfo = status.draw;
  const mode = status.mode;
  const tilesPerGlyph =
    hud && hud.cutLevel > 0 ? Math.round(SUBSTITUTION_GROWTH ** hud.cutLevel) : 1;
  const aggregateCut = !!hud && hud.cutLevel > 0;
  const chordsPerTile = chords?.maxChords ?? 0;
  const noChords = lines && (!chords || chords.chordCount === 0);

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
          <label className="map-control">
            <span>Line weight</span>
            <input
              type="number"
              aria-label="Strand line thickness"
              data-testid="map-line-width"
              min={MIN_LINE_SCALE}
              step={LINE_SCALE_STEP}
              value={lineWidth}
              disabled={!lines}
              onChange={(e) => setLineWidth(Number(e.target.value))}
            />
          </label>
          <label className="map-control map-control-check">
            <input
              type="checkbox"
              aria-label="Clip overlapping strands at the midpoint"
              data-testid="map-no-overlap"
              checked={noOverlap}
              disabled={!lines}
              onChange={(e) => setNoOverlap(e.target.checked)}
            />
            <span>Meet at midpoint</span>
          </label>
          <button type="button" onClick={resetView}>
            Reset view
          </button>
        </form>
      </header>

      <details className="map-lines" open={lines}>
        <summary>
          Strand lines{' '}
          <span className="muted">
            — {lines ? `rule ${subsetToString(edgesToSubset(subset)) || 'none'}/${combo}` : 'off'}
          </span>
        </summary>
        <div className="map-lines-body">
          <label className="control-row map-lines-toggle">
            <input
              type="checkbox"
              aria-label="Show strand lines"
              checked={lines}
              onChange={(e) => setLines(e.target.checked)}
            />
            <span>Show lines</span>
          </label>

          <div className="control-row">
            <label className="control-row">
              <input
                type="checkbox"
                aria-label="Tap a strand to colour it"
                data-testid="map-trace"
                checked={trace}
                disabled={!lines}
                onChange={(e) => setTrace(e.target.checked)}
              />
              <span>Tap to colour a strand</span>
            </label>
            <button
              type="button"
              data-testid="map-trace-clear"
              disabled={!status.trace.active}
              onClick={() => apiRef.current?.clearTrace()}
            >
              Clear
            </button>
          </div>

          <EdgeSubsetPicker
            family="spectre"
            subset={subset}
            advanced={false}
            onSubsetChange={setSubset}
          />

          <label className="control-row">
            <span>Matchings</span>
            <input
              type="text"
              className="map-combo-input"
              aria-label="Combination string"
              spellCheck={false}
              maxLength={COMBO_LENGTH}
              value={combo}
              onChange={(e) => setCombo(normalizeCombo(e.target.value))}
            />
          </label>
          <p className="muted map-lines-help">
            One digit per leaf type (Delta, Theta, Lambda, Xi, Pi, Sigma, Phi, Psi, Gamma2,
            Gamma1) selecting that type&rsquo;s non-crossing matching — the same combination string
            the stats page and the notebook CSVs use. Chords are drawn in ONE flat ink: they are
            local geometry, not analysed circuits, so nothing here is coloured by circuit length.
          </p>
          <p className="muted map-lines-help">
            Tap or click a strand and it is followed onward in one direction, rainbow-coloured over
            its whole length. It runs to the edge of the tiles currently loaded and then waits —
            pan the way it is heading and it keeps going. The line is remembered in world
            coordinates, so pan back and it is still there.
          </p>
          {noChords ? (
            <p className="warning-badge" role="status">
              This rule gives no drawable chords — every leaf type has fewer than two connection
              points, or an odd number of them.
            </p>
          ) : null}
        </div>
      </details>

      {budget >= 250_000 && (
        <p className="map-caution" role="note">
          Big budgets buy detail at far zoom — a level of real tiles instead of glyphs — and cost
          query time, not frame time: the engine walk is single-threaded on the CPU, so a fast GPU
          does not speed it up. The top tier can take a second or more per view change, and holds
          ~200&nbsp;MB of scratch in the worker for the session.
        </p>
      )}

      <InfiniteCanvas
        seed={seed}
        budget={budget}
        chords={chords}
        trace={lines && trace}
        style={renderStyle}
        initialCamera={initialCameraRef.current}
        apiRef={apiRef}
        onCameraChange={onCameraChange}
        onStatusChange={setStatus}
        forceSyncClient={props.forceSyncClient}
        rendererFactory={props.rendererFactory}
      >
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
            <span data-testid="hud-lines">
              {!lines
                ? 'lines: off'
                : aggregateCut
                  ? 'lines: hidden (aggregate LOD — zoom in for tiles)'
                  : `lines: ${(drawInfo?.chordsDrawn ?? 0).toLocaleString('en-US')} chords (${chordsPerTile}/tile)`}
            </span>
            <span data-testid="hud-trace">
              {status.trace.active && status.trace.status
                ? `traced: ${Math.round(status.trace.length).toLocaleString('en-US')} tiles long — ${describeWalk(status.trace.status)}`
                : lines && trace
                  ? 'traced: tap a strand'
                  : 'traced: off'}
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
        {status.error && (
          <div className="map-warning" role="alert">
            Tiling query failed: {status.error}
          </div>
        )}
      </InfiniteCanvas>

      <p className="muted map-help">
        Drag to pan (with a flick for inertia) · mouse wheel or pinch to zoom at the cursor ·
        outlines fade in once tiles pass ~10 px · strand lines draw at the tile LOD only · the URL
        hash tracks seed, camera and strand rule, so any view is shareable.
      </p>
    </section>
  );
}

export default MapPage;
