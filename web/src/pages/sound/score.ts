/**
 * Sound for circuits as a list of timed events: a chord from the supertiles a
 * circuit spans, a voice whose pitch follows the trace head, and one copy of
 * a sound per congruent circuit when they fill. Pure; `synth.ts` plays the
 * events with Web Audio, and the same list can be saved and rendered offline.
 */

import type { Pt } from '../../core';

export const SCALES: Readonly<Record<string, readonly number[]>> = {
  dorian: [0, 2, 3, 5, 7, 9, 10],
  pentatonic: [0, 3, 5, 7, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  'whole tone': [0, 2, 4, 6, 8, 10],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

export const CHOICES = {
  chord: ['spanned', 'path', 'counts'],
  trace: ['radius', 'height', 'width'],
  wave: ['sine', 'triangle', 'sawtooth', 'square'],
  corner: ['bend', 'filter', 'shift', 'none'],
  fill: ['ripple', 'scatter', 'together'],
  fillSound: ['chord', 'root', 'contour'],
} as const;

type Choice<K extends keyof typeof CHOICES> = (typeof CHOICES)[K][number];

export interface SoundParams {
  /** MIDI note of the scale's first degree. */
  root: number;
  /** Semitones above the root within one octave, ascending from 0. */
  scale: number[];
  /** How a circuit's supertiles become a chord (see `circuitChord`). */
  chord: Choice<'chord'>;
  chordSeconds: number;
  /** What of the trace head's position sets the pitch (see `traceSweep`). */
  trace: Choice<'trace'>;
  /** MIDI range the trace pitch moves in. */
  low: number;
  high: number;
  /** Snap the trace pitch to the scale. */
  quantise: boolean;
  /** Seconds the pitch takes to reach a new value. */
  glide: number;
  /** Trace speed, steps per second. */
  pace: number;
  wave: Choice<'wave'>;
  /** Vibrato depth, cents. */
  vibrato: number;
  /** What a corner of the path does to the trace voice. */
  corner: Choice<'corner'>;
  /** Steps each side of a point over which its turn is measured. */
  cornerWindow: number;
  /** Degrees of turn over the window that make a corner. */
  cornerAngle: number;
  /** Semitones for bend and shift, octaves for filter. */
  cornerDepth: number;
  /** How the copies' onsets are spread when they fill. */
  fill: Choice<'fill'>;
  /** What each copy plays. */
  fillSound: Choice<'fillSound'>;
  /** Seconds over which the copies come in. */
  spread: number;
  /** Most oscillators a fill may use. */
  voices: number;
  /** Random detune per copy, cents either way. */
  detune: number;
  /** Reverb send, 0..1. */
  reverb: number;
  volume: number;
}

export const DEFAULT_PARAMS: SoundParams = {
  root: 50,
  scale: [...SCALES.dorian],
  chord: 'spanned',
  chordSeconds: 3,
  trace: 'radius',
  low: 57,
  high: 81,
  quantise: true,
  glide: 0.05,
  pace: 12,
  wave: 'triangle',
  vibrato: 12,
  corner: 'bend',
  cornerWindow: 3,
  cornerAngle: 50,
  cornerDepth: 2,
  fill: 'ripple',
  fillSound: 'chord',
  spread: 1.2,
  voices: 96,
  detune: 10,
  reverb: 0.3,
  volume: 0.7,
};

export interface NoteEvent {
  readonly kind: 'note';
  /** Seconds from the start of the score. */
  readonly t: number;
  readonly dur: number;
  readonly midi: number;
  readonly gain: number;
  /** -1 (left) to 1 (right). */
  readonly pan: number;
  readonly detune: number;
  readonly attack: number;
  readonly wave: Choice<'wave'>;
}

/** One voice with a moving pitch; times inside are from the event's `t`. */
export interface SweepEvent {
  readonly kind: 'sweep';
  readonly t: number;
  readonly dur: number;
  readonly gain: number;
  readonly pan: number;
  readonly detune: number;
  readonly wave: Choice<'wave'>;
  readonly glide: number;
  readonly vibrato: number;
  readonly pitch: readonly { t: number; midi: number }[];
  /** Pitch bends that go out and come back, semitones. */
  readonly bends: readonly { t: number; semis: number }[];
  /** Low-pass openings that close again, octaves above the resting cutoff. */
  readonly filter: readonly { t: number; octaves: number }[];
}

export type SoundEvent = NoteEvent | SweepEvent;

/** Degree `d` of the scale (0 = root; wraps into higher and lower octaves). */
export function scaleNote(p: Pick<SoundParams, 'root' | 'scale'>, d: number): number {
  const n = p.scale.length;
  const k = ((d % n) + n) % n;
  return p.root + p.scale[k] + 12 * Math.floor(d / n);
}

/** The scale note nearest `midi`. */
export function snapToScale(p: Pick<SoundParams, 'root' | 'scale'>, midi: number): number {
  const rel = midi - p.root;
  const oct = Math.floor(rel / 12);
  let best = p.root;
  for (let o = oct - 1; o <= oct + 1; o++) {
    for (const s of p.scale) {
      const m = p.root + 12 * o + s;
      if (Math.abs(m - midi) < Math.abs(best - midi)) best = m;
    }
  }
  return best;
}

// --- chords from supertiles ---------------------------------------------------

/** One step's tile ancestry: `slots[l]` and `types[l]` of its level-l ancestor (see `ancestorPath`). */
export interface StepAncestry {
  readonly slots: readonly number[];
  readonly types: readonly string[];
}

/**
 * Scale degree per supertile type. Delta, Psi, Phi and Sigma, the commonest
 * children, sit on the root, third, fifth and seventh; the rest on the
 * steps between and above.
 */
export const TYPE_DEGREE: Readonly<Record<string, number>> = {
  Delta: 0,
  Psi: 2,
  Phi: 4,
  Sigma: 6,
  Xi: 1,
  Pi: 3,
  Gamma: 5,
  Theta: 8,
  Lambda: 9,
};

const degreeOf = (type: string): number => TYPE_DEGREE[type] ?? 0;

/** Level of the smallest supertile holding every step's tile. */
export function commonLevel(paths: readonly StepAncestry[]): number {
  if (paths.length === 0) return 0;
  const top = paths[0].slots.length;
  for (let l = top - 1; l >= 0; l--) {
    const s = paths[0].slots[l];
    if (paths.some((p) => p.slots[l] !== s)) return l + 1;
  }
  return 0;
}

/** The distinct level-`level` supertiles the steps pass through, in order of first visit. */
export function spannedAt(paths: readonly StepAncestry[], level: number): { type: string; steps: number }[] {
  const seen = new Map<string, { type: string; steps: number }>();
  for (const p of paths) {
    const key = p.slots.slice(level).join('.');
    const hit = seen.get(key);
    if (hit) hit.steps++;
    else seen.set(key, { type: p.types[level], steps: 1 });
  }
  return [...seen.values()];
}

const CHORD_MAX = 6;

/**
 * A circuit's chord, as MIDI notes low to high. With L the level of the
 * smallest supertile holding the whole circuit:
 * - spanned: that supertile's type in the bass, then the types of the
 *   level-(L-1) supertiles the circuit passes through, and of level L-2 an
 *   octave up while there are fewer than four notes;
 * - path: the ancestors of the first step's tile from level L down to 1,
 *   higher levels lower;
 * - counts: per level from L-1 down, the number of distinct supertiles the
 *   circuit passes through, as a scale degree.
 */
export function circuitChord(paths: readonly StepAncestry[], p: SoundParams): number[] {
  if (paths.length === 0) return [];
  const L = commonLevel(paths);
  const notes: number[] = [];
  if (p.chord === 'spanned') {
    notes.push(scaleNote(p, degreeOf(paths[0].types[L])) - 12);
    for (let lv = L - 1; lv >= 0 && (lv === L - 1 || notes.length < 4); lv--) {
      for (const s of spannedAt(paths, lv)) notes.push(scaleNote(p, degreeOf(s.type)) + 12 * (L - 1 - lv));
    }
  } else if (p.chord === 'path') {
    for (let k = L; k >= 1; k--) notes.push(scaleNote(p, degreeOf(paths[0].types[k])) + 12 * (Math.floor((L - k) / 2) - 1));
  } else {
    for (let lv = L - 1; lv >= 0; lv--) notes.push(scaleNote(p, spannedAt(paths, lv).length - 1) + 12 * (Math.floor((L - 1 - lv) / 2) - 1));
  }
  const out = [...new Set(notes)].sort((a, b) => a - b);
  return out.slice(0, CHORD_MAX);
}

export function chordEvents(midis: readonly number[], p: SoundParams, t = 0): NoteEvent[] {
  const n = midis.length;
  return midis.map((midi, i) => ({
    kind: 'note',
    t,
    dur: p.chordSeconds,
    midi,
    gain: 0.5 / Math.sqrt(Math.max(1, n)),
    pan: n > 1 ? 0.6 * (i / (n - 1) - 0.5) : 0,
    detune: 0,
    attack: 0.08,
    wave: p.wave,
  }));
}

// --- the trace voice ------------------------------------------------------------

/**
 * Where a point sits, 0..1, under the trace mapping:
 * - radius: distance from the circuit's centre, from the nearest point (0) to
 *   the farthest (1), so rotated copies of one arm give one pitch line;
 * - height: up the screen (world y runs down);
 * - width: left to right.
 */
export function positionMap(points: readonly Pt[], mode: Choice<'trace'>): (q: Pt) => number {
  let sx = 0;
  let sy = 0;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const q of points) {
    sx += q.x;
    sy += q.y;
    minX = Math.min(minX, q.x);
    maxX = Math.max(maxX, q.x);
    minY = Math.min(minY, q.y);
    maxY = Math.max(maxY, q.y);
  }
  const clamp = (u: number): number => (Number.isFinite(u) ? Math.max(0, Math.min(1, u)) : 0.5);
  if (mode === 'height') return (q) => clamp((maxY - q.y) / (maxY - minY));
  if (mode === 'width') return (q) => clamp((q.x - minX) / (maxX - minX));
  const c = { x: sx / points.length, y: sy / points.length };
  let near = Infinity;
  let far = 0;
  for (const q of points) {
    const d = Math.hypot(q.x - c.x, q.y - c.y);
    near = Math.min(near, d);
    far = Math.max(far, d);
  }
  return (q) => clamp((Math.hypot(q.x - c.x, q.y - c.y) - near) / (far - near));
}

const wrapAngle = (a: number): number => {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a <= -Math.PI) a += 2 * Math.PI;
  return a;
};

/**
 * The corners of a closed path: points where the heading over the `window`
 * steps after differs from the heading over the `window` steps before by at
 * least `angle` degrees, and by more than at any point within `window` steps.
 * `turn` is in radians, positive anticlockwise on screen (y down).
 */
export function findCorners(points: readonly Pt[], window: number, angle: number): { index: number; turn: number }[] {
  const n = points.length;
  const w = Math.max(1, Math.min(Math.floor(window), Math.floor(n / 3)));
  if (n < 3) return [];
  const at = (i: number): Pt => points[((i % n) + n) % n];
  const turns = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const a = at(i - w);
    const b = at(i);
    const c = at(i + w);
    turns[i] = wrapAngle(Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(b.y - a.y, b.x - a.x));
  }
  const limit = (angle * Math.PI) / 180;
  const out: { index: number; turn: number }[] = [];
  for (let i = 0; i < n; i++) {
    const m = Math.abs(turns[i]);
    if (m < limit) continue;
    let peak = true;
    for (let j = 1; j <= w && peak; j++) {
      // Ties go to the earlier point, so a flat-topped corner counts once.
      if (Math.abs(turns[(i - j + n) % n]) >= m || Math.abs(turns[(i + j) % n]) > m) peak = false;
    }
    if (peak) out.push({ index: i, turn: -turns[i] });
  }
  return out;
}

/** Pitch points per step at most, and in all. */
const SAMPLES_PER_STEP = 4;
const MAX_SAMPLES = 2000;

/**
 * The trace voice for a closed path traced from `points[0]`, one step per
 * `1 / pace` seconds (or the whole loop in `seconds`): pitch from the head's
 * position (`positionMap`) across `low..high`, snapped to the scale when
 * `quantise` is on; at each corner a bend, a filter opening, or a shift of
 * `cornerDepth` semitones up for a left turn and down for a right one that
 * holds until the next corner.
 */
export function traceSweep(points: readonly Pt[], p: SoundParams, seconds?: number): SweepEvent {
  const n = points.length;
  const dur = seconds ?? n / p.pace;
  const dt = dur / n;
  const per = Math.max(1, Math.min(SAMPLES_PER_STEP, Math.floor(MAX_SAMPLES / n)));
  const place = positionMap(points, p.trace);
  const corners = p.corner === 'none' ? [] : findCorners(points, p.cornerWindow, p.cornerAngle);
  const shiftAt = new Map<number, number>();
  if (p.corner === 'shift') for (const c of corners) shiftAt.set(c.index, Math.sign(c.turn) * p.cornerDepth);
  // Before the first corner, the shift left by the last one (the loop comes round).
  let shift = corners.length && p.corner === 'shift' ? Math.sign(corners[corners.length - 1].turn) * p.cornerDepth : 0;
  const pitch: { t: number; midi: number }[] = [];
  const pitchOf = (q: Pt): number => {
    const m = p.low + place(q) * (p.high - p.low) + shift;
    return p.quantise ? snapToScale(p, m) : m;
  };
  for (let k = 0; k < n; k++) {
    shift = shiftAt.get(k) ?? shift;
    const a = points[k];
    const b = points[(k + 1) % n];
    for (let s = 0; s < per; s++) {
      const u = s / per;
      pitch.push({ t: (k + u) * dt, midi: pitchOf({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u }) });
    }
  }
  pitch.push({ t: dur, midi: pitchOf(points[0]) });
  return {
    kind: 'sweep',
    t: 0,
    dur,
    gain: 0.35,
    pan: 0,
    detune: 0,
    wave: p.wave,
    glide: p.glide,
    vibrato: p.vibrato,
    pitch,
    bends: p.corner === 'bend' ? corners.map((c) => ({ t: c.index * dt, semis: Math.sign(c.turn) * p.cornerDepth })) : [],
    filter: p.corner === 'filter' ? corners.map((c) => ({ t: c.index * dt, octaves: p.cornerDepth })) : [],
  };
}

// --- the fill -------------------------------------------------------------------

export interface FillCopy {
  readonly centre: Pt;
  /** Where it is on screen, -1 (left) to 1 (right). */
  readonly pan: number;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seconds a copy's note lasts in a fill. */
const FILL_NOTE = 1.8;
/** Seconds a copy's contour takes. */
const FILL_CONTOUR = 0.9;

/**
 * One copy of a sound per congruent circuit. Onsets, by `fill`:
 * - ripple: by distance from `source`, the farthest at `spread` seconds;
 * - scatter: at random within `spread`;
 * - together: all at once, told apart only by detune and pan.
 * A voiced copy plays the whole chord, its lowest note, or the trace contour
 * squeezed into a short gesture; every copy plays the same thing, so a fill
 * is one sound many times over and never runs up the chord. Every copy gets
 * an onset; when the copies would need more than `voices` oscillators, an
 * even sample of them in onset order is voiced.
 */
export function fillEvents(
  copies: readonly FillCopy[],
  source: Pt,
  chord: readonly number[],
  contour: SweepEvent | null,
  p: SoundParams,
  seed = 1,
): { events: SoundEvent[]; onsets: number[]; voiced: number } {
  const rng = mulberry32(seed);
  const n = copies.length;
  const dist = copies.map((c) => Math.hypot(c.centre.x - source.x, c.centre.y - source.y));
  const far = Math.max(1e-9, ...dist);
  const onsets = copies.map((_, i) => (p.fill === 'ripple' ? (p.spread * dist[i]) / far : p.fill === 'scatter' ? rng() * p.spread : 0));
  const order = copies.map((_, i) => i).sort((a, b) => onsets[a] - onsets[b] || a - b);
  const sound = p.fillSound === 'contour' && contour ? 'contour' : p.fillSound === 'root' || chord.length === 0 ? 'root' : 'chord';
  const perCopy = sound === 'chord' ? chord.length : 1;
  const voiced = Math.max(1, Math.min(n, Math.floor(p.voices / perCopy)));
  const gain = 0.6 / Math.sqrt(voiced * perCopy);
  const events: SoundEvent[] = [];
  for (let j = 0; j < voiced && n > 0; j++) {
    const i = order[Math.floor((j * n) / voiced)];
    const t = onsets[i];
    const detune = (2 * rng() - 1) * p.detune;
    const pan = Math.max(-1, Math.min(1, copies[i].pan));
    if (sound === 'contour' && contour) {
      const k = FILL_CONTOUR / contour.dur;
      events.push({
        ...contour,
        t,
        dur: FILL_CONTOUR,
        gain,
        pan,
        detune,
        glide: Math.min(contour.glide, 0.02),
        pitch: contour.pitch.map((q) => ({ t: q.t * k, midi: q.midi })),
        bends: contour.bends.map((q) => ({ t: q.t * k, semis: q.semis })),
        filter: contour.filter.map((q) => ({ t: q.t * k, octaves: q.octaves })),
      });
      continue;
    }
    const notes = sound === 'chord' ? chord : [chord[0] ?? p.root];
    for (const midi of notes) events.push({ kind: 'note', t, dur: FILL_NOTE, midi, gain, pan, detune, attack: 0.04, wave: p.wave });
  }
  return { events, onsets, voiced: n === 0 ? 0 : voiced };
}

// --- the patch box --------------------------------------------------------------

const NOTE_NAMES: Readonly<Record<string, number>> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };

/** `d3`, `f#4`, `bb2` → MIDI (C4 = 60); null if it is not a note name. */
export function noteNumber(s: string): number | null {
  const m = /^([a-g])(#|b)?(-?\d)$/i.exec(s.trim());
  if (!m) return null;
  return 12 * (Number(m[3]) + 1) + NOTE_NAMES[m[1].toLowerCase()] + (m[2] === '#' ? 1 : m[2] ? -1 : 0);
}

/**
 * Lines of `name = value` (or `name value`, `name: value`) over `base`.
 * Numbers take note names where a MIDI note is meant; `scale` takes a scale
 * name or semitones; `#` starts a comment.
 */
export function parsePatch(text: string, base: SoundParams): { params: SoundParams; applied: string[]; errors: string[] } {
  const params: SoundParams = { ...base, scale: [...base.scale] };
  const applied: string[] = [];
  const errors: string[] = [];
  const set = params as unknown as Record<string, unknown>;
  text.split('\n').forEach((raw, line) => {
    const body = raw.replace(/#.*/, '').trim();
    if (!body) return;
    const m = /^([A-Za-z]+)\s*[=:]?\s*(.*)$/.exec(body);
    const key = m?.[1] ?? '';
    const value = (m?.[2] ?? '').trim();
    const fail = (why: string): void => void errors.push(`line ${line + 1}: ${why}`);
    if (!(key in base)) return fail(`no setting "${key}"`);
    const current = set[key];
    if (key === 'scale') {
      const named = SCALES[value.toLowerCase()];
      const nums = value.split(/[\s,]+/).map(Number);
      if (named) set.scale = [...named];
      else if (nums.length && nums.every((v) => Number.isInteger(v) && v >= 0 && v < 12)) set.scale = [...new Set(nums)].sort((a, b) => a - b);
      else return fail(`scale wants a name (${Object.keys(SCALES).join(', ')}) or semitones 0-11`);
    } else if (typeof current === 'boolean') {
      if (/^(on|true|yes|1)$/i.test(value)) set[key] = true;
      else if (/^(off|false|no|0)$/i.test(value)) set[key] = false;
      else return fail(`${key} wants on or off`);
    } else if (typeof current === 'number') {
      const v = noteNumber(value) ?? Number(value);
      if (!value || !Number.isFinite(v)) return fail(`${key} wants a number`);
      set[key] = v;
    } else {
      const options = (CHOICES as Record<string, readonly string[]>)[key];
      if (!options.includes(value)) return fail(`${key} wants one of ${options.join(', ')}`);
      set[key] = value;
    }
    applied.push(key);
  });
  return { params, applied, errors };
}
