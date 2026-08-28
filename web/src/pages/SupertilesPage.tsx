/**
 * `SupertilesPage` — take a supertile apart and see what it is made of.
 *
 * The explorer and the map both show you a FINISHED tiling, where the
 * substitution structure is invisible: the pieces share every interior edge,
 * so a level-5 supertile looks like a blob of spectres rather than eight
 * level-4 supertiles locked together. This page is the other view. Pick a
 * flavour and a level, then push the pieces apart: the seams the substitution
 * glued shut open up, and the rule (`Delta → Xi · Delta · Xi · Phi · Sigma ·
 * Pi · Phi · Gamma`) becomes a picture instead of a table.
 *
 * The level slider is the point of the page — one step is one substitution
 * round, ×7.873 tiles — so it is deliberately cheap to scrub: the layout is
 * deferred (React 18) so dragging never blocks on the boundary walk, and the
 * deep levels drop the individual tiles and draw piece outlines instead.
 */

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';

import {
  PanZoom,
  SeamContractControls,
  StatsSummary,
  StrandRuleControls,
  type PanZoomApi,
} from '../components';
import { LEAF_ORDER, SUPER_RULES, TILE_NAMES, type TileTypeId } from '../core';
import { useCircuitAnalysis } from '../hooks/useCircuitAnalysis';
import { matchingVectorToRecord } from '../lib/matchingModel';
import { tileColor } from '../lib/palette';
import { buildLeafChordTable } from './map/chords';
import { STRAND_DRAW_BUDGET, buildExplodedStrands } from './supertiles/strands';
import { ExplodedView, LABEL_BUDGET, TILE_DRAW_BUDGET } from './supertiles/ExplodedView';
import {
  MAX_DEPTH,
  MAX_EXPLODE_LEVEL,
  MAX_GAP,
  MIN_DEPTH,
  MIN_EXPLODE_LEVEL,
  MIN_GAP,
  explodeSupertile,
} from './supertiles/explode';
import {
  DEFAULT_SUPERTILES_STATE,
  hashToSupertilesState,
  sameSupertilesState,
  supertilesStateToHash,
  type SupertilesUrlState,
} from './supertiles/supertilesUrl';
import '../styles/supertiles.css';

export interface SupertilesPageProps {
  /** Mirror state into `location.hash` (default true; tests can opt out). */
  readonly syncUrl?: boolean;
}

const GAP_STEP = 0.05;
/** Slider scrubbing writes the URL, so the write is debounced like the map's. */
const URL_DEBOUNCE_MS = 400;

const fmt = (n: number): string => n.toLocaleString('en-US');

export function SupertilesPage(props: SupertilesPageProps): JSX.Element {
  const syncUrl = props.syncUrl ?? true;

  const initialRef = useRef<SupertilesUrlState | null>(null);
  if (initialRef.current === null) {
    initialRef.current =
      syncUrl && typeof window !== 'undefined'
        ? hashToSupertilesState(window.location.hash)
        : { ...DEFAULT_SUPERTILES_STATE };
  }
  const [state, setState] = useState<SupertilesUrlState>(initialRef.current);
  const [highlightLengths, setHighlightLengths] = useState<ReadonlySet<number>>(
    () => new Set<number>(),
  );
  const panRef = useRef<PanZoomApi | null>(null);
  const urlTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const patch = useCallback((next: Partial<SupertilesUrlState>): void => {
    setState((prev) => ({ ...prev, ...next }));
  }, []);

  // --- URL --------------------------------------------------------------
  useEffect(() => {
    if (!syncUrl || typeof window === 'undefined') return;
    if (urlTimer.current) clearTimeout(urlTimer.current);
    urlTimer.current = setTimeout(() => {
      urlTimer.current = null;
      const hash = supertilesStateToHash(state);
      if (window.location.hash !== hash) {
        window.history.replaceState(window.history.state, '', hash);
      }
    }, URL_DEBOUNCE_MS);
    return () => {
      if (urlTimer.current) clearTimeout(urlTimer.current);
      urlTimer.current = null;
    };
  }, [state, syncUrl]);

  useEffect(() => {
    if (!syncUrl || typeof window === 'undefined') return;
    const onHash = (): void => {
      const next = hashToSupertilesState(window.location.hash);
      setState((prev) => (sameSupertilesState(prev, next) ? prev : next));
    };
    window.addEventListener('hashchange', onHash);
    window.addEventListener('popstate', onHash);
    return () => {
      window.removeEventListener('hashchange', onHash);
      window.removeEventListener('popstate', onHash);
    };
  }, [syncUrl]);

  // --- layout -----------------------------------------------------------
  // Deferred so dragging a slider stays smooth: React keeps painting the old
  // layout while the new one is built, instead of blocking on every step.
  const deferred = useDeferredValue(state);
  const stale = deferred !== state;
  const layout = useMemo(
    () =>
      explodeSupertile({
        rootTile: deferred.rootTile,
        level: deferred.level,
        gap: deferred.gap,
        depth: deferred.depth,
      }),
    [deferred.rootTile, deferred.level, deferred.gap, deferred.depth],
  );

  // --- the strand rule --------------------------------------------------
  //
  // The view already shows a ROOTED patch — a level-L supertile of one flavour
  // — which is exactly what circuit analysis needs. So the same hook the
  // Explorer uses runs here on the same kind of input, and the same stats
  // panel reports it; nothing about the analysis is re-implemented.
  const linesOn = deferred.lines && deferred.subset.length > 0;

  const chords = useMemo(
    () =>
      linesOn
        ? buildLeafChordTable(deferred.subset, deferred.matching, deferred.contracts)
        : null,
    [linesOn, deferred.subset, deferred.matching, deferred.contracts],
  );

  const analysisInput = useMemo(
    () =>
      linesOn
        ? {
            family: 'spectre' as const,
            rootTile: deferred.rootTile,
            level: deferred.level,
            subset: deferred.subset,
            matchingIndexByType: matchingVectorToRecord('spectre', deferred.matching),
            contracts: deferred.contracts,
            rainbowTails: false,
          }
        : null,
    [linesOn, deferred.rootTile, deferred.level, deferred.subset, deferred.matching, deferred.contracts],
  );
  const analysis = useCircuitAnalysis(analysisInput, { workerMinLevel: 3 });

  /**
   * The drawn lines. Welded and traced where the tiling really puts them and
   * then cut into per-piece runs, so a strand crossing between two pieces
   * visibly comes apart when they are pushed away from each other.
   */
  const strands = useMemo(() => buildExplodedStrands(layout, chords), [layout, chords]);

  const circuitColors = useMemo(
    () => new Map(analysis.result?.circuitColors ?? []),
    [analysis.result],
  );

  const onSelectLength = useCallback((length: number, additive: boolean): void => {
    setHighlightLengths((prev) => {
      if (additive) {
        const next = new Set(prev);
        if (!next.delete(length)) next.add(length);
        return next;
      }
      return prev.size === 1 && prev.has(length) ? new Set<number>() : new Set([length]);
    });
  }, []);
  const clearLengths = useCallback(() => setHighlightLengths(new Set<number>()), []);

  const fitBounds = useMemo(
    () => ({ min: layout.bounds.min, max: layout.bounds.max }),
    [layout],
  );
  // Spacing is in the fit key: pushing the pieces apart grows the scene by
  // more than double, so a fixed frame would sail them off the edge. Refitting
  // keeps the whole thing in view and the separation still reads — the pieces
  // move apart relative to their own size, which is the thing being shown.
  const fitKey = `${deferred.rootTile}:${deferred.level}:${deferred.depth}:${deferred.gap}`;

  const tilesDrawn = deferred.showTiles && layout.tileCount <= TILE_DRAW_BUDGET;
  const labelsDrawn = deferred.showLabels && layout.leaves.length <= LABEL_BUDGET;
  const rule = SUPER_RULES[deferred.rootTile] ?? [];

  return (
    <section className="supertiles-page">
      <header className="supertiles-header">
        <div className="supertiles-title">
          <h1>Supertiles</h1>
          <p className="muted">
            A supertile is not a shape with a pattern in it — it <em>is</em> eight smaller
            supertiles locked together, and each of those is eight smaller ones again. In a
            finished tiling the pieces share every edge, so you never see the joins. Push them
            apart and the substitution rule becomes a picture.
          </p>
        </div>

        <form className="supertiles-controls" onSubmit={(e) => e.preventDefault()}>
          <label className="supertiles-control">
            <span>Flavour</span>
            <select
              aria-label="Supertile flavour"
              data-testid="st-flavour"
              value={state.rootTile}
              onChange={(e) => patch({ rootTile: e.target.value as TileTypeId })}
            >
              {TILE_NAMES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <label className="supertiles-control supertiles-slider">
            <span>
              Level <strong data-testid="st-level-value">{state.level}</strong>
            </span>
            <input
              type="range"
              aria-label="Substitution level"
              data-testid="st-level"
              min={MIN_EXPLODE_LEVEL}
              max={MAX_EXPLODE_LEVEL}
              step={1}
              value={state.level}
              onChange={(e) => patch({ level: Number(e.target.value) })}
            />
          </label>

          <label className="supertiles-control supertiles-slider">
            <span>
              Spacing <strong data-testid="st-gap-value">{state.gap.toFixed(2)}</strong>
            </span>
            <input
              type="range"
              aria-label="Spacing between the pieces"
              data-testid="st-gap"
              min={MIN_GAP}
              max={MAX_GAP}
              step={GAP_STEP}
              value={state.gap}
              onChange={(e) => patch({ gap: Number(e.target.value) })}
            />
          </label>

          <label className="supertiles-control supertiles-slider">
            <span>
              Nesting <strong data-testid="st-depth-value">{state.depth}</strong>
            </span>
            <input
              type="range"
              aria-label="Rounds of nesting to separate"
              data-testid="st-depth"
              min={MIN_DEPTH}
              max={MAX_DEPTH}
              step={1}
              value={state.depth}
              onChange={(e) => patch({ depth: Number(e.target.value) })}
            />
          </label>

          <label className="supertiles-control supertiles-check">
            <input
              type="checkbox"
              aria-label="Draw the individual tiles"
              data-testid="st-tiles"
              checked={state.showTiles}
              onChange={(e) => patch({ showTiles: e.target.checked })}
            />
            <span>Tiles</span>
          </label>

          <label className="supertiles-control supertiles-check">
            <input
              type="checkbox"
              aria-label="Label each piece with its flavour"
              data-testid="st-labels"
              checked={state.showLabels}
              onChange={(e) => patch({ showLabels: e.target.checked })}
            />
            <span>Labels</span>
          </label>

          <label className="supertiles-control supertiles-check">
            <input
              type="checkbox"
              aria-label="Draw the strand lines and analyse the circuits"
              data-testid="st-lines"
              checked={state.lines}
              onChange={(e) => patch({ lines: e.target.checked })}
            />
            <span>Circuit lines</span>
          </label>

          <button type="button" onClick={() => panRef.current?.reset()}>
            Fit view
          </button>
        </form>
      </header>

      <p className="supertiles-rule" data-testid="st-rule">
        <strong>{deferred.rootTile}</strong>
        <span aria-hidden="true"> → </span>
        <span className="supertiles-sr"> is made of </span>
        {rule
          .map((child, slot) => ({ child, slot }))
          .filter(({ child }) => child !== 'null')
          .map(({ child, slot }, i, kept) => (
            <span key={slot}>
              <span className="supertiles-chip" style={{ background: tileColor(child, 'bright') }}>
                {child}
              </span>
              {i < kept.length - 1 ? <span aria-hidden="true"> · </span> : null}
            </span>
          ))}
      </p>

      <div className={`supertiles-viewport${stale ? ' is-stale' : ''}`}>
        <PanZoom
          apiRef={panRef}
          fitBounds={fitBounds}
          fitKey={fitKey}
          padding={0.06}
          showControls
          ariaLabel="Exploded supertile — drag to pan, wheel to zoom"
        >
          {(api) => (
            <ExplodedView
              layout={layout}
              camera={api.camera}
              showTiles={state.showTiles}
              showLabels={state.showLabels}
              strands={strands.runs}
              circuitColors={circuitColors}
              highlightLengths={highlightLengths}
              idPrefix="st"
            />
          )}
        </PanZoom>

        <div className="supertiles-hud" role="status" data-testid="st-hud">
          <span data-testid="st-pieces">
            {fmt(layout.leaves.length)} piece{layout.leaves.length === 1 ? '' : 's'}
          </span>
          <span data-testid="st-tiles-count">{fmt(layout.tileCount)} tiles</span>
          <span data-testid="st-detail">
            {tilesDrawn
              ? 'drawing every tile'
              : state.showTiles
                ? `outlines only — over ${fmt(TILE_DRAW_BUDGET)} tiles`
                : 'outlines only'}
          </span>
          {state.showLabels && !labelsDrawn ? (
            <span data-testid="st-labels-note">labels off — too many pieces</span>
          ) : null}
          {linesOn ? (
            <span data-testid="st-strands">
              {strands.skipped
                ? `lines: over ${fmt(STRAND_DRAW_BUDGET)} tiles`
                : `${fmt(strands.circuitCount)} circuits · ${fmt(strands.tailCount)} wanderers`}
            </span>
          ) : null}
        </div>
      </div>

      <div className="supertiles-rulepanel">
        <StrandRuleControls
          family="spectre"
          subset={state.subset}
          matching={state.matching}
          contracts={state.contracts}
          onSubsetChange={(subset) => patch({ subset, lines: true })}
          onToggleMajor={(major) =>
            patch({
              subset: state.subset.includes(major)
                ? state.subset.filter((m) => m !== major)
                : [...state.subset, major].sort((a, b) => a - b),
              lines: true,
            })
          }
          onMatchingChange={(tileType, index) =>
            patch({
              matching: LEAF_ORDER.map((t, i) => (t === tileType ? index : state.matching[i] ?? 0)),
            })
          }
        />

        <SeamContractControls
          family="spectre"
          subset={state.subset}
          contracts={state.contracts}
          onChange={(major, contract) =>
            patch({ contracts: { ...(state.contracts ?? {}), [major]: contract } })
          }
          onReset={() => patch({ contracts: undefined })}
        />

        <fieldset>
          <legend>Analysis</legend>
          {!linesOn ? (
            <p className="muted" data-testid="st-analysis-off">
              Turn “Circuit lines” on to weld and trace this supertile.
            </p>
          ) : (
            <>
              <p className="muted">
                The pieces are a rendering device; the circuits are not. They are welded and
                traced where the tiling really puts the tiles, so what you see is the level-
                {deferred.level} {deferred.rootTile} supertile's own answer — and a strand that
                runs between two pieces comes apart exactly where it crosses.
              </p>
              <StatsSummary
                result={analysis.result}
                running={analysis.running}
                error={analysis.error}
                highlightLengths={highlightLengths}
                onSelectLength={onSelectLength}
                onClearLengths={clearLengths}
              />
            </>
          )}
        </fieldset>
      </div>

      <p className="muted supertiles-note">
        Spacing 0 is the real tiling: the pieces are exactly where the substitution puts them, which
        is why the joins vanish. Every level is a mirror of the one below it, so the view
        counter-mirrors as you scrub — otherwise the whole scene would flip at every step.
      </p>
    </section>
  );
}

export default SupertilesPage;
