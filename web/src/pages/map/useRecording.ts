/**
 * Page-side wiring for the canvas movie recorder — one hook shared by every
 * page that embeds an `InfiniteCanvas` (the map, the Explorer's infinite
 * mode), so a Record button behaves identically wherever it appears: start on
 * one press, stop-and-download on the next, a live elapsed count for the
 * label, and an honest note when the environment cannot record at all.
 *
 * The recorder itself lives behind `InfiniteCanvasApi` (`recording.ts` does
 * the captureStream + MediaRecorder work); this hook only owns the page-side
 * state a button needs. Lives in `pages/` because it hands the movie to
 * `downloadBlob`, which touches the DOM.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { downloadBlob } from '../sceneDownload';
import type { InfiniteCanvasApi } from './InfiniteCanvas';
import { recordingFilename } from './recording';

export interface CanvasRecordingControl {
  /** True while a take is running. */
  readonly recording: boolean;
  /** Whole seconds since the take began — ticks live for the button label. */
  readonly elapsed: number;
  /** Outcome of the last action (saved / unavailable / failed), or null. */
  readonly note: string | null;
  /** Start when idle; stop-and-download when recording. */
  toggle(): void;
  /**
   * Finish the live take and download it (no-op when idle). Exposed on its
   * own so a page can save a take before something that would discard it — a
   * family switch remounts the canvas, whose unmount drops the chunks.
   */
  stopAndSave(): Promise<void>;
}

/** The Record button's label: an invitation, or a stop with the take's clock. */
export function recordingLabel(recording: boolean, elapsed: number): string {
  if (!recording) return '● Record video';
  return `■ Stop & save ${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;
}

export function useCanvasRecording(
  apiRef: { readonly current: InfiniteCanvasApi | null },
  family: string,
  seed: number,
): CanvasRecordingControl {
  const [since, setSince] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  // Read at save time, not captured at click time: the take is named for the
  // world as it stands when the file is written.
  const worldRef = useRef({ family, seed });
  worldRef.current = { family, seed };

  useEffect(() => {
    if (since === null) return;
    setElapsed(0);
    const timer = setInterval(
      () => setElapsed(Math.floor((Date.now() - since) / 1000)),
      500,
    );
    return () => clearInterval(timer);
  }, [since]);

  const stopAndSave = useCallback(async (): Promise<void> => {
    const api = apiRef.current;
    setSince(null);
    if (!api?.isRecording()) return;
    try {
      const out = await api.stopRecording();
      if (!out) return;
      const name = recordingFilename(
        worldRef.current.family,
        worldRef.current.seed,
        out.mimeType,
      );
      downloadBlob(out.blob, name);
      setNote(`Saved ${name} (${(out.blob.size / 1e6).toFixed(1)} MB).`);
    } catch (err) {
      setNote(`Recording failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [apiRef]);

  const toggle = useCallback((): void => {
    const api = apiRef.current;
    if (!api) return;
    if (api.isRecording()) {
      void stopAndSave();
      return;
    }
    const started = api.startRecording();
    if (!started.ok) {
      setNote(`Recording unavailable: ${started.reason}`);
      return;
    }
    setNote(null);
    setSince(Date.now());
  }, [apiRef, stopAndSave]);

  return { recording: since !== null, elapsed, note, toggle, stopAndSave };
}
