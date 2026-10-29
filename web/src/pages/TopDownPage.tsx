/**
 * `TopDownPage` — substitute a board one level deeper, a selected area at a
 * time, on the spectre or on the hexagons.
 *
 * Start from one type's level-1 supertile. Select tiles (click, or drag a
 * lasso), substitute: each selected tile is replaced by its own level-1
 * supertile and the unselected tiles drop out. A spectre's supertile is placed
 * from the tile's position alone (`supertileFrame`); a hexagon's from its slot
 * path (`supertileFrameByPath`), since hexagon positions do not determine it.
 * Either way the board is an exact part of the deeper supertile the bottom-up
 * construction builds, with the same slot paths.
 *
 * The step can be animated: the old board enlarges onto the new one, each
 * tile fades into its supertile in a sweep, and each supertile slides by its
 * own small offset into place.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';

import { PanZoom, type PanZoomApi } from '../components';
import {
  TILE_NAMES,
  applyMatrix,
  leafOrder,
  parentId,
  stepMatrix,
  supertileFrame,
  supertileFrameByPath,
  svgMatrixString,
  topDownRule,
  zRot,
  zSub,
  type Affine,
  type Pt,
  type TileTypeId,
  type TopDownFamily,
  type TopDownTile,
  type ZVec,
} from '../core';
import { cameraAffine } from '../lib/viewport';
import { tileColor } from '../lib/palette';
import { tileDefId, tileOutline } from '../lib/tilingModel';
import {
  MAX_BOARD_TILES,
  boardsFor,
  boundsOf,
  charPoly,
  childCount,
  drawTiles,
  formatPoly,
  hashToState,
  stateToHash,
  supertileOutlines,
  tileAt,
  tilesInLasso,
  type DrawTile,
  type Step,
  type TopDownUrlState,
} from './topdown/board';
import { enlarged, planStep, tileFrame, type StepPlan } from './topdown/animate';
import '../styles/topdown.css';

export interface TopDownPageProps {
  /** Mirror state into `location.hash` (default true; tests can opt out). */
  readonly syncUrl?: boolean;
}

type Tool = 'pan' | 'lasso';

/** A press that moves less than this is a click, not a pan. */
const CLICK_SLOP = 5;
const PREFIX = 'td';
/** Steps that make more tiles than this are not animated. */
const ANIMATE_MAX_TILES = 8_000;
const SPEEDS: readonly { label: string; ms: number }[] = [
  { label: 'off', ms: 0 },
  { label: '2 s', ms: 2_000 },
  { label: '5 s', ms: 5_000 },
  { label: '12 s', ms: 12_000 },
];

const FAMILIES: readonly { id: TopDownFamily; label: string }[] = [
  { id: 'spectre', label: 'Spectre' },
  { id: 'hex', label: 'Hexagons' },
];

const fmt = (n: number): string => n.toLocaleString('en-US');
const coeffs = (p: ZVec): string => `(${p.join(', ')})`;
const same = (x: Affine): Affine => x;

function MatrixTable(props: { readonly m: readonly (readonly number[])[]; readonly label: string }): JSX.Element {
  return (
    <table className="td-matrix" aria-label={props.label}>
      <tbody>
        {props.m.map((row, i) => (
          <tr key={i}>
            {row.map((x, j) => (
              <td key={j}>{x}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface Animation {
  readonly plan: StepPlan;
  readonly previous: readonly DrawTile[];
  readonly ms: number;
}

export function TopDownPage(props: TopDownPageProps): JSX.Element {
  const syncUrl = props.syncUrl ?? true;

  const [state, setState] = useState<TopDownUrlState>(() =>
    syncUrl && typeof window !== 'undefined' ? hashToState(window.location.hash) : hashToState(''),
  );
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set<string>());
  const [focus, setFocus] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>('pan');
  const [outlines, setOutlines] = useState(true);
  const [speed, setSpeed] = useState(SPEEDS[1].ms);
  const [lasso, setLasso] = useState<Pt[] | null>(null);
  const [anim, setAnim] = useState<Animation | null>(null);
  const [progress, setProgress] = useState(1);
  const panRef = useRef<PanZoomApi | null>(null);
  const pressRef = useRef<Pt | null>(null);
  const lassoRemoves = useRef(false);
  const lassoOrigin = useRef<Pt>({ x: 0, y: 0 });
  /** The board before a substitution, kept until the new board is drawn so the step can animate. */
  const pending = useRef<readonly DrawTile[] | null>(null);
  const speedRef = useRef(speed);
  speedRef.current = speed;

  const { family } = state;

  // --- URL --------------------------------------------------------------
  useEffect(() => {
    if (!syncUrl || typeof window === 'undefined') return;
    const hash = stateToHash(state);
    if (window.location.hash !== hash) window.history.replaceState(window.history.state, '', hash);
  }, [state, syncUrl]);

  useEffect(() => {
    if (!syncUrl || typeof window === 'undefined') return;
    const onHash = (): void => {
      const next = hashToState(window.location.hash);
      setState((prev) => (stateToHash(prev) === stateToHash(next) ? prev : next));
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [syncUrl]);

  // --- boards -------------------------------------------------------------
  const boards = useMemo(
    () => boardsFor(family, state.type, state.steps),
    [family, state.type, state.steps],
  );
  const board = boards[boards.length - 1];
  const previous = boards.length > 1 ? boards[boards.length - 2] : null;
  const level = boards.length - 1;
  const tiles = useMemo(() => drawTiles(board, family), [board, family]);
  const bounds = useMemo(() => boundsOf(tiles), [tiles]);
  const groups = useMemo(
    () => (level > 0 && outlines ? supertileOutlines(board, family) : []),
    [board, family, level, outlines],
  );
  const previousType = useMemo(() => new Map((previous ?? []).map((t) => [t.id, t.type])), [previous]);
  const byId = useMemo(() => new Map(board.map((t) => [t.id, t])), [board]);

  const target = selected.size > 0 ? board.filter((t) => selected.has(t.id)) : board;
  const nextCount = target.reduce((s, t) => s + childCount(t.type), 0);
  const tooMany = nextCount > MAX_BOARD_TILES;

  // A new board: clear the selection, and animate the step that made it.
  useEffect(() => {
    setSelected(new Set<string>());
    setFocus(null);
    const before = pending.current;
    pending.current = null;
    const ms = speedRef.current;
    setAnim(before && ms > 0 && tiles.length <= ANIMATE_MAX_TILES ? { plan: planStep(before, tiles), previous: before, ms } : null);
  }, [tiles]);

  useEffect(() => {
    if (!anim) return undefined;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number): void => {
      const t = Math.min(1, (now - t0) / anim.ms);
      setProgress(t);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setAnim(null);
    };
    setProgress(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [anim]);

  // --- actions ------------------------------------------------------------
  const start = useCallback((type: TileTypeId): void => {
    setState((prev) => ({ ...prev, type, steps: ['*'] }));
  }, []);
  const pickFamily = useCallback((next: TopDownFamily): void => {
    setState((prev) => ({ ...prev, family: next, steps: ['*'] }));
  }, []);
  const substitute = useCallback((): void => {
    if (tooMany) return;
    const step: Step = selected.size === 0 || selected.size === board.length ? '*' : [...selected].sort();
    pending.current = tiles;
    setState((prev) => ({ ...prev, steps: [...prev.steps, step] }));
  }, [board.length, selected, tiles, tooMany]);
  const undo = useCallback((): void => {
    setState((prev) => ({ ...prev, steps: prev.steps.slice(0, -1) }));
  }, []);
  const replay = useCallback((): void => {
    if (!previous || speed === 0) return;
    const before = drawTiles(previous, family);
    setAnim({ plan: planStep(before, tiles), previous: before, ms: speed });
  }, [previous, family, tiles, speed]);
  const toggle = useCallback((id: string): void => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
    setFocus(id);
  }, []);

  // --- pointer: click to toggle a tile, lasso to select an area ------------
  const onPressDown = (e: ReactPointerEvent): void => {
    // The zoom buttons and the lasso surface handle their own presses.
    const own = (e.target as Element | null)?.closest?.('[data-panzoom-ignore]');
    pressRef.current = own ? null : { x: e.clientX, y: e.clientY };
  };
  const onPressUp = (e: ReactPointerEvent): void => {
    const down = pressRef.current;
    pressRef.current = null;
    if (!down || tool !== 'pan' || !panRef.current || anim) return;
    if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > CLICK_SLOP) return;
    const hit = tileAt(tiles, panRef.current.toWorld({ x: e.clientX, y: e.clientY }));
    if (hit) toggle(hit.id);
  };

  const lassoDown = (e: ReactPointerEvent<HTMLDivElement>): void => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const box = e.currentTarget.getBoundingClientRect();
    lassoOrigin.current = { x: box.left, y: box.top };
    lassoRemoves.current = e.altKey;
    setLasso([{ x: e.clientX, y: e.clientY }]);
  };
  const lassoMove = (e: ReactPointerEvent<HTMLDivElement>): void => {
    if (!lasso) return;
    const last = lasso[lasso.length - 1];
    if (Math.hypot(e.clientX - last.x, e.clientY - last.y) < 3) return;
    setLasso([...lasso, { x: e.clientX, y: e.clientY }]);
  };
  const lassoUp = (): void => {
    if (!lasso || !panRef.current) {
      setLasso(null);
      return;
    }
    const api = panRef.current;
    const ids = tilesInLasso(tiles, lasso.map((p) => api.toWorld(p)));
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (lassoRemoves.current) next.delete(id);
        else next.add(id);
      }
      return next;
    });
    setLasso(null);
  };

  // --- drawing --------------------------------------------------------------
  const defs = useMemo(
    () => leafOrder(family).map((type) => ({ type, d: tileOutline(family, type, false) })),
    [family],
  );
  const leafUses = useCallback(
    (t: DrawTile, xform: (x: Affine) => Affine = same): ReactNode[] =>
      t.leaves.map((leaf, i) => (
        <use
          key={i}
          href={`#${tileDefId(PREFIX, leaf.type)}`}
          transform={svgMatrixString(xform(leaf.xform))}
          fill={tileColor(leaf.type, 'bright')}
        />
      )),
    [],
  );
  const drawn = useMemo(
    () =>
      tiles.map((t) => (
        <g key={t.id} data-id={t.id} data-type={t.type}>
          {leafUses(t)}
        </g>
      )),
    [tiles, leafUses],
  );
  const picked = useMemo(
    () => tiles.filter((t) => selected.has(t.id)).map((t) => <g key={t.id}>{leafUses(t)}</g>),
    [tiles, selected, leafUses],
  );
  const focusTile = focus ? tiles.find((t) => t.id === focus) ?? null : null;

  /** The animation's still parts: the old tiles enlarged, and the new tiles grouped by the tile they replace. */
  const animParts = useMemo(() => {
    if (!anim) return null;
    const plans = new Map(anim.plan.parents.map((p) => [p.id, p]));
    const old = anim.previous.map((t) => ({
      id: t.id,
      node: leafUses(t, (x) => enlarged(anim.plan, x)),
    }));
    const children = new Map<string, ReactNode[]>();
    for (const t of tiles) {
      const pid = parentId(t.id);
      (children.get(pid) ?? children.set(pid, []).get(pid)!).push(<g key={t.id}>{leafUses(t)}</g>);
    }
    const outlinesById = new Map(groups.map((g) => [g.id, g.d]));
    return { plans, old, children, outlinesById };
  }, [anim, tiles, groups, leafUses]);

  const fitKey = `${family}:${state.type}:${state.steps.length}:${board.length}`;
  const lassoPath = lasso && lasso.length > 1 ? lasso : null;

  // --- the rule, computed -----------------------------------------------------
  const rule = topDownRule(family);
  const step = useMemo(() => stepMatrix(family), [family]);
  const poly = useMemo(() => (step ? formatPoly(charPoly(step)) : ''), [step]);
  const focusBoard: TopDownTile | null = focus ? byId.get(focus) ?? null : null;
  const worked = useMemo(() => {
    if (!focusBoard) return null;
    const { z } = focusBoard;
    const byPath = supertileFrameByPath(focusBoard.id, family);
    if (!rule) return { z, byPath, rows: null };
    return {
      z,
      byPath,
      rows: {
        Lt: applyMatrix(rule.matrix, z.t),
        turn: zSub(zRot(rule.centre, z.k), rule.centre),
        frame: supertileFrame(z, family),
      },
    };
  }, [focusBoard, rule, family]);

  const renderBoard = (scale: number): ReactNode => {
    const hairline = 0.7 / scale;
    if (anim && animParts) {
      const others = 1 - Math.min(1, progress / 0.15);
      return (
        <g className="td-tiles" stroke="#10131a" strokeWidth={hairline} strokeLinejoin="round">
          {animParts.old.map((o) => {
            const plan = animParts.plans.get(o.id);
            const opacity = plan ? 1 - tileFrame(plan.start, progress).shown : others;
            return opacity > 0 ? (
              <g key={`o${o.id}`} opacity={opacity}>
                {o.node}
              </g>
            ) : null;
          })}
          {anim.plan.parents.map((p) => {
            const f = tileFrame(p.start, progress);
            if (f.shown <= 0) return null;
            const d = animParts.outlinesById.get(p.id);
            return (
              <g
                key={`n${p.id}`}
                opacity={f.shown}
                transform={`translate(${-p.offset.x * f.remaining},${-p.offset.y * f.remaining})`}
              >
                {animParts.children.get(p.id)}
                {d ? <path d={d} fill="none" strokeWidth={2.2 / scale} strokeLinecap="round" /> : null}
              </g>
            );
          })}
        </g>
      );
    }
    return (
      <>
        <g
          className="td-tiles"
          stroke="#10131a"
          strokeWidth={hairline}
          strokeLinejoin="round"
          opacity={picked.length > 0 ? 0.35 : 1}
        >
          {drawn}
        </g>
        {picked.length > 0 ? (
          <g className="td-picked" stroke="var(--accent)" strokeWidth={1.4 / scale} strokeLinejoin="round">
            {picked}
          </g>
        ) : null}
        {groups.length > 0 ? (
          <g className="td-supertiles" fill="none" stroke="#10131a" strokeWidth={2.2 / scale} strokeLinecap="round">
            {groups.map((g) => (
              <path key={g.id} d={g.d} data-parent={g.id} data-parent-type={previousType.get(g.id)} />
            ))}
          </g>
        ) : null}
        {focusTile ? (
          <g className="td-focus" fill="none" stroke="var(--accent)" strokeWidth={3 / scale}>
            {focusTile.polys.map((poly, i) => (
              <polygon key={i} points={poly.map((p) => `${p.x},${p.y}`).join(' ')} />
            ))}
          </g>
        ) : null}
      </>
    );
  };

  return (
    <section className="td-page">
      <header className="td-header">
        <div className="td-title">
          <h1>Top-down</h1>
          <p className="muted">
            Select an area and substitute it: every selected tile is replaced by its level-1
            supertile, the rest drop out, and the board is one level deeper there. The board is
            always an exact part of the deeper supertile, with the same slot paths.
          </p>
        </div>
      </header>

      <div className="td-types">
        <div className="td-tools" role="group" aria-label="Tile family">
          {FAMILIES.map((f) => (
            <button
              key={f.id}
              type="button"
              className={f.id === family ? 'is-on' : ''}
              aria-pressed={f.id === family}
              data-testid={`td-family-${f.id}`}
              onClick={() => pickFamily(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="td-chips" role="group" aria-label="Start from a type's level-1 supertile">
          {TILE_NAMES.map((type) => (
            <button
              key={type}
              type="button"
              className={type === state.type ? 'td-type is-on' : 'td-type'}
              style={{ background: tileColor(type === 'Gamma' && family === 'spectre' ? 'Gamma1' : type, 'bright') }}
              data-testid={`td-type-${type}`}
              aria-pressed={type === state.type}
              onClick={() => start(type)}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="td-toolbar">
        <div className="td-tools" role="group" aria-label="What dragging does">
          <button
            type="button"
            aria-pressed={tool === 'pan'}
            className={tool === 'pan' ? 'is-on' : ''}
            data-testid="td-pan"
            onClick={() => setTool('pan')}
          >
            Drag pans, click selects
          </button>
          <button
            type="button"
            aria-pressed={tool === 'lasso'}
            className={tool === 'lasso' ? 'is-on' : ''}
            data-testid="td-lasso"
            onClick={() => setTool('lasso')}
          >
            Drag a lasso (Alt removes)
          </button>
        </div>
        <button type="button" data-testid="td-all" onClick={() => setSelected(new Set(board.map((t) => t.id)))}>
          Select all
        </button>
        <button
          type="button"
          data-testid="td-clear"
          disabled={selected.size === 0}
          onClick={() => setSelected(new Set<string>())}
        >
          Clear
        </button>
        <button
          type="button"
          className="td-primary"
          data-testid="td-substitute"
          disabled={tooMany}
          title={tooMany ? `${fmt(nextCount)} tiles: over ${fmt(MAX_BOARD_TILES)}, select a smaller area` : undefined}
          onClick={substitute}
        >
          {selected.size === 0 ? 'Substitute all' : `Substitute ${fmt(selected.size)} selected`}
        </button>
        <button type="button" data-testid="td-undo" disabled={state.steps.length === 0} onClick={undo}>
          Undo
        </button>
        <label className="td-check">
          <span>Animate</span>
          <select
            aria-label="Animation length"
            data-testid="td-speed"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
          >
            {SPEEDS.map((s) => (
              <option key={s.ms} value={s.ms}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          data-testid="td-replay"
          disabled={!previous || speed === 0 || tiles.length > ANIMATE_MAX_TILES}
          onClick={replay}
        >
          Replay step
        </button>
        <label className="td-check">
          <input type="checkbox" checked={outlines} onChange={(e) => setOutlines(e.target.checked)} />
          <span>Outline each supertile</span>
        </label>
      </div>

      <div className="td-viewport" onPointerDown={onPressDown} onPointerUp={onPressUp}>
        <PanZoom
          apiRef={panRef}
          fitBounds={bounds}
          fitKey={fitKey}
          padding={0.06}
          showControls
          ariaLabel="Board — drag to pan, wheel to zoom"
        >
          {(api) => (
            <>
              <svg
                className="td-view"
                width="100%"
                height="100%"
                role="img"
                aria-label={`${state.type} board at level ${level}, ${board.length} tiles`}
                data-testid="td-svg"
                data-family={family}
                data-level={level}
                data-tile-count={board.length}
                data-selected={selected.size}
                data-animating={anim ? 'yes' : 'no'}
              >
                <defs>
                  {defs.map((def) => (
                    <path key={def.type} id={tileDefId(PREFIX, def.type)} d={def.d} />
                  ))}
                </defs>
                {/* Strokes are given in screen pixels: divided by the zoom. */}
                <g transform={svgMatrixString(cameraAffine(api.camera))}>{renderBoard(api.camera.scale)}</g>
              </svg>
              {tool === 'lasso' ? (
                <div
                  className="td-lasso"
                  data-panzoom-ignore=""
                  data-testid="td-lasso-surface"
                  onPointerDown={lassoDown}
                  onPointerMove={lassoMove}
                  onPointerUp={lassoUp}
                  onPointerCancel={() => setLasso(null)}
                >
                  {lassoPath ? (
                    <svg className="td-lasso-line" width="100%" height="100%">
                      <polygon
                        points={lassoPath
                          .map((p) => `${p.x - lassoOrigin.current.x},${p.y - lassoOrigin.current.y}`)
                          .join(' ')}
                      />
                    </svg>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </PanZoom>

        <div className="td-hud" role="status" data-testid="td-hud">
          <span>
            {state.type} · level <strong data-testid="td-level">{level}</strong>
          </span>
          <span data-testid="td-count">{fmt(board.length)} tiles</span>
          <span data-testid="td-selected">{fmt(selected.size)} selected</span>
          <span>
            next: {fmt(nextCount)} tiles{tooMany ? ' — too many' : ''}
          </span>
        </div>
      </div>

      <div className="td-panels">
        {rule ? (
          <section className="td-panel" aria-labelledby="td-rule-h">
            <h2 id="td-rule-h">Where a spectre's supertile goes</h2>
            <p>
              With <i>d</i> = e<sup>iπ/6</sup>, a tile at <i>x</i> ↦ <i>d</i>
              <sup>k</sup>
              <i>x</i> + <i>t</i>, <i>t</i> written as its coefficients on 1, <i>d</i>, <i>d</i>²,{' '}
              <i>d</i>³, has its level-1 supertile at
            </p>
            <p className="td-formula">
              <i>x</i> ↦ <i>d</i>
              <sup>k</sup>
              <i>x</i> + <i>L t</i> + (<i>d</i>
              <sup>k</sup> − 1) <i>v</i>
            </p>
            <div className="td-objects">
              <figure>
                <MatrixTable m={rule.matrix} label="The matrix L" />
                <figcaption>
                  <i>L</i>
                </figcaption>
              </figure>
              <figure>
                <code className="td-vec">{coeffs(rule.centre)}</code>
                <figcaption>
                  <i>v</i>
                </figcaption>
              </figure>
            </div>
            <p className="muted">
              Both are solved exactly from the 63 tiles of the level-2 Delta supertile and where
              their supertiles sit in the level-3 one: 252 equations, 20 unknowns, one integer
              solution. The tile's type does not enter. <i>L</i> commutes with turns by 60° but
              not by 30°, so it is not a turn and a scale, and no similarity carries one level's
              supertile onto the next.
            </p>
          </section>
        ) : (
          <section className="td-panel" aria-labelledby="td-rule-h" data-testid="td-hex-rule">
            <h2 id="td-rule-h">Where a hexagon's supertile goes</h2>
            <p>
              Every hexagon sits on the triangular lattice, and its position does not say where
              its supertile goes: the 252 equations that give the spectre its matrix have no
              solution here. A hexagon's supertile is placed from its slot path <i>s</i>
              <sub>1</sub>.<i>s</i>
              <sub>2</sub>…<i>s</i>
              <sub>n</sub> instead, the same path with every transform moved up one level:
            </p>
            <p className="td-formula">
              <i>R</i>
              <sup>n</sup> <i>T</i>
              <sub>n+1</sub>[<i>s</i>
              <sub>1</sub>] <i>T</i>
              <sub>n</sub>[<i>s</i>
              <sub>2</sub>] ⋯ <i>T</i>
              <sub>2</sub>[<i>s</i>
              <sub>n</sub>]
            </p>
            <p className="muted">
              <i>T</i>
              <sub>j</sub>[<i>s</i>] is the transform of slot <i>s</i> in a level-<i>j</i>{' '}
              supertile and <i>R</i> the reflection between levels. The tile itself sits at the
              same product one level lower, <i>R</i>
              <sup>n</sup> <i>T</i>
              <sub>n</sub>[<i>s</i>
              <sub>1</sub>] ⋯ <i>T</i>
              <sub>1</sub>[<i>s</i>
              <sub>n</sub>].
            </p>
          </section>
        )}

        {step ? (
          <section className="td-panel" aria-labelledby="td-step-h">
            <h2 id="td-step-h">One step</h2>
            <p>
              The children go into their slots of that supertile as in the bottom-up construction,
              and the result is reflected by <i>R</i>, since each level mirrors the one below. On
              positions one step is <i>M</i> = <i>R L</i>:
            </p>
            <div className="td-objects">
              <figure>
                <MatrixTable m={step} label="The step matrix M" />
                <figcaption>
                  <i>M</i>
                </figcaption>
              </figure>
            </div>
            <p>
              Its characteristic polynomial is <strong data-testid="td-poly">{poly}</strong>, so{' '}
              <i>λ</i>² = 4 ± √15: the substitution's area factor and its conjugate.
            </p>
          </section>
        ) : null}

        <section className="td-panel" aria-labelledby="td-tile-h" data-testid="td-worked">
          <h2 id="td-tile-h">The clicked tile</h2>
          {worked && focusBoard ? (
            <table className="td-worked">
              <tbody>
                <tr>
                  <th>slot path</th>
                  <td>{focusBoard.id || '(root)'}</td>
                </tr>
                <tr>
                  <th>type</th>
                  <td>{focusBoard.type}</td>
                </tr>
                <tr>
                  <th>
                    <i>k</i>
                  </th>
                  <td>
                    {worked.z.k} ({worked.z.k * 30}°)
                  </td>
                </tr>
                <tr>
                  <th>
                    <i>t</i>
                  </th>
                  <td>{coeffs(worked.z.t)}</td>
                </tr>
                {worked.rows ? (
                  <>
                    <tr>
                      <th>
                        <i>L t</i>
                      </th>
                      <td>{coeffs(worked.rows.Lt)}</td>
                    </tr>
                    <tr>
                      <th>
                        (<i>d</i>
                        <sup>k</sup> − 1) <i>v</i>
                      </th>
                      <td>{coeffs(worked.rows.turn)}</td>
                    </tr>
                    <tr>
                      <th>supertile at</th>
                      <td data-testid="td-frame">{coeffs(worked.rows.frame.t)}</td>
                    </tr>
                  </>
                ) : null}
                <tr>
                  <th>by slot path</th>
                  <td data-testid="td-frame-path">{coeffs(worked.byPath.t)}</td>
                </tr>
              </tbody>
            </table>
          ) : (
            <p className="muted">Click a tile to see its numbers.</p>
          )}
        </section>
      </div>
    </section>
  );
}

export default TopDownPage;
