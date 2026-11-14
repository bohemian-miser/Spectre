/**
 * Sound: hear a rule's circuits. Click any strand to play the chord of the
 * supertiles it spans and trace it with a voice whose pitch follows the
 * trace head, the camera following; clicked strands stay lit until clicked
 * again or cleared. Fill lights every congruent copy in view, each with its
 * own copy of the sound, and Knock sounds lit circuits as the head passes
 * them (`sound/knock.ts`). Tile sounds (`sound/tileSounds.ts`) add notes and
 * setting changes as the trace crosses chosen tiles, edges and lines. The
 * events come from `sound/score.ts` and play through `sound/synth.ts`; the
 * tiling and circuits are the reel's (`reel/director`).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FAMILIES,
  FAMILY_DISPLAY_NAMES,
  SUPER_RULES,
  comboToMatchingIndices,
  matchingIndicesToCombo,
  normalizeMatchingVector,
  unrootedEngineFor,
  type Pt,
  type Rgb,
  type TileFamilyId,
} from '../core';
import { ComboBar } from '../components';
import { ancestorPath, parseTileId, type TileId } from './map/ancestry';
import { panBy, screenToWorld, zoomAt, type MapCamera } from './map/camera';
import { createCanvas2dRenderer } from './map/canvasRenderer';
import type { MapRenderer, TrailGeometry } from './map/rendererTypes';
import { LIGHT_LINE_COLOR } from './map/webglRenderer';
import type { ReelCircuit } from './reel/circuits';
import { loadWorld, reelColor, reelDefaults, type ReelWorld } from './reel/director';
import { cutCuller, geometry } from './reel/stage';
import { findTableOf } from './map/findPass';
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
  tileNoteEvents,
  traceSweep,
  type SoundEvent,
  type SoundParams,
  type StepAncestry,
} from './sound/score';
import { createPlayer } from './sound/synth';
import { knockEvents, type KnockCircuit } from './sound/knock';
import { strandFinder, circuitStrand, type Strand } from './sound/strands';
import { circuitSteps } from './sound/steps';
import { TileSoundEditor, download } from './sound/TileSoundEditor';
import { SpectrumPanel } from './sound/SpectrumPanel';
import { EMPTY_TILE_SOUNDS, readTileSounds, stepActions, type TileSounds } from './sound/tileSounds';
import '../styles/sound.css';

const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const noteName = (m: number): string => `${NAMES[((Math.round(m) % 12) + 12) % 12]}${Math.floor(Math.round(m) / 12) - 1}`;

/** Seconds a lit circuit takes to go from white to its colour. */
const LIGHT_SECONDS = 0.35;
/** Seconds between a trace closing and its copies starting to fill. */
const FILL_GAP = 0.3;
/** Pointer travel, px, below which a press counts as a click. */
const CLICK_PX = 4;
/** How near a click must land to a strand, px. */
const PICK_PX = 12;
/** Seconds a knocked circuit flashes white. */
const FLASH_SECONDS = 0.25;
/** How quickly the camera catches up with the trace head, per second. */
const FOLLOW_RATE = 4;
/** Ink of an open strand, which has no shape to colour it by. */
const OPEN_COLOR: Rgb = [230, 230, 230];
/** Tiling sizes on offer, as multiples of the reel's square. */
const SIZES = [
  { label: 'small', factor: 0.5 },
  { label: 'reel', factor: 1 },
  { label: 'large', factor: 2 },
];

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
const KNOCK_SLIDERS: readonly SliderSpec[] = [{ key: 'reach', label: 'Reach', min: 0.5, max: 4, step: 0.1, show: (v) => `${v.toFixed(1)} units` }];
const MIX_SLIDERS: readonly SliderSpec[] = [
  { key: 'reverb', label: 'Reverb', min: 0, max: 1, step: 0.01, show: pct },
  { key: 'volume', label: 'Volume', min: 0, max: 1, step: 0.01, show: pct },
];

const PATCH_HELP = `# name = value, one per line; these override the controls.
# scale = pentatonic        or  scale = 0 2 3 7 9
# root = d3   low = a3   high = a5   corner = shift   fill = scatter`;

const TILE_SOUNDS_KEY = 'spectre-sound-tiles';

function loadTileSounds(): TileSounds {
  try {
    const raw = localStorage.getItem(TILE_SOUNDS_KEY);
    return raw ? readTileSounds(JSON.parse(raw)) : EMPTY_TILE_SOUNDS;
  } catch {
    return EMPTY_TILE_SOUNDS;
  }
}

/** The trace in progress: context time it starts, its length in seconds, and its path. */
interface Trace {
  readonly start: number;
  readonly dur: number;
  readonly strand: Strand;
}

/** A lit strand: context time it lights, its colour, and whether it was clicked (a fill copy is not). */
interface Lit {
  readonly strand: Strand;
  readonly at: number;
  readonly color: Rgb;
  readonly picked: boolean;
}


/** Where the head is after `steps` (fractional) of a strand. */
function headAt(s: Strand, steps: number): Pt {
  const n = s.tiles.length;
  const whole = Math.max(0, Math.min(n - 1, Math.floor(steps)));
  const u = Math.max(0, Math.min(1, steps - whole));
  const a = s.points[whole];
  const b = s.points[(whole + 1) % s.points.length];
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
}

/** The part of a strand drawn by `steps` (fractional). */
function partial(s: Strand, steps: number, origin: Pt): TrailGeometry | null {
  if (steps <= 0) return null;
  const whole = Math.min(s.tiles.length, Math.floor(steps));
  const pts = s.points.slice(0, whole + 1);
  if (whole < s.tiles.length) pts.push(headAt(s, steps));
  else if (s.closed) pts.push(s.points[0]);
  return geometry(pts, origin, false, undefined, Math.round(steps * 1000));
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
  const [matching, setMatching] = useState<readonly number[]>(() => comboToMatchingIndices('hex', reelDefaults('hex').subset, reelDefaults('hex').combo));
  const combo = useMemo(() => matchingIndicesToCombo(family, subset, matching), [family, subset, matching]);
  const [tileSounds, setTileSounds] = useState<TileSounds>(loadTileSounds);
  const [base, setBase] = useState<SoundParams>(DEFAULT_PARAMS);
  const [patch, setPatch] = useState('');
  const [onClick, setOnClick] = useState<'chord' | 'trace' | 'both'>('both');
  const [fillAfter, setFillAfter] = useState(true);
  const [follow, setFollow] = useState(true);
  const [sizeFactor, setSizeFactor] = useState(1);
  /** The strand the buttons act on: the last one clicked. */
  const [selected, setSelected] = useState<Strand | null>(null);
  const [litCount, setLitCount] = useState(0);
  /** The last circuit clicked and the one before it, for their spectra. */
  const [spectra, setSpectra] = useState<{ a: Strand | null; b: Strand | null }>({ a: null, b: null });
  const [compare, setCompare] = useState(false);
  const [note, setNote] = useState<string>('');

  const patched = useMemo(() => parsePatch(patch, base), [patch, base]);
  const params = patched.params;
  const overridden = useMemo(() => new Set(patched.applied), [patched]);

  const loaded = useMemo((): { world: ReelWorld | null; error: string | null } => {
    const d = reelDefaults(family);
    if (combo === null) return { world: null, error: 'These pairings cross, so no combination code names them.' };
    try {
      const radius = Math.round(d.radius * sizeFactor);
      const world = loadWorld({ ...d, radius, seed, family, subset, combo, seconds: 0, circuits: 0, fps: 30, bpm: 110, width: 1, height: 1 });
      return { world, error: null };
    } catch (err) {
      return { world: null, error: err instanceof Error ? err.message : String(err) };
    }
  }, [family, seed, subset, combo, sizeFactor]);
  const world = loaded.world;
  const findStrand = useMemo(() => (world ? strandFinder(world.cut, findTableOf(world.table), world.circuits) : null), [world]);

  const ids = useMemo<(TileId | null)[]>(() => (world?.cut.ids ?? []).map(parseTileId), [world]);
  /** One colour per circuit shape, smallest shapes first. */
  const colors = useMemo(() => {
    const out = new Map<string, Rgb>();
    const shapes = [...new Map((world?.circuits ?? []).map((c) => [c.shape, c.points.length])).entries()].sort((a, b) => a[1] - b[1]);
    shapes.forEach(([shape], i) => out.set(shape, reelColor(i + 1)));
    return out;
  }, [world]);

  const ancestry = useCallback(
    (c: Pick<Strand, 'tiles'>): StepAncestry[] => {
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
  const traceRef = useRef<Trace | null>(null);
  const litRef = useRef(new Map<string, Lit>());
  /** Context times each lit strand is knocked. */
  const flashRef = useRef(new Map<string, number[]>());
  const followRef = useRef(true);
  followRef.current = follow;
  const lastFrameRef = useRef(0);
  const playerRef = useRef(createPlayer());
  const lastRef = useRef<SoundEvent[]>([]);
  const frameRef = useRef(0);
  const cullRef = useRef<ReturnType<typeof cutCuller> | null>(null);

  const draw = useCallback((): boolean => {
    const r = rendererRef.current;
    if (!r || !world) return false;
    const { w, h } = sizeRef.current;
    const now = playerRef.current.now();
    const origin = world.cut.origin;
    r.setStyle({ showFills: false, showOutlines: false, lineColor: LIGHT_LINE_COLOR, lineScale: 1.5 });
    const lit: TrailGeometry[] = [];
    let busy = false;
    const tr = traceRef.current;
    const tracing = !!tr && now < tr.start + tr.dur;
    const dt = Math.min(0.1, Math.max(0, performance.now() / 1000 - lastFrameRef.current));
    lastFrameRef.current = performance.now() / 1000;
    if (tracing && followRef.current) {
      // Ride the head, as the map's auto-follow does.
      const head = headAt(tr.strand, ((now - tr.start) / tr.dur) * tr.strand.tiles.length);
      const k = 1 - Math.exp(-FOLLOW_RATE * dt);
      camRef.current = { ...camRef.current, cx: camRef.current.cx + (head.x - camRef.current.cx) * k, cy: camRef.current.cy + (head.y - camRef.current.cy) * k };
    }
    const cam = camRef.current;
    r.setCut(cullRef.current!(cam, w, h));
    const hw = w / 2 / cam.scale;
    const hh = h / 2 / cam.scale;
    for (const [key, on] of litRef.current) {
      const c = on.strand;
      if (c.max.x < cam.cx - hw || c.min.x > cam.cx + hw || c.max.y < cam.cy - hh || c.min.y > cam.cy + hh) continue;
      const age = (now - on.at) / LIGHT_SECONDS;
      if (age < 0) {
        busy = true;
        continue;
      }
      let u = Math.min(1, age);
      if (u < 1) busy = true;
      for (const at of flashRef.current.get(key) ?? []) {
        if (now < at) busy = true;
        else if (now < at + FLASH_SECONDS) {
          busy = true;
          u = Math.min(u, (now - at) / FLASH_SECONDS);
        }
      }
      const col = on.color;
      const mixed: Rgb = [255 + (col[0] - 255) * u, 255 + (col[1] - 255) * u, 255 + (col[2] - 255) * u];
      lit.push(geometry(c.points, origin, c.closed, mixed, Math.round(u * 100)));
    }
    r.setCircuits(lit);
    if (tracing) {
      busy = true;
      r.setTrail(partial(tr.strand, ((now - tr.start) / tr.dur) * tr.strand.tiles.length, origin));
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

  useEffect(() => {
    try {
      localStorage.setItem(TILE_SOUNDS_KEY, JSON.stringify(tileSounds));
    } catch {
      // storage blocked: the map lasts as long as the page
    }
  }, [tileSounds]);

  // A new world drops what was playing and lit in the old one.
  useEffect(() => {
    playerRef.current.stop();
    traceRef.current = null;
    litRef.current = new Map();
    flashRef.current = new Map();
    setLitCount(0);
    setSelected(null);
    setSpectra({ a: null, b: null });
    setNote('');
    camRef.current = { cx: 0, cy: 0, scale: reelDefaults(family).scale };
  }, [world, family]);

  // --- sound --------------------------------------------------------------------
  const describe = useCallback(
    (c: Strand, paths: readonly StepAncestry[], chord: readonly number[], extra = ''): void => {
      const what = c.closed ? `${c.tiles.length} steps` : `Open strand, ${c.tiles.length} steps to the edge of the loaded tiles`;
      if (paths.length === 0) {
        setNote(`${what}; no supertile ids for its tiles.`);
        return;
      }
      const L = commonLevel(paths);
      const spans = L > 0 ? spannedAt(paths, L - 1).map((s) => s.type) : [];
      setNote(
        `${what}, inside a level-${L} ${paths[0].types[L]}` +
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

  const chordCache = useRef(new Map<string, number[]>());
  useEffect(() => chordCache.current.clear(), [world, params]);
  const chordOf = useCallback(
    (c: Strand): number[] => {
      let chord = chordCache.current.get(c.key);
      if (!chord) {
        chord = circuitChord(ancestry(c), params);
        chordCache.current.set(c.key, chord);
      }
      return chord;
    },
    [ancestry, params],
  );

  /** Play the chord, trace, knocks and fill of strand `c`, as asked, and light what they light. */
  const perform = useCallback(
    (c: Strand, what: { chord: boolean; trace: boolean; fill: boolean }): void => {
      const player = playerRef.current;
      const p = params;
      const paths = ancestry(c);
      const chord = chordOf(c);
      const color = c.circuit ? (colors.get(c.circuit.shape) ?? OPEN_COLOR) : OPEN_COLOR;
      const events: SoundEvent[] = [];
      if (what.chord) events.push(...chordEvents(chord, p));
      let fillAt = 0;
      let traceDur = 0;
      let contour = traceSweep(c.points, p, undefined, undefined, !c.closed);
      let knocks: { key: string; t: number }[] = [];
      const fill = what.fill && !!c.circuit;
      if (what.trace) {
        const steps = world ? circuitSteps(world, family, subset, c) : [];
        const acts = stepActions(steps, tileSounds);
        const sweep = traceSweep(c.points, p, undefined, acts.states, !c.closed);
        contour = sweep;
        const dt = sweep.dur / c.tiles.length;
        events.push(sweep, ...tileNoteEvents(acts.notes, p, dt));
        if (p.knock) {
          const targets: KnockCircuit[] = [...litRef.current.values()]
            .filter((l) => l.strand.closed && l.strand.key !== c.key)
            .map((l) => ({ ...l.strand, chord: chordOf(l.strand) }));
          const k = knockEvents(c.points, c.tiles.length, dt, targets, p);
          events.push(...k.events);
          knocks = k.hits;
        }
        traceDur = sweep.dur;
        fillAt = sweep.dur + FILL_GAP;
      }
      let extra = '';
      const copies = fill ? copiesInView(c.circuit!) : [];
      let onsets: number[] = [];
      if (fill) {
        const cam = camRef.current;
        const half = sizeRef.current.w / 2;
        const f = fillEvents(
          copies.map((o) => ({ centre: o.centre, pan: ((o.centre.x - cam.cx) * cam.scale) / half })),
          c.centre,
          chord,
          contour,
          p,
          c.circuit!.id + 1,
        );
        onsets = f.onsets;
        events.push(...f.events.map((e) => ({ ...e, t: e.t + fillAt })));
        extra = ` ${copies.length} copies in view, ${f.voiced} voiced.`;
      }
      if (knocks.length) extra += ` ${knocks.length} knocks.`;
      player.stop();
      const start = player.play(events);
      lastRef.current = events;
      const lit = litRef.current;
      lit.set(c.key, { strand: c, at: start + traceDur, color, picked: true });
      copies.forEach((o, i) => {
        const key = `c${o.id}`;
        if (!lit.get(key)?.picked) lit.set(key, { strand: circuitStrand(o), at: start + fillAt + onsets[i], color, picked: false });
      });
      const flashes = new Map<string, number[]>();
      for (const h of knocks) flashes.set(h.key, [...(flashes.get(h.key) ?? []), start + h.t]);
      flashRef.current = flashes;
      traceRef.current = what.trace ? { start, dur: traceDur, strand: c } : null;
      setLitCount(lit.size);
      describe(c, paths, chord, extra);
      redraw();
    },
    [params, ancestry, chordOf, colors, copiesInView, describe, redraw, world, family, subset, tileSounds],
  );

  const play = (what: 'chord' | 'trace' | 'fill'): void => {
    if (!selected) return;
    if (what === 'chord') perform(selected, { chord: true, trace: false, fill: false });
    else if (what === 'trace') perform(selected, { chord: false, trace: true, fill: fillAfter });
    else perform(selected, { chord: false, trace: false, fill: true });
  };

  const clearLit = (): void => {
    playerRef.current.stop();
    traceRef.current = null;
    litRef.current = new Map();
    flashRef.current = new Map();
    setLitCount(0);
    setSelected(null);
    setNote('');
    redraw();
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
      // Dragging takes the camera back from the follow until the next click.
      followRef.current = false;
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
    const q = screenToWorld(cam, e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height);
    const c = findStrand(q, PICK_PX / cam.scale);
    if (!c) return;
    // A clicked strand clicked again is let go.
    if (litRef.current.get(c.key)?.picked) {
      litRef.current.delete(c.key);
      if (traceRef.current?.strand.key === c.key) {
        playerRef.current.stop();
        traceRef.current = null;
      }
      setLitCount(litRef.current.size);
      if (selected?.key === c.key) setSelected(null);
      redraw();
      return;
    }
    setSelected(c);
    if (c.closed) setSpectra((s) => (s.a?.key === c.key ? s : { a: c, b: s.a }));
    followRef.current = follow;
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
    setMatching(comboToMatchingIndices(f, d.subset, d.combo));
  };
  const setRule = (f: TileFamilyId, nextSubset: readonly number[], nextMatching: readonly number[]): void => {
    if (f !== family) return changeFamily(f);
    setSubset(nextSubset);
    setMatching(normalizeMatchingVector(f, nextSubset, nextMatching));
  };
  const scaleName = Object.entries(SCALES).find(([, s]) => s.join() === params.scale.join())?.[0] ?? 'custom';
  const sliders = (list: readonly SliderSpec[]): JSX.Element[] =>
    list.map((s) => <Slider key={s.key} spec={s} params={params} overridden={overridden.has(s.key)} onChange={setParam} />);

  return (
    <article className="sound-page">
      <header>
        <h1>Sound</h1>
        <p className="sound-note">
          Click any strand to hear it: a chord from the supertiles it spans, and a voice whose pitch follows the trace head while
          the camera follows it. Clicked strands stay lit; click one again to let it go.
          Fill lights every congruent copy in view, and each copy adds its own voice. Tile sounds add notes and setting changes as the trace crosses the tiles, edges and lines you pick. Drag to pan, wheel to zoom.
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
          <span>Tiling</span>
          <select aria-label="Tiling size" value={sizeFactor} onChange={(e) => setSizeFactor(Number(e.target.value))}>
            {SIZES.map((z) => (
              <option key={z.factor} value={z.factor}>
                {z.label}
              </option>
            ))}
          </select>
        </label>
      </form>
      <ComboBar
        family={family}
        subset={subset}
        matching={matching}
        nonCrossingOnly
        tiles={false}
        onChange={(next) => setRule(next.family, next.subset, next.matching)}
      />

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
            <button type="button" disabled={!selected?.circuit} onClick={() => play('fill')}>
              Fill
            </button>
            <button
              type="button"
              onClick={() => {
                playerRef.current.stop();
                traceRef.current = null;
                redraw();
              }}
            >
              Stop
            </button>
            <button type="button" disabled={litCount === 0} onClick={clearLit}>
              Clear lit ({litCount})
            </button>
            <button
              type="button"
              disabled={!selected}
              onClick={() =>
                download(
                  `sound-${family}-${seed}-${combo ?? 'crossing'}.json`,
                  JSON.stringify({ family, seed, edges: subset, combo, strand: selected ? { key: selected.key, closed: selected.closed, steps: selected.tiles.length } : null, params, tileSounds, events: lastRef.current }),
                )
              }
            >
              Save events
            </button>
          </div>
          <p className="sound-note" role="status" data-testid="sound-status">
            {note || (world ? `${world.circuits.length} circuits of ${colors.size} shapes. Click any strand.` : '')}
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
          <label className="sound-check">
            <input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} />
            Camera follows the trace
          </label>

          <fieldset>
            <legend>Spectrum</legend>
            <label className="sound-check">
              <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} />
              Compare with the circuit clicked before
            </label>
            <SpectrumPanel
              a={spectra.a ? { label: 'Last clicked', points: spectra.a.points } : null}
              b={compare && spectra.b ? { label: 'Clicked before', points: spectra.b.points } : null}
              f0={440 * 2 ** ((params.root - 12 - 69) / 12)}
              f0Label={noteName(params.root - 12)}
              play={(events) => playerRef.current.play(events)}
              now={() => playerRef.current.now()}
            />
          </fieldset>

          <fieldset>
            <legend>Knock</legend>
            <label className="sound-check">
              <input type="checkbox" checked={params.knock} disabled={overridden.has('knock')} onChange={(e) => setChoice('knock', e.target.checked)} />
              Lit circuits sound as the trace passes them
            </label>
            <label className="sound-check">
              <input type="checkbox" checked={params.nested} disabled={overridden.has('nested')} onChange={(e) => setChoice('nested', e.target.checked)} />
              Circuits inside a knocked one too, a 16th later
            </label>
            {sliders(KNOCK_SLIDERS)}
          </fieldset>

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
            <legend>Tile sounds</legend>
            <TileSoundEditor
              family={family}
              subset={subset}
              matching={matching}
              map={tileSounds}
              onMap={setTileSounds}
              onMatching={(i, index) => setMatching(matching.map((m, j) => (j === i ? index : m)))}
              onToggleClass={(m) => setRule(family, subset.includes(m) ? subset.filter((x) => x !== m) : [...subset, m].sort((a, b) => a - b), matching)}
            />
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
