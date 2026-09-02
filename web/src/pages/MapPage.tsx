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
  DEFAULT_FIND_CEILING,
  DEFAULT_FOUND_HOLD,
  MIN_FIND_CEILING,
  FAMILIES,
  FAMILY_DISPLAY_NAMES,
  FIND_CEILINGS,
  clampFindCeiling,
  clampFoundHold,
  DEFAULT_FOLLOW_DAMPING,
  DEFAULT_LINE_SCALE,
  DEFAULT_TRACE_PACE,
  DEFAULT_TRAIL_HOLD,
  LINE_SCALE_STEP,
  MAX_FOLLOW_DAMPING,
  MIN_FOLLOW_DAMPING,
  MIN_LINE_SCALE,
  MIN_TRACE_PACE,
  clampFollowDamping,
  clampTrailHold,
  SUBSTITUTION_GROWTH,
  TILE_PALETTES,
  comboToMatchingIndices,
  edgesToSubset,
  leafOrder,
  rgbToCss,
  subsetToString,
  type TileFamilyId,
} from '../core';
import { EdgeSubsetPicker } from '../components';
import { copyText, shareLinkBase } from '../hooks/shareLink';
import { DEFAULT_SCALE, createCamera, type MapCamera } from './map/camera';
import { buildLeafChordTable, type LeafChordTable } from './map/chords';
import {
  InfiniteCanvas,
  type InfiniteCanvasApi,
  type InfiniteCanvasStatus,
} from './map/InfiniteCanvas';
import {
  DEFAULT_MAP_STATE,
  MAP_BUDGETS,
  comboLength,
  defaultCombo,
  formatBudget,
  hashToMapState,
  mapStateToHash,
  normalizeCombo,
  sameMapState,
  type MapUrlState,
} from './map/mapUrl';
import { CANVAS2D_MAX_INSTANCES } from './map/canvasRenderer';
import { recordingLabel, useCanvasRecording } from './map/useRecording';
import { TraceTicker } from './map/TraceTicker';
import { TransitionGraph } from './map/TransitionGraph';
import type { GraphSelection } from './map/transitions';
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
  const [family, setFamilyState] = useState<TileFamilyId>(initial.family ?? 'spectre');
  const [budget, setBudget] = useState<number>(initial.budget);
  const [lineWidth, setLineWidth] = useState<number>(initial.lineWidth ?? DEFAULT_LINE_SCALE);
  const [lines, setLines] = useState<boolean>(initial.lines ?? false);
  const [trace, setTrace] = useState<boolean>(initial.trace ?? true);
  const [follow, setFollow] = useState<boolean>(initial.follow ?? true);
  const [hold, setHold] = useState<number>(initial.hold ?? DEFAULT_TRAIL_HOLD);
  const [keepCircuits, setKeepCircuits] = useState<boolean>(initial.keepCircuits ?? true);
  const [keepTails, setKeepTails] = useState<boolean>(initial.keepTails ?? true);
  const [findCircuits, setFindCircuits] = useState<boolean>(initial.findCircuits ?? true);
  const [persistFound, setPersistFound] = useState<boolean>(initial.persistFound ?? true);
  const [showTicker, setShowTicker] = useState<boolean>(initial.showTicker ?? true);
  const [showTransitions, setShowTransitions] = useState<boolean>(
    initial.showTransitions ?? false,
  );
  const [findCeiling, setFindCeiling] = useState<number>(
    clampFindCeiling(initial.findCeiling ?? DEFAULT_FIND_CEILING),
  );
  const [foundHold, setFoundHold] = useState<number>(
    clampFoundHold(initial.foundHold ?? DEFAULT_FOUND_HOLD),
  );
  const [highlightOnScreen, setHighlightOnScreen] = useState<boolean>(
    initial.highlightOnScreen ?? false,
  );
  const [highlightInPath, setHighlightInPath] = useState<boolean>(initial.highlightInPath ?? false);
  /** Graph edge under the pointer — too fast-moving to belong in the URL. */
  /** What the transition graph has picked out, and the run length it wants. */
  const [graphPick, setGraphPick] = useState<GraphSelection | null>(null);
  const [chainLength, setChainLength] = useState<number | null>(null);
  const [pace, setPace] = useState<number | null>(initial.pace ?? null);
  const [damping, setDamping] = useState<number>(
    clampFollowDamping(initial.damping ?? DEFAULT_FOLLOW_DAMPING),
  );
  const [traceSeed, setTraceSeed] = useState<
    readonly [number, number, number, number] | null
  >(initial.traceSeed ?? null);
  const [shareNote, setShareNote] = useState<string | null>(null);
  const [shareFallback, setShareFallback] = useState<string | null>(null);
  const [subset, setSubset] = useState<readonly number[]>(
    initial.subset ?? DEFAULT_MAP_STATE.subset ?? [],
  );
  const [combo, setCombo] = useState<string>(
    normalizeCombo(initial.combo ?? defaultCombo(initial.family ?? 'spectre'), initial.family),
  );
  const [status, setStatus] = useState<InfiniteCanvasStatus>({
    mode: 'pending',
    cut: null,
    draw: null,
    trace: {
      active: false,
      status: null,
      points: 0,
      length: 0,
      circuits: 0,
      found: 0,
      foundSkipped: false,
      foundStale: false,
      tiles: [],
      transitions: [],
      chains: [],
      chainLength: 0,
      steps: 0,
    },
    highlight: { onScreen: 0, inPath: 0 },
    error: null,
    size: { width: 0, height: 0 },
  });

  const apiRef = useRef<InfiniteCanvasApi | null>(null);
  const camRef = useRef<MapCamera>(createCamera(initial.cx, initial.cy, initial.scale));
  const statusRef = useRef(status);
  statusRef.current = status;
  const urlTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const worldRef = useRef({
    seed,
    family,
    budget,
    lines,
    trace,
    follow,
    hold,
    keepCircuits,
    keepTails,
    findCircuits,
    persistFound,
    showTicker,
    showTransitions,
    findCeiling,
    foundHold,
    highlightOnScreen,
    highlightInPath,
    pace,
    damping,
    traceSeed,
    subset,
    combo,
    lineWidth,
  });
  worldRef.current = {
    seed,
    family,
    budget,
    lines,
    trace,
    follow,
    hold,
    keepCircuits,
    keepTails,
    findCircuits,
    persistFound,
    showTicker,
    showTransitions,
    findCeiling,
    foundHold,
    highlightOnScreen,
    highlightInPath,
    pace,
    damping,
    traceSeed,
    subset,
    combo,
    lineWidth,
  };

  // --- strand chords ----------------------------------------------------------
  const matching = useMemo(
    () => comboToMatchingIndices(family, subset, combo),
    [family, subset, combo],
  );
  const chords = useMemo<LeafChordTable | null>(
    () => (lines ? buildLeafChordTable(family, subset, matching) : null),
    [lines, family, subset, matching],
  );

  const renderStyle = useMemo<MapRenderStyle>(
    () => ({ lineScale: lineWidth }),
    [lineWidth],
  );

  /** Leaf type names in wire-byte order, for the ticker and the graph. */
  const leafNames = useMemo(() => leafOrder(family), [family]);

  /** Tile colours for the ticker: the map draws the default palette. */
  const leafCss = useMemo(
    () => leafNames.map((t) => rgbToCss(TILE_PALETTES.bright[t] ?? [200, 200, 200])),
    [leafNames],
  );

  // --- URL ---------------------------------------------------------------------
  /** Canonical hash for the CURRENT state — fresher than the debounced URL. */
  const currentHash = useCallback((): string => {
    const cam = camRef.current;
    const w = worldRef.current;
    return mapStateToHash({
      seed: w.seed,
      family: w.family,
      budget: w.budget,
      lineWidth: w.lineWidth,
      cx: cam.cx,
      cy: cam.cy,
      scale: cam.scale,
      lines: w.lines,
      trace: w.trace,
      follow: w.follow,
      hold: w.hold,
      keepCircuits: w.keepCircuits,
      keepTails: w.keepTails,
      findCircuits: w.findCircuits,
      persistFound: w.persistFound,
      showTicker: w.showTicker,
      showTransitions: w.showTransitions,
      findCeiling: w.findCeiling,
      foundHold: w.foundHold,
      highlightOnScreen: w.highlightOnScreen,
      highlightInPath: w.highlightInPath,
      pace: w.pace,
      damping: w.damping,
      traceSeed: w.traceSeed,
      subset: w.subset,
      combo: w.combo,
    });
  }, []);

  const writeUrl = useCallback((): void => {
    if (!syncUrl || typeof window === 'undefined') return;
    const hash = currentHash();
    if (window.location.hash !== hash) {
      window.history.replaceState(window.history.state, '', hash);
    }
  }, [syncUrl, currentHash]);

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
  }, [
    seed,
    family,
    budget,
    lines,
    trace,
    follow,
    hold,
    keepCircuits,
    keepTails,
    findCircuits,
    persistFound,
    showTicker,
    showTransitions,
    findCeiling,
    foundHold,
    highlightOnScreen,
    highlightInPath,
    pace,
    damping,
    traceSeed,
    subset,
    combo,
    lineWidth,
    writeUrlSoon,
  ]);

  // --- back/forward: apply external hash changes --------------------------------
  useEffect(() => {
    if (!syncUrl || typeof window === 'undefined') return;
    const onHash = (): void => {
      const st = hashToMapState(window.location.hash);
      const cam = camRef.current;
      const w = worldRef.current;
      const cur: MapUrlState = {
        seed: w.seed,
        family: w.family,
        budget: w.budget,
        lineWidth: w.lineWidth,
          cx: cam.cx,
        cy: cam.cy,
        scale: cam.scale,
        lines: w.lines,
        trace: w.trace,
        follow: w.follow,
        hold: w.hold,
        keepCircuits: w.keepCircuits,
        keepTails: w.keepTails,
        findCircuits: w.findCircuits,
        persistFound: w.persistFound,
        showTicker: w.showTicker,
        showTransitions: w.showTransitions,
        findCeiling: w.findCeiling,
        foundHold: w.foundHold,
        highlightOnScreen: w.highlightOnScreen,
        highlightInPath: w.highlightInPath,
        pace: w.pace,
        traceSeed: w.traceSeed,
        subset: w.subset,
        combo: w.combo,
      };
      if (sameMapState(st, cur)) return;
      // The camera ref must lead the setters: a family change remounts the
      // canvas, and the new mount reads its initial camera from this ref.
      camRef.current = createCamera(st.cx, st.cy, st.scale);
      setSeed(st.seed);
      setSeedDraft(String(st.seed));
      setFamilyState(st.family ?? 'spectre');
      setBudget(st.budget);
      setLineWidth(st.lineWidth ?? DEFAULT_LINE_SCALE);
      setLines(st.lines ?? false);
      setTrace(st.trace ?? true);
      setFollow(st.follow ?? true);
      setHold(st.hold ?? DEFAULT_TRAIL_HOLD);
      setKeepCircuits(st.keepCircuits ?? true);
      setKeepTails(st.keepTails ?? true);
      setFindCircuits(st.findCircuits ?? true);
      setPersistFound(st.persistFound ?? true);
      setShowTicker(st.showTicker ?? true);
      setShowTransitions(st.showTransitions ?? false);
      setFindCeiling(clampFindCeiling(st.findCeiling ?? DEFAULT_FIND_CEILING));
      setFoundHold(clampFoundHold(st.foundHold ?? DEFAULT_FOUND_HOLD));
      setHighlightOnScreen(st.highlightOnScreen ?? false);
      setHighlightInPath(st.highlightInPath ?? false);
      setPace(st.pace ?? null);
      setDamping(clampFollowDamping(st.damping ?? DEFAULT_FOLLOW_DAMPING));
      setTraceSeed(st.traceSeed ?? null);
      setSubset(st.subset ?? []);
      setCombo(normalizeCombo(st.combo ?? '', st.family));
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

  // --- video recording (shared wiring: `pages/map/useRecording.ts`) -----------
  const rec = useCanvasRecording(apiRef, family, seed);
  const { stopAndSave: stopAndSaveRecording } = rec;

  /**
   * Switching family is switching worlds: the canvas remounts (`key`), so the
   * trace, kept circuits and chord index die with it — but the page-side state
   * that describes the old world has to go too, or a spectre chase seed and a
   * ten-digit combo would be replayed into a hexagon tiling.
   */
  const setFamily = useCallback((next: TileFamilyId): void => {
    if (next === worldRef.current.family) return;
    // A family switch REMOUNTS the canvas, whose unmount discards a live
    // recording's chunks — save the take first rather than lose it silently.
    if (apiRef.current?.isRecording()) void stopAndSaveRecording();
    setFamilyState(next);
    setCombo((c) => normalizeCombo(c, next));
    setTraceSeed(null);
    setGraphPick(null);
    setChainLength(null);
    setStatus((s) => ({ ...s, cut: null })); // the old world's numbers no longer apply
  }, [stopAndSaveRecording]);

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
            One endless {FAMILY_DISPLAY_NAMES[family]} tiling per seed, expanded on demand around
            the camera — pan and zoom without limits.
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
            <span>Family</span>
            <select
              aria-label="Tile family"
              data-testid="map-family"
              value={family}
              onChange={(e) => setFamily(e.target.value as TileFamilyId)}
            >
              {FAMILIES.map((f) => (
                <option key={f} value={f}>
                  {FAMILY_DISPLAY_NAMES[f]}
                </option>
              ))}
            </select>
          </label>
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
          <button type="button" onClick={resetView}>
            Reset view
          </button>
          <button
            type="button"
            className={rec.recording ? 'map-record is-recording' : 'map-record'}
            data-testid="map-record"
            aria-pressed={rec.recording}
            title="Record the canvas — tiles, strands and the chase — to a movie file"
            onClick={rec.toggle}
          >
            {recordingLabel(rec.recording, rec.elapsed)}
          </button>
        </form>
      </header>

      {rec.note ? (
        <p className="muted map-record-note" role="status" data-testid="map-record-note">
          {rec.note}
        </p>
      ) : null}

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
              disabled={!status.trace.active && status.trace.circuits === 0}
              onClick={() => apiRef.current?.clearTrace()}
            >
              Clear
            </button>
          </div>

          <div className="control-row">
            <label className="control-row">
              <input
                type="checkbox"
                aria-label="Auto-follow the traced strand"
                data-testid="map-follow"
                checked={follow}
                disabled={!lines || !trace}
                onChange={(e) => setFollow(e.target.checked)}
              />
              <span>Auto-follow the strand</span>
            </label>
            <label className="control-row">
              <span>Hold</span>
              <input
                type="number"
                aria-label="Most trail tiles held while following, 0 for the whole trail"
                data-testid="map-trail-hold"
                min={0}
                step={500}
                value={hold}
                disabled={!lines || !trace || !follow}
                onChange={(e) => setHold(clampTrailHold(Number(e.target.value)))}
              />
              <span className="muted">tiles · 0 = all</span>
            </label>
            <label className="control-row">
              <span>Damping</span>
              {/* Log-scaled: the range spans 0.25×–30×, and the everyday
                  settings all live under 3× — a linear track would cram them
                  into its first tenth. */}
              <input
                type="range"
                aria-label="Follow-camera damping"
                data-testid="map-damping"
                min={Math.log(MIN_FOLLOW_DAMPING)}
                max={Math.log(MAX_FOLLOW_DAMPING)}
                step="any"
                value={Math.log(damping)}
                disabled={!lines || !trace || !follow}
                onChange={(e) => setDamping(clampFollowDamping(Math.exp(Number(e.target.value))))}
              />
              <span className="muted">
                {damping >= 10 ? damping.toFixed(1) : damping.toFixed(2)}×
              </span>
            </label>
          </div>

          <div className="control-row">
            <label className="control-row">
              <input
                type="checkbox"
                aria-label="Keep closed circuits coloured"
                data-testid="map-keep-circuits"
                checked={keepCircuits}
                disabled={!lines || !trace}
                onChange={(e) => setKeepCircuits(e.target.checked)}
              />
              <span>Keep closed circuits coloured</span>
            </label>
            <label className="control-row">
              <input
                type="checkbox"
                aria-label="Keep dead-ended strands coloured"
                data-testid="map-keep-tails"
                checked={keepTails}
                disabled={!lines || !trace}
                onChange={(e) => setKeepTails(e.target.checked)}
              />
              <span>Keep tails &amp; part-chases coloured</span>
            </label>
            <label className="control-row">
              <input
                type="checkbox"
                aria-label="Find all circuits on screen"
                data-testid="map-find-circuits"
                checked={findCircuits}
                disabled={!lines}
                onChange={(e) => setFindCircuits(e.target.checked)}
              />
              <span>Find all circuits on screen</span>
            </label>
            <label className="control-row">
              <input
                type="checkbox"
                aria-label="Keep found circuits on screen when zoomed out"
                data-testid="map-persist-found"
                checked={persistFound}
                disabled={!lines || !findCircuits}
                onChange={(e) => setPersistFound(e.target.checked)}
              />
              <span>Keep them when you zoom out</span>
            </label>
            <label className="control-row">
              <span>Tiles per find pass</span>
              <input
                type="number"
                min={MIN_FIND_CEILING}
                step={1000}
                list="map-find-ceiling-suggestions"
                aria-label="How many tiles find-all may analyse at once"
                data-testid="map-find-ceiling"
                value={findCeiling}
                disabled={!lines}
                onChange={(e) => setFindCeiling(clampFindCeiling(Number(e.target.value)))}
              />
              <datalist id="map-find-ceiling-suggestions">
                {FIND_CEILINGS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </label>
            <label className="control-row">
              <span>Circuits to hold</span>
              <input
                type="number"
                min={0}
                step={500}
                aria-label="How many found circuits to keep, 0 for no limit"
                data-testid="map-found-hold"
                value={foundHold}
                disabled={!lines || !findCircuits}
                onChange={(e) => setFoundHold(clampFoundHold(Number(e.target.value)))}
              />
              <span className="muted">0 = no limit</span>
            </label>
            <label className="control-row">
              <input
                type="checkbox"
                aria-label="Show the ticker of tiles the chase crosses"
                data-testid="map-show-ticker"
                checked={showTicker}
                disabled={!lines || !trace}
                onChange={(e) => setShowTicker(e.target.checked)}
              />
              <span>Name the tiles a chase crosses</span>
            </label>
            <label className="control-row">
              <input
                type="checkbox"
                aria-label="Show the tile-type transition graph"
                data-testid="map-show-transitions"
                checked={showTransitions}
                disabled={!lines || !trace}
                onChange={(e) => setShowTransitions(e.target.checked)}
              />
              <span>Graph which type follows which</span>
            </label>
            <button
              type="button"
              data-testid="map-circuit-zoom"
              disabled={!lines}
              onClick={() => apiRef.current?.zoomToCircuitView()}
            >
              Circuit zoom
            </button>
          </div>

          <div className="control-row">
            <label className="control-row">
              <input
                type="checkbox"
                aria-label="Chase at full speed"
                data-testid="map-pace-full"
                checked={pace === null}
                disabled={!lines || !trace}
                onChange={(e) => setPace(e.target.checked ? null : DEFAULT_TRACE_PACE)}
              />
              <span>Full-speed chase</span>
            </label>
            {pace !== null ? (
              <label className="control-row">
                <span>Pace</span>
                <input
                  type="range"
                  aria-label="Chase pace in tiles per second"
                  data-testid="map-pace-slider"
                  min={MIN_TRACE_PACE}
                  max={240}
                  step={1}
                  value={Math.min(pace, 240)}
                  disabled={!lines || !trace}
                  onChange={(e) => setPace(Number(e.target.value))}
                />
                <span className="muted">{pace} tiles/s</span>
              </label>
            ) : null}
          </div>

          <div className="control-row">
            <button
              type="button"
              data-testid="map-share-chase"
              disabled={!traceSeed}
              onClick={() => {
                const url = `${shareLinkBase().split('#')[0]}${currentHash()}`;
                void copyText(url).then((ok) => {
                  if (ok) {
                    setShareFallback(null);
                    setShareNote('Link copied — it replays this chase from the same chord.');
                  } else {
                    setShareNote('Copying is blocked here — select the link below and copy it.');
                    setShareFallback(url);
                  }
                });
              }}
            >
              Copy share link
            </button>
            {shareNote ? (
              <span className="muted" role="status">
                {shareNote}
              </span>
            ) : null}
            {shareFallback ? (
              <input
                data-testid="map-share-fallback"
                aria-label="Share link"
                readOnly
                value={shareFallback}
                style={{ width: '100%' }}
                onFocus={(e) => e.currentTarget.select()}
                onClick={(e) => e.currentTarget.select()}
              />
            ) : null}
          </div>

          <EdgeSubsetPicker
            family={family}
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
              maxLength={comboLength(family)}
              value={combo}
              onChange={(e) => setCombo(normalizeCombo(e.target.value, family))}
            />
          </label>
          <p className="muted map-lines-help">
            One digit per leaf type ({leafNames.join(', ')}) selecting that type&rsquo;s
            non-crossing matching — the same combination string the stats page and the notebook
            CSVs use. Chords are drawn in ONE flat ink: they are local geometry, not analysed
            circuits, so nothing here is coloured by circuit length.
          </p>
          <p className="muted map-lines-help">
            Tap or click a strand and it is followed onward in one direction, rainbow-coloured over
            its whole length. It runs to the edge of the tiles currently loaded and then waits —
            pan the way it is heading and it keeps going. The line is remembered in world
            coordinates, so pan back and it is still there. Auto-follow does the panning for you:
            the camera rides the strand (wheel-zoom stays yours; dragging pauses it), the Damping
            slider sets how heavily its motion is smoothed — up floats, down snaps — and the
            rainbow holds at most the last &ldquo;hold&rdquo; tiles, letting the tail go behind it —
            the window bounds memory, not distance, so the chase can run forever and still closes
            a circuit even after its start left the window. A strand that closes into a circuit
            stays lit for the next tap while &ldquo;keep closed circuits&rdquo; is on.
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
        key={family}
        seed={seed}
        family={family}
        budget={budget}
        chords={chords}
        trace={lines && trace}
        follow={lines && trace && follow}
        followHold={hold > 0 ? hold : null}
        keepCircuits={lines && trace && keepCircuits}
        keepTails={lines && trace && keepTails}
        findCircuits={lines && findCircuits}
        persistFound={persistFound}
        findCeiling={findCeiling}
        foundHold={foundHold}
        highlight={graphPick}
        highlightOnScreen={highlightOnScreen}
        highlightInPath={highlightInPath}
        chainLength={chainLength}
        followPace={pace}
        followDamping={damping}
        traceSeed={lines && trace ? traceSeed : null}
        onTraceSeed={setTraceSeed}
        style={renderStyle}
        // The live ref, not a load-time snapshot: a family switch remounts
        // the canvas, and the view must stay where the user left it.
        initialCamera={camRef.current}
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
                ? `traced: ${Math.round(status.trace.length).toLocaleString('en-US')} edges long — ${
                    follow && status.trace.status === 'frontier'
                      ? 'chasing…'
                      : describeWalk(status.trace.status)
                  }`
                : lines && trace
                  ? 'traced: tap a strand'
                  : 'traced: off'}
            </span>
            {status.trace.circuits > 0 && (
              <span data-testid="hud-circuits">{status.trace.circuits} kept</span>
            )}
            {(status.trace.found > 0 || status.trace.foundSkipped) && (
              <span data-testid="hud-found">
                {status.trace.foundSkipped
                  ? 'find: zoom in to tiles'
                  : status.trace.foundStale
                    ? `${status.trace.found} circuits held from a closer view`
                    : `${status.trace.found} circuits on screen`}
              </span>
            )}
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

        {showTransitions ? (
          <TransitionGraph
            transitions={status.trace.transitions}
            names={leafNames}
            colors={leafCss}
            className={showTicker ? undefined : 'is-low'}
            chains={status.trace.chains}
            marks={status.highlight}
            chainLength={status.trace.chainLength}
            onChainLength={setChainLength}
            onSelect={setGraphPick}
            highlightOnScreen={highlightOnScreen}
            onToggleOnScreen={() => setHighlightOnScreen((v) => !v)}
            highlightInPath={highlightInPath}
            onToggleInPath={() => setHighlightInPath((v) => !v)}
          />
        ) : null}
        {showTicker ? (
          <TraceTicker
            tiles={status.trace.tiles}
            names={leafNames}
            colors={leafCss}
            steps={status.trace.steps}
          />
        ) : null}

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
