import { describe, expect, it } from 'vitest';
import { reelDefaults, loadWorld } from '../../reel/director';
import { DEFAULT_PARAMS, tileNoteEvents, traceSweep } from '../score';
import { circuitSteps } from '../steps';
import {
  EMPTY_TILE_SOUNDS,
  applyMod,
  presets,
  readTileSounds,
  stepActions,
  stepKeys,
  withAssignment,
  ZERO_STATE,
  type StepEdges,
} from '../tileSounds';

const step = (type: string, entry: string, exit: string, entryClass: number, exitClass: number): StepEdges => ({ type, entry, exit, entryClass, exitClass });

describe('tile sounds', () => {
  it('matches a step from the whole tile down to its line', () => {
    expect(stepKeys(step('Pi', '-8A', '-2A', 8, 2))).toEqual(['tile', 'class:8', 'classes:8>2', 'edge:-8A', 'chord:-2A|-8A']);
  });

  it('sets, adds and toggles', () => {
    let s = applyMod(ZERO_STATE, { target: 'trace', mode: 'add', amount: 3 });
    s = applyMod(s, { target: 'trace', mode: 'add', amount: 3 });
    expect(s.trace).toBe(6);
    expect(applyMod(s, { target: 'trace', mode: 'set', amount: -1 }).trace).toBe(-1);
    const on = applyMod(ZERO_STATE, { target: 'pan', mode: 'toggle', amount: 0.5 });
    expect(on.pan).toBe(0.5);
    expect(applyMod(on, { target: 'pan', mode: 'toggle', amount: 0.5 }).pan).toBe(0);
  });

  it('changes nothing until something is assigned, then carries changes along the steps', () => {
    const steps = [step('Pi', '-8A', '-2A', 8, 2), step('Psi', '0A', '-2A', 0, 2), step('Pi', '-2A', '-8A', 2, 8)];
    const none = stepActions(steps, EMPTY_TILE_SOUNDS);
    expect(none.notes).toEqual([]);
    for (const s of none.states) expect(s).toEqual(ZERO_STATE);

    let map = withAssignment(EMPTY_TILE_SOUNDS, 'Pi', 'tile', { note: { instrument: 'pluck', degree: 2, velocity: 0.5 } });
    map = withAssignment(map, '*', 'class:0', { mod: { target: 'trace', mode: 'toggle', amount: 12 } });
    map = withAssignment(map, 'Pi', 'chord:-2A|-8A', { mod: { target: 'pan', mode: 'add', amount: 0.25 } });
    const { states, notes } = stepActions(steps, map);
    expect(notes.map((n) => n.step)).toEqual([0, 2]);
    expect(states.map((s) => s.trace)).toEqual([0, 12, 12]);
    expect(states.map((s) => s.pan)).toEqual([0.25, 0.25, 0.5]);
  });

  it('moves the trace voice and plays notes by the states', () => {
    const pts = Array.from({ length: 12 }, (_, k) => ({ x: Math.cos((k * Math.PI) / 6), y: Math.sin((k * Math.PI) / 6) }));
    const p = { ...DEFAULT_PARAMS, quantise: false, corner: 'none' as const };
    const states = pts.map((_, k) => ({ ...ZERO_STATE, trace: k < 6 ? 0 : 12, pan: k < 6 ? 0 : 0.5 }));
    const plain = traceSweep(pts, p);
    const moved = traceSweep(pts, p, undefined, states);
    expect(moved.pitch[0].midi).toBeCloseTo(plain.pitch[0].midi, 9);
    expect(moved.pitch[30].midi).toBeCloseTo(plain.pitch[30].midi + 12, 9);
    expect(moved.controls?.map((c) => c.pan)).toEqual([0, 0.5]);
    const notes = tileNoteEvents([{ step: 3, note: { instrument: 'bell', degree: 2, velocity: 1 }, state: { ...ZERO_STATE, pitch: 1 } }], p, 0.1);
    expect(notes[0].t).toBeCloseTo(0.3, 9);
    expect(notes[0].midi).toBe(DEFAULT_PARAMS.root + 3 + 1);
  });

  it('reads back what it writes and skips what it cannot read', () => {
    const map = presets(['Delta', 'Gamma'], [0, 2, 8])[1].map;
    expect(readTileSounds(JSON.parse(JSON.stringify(map)))).toEqual(map);
    const read = readTileSounds({ tiles: { Pi: { tile: { note: { instrument: 'kazoo', degree: 1, velocity: 1 } }, 'edge:1A': { mod: { target: 'pan', mode: 'set', amount: 1 } } } } });
    expect(Object.keys(read.tiles.Pi)).toEqual(['edge:1A']);
    expect(() => readTileSounds({})).toThrow();
  });
});

describe('circuit steps', () => {
  it('leave each tile by the class the next one is entered by', () => {
    const d = reelDefaults('hex');
    const world = loadWorld({ ...d, radius: 30, seed: 1, family: 'hex', seconds: 0, circuits: 0, fps: 30, bpm: 110, width: 1, height: 1 });
    expect(world.circuits.length).toBeGreaterThan(5);
    for (const c of world.circuits.slice(0, 20)) {
      const steps = circuitSteps(world, 'hex', d.subset, c);
      expect(steps).toHaveLength(c.points.length);
      steps.forEach((s, k) => {
        const next = steps[(k + 1) % steps.length];
        expect(next.entryClass).toBe(s.exitClass);
        expect(s.entry).not.toBe(s.exit);
      });
    }
  });
});
