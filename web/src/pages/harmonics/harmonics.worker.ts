/** Harmonics worker: keeps one combination's renormalisation and answers `start` and `next` (`harmonicsJob.ts`). */

import { HarmonicsEngine, type WorkerMessage } from './harmonicsJob';

type Message = WorkerMessage & { id: number };
type WorkerScope = {
  onmessage: ((event: MessageEvent<Message>) => void) | null;
  postMessage(message: unknown): void;
};

const scope = globalThis as unknown as WorkerScope;
let engine: HarmonicsEngine | null = null;

scope.onmessage = (event) => {
  const m = event.data;
  try {
    if (m.type === 'start') engine = new HarmonicsEngine(m.job);
    if (!engine) throw new Error('no combination started');
    if (m.type === 'next') engine.next();
    const result =
      m.type === 'compare'
        ? engine.compare(m.a, m.b)
        : m.type === 'picture'
          ? engine.picture(m.members, m.k, m.fold)
          : m.type === 'rows'
            ? engine.rows(m.members, m.k, m.fold)
            : m.type === 'detail'
                ? engine.detail(m.c, m.level, m.view, m.budget)
                : m.type === 'thumbs'
                  ? engine.thumbs(m.cs, m.budget)
                  : m.type === 'similarities'
                    ? engine.similarities(m.fold)
                    : m.type === 'breakdowns'
                      ? engine.breakdowns(m.cs)
                      : m.type === 'breakdownPicture'
                        ? engine.breakdownPicture(m.c, m.k, m.index)
                        : m.type === 'born'
                          ? engine.bornOf(m.c)
                          : m.type === 'found'
                            ? engine.found(m.list, m.budget)
                            : m.type === 'score'
                              ? engine.score(m.a, m.b, m.fold)
                              : engine.result();
    scope.postMessage({ id: m.id, result });
  } catch (err) {
    scope.postMessage({ id: m.id, error: err instanceof Error ? err.message : String(err) });
  }
};
