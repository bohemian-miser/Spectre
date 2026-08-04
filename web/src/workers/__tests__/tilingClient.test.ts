/**
 * Tiling worker client (tilingClient.ts): the sync fallback must be
 * indistinguishable from the worker path — identical results to calling the
 * pure engine directly — and error paths must reject rather than hang.
 * (Node has no `Worker`, so `createTilingClient()` always falls back here;
 * the worker file itself is a thin shell over the same `runUnrootedQuery`.)
 */
import { describe, expect, it } from 'vitest';
import { createTilingClient, queryTilingSync } from '../tilingClient';
import { runUnrootedQuery, type UnrootedQueryRequest } from '../../core';

const REQ: UnrootedQueryRequest = {
  id: 1,
  seed: 42,
  view: { cx: 12, cy: -8, halfW: 25, halfH: 20 },
  budget: 100_000,
  emitIds: true,
  emitExact: true,
};

describe('tiling client', () => {
  it('falls back to synchronous execution without Worker support', () => {
    const client = createTilingClient();
    expect(client.usesWorker).toBe(false);
    client.dispose();
  });

  it('forceSync client returns exactly what the pure engine returns', async () => {
    const client = createTilingClient({ forceSync: true });
    const viaClient = await client.query(REQ);
    const direct = runUnrootedQuery({ ...REQ });
    expect(viaClient.id).toBe(REQ.id);
    expect(viaClient.seed).toBe(REQ.seed >>> 0);
    expect(viaClient.cut.count).toBe(direct.cut.count);
    expect(viaClient.cut.cutLevel).toBe(direct.cut.cutLevel);
    expect(Array.from(viaClient.cut.pos)).toEqual(Array.from(direct.cut.pos));
    expect(Array.from(viaClient.cut.code)).toEqual(Array.from(direct.cut.code));
    expect(Array.from(viaClient.cut.type)).toEqual(Array.from(direct.cut.type));
    expect(viaClient.cut.ids).toEqual(direct.cut.ids);
    expect(Array.from(viaClient.cut.exact ?? [])).toEqual(Array.from(direct.cut.exact ?? []));
    client.dispose();
  });

  it('echoes distinct request ids (newest-wins bookkeeping)', async () => {
    const client = createTilingClient({ forceSync: true });
    const [a, b] = await Promise.all([
      client.query({ ...REQ, id: 7 }),
      client.query({ ...REQ, id: 8 }),
    ]);
    expect(a.id).toBe(7);
    expect(b.id).toBe(8);
    client.dispose();
  });

  it('rejects on engine errors instead of hanging', async () => {
    const client = createTilingClient({ forceSync: true });
    await expect(client.query({ ...REQ, budget: 0 })).rejects.toThrow(/budget/);
    client.dispose();
  });

  it('queryTilingSync is a passthrough to the pure engine', () => {
    const a = queryTilingSync(REQ);
    const b = runUnrootedQuery(REQ);
    expect(a.cut.count).toBe(b.cut.count);
    expect(Array.from(a.cut.code)).toEqual(Array.from(b.cut.code));
  });
});
