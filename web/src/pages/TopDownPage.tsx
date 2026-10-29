/**
 * `TopDownPage` — a map of tiles you substitute in place, as deep as you like.
 *
 * The map starts as a supertile of hexagons or spectres. Click a tile and it
 * turns into its level-1 supertile cluster where it stands, then slides into
 * the place the substitution gives it; every other tile stays put. Any tiles,
 * any number of times: each depth is drawn through one fixed map between
 * levels (`levelMap`), so a cluster always lands within a bounded slide of
 * the tile it replaced.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

import { PanZoom, type PanZoomApi } from '../components';
import {
  TILE_NAMES,
  stepMatrix,
  supertileFrameByPath,
  topDownRule,
  type Pt,
  type TileTypeId,
  type TopDownFamily,
  type ZVec,
} from '../core';
import type { Camera, Size } from '../lib/viewport';
import { tileColor } from '../lib/palette';
import {
  MAX_START_LEVEL,
  charPoly,
  formatPoly,
  hashToState,
  stateToHash,
  tileAt,
  tilesInLasso,
  type TopDownUrlState,
} from './topdown/board';
import { drawMap, progressOf, type Running } from './topdown/draw';
import { MAX_DEPTH, MAX_MAP_TILES, prune, startMap, substitute, tilesIn, undo, type TopDownMap } from './topdown/map';
import { FIT_LEVEL, QUAD_LEVEL, levelMap } from './topdown/world';
import '../styles/topdown.css';

export interface TopDownPageProps {
  /** Mirror state into `location.hash` (default true; tests can opt out). */
  readonly syncUrl?: boolean;
}

type Tool = 'substitute' | 'select' | 'lasso';

/** A press that moves less than this is a click, not a pan. */
const CLICK_SLOP = 5;
const INK = '#10131a';
const SPEEDS: readonly { label: string; ms: number }[] = [
  { label: 'off', ms: 0 },
  { label: '1.5 s', ms: 1_500 },
  { label: '4 s', ms: 4_000 },
  { label: '10 s', ms: 10_000 },
];
const FAMILIES: readonly { id: TopDownFamily; label: string }[] = [
  { id: 'hex', label: 'Hexagons' },
  { id: 'spectre', label: 'Spectre' },
];
const TOOLS: readonly { id: Tool; label: string }[] = [
  { id: 'substitute', label: 'Click substitutes' },
  { id: 'select', label: 'Click selects' },
  { id: 'lasso', label: 'Lasso selects (Alt removes)' },
];

const fmt = (n: number): string => n.toLocaleString('en-US');
const coeffs = (p: ZVec): string => `(${p.join(', ')})`;

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

interface CanvasProps {
  readonly map: TopDownMap;
  readonly camera: Camera;
  readonly size: Size;
  readonly running: React.MutableRefObject<Running[]>;
  /** Bumped when a substitution starts, to start the frame loop. */
  readonly runKey: number;
  readonly selected: ReadonlySet<string>;
  readonly focus: string | null;
  readonly outlines: boolean;
}

function MapCanvas(props: CanvasProps): JSX.Element {
  const { map, camera, size, running, runKey, selected, focus, outlines } = props;
  const ref = useRef<HTMLCanvasElement | null>(null);
  const accent = useMemo(
    () =>
      typeof document === 'undefined'
        ? '#2f7d5b'
        : getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#2f7d5b',
    [],
  );

  const draw = useCallback(
    (now: number): void => {
      const canvas = ref.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(1, Math.round(size.width * dpr));
      const h = Math.max(1, Math.round(size.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawMap(ctx, {
        map,
        camera,
        width: size.width,
        height: size.height,
        running: running.current,
        now,
        selected,
        focus,
        outlines,
        colour: (type) => tileColor(type, 'bright'),
        accent,
        ink: INK,
      });
    },
    [map, camera, size, running, selected, focus, outlines, accent],
  );

  useLayoutEffect(() => draw(performance.now()), [draw]);

  useEffect(() => {
    if (running.current.length === 0) return undefined;
    let raf = 0;
    const tick = (now: number): void => {
      draw(now);
      running.current = running.current.filter((r) => progressOf(r, now) < 1);
      if (running.current.length > 0) raf = requestAnimationFrame(tick);
      else draw(now);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [runKey, draw, running]);

  return (
    <canvas
      ref={ref}
      className="td-canvas"
      style={{ width: size.width, height: size.height }}
      data-testid="td-canvas"
    />
  );
}

export function TopDownPage(props: TopDownPageProps): JSX.Element {
  const syncUrl = props.syncUrl ?? true;

  const [url, setUrl] = useState<TopDownUrlState>(() =>
    syncUrl && typeof window !== 'undefined' ? hashToState(window.location.hash) : hashToState(''),
  );
  const [map, setMap] = useState<TopDownMap>(() => startMap(url.family, url.type, url.level));
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set<string>());
  const [focus, setFocus] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>('substitute');
  const [outlines, setOutlines] = useState(true);
  const [speed, setSpeed] = useState(SPEEDS[1].ms);
  const [message, setMessage] = useState<string | null>(null);
  const [lasso, setLasso] = useState<Pt[] | null>(null);
  const [runKey, setRunKey] = useState(0);
  const [fitKey, setFitKey] = useState(0);
  const running = useRef<Running[]>([]);
  const panRef = useRef<PanZoomApi | null>(null);
  const pressRef = useRef<Pt | null>(null);
  const lassoRemoves = useRef(false);
  const lassoOrigin = useRef<Pt>({ x: 0, y: 0 });

  const { family } = map;

  // --- URL --------------------------------------------------------------
  useEffect(() => {
    if (!syncUrl || typeof window === 'undefined') return;
    const hash = stateToHash(url);
    if (window.location.hash !== hash) window.history.replaceState(window.history.state, '', hash);
  }, [url, syncUrl]);

  const restart = useCallback((next: TopDownUrlState): void => {
    running.current = [];
    setUrl(next);
    setMap(startMap(next.family, next.type, next.level));
    setSelected(new Set<string>());
    setFocus(null);
    setMessage(null);
    setFitKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!syncUrl || typeof window === 'undefined') return;
    const onHash = (): void => {
      const next = hashToState(window.location.hash);
      if (stateToHash(next) !== stateToHash(url)) restart(next);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [syncUrl, url, restart]);

  // --- substituting -------------------------------------------------------
  const run = useCallback(
    (ids: readonly string[]): void => {
      const result = substitute(map, ids);
      if (!result.ok) {
        setMessage(`Not substituted: ${result.reason}.`);
        return;
      }
      setMessage(null);
      setMap(result.map);
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.delete(id);
        return next;
      });
      if (speed > 0) {
        running.current = [...running.current, { batch: result.batch, t0: performance.now(), ms: speed }];
        setRunKey((k) => k + 1);
      }
    },
    [map, speed],
  );

  const viewRect = (): { min: Pt; max: Pt } | null => {
    const api = panRef.current;
    if (!api) return null;
    const { camera: c, size: s } = api;
    return {
      min: { x: -c.x / c.scale, y: -c.y / c.scale },
      max: { x: (s.width - c.x) / c.scale, y: (s.height - c.y) / c.scale },
    };
  };
  const inView = (): string[] => {
    const r = viewRect();
    return r ? tilesIn(map, r.min, r.max).map((p) => p.tile.id) : [];
  };
  const undoLast = (): void => {
    running.current = [];
    setMap((m) => undo(m));
    setSelected(new Set<string>());
    setMessage(null);
  };
  const keepInView = (): void => {
    const r = viewRect();
    if (!r) return;
    running.current = [];
    setMap((m) => prune(m, (p) => p.max.x >= r.min.x && p.min.x <= r.max.x && p.max.y >= r.min.y && p.min.y <= r.max.y));
    setSelected(new Set<string>());
  };

  // --- pointer: click a tile, or lasso an area ------------------------------
  const onPressDown = (e: ReactPointerEvent): void => {
    // The zoom buttons and the lasso surface handle their own presses.
    const own = (e.target as Element | null)?.closest?.('[data-panzoom-ignore]');
    pressRef.current = own ? null : { x: e.clientX, y: e.clientY };
  };
  const onPressUp = (e: ReactPointerEvent): void => {
    const down = pressRef.current;
    pressRef.current = null;
    if (!down || tool === 'lasso' || !panRef.current) return;
    if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > CLICK_SLOP) return;
    const hit = tileAt(map.tiles.values(), panRef.current.toWorld({ x: e.clientX, y: e.clientY }));
    if (!hit) return;
    setFocus(hit.tile.id);
    if (tool === 'substitute') {
      run([hit.tile.id]);
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(hit.tile.id)) next.add(hit.tile.id);
      return next;
    });
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
    const api = panRef.current;
    if (lasso && api) {
      const ids = tilesInLasso(map.tiles.values(), lasso.map((p) => api.toWorld(p)));
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of ids) {
          if (lassoRemoves.current) next.delete(id);
          else next.add(id);
        }
        return next;
      });
    }
    setLasso(null);
  };

  // --- what the page reports ------------------------------------------------
  const startBounds = useMemo(() => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of map.tiles.values()) {
      if (p.depth !== map.start) continue;
      minX = Math.min(minX, p.min.x);
      minY = Math.min(minY, p.min.y);
      maxX = Math.max(maxX, p.max.x);
      maxY = Math.max(maxY, p.max.y);
    }
    return Number.isFinite(minX)
      ? { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } }
      : { min: { x: -1, y: -1 }, max: { x: 1, y: 1 } };
    // the frame is the map as it started; it changes only on a restart
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);
  const depths = useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const p of map.tiles.values()) {
      lo = Math.min(lo, p.depth);
      hi = Math.max(hi, p.depth);
    }
    return { lo, hi };
  }, [map]);
  const lm = useMemo(() => levelMap(family), [family]);
  const rule = topDownRule(family);
  const step = useMemo(() => stepMatrix(family), [family]);
  const poly = useMemo(() => (step ? formatPoly(charPoly(step)) : ''), [step]);

  /** The last tile clicked, or the cluster it became. */
  const focusInfo = useMemo(() => {
    if (!focus) return null;
    const tile = map.tiles.get(focus);
    const batch = [...map.history].reverse().find((b) => b.children.has(focus));
    const plan = batch?.plan.find((p) => p.id === focus);
    const kids = batch?.children.get(focus);
    const parent = batch?.parents.find((p) => p.tile.id === focus);
    if (tile) return { id: focus, type: tile.tile.type, depth: tile.depth, z: tile.tile.z, slide: null };
    if (!plan || !kids || !parent) return null;
    // world units to edge lengths of the cluster's tiles
    const edges = Math.pow(levelMap(map.family).scale, parent.depth + 1 - map.start);
    return {
      id: focus,
      type: parent.tile.type,
      depth: parent.depth,
      z: parent.tile.z,
      slide: Math.hypot(plan.offset.x, plan.offset.y) * edges,
    };
  }, [focus, map]);

  const lassoPath = lasso && lasso.length > 1 ? lasso : null;

  return (
    <section className="td-page">
      <header className="td-header">
        <div className="td-title">
          <h1>Top-down</h1>
          <p className="muted">
            Click a tile and it turns into its supertile cluster where it stands, then slides into
            the place the substitution gives it; the rest of the map stays put. Do it to any tiles,
            as many times as you like: zoom in and keep going.
          </p>
        </div>
      </header>

      <div className="td-types">
        <div className="td-tools" role="group" aria-label="Tile family">
          {FAMILIES.map((f) => (
            <button
              key={f.id}
              type="button"
              className={f.id === url.family ? 'is-on' : ''}
              aria-pressed={f.id === url.family}
              data-testid={`td-family-${f.id}`}
              onClick={() => restart({ ...url, family: f.id })}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="td-chips" role="group" aria-label="Start from a supertile of this type">
          {TILE_NAMES.map((type) => (
            <button
              key={type}
              type="button"
              className={type === url.type ? 'td-type is-on' : 'td-type'}
              style={{ background: tileColor(type === 'Gamma' && url.family === 'spectre' ? 'Gamma1' : type, 'bright') }}
              data-testid={`td-type-${type}`}
              aria-pressed={type === url.type}
              onClick={() => restart({ ...url, type: type as TileTypeId })}
            >
              {type}
            </button>
          ))}
        </div>
        <label className="td-check">
          <span>Start at level</span>
          <select
            aria-label="Level of the starting supertile"
            data-testid="td-level-start"
            value={url.level}
            onChange={(e) => restart({ ...url, level: Number(e.target.value) })}
          >
            {Array.from({ length: MAX_START_LEVEL + 1 }, (_, i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="td-toolbar">
        <div className="td-tools" role="group" aria-label="What a click or drag does">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={tool === t.id}
              className={tool === t.id ? 'is-on' : ''}
              data-testid={`td-tool-${t.id}`}
              onClick={() => setTool(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="td-primary"
          data-testid="td-substitute"
          disabled={selected.size === 0}
          onClick={() => run([...selected])}
        >
          Substitute {fmt(selected.size)} selected
        </button>
        <button type="button" data-testid="td-in-view" onClick={() => run(inView())}>
          Substitute all in view
        </button>
        <button type="button" data-testid="td-undo" disabled={map.history.length === 0} onClick={undoLast}>
          Undo
        </button>
        <button type="button" data-testid="td-keep" onClick={keepInView}>
          Keep only what is in view
        </button>
        <button type="button" onClick={() => restart(url)}>
          Reset
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
        <label className="td-check">
          <input type="checkbox" checked={outlines} onChange={(e) => setOutlines(e.target.checked)} />
          <span>Outline clusters</span>
        </label>
      </div>

      <div className="td-viewport" onPointerDown={onPressDown} onPointerUp={onPressUp}>
        <PanZoom
          apiRef={panRef}
          fitBounds={startBounds}
          fitKey={`${url.family}:${url.type}:${url.level}:${fitKey}`}
          padding={0.06}
          minScale={1e-6}
          maxScale={1e18}
          showControls
          ariaLabel="Map — drag to pan, wheel to zoom"
        >
          {(api) => (
            <>
              <MapCanvas
                map={map}
                camera={api.camera}
                size={api.size}
                running={running}
                runKey={runKey}
                selected={selected}
                focus={focus}
                outlines={outlines}
              />
              <span
                hidden
                data-testid="td-state"
                data-family={family}
                data-tile-count={map.tiles.size}
                data-depth-max={depths.hi}
                data-selected={selected.size}
                data-steps={map.history.length}
              />
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
          <span data-testid="td-count">{fmt(map.tiles.size)} tiles</span>
          <span data-testid="td-depths">
            depth {depths.lo === depths.hi ? depths.lo : `${depths.lo}–${depths.hi}`}
          </span>
          <span data-testid="td-selected">{fmt(selected.size)} selected</span>
          {message ? <span data-testid="td-message">{message}</span> : null}
        </div>
      </div>

      <div className="td-panels">
        <section className="td-panel" aria-labelledby="td-map-h" data-testid="td-levelmap">
          <h2 id="td-map-h">One map between levels</h2>
          <p>
            Each depth is drawn one step smaller than the one above it through the same
            similarity <i>S</i>: scale <strong>{lm.scale.toFixed(6)}</strong> (√(4 + √15) ={' '}
            {Math.sqrt(4 + Math.sqrt(15)).toFixed(6)}), turn <strong>{lm.turn.toFixed(4)}°</strong>
            {lm.mirror ? ', mirrored' : ''}. Its scale and turn carry the level-{QUAD_LEVEL} key quad
            onto the level-{QUAD_LEVEL + 1} one, where the supertile shape has stopped changing; its
            shift is set when a depth is first reached, so those clusters sit centred on their tiles.
          </p>
          <p>
            A cluster appears centred on the tile it replaces and slides home. Over the{' '}
            {fmt(lm.tiles)} tiles of a level-{FIT_LEVEL} Delta supertile the slide is at most{' '}
            <strong data-testid="td-max-offset">{lm.maxOffset.toFixed(2)}</strong> edge lengths of the
            cluster's tiles ({lm.rmsOffset.toFixed(2)} root mean square). Every depth goes through the
            same <i>S</i>, so the slide does not grow with depth.
          </p>
          <p className="muted">
            Exact coordinates go to depth {MAX_DEPTH}; the map holds up to {fmt(MAX_MAP_TILES)} tiles.
            “Keep only what is in view” drops the rest, so a deep dive stays small.
          </p>
        </section>

        {rule ? (
          <section className="td-panel" aria-labelledby="td-rule-h">
            <h2 id="td-rule-h">Where a spectre's cluster goes</h2>
            <p>
              With <i>d</i> = e<sup>iπ/6</sup>, a tile at <i>x</i> ↦ <i>d</i>
              <sup>k</sup>
              <i>x</i> + <i>t</i>, <i>t</i> written as its coefficients on 1, <i>d</i>, <i>d</i>²,{' '}
              <i>d</i>³, has its cluster at <i>x</i> ↦ <i>d</i>
              <sup>k</sup>
              <i>x</i> + <i>L t</i> + (<i>d</i>
              <sup>k</sup> − 1) <i>v</i>, the cluster then reflected by <i>R</i>:
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
              {step ? (
                <figure>
                  <MatrixTable m={step} label="The step matrix M" />
                  <figcaption>
                    <i>M</i> = <i>R L</i>: <span data-testid="td-poly">{poly}</span>
                  </figcaption>
                </figure>
              ) : null}
            </div>
            <p className="muted">
              <i>L</i> and <i>v</i> are solved exactly from the level-2 and level-3 Delta supertiles;
              the tile's type does not enter. <i>M</i>'s roots satisfy <i>λ</i>² = 4 ± √15.
            </p>
          </section>
        ) : (
          <section className="td-panel" aria-labelledby="td-rule-h" data-testid="td-hex-rule">
            <h2 id="td-rule-h">Where a hexagon's cluster goes</h2>
            <p>
              Hexagon centres all lie on the triangular lattice, so a hexagon's position cannot say
              where its cluster goes. Its slot path <i>s</i>
              <sub>1</sub>.<i>s</i>
              <sub>2</sub>…<i>s</i>
              <sub>n</sub> does: the cluster sits at the same path with every transform moved up one
              level, <i>R</i>
              <sup>n</sup> <i>T</i>
              <sub>n+1</sub>[<i>s</i>
              <sub>1</sub>] ⋯ <i>T</i>
              <sub>2</sub>[<i>s</i>
              <sub>n</sub>], where the tile itself is at <i>R</i>
              <sup>n</sup> <i>T</i>
              <sub>n</sub>[<i>s</i>
              <sub>1</sub>] ⋯ <i>T</i>
              <sub>1</sub>[<i>s</i>
              <sub>n</sub>].
            </p>
          </section>
        )}

        <section className="td-panel" aria-labelledby="td-tile-h" data-testid="td-worked">
          <h2 id="td-tile-h">The clicked tile</h2>
          {focusInfo ? (
            <table className="td-worked">
              <tbody>
                <tr>
                  <th>slot path</th>
                  <td>{focusInfo.id || '(root)'}</td>
                </tr>
                <tr>
                  <th>type</th>
                  <td>{focusInfo.type}</td>
                </tr>
                <tr>
                  <th>depth</th>
                  <td>{focusInfo.depth}</td>
                </tr>
                <tr>
                  <th>
                    <i>t</i>
                  </th>
                  <td>{coeffs(focusInfo.z.t)}</td>
                </tr>
                <tr>
                  <th>cluster at</th>
                  <td>{coeffs(supertileFrameByPath(focusInfo.id, family).t)}</td>
                </tr>
                {focusInfo.slide !== null ? (
                  <tr>
                    <th>slid</th>
                    <td data-testid="td-slide">{focusInfo.slide.toFixed(2)} edge lengths of its tiles</td>
                  </tr>
                ) : null}
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
