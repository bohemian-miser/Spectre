import { describe, expect, it } from 'vitest';
import type { Pt } from '../../../core';
import { findTableOf, forEachChord } from '../../map/findPass';
import { loadWorld, reelDefaults } from '../../reel/director';
import { KNOCKS_PER_SLOT, cutoffOf, knockEvents, measure, type KnockCircuit } from '../knock';
import { DEFAULT_PARAMS, type HitEvent } from '../score';
import { circuitSteps } from '../steps';
import { strandFinder } from '../strands';

/** A small triangle (a drum: 3 corners) centred on `c`. */
function triangle(key: string, c: Pt, r = 0.5): KnockCircuit {
  const points = [0, 1, 2].map((k) => ({ x: c.x + r * Math.cos((2 * Math.PI * k) / 3), y: c.y + r * Math.sin((2 * Math.PI * k) / 3) }));
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return { key, points, centre: c, min: { x: Math.min(...xs), y: Math.min(...ys) }, max: { x: Math.max(...xs), y: Math.max(...ys) }, chord: [50, 57] };
}

/** A straight path along y = 0, one unit a step. */
const line = (n: number): Pt[] => Array.from({ length: n + 1 }, (_, k) => ({ x: k, y: 0 }));

const P = { ...DEFAULT_PARAMS, knock: true, bpm: 120 };

describe('knock', () => {
  it('measures a triangle as a drum with three corners', () => {
    const m = measure(triangle('a', { x: 0, y: 0 }));
    expect(m).toMatchObject({ n: 3, corners: 3 });
    expect(m.size).toBeGreaterThan(0);
    expect(cutoffOf(12)).toBeCloseTo(2000, 6);
    expect(cutoffOf(1000)).toBe(16000);
  });

  it('knocks once per pass, louder nearer, panned to its side, on a 16th', () => {
    const path = line(10);
    const near = triangle('near', { x: 5, y: 1 }); // nearest point 0.5 from the head
    const { events, hits } = knockEvents(path, 10, 0.1, [near], P);
    expect(hits).toHaveLength(1);
    const six = 60 / P.bpm / 4;
    expect(hits[0].t / six).toBeCloseTo(Math.round(hits[0].t / six), 9);
    const e = events[0] as HitEvent;
    expect(e.kind).toBe('hit');
    expect(e.drum).toBe('snare');
    // Out of reach, it never sounds.
    expect(knockEvents(path, 10, 0.1, [triangle('far', { x: 5, y: 3 })], P).hits).toHaveLength(0);
    // Off to the right of the head it pans right.
    const right = knockEvents([{ x: 0, y: 0 }, { x: 0, y: 1 }], 1, 0.1, [triangle('r', { x: 1, y: 1 }, 0.3)], P);
    expect((right.events[0] as HitEvent).pan).toBeGreaterThan(0);
  });

  it('sounds again only after leaving reach', () => {
    // Out along the line, back and out again: two passes.
    const path = [...line(4), { x: 3, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 0 }, { x: -1, y: 0 }, { x: -2, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 0 }];
    const c = triangle('c', { x: 2, y: 1 });
    expect(knockEvents(path, path.length - 1, 0.25, [c], P).hits).toHaveLength(2);
  });

  it('keeps at most six knocks to a 16th, and knocks nested circuits a 16th later', () => {
    const many = Array.from({ length: 10 }, (_, i) => triangle(`m${i}`, { x: 5 + 0.05 * i, y: 1 }, 0.5));
    expect(knockEvents(line(10), 10, 0.01, many, P).hits.length).toBeLessThanOrEqual(KNOCKS_PER_SLOT * 2);
    const outer = triangle('outer', { x: 5, y: 2 }, 1.8);
    const inner = triangle('inner', { x: 5, y: 3 }, 0.2);
    const six = 60 / P.bpm / 4;
    const plain = knockEvents(line(10), 10, 0.1, [outer, inner], P);
    expect(plain.hits.map((h) => h.key)).toEqual(['outer']);
    const nested = knockEvents(line(10), 10, 0.1, [outer, inner], { ...P, nested: true });
    const t = (key: string) => nested.hits.find((h) => h.key === key)!.t;
    expect(t('inner') - t('outer')).toBeCloseTo(six, 9);
  });
});

describe('strands', () => {
  const d = reelDefaults('hex');
  const world = loadWorld({ ...d, radius: 30, seed: 1, family: 'hex', seconds: 0, circuits: 0, fps: 30, bpm: 110, width: 1, height: 1 });
  const find = strandFinder(world.cut, findTableOf(world.table), world.circuits);

  it('finds the circuit a clicked chord belongs to', () => {
    const c = world.circuits[3];
    const a = c.points[0];
    const b = c.points[1];
    const s = find({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, 0.05)!;
    expect(s.key).toBe(`c${c.id}`);
    expect(s.closed).toBe(true);
  });

  it('follows an open strand to where it leaves the loaded tiles', () => {
    const inCircuit = new Set(world.circuits.flatMap((c) => Array.from(c.tiles, (t, k) => t * 64 + c.chords[k])));
    let mid: Pt | null = null;
    forEachChord(world.cut, findTableOf(world.table), (i, s, ax, ay, bx, by) => {
      if (!mid && !inCircuit.has(i * 64 + s)) mid = { x: (ax + bx) / 2, y: (ay + by) / 2 };
    });
    const s = find(mid!, 0.01)!;
    expect(s.closed).toBe(false);
    expect(s.points).toHaveLength(s.tiles.length + 1);
    const steps = circuitSteps(world, 'hex', d.subset, s);
    for (let k = 0; k + 1 < steps.length; k++) expect(steps[k + 1].entryClass).toBe(steps[k].exitClass);
    expect(find({ x: 1e6, y: 1e6 }, 0.1)).toBeNull();
  });
});
