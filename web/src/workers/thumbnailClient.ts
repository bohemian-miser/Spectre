/**
 * Newest-request-wins client for the thumbnail worker, per channel. Hovering
 * sweeps across many dots a second; only the latest request on a channel is
 * worth drawing, so an older pending one is resolved as `null` the moment a
 * newer one arrives on the same channel. Separate channels (the hover card and
 * the pinned panel) never cancel each other. Falls back to rendering on the
 * calling thread where `Worker` is unavailable.
 */

import { renderThumbnail, type ThumbnailReply, type ThumbnailRequest } from './thumbnailRender';

export type ThumbnailJob = Omit<ThumbnailRequest, 'id'>;

export interface ThumbnailClient {
  /** Resolves with the image, or null if a newer request on the channel superseded it. */
  render(job: ThumbnailJob, channel?: string): Promise<ThumbnailReply | null>;
  /** Called while the worker builds a new (rule, level) patch. */
  onBuilding: ((building: boolean) => void) | null;
  dispose(): void;
}

type Reply = ThumbnailReply | { id: number; building: boolean } | { id: number; error: string };

interface Pending {
  readonly req: ThumbnailRequest;
  resolve(r: ThumbnailReply | null): void;
  reject(e: Error): void;
}

export function createThumbnailClient(opts: { forceSync?: boolean } = {}): ThumbnailClient {
  let nextId = 1;
  /** Latest request per channel, until it is answered or superseded. */
  const pending = new Map<string, Pending>();
  /** Requests waiting for the worker, in arrival order (one per channel). */
  const queue: ThumbnailRequest[] = [];
  let inFlight: number | null = null;

  let worker: Worker | null = null;
  if (!opts.forceSync && typeof Worker !== 'undefined') {
    try {
      worker = new Worker(new URL('./thumbnail.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      worker = null;
    }
  }

  const channelOf = (id: number): string | undefined => {
    for (const [ch, p] of pending) if (p.req.id === id) return ch;
    return undefined;
  };

  const pump = () => {
    if (inFlight !== null) return;
    const next = queue.shift();
    if (!next) return;
    inFlight = next.id;
    if (worker) {
      worker.postMessage(next);
      return;
    }
    // Synchronous fallback, yielding first so a burst of hovers collapses.
    setTimeout(() => {
      inFlight = null;
      const ch = channelOf(next.id);
      if (ch !== undefined) {
        const p = pending.get(ch) as Pending;
        pending.delete(ch);
        try {
          p.resolve(renderThumbnail(next, (b) => client.onBuilding?.(b)));
        } catch (err) {
          p.reject(err instanceof Error ? err : new Error(String(err)));
        }
      }
      pump();
    }, 0);
  };

  const client: ThumbnailClient = {
    onBuilding: null,
    render(job, channel = 'default') {
      const req: ThumbnailRequest = { ...job, id: nextId++ };
      const old = pending.get(channel);
      if (old) {
        old.resolve(null);
        const qi = queue.findIndex((q) => q.id === old.req.id);
        if (qi >= 0) queue.splice(qi, 1);
      }
      const promise = new Promise<ThumbnailReply | null>((resolve, reject) => {
        pending.set(channel, { req, resolve, reject });
      });
      queue.push(req);
      pump();
      return promise;
    },
    dispose() {
      for (const p of pending.values()) p.resolve(null);
      pending.clear();
      queue.length = 0;
      worker?.terminate();
      worker = null;
    },
  };

  if (worker) {
    worker.onmessage = (event: MessageEvent<Reply>) => {
      const msg = event.data;
      if ('building' in msg) {
        client.onBuilding?.(msg.building);
        return;
      }
      if (msg.id === inFlight) inFlight = null;
      const ch = channelOf(msg.id);
      if (ch !== undefined) {
        const p = pending.get(ch) as Pending;
        pending.delete(ch);
        if ('error' in msg) p.reject(new Error(msg.error));
        else p.resolve(msg);
      }
      pump();
    };
  }
  return client;
}
