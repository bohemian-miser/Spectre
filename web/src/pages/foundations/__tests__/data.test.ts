/**
 * Loading the page's data past a stale copy the browser holds, and choosing
 * a rule's precomputed data over a live analysis whenever it has some.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LIVE_LEVEL, loadCombo, loadLines, loadPrecomputed, sourceOf } from '../data';
import { indexLine, lineRow, marksOf, type PageIndex } from '../pageData';

const dir = (rule: string): string => resolve(__dirname, `../../../../public/data/foundations/hex-${rule}`);

const fresh = { found: [[0, 3, 60, '147', 6, 9, 9, 0, 1, 1]], harm: [[5, 6, 14679, 1, 1, 1, 1, 1, 32]], tails: [1] };
const stale = { found: [[0, 3, 60, '147', 6, 9, 9]] };
// harmonic rows without the place drawn
const staleHarm = { ...fresh, harm: [[5, 6, 14679, 1, 1, 1, 1, 1]] };

describe('loading the data', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('revalidates, and reads a stale combination file once more past the cache', async () => {
    const calls: RequestCache[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit) => {
        calls.push(init.cache!);
        return new Response(JSON.stringify(init.cache === 'reload' ? fresh : stale));
      }),
    );
    expect(await loadCombo('/', '140000001')).toEqual(fresh);
    expect(calls).toEqual(['no-cache', 'reload']);
  });

  it('reads a file whose harmonic rows have no place once more past the cache', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => new Response(JSON.stringify(init.cache === 'reload' ? fresh : staleHarm))));
    expect(await loadCombo('/', '140000001')).toEqual(fresh);
  });

  it('says so when the file is still old', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(stale))));
    await expect(loadCombo('/', '140000001')).rejects.toThrow(/older format/);
  });

  it('has no precomputed data for a rule with no index, nor when the server answers the index with a page', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })));
    expect(await loadPrecomputed('/', '01346')).toBeNull();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<!DOCTYPE html><html></html>', { headers: { 'content-type': 'text/html' } })));
    expect(await loadPrecomputed('/', '01346')).toBeNull();
  });
});

describe('choosing precomputed or live', () => {
  afterEach(() => vi.unstubAllGlobals());
  const index = JSON.parse(readFileSync(resolve(dir('258'), 'index.json'), 'utf8')) as PageIndex;

  /** Serves the committed files under `/data/foundations/`, and nothing else. */
  const serve = (): void => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        const m = /\/data\/foundations\/hex-(\w+)\/([\w.]+)$/.exec(url);
        const file = m && resolve(dir(m[1]), m[2]);
        return file && existsSync(file) ? new Response(readFileSync(file, 'utf8')) : new Response('', { status: 404 });
      }),
    );
  };

  it("reads a rule's precomputed index whenever it has one, at its level", async () => {
    serve();
    const pre = await loadPrecomputed('/Spectre/', '258');
    expect(pre).toEqual({ kind: 'files', level: 8, index });
    expect(sourceOf(pre, null)).toEqual({ level: 8, list: true, combo: true });
    expect(sourceOf(pre, 8)).toEqual({ level: 8, list: true, combo: true });
    expect(await loadCombo('/Spectre/', index.combos[0].combo, undefined, '258')).toEqual(
      JSON.parse(readFileSync(resolve(dir('258'), `${index.combos[0].combo}.json`), 'utf8')),
    );
  });

  it('analyses live at another level, or for a rule with no data', async () => {
    serve();
    const pre = await loadPrecomputed('/Spectre/', '258');
    expect(sourceOf(pre, 9)).toEqual({ level: 9, list: false, combo: false });
    expect(sourceOf(null, null)).toEqual({ level: LIVE_LEVEL, list: false, combo: false });
    expect(sourceOf(null, 5)).toEqual({ level: 5, list: false, combo: false });
  });

  it('lists a rule written as index lines from them, and analyses the combination shown live', async () => {
    const rows = index.combos;
    const text = rows.map(indexLine).join('\n') + '\n';
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.endsWith('index.json')
          ? new Response(JSON.stringify({ rule: '258', format: 'lines', levels: 8, shards: { 0: rows.length } }))
          : url.endsWith('/0.txt')
            ? new Response(text)
            : new Response('', { status: 404 }),
      ),
    );
    const pre = await loadPrecomputed('/', '258');
    expect(pre).toEqual({ kind: 'lines', level: 8, shards: { 0: rows.length } });
    expect(sourceOf(pre, null)).toEqual({ level: 8, list: true, combo: false });
    const read = await loadLines('/', '258', '0', 8);
    // a line keeps every field the list shows, and each mark
    expect(read.map((r) => [r.combo, r.levels, r.floor, r.settled, r.lastNew, r.found, r.nuggets, r.largest, r.monsters, r.limit])).toEqual(
      rows.map((r) => [r.combo, r.levels, r.floor, r.settled, r.lastNew, r.found, r.nuggets, r.largest, r.monsters, r.limit]),
    );
    read.forEach((r, i) => {
      expect(r.tails).toBeCloseTo(rows[i].tails, 6);
      expect(marksOf(r)).toEqual(marksOf(rows[i]));
    });
  });

  it('writes and reads back an index line with every mark and an unsettled last level', () => {
    const r = lineRow('140000001 3 7* 9 4 171000 2 0.0123 0.97 sfum', 9);
    expect(indexLine(r)).toBe('140000001 3 7* 9 4 171000 2 0.0123 0.97 sfum');
    expect(marksOf(r)).toEqual(['short', 'notForecast', 'unexplained', 'missed']);
    expect(r.settled).toBe(false);
  });
});
