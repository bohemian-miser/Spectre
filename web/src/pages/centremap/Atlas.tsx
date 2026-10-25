/**
 * The precomputed centre map: every pairing of one family at one level (two
 * million for hexagons at level 5), laid out offline (`atlasData.ts`).
 *
 * Too many dots for SVG: the scatter writes them straight into an ImageData on
 * every camera change, records which dot landed on each pixel for hover, and
 * draws rings for the hovered and selected dots on a canvas above. Search,
 * box select and the selection panel work as on the in-browser map; the panel
 * gets the whole selection's patterns and a sample of its pairings to draw.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { EdgeJoin } from '../../core';
import { JoinPicker } from '../../components/JoinPicker';
import { PanZoom, type PanZoomApi } from '../../components/PanZoom';
import type { FaultLinesClient } from '../../workers/faultLinesClient';
import { atlasMatches, atlasPairing, atlasPatterns, ruleName, type Atlas } from './atlasData';
import { BoxSelect, Magnifier, SelectionPanel, Thumb, explorerHref, ruleColour, type Item } from './parts';

const PLOT = 520;
const PLOT_BOX = { min: { x: 0, y: 0 }, max: { x: PLOT, y: PLOT } };
/** How many of a selection the board and tiles draw. */
const PANEL_SAMPLE = 300;
const NEAREST = 8;
const PICK_RADIUS = 5;

function hslRgb(h: number, s: number, l: number): [number, number, number] {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return [f(0), f(8), f(4)];
}

/** `hsl(H S% L%)` as rgb. */
function cssRgb(css: string): [number, number, number] {
  const m = /hsl\((\d+(?:\.\d+)?) (\d+)% (\d+)%\)/.exec(css);
  return m ? hslRgb(Number(m[1]), Number(m[2]) / 100, Number(m[3]) / 100) : [128, 128, 128];
}

/** Longest circuit on a log scale: short blue to long yellow. */
function longestRgb(len: number, max: number): [number, number, number] {
  const t = max > 1 ? Math.log1p(len) / Math.log1p(max) : 0;
  return hslRgb(240 - 190 * t, 0.75, 0.35 + 0.25 * t);
}

/** Up to `k` of `ids`, evenly spaced. */
function sample(ids: Int32Array, k: number): number[] {
  if (ids.length <= k) return Array.from(ids);
  return Array.from({ length: k }, (_, j) => ids[Math.floor((j * ids.length) / k)]);
}

export function AtlasView(props: { atlas: Atlas; thumbs: FaultLinesClient; dark: boolean }): JSX.Element {
  const { atlas, thumbs, dark } = props;
  const { meta } = atlas;
  const n = meta.total;
  const [colourBy, setColourBy] = useState<'rule' | 'longest'>('rule');
  const [ruleFilter, setRuleFilter] = useState('');
  const [pattern, setPattern] = useState('');
  const [joins, setJoins] = useState<readonly EdgeJoin[]>([]);
  const [dragMode, setDragMode] = useState<'pan' | 'select'>('pan');
  const [picked, setPicked] = useState<Int32Array | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [magnified, setMagnified] = useState<{ at: number; view: 'strands' | 'centres' } | null>(null);

  const rules = meta.rules.map(ruleName);
  const searching = !!ruleFilter || !!pattern.trim() || joins.length > 0;
  const search = useMemo(
    () => (searching ? atlasMatches(atlas, { rule: ruleFilter, pattern, joins }) : null),
    [atlas, searching, ruleFilter, pattern, joins],
  );
  const colours = useMemo(() => {
    const out = new Uint8Array(3 * n);
    if (colourBy === 'rule') {
      const pal = meta.rules.map((_, i) => cssRgb(ruleColour(i)));
      for (let i = 0; i < n; i++) out.set(pal[atlas.ruleOf[i]], 3 * i);
    } else {
      let max = 0;
      for (let i = 0; i < n; i++) if (atlas.longest[i] > max) max = atlas.longest[i];
      for (let i = 0; i < n; i++) out.set(longestRgb(atlas.longest[i], max), 3 * i);
    }
    return out;
  }, [atlas, colourBy, meta.rules, n]);

  const item = (i: number): Item => {
    const p = atlasPairing(atlas, i);
    return { rule: p.rule, subset: p.subset, combo: p.combo, ruleIndex: p.ruleIndex };
  };
  const label = (i: number) => {
    const p = atlasPairing(atlas, i);
    return `${p.rule} · ${p.combo}`;
  };
  const pickBox = (ids: Int32Array) => setPicked(search ? ids.filter((i) => search.mask[i]) : ids);
  const panelIds = useMemo(() => (picked ? sample(picked, PANEL_SAMPLE) : []), [picked]);
  const panelItems = useMemo(() => panelIds.map(item), [panelIds]); // eslint-disable-line react-hooks/exhaustive-deps
  /** The picked pairing the selection's board shows on its own, marked on the scatter. */
  const [shown, setShown] = useState<number | null>(null);
  useEffect(() => setShown(null), [picked]);
  const whole = useMemo(() => (picked ? { patterns: atlasPatterns(atlas, picked), count: picked.length } : undefined), [atlas, picked]);
  const nearest = useMemo(() => {
    if (selected === null) return [];
    const x = atlas.xy[2 * selected];
    const y = atlas.xy[2 * selected + 1];
    const best: { i: number; d: number }[] = [];
    for (let i = 0; i < n; i++) {
      if (i === selected) continue;
      const d = (atlas.xy[2 * i] - x) ** 2 + (atlas.xy[2 * i + 1] - y) ** 2;
      if (best.length < NEAREST || d < best[best.length - 1].d) {
        best.push({ i, d });
        best.sort((a, b) => a.d - b.d);
        if (best.length > NEAREST) best.pop();
      }
    }
    return best.map((b) => b.i);
  }, [atlas, selected, n]);
  const href = (i: number) => {
    const it = item(i);
    return explorerHref(meta.family, it.subset, it.combo, Math.min(meta.level, 5));
  };
  const ruleCounts = meta.rules.map((r) => r.total);

  return (
    <>
      <p className="muted centremap-note" data-testid="centremap-atlas-summary">
        {n.toLocaleString('en-US')} pairings at level {meta.level}, each measured against {meta.landmarks.length} landmark pairings and laid out with UMAP
        {meta.distinct ? ` (${meta.distinct.toLocaleString('en-US')} distinct rows)` : ''}
        {meta.generated ? `, computed ${meta.generated}` : ''}.
      </p>
      <div className="centremap-controls" role="group" aria-label="View">
        <label>
          Colour by
          <select value={colourBy} onChange={(e) => setColourBy(e.target.value as 'rule' | 'longest')} data-testid="centremap-atlas-colour">
            <option value="rule">edge rule</option>
            <option value="longest">longest circuit</option>
          </select>
        </label>
      </div>
      {colourBy === 'rule' && (
        <div className="centremap-legend">
          {rules.map((r, i) => (
            <button key={r} type="button" className={`mono${ruleFilter === r ? ' is-on' : ''}`} onClick={() => setRuleFilter(ruleFilter === r ? '' : r)} title={`Search this rule (${ruleCounts[i].toLocaleString('en-US')} pairings)`}>
              <span className="centremap-swatch" style={{ background: ruleColour(i) }} />
              {r}
            </button>
          ))}
        </div>
      )}

      <section className="centremap-search" aria-labelledby="centremap-atlas-search-h">
        <h2 id="centremap-atlas-search-h">Search</h2>
        <div className="centremap-controls">
          <label>
            Rule
            <select value={ruleFilter} onChange={(e) => setRuleFilter(e.target.value)} data-testid="centremap-atlas-rule">
              <option value="">any</option>
              {rules.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label>
            Combination
            <input className="mono" value={pattern} placeholder="e.g. 1?0?" onChange={(e) => setPattern(e.target.value)} data-testid="centremap-atlas-pattern" spellCheck={false} />
          </label>
          <span data-testid="centremap-atlas-matches">{search ? `${search.count.toLocaleString('en-US')} of ${n.toLocaleString('en-US')} match` : 'Showing all'}</span>
          {searching && (
            <button
              type="button"
              onClick={() => {
                setRuleFilter('');
                setPattern('');
                setJoins([]);
              }}
            >
              Clear
            </button>
          )}
        </div>
        <JoinPicker family={meta.family} joins={joins} onChange={setJoins} />
      </section>

      <div className="centremap-controls" role="group" aria-label="Drag">
        <span className="centremap-modal-views">
          Drag to
          {(['pan', 'select'] as const).map((m) => (
            <button key={m} type="button" className={dragMode === m ? 'is-on' : undefined} aria-pressed={dragMode === m} onClick={() => setDragMode(m)} data-testid={`centremap-atlas-drag-${m}`}>
              {m === 'pan' ? 'pan' : 'select an area'}
            </button>
          ))}
        </span>
        <span className="muted">{dragMode === 'select' ? 'Drag a box to pick the pairings inside it.' : 'Wheel or pinch zooms; click a dot to pick it.'}</span>
      </div>

      <section aria-labelledby="centremap-atlas-umap-h">
        <h2 id="centremap-atlas-umap-h">UMAP of every pairing</h2>
        <AtlasScatter
          atlas={atlas}
          colours={colours}
          matches={search?.mask ?? null}
          picked={picked}
          selected={selected}
          shown={shown}
          hover={hover}
          onHover={setHover}
          onPick={(i) => {
            setSelected(i);
            setMagnified(null);
          }}
          selecting={dragMode === 'select'}
          onBox={pickBox}
          dark={dark}
        />
        <p className="mono centremap-hover" data-testid="centremap-atlas-hover">
          {hover !== null ? `${label(hover)} · longest ${atlas.longest[hover].toLocaleString('en-US')}` : ' '}
        </p>
      </section>

      {picked && picked.length === 0 && (
        <p className="muted">
          No pairings in that box.{' '}
          <button type="button" className="link-button" onClick={() => setPicked(null)}>
            Clear
          </button>
        </p>
      )}
      {picked && picked.length > 0 && (
        <SelectionPanel
          family={meta.family}
          level={meta.level}
          items={panelItems}
          whole={whole}
          client={thumbs}
          dark={dark}
          onClear={() => setPicked(null)}
          onShow={(at) => setShown(at >= 0 ? panelIds[at] : null)}
        />
      )}

      {selected !== null && (
        <section className="centremap-selected" aria-labelledby="centremap-atlas-selected-h" data-testid="centremap-atlas-selected">
          <h2 id="centremap-atlas-selected-h">
            <span className="mono">{label(selected)}</span>
            <a href={href(selected)}>Open in the Explorer ↗</a>
            <button type="button" className="centremap-close" onClick={() => setSelected(null)} aria-label="Close">
              ×
            </button>
          </h2>
          <p className="muted">Longest circuit {atlas.longest[selected].toLocaleString('en-US')} tiles.</p>
          <div className="centremap-thumbs">
            {(['strands', 'centres'] as const).map((view) => (
              <Thumb key={view} client={thumbs} family={meta.family} level={meta.level} item={item(selected)} dark={dark} view={view} caption={view} onPick={() => setMagnified({ at: 0, view })} />
            ))}
          </div>
          <h3>Closest in the layout</h3>
          <div className="centremap-thumbs">
            {nearest.map((b, k) => (
              <Thumb key={b} client={thumbs} family={meta.family} level={meta.level} item={item(b)} dark={dark} view="centres" caption={label(b)} onPick={() => setMagnified({ at: k + 1, view: 'centres' })} />
            ))}
          </div>
          {magnified && (
            <Magnifier
              client={thumbs}
              family={meta.family}
              level={meta.level}
              dark={dark}
              list={[selected, ...nearest]}
              at={magnified.at}
              view={magnified.view}
              item={item}
              label={label}
              note={(i) => (i === selected ? 'the selected pairing' : 'close in the layout')}
              href={href}
              onMove={(at, view) => setMagnified({ at, view })}
              onSelect={(i) => {
                setMagnified(null);
                setSelected(i);
              }}
              onClose={() => setMagnified(null)}
            />
          )}
        </section>
      )}
    </>
  );
}

function AtlasScatter(props: {
  atlas: Atlas;
  colours: Uint8Array;
  matches: Uint8Array | null;
  picked: Int32Array | null;
  selected: number | null;
  shown: number | null;
  hover: number | null;
  onHover: (i: number | null) => void;
  onPick: (i: number) => void;
  selecting: boolean;
  onBox: (ids: Int32Array) => void;
  dark: boolean;
}): JSX.Element {
  const { atlas, colours, matches, picked, selected, shown, hover, onHover, onPick, selecting, onBox, dark } = props;
  const n = atlas.meta.total;
  // The layout fitted into the plot box, both axes on one scale.
  const world = useMemo(() => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < n; i++) {
      const x = atlas.xy[2 * i];
      const y = atlas.xy[2 * i + 1];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const pad = 12;
    const s = (PLOT - 2 * pad) / Math.max(maxX - minX, maxY - minY, 1e-9);
    const out = new Float32Array(2 * n);
    for (let i = 0; i < n; i++) {
      out[2 * i] = pad + (atlas.xy[2 * i] - minX) * s;
      out[2 * i + 1] = pad + (atlas.xy[2 * i + 1] - minY) * s;
    }
    return out;
  }, [atlas, n]);
  const pickedMask = useMemo(() => {
    if (!picked) return null;
    const m = new Uint8Array(n);
    for (const i of picked) m[i] = 1;
    return m;
  }, [picked, n]);

  const dots = useRef<HTMLCanvasElement>(null);
  const rings = useRef<HTMLCanvasElement>(null);
  /** Per CSS pixel, 1 + the dot drawn last there (0 for none). */
  const pickBuf = useRef<{ w: number; h: number; buf: Int32Array } | null>(null);
  const apiRef = useRef<PanZoomApi | null>(null);
  const [camera, setCamera] = useState<{ x: number; y: number; scale: number } | null>(null);

  useEffect(() => {
    const canvas = dots.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !camera) return;
    const frame = requestAnimationFrame(() => {
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      if (!cw || !ch) return;
      const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
      const w = Math.round(cw * dpr);
      const h = Math.round(ch * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const img = ctx.createImageData(w, h);
      const data = img.data;
      const pick = new Int32Array(cw * ch);
      const k = camera.scale || 1;
      const size = Math.max(1, Math.round(dpr * Math.min(6, Math.max(1.5, 1.2 * Math.sqrt(k)))));
      const half = size >> 1;
      const lit = (i: number) => (!matches || matches[i] === 1) && (!pickedMask || pickedMask[i] === 1);
      // Dimmed dots first, then the lit ones over them.
      // Within each, the biggest rule first, so the smaller ones show over the all-edges crowd.
      const ranges = [...atlas.meta.rules].sort((a, b) => b.total - a.total);
      for (let pass = 0; pass < 2; pass++) {
        const alpha = pass === 0 ? (matches || pickedMask ? 40 : 230) : 230;
        for (const range of ranges)
        for (let i = range.offset; i < range.offset + range.total; i++) {
          if (lit(i) !== (pass === 1)) continue;
          const sx = world[2 * i] * k + camera.x;
          const sy = world[2 * i + 1] * k + camera.y;
          if (sx < 0 || sy < 0 || sx >= cw || sy >= ch) continue;
          const px = Math.round(sx * dpr) - half;
          const py = Math.round(sy * dpr) - half;
          const r = colours[3 * i];
          const g = colours[3 * i + 1];
          const b = colours[3 * i + 2];
          for (let dy = 0; dy < size; dy++) {
            const yy = py + dy;
            if (yy < 0 || yy >= h) continue;
            for (let dx = 0; dx < size; dx++) {
              const xx = px + dx;
              if (xx < 0 || xx >= w) continue;
              const p = (yy * w + xx) * 4;
              data[p] = r;
              data[p + 1] = g;
              data[p + 2] = b;
              data[p + 3] = alpha;
            }
          }
          if (pass === 1 || !(matches || pickedMask)) pick[Math.floor(sy) * cw + Math.floor(sx)] = i + 1;
        }
      }
      ctx.putImageData(img, 0, 0);
      pickBuf.current = { w: cw, h: ch, buf: pick };
    });
    return () => cancelAnimationFrame(frame);
  }, [camera, world, colours, matches, pickedMask, atlas]);

  useEffect(() => {
    const canvas = rings.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !camera) return;
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    if (!cw || !ch) return;
    const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    const ring = (i: number, r: number, colour: string, width = 2) => {
      const sx = world[2 * i] * camera.scale + camera.x;
      const sy = world[2 * i + 1] * camera.scale + camera.y;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, 2 * Math.PI);
      ctx.strokeStyle = colour;
      ctx.lineWidth = width;
      ctx.stroke();
    };
    const ink = dark ? '#fff' : '#000';
    if (shown !== null) {
      ring(shown, 6, ink);
      ring(shown, 12, getComputedStyle(canvas).getPropertyValue('--accent').trim() || '#2a9d8f', 3);
    }
    if (selected !== null) ring(selected, 7, ink);
    if (hover !== null && hover !== selected) ring(hover, 5, ink);
  }, [camera, world, selected, shown, hover, dark]);

  const at = (e: React.MouseEvent): number | null => {
    const pb = pickBuf.current;
    const rect = dots.current?.getBoundingClientRect();
    if (!pb || !rect) return null;
    const x = Math.floor(e.clientX - rect.left);
    const y = Math.floor(e.clientY - rect.top);
    let best: number | null = null;
    let bestD = Infinity;
    for (let dy = -PICK_RADIUS; dy <= PICK_RADIUS; dy++) {
      for (let dx = -PICK_RADIUS; dx <= PICK_RADIUS; dx++) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= pb.w || yy >= pb.h) continue;
        const v = pb.buf[yy * pb.w + xx];
        const d = dx * dx + dy * dy;
        if (v && d < bestD) {
          bestD = d;
          best = v - 1;
        }
      }
    }
    return best;
  };
  const pressed = useRef<{ x: number; y: number } | null>(null);

  return (
    <div
      className="centremap-scatter centremap-atlas"
      onPointerDownCapture={(e) => (pressed.current = { x: e.clientX, y: e.clientY })}
      onMouseMove={(e) => onHover(at(e))}
      onMouseLeave={() => onHover(null)}
      onClick={(e) => {
        const p = pressed.current;
        if (selecting || (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 4)) return;
        const i = at(e);
        if (i !== null) onPick(i);
      }}
    >
      <PanZoom className="centremap-zoom" fitBounds={PLOT_BOX} padding={0} maxScale={400} showControls apiRef={apiRef} ariaLabel="UMAP: wheel or pinch to zoom, drag to pan">
        {(api) => (
          <>
            <CameraSync camera={api.camera} onChange={setCamera} />
            <canvas ref={dots} className="centremap-atlas-layer" data-testid="centremap-atlas-umap" />
            <canvas ref={rings} className="centremap-atlas-layer" />
            {selecting && (
              <BoxSelect
                testid="centremap-atlas-box"
                onBox={(b) => {
                  const k = api.camera.scale || 1;
                  const x0 = (b.x0 - api.camera.x) / k;
                  const x1 = (b.x1 - api.camera.x) / k;
                  const y0 = (b.y0 - api.camera.y) / k;
                  const y1 = (b.y1 - api.camera.y) / k;
                  const out: number[] = [];
                  for (let i = 0; i < n; i++) {
                    const x = world[2 * i];
                    const y = world[2 * i + 1];
                    if (x >= x0 && x <= x1 && y >= y0 && y <= y1) out.push(i);
                  }
                  onBox(Int32Array.from(out));
                }}
              />
            )}
          </>
        )}
      </PanZoom>
    </div>
  );
}

/** Lifts PanZoom's camera into state the drawing effects can depend on. */
function CameraSync(props: { camera: { x: number; y: number; scale: number }; onChange: (c: { x: number; y: number; scale: number }) => void }): null {
  const { camera, onChange } = props;
  useEffect(() => onChange({ x: camera.x, y: camera.y, scale: camera.scale }), [camera.x, camera.y, camera.scale, onChange]);
  return null;
}
