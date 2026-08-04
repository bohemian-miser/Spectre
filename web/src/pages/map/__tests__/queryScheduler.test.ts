/**
 * Coalescing policy (stage-2 data-flow contract): at most ONE query in
 * flight, the newest camera always wins, intermediate requests are dropped,
 * and the optional throttle spaces out issue times.
 */
import { describe, expect, it } from 'vitest';
import { createQueryScheduler } from '../queryScheduler';

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (v: T) => void;
  reject: (e: unknown) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

describe('query scheduler', () => {
  it('keeps at most one query outstanding; the latest pending request wins', async () => {
    const issued: number[] = [];
    const results: number[] = [];
    const gates: Deferred<number>[] = [];
    let active = 0;
    let maxActive = 0;
    const s = createQueryScheduler<number, number>({
      run: (req) => {
        issued.push(req);
        active++;
        maxActive = Math.max(maxActive, active);
        const d = deferred<number>();
        gates.push(d);
        return d.promise.finally(() => {
          active--;
        });
      },
      onResult: (res) => results.push(res),
    });

    s.request(1); // issues immediately
    s.request(2); // pending…
    s.request(3); // …overwritten
    s.request(4); // …overwritten again — 4 must win
    expect(issued).toEqual([1]);
    expect(s.inFlight).toBe(true);
    expect(s.coalesced).toBe(2); // 2 and 3 were dropped before issue

    gates[0].resolve(10);
    await tick();
    expect(results).toEqual([10]);
    expect(issued).toEqual([1, 4]); // only the newest followed

    gates[1].resolve(40);
    await tick();
    expect(results).toEqual([10, 40]);
    expect(issued).toEqual([1, 4]);
    expect(maxActive).toBe(1); // never two concurrent queries
    expect(s.issued).toBe(2);
    s.dispose();
  });

  it('continues after a failed query and reports the error', async () => {
    const errors: unknown[] = [];
    const results: string[] = [];
    const gates: Deferred<string>[] = [];
    const s = createQueryScheduler<string, string>({
      run: () => {
        const d = deferred<string>();
        gates.push(d);
        return d.promise;
      },
      onResult: (r) => results.push(r),
      onError: (e) => errors.push(e),
    });
    s.request('a');
    s.request('b');
    gates[0].reject(new Error('worker exploded'));
    await tick();
    expect(errors).toHaveLength(1);
    expect(gates).toHaveLength(2); // 'b' still issued after the failure
    gates[1].resolve('B');
    await tick();
    expect(results).toEqual(['B']);
    s.dispose();
  });

  it('ignores everything after dispose (including late results)', async () => {
    const results: number[] = [];
    const gates: Deferred<number>[] = [];
    const s = createQueryScheduler<number, number>({
      run: () => {
        const d = deferred<number>();
        gates.push(d);
        return d.promise;
      },
      onResult: (r) => results.push(r),
    });
    s.request(1);
    s.request(2);
    s.dispose();
    gates[0].resolve(11); // late result from the in-flight query
    await tick();
    expect(results).toEqual([]);
    expect(gates).toHaveLength(1); // pending 2 was never issued
    s.request(3);
    await tick();
    expect(gates).toHaveLength(1);
  });

  it('throttles issue times by minIntervalMs using the injected clock', async () => {
    let nowMs = 1000;
    const timers: { fn: () => void; at: number }[] = [];
    const issued: number[] = [];
    const s = createQueryScheduler<number, number>({
      run: (req) => {
        issued.push(req);
        return Promise.resolve(req);
      },
      onResult: () => {},
      minIntervalMs: 100,
      now: () => nowMs,
      setTimer: (fn, ms) => {
        const t = { fn, at: nowMs + ms };
        timers.push(t);
        return () => {
          const i = timers.indexOf(t);
          if (i >= 0) timers.splice(i, 1);
        };
      },
    });

    s.request(1);
    expect(issued).toEqual([1]); // first goes immediately
    await tick();

    nowMs = 1010;
    s.request(2); // inside the 100 ms window → deferred via timer
    await tick();
    expect(issued).toEqual([1]);
    expect(timers).toHaveLength(1);
    expect(timers[0].at).toBe(1100);

    nowMs = 1050;
    s.request(3); // still deferred; replaces 2
    await tick();
    expect(issued).toEqual([1]);

    nowMs = 1100;
    const t = timers.shift();
    t?.fn();
    await tick();
    expect(issued).toEqual([1, 3]); // latest camera won, exactly once
    s.dispose();
  });
});
