/**
 * Knock: as the trace head moves, each lit circuit it passes sounds once
 * with its own instrument. The rules are the offline synth's
 * (social/music-circuits.md, "Knock"), so the page and the videos agree:
 *
 * - The head is at the end of each step. A lit circuit with a path point
 *   within `reach` (1.5 world units, about a tile) of it knocks, on the
 *   nearest 16th, once per pass: it must leave reach before it can again.
 * - Level 0.45 + 0.4 × (1 − distance / reach); pan (centre x − head x) / 4,
 *   within ±0.8; at most 6 knocks share a 16th, each at 1/√count.
 * - Brightness: low-pass at 1 kHz × 2^(distance from the origin / 12), at
 *   most 16 kHz.
 * - Nested: a knocked circuit also knocks up to 4 lit circuits whose
 *   centres lie inside it, nearest the head first, one 16th later each, at
 *   half the level.
 *
 * A circuit's instrument comes from its number of steps n: up to 40 a drum
 * (3 corners a snare, 4 to 6 a tom, 7 or more a hat; tone 520 Hz / size^0.6,
 * ring 0.05 s × √size), up to 250 a pluck, up to 1000 a drop (a sub sweep
 * from 120 Hz to 34 Hz over 0.8 s × √(n / 250), at most 3 s, with a bass
 * note), above that the chord. Corners are steps turning by more than 30°;
 * size is the square root of the area enclosed. Here the pluck and chords
 * take their notes from the circuit's own supertile chord, and the 16ths
 * are straight.
 */

import type { Pt } from '../../core';
import type { SoundEvent, SoundParams } from './score';

export const KNOCKS_PER_SLOT = 6;
export const NESTED_MAX = 4;
const UNITS_PER_OCTAVE = 12;

export interface KnockCircuit {
  readonly key: string;
  /** Closed path, one point per step. */
  readonly points: readonly Pt[];
  readonly centre: Pt;
  readonly min: Pt;
  readonly max: Pt;
  /** Its supertile chord, MIDI, low to high. */
  readonly chord: readonly number[];
}

export interface CircuitMeasures {
  readonly n: number;
  readonly corners: number;
  readonly size: number;
  readonly distance: number;
}

export function measure(c: Pick<KnockCircuit, 'points' | 'centre'>): CircuitMeasures {
  const pts = c.points;
  const n = pts.length;
  let corners = 0;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const a = pts[(i + n - 1) % n];
    const b = pts[i];
    const d = pts[(i + 1) % n];
    let turn = Math.atan2(d.y - b.y, d.x - b.x) - Math.atan2(b.y - a.y, b.x - a.x);
    while (turn > Math.PI) turn -= 2 * Math.PI;
    while (turn <= -Math.PI) turn += 2 * Math.PI;
    if (Math.abs(turn) > Math.PI / 6) corners++;
    area += b.x * d.y - d.x * b.y;
  }
  return { n, corners, size: Math.sqrt(Math.abs(area) / 2), distance: Math.hypot(c.centre.x, c.centre.y) };
}

export const cutoffOf = (distance: number): number => Math.min(16000, 1000 * 2 ** (distance / UNITS_PER_OCTAVE));

const ftom = (f: number): number => 69 + 12 * Math.log2(f / 440);

/** A circuit's own sound at `t`, by its measures (see the module note). */
export function circuitVoice(c: KnockCircuit, m: CircuitMeasures, t: number, vel: number, pan: number, p: SoundParams): SoundEvent[] {
  const cutoff = cutoffOf(m.distance);
  const chord = c.chord.length ? c.chord : [p.root];
  if (m.n <= 40) {
    const drum = m.corners >= 7 ? 'hat' : m.corners >= 4 ? 'tom' : 'snare';
    return [{ kind: 'hit', t, drum, tone: 520 / Math.max(1, m.size) ** 0.6, ring: 0.05 * Math.sqrt(m.size), gain: 0.6 * vel, pan, cutoff }];
  }
  const note = (midi: number, dur: number, gain: number, instrument: 'pluck' | 'soft'): SoundEvent => ({
    kind: 'note',
    t,
    dur,
    midi,
    gain,
    pan,
    detune: 0,
    attack: instrument === 'pluck' ? 0.005 : 0.04,
    wave: instrument === 'pluck' ? 'triangle' : 'sine',
    instrument,
    cutoff,
  });
  if (m.n <= 250) return [note(chord[m.corners % chord.length] + 12, 0.4, 0.45 * vel, 'pluck')];
  if (m.n <= 1000) {
    const dur = Math.min(3, 0.8 * Math.sqrt(m.n / 250));
    return [
      {
        kind: 'sweep',
        t,
        dur,
        gain: 0.5 * vel,
        pan,
        detune: 0,
        wave: 'sine',
        glide: dur,
        vibrato: 0,
        pitch: [
          { t: 0, midi: ftom(120) },
          { t: 0.001, midi: ftom(34) },
        ],
        bends: [],
        filter: [],
      },
      note(chord[0] - 12, 0.6, 0.35 * vel, 'soft'),
    ];
  }
  return chord.map((midi) => note(midi, 1.2, (0.4 * vel) / Math.sqrt(chord.length), 'soft'));
}

function inside(q: Pt, pts: readonly Pt[]): boolean {
  let hit = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i];
    const b = pts[j];
    if (a.y > q.y !== b.y > q.y && q.x < ((b.x - a.x) * (q.y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
}

/**
 * The knocks of one trace: `path` is the traced path (closed or open),
 * `steps` its number of steps, `dt` seconds per step, `lit` the circuits
 * that can be knocked. Returns the events and when each circuit knocks.
 */
export function knockEvents(
  path: readonly Pt[],
  steps: number,
  dt: number,
  lit: readonly KnockCircuit[],
  p: SoundParams,
): { events: SoundEvent[]; hits: { key: string; t: number }[] } {
  const reach = p.reach;
  const six = 60 / p.bpm / 4;
  const cell = (v: number): number => Math.floor(v / reach);
  const grid = new Map<string, [number, Pt][]>();
  lit.forEach((c, i) => {
    for (const q of c.points) {
      const k = `${cell(q.x)},${cell(q.y)}`;
      const l = grid.get(k);
      if (l) l.push([i, q]);
      else grid.set(k, [[i, q]]);
    }
  });
  const measures = lit.map(measure);
  const nestedIn = p.nested
    ? lit.map((c) =>
        lit
          .map((d, j) => ({ d, j }))
          .filter(({ d }) => d !== c && d.min.x >= c.min.x && d.max.x <= c.max.x && d.min.y >= c.min.y && d.max.y <= c.max.y && inside(d.centre, c.points))
          .map(({ j }) => j),
      )
    : [];
  const bySlot = new Map<number, { i: number; vel: number; head: Pt }[]>();
  const add = (slot: number, k: { i: number; vel: number; head: Pt }): void => {
    const l = bySlot.get(slot);
    if (l) l.push(k);
    else bySlot.set(slot, [k]);
  };
  let wasNear = new Set<number>();
  for (let k = 0; k < steps; k++) {
    const head = path[(k + 1) % path.length];
    const best = new Map<number, number>();
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (const [i, q] of grid.get(`${cell(head.x) + dx},${cell(head.y) + dy}`) ?? []) {
          const d = Math.hypot(q.x - head.x, q.y - head.y);
          if (d <= reach && d < (best.get(i) ?? Infinity)) best.set(i, d);
        }
      }
    }
    const slot = Math.round(((k + 1) * dt) / six);
    for (const [i, d] of best) {
      if (wasNear.has(i)) continue;
      const vel = 0.45 + 0.4 * (1 - d / reach);
      add(slot, { i, vel, head });
      if (p.nested) {
        const inner = [...nestedIn[i]].sort(
          (a, b) => Math.hypot(lit[a].centre.x - head.x, lit[a].centre.y - head.y) - Math.hypot(lit[b].centre.x - head.x, lit[b].centre.y - head.y),
        );
        inner.slice(0, NESTED_MAX).forEach((j, n) => add(slot + 1 + n, { i: j, vel: 0.5 * vel, head }));
      }
    }
    wasNear = new Set(best.keys());
  }
  const events: SoundEvent[] = [];
  const hits: { key: string; t: number }[] = [];
  for (const [slot, ks] of [...bySlot].sort((a, b) => a[0] - b[0])) {
    const kept = ks.sort((a, b) => b.vel - a.vel).slice(0, KNOCKS_PER_SLOT);
    const level = 1 / Math.sqrt(kept.length);
    const t = slot * six;
    for (const { i, vel, head } of kept) {
      const c = lit[i];
      const pan = Math.max(-0.8, Math.min(0.8, (c.centre.x - head.x) / 4));
      events.push(...circuitVoice(c, measures[i], t, vel * level, pan, p));
      hits.push({ key: c.key, t });
    }
  }
  return { events, hits };
}
