/**
 * Recording the map canvas to a movie file — the "film the chase" feature.
 *
 * The whole pipeline is the browser's own: `canvas.captureStream()` turns the
 * canvas into a live video track that receives a frame every time the canvas
 * is painted, and `MediaRecorder` encodes that track in real time. Nothing is
 * re-rendered and no frames are copied through JS, so recording costs next to
 * nothing on top of the drawing the map is doing anyway. What lands in the
 * file is exactly the canvas — tiles, strand lines, the rainbow trail — at
 * the canvas's backing resolution (CSS size × devicePixelRatio); the DOM HUD
 * and controls are not part of it, which is what a clean recording wants.
 *
 * Two facts shape the API:
 *  - the container format is negotiated, not chosen: MP4 (H.264) is asked
 *    for first because it is what phones, messaging apps and photo rolls
 *    reliably play — Safari always could and Chromium (126+) now can — but
 *    a browser that cannot encode it (Firefox) records WebM instead, so the
 *    only honest answer is to ask `MediaRecorder.isTypeSupported` down a
 *    preference list ({@link pickRecordingMime}) and name the file after
 *    whatever won ({@link recordingExtension});
 *  - a paused scene produces no new frames, and that is fine — the recorder's
 *    clock keeps running and players hold the last frame, so a chase that
 *    stalls at a frontier records as the wait it was.
 *
 * The negotiation, bitrate, and filename logic are pure and unit-tested; only
 * {@link startCanvasRecording} touches the live objects, and callers gate it
 * behind {@link canRecordCanvas} so an environment without the machinery
 * (jsdom, old browsers) degrades to a disabled control instead of a throw.
 */

/**
 * Container/codec preference, most wanted first. MP4 + H.264 leads because
 * compatibility is what a saved movie is for: WebM/VP9 files routinely fail
 * to open on phones (iOS in particular) while H.264-in-MP4 plays on
 * effectively everything. High profile is preferred over Baseline for the
 * better compression at the same bitrate; both are universally decodable.
 * The WebM entries are the fallback for browsers that cannot ENCODE MP4
 * (Firefox), where VP9 comfortably beats VP8 at the same bitrate on this
 * content (flat fills, hard edges) and bare `video/webm` lets the browser
 * pick its default codec.
 */
export const RECORDING_MIME_CANDIDATES: readonly string[] = [
  'video/mp4;codecs=avc1.640028',
  'video/mp4;codecs=avc1.42E01E',
  'video/mp4',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
];

/**
 * Frames per second offered to `captureStream`. An upper bound, not a
 * promise: frames are produced only when the canvas actually paints, and the
 * follow loop paints per animation frame while anything moves.
 */
export const RECORDING_FPS = 60;

/**
 * How often the recorder hands back an encoded chunk (ms). Chunked delivery
 * keeps the movie in small blobs as it grows instead of one buffer that is
 * only materialised at stop.
 */
export const RECORDING_TIMESLICE_MS = 1000;

/** Bitrate bounds (bits/second) for {@link recordingBitsPerSecond}. */
export const RECORDING_MIN_BPS = 8_000_000;
export const RECORDING_MAX_BPS = 25_000_000;

/**
 * The first supported candidate, or null when none is. `isSupported` is
 * injectable for tests; the default asks the real `MediaRecorder`, and an
 * environment without one supports nothing.
 */
export function pickRecordingMime(
  isSupported: (type: string) => boolean = (type) => {
    if (typeof MediaRecorder === 'undefined') return false;
    try {
      return MediaRecorder.isTypeSupported(type);
    } catch {
      return false;
    }
  },
): string | null {
  for (const type of RECORDING_MIME_CANDIDATES) {
    if (isSupported(type)) return type;
  }
  return null;
}

/** File extension for a negotiated mime type. */
export function recordingExtension(mime: string): 'webm' | 'mp4' {
  return mime.startsWith('video/mp4') ? 'mp4' : 'webm';
}

/**
 * Target bitrate for a canvas of `width × height` BACKING pixels: ~0.2 bits
 * per pixel at 30 effective fps — generous for flat-colour tiles with hard
 * edges, which is where cheap encoders smear — clamped so a tiny window
 * still looks crisp and a 4K-backing canvas does not write absurd files.
 */
export function recordingBitsPerSecond(width: number, height: number): number {
  const bps = Math.max(0, width) * Math.max(0, height) * 6;
  return Math.min(RECORDING_MAX_BPS, Math.max(RECORDING_MIN_BPS, Math.round(bps)));
}

/**
 * Filename for a saved chase, in the scene-export convention
 * (`spectre-Delta-lv3-2578` and friends): family, world, and a local
 * timestamp so successive takes sort and never collide.
 */
export function recordingFilename(
  family: string,
  seed: number,
  mime: string,
  when: Date = new Date(),
): string {
  const p = (n: number, w = 2): string => String(n).padStart(w, '0');
  const stamp =
    `${when.getFullYear()}${p(when.getMonth() + 1)}${p(when.getDate())}` +
    `-${p(when.getHours())}${p(when.getMinutes())}${p(when.getSeconds())}`;
  return `${family}-map-seed${seed}-${stamp}.${recordingExtension(mime)}`;
}

/** True when this environment can record a canvas at all. */
export function canRecordCanvas(): boolean {
  return (
    typeof MediaRecorder !== 'undefined' &&
    typeof HTMLCanvasElement !== 'undefined' &&
    typeof HTMLCanvasElement.prototype.captureStream === 'function' &&
    pickRecordingMime() !== null
  );
}

export interface CanvasRecording {
  /** The negotiated container/codec — names the file's extension. */
  readonly mimeType: string;
  /** `performance.now()` at start, for elapsed-time displays. */
  readonly startedAt: number;
  /**
   * Finish and hand over the movie. Idempotent: every call returns the same
   * promise, which resolves once the encoder has flushed its last chunk.
   */
  stop(): Promise<Blob>;
  /** Discard everything recorded so far and release the stream. */
  cancel(): void;
}

/**
 * Start recording `canvas`. Throws when the environment cannot (gate calls
 * behind {@link canRecordCanvas}) or when the recorder refuses the stream.
 */
export function startCanvasRecording(canvas: HTMLCanvasElement): CanvasRecording {
  const mimeType = pickRecordingMime();
  if (!mimeType) throw new Error('this browser cannot record video');
  const stream = canvas.captureStream(RECORDING_FPS);
  const release = (): void => {
    for (const track of stream.getTracks()) track.stop();
  };
  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: recordingBitsPerSecond(canvas.width, canvas.height),
    });
  } catch (err) {
    release();
    throw err;
  }
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e: BlobEvent): void => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };
  let done: Promise<Blob> | null = null;
  recorder.start(RECORDING_TIMESLICE_MS);
  return {
    mimeType,
    startedAt: performance.now(),
    stop(): Promise<Blob> {
      if (!done) {
        done = new Promise<Blob>((resolve, reject) => {
          recorder.onstop = () => {
            release();
            resolve(new Blob(chunks, { type: mimeType }));
          };
          recorder.onerror = (e) => {
            release();
            const err = (e as unknown as { error?: unknown }).error;
            reject(err instanceof Error ? err : new Error('recording failed'));
          };
          try {
            recorder.stop(); // flushes a final dataavailable before onstop
          } catch (err) {
            release();
            reject(err);
          }
        });
      }
      return done;
    },
    cancel(): void {
      recorder.ondataavailable = null;
      chunks.length = 0;
      try {
        if (recorder.state !== 'inactive') recorder.stop();
      } catch {
        // already stopped — nothing held
      }
      release();
    },
  };
}
