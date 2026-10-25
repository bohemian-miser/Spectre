import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CENTRE_MAP_TTL_MS, centreMapKey, forgetCentreMap, loadCentreMap, saveCentreMap } from '../centreMapCache';

/** A localStorage stand-in that can be made to fill up. */
class FakeStorage {
  map = new Map<string, string>();
  limit = Infinity;
  get length() {
    return this.map.size;
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    const used = [...this.map].reduce((t, [kk, vv]) => t + (kk === k ? 0 : vv.length), 0);
    if (used + v.length > this.limit) throw new Error('QuotaExceededError');
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  clear() {
    this.map.clear();
  }
}

const g = globalThis as { localStorage?: unknown };
let had: unknown;
let store: FakeStorage;
beforeEach(() => {
  had = g.localStorage;
  store = new FakeStorage();
  Object.defineProperty(globalThis, 'localStorage', { value: store, configurable: true, writable: true });
});
afterEach(() => {
  Object.defineProperty(globalThis, 'localStorage', { value: had, configurable: true, writable: true });
});

const result = (n: number, v = 1) => ({
  level: 5,
  counts: Array.from({ length: n }, (_, i) => ({ all: i + 10, inside: i })),
  matrix: Float32Array.from({ length: n * n }, (_, i) => i * 0.5 + v),
  embedding: Float32Array.from({ length: n * 2 }, (_, i) => -i / 3),
});
const settings = { family: 'spectre', level: 5, matchSizes: true, weightBySize: true, rules: [{ subset: [1, 5], combos: ['0000000000', '0000100000'] }] };

describe('saved centre maps', () => {
  it('round-trips a survey exactly and keys it by everything that decides it', () => {
    const key = centreMapKey(settings);
    expect(saveCentreMap(key, result(3), 1000)).toBe(true);
    const back = loadCentreMap(key, 2000)!;
    expect(back.savedAt).toBe(1000);
    expect(back.level).toBe(5);
    expect(back.counts).toEqual(result(3).counts);
    expect([...back.matrix]).toEqual([...result(3).matrix]);
    expect([...back.embedding]).toEqual([...result(3).embedding]);
    for (const other of [
      { ...settings, level: 4 },
      { ...settings, matchSizes: false },
      { ...settings, family: 'hex' },
      { ...settings, rules: [{ subset: [1, 5], combos: ['0000000000'] }] },
    ]) {
      expect(centreMapKey(other)).not.toBe(key);
    }
    expect(centreMapKey({ ...settings })).toBe(key);
  });

  it('forgets a survey after 30 days, or when asked', () => {
    const key = centreMapKey(settings);
    saveCentreMap(key, result(2), 0);
    expect(loadCentreMap(key, CENTRE_MAP_TTL_MS - 1)).not.toBeNull();
    expect(loadCentreMap(key, CENTRE_MAP_TTL_MS + 1)).toBeNull();
    expect(store.getItem(key)).toBeNull();
    saveCentreMap(key, result(2), 0);
    forgetCentreMap(key);
    expect(loadCentreMap(key, 1)).toBeNull();
  });

  it('makes room by dropping the oldest saved survey, and gives up quietly when it cannot', () => {
    const a = centreMapKey({ ...settings, level: 3 });
    const b = centreMapKey({ ...settings, level: 4 });
    const c = centreMapKey(settings);
    saveCentreMap(a, result(20), 1);
    saveCentreMap(b, result(20), 2);
    store.limit = store.getItem(a)!.length * 2 + 10;
    expect(saveCentreMap(c, result(20), 3)).toBe(true);
    expect(store.getItem(a)).toBeNull();
    expect(store.getItem(b)).not.toBeNull();
    store.limit = 10;
    expect(saveCentreMap(c, result(20), 4)).toBe(false);
  });

  it('does nothing without storage', () => {
    Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true, writable: true });
    expect(saveCentreMap('k', result(2))).toBe(false);
    expect(loadCentreMap('k')).toBeNull();
  });
});
