/** Loading the page's data past a stale copy the browser holds. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadCombo, loadIndex } from '../data';

const fresh = { found: [[0, 3, 60, '147', 6, 9, 9, 0, 1, 1]], tails: [1] };
const stale = { found: [[0, 3, 60, '147', 6, 9, 9]] };

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

  it('says so when the file is still old', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(stale))));
    await expect(loadCombo('/', '140000001')).rejects.toThrow(/older format/);
  });

  it('has no index for a rule with none precomputed', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })));
    expect(await loadIndex('/', '258')).toBeNull();
  });
});
