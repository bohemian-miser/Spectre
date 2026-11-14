import { describe, expect, it } from 'vitest';
import type { Pt } from '../../../core';
import {
  DEFAULT_PARAMS,
  circuitChord,
  commonLevel,
  fillEvents,
  findCorners,
  noteNumber,
  parsePatch,
  snapToScale,
  spannedAt,
  traceSweep,
  type NoteEvent,
  type SoundParams,
  type StepAncestry,
} from '../score';

const P: SoundParams = { ...DEFAULT_PARAMS, quantise: false };

/** A closed polygon through `corners`, `per` points per side. */
function polygon(corners: readonly Pt[], per: number): Pt[] {
  const out: Pt[] = [];
  corners.forEach((a, i) => {
    const b = corners[(i + 1) % corners.length];
    for (let k = 0; k < per; k++) out.push({ x: a.x + ((b.x - a.x) * k) / per, y: a.y + ((b.y - a.y) * k) / per });
  });
  return out;
}

const triangle = (per: number): Pt[] =>
  polygon([0, 1, 2].map((k) => ({ x: 10 * Math.cos((2 * Math.PI * k) / 3), y: 10 * Math.sin((2 * Math.PI * k) / 3) })), per);

describe('supertile chords', () => {
  // Three steps under one level-2 Phi: two in a level-1 Delta, one in a level-1 Psi.
  const paths: StepAncestry[] = [
    { slots: [0, 3, 1], types: ['Xi', 'Delta', 'Phi', 'Gamma'] },
    { slots: [1, 3, 1], types: ['Delta', 'Delta', 'Phi', 'Gamma'] },
    { slots: [0, 4, 1], types: ['Psi', 'Psi', 'Phi', 'Gamma'] },
  ];

  it('finds the smallest supertile holding the circuit and what it spans', () => {
    expect(commonLevel(paths)).toBe(2);
    expect(spannedAt(paths, 1)).toEqual([
      { type: 'Delta', steps: 2 },
      { type: 'Psi', steps: 1 },
    ]);
    expect(spannedAt(paths, 0)).toHaveLength(3);
  });

  it('voices the spanned supertiles over the common one', () => {
    // D dorian from D3: Phi is degree 4 (A2 in the bass); level 1 gives Delta
    // (D3) and Psi (F3); that is under four notes, so level 0 adds Xi, Delta
    // and Psi an octave up (E4, D4, F4).
    expect(circuitChord(paths, P)).toEqual([45, 50, 53, 62, 64, 65]);
  });

  it('gives every mapping a chord in the scale', () => {
    for (const chord of ['spanned', 'path', 'counts'] as const) {
      const notes = circuitChord(paths, { ...P, chord });
      expect(notes.length).toBeGreaterThan(0);
      for (const m of notes) expect(snapToScale(P, m)).toBe(m);
    }
  });
});

describe('trace voice', () => {
  it('finds the three corners of a triangle and nothing on its sides', () => {
    const pts = triangle(12);
    const corners = findCorners(pts, 3, 50);
    expect(corners.map((c) => c.index)).toEqual([0, 12, 24]);
    // The triangle runs anticlockwise in maths axes, so clockwise on a y-down screen: right turns.
    for (const c of corners) expect(c.turn).toBeLessThan(0);
  });

  it('plays the three arms of a triangle alike when pitch follows the radius', () => {
    const sweep = traceSweep(triangle(12), { ...P, corner: 'none' });
    const third = (sweep.pitch.length - 1) / 3;
    for (let i = 0; i < third; i++) {
      expect(sweep.pitch[i + third].midi).toBeCloseTo(sweep.pitch[i].midi, 6);
      expect(sweep.pitch[i + 2 * third].midi).toBeCloseTo(sweep.pitch[i].midi, 6);
    }
    expect(Math.max(...sweep.pitch.map((q) => q.midi))).toBeCloseTo(P.high, 6);
    expect(Math.min(...sweep.pitch.map((q) => q.midi))).toBeCloseTo(P.low, 6);
  });

  it('takes one step per 1/pace seconds and snaps to the scale when asked', () => {
    const pts = triangle(10);
    const sweep = traceSweep(pts, { ...P, pace: 15, quantise: true });
    expect(sweep.dur).toBeCloseTo(30 / 15, 9);
    for (const q of sweep.pitch) expect(snapToScale(P, q.midi)).toBe(q.midi);
    expect(sweep.bends).toHaveLength(3);
    expect(sweep.bends[1].t).toBeCloseTo(10 / 15, 9);
  });

  it('shifts the pitch from one corner to the next', () => {
    const flat = traceSweep(triangle(12), { ...P, corner: 'none' });
    const shifted = traceSweep(triangle(12), { ...P, corner: 'shift', cornerDepth: 3 });
    // Every corner turns right, so the whole loop sits 3 semitones down.
    shifted.pitch.forEach((q, i) => expect(q.midi).toBeCloseTo(flat.pitch[i].midi - 3, 6));
  });
});

describe('fill', () => {
  const copies = Array.from({ length: 50 }, (_, i) => ({ centre: { x: i + 1, y: 0 }, pan: i / 25 - 1 }));

  it('ripples out from the source, the farthest copy at the spread', () => {
    const { onsets } = fillEvents(copies, { x: 0, y: 0 }, [50, 57], null, { ...P, fill: 'ripple', spread: 2 });
    expect(onsets[49]).toBeCloseTo(2, 9);
    for (let i = 1; i < onsets.length; i++) expect(onsets[i]).toBeGreaterThan(onsets[i - 1]);
  });

  it('voices at most the cap, sampled across the copies', () => {
    const { events, voiced } = fillEvents(copies, { x: 0, y: 0 }, [50, 57, 62], null, { ...P, voices: 30 });
    expect(voiced).toBe(10);
    expect(events).toHaveLength(30);
    const ts = (events as NoteEvent[]).map((e) => e.t);
    expect(Math.max(...ts) - Math.min(...ts)).toBeGreaterThan(1);
  });

  it('plays the same chord for every copy, so a fill never runs up it', () => {
    const { events } = fillEvents(copies.slice(0, 4), { x: 0, y: 0 }, [50, 57, 62], null, { ...P, voices: 32 });
    expect(events).toHaveLength(12);
    const byOnset = new Map<number, number[]>();
    for (const e of events as NoteEvent[]) byOnset.set(e.t, [...(byOnset.get(e.t) ?? []), e.midi]);
    for (const notes of byOnset.values()) expect(notes).toEqual([50, 57, 62]);
  });

  it('squeezes the contour into each copy', () => {
    const contour = traceSweep(triangle(12), P);
    const { events } = fillEvents(copies.slice(0, 3), { x: 0, y: 0 }, [50], contour, { ...P, fillSound: 'contour', fill: 'together' });
    expect(events).toHaveLength(3);
    for (const e of events) {
      expect(e.kind).toBe('sweep');
      expect(e.t).toBe(0);
    }
  });
});

describe('patch', () => {
  it('overrides settings and reports bad lines', () => {
    const { params, applied, errors } = parsePatch('root = d3\nscale pentatonic\nquantise: off\ncorner = wobble\n# a comment\nnope 3\nhigh 90', P);
    expect(params.root).toBe(50);
    expect(params.scale).toEqual([0, 3, 5, 7, 10]);
    expect(params.quantise).toBe(false);
    expect(params.high).toBe(90);
    expect(params.corner).toBe(P.corner);
    expect(applied).toEqual(['root', 'scale', 'quantise', 'high']);
    expect(errors).toHaveLength(2);
  });

  it('reads note names and semitone lists', () => {
    expect(noteNumber('c4')).toBe(60);
    expect(noteNumber('f#3')).toBe(54);
    expect(noteNumber('bb2')).toBe(46);
    expect(parsePatch('scale = 0, 7, 2', P).params.scale).toEqual([0, 2, 7]);
  });
});
