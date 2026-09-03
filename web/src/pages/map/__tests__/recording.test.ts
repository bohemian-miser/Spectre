/**
 * The pure half of the recorder: format negotiation, bitrate sizing, file
 * naming, and honest capability reporting. The live half (`captureStream` +
 * `MediaRecorder`) has nothing to run against outside a real browser — what
 * matters here is that WITHOUT one, everything degrades to "no" rather than a
 * throw, which is what keeps the Record control an honest disabled button in
 * environments that cannot record.
 */
import { describe, expect, it } from 'vitest';
import {
  RECORDING_MAX_BPS,
  RECORDING_MIME_CANDIDATES,
  RECORDING_MIN_BPS,
  canRecordCanvas,
  pickRecordingMime,
  recordingBitsPerSecond,
  recordingExtension,
  recordingFilename,
} from '../recording';

describe('pickRecordingMime', () => {
  it('prefers phone-friendly MP4/H.264, falling back to WebM', () => {
    // MP4 first: the point of a saved movie is that it plays everywhere,
    // and H.264-in-MP4 is what phones actually open.
    expect(RECORDING_MIME_CANDIDATES[0]).toBe('video/mp4;codecs=avc1.640028');
    expect(pickRecordingMime(() => true)).toBe('video/mp4;codecs=avc1.640028');
    // No High profile → Baseline, still MP4.
    expect(pickRecordingMime((t) => !t.includes('avc1.64'))).toBe(
      'video/mp4;codecs=avc1.42E01E',
    );
    // Safari-ish: no WebM at all, plain MP4 only.
    expect(pickRecordingMime((t) => t === 'video/mp4')).toBe('video/mp4');
    // Firefox-ish: cannot encode MP4 at all → WebM, VP9 over VP8.
    expect(pickRecordingMime((t) => t.startsWith('video/webm'))).toBe(
      'video/webm;codecs=vp9',
    );
    expect(pickRecordingMime((t) => t === 'video/webm;codecs=vp8' || t === 'video/webm')).toBe(
      'video/webm;codecs=vp8',
    );
    expect(pickRecordingMime(() => false)).toBeNull();
  });

  it('answers null (not a throw) where MediaRecorder does not exist', () => {
    // Node has no MediaRecorder; the default probe must simply say no.
    expect(pickRecordingMime()).toBeNull();
    expect(canRecordCanvas()).toBe(false);
  });
});

describe('recordingExtension', () => {
  it('names the file after the container that won', () => {
    expect(recordingExtension('video/webm;codecs=vp9')).toBe('webm');
    expect(recordingExtension('video/webm')).toBe('webm');
    expect(recordingExtension('video/mp4;codecs=avc1.42E01E')).toBe('mp4');
    expect(recordingExtension('video/mp4')).toBe('mp4');
  });
});

describe('recordingBitsPerSecond', () => {
  it('scales with the backing area between the floor and the cap', () => {
    expect(recordingBitsPerSecond(0, 0)).toBe(RECORDING_MIN_BPS);
    expect(recordingBitsPerSecond(640, 360)).toBe(RECORDING_MIN_BPS); // tiny stays crisp
    const hd = recordingBitsPerSecond(1920, 1080);
    expect(hd).toBeGreaterThan(RECORDING_MIN_BPS);
    expect(hd).toBeLessThan(RECORDING_MAX_BPS);
    expect(recordingBitsPerSecond(3000, 1600)).toBe(RECORDING_MAX_BPS); // dpr-2 desktop caps
    // Monotone in area.
    expect(recordingBitsPerSecond(2000, 1100)).toBeGreaterThanOrEqual(hd);
  });
});

describe('recordingFilename', () => {
  it('follows the scene-export convention with a sortable local stamp', () => {
    const when = new Date(2026, 8, 1, 9, 5, 7); // 2026-09-01 09:05:07 local
    expect(recordingFilename('spectre', 1, 'video/webm;codecs=vp9', when)).toBe(
      'spectre-map-seed1-20260901-090507.webm',
    );
    expect(recordingFilename('hex', 42, 'video/mp4', when)).toBe(
      'hex-map-seed42-20260901-090507.mp4',
    );
  });
});
