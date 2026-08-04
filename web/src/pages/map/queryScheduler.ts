/**
 * In-flight query coalescing for the map's camera→worker pipeline
 * (docs/BIGMAP_INVESTIGATION.md §5 data flow).
 *
 * Policy: AT MOST ONE outstanding query; while one is in flight every new
 * request overwrites the single pending slot ("latest camera wins"); when the
 * in-flight query settles, the newest pending request is issued — optionally
 * throttled by `minIntervalMs` between issue times so pan gestures do not
 * saturate the worker. Pure except for the injectable clock/timer, so the
 * policy is unit-testable with manual promises.
 */

export interface QuerySchedulerOptions<Req, Res> {
  readonly run: (req: Req) => Promise<Res>;
  readonly onResult: (res: Res, req: Req) => void;
  readonly onError?: (err: unknown, req: Req) => void;
  /** Minimum ms between two query issues (0 = none). */
  readonly minIntervalMs?: number;
  /** Injectable clock (tests). */
  readonly now?: () => number;
  /** Injectable timer (tests); returns a cancel function. */
  readonly setTimer?: (fn: () => void, ms: number) => () => void;
}

export interface QueryScheduler<Req> {
  request(req: Req): void;
  dispose(): void;
  readonly inFlight: boolean;
  /** Total queries actually issued to `run`. */
  readonly issued: number;
  /** Requests dropped because a newer one replaced them before issue. */
  readonly coalesced: number;
}

const defaultSetTimer = (fn: () => void, ms: number): (() => void) => {
  const id = setTimeout(fn, ms);
  return () => clearTimeout(id);
};

export function createQueryScheduler<Req, Res>(
  opts: QuerySchedulerOptions<Req, Res>,
): QueryScheduler<Req> {
  const minInterval = opts.minIntervalMs ?? 0;
  const now = opts.now ?? (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));
  const setTimer = opts.setTimer ?? defaultSetTimer;

  let pending: Req | null = null;
  let hasPending = false;
  let inFlight = false;
  let disposed = false;
  let cancelTimer: (() => void) | null = null;
  let lastIssue = -Infinity;
  let issued = 0;
  let coalesced = 0;

  const pump = (): void => {
    if (disposed || inFlight || !hasPending) return;
    const wait = lastIssue + minInterval - now();
    if (wait > 0) {
      if (!cancelTimer) {
        cancelTimer = setTimer(() => {
          cancelTimer = null;
          pump();
        }, wait);
      }
      return;
    }
    const req = pending as Req;
    pending = null;
    hasPending = false;
    inFlight = true;
    lastIssue = now();
    issued++;
    opts.run(req).then(
      (res) => {
        inFlight = false;
        if (disposed) return;
        opts.onResult(res, req);
        pump();
      },
      (err) => {
        inFlight = false;
        if (disposed) return;
        opts.onError?.(err, req);
        pump();
      },
    );
  };

  return {
    request(req: Req): void {
      if (disposed) return;
      if (hasPending) coalesced++;
      pending = req;
      hasPending = true;
      pump();
    },
    dispose(): void {
      disposed = true;
      pending = null;
      hasPending = false;
      if (cancelTimer) {
        cancelTimer();
        cancelTimer = null;
      }
    },
    get inFlight(): boolean {
      return inFlight;
    },
    get issued(): number {
      return issued;
    },
    get coalesced(): number {
      return coalesced;
    },
  };
}
