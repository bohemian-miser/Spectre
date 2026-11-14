/**
 * Shape sound: paint a rule's circuits with a brush. The brush holds a mode
 * (`shapesound/render.ts`: Fourier spectrum, distance from the centre,
 * corners), its settings, and whether it plays the lap on a loop or a held
 * tone. Clicking a circuit turns it on with the brush as it stands and
 * selects it, or turns it off; shift-click selects an on circuit. Brush edits
 * re-render the selected circuit live. Each painted circuit is a voice in the
 * list under the map. Picking, tiling and map drawing are the Sound page's.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FAMILIES,
  FAMILY_DISPLAY_NAMES,
  comboToMatchingIndices,
  matchingIndicesToCombo,
  normalizeMatchingVector,
  type Pt,
  type TileFamilyId,
} from '../core';
import { ComboBar } from '../components';
import { panBy, screenToWorld, worldToScreen, zoomAt, type MapCamera } from './map/camera';
import { createCanvas2dRenderer } from './map/canvasRenderer';
import { findTableOf } from './map/findPass';
import type { MapRenderer } from './map/rendererTypes';
import { LIGHT_LINE_COLOR } from './map/webglRenderer';
import { loadWorld, reelDefaults } from './reel/director';
import { cutCuller } from './reel/stage';
import { strandFinder } from './sound/strands';
import { createMixer } from './shapesound/mixer';
import { applyBrush, brushOf, paint, type Brush, type Voice } from './shapesound/paint';
import {
  DEFAULT_SETTINGS,
  MAPPINGS,
  PLAYS,
  REVERB,
  clipSeconds,
  render,
  renderPen,
  renderPenConstant,
  type Clip,
  type Mapping,
  type Settings,
} from './shapesound/render';
import { cornerEps, fitCorners, makeShape, type Shape } from './shapesound/shape';
import { ShapeView } from './shapesound/ShapeView';
import '../styles/sound.css';
import '../styles/shapesound.css';

const SR = 44100;
const CLICK_PX = 4;
/** How near a click must land to a strand, px: generous, for sweeping. */
const PICK_PX = 22;
/** Rendered clips kept for toggling a circuit back on. */
const CACHE_CLIPS = 48;

const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const noteName = (m: number): string => `${NAMES[((Math.round(m) % 12) + 12) % 12]}${Math.floor(Math.round(m) / 12) - 1}`;

const MODE_LABELS: Record<Mapping, string> = { spectrum: 'Spectrum', radius: 'Distance from centre', corners: 'Corners' };
const PLAY_LABELS = { loop: 'Loop', constant: 'Constant' } as const;
/** Ink of a painted circuit, by mode. */
const MODE_COLORS: Record<Mapping, readonly [number, number, number]> = {
  spectrum: [250, 150, 50],
  radius: [90, 160, 240],
  corners: [90, 220, 170],
};
const rgb = (c: readonly number[], a = 1): string => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

const mainSig = (v: Brush & { key: string }): string => {
  const s = v.mode === 'spectrum' ? { f0: v.settings.spectrum.f0, terms: v.settings.spectrum.terms } : v.settings[v.mode];
  // A held tone has no lap.
  const { lap: _lap, ...held } = s as { lap?: number };
  return `${v.key}|${v.play}|${v.mode}|${JSON.stringify(v.play === 'constant' ? held : s)}`;
};
const penSig = (v: Brush & { key: string }): string =>
  v.mode === 'spectrum' && v.settings.spectrum.pen ? `${v.key}|pen|${v.play}|${v.settings.spectrum.penSpeed}` : '';

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

function Segmented<T extends string>(props: { label: string; options: readonly T[]; names: Record<T, string>; value: T; onChange: (v: T) => void }): JSX.Element {
  return (
    <div className="shapesound-segmented" role="radiogroup" aria-label={props.label}>
      {props.options.map((o) => (
        <button key={o} type="button" role="radio" aria-checked={props.value === o} className={props.value === o ? 'is-on' : undefined} onClick={() => props.onChange(o)}>
          {props.names[o]}
        </button>
      ))}
    </div>
  );
}

interface Preview {
  readonly key: string;
  readonly points: readonly Pt[];
}

export function ShapeSoundPage(): JSX.Element {
  const [family, setFamily] = useState<TileFamilyId>('hex');
  const [subset, setSubset] = useState<readonly number[]>(reelDefaults('hex').subset);
  const [matching, setMatching] = useState<readonly number[]>(() => comboToMatchingIndices('hex', reelDefaults('hex').subset, reelDefaults('hex').combo));
  const combo = useMemo(() => matchingIndicesToCombo(family, subset, matching), [family, subset, matching]);
  const [brush, setBrush] = useState<Brush>({ mode: 'spectrum', play: 'loop', settings: DEFAULT_SETTINGS });
  const [voices, setVoices] = useState<readonly Voice[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [hover, setHover] = useState<Preview | null>(null);
  const [clicked, setClicked] = useState<Preview | null>(null);
  const nextId = useRef(1);
  const voicesRef = useRef(voices);
  voicesRef.current = voices;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

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

  // --- shapes, clips and the render queue -------------------------------------------
  const mixerRef = useRef(createMixer());
  const shapes = useRef(new Map<string, Shape>());
  const shapeOf = useCallback((c: Preview): Shape => {
    let s = shapes.current.get(c.key);
    if (!s) shapes.current.set(c.key, (s = makeShape(c.points)));
    return s;
  }, []);
  const clips = useRef(new Map<string, Clip>());
  const clipFor = (sig: string, make: () => Clip): Clip => {
    let c = clips.current.get(sig);
    if (c) {
      clips.current.delete(sig);
    } else {
      c = make();
      if (clips.current.size >= CACHE_CLIPS) clips.current.delete(clips.current.keys().next().value!);
    }
    clips.current.set(sig, c);
    return c;
  };
  /** The signatures each voice's mixer clips were made from. */
  const given = useRef(new Map<number, string>());
  const queued = useRef(false);

  /** Render one out-of-date voice per task, so clicks keep landing while clips are made. */
  const pump = useCallback((): void => {
    if (queued.current) return;
    queued.current = true;
    setTimeout(() => {
      queued.current = false;
      const v = voicesRef.current.find((x) => given.current.get(x.id) !== mainSig(x) + penSig(x));
      if (!v) return;
      const shape = shapeOf(v);
      const main = clipFor(mainSig(v), () => render(shape, v.mode, v.settings, SR, v.play));
      const ps = penSig(v);
      const speed = v.settings.spectrum.penSpeed;
      const pen = ps ? clipFor(ps, () => (v.play === 'constant' ? renderPenConstant(shape, speed, SR) : renderPen(shape, speed, SR))) : null;
      const m = mixerRef.current;
      const fresh = !given.current.has(v.id);
      given.current.set(v.id, mainSig(v) + penSig(v));
      m.setClips(v.id, main, pen, REVERB[v.mode]);
      if (fresh) m.start(v.id, true);
      pump();
    }, 30);
  }, [shapeOf]);

  useEffect(() => {
    const m = mixerRef.current;
    for (const v of voices) {
      m.setLevel(v.id, v.on ? v.level : 0);
      const s = v.settings.spectrum;
      m.setPenLevel(v.id, v.mode === 'spectrum' && s.pen ? s.penLevel : 0);
    }
    pump();
  }, [voices, pump]);

  useEffect(() => () => mixerRef.current.stopAll(), []);

  const dropVoice = (id: number): void => {
    mixerRef.current.remove(id);
    given.current.delete(id);
    if (selectedRef.current === id) setSelected(null);
  };
  const clearAll = (): void => {
    voicesRef.current.forEach((v) => dropVoice(v.id));
    setVoices([]);
    setSelected(null);
  };

  // Brush edits go to the selected circuit.
  useEffect(() => {
    setVoices((vs) => applyBrush(vs, selectedRef.current, brush));
  }, [brush]);

  const select = (v: Voice): void => {
    setSelected(v.id);
    setBrush(brushOf(v));
  };

  // A new rule drops the circuits painted in the old one.
  useEffect(() => {
    voicesRef.current.forEach((v) => {
      mixerRef.current.remove(v.id);
      given.current.delete(v.id);
    });
    setVoices([]);
    setSelected(null);
    setHover(null);
    setClicked(null);
    shapes.current.clear();
  }, [world]);

  const onPaint = (c: Preview, shift: boolean): void => {
    setClicked(c);
    const r = paint(voicesRef.current, selectedRef.current, c, brush, shift, nextId.current);
    if (r.kind === 'add') {
      nextId.current++;
      // Make the voice (and the audio context) inside the click; the queue starts it once its clip is ready.
      mixerRef.current.setLevel(r.id!, 0);
    }
    if (r.kind === 'remove') dropVoice(r.id!);
    if (r.kind === 'select') setBrush(brushOf(r.voices.find((v) => v.id === r.selected)!));
    voicesRef.current = r.voices;
    selectedRef.current = r.selected;
    setVoices(r.voices);
    setSelected(r.selected);
  };

  // --- map --------------------------------------------------------------------
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<MapRenderer | null>(null);
  const camRef = useRef<MapCamera>({ cx: 0, cy: 0, scale: reelDefaults('hex').scale });
  const sizeRef = useRef({ w: 1, h: 1 });
  const cullRef = useRef<ReturnType<typeof cutCuller> | null>(null);
  const frameRef = useRef(0);
  const hoverRef = useRef(hover);
  hoverRef.current = hover;

  const draw = useCallback((): void => {
    const r = rendererRef.current;
    if (!r || !world || !cullRef.current) return;
    const { w, h } = sizeRef.current;
    const cam = camRef.current;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    r.setStyle({ showFills: false, showOutlines: false, lineColor: LIGHT_LINE_COLOR, lineScale: 1.5 });
    r.setCut(cullRef.current(cam, w, h));
    r.setCircuits([]);
    r.setTrail(null);
    r.render(cam, w, h, dpr);

    // Painted circuits over the tiles: the mode's colour, solid when held, dashed when looping.
    const o = overlayRef.current;
    const g = o?.getContext('2d');
    if (!o || !g) return;
    if (o.width !== Math.round(w * dpr) || o.height !== Math.round(h * dpr)) {
      o.width = Math.round(w * dpr);
      o.height = Math.round(h * dpr);
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    g.lineJoin = 'round';
    const stroke = (pts: readonly Pt[]): void => {
      g.beginPath();
      pts.forEach((p, i) => {
        const s = worldToScreen(cam, p.x, p.y, w, h);
        if (i === 0) g.moveTo(s.x, s.y);
        else g.lineTo(s.x, s.y);
      });
      g.closePath();
      g.stroke();
    };
    for (const v of voicesRef.current) {
      if (v.id === selectedRef.current) {
        // The selected circuit: a white outline under its colour.
        g.setLineDash([]);
        g.strokeStyle = '#fff';
        g.lineWidth = 8;
        stroke(v.points);
      }
      g.strokeStyle = rgb(MODE_COLORS[v.mode], v.on ? 1 : 0.3);
      g.lineWidth = 3.5;
      g.setLineDash(v.play === 'loop' ? [9, 6] : []);
      stroke(v.points);
    }
    const hv = hoverRef.current;
    if (hv) {
      g.setLineDash([]);
      g.strokeStyle = 'rgba(255,255,255,0.9)';
      g.lineWidth = 1.5;
      stroke(hv.points);
    }
  }, [world]);

  const redraw = useCallback((): void => {
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0;
      draw();
    });
  }, [draw]);

  useEffect(redraw, [voices, selected, hover, redraw]);

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
    const overlay = overlayRef.current;
    if (!host || !canvas || !overlay) return;
    const ro = new ResizeObserver(() => {
      sizeRef.current = { w: host.clientWidth, h: host.clientHeight };
      for (const c of [canvas, overlay]) {
        c.style.width = `${host.clientWidth}px`;
        c.style.height = `${host.clientHeight}px`;
      }
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

  const pick = (e: React.PointerEvent): Preview | null => {
    if (!findStrand) return null;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const cam = camRef.current;
    const c = findStrand(screenToWorld(cam, e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height), PICK_PX / cam.scale);
    return c && c.closed ? { key: c.key, points: c.points } : null;
  };
  const dragRef = useRef<{ x: number; y: number; moved: number } | null>(null);
  const hoverFrame = useRef(0);
  const onPointerDown = (e: React.PointerEvent): void => {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, moved: 0 };
  };
  const onPointerMove = (e: React.PointerEvent): void => {
    const d = dragRef.current;
    if (!d) {
      if (hoverFrame.current) return;
      const ev = { clientX: e.clientX, clientY: e.clientY, currentTarget: e.currentTarget } as React.PointerEvent;
      hoverFrame.current = requestAnimationFrame(() => {
        hoverFrame.current = 0;
        const c = pick(ev);
        setHover((h) => (h?.key === c?.key ? h : c));
      });
      return;
    }
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
    if (!d || d.moved >= CLICK_PX) return;
    const c = pick(e);
    if (c) onPaint(c, e.shiftKey);
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

  // --- brush ----------------------------------------------------------------------
  const setSetting = <M extends Mapping>(m: M, patch: Partial<Settings[M]>): void =>
    setBrush((b) => ({ ...b, settings: { ...b.settings, [m]: { ...b.settings[m], ...patch } } }));
  const sel = voices.find((v) => v.id === selected) ?? null;
  const preview = hover ?? sel ?? clicked;
  const pShape = preview ? shapeOf(preview) : null;
  const tol = brush.settings.corners.tolerance;
  const fit = useMemo(() => (pShape ? fitCorners(pShape, tol) : null), [pShape, tol]);
  const clock = useRef(performance.now() / 1000);
  const brushRef = useRef(brush);
  brushRef.current = brush;
  const previewRef = useRef(preview);
  previewRef.current = preview;
  /** The preview's place in the lap: a painted copy's if it plays the brush's lap, else a clock of its own. */
  const time = useCallback((): number | null => {
    const b = brushRef.current;
    const p = previewRef.current;
    if (!p || b.play === 'constant') return null;
    const v = voicesRef.current.find((x) => x.key === p.key && x.play === 'loop' && mainSig(x) === mainSig({ ...b, key: p.key }));
    const t = v ? mixerRef.current.playback(v.id).t : null;
    return t ?? (performance.now() / 1000 - clock.current) % clipSeconds(b.mode, b.settings);
  }, []);

  const sp = brush.settings.spectrum;
  const ra = brush.settings.radius;
  const co = brush.settings.corners;
  const loop = brush.play === 'loop';

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
          <div
            ref={hostRef}
            className="sound-stage shapesound-map"
            data-testid="shapesound-map"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={() => setHover(null)}
          >
            <canvas ref={canvasRef} />
            <canvas ref={overlayRef} className="shapesound-overlay" />
            {loaded.error ? <p className="sound-error">{loaded.error}</p> : null}
          </div>

          <div className="sound-buttons">
            <button type="button" disabled={!voices.length} onClick={() => voices.forEach((v) => mixerRef.current.start(v.id, true))}>
              Play all
            </button>
            <button type="button" disabled={!voices.length} onClick={() => mixerRef.current.stopAll()}>
              Stop all
            </button>
            <button type="button" disabled={!voices.length} onClick={clearAll}>
              Clear
            </button>
            <span className="sound-value shapesound-count">{voices.length} / 16</span>
          </div>
          <ul className="shapesound-voices" data-testid="shapesound-voices">
            {voices.map((v, i) => (
              <li key={v.id} className={v.id === selected ? 'is-selected' : undefined} onClick={() => select(v)}>
                <span className={`shapesound-swatch is-${v.play}`} style={{ borderColor: rgb(MODE_COLORS[v.mode]) }} />
                <span className="shapesound-voice-name">
                  {v.points.length} · {MODE_LABELS[v.mode]} · {PLAY_LABELS[v.play].toLowerCase()}
                </span>
                <label className="sound-check" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    aria-label={`Voice ${i + 1} on`}
                    checked={v.on}
                    onChange={(e) => setVoices((vs) => vs.map((x) => (x.id === v.id ? { ...x, on: e.target.checked } : x)))}
                  />
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
                  onChange={(e) => setVoices((vs) => vs.map((x) => (x.id === v.id ? { ...x, level: Number(e.target.value) } : x)))}
                />
                <button
                  type="button"
                  aria-label={`Remove voice ${i + 1}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    dropVoice(v.id);
                    setVoices((vs) => vs.filter((x) => x.id !== v.id));
                  }}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>

        <aside className="sound-panel shapesound-panel" data-testid="shapesound-brush">
          <Segmented label="Mode" options={MAPPINGS} names={MODE_LABELS} value={brush.mode} onChange={(mode) => setBrush((b) => ({ ...b, mode }))} />
          <Segmented label="Play" options={PLAYS} names={PLAY_LABELS} value={brush.play} onChange={(play) => setBrush((b) => ({ ...b, play }))} />
          {pShape && fit ? (
            <ShapeView shape={pShape} mapping={brush.mode} play={brush.play} settings={brush.settings} fit={fit} time={time} />
          ) : (
            <div className="shapesound-view shapesound-view-empty" />
          )}
          <fieldset>
            <legend>{MODE_LABELS[brush.mode]}</legend>
            {brush.mode === 'spectrum' ? (
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
            ) : brush.mode === 'radius' ? (
              <>
                <LogSlider label="Base frequency" min={55} max={880} value={ra.f0} show={`${Math.round(ra.f0)} Hz`} onChange={(f0) => setSetting('radius', { f0 })} />
                <Slider label="Pitch range" min={0.2} max={4} step={0.05} value={ra.range} show={`${ra.range.toFixed(2)} oct`} onChange={(range) => setSetting('radius', { range })} />
                {loop ? <Slider label="Lap" min={1} max={20} step={0.5} value={ra.lap} show={`${ra.lap.toFixed(1)} s`} onChange={(lap) => setSetting('radius', { lap })} /> : null}
              </>
            ) : (
              <>
                <LogSlider
                  label="Threshold"
                  min={0.05}
                  max={50}
                  value={co.tolerance}
                  show={pShape ? `${(cornerEps(pShape, co.tolerance) / pShape.tile).toPrecision(2)} tiles` : `×${co.tolerance.toPrecision(2)}`}
                  onChange={(tolerance) => setSetting('corners', { tolerance })}
                />
                {fit ? (
                  <p className="sound-value shapesound-count" data-testid="shapesound-corners">
                    {fit.cuts.length} corners
                  </p>
                ) : null}
                <Slider label="Root" min={36} max={84} step={1} value={co.root} show={noteName(co.root)} onChange={(root) => setSetting('corners', { root })} />
                {loop ? <Slider label="Lap" min={1} max={20} step={0.5} value={co.lap} show={`${co.lap.toFixed(1)} s`} onChange={(lap) => setSetting('corners', { lap })} /> : null}
              </>
            )}
          </fieldset>
        </aside>
      </div>
    </article>
  );
}

export default ShapeSoundPage;
