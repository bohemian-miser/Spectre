/**
 * Sound: hear a rule's circuits. Click a circuit to play the chord of the
 * supertiles it spans and trace it with a voice whose pitch follows the
 * trace head; Fill lights every congruent copy in view, each with its own
 * copy of the sound. The events come from `sound/score.ts` and play through
 * `sound/synth.ts`; the tiling and circuits are the reel's (`reel/director`).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FAMILIES,
  FAMILY_DISPLAY_NAMES,
  SUPER_RULES,
  leafOrder,
  unrootedEngineFor,
  type Pt,
  type Rgb,
  type TileFamilyId,
} from '../core';
import { EdgeSubsetPicker } from '../components';
import { ancestorPath, parseTileId, type TileId } from './map/ancestry';
import { panBy, screenToWorld, zoomAt, type MapCamera } from './map/camera';
import { createCanvas2dRenderer } from './map/canvasRenderer';
import { comboLength, normalizeCombo } from './map/mapUrl';
import type { MapRenderer, TrailGeometry } from './map/rendererTypes';
import { LIGHT_LINE_COLOR } from './map/webglRenderer';
import type { ReelCircuit } from './reel/circuits';
import { loadWorld, reelColor, reelDefaults, type ReelWorld } from './reel/director';
import { cutCuller, geometry } from './reel/stage';
import {
  CHOICES,
  DEFAULT_PARAMS,
  SCALES,
  chordEvents,
  circuitChord,
  commonLevel,
  fillEvents,
  parsePatch,
  spannedAt,
  traceSweep,
  type SoundEvent,
  type SoundParams,
  type StepAncestry,
} from './sound/score';
import { createPlayer } from './sound/synth';
import '../styles/sound.css';

const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const noteName = (m: number): string => `${NAMES[((Math.round(m) % 12) + 12) % 12]}${Math.floor(Math.round(m) / 12) - 1}`;

/** Seconds a lit circuit takes to go from white to its colour. */
const LIGHT_SECONDS = 0.35;
/** Seconds between a trace closing and its copies starting to fill. */
const FILL_GAP = 0.3;
/** Pointer travel, px, below which a press counts as a click. */
const CLICK_PX = 4;

type NumKey = { [K in keyof SoundParams]: SoundParams[K] extends number ? K : never }[keyof SoundParams];

interface SliderSpec {
  readonly key: NumKey;
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly show?: (v: number) => string;
}

const secs = (v: number): string => `${v.toFixed(2)} s`;
const pct = (v: number): string => `${Math.round(v * 100)}%`;

const CHORD_SLIDERS: readonly SliderSpec[] = [
  { key: 'root', label: 'Root', min: 36, max: 72, step: 1, show: noteName },
  { key: 'chordSeconds', label: 'Length', min: 0.5, max: 8, step: 0.1, show: secs },
];
const TRACE_SLIDERS: readonly SliderSpec[] = [
  { key: 'low', label: 'Lowest', min: 36, max: 96, step: 1, show: noteName },
  { key: 'high', label: 'Highest', min: 36, max: 96, step: 1, show: noteName },
  { key: 'pace', label: 'Pace', min: 1, max: 80, step: 1, show: (v) => `${v} steps/s` },
  { key: 'glide', label: 'Glide', min: 0, max: 0.5, step: 0.01, show: secs },
  { key: 'vibrato', label: 'Vibrato', min: 0, max: 60, step: 1, show: (v) => `${v} cents` },
  { key: 'cornerWindow', label: 'Corner window', min: 1, max: 12, step: 1, show: (v) => `${v} steps` },
  { key: 'cornerAngle', label: 'Corner angle', min: 10, max: 170, step: 5, show: (v) => `${v}°` },
  { key: 'cornerDepth', label: 'Corner depth', min: 0, max: 7, step: 0.5 },
];
const FILL_SLIDERS: readonly SliderSpec[] = [
  { key: 'spread', label: 'Spread', min: 0, max: 4, step: 0.05, show: secs },
  { key: 'voices', label: 'Voices', min: 1, max: 256, step: 1 },
  { key: 'detune', label: 'Detune', min: 0, max: 50, step: 1, show: (v) => `${v} cents` },
];
const MIX_SLIDERS: readonly SliderSpec[] = [
  { key: 'reverb', label: 'Reverb', min: 0, max: 1, step: 0.01, show: pct },
  { key: 'volume', label: 'Volume', min: 0, max: 1, step: 0.01, show: pct },
];

const PATCH_HELP = `# name = value, one per line; these override the controls.
# scale = pentatonic        or  scale = 0 2 3 7 9
# root = d3   low = a3   high = a5   corner = shift   fill = scatter`;

interface Animation {
  /** Context time the trace starts, its length in seconds, and its points. */
  trace: { start: number; dur: number; points: readonly Pt[]; color: Rgb } | null;
  /** Context time each circuit lights. */
  lit: Map<number, { at: number; color: Rgb }>;
}

function pointInPolygon(q: Pt, pts: readonly Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i];
    const b = pts[j];
    if (a.y > q.y !== b.y > q.y && q.x < ((b.x - a.x) * (q.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

function segmentDistance(q: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const u = Math.max(0, Math.min(1, ((q.x - a.x) * dx + (q.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(q.x - a.x - u * dx, q.y - a.y - u * dy);
}

/** The circuit whose line is within `tol` of `q`, else the smallest one around it. */
function pickCircuit(circuits: readonly ReelCircuit[], q: Pt, tol: number): ReelCircuit | null {
  let best: ReelCircuit | null = null;
  let bestD = tol;
  let around: ReelCircuit | null = null;
  let aroundArea = Infinity;
  for (const c of circuits) {
    if (q.x < c.min.x - tol || q.x > c.max.x + tol || q.y < c.min.y - tol || q.y > c.max.y + tol) continue;
    const n = c.points.length;
    for (let i = 0; i < n; i++) {
      const d = segmentDistance(q, c.points[i], c.points[(i + 1) % n]);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    const area = (c.max.x - c.min.x) * (c.max.y - c.min.y);
    if (area < aroundArea && pointInPolygon(q, c.points)) {
      around = c;
      aroundArea = area;
    }
  }
  return best ?? around;
}

function partial(points: readonly Pt[], steps: number, origin: Pt): TrailGeometry | null {
  const n = points.length;
  if (steps <= 0) return null;
  const whole = Math.min(n, Math.floor(steps));
  const pts = points.slice(0, whole + 1);
  if (whole < n) {
    const a = points[whole];
    const b = points[(whole + 1) % n];
    const u = steps - whole;
    pts.push({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });
  } else {
    pts.push(points[0]);
  }
  return geometry(pts, origin, false, undefined, Math.round(steps * 1000));
}

function download(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Slider(props: { spec: SliderSpec; params: SoundParams; overridden: boolean; onChange: (k: NumKey, v: number) => void }): JSX.Element {
  const { spec, params, overridden } = props;
  const v = params[spec.key];
  return (
    <label className="sound-slider">
      <span>{spec.label}</span>
      <input
        type="range"
        min={spec.min}
        max={spec.max}
        step={spec.step}
        value={v}
        disabled={overridden}
        onChange={(e) => props.onChange(spec.key, Number(e.target.value))}
      />
      <span className="sound-value">{overridden ? 'patch' : spec.show ? spec.show(v) : v}</span>
    </label>
  );
}

function Choice<K extends keyof typeof CHOICES>(props: {
  name: K;
  label: string;
  value: string;
  disabled: boolean;
  onChange: (v: (typeof CHOICES)[K][number]) => void;
}): JSX.Element {
  return (
    <label className="sound-choice">
      <span>{props.label}</span>
      <select value={props.value} disabled={props.disabled} onChange={(e) => props.onChange(e.target.value as (typeof CHOICES)[K][number])}>
        {CHOICES[props.name].map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SoundPage(): JSX.Element {
  const [family, setFamily] = useState<TileFamilyId>('hex');
  const [seed, setSeed] = useState(1);
  const [seedDraft, setSeedDraft] = useState('1');
  const [subset, setSubset] = useState<readonly number[]>(reelDefaults('hex').subset);
  const [combo, setCombo] = useState(reelDefaults('hex').combo);
  const [base, setBase] = useState<SoundParams>(DEFAULT_PARAMS);
  const [patch, setPatch] = useState('');
  const [onClick, setOnClick] = useState<'chord' | 'trace' | 'both'>('both');
  const [fillAfter, setFillAfter] = useState(true);
  const [selected, setSelected] = useState<ReelCircuit | null>(null);
  const [note, setNote] = useState<string>('');

  const patched = useMemo(() => parsePatch(patch, base), [patch, base]);
  const params = patched.params;
  const overridden = useMemo(() => new Set(patched.applied), [patched]);

  const loaded = useMemo((): { world: ReelWorld | null; error: string | null } => {
    const d = reelDefaults(family);
    try {
      const world = loadWorld({ ...d, seed, family, subset, combo, seconds: 0, circuits: 0, fps: 30, bpm: 110, width: 1, height: 1 });
      return { world, error: null };
    } catch (err) {
      return { world: null, error: err instanceof Error ? err.message : String(err) };
    }
  }, [family, seed, subset, combo]);
  const world = loaded.world;

  const ids = useMemo<(TileId | null)[]>(() => (world?.cut.ids ?? []).map(parseTileId), [world]);
  /** One colour per circuit shape, smallest shapes first. */
  const colors = useMemo(() => {
    const out = new Map<string, Rgb>();
    const shapes = [...new Map((world?.circuits ?? []).map((c) => [c.shape, c.points.length])).entries()].sort((a, b) => a[1] - b[1]);
    shapes.forEach(([shape], i) => out.set(shape, reelColor(i + 1)));
    return out;
  }, [world]);

  const ancestry = useCallback(
    (c: ReelCircuit): StepAncestry[] => {
      const tiles = Array.from(c.tiles, (i) => ids[i]);
      if (tiles.some((t) => !t)) return [];
      const top = Math.max(...tiles.map((t) => t!.d)) + 1;
      const engine = unrootedEngineFor(seed, family);
      engine.ensureLevel(top + 1);
      const chain = engine.chain();
      return tiles.map((t) => ancestorPath(t!, chain, SUPER_RULES, top));
    },
    [ids, seed, family],
  );

  // --- canvas, camera and drawing ------------------------------------------------
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<MapRenderer | null>(null);
  const camRef = useRef<MapCamera>({ cx: 0, cy: 0, scale: reelDefaults('hex').scale });
  const sizeRef = useRef({ w: 1, h: 1 });
  const animRef = useRef<Animation>({ trace: null, lit: new Map() });
  const selectedRef = useRef<ReelCircuit | null>(null);
  selectedRef.current = selected;
  const playerRef = useRef(createPlayer());
  const lastRef = useRef<SoundEvent[]>([]);
  const frameRef = useRef(0);
  const cullRef = useRef<ReturnType<typeof cutCuller> | null>(null);

  const draw = useCallback((): boolean => {
    const r = rendererRef.current;
    if (!r || !world) return false;
    const cam = camRef.current;
    const { w, h } = sizeRef.current;
    const now = playerRef.current.now();
    const origin = world.cut.origin;
    r.setCut(cullRef.current!(cam, w, h));
    r.setStyle({ showFills: false, showOutlines: false, lineColor: LIGHT_LINE_COLOR, lineScale: 1.5 });
    const lit: TrailGeometry[] = [];
    let busy = false;
    const hw = w / 2 / cam.scale;
    const hh = h / 2 / cam.scale;
    const anim = animRef.current;
    const tr = anim.trace;
    for (const c of world.circuits) {
      const on = anim.lit.get(c.id);
      if (!on) continue;
      if (c.max.x < cam.cx - hw || c.min.x > cam.cx + hw || c.max.y < cam.cy - hh || c.min.y > cam.cy + hh) continue;
      const age = (now - on.at) / LIGHT_SECONDS;
      if (age < 0) {
        busy = true;
        continue;
      }
      const u = Math.min(1, age);
      if (u < 1) busy = true;
      const col = on.color;
      const mixed: Rgb = [255 + (col[0] - 255) * u, 255 + (col[1] - 255) * u, 255 + (col[2] - 255) * u];
      lit.push(geometry(c.points, origin, true, mixed, Math.round(u * 100)));
    }
    r.setCircuits(lit);
    if (tr && now < tr.start + tr.dur) {
      busy = true;
      r.setTrail(partial(tr.points, ((now - tr.start) / tr.dur) * tr.points.length, origin));
    } else {
      r.setTrail(null);
    }
    r.render(cam, w, h, Math.min(2, window.devicePixelRatio || 1));
    return busy;
  }, [world]);

  const redraw = useCallback((): void => {
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0;
      if (draw()) redraw();
    });
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const r = createCanvas2dRenderer(canvas, family, Infinity);
    rendererRef.current = r;
    if (r && world) r.setChords(world.table);
    cullRef.current = world ? cutCuller(world.cut) : null;
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
      const w = host.clientWidth;
      const h = host.clientHeight;
      sizeRef.current = { w, h };
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      redraw();
    });
    ro.observe(host);
    return () => ro.disconnect();
  }, [redraw]);

  useEffect(() => {
    playerRef.current.setMix(params.reverb, params.volume);
  }, [params.reverb, params.volume]);

  useEffect(() => () => playerRef.current.stop(), []);

  // A new world drops what was playing and lit in the old one.
  useEffect(() => {
    playerRef.current.stop();
    animRef.current = { trace: null, lit: new Map() };
    setSelected(null);
    setNote('');
    camRef.current = { cx: 0, cy: 0, scale: reelDefaults(family).scale };
  }, [world, family]);

  // --- sound --------------------------------------------------------------------
  const describe = useCallback(
    (c: ReelCircuit, paths: readonly StepAncestry[], chord: readonly number[], extra = ''): void => {
      if (paths.length === 0) {
        setNote(`${c.points.length} steps; no supertile ids for its tiles.`);
        return;
      }
      const L = commonLevel(paths);
      const spans = L > 0 ? spannedAt(paths, L - 1).map((s) => s.type) : [];
      setNote(
        `${c.points.length} steps, inside a level-${L} ${paths[0].types[L]}` +
          (spans.length ? `, across ${spans.length} level-${L - 1} supertiles (${spans.join(', ')})` : '') +
          `. Chord ${chord.map(noteName).join(' ')}.${extra}`,
      );
    },
    [],
  );

  const copiesInView = useCallback(
    (c: ReelCircuit): ReelCircuit[] => {
      const cam = camRef.current;
      const { w, h } = sizeRef.current;
      const hw = w / 2 / cam.scale;
      const hh = h / 2 / cam.scale;
      return (world?.circuits ?? []).filter(
        (o) => o.shape === c.shape && o.id !== c.id && !(o.max.x < cam.cx - hw || o.min.x > cam.cx + hw || o.max.y < cam.cy - hh || o.min.y > cam.cy + hh),
      );
    },
    [world],
  );

  /** Play the chord, trace and fill of circuit `c`, as asked, and light what they light. */
  const perform = useCallback(
    (c: ReelCircuit, what: { chord: boolean; trace: boolean; fill: boolean }): void => {
      const player = playerRef.current;
      const p = params;
      const paths = ancestry(c);
      const chord = circuitChord(paths, p);
      const color = colors.get(c.shape) ?? [255, 255, 255];
      const events: SoundEvent[] = [];
      if (what.chord) events.push(...chordEvents(chord, p));
      let fillAt = 0;
      let traceDur = 0;
      if (what.trace) {
        const sweep = traceSweep(c.points, p);
        events.push(sweep);
        traceDur = sweep.dur;
        fillAt = sweep.dur + FILL_GAP;
      }
      let extra = '';
      const copies = what.fill ? copiesInView(c) : [];
      let onsets: number[] = [];
      if (what.fill) {
        const cam = camRef.current;
        const half = sizeRef.current.w / 2;
        const fill = fillEvents(
          copies.map((o) => ({ centre: o.centre, pan: ((o.centre.x - cam.cx) * cam.scale) / half })),
          c.centre,
          chord,
          traceSweep(c.points, p),
          p,
          c.id + 1,
        );
        onsets = fill.onsets;
        events.push(...fill.events.map((e) => ({ ...e, t: e.t + fillAt })));
        extra = ` ${copies.length} copies in view, ${fill.voiced} voiced.`;
      }
      player.stop();
      const start = player.play(events);
      lastRef.current = events;
      const lit = new Map<number, { at: number; color: Rgb }>();
      lit.set(c.id, { at: start + traceDur, color });
      copies.forEach((o, i) => lit.set(o.id, { at: start + fillAt + onsets[i], color }));
      animRef.current = { trace: what.trace ? { start, dur: traceDur, points: c.points, color } : null, lit };
      describe(c, paths, chord, extra);
      redraw();
    },
    [params, ancestry, colors, copiesInView, describe, redraw],
  );

  const play = (what: 'chord' | 'trace' | 'fill'): void => {
    if (!selected) return;
    if (what === 'chord') perform(selected, { chord: true, trace: false, fill: false });
    else if (what === 'trace') perform(selected, { chord: false, trace: true, fill: fillAfter });
    else perform(selected, { chord: false, trace: false, fill: true });
  };

  // --- pointer --------------------------------------------------------------------
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
    if (!d || d.moved >= CLICK_PX || !world) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const cam = camRef.current;
    const q = screenToWorld(cam, e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height);
    const c = pickCircuit(world.circuits, q, 8 / cam.scale);
    setSelected(c);
    if (!c) {
      playerRef.current.stop();
      animRef.current = { trace: null, lit: new Map() };
      setNote('');
      redraw();
      return;
    }
    perform(c, { chord: onClick !== 'trace', trace: onClick !== 'chord', fill: onClick !== 'chord' && fillAfter });
  };
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

  // --- controls -------------------------------------------------------------------
  const setParam = useCallback((k: NumKey, v: number): void => setBase((b) => ({ ...b, [k]: v })), []);
  const setChoice = <K extends keyof SoundParams>(k: K, v: SoundParams[K]): void => setBase((b) => ({ ...b, [k]: v }));
  const changeFamily = (f: TileFamilyId): void => {
    const d = reelDefaults(f);
    setFamily(f);
    setSubset(d.subset);
    setCombo(d.combo);
  };
  const scaleName = Object.entries(SCALES).find(([, s]) => s.join() === params.scale.join())?.[0] ?? 'custom';
  const sliders = (list: readonly SliderSpec[]): JSX.Element[] =>
    list.map((s) => <Slider key={s.key} spec={s} params={params} overridden={overridden.has(s.key)} onChange={setParam} />);

  return (
    <article className="sound-page">
      <header>
        <h1>Sound</h1>
        <p className="sound-note">
          Click a circuit to hear it: a chord from the supertiles it spans, and a voice whose pitch follows the trace head.
          Fill lights every congruent copy in view, and each copy adds its own voice. Drag to pan, wheel to zoom.
        </p>
      </header>

      <form
        className="sound-controls"
        onSubmit={(e) => {
          e.preventDefault();
          const n = Math.floor(Number(seedDraft)) >>> 0;
          setSeed(n);
          setSeedDraft(String(n));
        }}
      >
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
        <label className="sound-choice">
          <span>Seed</span>
          <input type="text" inputMode="numeric" aria-label="World seed" value={seedDraft} onChange={(e) => setSeedDraft(e.target.value)} />
        </label>
        <button type="submit">Reseed</button>
        <label className="sound-choice">
          <span>Matchings</span>
          <input
            type="text"
            className="sound-combo"
            aria-label="Combination string"
            spellCheck={false}
            maxLength={comboLength(family)}
            value={combo}
            onChange={(e) => setCombo(normalizeCombo(e.target.value, family))}
            title={`One digit per leaf type: ${leafOrder(family).join(', ')}`}
          />
        </label>
        <EdgeSubsetPicker family={family} subset={subset} advanced={false} onSubsetChange={setSubset} />
      </form>

      <div className="sound-main">
        <div
          ref={hostRef}
          className="sound-stage"
          data-testid="sound-stage"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <canvas ref={canvasRef} />
          {loaded.error ? <p className="sound-error">{loaded.error}</p> : null}
          {world && world.circuits.length === 0 ? <p className="sound-error">This rule closes no circuit in the cut.</p> : null}
        </div>

        <aside className="sound-panel">
          <div className="sound-buttons">
            <button type="button" disabled={!selected} onClick={() => play('chord')}>
              Chord
            </button>
            <button type="button" disabled={!selected} onClick={() => play('trace')}>
              Trace
            </button>
            <button type="button" disabled={!selected} onClick={() => play('fill')}>
              Fill
            </button>
            <button
              type="button"
              onClick={() => {
                playerRef.current.stop();
                animRef.current = { trace: null, lit: new Map() };
                redraw();
              }}
            >
              Stop
            </button>
            <button
              type="button"
              disabled={!selected}
              onClick={() =>
                download(
                  `sound-${family}-${seed}-${combo}.json`,
                  JSON.stringify({ family, seed, edges: subset, combo, circuit: selected?.points.length ?? null, params, events: lastRef.current }),
                )
              }
            >
              Save events
            </button>
          </div>
          <p className="sound-note" role="status" data-testid="sound-status">
            {note || (world ? `${world.circuits.length} circuits of ${colors.size} shapes. Click one.` : '')}
          </p>
          <label className="sound-choice">
            <span>Click plays</span>
            <select value={onClick} onChange={(e) => setOnClick(e.target.value as typeof onClick)}>
              <option value="both">chord and trace</option>
              <option value="chord">chord</option>
              <option value="trace">trace</option>
            </select>
          </label>
          <label className="sound-check">
            <input type="checkbox" checked={fillAfter} onChange={(e) => setFillAfter(e.target.checked)} />
            Fill when a trace closes
          </label>

          <fieldset>
            <legend>Chord</legend>
            <Choice name="chord" label="From" value={params.chord} disabled={overridden.has('chord')} onChange={(v) => setChoice('chord', v)} />
            <label className="sound-choice">
              <span>Scale</span>
              <select value={scaleName} disabled={overridden.has('scale')} onChange={(e) => setChoice('scale', [...(SCALES[e.target.value] ?? params.scale)])}>
                {Object.keys(SCALES).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                {scaleName === 'custom' ? <option value="custom">custom</option> : null}
              </select>
            </label>
            {sliders(CHORD_SLIDERS)}
          </fieldset>

          <fieldset>
            <legend>Trace</legend>
            <Choice name="trace" label="Pitch from" value={params.trace} disabled={overridden.has('trace')} onChange={(v) => setChoice('trace', v)} />
            <Choice name="wave" label="Wave" value={params.wave} disabled={overridden.has('wave')} onChange={(v) => setChoice('wave', v)} />
            <label className="sound-check">
              <input type="checkbox" checked={params.quantise} disabled={overridden.has('quantise')} onChange={(e) => setChoice('quantise', e.target.checked)} />
              Snap to scale
            </label>
            <Choice name="corner" label="At corners" value={params.corner} disabled={overridden.has('corner')} onChange={(v) => setChoice('corner', v)} />
            {sliders(TRACE_SLIDERS)}
          </fieldset>

          <fieldset>
            <legend>Fill</legend>
            <Choice name="fill" label="Onsets" value={params.fill} disabled={overridden.has('fill')} onChange={(v) => setChoice('fill', v)} />
            <Choice name="fillSound" label="Each copy plays" value={params.fillSound} disabled={overridden.has('fillSound')} onChange={(v) => setChoice('fillSound', v)} />
            {sliders(FILL_SLIDERS)}
          </fieldset>

          <fieldset>
            <legend>Mix</legend>
            {sliders(MIX_SLIDERS)}
          </fieldset>

          <fieldset>
            <legend>Patch</legend>
            <textarea
              className="sound-patch"
              aria-label="Patch"
              spellCheck={false}
              rows={5}
              placeholder={PATCH_HELP}
              value={patch}
              onChange={(e) => setPatch(e.target.value)}
            />
            {patched.errors.length ? (
              <p className="sound-error-text">{patched.errors.join('; ')}</p>
            ) : patched.applied.length ? (
              <p className="sound-note">Set: {patched.applied.join(', ')}</p>
            ) : null}
          </fieldset>
        </aside>
      </div>
    </article>
  );
}

export default SoundPage;
