import { describe, expect, it } from 'vitest';
import { cardLaps, timelineSeconds } from '../card';
import { decodeHash, encodeHash, type HashState } from '../hash';
import { DEFAULT_SETTINGS } from '../render';

const base: HashState = { family: 'hex', subset: [0, 2, 3, 4, 6, 8], combo: '000000000', circuit: null, brush: { mode: 'spectrum', play: 'loop', settings: DEFAULT_SETTINGS } };

describe('hash', () => {
  it('reads the link the card was asked for', () => {
    const s = decodeHash('#family=hex&edges=01234568&combo=310021340&steps=429&mode=spectrum&play=loop&spectrum.f0=62&spectrum.terms=42&spectrum.pen=0', base);
    expect(s.subset).toEqual([0, 1, 2, 3, 4, 5, 6, 8]);
    expect(s.combo).toBe('310021340');
    expect(s.circuit).toEqual({ key: null, steps: 429 });
    expect(s.brush.settings.spectrum).toEqual({ ...DEFAULT_SETTINGS.spectrum, f0: 62, terms: 42, pen: false });
    expect(s.brush.settings.corners).toEqual(DEFAULT_SETTINGS.corners);
  });

  it('round-trips every setting', () => {
    const s: HashState = {
      family: 'hex',
      subset: [0, 1, 2, 3, 4, 5, 6, 8],
      combo: '310021340',
      circuit: { key: 'c812', steps: 429 },
      brush: {
        mode: 'corners',
        play: 'constant',
        settings: {
          spectrum: { f0: 62, terms: 42, pen: true, penSpeed: 1234.5, penLevel: 0.3, penRate: 1000, penFrom: 0, penMax: 40000, penHold: 2 },
          radius: { f0: 110, range: 2.25, lap: 7.5 },
          corners: { tolerance: 3.4567, root: 52, lap: 9 },
        },
      },
    };
    expect(decodeHash(`#${encodeHash(s)}`, base)).toEqual(s);
  });

  it('keeps values to the sliders\' ranges', () => {
    const s = decodeHash('#radius.range=500&radius.lap=0.01&spectrum.terms=99', base);
    expect(s.brush.settings.radius.range).toBe(100);
    expect(s.brush.settings.radius.lap).toBe(0.1);
    expect(s.brush.settings.spectrum.terms).toBe(48);
  });

  it('keeps the fallback for what a hash leaves out', () => {
    expect(decodeHash('', base)).toEqual(base);
  });
});

describe('card length', () => {
  it('is at least three laps and 15 seconds', () => {
    expect(cardLaps(5)).toBe(3);
    expect(cardLaps(2)).toBe(8);
    expect(cardLaps(7.5)).toBe(3);
    expect(cardLaps(4)).toBe(4);
  });
});

describe('timeline cards', () => {
  it('run for the terms, the ramp and the hold', () => {
    const settings = { ...DEFAULT_SETTINGS, spectrum: { ...DEFAULT_SETTINGS.spectrum, pen: true, penRate: 1000, penFrom: 0, penMax: 40000, penHold: 2 } };
    expect(timelineSeconds({ mapping: 'spectrum', play: 'loop', settings })).toBeCloseTo(2 + 40 + 2, 9);
    expect(timelineSeconds({ mapping: 'spectrum', play: 'loop', settings: DEFAULT_SETTINGS })).toBeNull();
  });
});
