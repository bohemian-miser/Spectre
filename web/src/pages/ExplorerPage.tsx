/**
 * `ExplorerPage` — the tiling explorer (DESIGN.md §7.1).
 *
 * A full rebuild of the old p5 app on the widget layer: family / root tile /
 * level, the valid-subset picker, per-tile matching editors, the straight-line
 * overlay tool, display + colour controls, worker-backed circuit analysis, and
 * a scene that round-trips through the URL hash (§9).
 *
 * Two performance rules shape the code:
 *  - the page never re-renders while panning. `PanZoom` owns the camera and
 *    hands it to the renderer through its render prop, so a level-4 patch
 *    (~4 400 `<use>` nodes, memoized inside `TilingView`) is reconciled by
 *    reference and only the camera transform attribute changes;
 *  - analysis is `useCircuitAnalysis`, which runs level ≥ 3 in the worker with
 *    newest-request-wins cancellation, so slider scrubbing never blocks input.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_CONTRACTS,
  FAMILIES,
  FAMILY_DISPLAY_NAMES,
  FLAG,
  MAX_LEVEL,
  SUBSTITUTION_GROWTH,
  TILE_NAMES,
  TILE_PALETTES,
  familyMajors,
  formatComboShareString,
  hexToRgb,
  leafOrder,
  matchingIndicesToCombo,
  metaEdges,
  mul,
  supportsInfiniteMode,
  svgMatrixString,
  type EdgeContract,
  type Rgb,
  type TileFamilyId,
  type TileTypeId,
} from '../core';
import {
  CircuitLayer,
  ColorSchemePicker,
  ContractSlider,
  DisplayToggles,
  EdgeSubsetPicker,
  MatchingSlider,
  PanZoom,
  SharePanel,
  StatsSummary,
  TilePalette,
  TilingCanvas,
  TilingView,
  type EdgeRef,
  type PanZoomApi,
} from '../components';
import { edgeClassColor } from '../lib/palette';
import { useCircuitAnalysis } from '../hooks/useCircuitAnalysis';
import { useExplorerStore } from '../hooks/useExplorerState';
import { explorerBudget, explorerMode, hasFlag } from '../lib/explorerReducer';
import { matchingVectorToRecord } from '../lib/matchingModel';
import { buildTilingModel } from '../lib/tilingModel';
import { overlayChordsD, pathBox, pathsOfLength } from '../lib/overlayPaths';
import { EXPLORER_ROUTE } from '../lib/urlState';
import { expandBox, roundCamera, transformBox } from '../lib/viewport';
import { sceneFilename, serializeSceneSvg } from '../lib/exportScene';
import { downloadBlob, downloadText, svgTextToPngBlob } from './sceneDownload';
import { createCamera, levelForScale, scaleForLevel } from './map/camera';
import { buildLeafChordTable } from './map/chords';
import {
  InfiniteCanvas,
  type InfiniteCanvasApi,
  type InfiniteCanvasStatus,
} from './map/InfiniteCanvas';
import type { MapRenderStyle } from './map/rendererTypes';
import { MAP_BUDGETS, formatBudget } from './map/mapUrl';
import { DEFAULT_LINE_COLOR, LIGHT_LINE_COLOR } from './map/webglRenderer';
import '../styles/map.css';

export type OverlayTool = 'cursor' | 'line' | 'erase';

/** SVG renderer ceiling; above this the Canvas2D renderer takes over (§5.2). */
const SVG_MAX_LEVEL = 4;
/**
 * Deepest level the rooted view will actually flatten. Tiles grow ≈7.87× per
 * level (level 7 ≈ 2.1M, level 8 ≈ 17M), so this is where materializing stops
 * being something a browser tab survives.
 */
const ROOTED_MATERIALIZE_MAX = 7;
/** Overlay chords are `<use>`d per instance; skip past this many tiles. */
const OVERLAY_BUDGET = 6000;
const OVERLAY_DEF_PREFIX = 'ex-ov';
/**
 * World seed for the Explorer's infinite mode. Fixed on purpose: the Explorer
 * is about a CONFIGURATION (rule + matchings), not about which of the 2^32
 * plane-fillings you happen to be standing in. The Infinite Map page owns the
 * seed control.
 */
const INFINITE_SEED = 1;
/**
 * Budgets at or above this are worth a word of warning: the cost is the
 * single-threaded engine walk in the worker, not the GPU, so a fast graphics
 * card does not buy it back.
 */
const HEAVY_BUDGET = 2_000_000;

export interface ExplorerPageProps {
  /** Mirror state into `location.hash` (default true; tests can opt out). */
  readonly syncUrl?: boolean;
  readonly route?: string;
}

export function ExplorerPage(props: ExplorerPageProps): JSX.Element {
  const route = props.route ?? EXPLORER_ROUTE;
  const { state, dispatch } = useExplorerStore({ syncUrl: props.syncUrl ?? true, route });

  const family = state.family;
  const order = useMemo(() => leafOrder(family), [family]);
  const selected = useMemo(() => new Set(state.subset), [state.subset]);
  const curvy = hasFlag(state, FLAG.CURVY) && family !== 'hex';
  const linesOn = hasFlag(state, FLAG.LINES);
  const nonCrossingOnly = hasFlag(state, FLAG.NON_CROSSING_ONLY);
  const mode = explorerMode(state);
  const budget = explorerBudget(state);
  const infinite = mode === 'infinite';
  const infiniteAvailable = supportsInfiniteMode(family);

  const [hoverEdge, setHoverEdge] = useState<EdgeRef | null>(null);
  const [hoverMajor, setHoverMajor] = useState<number | null>(null);
  const [highlightLength, setHighlightLength] = useState<number | null>(null);
  const [, setExampleIndex] = useState(0);
  const [tool, setTool] = useState<OverlayTool>('cursor');
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const highlightMajors = useMemo(() => {
    const major = hoverEdge?.major ?? hoverMajor;
    return major == null ? undefined : new Set([major]);
  }, [hoverEdge, hoverMajor]);

  // --- scene ---------------------------------------------------------------

  // The rooted view materializes every tile, so it has a practical ceiling
  // well below MAX_LEVEL (level 8 is ~17M tiles). Past it the scene is built
  // at the ceiling and the page says so; depth beyond that belongs to the
  // un-rooted engine, which never materializes a patch at all.
  const renderLevel = Math.min(state.level, ROOTED_MATERIALIZE_MAX);
  const beyondRooted = !infinite && state.level > ROOTED_MATERIALIZE_MAX;

  // In infinite mode NOTHING is materialized: the un-rooted engine expands the
  // viewport lazily. The model is pinned to level 0 (one tile) purely so the
  // rooted code paths keep a valid, cheap object.
  const modelLevel = infinite ? 0 : renderLevel;
  const model = useMemo(
    () =>
      buildTilingModel({
        family,
        rootTile: state.rootTile,
        level: modelLevel,
        curvy,
        stabilizeChirality: true,
      }),
    [family, state.rootTile, modelLevel, curvy],
  );

  const matchingRecord = useMemo(
    () => matchingVectorToRecord(family, state.matching),
    [family, state.matching],
  );

  // Circuit analysis needs a finite, rooted patch to weld and trace, so it is
  // simply UNAVAILABLE in infinite mode (see the panel note) — the input goes
  // null and the worker is never asked.
  const analysisInput = useMemo(
    () =>
      !infinite && linesOn && state.subset.length
        ? {
            family,
            rootTile: state.rootTile,
            level: state.level,
            subset: state.subset,
            matchingIndexByType: matchingRecord,
            contracts: state.contracts,
            rainbowTails: hasFlag(state, FLAG.RAINBOW_TAILS),
          }
        : null,
    [
      infinite,
      linesOn,
      family,
      state.rootTile,
      state.level,
      state.subset,
      matchingRecord,
      state.contracts,
      state.flags,
    ],
  );
  const analysis = useCircuitAnalysis(analysisInput, { workerMinLevel: 3 });

  // --- infinite mode ---------------------------------------------------------

  const infiniteApiRef = useRef<InfiniteCanvasApi | null>(null);
  const infiniteStatusRef = useRef<InfiniteCanvasStatus | null>(null);
  const infiniteHudSubRef = useRef<((s: InfiniteCanvasStatus) => void) | null>(null);
  const pendingLevelRef = useRef<number | null>(null);

  /** Strand chords: local geometry, identical to what the rooted view draws. */
  const infiniteChords = useMemo(
    () =>
      infinite && linesOn && state.subset.length
        ? buildLeafChordTable(state.subset, state.matching, state.contracts)
        : null,
    [infinite, linesOn, state.subset, state.matching, state.contracts],
  );

  const infiniteStyle = useMemo<MapRenderStyle>(() => {
    const table =
      state.colorScheme === 'custom'
        ? null
        : TILE_PALETTES[state.colorScheme] ?? TILE_PALETTES.bright;
    const colorOf = (type: string): Rgb => {
      if (state.colorScheme === 'custom') {
        const hex = state.customColors?.[type];
        const rgb = hex ? hexToRgb(hex) : null;
        return rgb ?? TILE_PALETTES.bright[type] ?? [200, 200, 200];
      }
      return table?.[type] ?? [200, 200, 200];
    };
    const fills = hasFlag(state, FLAG.BACKGROUNDS);
    return {
      leafColors: leafOrder('spectre').map(colorOf),
      aggColors: TILE_NAMES.map(colorOf),
      showFills: fills,
      showOutlines: hasFlag(state, FLAG.OUTLINES),
      // Flat ink, contrasting with whatever is behind it (no circuit colours).
      lineColor: fills ? DEFAULT_LINE_COLOR : LIGHT_LINE_COLOR,
    };
  }, [state.colorScheme, state.customColors, state.flags]);

  /**
   * Level → zoom. The rooted level control means "show a patch of 7.873^L
   * tiles"; the un-rooted view has no patch, so the honest translation is the
   * observable consequence: put the camera where the viewport COVERS that many
   * tiles. One level step is exactly one substitution step (×2.806 zoom).
   * Free panning/zooming does not write back — the live depth is reported
   * separately from the engine's own LOD cut, which cannot be faked.
   */
  const applyLevelZoom = useCallback((level: number): boolean => {
    const api = infiniteApiRef.current;
    if (!api) return false;
    const { width, height } = api.getSize();
    if (width <= 0 || height <= 0) return false;
    api.setCamera({ scale: scaleForLevel(level, width, height) });
    return true;
  }, []);

  useEffect(() => {
    if (!infinite) {
      pendingLevelRef.current = null;
      return;
    }
    pendingLevelRef.current = state.level;
    if (applyLevelZoom(state.level)) pendingLevelRef.current = null;
  }, [infinite, state.level, applyLevelZoom]);

  /**
   * Status sink. Deliberately does NOT setState on the page: the Explorer
   * must not re-render its sidebar (ten live matching editors) at frame rate
   * while the user pans. The HUD subscribes for itself.
   */
  const onInfiniteStatus = useCallback(
    (s: InfiniteCanvasStatus): void => {
      infiniteStatusRef.current = s;
      if (pendingLevelRef.current !== null && applyLevelZoom(pendingLevelRef.current)) {
        pendingLevelRef.current = null;
      }
      infiniteHudSubRef.current?.(s);
    },
    [applyLevelZoom],
  );

  const initialInfiniteCamera = useRef(createCamera(0, 0, 36)).current;

  // --- camera --------------------------------------------------------------

  const panRef = useRef<PanZoomApi | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const pinned = state.camera !== undefined;
  const fitKey = `${family}:${state.rootTile}:${state.level}:${pinned ? 'pin' : 'fit'}`;

  const focusExample = useCallback(
    (length: number | null, index: number) => {
      const api = panRef.current;
      if (!api || length == null || !analysis.result) return;
      const matches = pathsOfLength(analysis.result.circuits, length);
      if (!matches.length) return;
      const path = matches[((index % matches.length) + matches.length) % matches.length];
      // Analysis runs in un-mirrored world space; the view may be mirrored (§3.4).
      api.zoomToFit(expandBox(transformBox(model.viewTransform, pathBox(path)), 2), 48);
    },
    [analysis.result, model.viewTransform],
  );

  const onSelectLength = useCallback(
    (length: number | null) => {
      setHighlightLength(length);
      setExampleIndex(0);
      focusExample(length, 0);
    },
    [focusExample],
  );

  const nextExample = useCallback(() => {
    setExampleIndex((i) => {
      const next = i + 1;
      focusExample(highlightLength, next);
      return next;
    });
  }, [focusExample, highlightLength]);

  // --- overlays (the straight-line tool, §6.5.7) ---------------------------

  const overlayDefs = useMemo(() => {
    const out: { type: TileTypeId; d: string }[] = [];
    for (const [type, chords] of Object.entries(state.overlays)) {
      if (!chords.length) continue;
      const d = overlayChordsD(family, type as TileTypeId, chords, state.contracts);
      if (d) out.push({ type: type as TileTypeId, d });
    }
    return out;
  }, [state.overlays, family, state.contracts]);

  const overlayUses = useMemo(() => {
    if (!overlayDefs.length || model.instances.length > OVERLAY_BUDGET) return null;
    const types = new Set(overlayDefs.map((o) => o.type));
    return model.instances
      .filter((inst) => types.has(inst.type))
      .map((inst) => (
        <use
          key={`ov${inst.id}`}
          href={`#${OVERLAY_DEF_PREFIX}-${inst.type}`}
          xlinkHref={`#${OVERLAY_DEF_PREFIX}-${inst.type}`}
          transform={svgMatrixString(mul(model.viewTransform, inst.xform))}
        />
      ));
  }, [overlayDefs, model]);

  const onChordDrawn = useCallback(
    (_cellType: TileTypeId, from: EdgeRef, to: EdgeRef) => {
      // Chord indices are per LEAF (`EdgeRef.tileType`), which differs from the
      // palette cell only for the Gamma composite — refuse cross-leaf chords.
      if (from.tileType !== to.tileType) return;
      if (from.metaEdgeIndex < 0 || to.metaEdgeIndex < 0) return;
      dispatch({
        type: 'addChord',
        tileType: from.tileType,
        chord: [from.metaEdgeIndex, to.metaEdgeIndex],
      });
    },
    [dispatch],
  );

  const onEraseAt = useCallback(
    (edge: EdgeRef) => {
      const chords = state.overlays[edge.tileType] ?? [];
      const at = chords.findIndex(([a, b]) => a === edge.metaEdgeIndex || b === edge.metaEdgeIndex);
      if (at >= 0) dispatch({ type: 'removeChord', tileType: edge.tileType, at });
    },
    [dispatch, state.overlays],
  );

  // --- share / export ------------------------------------------------------

  const combo = useMemo(() => {
    const digits = matchingIndicesToCombo(family, state.subset, state.matching);
    return digits === null ? null : formatComboShareString(state.subset, digits);
  }, [family, state.subset, state.matching]);

  const liveSvg = useCallback(
    (): SVGSVGElement | null =>
      (viewportRef.current?.querySelector('svg.tiling-view') as SVGSVGElement | null) ?? null,
    [],
  );

  const onDownloadSvg = useCallback(() => {
    const svg = liveSvg();
    if (!svg) {
      setExportStatus('Nothing to export at this level.');
      return;
    }
    const size = panRef.current?.size;
    const text = serializeSceneSvg(svg, {
      width: size?.width,
      height: size?.height,
      title: `${FAMILY_DISPLAY_NAMES[family]} — level ${state.level}`,
    });
    downloadText(
      text,
      `${sceneFilename(family, state.rootTile, state.level, state.subset)}.svg`,
    );
    setExportStatus('SVG downloaded');
  }, [liveSvg, family, state.rootTile, state.level, state.subset]);

  const onDownloadPng = useCallback(async () => {
    const svg = liveSvg();
    const size = panRef.current?.size;
    if (!svg || !size) {
      setExportStatus('Nothing to export at this level.');
      return;
    }
    try {
      const text = serializeSceneSvg(svg, { width: size.width, height: size.height });
      const blob = await svgTextToPngBlob(text, size.width, size.height);
      downloadBlob(blob, `${sceneFilename(family, state.rootTile, state.level, state.subset)}.png`);
      setExportStatus('PNG downloaded');
    } catch (err) {
      setExportStatus(err instanceof Error ? err.message : 'PNG export failed');
    }
  }, [liveSvg, family, state.rootTile, state.level, state.subset]);

  /** "Copy exact view" (§9.2): only an explicit pin puts `cam=` in the URL. */
  const pinCamera = useCallback(() => {
    if (state.camera !== undefined) {
      dispatch({ type: 'setCamera', camera: undefined });
      return;
    }
    const cam = panRef.current?.camera;
    dispatch({ type: 'setCamera', camera: cam ? roundCamera(cam) : undefined });
  }, [dispatch, state.camera]);

  // --- contracts (advanced) ------------------------------------------------

  const minorCounts = useMemo(() => {
    const out: Record<number, number> = {};
    for (const type of order) {
      for (const seam of metaEdges(family, type)) {
        out[seam.major] = Math.max(out[seam.major] ?? 1, seam.edgeIndices.length);
      }
    }
    return out;
  }, [family, order]);

  const contractOf = useCallback(
    (major: number): EdgeContract =>
      state.contracts?.[major] ?? DEFAULT_CONTRACTS[major] ?? { minor: 0, t: 0.5 },
    [state.contracts],
  );

  const majors = useMemo(() => familyMajors(family), [family]);
  const tileCount = model.tileCount;
  const heavy = !infinite && state.level > SVG_MAX_LEVEL;
  /** Tiles a level-L patch holds — the count the infinite view targets. */
  const levelTiles = Math.round(SUBSTITUTION_GROWTH ** state.level);

  // --- render --------------------------------------------------------------

  return (
    <div className="explorer">
      <aside className="explorer-sidebar" id="explorer-sidebar" aria-label="Explorer controls">
        <fieldset>
          <legend>Scene</legend>
          <label className="control-row">
            <span>Family</span>
            <select
              value={family}
              aria-label="Tile family"
              onChange={(e) =>
                dispatch({ type: 'setFamily', family: e.target.value as TileFamilyId })
              }
            >
              {FAMILIES.map((f) => (
                <option key={f} value={f}>
                  {FAMILY_DISPLAY_NAMES[f]}
                </option>
              ))}
            </select>
          </label>

          <div className="control-row mode-row" role="radiogroup" aria-label="Renderer mode">
            <span>Mode</span>
            <span className="mode-switch">
              <button
                type="button"
                role="radio"
                aria-checked={!infinite}
                className={!infinite ? 'is-active' : ''}
                onClick={() => dispatch({ type: 'setMode', mode: 'rooted' })}
              >
                Rooted patch
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={infinite}
                className={infinite ? 'is-active' : ''}
                disabled={!infiniteAvailable}
                data-testid="mode-infinite"
                onClick={() => dispatch({ type: 'setMode', mode: 'infinite' })}
              >
                Infinite
              </button>
            </span>
          </div>
          {!infiniteAvailable ? (
            <p className="muted" role="note">
              Infinite mode needs the un-rooted engine, which only generates{' '}
              {FAMILY_DISPLAY_NAMES.spectre}. Switch the family back to use it.
            </p>
          ) : infinite ? (
            <>
              <p className="muted" role="note">
                No root and no patch: the plane is expanded around the camera on demand (world seed{' '}
                {INFINITE_SEED} — the{' '}
                <a href={`${import.meta.env.BASE_URL}map.html`}>Infinite Map</a> owns the seed
                control). Drag to pan, wheel to zoom.
              </p>
              <label className="control-row">
                <span>Budget</span>
                <select
                  aria-label="Instance budget"
                  data-testid="infinite-budget"
                  value={budget}
                  onChange={(e) => dispatch({ type: 'setBudget', budget: Number(e.target.value) })}
                >
                  {MAP_BUDGETS.map((b) => (
                    <option key={b} value={b}>
                      {formatBudget(b)}
                    </option>
                  ))}
                </select>
              </label>
              <p className="muted" role="note">
                How many instances one query may emit. It only bites once the view holds more tiles
                than that — then the engine draws supertile glyphs instead, and a bigger budget buys
                back a level of real tiles.{' '}
                {budget >= HEAVY_BUDGET
                  ? 'At this size expect the query, not the frame, to be the wait: the engine walk is single-threaded on the CPU, so a fast GPU does not speed it up.'
                  : 'Zoomed in, where every tile is already drawn, raising it changes nothing.'}
              </p>
            </>
          ) : null}

          <label className="control-row">
            <span>Root tile</span>
            <select
              value={state.rootTile}
              aria-label="Root tile"
              disabled={infinite}
              onChange={(e) =>
                dispatch({ type: 'setRootTile', rootTile: e.target.value as TileTypeId })
              }
            >
              {TILE_NAMES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <div className="control-row">
            <span>Level</span>
            <span className="level-stepper">
              <button
                type="button"
                aria-label="Fewer supertiles"
                disabled={state.level <= 0}
                onClick={() => dispatch({ type: 'stepLevel', delta: -1 })}
              >
                −
              </button>
              <strong data-testid="level-value">{state.level}</strong>
              <button
                type="button"
                aria-label="More supertiles"
                disabled={state.level >= MAX_LEVEL}
                onClick={() => dispatch({ type: 'stepLevel', delta: 1 })}
              >
                +
              </button>
              <em>
                {infinite
                  ? `≈ ${levelTiles.toLocaleString()} tiles in view`
                  : `${tileCount.toLocaleString()} tiles`}
              </em>
            </span>
          </div>
          {infinite ? (
            <p className="muted" role="note">
              In infinite mode the level control is a zoom preset: it parks the camera where the
              viewport covers about as many tiles as a level-{state.level} patch holds (one step =
              one substitution = ×2.81 zoom). Panning and wheel-zoom are free and do not change it.
            </p>
          ) : beyondRooted ? (
            <p className="warning-badge" role="status">
              Level {state.level} is past what this view can materialize, so it is drawing level{' '}
              {ROOTED_MATERIALIZE_MAX}.{' '}
              <button
                type="button"
                className="link-button"
                data-testid="switch-to-infinite"
                onClick={() => dispatch({ type: 'setMode', mode: 'infinite' })}
              >
                Switch to infinite mode
              </button>{' '}
              to go this deep without building the patch at all (or open the{' '}
              <a href={`${import.meta.env.BASE_URL}map.html`}>Infinite Map</a>).
            </p>
          ) : heavy ? (
            <p className="warning-badge" role="status">
              Level {state.level} renders on canvas — interactivity is limited and analysis can take
              a few seconds.
            </p>
          ) : null}
        </fieldset>

        <fieldset>
          <legend>Edge rule</legend>
          <EdgeSubsetPicker
            family={family}
            subset={state.subset}
            highlightMajors={highlightMajors}
            onSubsetChange={(subset) => dispatch({ type: 'setSubset', subset })}
            onToggleMajor={(major) => dispatch({ type: 'toggleMajor', major })}
            onHoverMajor={setHoverMajor}
          />
        </fieldset>

        <fieldset className="explorer-matchings">
          <legend>Matchings</legend>
          <p className="combo-readout">
            {combo ? (
              <>
                Combination string: <code>{combo}</code>
              </>
            ) : (
              <span className="muted">
                This matching set crosses itself, so it has no combination string.
              </span>
            )}
          </p>
          <label className="control-row">
            <input
              type="checkbox"
              checked={nonCrossingOnly}
              onChange={() => dispatch({ type: 'toggleFlag', flag: FLAG.NON_CROSSING_ONLY })}
            />
            <span>Non-crossing options only</span>
          </label>
          <div className="matching-grid">
            {order.map((type, i) => (
              <MatchingSlider
                key={type}
                family={family}
                tileType={type}
                selectedEdges={selected}
                contracts={state.contracts}
                value={state.matching[i] ?? 0}
                nonCrossingOnly={nonCrossingOnly}
                curvy={curvy}
                colorScheme={state.colorScheme}
                customColors={state.customColors}
                tileSize={116}
                onChange={(index) => dispatch({ type: 'setMatching', tileType: type, index })}
              />
            ))}
          </div>
          {state.subset.length === 0 ? (
            <p className="muted">Pick an edge rule above to give the tiles connection points.</p>
          ) : null}
        </fieldset>

        <fieldset className="explorer-overlays">
          <legend>Overlay tools</legend>
          <div className="tool-row" role="radiogroup" aria-label="Overlay tool">
            {(['cursor', 'line', 'erase'] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={tool === t}
                className={tool === t ? 'is-active' : ''}
                onClick={() => {
                  setTool(t);
                  setHoverEdge(null);
                }}
              >
                {t === 'cursor' ? 'Cursor' : t === 'line' ? 'Straight line' : 'Eraser'}
              </button>
            ))}
            <button
              type="button"
              onClick={() => dispatch({ type: 'clearOverlays' })}
              disabled={overlayDefs.length === 0}
            >
              Clear
            </button>
          </div>
          {tool === 'cursor' ? (
            <p className="muted">
              Pick “straight line”, then drag between two seams of a tile — the line repeats on
              every copy of that tile in the tiling.
            </p>
          ) : (
            <TilePalette
              family={family}
              selectedEdges={selected}
              highlightMajors={highlightMajors}
              overlaysByType={state.overlays}
              contracts={state.contracts}
              curvy={curvy}
              colorScheme={state.colorScheme}
              customColors={state.customColors}
              tileSize={104}
              interaction={tool === 'line' ? 'chord-draw' : 'edge-select'}
              onEdgeHover={setHoverEdge}
              onChordDrawn={tool === 'line' ? onChordDrawn : undefined}
              onEdgeClick={tool === 'erase' ? onEraseAt : undefined}
            />
          )}
        </fieldset>

        <DisplayToggles
          flags={state.flags}
          onToggle={(flag) => dispatch({ type: 'toggleFlag', flag })}
          // Curvy outlines are a spectre-family idea; the non-crossing filter
          // belongs to (and is shown in) the matchings section.
          hidden={
            family === 'hex'
              ? [FLAG.CURVY, FLAG.NON_CROSSING_ONLY]
              : [FLAG.NON_CROSSING_ONLY]
          }
        />

        <ColorSchemePicker
          family={family}
          colorScheme={state.colorScheme}
          customColors={state.customColors}
          onColorSchemeChange={(colorScheme) => dispatch({ type: 'setColorScheme', colorScheme })}
          onCustomColorChange={(tileType, hex) =>
            dispatch({ type: 'setCustomColor', tileType, hex })
          }
        />

        <fieldset>
          <legend>Share</legend>
          <SharePanel
            state={state}
            route={route}
            onDownloadSvg={onDownloadSvg}
            onDownloadPng={onDownloadPng}
            downloadsDisabled={heavy}
            downloadsHint="Switch to level 4 or below to export the SVG scene."
          >
            <button type="button" onClick={pinCamera} className="share-pin">
              {pinned ? 'Unpin view' : 'Pin current view'}
            </button>
          </SharePanel>
          {exportStatus ? (
            <p className="muted" role="status">
              {exportStatus}
            </p>
          ) : null}
        </fieldset>

        <details className="explorer-advanced">
          <summary>Advanced: seam contracts</summary>
          <p className="muted">
            Where a drawn line crosses each seam class. Each slider spans the whole seam — notches
            mark the vertices between its physical edges — and moving a contract slides every dot
            and line end on that class; the topology never changes. Greyed classes are not part of
            the current edge rule.
          </p>
          {majors.map((major) => {
            const c = contractOf(major);
            const minorCount = Math.max(1, minorCounts[major] ?? 1);
            const activeClass = state.subset.includes(major);
            const pinned = major === 0;
            return (
              <div
                className={`contract-row${activeClass ? '' : ' is-inactive'}`}
                key={major}
                data-major={major}
                style={{ color: edgeClassColor(major) }}
              >
                <span className="contract-name">class {major === 7 ? '7 (M)' : major}</span>
                <ContractSlider
                  major={major}
                  minorCount={minorCount}
                  value={c}
                  active={activeClass}
                  pinned={pinned}
                  onChange={(contract) => dispatch({ type: 'setContract', major, contract })}
                />
                <em>{pinned ? 'centre' : `${c.minor}.${Math.round(c.t * 100)}%`}</em>
              </div>
            );
          })}
          <button type="button" onClick={() => dispatch({ type: 'clearContracts' })}>
            Reset contracts
          </button>
        </details>

        {/* Not a `disabled` fieldset: the escape-hatch button must stay live. */}
        <fieldset className={infinite ? 'is-unavailable' : undefined}>
          <legend>Analysis</legend>
          {infinite ? (
            <p className="warning-badge" role="status" data-testid="analysis-unavailable">
              Circuit analysis needs a rooted patch — there is nothing finite here to weld and
              trace.{' '}
              <button
                type="button"
                className="link-button"
                onClick={() => dispatch({ type: 'setMode', mode: 'rooted' })}
              >
                Switch to rooted mode
              </button>{' '}
              to analyse. The strand lines below the camera are still exact: they are local
              geometry, which is why they work at any depth.
            </p>
          ) : (
            <>
              {!linesOn ? (
                <p className="muted">Turn “Circuit lines” on to analyse this patch.</p>
              ) : null}
              <StatsSummary
                result={analysis.result}
                running={analysis.running}
                error={analysis.error}
                highlightLength={highlightLength}
                onSelectLength={onSelectLength}
              />
              {highlightLength != null ? (
                <button type="button" onClick={nextExample}>
                  Next example of length {highlightLength}
                </button>
              ) : null}
            </>
          )}
        </fieldset>
      </aside>

      <div className="explorer-viewport" ref={viewportRef}>
        {infinite ? (
          <InfiniteCanvas
            className="map-viewport explorer-infinite"
            ariaLabel="Infinite tiling viewport — drag to pan, wheel or pinch to zoom"
            seed={INFINITE_SEED}
            budget={budget}
            chords={infiniteChords}
            style={infiniteStyle}
            initialCamera={initialInfiniteCamera}
            apiRef={infiniteApiRef}
            onStatusChange={onInfiniteStatus}
          >
            <InfiniteHud subscribeRef={infiniteHudSubRef} linesOn={linesOn && !!infiniteChords} />
          </InfiniteCanvas>
        ) : !heavy ? (
          <PanZoom
            apiRef={panRef}
            defaultCamera={state.camera}
            fitBounds={pinned ? null : model.bounds}
            fitKey={fitKey}
            showControls
            ariaLabel="Tiling viewport"
          >
            {(api) => (
              <TilingView
                family={family}
                rootTile={state.rootTile}
                level={state.level}
                curvy={curvy}
                camera={api.camera}
                colorScheme={state.colorScheme}
                customColors={state.customColors}
                contracts={state.contracts}
                selectedEdges={selected}
                showBackgrounds={hasFlag(state, FLAG.BACKGROUNDS)}
                showOutlines={hasFlag(state, FLAG.OUTLINES)}
                showDots={hasFlag(state, FLAG.DOTS)}
                markOddTiles
                idPrefix="ex"
              >
                {overlayDefs.length ? (
                  <g className="tiling-overlays" fill="none" stroke="currentColor" strokeWidth={0.14}>
                    <defs>
                      {overlayDefs.map((o) => (
                        <path key={o.type} id={`${OVERLAY_DEF_PREFIX}-${o.type}`} d={o.d} />
                      ))}
                    </defs>
                    {overlayUses}
                  </g>
                ) : null}
                {analysis.result && linesOn ? (
                  <g transform={svgMatrixString(model.viewTransform)}>
                    <CircuitLayer
                      circuits={analysis.result.circuits}
                      tails={analysis.result.tails}
                      circuitColorByLength={analysis.result.circuitColors}
                      segmentColor={analysis.result.segmentColors}
                      rainbowTails={hasFlag(state, FLAG.RAINBOW_TAILS)}
                      highlightLength={highlightLength}
                      tailEndMarkers={state.level <= 3}
                      maxRecords={40000}
                      strokeWidth={0.12}
                    />
                  </g>
                ) : null}
              </TilingView>
            )}
          </PanZoom>
        ) : (
          <PanZoom
            apiRef={panRef}
            defaultCamera={state.camera}
            fitBounds={pinned ? null : model.bounds}
            fitKey={fitKey}
            showControls
            ariaLabel="Tiling viewport"
          >
            {(api) => (
              <TilingCanvas
                family={family}
                rootTile={state.rootTile}
                level={state.level}
                curvy={curvy}
                camera={api.camera}
                colorScheme={state.colorScheme}
                customColors={state.customColors}
                contracts={state.contracts}
                selectedEdges={selected}
                showBackgrounds={hasFlag(state, FLAG.BACKGROUNDS)}
                showOutlines={hasFlag(state, FLAG.OUTLINES)}
                showDots={hasFlag(state, FLAG.DOTS)}
                circuits={linesOn ? analysis.result?.circuits : undefined}
                tails={linesOn ? analysis.result?.tails : undefined}
                circuitColorByLength={analysis.result?.circuitColors}
                rainbowTails={hasFlag(state, FLAG.RAINBOW_TAILS)}
                highlightLength={highlightLength}
              />
            )}
          </PanZoom>
        )}

        {analysis.running ? (
          <div className="analysis-veil" role="status">
            <span className="spinner" aria-hidden="true" />
            Analysing {tileCount.toLocaleString()} tiles…
          </div>
        ) : null}

        <div className="viewport-caption muted">
          {FAMILY_DISPLAY_NAMES[family]} ·{' '}
          {infinite
            ? `infinite plane · seed ${INFINITE_SEED} · level ${state.level} zoom`
            : `${state.rootTile} · level ${state.level} · ${tileCount.toLocaleString()} tiles`}
          {state.subset.length ? ` · rule ${state.subset.join('')}` : ' · no edge rule'}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Infinite-mode HUD
// ---------------------------------------------------------------------------

/**
 * Owns its own state so the un-rooted viewport's per-frame status never
 * re-renders the Explorer page (which would reconcile ten live matching
 * editors on every pan frame). The parent hands it a subscription slot.
 */
function InfiniteHud(props: {
  readonly subscribeRef: React.MutableRefObject<((s: InfiniteCanvasStatus) => void) | null>;
  readonly linesOn: boolean;
}): JSX.Element {
  const { subscribeRef, linesOn } = props;
  const [status, setStatus] = useState<InfiniteCanvasStatus | null>(null);
  const latest = useRef<InfiniteCanvasStatus | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    subscribeRef.current = (s) => {
      latest.current = s;
      if (timer.current) return; // trailing-edge throttle: ≤ 4 updates/s
      timer.current = setTimeout(() => {
        timer.current = null;
        setStatus(latest.current);
      }, 250);
    };
    return () => {
      subscribeRef.current = null;
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    };
  }, [subscribeRef]);

  const cut = status?.cut ?? null;
  const draw = status?.draw ?? null;
  const aggregate = !!cut && cut.cutLevel > 0;
  const depth =
    draw && status && status.size.width > 0
      ? levelForScale(draw.scale, status.size.width, status.size.height)
      : null;

  return (
    <div className="map-hud" data-testid="explorer-infinite-hud" role="status">
      <span>{status?.mode === 'pending' || !status ? 'starting…' : status.mode}</span>
      <span data-testid="inf-instances">{(cut?.count ?? 0).toLocaleString('en-US')} instances</span>
      <span>
        {cut
          ? cut.cutLevel === 0
            ? 'LOD: individual tiles'
            : `LOD: level-${cut.cutLevel} glyphs`
          : 'LOD: —'}
      </span>
      <span data-testid="inf-depth">
        {depth === null ? 'depth ~—' : `depth ~${depth.toFixed(1)} · chain ${cut?.ancestorLevel ?? '—'}`}
      </span>
      <span data-testid="inf-lines">
        {!linesOn
          ? 'lines: off'
          : aggregate
            ? 'lines: hidden (aggregate LOD)'
            : `lines: ${(draw?.chordsDrawn ?? 0).toLocaleString('en-US')} chords`}
      </span>
      <span>
        query {cut ? cut.queryMs.toFixed(1) : '—'} ms · draw {draw ? draw.drawMs.toFixed(1) : '—'} ms
        {draw ? ` · ${draw.drawCalls} call${draw.drawCalls === 1 ? '' : 's'}` : ''}
      </span>
      {status?.error ? <span className="map-hud-error">query failed: {status.error}</span> : null}
    </div>
  );
}

export default ExplorerPage;
