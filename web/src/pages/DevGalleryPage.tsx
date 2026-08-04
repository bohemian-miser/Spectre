/**
 * `DevGalleryPage` — the unlisted widget gallery (DESIGN.md §1.3, stage 2
 * acceptance). Every widget of §6 is mounted in isolation with knobs for
 * family / level / root tile / edge selection, so the whole layer can be
 * exercised by hand (and by Playwright) before the real pages exist.
 *
 * Served by `widgets.html`; the p5 app at `index.html` is untouched.
 */

import { useMemo, useState } from 'react';
import {
  FAMILIES,
  FAMILY_DISPLAY_NAMES,
  FLAG,
  LEAF_ORDER,
  TILE_NAMES,
  familyMajors,
  leafOrder,
  validEdgeSubsets,
  type TileFamilyId,
  type TileTypeId,
} from '../core';
import {
  CircuitLayer,
  ColorSchemePicker,
  DisplayToggles,
  EdgeClassLegend,
  EdgeSubsetPicker,
  MatchingSlider,
  PanZoom,
  SeamView,
  SharePanel,
  StatsSummary,
  TilePalette,
  TileView,
  TilingCanvas,
  TilingView,
  type EdgeRef,
} from '../components';
import { useCircuitAnalysis } from '../hooks/useCircuitAnalysis';
import { useExplorerStore } from '../hooks/useExplorerState';
import { hasFlag, selectedSet } from '../lib/explorerReducer';
import { matchingVectorToRecord } from '../lib/matchingModel';
import { buildTilingModel, tileCountAt } from '../lib/tilingModel';
import { poseSeam } from '../lib/seam';

function Section(props: {
  id: string;
  title: string;
  blurb: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <section id={props.id} className="gallery-section">
      <h2>{props.title}</h2>
      <p className="muted">{props.blurb}</p>
      {props.children}
    </section>
  );
}

export function DevGalleryPage(): JSX.Element {
  const { state, dispatch, hash } = useExplorerStore({ syncUrl: true, route: '#/dev' });
  const selected = useMemo(() => selectedSet(state), [state]);
  const family = state.family;
  const order = useMemo(() => leafOrder(family), [family]);

  const [hoverEdge, setHoverEdge] = useState<EdgeRef | null>(null);
  const [highlightLengths, setHighlightLengths] = useState<ReadonlySet<number>>(
    () => new Set<number>(),
  );
  const [soloTileRaw, setSoloTile] = useState<TileTypeId>('Delta');
  // Gamma1/Gamma2 do not exist in the hex family (§12.9).
  const soloTile: TileTypeId =
    order.includes(soloTileRaw) || soloTileRaw === 'Gamma' ? soloTileRaw : 'Delta';
  const [seamMajor, setSeamMajor] = useState<number>(2);
  const [nonCrossingOnly, setNonCrossingOnly] = useState(false);
  const [canvasLevel, setCanvasLevel] = useState(5);

  const highlightMajors = useMemo(
    () => (hoverEdge ? new Set([hoverEdge.major]) : undefined),
    [hoverEdge],
  );

  const curvy = hasFlag(state, FLAG.CURVY);
  const model = useMemo(
    () =>
      buildTilingModel({
        family,
        rootTile: state.rootTile,
        level: state.level,
        curvy,
        stabilizeChirality: true,
      }),
    [family, state.rootTile, state.level, curvy],
  );

  const analysisInput = useMemo(
    () =>
      hasFlag(state, FLAG.LINES) && state.subset.length
        ? {
            family,
            rootTile: state.rootTile,
            level: state.level,
            subset: state.subset,
            matchingIndexByType: matchingVectorToRecord(family, state.matching),
            contracts: state.contracts,
            rainbowTails: hasFlag(state, FLAG.RAINBOW_TAILS),
          }
        : null,
    [family, state],
  );
  const analysis = useCircuitAnalysis(analysisInput, { workerMinLevel: 3 });

  const seamPose = useMemo(
    () => poseSeam(family, soloTile, seamMajor),
    [family, soloTile, seamMajor],
  );

  const validSubsets = useMemo(() => validEdgeSubsets(family), [family]);

  return (
    <div className="gallery">
      <header className="gallery-header">
        <h1>Spectre widget gallery</h1>
        <p className="muted">
          Stage 2 dev harness — every widget from DESIGN.md §6 in isolation. State round-trips
          through the URL: <code>{hash}</code>
        </p>
      </header>

      <div className="gallery-body">
        <aside className="gallery-sidebar">
          <fieldset>
            <legend>Scene</legend>
            <label className="control-row">
              <span>Family</span>
              <select
                value={family}
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
            <label className="control-row">
              <span>Root tile</span>
              <select
                value={state.rootTile}
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
            <label className="control-row">
              <span>Level</span>
              <span className="level-stepper">
                <button type="button" onClick={() => dispatch({ type: 'stepLevel', delta: -1 })}>
                  −
                </button>
                <strong>{state.level}</strong>
                <button type="button" onClick={() => dispatch({ type: 'stepLevel', delta: 1 })}>
                  +
                </button>
                <em>{tileCountAt(family, state.rootTile, state.level).toLocaleString()} tiles</em>
              </span>
            </label>
          </fieldset>

          <EdgeSubsetPicker
            family={family}
            subset={state.subset}
            highlightMajors={highlightMajors}
            onSubsetChange={(subset) => dispatch({ type: 'setSubset', subset })}
            onToggleMajor={(major) => dispatch({ type: 'toggleMajor', major })}
            onHoverMajor={() => undefined}
          />

          <fieldset>
            <legend>Group structure</legend>
            <p className="muted" style={{ margin: '0 0 6px' }}>
              Valid subsets are a group under XOR — combining two rules gives a third.
            </p>
            <div className="edge-legend-chips">
              {validSubsets.map((v) => (
                <button
                  key={v.mask}
                  type="button"
                  className="edge-chip"
                  onClick={() => dispatch({ type: 'xorSubset', mask: v.mask })}
                  title={`XOR with ${v.label || '∅'}`}
                >
                  ⊕ {v.edges.join('') || '∅'}
                </button>
              ))}
            </div>
          </fieldset>

          <DisplayToggles
            flags={state.flags}
            onToggle={(flag) => dispatch({ type: 'toggleFlag', flag })}
            hidden={family === 'hex' ? [FLAG.CURVY] : []}
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
            <SharePanel state={state} route="#/dev" />
          </fieldset>

          <fieldset>
            <legend>Analysis</legend>
            <StatsSummary
              result={analysis.result}
              running={analysis.running}
              error={analysis.error}
              highlightLengths={highlightLengths}
              onSelectLength={(length, additive) =>
                setHighlightLengths((prev) => {
                  if (additive) {
                    const next = new Set(prev);
                    if (!next.delete(length)) next.add(length);
                    return next;
                  }
                  return prev.size === 1 && prev.has(length) ? new Set() : new Set([length]);
                })
              }
              onClearLengths={() => setHighlightLengths(new Set())}
            />
          </fieldset>
        </aside>

        <main className="gallery-main">
          <Section
            id="tiling"
            title="TilingView + PanZoom + CircuitLayer"
            blurb="Wheel zooms to the cursor, drag pans, two fingers pinch. Circuits are coloured per length; wanderers are grey (or rainbow). Level ≥ 5 switches to the canvas renderer."
          >
            <div className="viewport">
              {state.level <= 4 ? (
                <PanZoom
                  fitBounds={model.bounds}
                  fitKey={`${family}:${state.rootTile}:${state.level}`}
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
                    >
                      {analysis.result && hasFlag(state, FLAG.LINES) ? (
                        <CircuitLayer
                          circuits={analysis.result.circuits}
                          tails={analysis.result.tails}
                          circuitColorByLength={analysis.result.circuitColors}
                          segmentColor={analysis.result.segmentColors}
                          rainbowTails={hasFlag(state, FLAG.RAINBOW_TAILS)}
                          highlightLengths={highlightLengths}
                          tailEndMarkers={state.level <= 3}
                          strokeWidth={0.12}
                        />
                      ) : null}
                    </TilingView>
                  )}
                </PanZoom>
              ) : (
                <TilingCanvas
                  family={family}
                  rootTile={state.rootTile}
                  level={state.level}
                  curvy={curvy}
                  colorScheme={state.colorScheme}
                  customColors={state.customColors}
                  selectedEdges={selected}
                  showBackgrounds={hasFlag(state, FLAG.BACKGROUNDS)}
                  showOutlines={hasFlag(state, FLAG.OUTLINES)}
                  circuits={analysis.result?.circuits}
                  tails={analysis.result?.tails}
                  circuitColorByLength={analysis.result?.circuitColors}
                  rainbowTails={hasFlag(state, FLAG.RAINBOW_TAILS)}
                />
              )}
            </div>
            {analysis.running ? <p className="muted">Worker is analysing…</p> : null}
          </Section>

          <Section
            id="canvas"
            title="TilingCanvas (heavy levels)"
            blurb="Canvas2D fallback for levels 5–6, where an SVG node per tile is not viable."
          >
            <label className="control-row">
              <span>Canvas level</span>
              <input
                type="range"
                min={3}
                max={6}
                value={canvasLevel}
                onChange={(e) => setCanvasLevel(Number.parseInt(e.target.value, 10))}
              />
              <strong>
                {canvasLevel} — {tileCountAt(family, 'Delta', canvasLevel).toLocaleString()} tiles
              </strong>
            </label>
            <div className="viewport viewport-short">
              <TilingCanvas
                family={family}
                level={canvasLevel}
                curvy={curvy}
                colorScheme={state.colorScheme}
                showOutlines={canvasLevel <= 5}
              />
            </div>
          </Section>

          <Section
            id="tileview"
            title="TileView"
            blurb="One tile in its own viewBox. Hover a seam to light it; in chord-draw mode, drag from one connection dot to another."
          >
            <div className="row">
              <label className="control-row">
                <span>Tile</span>
                <select
                  value={soloTile}
                  onChange={(e) => setSoloTile(e.target.value as TileTypeId)}
                >
                  {[...new Set<TileTypeId>([...order, 'Gamma'])].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <span className="muted">
                hovered: {hoverEdge ? `${hoverEdge.metaEdgeId} (${hoverEdge.label.raw})` : '—'}
              </span>
            </div>
            <div className="row">
              <TileView
                family={family}
                tileType={soloTile}
                size={260}
                curvy={curvy}
                colorScheme={state.colorScheme}
                customColors={state.customColors}
                contracts={state.contracts}
                selectedEdges={selected}
                showEdgeLabels={hasFlag(state, FLAG.EDGE_LABELS)}
                highlightMajors={highlightMajors}
                interaction="hover"
                markOdd
                onEdgeHover={setHoverEdge}
              />
              <TileView
                family={family}
                tileType={soloTile}
                size={260}
                curvy={curvy}
                colorScheme={state.colorScheme}
                contracts={state.contracts}
                selectedEdges={selected}
                matchingIndex={state.matching[order.indexOf(soloTile)] ?? 0}
                ghostMatchings
                interaction="chord-draw"
                ariaLabel={`${soloTile} chord-draw`}
              />
            </div>
          </Section>

          <Section
            id="legend"
            title="EdgeClassLegend"
            blurb="Toggling a class here changes the selection everywhere — dots appear and disappear on every tile at once."
          >
            <EdgeClassLegend
              family={family}
              selected={selected}
              highlight={highlightMajors}
              onToggle={(major) => dispatch({ type: 'toggleMajor', major })}
              legend={`classes present: ${familyMajors(family).join(', ')}`}
            />
          </Section>

          <Section
            id="palette"
            title="TilePalette"
            blurb="Fully controlled: hovering a seam raises onEdgeHover, the parent echoes highlightMajors back, and every tile lights its matching seams."
          >
            <TilePalette
              family={family}
              selectedEdges={selected}
              highlightMajors={highlightMajors}
              matchingIndexByType={matchingVectorToRecord(family, state.matching)}
              curvy={curvy}
              colorScheme={state.colorScheme}
              customColors={state.customColors}
              contracts={state.contracts}
              tileSize={140}
              markOdd
              interaction="edge-select"
              onEdgeHover={setHoverEdge}
              onEdgeToggle={(major) => dispatch({ type: 'toggleMajor', major })}
            />
          </Section>

          <Section
            id="matchings"
            title="MatchingSlider (per-tile matching editor)"
            blurb="Cycle a tile's matchings, restrict to the non-crossing options combination strings index into, or drag between dots to re-pair them."
          >
            <label className="control-row">
              <input
                type="checkbox"
                checked={nonCrossingOnly}
                onChange={(e) => setNonCrossingOnly(e.target.checked)}
              />
              <span>non-crossing only (all tiles)</span>
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
                  onNonCrossingOnlyChange={setNonCrossingOnly}
                  curvy={curvy}
                  colorScheme={state.colorScheme}
                  onChange={(index) => dispatch({ type: 'setMatching', tileType: type, index })}
                />
              ))}
            </div>
          </Section>

          <Section
            id="seam"
            title="SeamView"
            blurb="Two tiles glued along one seam. The shared crossing dot is computed independently from each side; the error below must be ~0."
          >
            <label className="control-row">
              <span>Seam class</span>
              <select
                value={seamMajor}
                onChange={(e) => setSeamMajor(Number.parseInt(e.target.value, 10))}
              >
                {familyMajors(family).map((m) => (
                  <option key={m} value={m}>
                    class {m}
                  </option>
                ))}
              </select>
              <span className="muted">
                shared-dot error: {seamPose ? seamPose.sharedDotError.toExponential(2) : 'n/a'}
              </span>
            </label>
            <SeamView
              family={family}
              tileA={soloTile}
              seamMajor={seamMajor}
              contracts={state.contracts}
              curvy={curvy}
              colorScheme={state.colorScheme}
              showLabels
              showSharedDot
              height={280}
            />
          </Section>
        </main>
      </div>

      <footer className="gallery-footer muted">
        Leaf order for combination strings: {LEAF_ORDER.join(' · ')}
      </footer>
    </div>
  );
}

export default DevGalleryPage;
