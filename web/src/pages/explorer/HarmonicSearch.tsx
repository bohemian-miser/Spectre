/**
 * The Explorer's harmonic search on a rooted patch: the selected circuit read
 * at level m against every other strand read at level m + 2k
 * (`harmonicSearch.ts`, run in a worker). `HarmonicControl` is the switch,
 * the settings and the list of matches, one item of the viewport's tool
 * row; `HarmonicLayer` draws the matches over the patch, their level-(m + 2k)
 * supertiles outlined and washed by score, the rest of the patch dimmed.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { inv, leafPts, mul, transPt, type Affine, type MetaNode, type Path, type Pt, type TileFamilyId, type TileNode } from '../../core';
import { useElementSize } from '../../hooks/useElementSize';
import { cameraAffine, type Camera } from '../../lib/viewport';
import { FOLDS, type Fold } from '../harmonics/rows';
import { STRAND_CAP, type Hit, type SearchResult } from './harmonicSearch';
import { nearestEdge } from './locate';
import { createHarmonicSearchClient, type HarmonicSearchClient, type PatchStrands } from './harmonicSearchClient';
import { outlineAtSize, outlineOf, supertilesByCode, type XraySupertile } from './xray';

export interface HarmonicSettings {
  readonly m: number;
  /** The level the other strands are read at: m + 2k. */
  readonly up: number;
  /** Least score listed, 0 to 1. */
  readonly threshold: number;
  readonly fold: Fold;
}

export const DEFAULT_HARMONIC_SETTINGS: HarmonicSettings = { m: 2, up: 4, threshold: 0.8, fold: 'fixpoint' };

/** Highest level the circuit is read at in a level-L patch: m + 2 must leave a level below the root. */
export const highestM = (patchLevel: number): number => patchLevel - 3;

/** The settings brought within a level-L patch: m from 0 to L − 3, m + 2k from m + 2 to L − 1. */
export function clampSettings(s: HarmonicSettings, patchLevel: number): HarmonicSettings {
  const m = Math.max(0, Math.min(highestM(patchLevel), s.m));
  let up = Math.max(m + 2, Math.min(patchLevel - 1, s.up));
  if ((up - m) % 2) up--;
  return { ...s, m, up };
}

/** Searches as the settings change; the newest answer wins. */
export function useHarmonicSearch(
  patch: PatchStrands | null,
  circuit: number | null,
  settings: HarmonicSettings,
): { result: SearchResult | null; busy: boolean; error: string | null } {
  const clientRef = useRef<HarmonicSearchClient | null>(null);
  const [state, setState] = useState<{ result: SearchResult | null; busy: boolean; error: string | null }>({ result: null, busy: false, error: null });
  useEffect(
    () => () => {
      clientRef.current?.dispose();
      clientRef.current = null;
    },
    [],
  );
  useEffect(() => {
    if (!patch || circuit === null) {
      setState({ result: null, busy: false, error: null });
      return;
    }
    clientRef.current ??= createHarmonicSearchClient();
    setState((s) => ({ ...s, busy: true, error: null }));
    let live = true;
    clientRef.current
      .search(patch, { circuit, m: settings.m, k: (settings.up - settings.m) / 2, fold: settings.fold, threshold: settings.threshold })
      .then((result) => {
        if (live && result) setState({ result, busy: false, error: null });
      })
      .catch((err: unknown) => {
        if (live) setState({ result: null, busy: false, error: err instanceof Error ? err.message : String(err) });
      });
    return () => {
      live = false;
    };
  }, [patch, circuit, settings]);
  return state;
}

/**
 * Where an open strand starts, as Identify names it: its first tile's slot
 * path from the root (a level-`level` node; the tile's code as the analysis
 * gives it) and the edge of that tile the strand enters by, the one nearest
 * its first point.
 */
export function openStrandStart(family: TileFamilyId, root: TileNode, level: number, code: number, first: Pt): { tile: string; edge: number } | null {
  let node = root;
  let x: Affine = [1, 0, 0, 0, 1, 0];
  const slots: number[] = [];
  for (let d = level - 1; d >= 0; d--) {
    const slot = Math.floor(code / 8 ** d) % 8;
    const c = node.kind === 'leaf' ? undefined : (node as MetaNode).children.find((ch) => ch.pos === slot);
    if (!c) return null;
    x = mul(x, c.xform);
    node = c.node;
    slots.push(slot);
  }
  if (node.kind !== 'leaf') return null;
  return { tile: slots.join('.'), edge: nearestEdge(leafPts(family, node.type), transPt(inv(x), first)) };
}

/** Rows the list shows. */
const LISTED = 6;

const pct = (x: number): string => `${Math.floor(x * 100 + 1e-9)}%`;

/** Matches alike in score, kind, closed or open, and tiles, as one row: copies of one circuit in the patch. */
export function groupHits(hits: readonly Hit[]): Hit[][] {
  const rows = new Map<string, Hit[]>();
  for (const h of hits) {
    const key = `${pct(h.score)} ${h.match} ${h.closed} ${h.tiles}`;
    const row = rows.get(key);
    if (row) row.push(h);
    else rows.set(key, [h]);
  }
  return [...rows.values()];
}

export function HarmonicControl(props: {
  on: boolean;
  onToggle(on: boolean): void;
  patchLevel: number;
  settings: HarmonicSettings;
  onSettings(s: HarmonicSettings): void;
  /** The selected circuit's tiles. */
  circuitTiles: number;
  result: SearchResult | null;
  busy: boolean;
  error: string | null;
  /** What a match offers (Compare, Identify), and framing a row's matches. */
  action(hit: Hit): React.ReactNode;
  onFrame(hits: readonly Hit[]): void;
}): JSX.Element {
  const { on, onToggle, patchLevel, settings, onSettings, circuitTiles, result, busy, error, action, onFrame } = props;
  const s = clampSettings(settings, patchLevel);
  const set = (next: Partial<HarmonicSettings>): void => onSettings(clampSettings({ ...s, ...next }, patchLevel));
  const ms = Array.from({ length: highestM(patchLevel) + 1 }, (_, m) => m);
  const ups: number[] = [];
  for (let up = s.m + 2; up <= patchLevel - 1; up += 2) ups.push(up);
  const shown = result && result.m === s.m && result.level === s.up ? result : null;
  const rows = useMemo(() => (shown ? groupHits(shown.hits) : []), [shown]);
  return (
    <div className={on ? 'harmonic-control is-open' : 'harmonic-control'} data-testid="harmonic-control" data-panzoom-ignore="">
      <div className="harmonic-row">
        <label title={`Strands that read at a higher level as this ${circuitTiles.toLocaleString('en-US')}-tile circuit reads at a lower one`}>
          <input type="checkbox" checked={on} onChange={(e) => onToggle(e.target.checked)} data-testid="harmonic-toggle" />
          Harmonics
        </label>
        {on ? (
          <>
            <label>
              level
              <select value={s.m} onChange={(e) => set({ m: Number(e.target.value), up: Number(e.target.value) + (s.up - s.m) })} aria-label="Level the circuit is read at" data-testid="harmonic-m">
                {ms.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <label>
              against
              <select value={s.up} onChange={(e) => set({ up: Number(e.target.value) })} aria-label="Level the other strands are read at" data-testid="harmonic-up">
                {ups.map((up) => (
                  <option key={up} value={up}>
                    {up}
                  </option>
                ))}
              </select>
            </label>
            <label>
              ≥
              <input
                type="number"
                min={50}
                max={100}
                step={5}
                value={Math.round(s.threshold * 100)}
                onChange={(e) => set({ threshold: Math.max(0.5, Math.min(1, Number(e.target.value) / 100)) })}
                aria-label="Least similarity listed, in percent"
                data-testid="harmonic-threshold"
              />
              %
            </label>
            <select value={s.fold} onChange={(e) => set({ fold: e.target.value as Fold })} aria-label="What the readings fold away" data-testid="harmonic-fold">
              {FOLDS.map((f) => (
                <option key={f.id} value={f.id}>
                  fold {f.name}
                </option>
              ))}
            </select>
          </>
        ) : null}
      </div>
      {on ? (
        <div className="harmonic-panel" data-testid="harmonic-panel">
          {error ? (
            <p>{error}</p>
          ) : !shown ? (
            <p>reading…</p>
          ) : (
            <>
              <p data-testid="harmonic-summary">
                {busy ? '… ' : ''}
                {shown.reading.length} visits at level {shown.m}; {shown.hits.length} of {shown.scored.toLocaleString('en-US')} strands that leave a level-{shown.level} supertile match
              </p>
              {shown.candidates > shown.scored ? (
                <p className="harmonic-note">
                  Only the longest {STRAND_CAP.toLocaleString('en-US')} of {shown.candidates.toLocaleString('en-US')} are read.
                </p>
              ) : null}
              {rows.length ? (
                <ol className="harmonic-hits" data-testid="harmonic-hits">
                  {rows.slice(0, LISTED).map((row) => (
                    <li key={row[0].strand}>
                      <button type="button" className="harmonic-frame" onClick={() => onFrame(row)} title={row.length > 1 ? 'Frame these strands' : 'Frame this strand'}>
                        <b>{pct(row[0].score)}</b> {row[0].match} · {row[0].closed ? 'circuit' : 'open'} · {row[0].tiles.toLocaleString('en-US')} tiles
                        {row.length > 1 ? ` × ${row.length}` : ''}
                      </button>
                      {action(row[0])}
                    </li>
                  ))}
                </ol>
              ) : null}
              {rows.length > LISTED ? <p>and {rows.slice(LISTED).reduce((n, r) => n + r.length, 0)} more, outlined on the patch</p> : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

/** Score colour: pale at the threshold, full amber at 100%. */
function scoreColour(score: number, threshold: number, alpha: number): string {
  const t = threshold >= 1 ? 1 : Math.max(0, Math.min(1, (score - threshold) / (1 - threshold)));
  return `rgba(255,${Math.round(236 - 70 * t)},${Math.round(170 - 160 * t)},${alpha})`;
}

const devicePixels = (): number => Math.min(2, (typeof devicePixelRatio === 'number' ? devicePixelRatio : 1) || 1);

function strokePath(ctx: CanvasRenderingContext2D, m: Affine, p: Path): void {
  ctx.beginPath();
  p.points.forEach((q, i) => {
    const x = m[0] * q.x + m[1] * q.y + m[2];
    const y = m[3] * q.x + m[4] * q.y + m[5];
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  if (p.closed) ctx.closePath();
  ctx.stroke();
}

function traceLoop(path: Path2D, m: Affine, s: XraySupertile, family: TileFamilyId, px: number): void {
  const loop = outlineAtSize(outlineOf(s.node, family), px * 2);
  const t = mul(m, s.xform);
  loop.forEach((p, i) => {
    const x = t[0] * p.x + t[1] * p.y + t[2];
    const y = t[3] * p.x + t[4] * p.y + t[5];
    if (i === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  });
  path.closePath();
}

/** The matches over a rooted patch (`root`, a level-`patchLevel` node placed by `viewTransform`), under the PanZoom camera. */
export function HarmonicLayer(props: {
  family: TileFamilyId;
  root: TileNode;
  patchLevel: number;
  viewTransform: Affine;
  camera: Camera;
  result: SearchResult;
  threshold: number;
  /** A strand's path by its index in the search (circuits first, then open strands). */
  pathOf(strand: number): Path | undefined;
  circuit: number;
}): JSX.Element {
  const { family, root, patchLevel, viewTransform, camera, result, threshold, pathOf, circuit } = props;
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const size = useElementSize(hostRef);
  // Each supertile once, with the best score of the matches running through it.
  const supertiles = useMemo(() => {
    const best = new Map<number, number>();
    for (const h of result.hits) for (const c of h.supertiles) best.set(c, Math.max(best.get(c) ?? 0, h.score));
    return [...best].flatMap(([code, score]) => supertilesByCode(family, root, patchLevel, result.level, [code], viewTransform).map((s) => ({ s, score })));
  }, [family, root, patchLevel, result, viewTransform]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || size.width <= 0) return;
    const id = requestAnimationFrame(() => {
      const dpr = devicePixels();
      canvas.width = Math.round(size.width * dpr);
      canvas.height = Math.round(size.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = 'rgba(10,12,18,0.5)';
      ctx.fillRect(0, 0, size.width, size.height);
      const toScreen = cameraAffine(camera);
      const lines = new Path2D();
      for (const { s, score } of supertiles) {
        const one = new Path2D();
        const px = Math.max(s.maxX - s.minX, s.maxY - s.minY) * camera.scale;
        traceLoop(one, toScreen, s, family, px);
        traceLoop(lines, toScreen, s, family, px);
        ctx.fillStyle = scoreColour(score, threshold, 0.28);
        ctx.fill(one);
      }
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 2.25;
      ctx.stroke(lines);
      ctx.strokeStyle = 'rgba(12,14,20,0.95)';
      ctx.lineWidth = 1;
      ctx.stroke(lines);
      const m = mul(toScreen, viewTransform);
      ctx.lineCap = 'round';
      const draw = (p: Path | undefined, colour: string): void => {
        if (!p) return;
        ctx.strokeStyle = 'rgba(12,14,20,0.9)';
        ctx.lineWidth = 5;
        strokePath(ctx, m, p);
        ctx.strokeStyle = colour;
        ctx.lineWidth = 2.5;
        strokePath(ctx, m, p);
      };
      for (const h of [...result.hits].reverse()) draw(pathOf(h.strand), scoreColour(h.score, threshold, 1));
      draw(pathOf(circuit), '#7fe3ff');
    });
    return () => cancelAnimationFrame(id);
  }, [size, camera, supertiles, result, threshold, pathOf, circuit, family, viewTransform]);

  return (
    <div className="xray-layer harmonic-layer" ref={hostRef} aria-hidden="true" data-testid="harmonic-layer">
      <canvas ref={canvasRef} />
    </div>
  );
}
