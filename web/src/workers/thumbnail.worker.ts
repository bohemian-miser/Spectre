/**
 * Thumbnail worker for the Classifications page: renders one combination of a
 * rule into an RGBA buffer. The welded strand graph of a (family, rule, level)
 * is kept between requests — building it is the slow part (~0.4 s at level 5,
 * a few seconds at level 6); each combination after that is tens of ms.
 */

import { renderThumbnail, type ThumbnailReply, type ThumbnailRequest } from './thumbnailRender';

type WorkerScope = {
  onmessage: ((event: MessageEvent<ThumbnailRequest>) => void) | null;
  postMessage(message: unknown, transfer?: Transferable[]): void;
};

const scope = globalThis as unknown as WorkerScope;

scope.onmessage = (event: MessageEvent<ThumbnailRequest>) => {
  const req = event.data;
  try {
    const reply: ThumbnailReply = renderThumbnail(req, (building) =>
      scope.postMessage({ id: req.id, building }),
    );
    scope.postMessage(reply, [reply.rgba.buffer]);
  } catch (err) {
    scope.postMessage({ id: req.id, error: err instanceof Error ? err.message : String(err) });
  }
};
