import { describe, expect, it } from 'vitest';
import { analyze, buildSystem, flatten, type AnalysisRequest } from '../../core';
import { analyzeSync, createAnalysisClient } from '../analysisClient';

const REQUEST: AnalysisRequest = {
  id: 7,
  family: 'spectre',
  rootTile: 'Delta',
  level: 2,
  subset: [1, 5],
  matchingIndexByType: {},
};

describe('analysis client', () => {
  it('falls back to synchronous execution when Worker is unavailable', async () => {
    expect(typeof Worker).toBe('undefined'); // node/vitest environment
    const client = createAnalysisClient();
    expect(client.usesWorker).toBe(false);

    const response = await client.run(REQUEST);
    expect(response.id).toBe(7);
    client.dispose();
  });

  it('forceSync never touches a worker', async () => {
    const client = createAnalysisClient({ forceSync: true });
    expect(client.usesWorker).toBe(false);
    const response = await client.run(REQUEST);
    expect(response.tileCount).toBe(71);
    client.dispose();
  });

  it('produces exactly the same numbers as a direct core analyze()', async () => {
    const instances = flatten(buildSystem('spectre', 2)['Delta']);
    const direct = analyze({
      family: 'spectre',
      instances,
      selected: new Set([1, 5]),
      matchingIndexByType: {},
    });
    const viaClient = await createAnalysisClient({ forceSync: true }).run(REQUEST);

    expect(viaClient.circuits).toEqual(direct.circuits);
    expect(viaClient.tails).toEqual(direct.tails);
    expect(viaClient.junctionCount).toBe(direct.junctionCount);
    expect(viaClient.circuitColors).toEqual([...direct.circuitColorByLength.entries()]);
  });

  it('echoes the request id so newest-wins cancellation can work', () => {
    expect(analyzeSync({ ...REQUEST, id: 42 }).id).toBe(42);
  });

  it('summaries are sorted by length and total to the path counts', () => {
    const response = analyzeSync(REQUEST);
    const sorted = [...response.circuitSummary].sort((a, b) => a.length - b.length);
    expect(response.circuitSummary).toEqual(sorted);
    expect(response.circuitSummary.reduce((n, s) => n + s.count, 0)).toBe(
      response.circuits.length,
    );
    expect(response.tailSummary.reduce((n, s) => n + s.count, 0)).toBe(response.tails.length);
  });

  it('is structured-clone friendly (plain objects only)', () => {
    const response = analyzeSync(REQUEST);
    expect(() => structuredClone(response)).not.toThrow();
    expect(() => structuredClone(REQUEST)).not.toThrow();
  });
});
