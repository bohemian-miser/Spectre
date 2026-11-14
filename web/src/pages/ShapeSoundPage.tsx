/**
 * Shape sound: click circuits on a small map of one rule and hear each under
 * one of three mappings (`shapesound/render.ts`), several at once. Every
 * clicked circuit becomes a voice that loops until stopped; the selected
 * voice is drawn large (`shapesound/ShapeView.tsx`) and is the one the
 * controls edit. Picking, tiling and map drawing are the Sound page's.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FAMILIES,
  FAMILY_DISPLAY_NAMES,
  comboToMatchingIndices,
  matchingIndicesToCombo,
  normalizeMatchingVector,
  type Pt,
  type Rgb,
  type TileFamilyId,
} from '../core';
import { ComboBar } from '../components';
import { panBy, screenToWorld, zoomAt, type MapCamera } from './map/camera';
import { createCanvas2dRenderer } from './map/canvasRenderer';
import { findTableOf } from './map/findPass';
import type { MapRenderer, TrailGeometry } from './map/rendererTypes';
import { LIGHT_LINE_COLOR } from './map/webglRenderer';
import { loadWorld, reelColor, reelDefaults } from './reel/director';
import { cutCuller, geometry } from './reel/stage';
import { strandFinder } from './sound/strands';
import { createMixer } from './shapesound/mixer';
import { DEFAULT_SETTINGS, MAPPINGS, REVERB, render, renderPen, type Clip, type Mapping, type Settings } from './shapesound/render';
import { cornerEps, fitCorners, makeShape, type Shape } from './shapesound/shape';
import { ShapeView } from './shapesound/ShapeView';
import '../styles/sound.css';
import '../styles/shapesound.css';

const SR = 44100;
const CLICK_PX = 4;
const PICK_PX = 12;
const MAX_VOICES = 8;
/** Milliseconds a setting must rest before its voice is rendered again. */
const SETTLE_MS = 120;

const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const noteName = (m: number): string => `${NAMES[((Math.round(m) % 12) + 12) % 12]}${Math.floor(Math.round(m) / 12) - 1}`;

const MAPPING_LABELS: Record<Mapping, string> = { spectrum: 'Spectrum', radius: 'Distance from centre', corners: 'Corners' };

interface Voice {
  readonly id: number;
  readonly key: string;
  readonly points: readonly Pt[];
  readonly color: Rgb;
  readonly mapping: Mapping;
  readonly settings: Settings;
  readonly level: number;
  readonly on: boolean;
}

interface Rendered {
  mainSig: string;
  main: Clip;
  penSig: string;
  pen: Clip | null;
}

const mainSig = (v: Voice): string => {
  if (v.mapping !== 'spectrum') return `${v.mapping}:${JSON.stringify(v.settings[v.mapping])}`;
  const s = v.settings.spectrum;
  return `spectrum:${s.f0}:${s.terms}`;
};
const penSig = (v: Voice): string => (v.mapping === 'spectrum' && v.settings.spectrum.pen ? String(v.settings.spectrum.penSpeed) : '');

/** A slider over [min, max] on a log scale. */
function LogSlider(props: { label: string; min: number; max: number; value: number; show: string; onChange: (v: number) => void }): JSX.Element {
  const { min, max } = props;
  const x = Math.round((1000 * Math.log(props.value / min)) / Math.log(max / min));
  return (
    <label className="sound-slider">
      <span>{props.label}</span>
      <input type="range" min={0} max={1000} step={1} value={x} aria-label={props.label} onChange={(e) => props.onChange(min * (max / min) ** (Number(e.target.value) / 1000))} />
      <span className="sound-value">{props.show}</span>
    </label>
  );
}

function Slider(props: { label: string; min: number; max: number; step: number; value: number; show: string; onChange: (v: number) => void }): JSX.Element {
  return (
    <label className="sound-slider">
      <span>{props.label}</span>
      <input type="range" min={props.min} max={props.max} step={props.step} value={props.value} aria-label={props.label} onChange={(e) => props.onChange(Number(e.target.value))} />
      <span className="sound-value">{props.show}</span>
    </label>
  );
}

export function ShapeSoundPage(): JSX.Element {
  const [family, setFamily] = useState<TileFamilyId>('hex');
  const [subset, setSubset] = useState<readonly number[]>(reelDefaults('hex').subset);
  const [matching, setMatching] = useState<readonly number[]>(() => comboToMatchingIndices('hex', reelDefaults('hex').subset, reelDefaults('hex').combo));
  const combo = useMemo(() => matchingIndicesToCombo(family, subset, matching), [family, subset, matching]);
  const [voices, setVoices] = useState<readonly Voice[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const nextId = useRef(1);
  const voicesRef = useRef(voices);
  voicesRef.current = voices;

  const loaded = useMemo(() => {
    const d = reelDefaults(family);
    if (combo === null) return { world: null, error: 'Crossing pairings' };
    try {
      return { world: loadWorld({ ...d, seed: 1, family, subset, combo, seconds: 0, circuits: 0, fps: 30, bpm: 110, width: 1, height: 1 }), error: null };
    } catch (err) {
      return { world: null, error: err instanceof Error ? err.message : String(err) };
    }
  }, [family, subset, combo]);
  const world = loaded.world;
  const findStrand = useMemo(() => (world ? strandFinder(world.cut, findTableOf(world.table), world.circuits) : null), [world]);

  // --- voices and sound ------------------------------------------------------------
  const mixerRef = useRef(createMixer());
  const shapes = useRef(new Map<number, Shape>());
  const rendered = useRef(new Map<number, Rendered>());
  const shapeOf = useCallback((v: Pick<Voice, 'id' | 'points'>): Shape => {
    let s = shapes.current.get(v.id);
    if (!s) shapes.current.set(v.id, (s = makeShape(v.points)));
    return s;
  }, []);

  /** Render whatever part of a voice's sound is out of date and hand it to the mixer. */
  const renderVoice = useCallback(
    (v: Voice): void => {
      const r = rendered.current.get(v.id);
      const ms = mainSig(v);
      const ps = penSig(v);
      if (r && r.mainSig === ms && r.penSig === ps) return;
      const shape = shapeOf(v);
      const main = r && r.mainSig === ms ? r.main : render(shape, v.mapping, v.settings, SR);
      const pen = ps === '' ? null : r && r.penSig === ps ? r.pen : renderPen(shape, v.settings.spectrum.penSpeed, SR);
      rendered.current.set(v.id, { mainSig: ms, main, penSig: ps, pen });
      mixerRef.current.setClips(v.id, main, pen, REVERB[v.mapping]);
    },
    [shapeOf],
  );

  useEffect(() => {
    const h = setTimeout(() => voices.forEach(renderVoice), SETTLE_MS);
    return () => clearTimeout(h);
  }, [voices, renderVoice]);

  useEffect(() => {
    const m = mixerRef.current;
    for (const v of voices) {
      m.setLevel(v.id, v.on ? v.level : 0);
      const s = v.settings.spectrum;
      m.setPenLevel(v.id, v.mapping === 'spectrum' && s.pen ? s.penLevel : 0);
    }
  }, [voices]);

  useEffect(() => () => mixerRef.current.stopAll(), []);

  const selected = voices.find((v) => v.id === selectedId) ?? null;
  const update = (id: number, f: (v: Voice) => Voice): void => setVoices((vs) => vs.map((v) => (v.id === id ? f(v) : v)));
  const setSetting = <M extends Mapping>(m: M, patch: Partial<Settings[M]>): void => {
    if (selected) update(selected.id, (v) => ({ ...v, settings: { ...v.settings, [m]: { ...v.settings[m], ...patch } } }));
  };

  const removeVoice = (id: number): void => {
    mixerRef.current.remove(id);
    rendered.current.delete(id);
    shapes.current.delete(id);
    setVoices((vs) => vs.filter((v) => v.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  /** Render now (not after the settle) and play from the top. */
  const playVoice = (v: Voice, loop: boolean): void => {
    renderVoice(v);
    mixerRef.current.start(v.id, loop);
  };

  // A new rule drops the voices of the old one.
  useEffect(() => {
    voicesRef.current.forEach((v) => mixerRef.current.remove(v.id));
    setVoices([]);
    rendered.current.clear();
    shapes.current.clear();
    setSelectedId(null);
  }, [world]);

  // --- map --------------------------------------------------------------------
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<MapRenderer | null>(null);
  const camRef = useRef<MapCamera>({ cx: 0, cy: 0, scale: reelDefaults('hex').scale });
  const sizeRef = useRef({ w: 1, h: 1 });
  const cullRef = useRef<ReturnType<typeof cutCuller> | null>(null);
  const frameRef = useRef(0);
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;

  const draw = useCallback((): void => {
    const r = rendererRef.current;
    if (!r || !world || !cullRef.current) return;
    const { w, h } = sizeRef.current;
    const cam = camRef.current;
    r.setStyle({ showFills: false, showOutlines: false, lineColor: LIGHT_LINE_COLOR, lineScale: 1.5 });
    r.setCut(cullRef.current(cam, w, h));
    const lit: TrailGeometry[] = voicesRef.current.map((v) => {
      const c: Rgb = v.on ? v.color : [v.color[0] * 0.35, v.color[1] * 0.35, v.color[2] * 0.35];
      return geometry(v.points, world.cut.origin, true, v.id === selectedRef.current ? [255, 255, 255] : c, v.id * 4 + (v.on ? 1 : 0) + (v.id === selectedRef.current ? 2 : 0));
    });
    r.setCircuits(lit);
    r.setTrail(null);
    r.render(cam, w, h, Math.min(2, window.devicePixelRatio || 1));
  }, [world]);

  const redraw = useCallback((): void => {
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0;
      draw();
    });
  }, [draw]);

  useEffect(redraw, [voices, selectedId, redraw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const r = createCanvas2dRenderer(canvas, family, Infinity);
    rendererRef.current = r;
    if (r && world) r.setChords(world.table);
    cullRef.current = world ? cutCuller(world.cut) : null;
    camRef.current = { cx: 0, cy: 0, scale: reelDefaults(family).scale };
    redraw();
    return () => {
      r?.dispose();
      rendererRef.current = null;
    };
  }, [family, world, redraw]);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    const ro = new ResizeObserver(() => {
      sizeRef.current = { w: host.clientWidth, h: host.clientHeight };
      canvas.style.width = `${host.clientWidth}px`;
      canvas.style.height = `${host.clientHeight}px`;
      redraw();
    });
    ro.observe(host);
    return () => ro.disconnect();
  }, [redraw]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const onWheel = (e: WheelEvent): void => {
      e.preventDefault();
      const rect = host.getBoundingClientRect();
      camRef.current = zoomAt(camRef.current, e.clientX - rect.left, e.clientY - rect.top, Math.exp(-e.deltaY * 0.0015), rect.width, rect.height);
      redraw();
    };
    host.addEventListener('wheel', onWheel, { passive: false });
    return () => host.removeEventListener('wheel', onWheel);
  }, [redraw]);

  const dragRef = useRef<{ x: number; y: number; moved: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent): void => {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, moved: 0 };
  };
  const onPointerMove = (e: React.PointerEvent): void => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    d.moved += Math.abs(dx) + Math.abs(dy);
    d.x = e.clientX;
    d.y = e.clientY;
    if (d.moved >= CLICK_PX) {
      camRef.current = panBy(camRef.current, dx, dy);
      redraw();
    }
  };
  const onPointerUp = (e: React.PointerEvent): void => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d || d.moved >= CLICK_PX || !findStrand) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const cam = camRef.current;
    const c = findStrand(screenToWorld(cam, e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height), PICK_PX / cam.scale);
    if (!c || !c.closed) return;
    const have = voices.find((v) => v.key === c.key);
    if (have) {
      setSelectedId(have.id);
      return;
    }
    if (voices.length >= MAX_VOICES) return;
    const id = nextId.current++;
    // A new voice starts from the selected one's mapping and settings.
    const v: Voice = {
      id,
      key: c.key,
      points: c.points,
      color: reelColor(id),
      mapping: selected?.mapping ?? 'spectrum',
      settings: selected?.settings ?? DEFAULT_SETTINGS,
      level: 0.8,
      on: true,
    };
    mixerRef.current.setLevel(id, v.level);
    playVoice(v, true);
    setVoices((vs) => [...vs, v]);
    setSelectedId(id);
  };

  const changeFamily = (f: TileFamilyId): void => {
    const d = reelDefaults(f);
    setFamily(f);
    setSubset(d.subset);
    setMatching(comboToMatchingIndices(f, d.subset, d.combo));
  };
  const setRule = (f: TileFamilyId, nextSubset: readonly number[], nextMatching: readonly number[]): void => {
    if (f !== family) return changeFamily(f);
    setSubset(nextSubset);
    setMatching(normalizeMatchingVector(f, nextSubset, nextMatching));
  };

  // --- selected voice ------------------------------------------------------------
  const selShape = selected ? shapeOf(selected) : null;
  const fit = useMemo(() => (selShape && selected ? fitCorners(selShape, selected.settings.corners.tolerance) : null), [selShape, selected]);
  const time = useCallback(() => (selectedId === null ? null : mixerRef.current.playback(selectedId).t), [selectedId]);

  const sp = selected?.settings.spectrum;
  const ra = selected?.settings.radius;
  const co = selected?.settings.corners;

  return (
    <article className="sound-page shapesound-page">
      <header>
        <h1>Shape sound</h1>
      </header>
      <div className="sound-controls">
        <label className="sound-choice">
          <span>Family</span>
          <select aria-label="Tile family" value={family} onChange={(e) => changeFamily(e.target.value as TileFamilyId)}>
            {FAMILIES.map((f) => (
              <option key={f} value={f}>
                {FAMILY_DISPLAY_NAMES[f]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ComboBar family={family} subset={subset} matching={matching} nonCrossingOnly tiles={false} onChange={(next) => setRule(next.family, next.subset, next.matching)} />

      <div className="shapesound-main">
        <div className="shapesound-left">
          <div ref={hostRef} className="sound-stage shapesound-map" data-testid="shapesound-map" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
            <canvas ref={canvasRef} />
            {loaded.error ? <p className="sound-error">{loaded.error}</p> : null}
          </div>

          <div className="sound-buttons">
            <button type="button" disabled={!voices.length} onClick={() => voices.forEach((v) => playVoice(v, true))}>
              Loop all
            </button>
            <button type="button" disabled={!voices.length} onClick={() => mixerRef.current.stopAll()}>
              Stop all
            </button>
          </div>
          <ul className="shapesound-voices" data-testid="shapesound-voices">
            {voices.map((v, i) => (
              <li key={v.id} className={v.id === selectedId ? 'is-selected' : undefined} onClick={() => setSelectedId(v.id)}>
                <span className="shapesound-swatch" style={{ background: `rgb(${v.color.join(',')})` }} />
                <span className="shapesound-voice-name">
                  {i + 1} · {v.points.length} steps · {MAPPING_LABELS[v.mapping]}
                </span>
                <label className="sound-check" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" aria-label={`Voice ${i + 1} on`} checked={v.on} onChange={(e) => update(v.id, (x) => ({ ...x, on: e.target.checked }))} />
                  On
                </label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={v.level}
                  aria-label={`Voice ${i + 1} level`}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => update(v.id, (x) => ({ ...x, level: Number(e.target.value) }))}
                />
                <span className="sound-value">{Math.round(v.level * 100)}%</span>
                <button
                  type="button"
                  aria-label={`Remove voice ${i + 1}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeVoice(v.id);
                  }}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>

        <aside className="sound-panel shapesound-panel">
          {selected && selShape && fit && sp && ra && co ? (
            <>
              <div className="shapesound-mappings" role="radiogroup" aria-label="Mapping">
                {MAPPINGS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={selected.mapping === m}
                    className={selected.mapping === m ? 'is-on' : undefined}
                    onClick={() => update(selected.id, (v) => ({ ...v, mapping: m }))}
                  >
                    {MAPPING_LABELS[m]}
                  </button>
                ))}
              </div>
              <ShapeView shape={selShape} mapping={selected.mapping} settings={selected.settings} fit={fit} time={time} />
              <div className="sound-buttons">
                <button type="button" onClick={() => playVoice(selected, false)}>
                  Play
                </button>
                <button type="button" onClick={() => playVoice(selected, true)}>
                  Loop
                </button>
                <button type="button" onClick={() => mixerRef.current.stop(selected.id)}>
                  Stop
                </button>
              </div>
              <fieldset>
                <legend>{MAPPING_LABELS[selected.mapping]}</legend>
                {selected.mapping === 'spectrum' ? (
                  <>
                    <LogSlider label="Base frequency" min={40} max={400} value={sp.f0} show={`${Math.round(sp.f0)} Hz`} onChange={(f0) => setSetting('spectrum', { f0 })} />
                    <Slider label="Terms" min={2} max={48} step={1} value={sp.terms} show={`±${sp.terms}`} onChange={(terms) => setSetting('spectrum', { terms })} />
                    <label className="sound-check">
                      <input type="checkbox" aria-label="Pen" checked={sp.pen} onChange={(e) => setSetting('spectrum', { pen: e.target.checked })} />
                      Pen
                    </label>
                    {sp.pen ? (
                      <>
                        <LogSlider label="Pen speed" min={500} max={40000} value={sp.penSpeed} show={`${Math.round(sp.penSpeed)} steps/s`} onChange={(penSpeed) => setSetting('spectrum', { penSpeed })} />
                        <Slider label="Pen level" min={0} max={1} step={0.01} value={sp.penLevel} show={`${Math.round(sp.penLevel * 100)}%`} onChange={(penLevel) => setSetting('spectrum', { penLevel })} />
                      </>
                    ) : null}
                  </>
                ) : selected.mapping === 'radius' ? (
                  <>
                    <LogSlider label="Base frequency" min={55} max={880} value={ra.f0} show={`${Math.round(ra.f0)} Hz`} onChange={(f0) => setSetting('radius', { f0 })} />
                    <Slider label="Pitch range" min={0.2} max={4} step={0.05} value={ra.range} show={`${ra.range.toFixed(2)} oct`} onChange={(range) => setSetting('radius', { range })} />
                    <Slider label="Lap" min={1} max={20} step={0.5} value={ra.lap} show={`${ra.lap.toFixed(1)} s`} onChange={(lap) => setSetting('radius', { lap })} />
                  </>
                ) : (
                  <>
                    <LogSlider
                      label="Threshold"
                      min={0.05}
                      max={50}
                      value={co.tolerance}
                      show={`${(cornerEps(selShape, co.tolerance) / selShape.tile).toPrecision(2)} tiles`}
                      onChange={(tolerance) => setSetting('corners', { tolerance })}
                    />
                    <p className="sound-value shapesound-count" data-testid="shapesound-corners">
                      {fit.cuts.length} corners
                    </p>
                    <Slider label="Root" min={36} max={84} step={1} value={co.root} show={noteName(co.root)} onChange={(root) => setSetting('corners', { root })} />
                    <Slider label="Lap" min={1} max={20} step={0.5} value={co.lap} show={`${co.lap.toFixed(1)} s`} onChange={(lap) => setSetting('corners', { lap })} />
                  </>
                )}
              </fieldset>
            </>
          ) : null}
        </aside>
      </div>
    </article>
  );
}

export default ShapeSoundPage;
