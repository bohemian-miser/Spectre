// @vitest-environment jsdom
/**
 * `InfiniteCanvas` tap-to-trace wiring.
 *
 * The geometry is `strandWalk`'s problem and is tested there; what can only
 * break here is the plumbing between a pointer, the newest cut, the walk and
 * the renderer:
 *
 *  - a TAP traces, a DRAG pans (the same pointer stream has to mean both);
 *  - the trail handed to the renderer is world-anchored, so panning away and
 *    back keeps drawing it — it is not rebuilt from the viewport;
 *  - a new cut resumes a walk that ran out of tiles;
 *  - turning tracing off, or changing the strand rule, drops a trace that
 *    would otherwise be a rainbow over geometry that no longer exists.
 */
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRef } from 'react';
import { comboToMatchingIndices, type ViewportCut } from '../../../core';
import { createCamera, worldToScreen, viewRectFor, type MapCamera } from '../camera';
import { buildLeafChordTable, type LeafChordTable } from '../chords';
import { InfiniteCanvas, type InfiniteCanvasApi, type InfiniteCanvasStatus } from '../InfiniteCanvas';
import type { MapRenderStats, MapRenderStyle, MapRenderer, TrailGeometry } from '../rendererTypes';
import { buildChordIndex, hitTestChord } from '../strandWalk';
import { createUnrootedEngine } from '../../../core';

const WIDTH = 800;
const HEIGHT = 520;
const SEED = 1;
const BUDGET = 100_000;
const SUBSET = [2, 5, 7, 8];
const COMBO = '0100101100';

const RECT = {
  x: 0,
  y: 0,
  top: 0,
  left: 0,
  right: WIDTH,
  bottom: HEIGHT,
  width: WIDTH,
  height: HEIGHT,
  toJSON: () => ({}),
} as DOMRect;

/**
 * jsdom ships neither `PointerEvent` nor pointer capture. Without the former,
 * Testing Library falls back to a bare `Event` and every coordinate arrives
 * undefined — which would make these tests pass for the wrong reason. A
 * MouseEvent with the two pointer fields bolted on is exactly enough.
 */
class TestPointerEvent extends MouseEvent {
  readonly pointerId: number;
  readonly pointerType: string;
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 1;
    this.pointerType = init.pointerType ?? 'mouse';
  }
}

beforeEach(() => {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(RECT);
  (window as unknown as Record<string, unknown>).PointerEvent = TestPointerEvent;
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** A renderer that records what it was told to draw. */
interface FakeRenderer extends MapRenderer {
  readonly trails: (TrailGeometry | null)[];
  readonly cuts: ViewportCut[];
  frames: number;
}

function makeRenderer(): FakeRenderer {
  const trails: (TrailGeometry | null)[] = [];
  const cuts: ViewportCut[] = [];
  const r: FakeRenderer = {
    mode: 'webgl2',
    trails,
    cuts,
    frames: 0,
    setCut: (cut) => cuts.push(cut),
    setChords: (_t: LeafChordTable | null) => {},
    setTrail: (t) => trails.push(t),
    setStyle: (_s: MapRenderStyle | null) => {},
    render: (): MapRenderStats => {
      r.frames++;
      return {
        mode: 'webgl2',
        instances: 0,
        drawCalls: 1,
        drawMs: 0,
        capped: false,
        chordsDrawn: 0,
        trailPoints: trails.at(-1)?.pointCount ?? 0,
      };
    },
    dispose: () => {},
  };
  return r;
}

const chordsFor = (): LeafChordTable =>
  buildLeafChordTable(SUBSET, comboToMatchingIndices('spectre', SUBSET, COMBO));

/**
 * Screen position of a chord's midpoint under `cam` — an unambiguous tap
 * target, found through the same engine query the component will run.
 */
function chordTargetOn(cam: MapCamera): { x: number; y: number } {
  const cut = createUnrootedEngine(SEED).query(viewRectFor(cam, WIDTH, HEIGHT), BUDGET);
  const index = buildChordIndex(cut, chordsFor());
  if (!index) throw new Error('no walkable cut at this camera');
  const hit = hitTestChord(index, { x: cam.cx, y: cam.cy }, 5);
  if (!hit) throw new Error('no chord near the view centre');
  const mid = { x: (hit.at.x + hit.to.x) / 2, y: (hit.at.y + hit.to.y) / 2 };
  return worldToScreen(cam, mid.x, mid.y, WIDTH, HEIGHT);
}

interface HarnessProps {
  readonly chords?: LeafChordTable | null;
  readonly trace?: boolean;
  readonly camera?: MapCamera;
  readonly renderer: FakeRenderer;
  readonly apiOut: { current: InfiniteCanvasApi | null };
  readonly onStatus: (s: InfiniteCanvasStatus) => void;
}

function Harness(props: HarnessProps): JSX.Element {
  const apiRef = useRef<InfiniteCanvasApi | null>(null);
  apiRef.current = props.apiOut.current;
  return (
    <InfiniteCanvas
      seed={SEED}
      budget={BUDGET}
      chords={props.chords === undefined ? chordsFor() : props.chords}
      trace={props.trace ?? true}
      initialCamera={props.camera ?? createCamera(0, 0, 36)}
      apiRef={props.apiOut as React.MutableRefObject<InfiniteCanvasApi | null>}
      onStatusChange={props.onStatus}
      forceSyncClient
      rendererFactory={() => props.renderer}
    />
  );
}

/** Flush effects, the sync query promise and a few animation frames. */
async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 80));
  });
}

function tap(host: Element, x: number, y: number): void {
  fireEvent.pointerDown(host, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: x, clientY: y });
  fireEvent.pointerUp(host, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: x, clientY: y });
}

interface Mounted {
  readonly host: Element;
  readonly renderer: FakeRenderer;
  readonly api: { current: InfiniteCanvasApi | null };
  status(): InfiniteCanvasStatus;
  rerender(props: Partial<HarnessProps>): Promise<void>;
}

async function mount(props: Partial<HarnessProps> = {}): Promise<Mounted> {
  const renderer = makeRenderer();
  const api: { current: InfiniteCanvasApi | null } = { current: null };
  let latest: InfiniteCanvasStatus | null = null;
  const full: HarnessProps = {
    renderer,
    apiOut: api,
    onStatus: (s) => {
      latest = s;
    },
    ...props,
  };
  const view = render(<Harness {...full} />);
  await settle();
  return {
    host: view.container.querySelector('.map-viewport') as Element,
    renderer,
    api,
    status: () => latest as InfiniteCanvasStatus,
    rerender: async (patch) => {
      view.rerender(<Harness {...full} {...patch} />);
      await settle();
    },
  };
}

// ---------------------------------------------------------------------------

describe('InfiniteCanvas — tap to trace', () => {
  it('colours the strand under a tap and hands it to the renderer', async () => {
    const m = await mount();
    expect(m.status().trace.active).toBe(false);

    const target = chordTargetOn(createCamera(0, 0, 36));
    tap(m.host, target.x, target.y);
    await settle();

    const trace = m.status().trace;
    expect(trace.active).toBe(true);
    expect(trace.points).toBeGreaterThan(2);
    expect(trace.length).toBeGreaterThan(0);
    // It stopped because it ran out of tiles, not because the strand did.
    expect(trace.status).toBe('frontier');

    const trail = m.renderer.trails.at(-1);
    expect(trail).not.toBeNull();
    expect(trail!.pointCount).toBe(trace.points);
    expect(trail!.totalLength).toBeCloseTo(trace.length, 3);
  });

  it('leaves a drag alone: panning must not paint', async () => {
    const m = await mount();
    const target = chordTargetOn(createCamera(0, 0, 36));

    fireEvent.pointerDown(m.host, {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      clientX: target.x,
      clientY: target.y,
    });
    fireEvent.pointerMove(m.host, { pointerId: 1, clientX: target.x + 60, clientY: target.y + 10 });
    fireEvent.pointerUp(m.host, { pointerId: 1, clientX: target.x + 60, clientY: target.y + 10 });
    await settle();

    expect(m.status().trace.active).toBe(false);
    expect(m.api.current?.getCamera().cx).toBeLessThan(0); // it panned instead
  });

  it('does nothing when the tap lands on empty tiling', async () => {
    // Chords are off entirely, so there is no strand anywhere to pick.
    const m = await mount({ chords: null });
    tap(m.host, WIDTH / 2, HEIGHT / 2);
    await settle();
    expect(m.status().trace.active).toBe(false);
  });

  it('respects the trace switch', async () => {
    const m = await mount({ trace: false });
    const target = chordTargetOn(createCamera(0, 0, 36));
    tap(m.host, target.x, target.y);
    await settle();
    expect(m.status().trace.active).toBe(false);

    // …and dropping a live trace when the switch goes off.
    const on = await mount();
    tap(on.host, target.x, target.y);
    await settle();
    expect(on.status().trace.active).toBe(true);
    await on.rerender({ trace: false });
    expect(on.status().trace.active).toBe(false);
    expect(on.renderer.trails.at(-1)).toBeNull();
  });

  it('drops the trace when the strand rule changes under it', async () => {
    const m = await mount();
    const target = chordTargetOn(createCamera(0, 0, 36));
    tap(m.host, target.x, target.y);
    await settle();
    expect(m.status().trace.active).toBe(true);

    await m.rerender({
      chords: buildLeafChordTable([1, 5], comboToMatchingIndices('spectre', [1, 5], '0000000000')),
    });
    expect(m.status().trace.active).toBe(false);
    expect(m.renderer.trails.at(-1)).toBeNull();
  });

  it('keeps drawing the line after the camera has left it, and resumes on pan', async () => {
    const m = await mount();
    const target = chordTargetOn(createCamera(0, 0, 36));
    tap(m.host, target.x, target.y);
    await settle();

    const first = m.status().trace;
    const anchored = m.renderer.trails.at(-1) as TrailGeometry;
    expect(first.status).toBe('frontier');

    // Zoom out: more tiles come into range, so the paused walk carries on.
    act(() => m.api.current?.setCamera({ scale: 6 }));
    await settle();
    const grown = m.status().trace;
    expect(grown.points).toBeGreaterThan(first.points);
    expect(grown.length).toBeGreaterThan(first.length);

    // The trail is still anchored to the world, not to the viewport: the
    // points already drawn are unchanged and still on the renderer.
    const now = m.renderer.trails.at(-1) as TrailGeometry;
    expect(now.origin).toEqual(anchored.origin);
    for (let i = 0; i < anchored.pointCount; i++) {
      expect(now.xy[i * 2]).toBe(anchored.xy[i * 2]);
      expect(now.arc[i]).toBe(anchored.arc[i]);
    }

    // Pan a long way off the line — it is still there to draw, untouched.
    act(() => m.api.current?.setCamera({ cx: 4000, cy: 4000, scale: 36 }));
    await settle();
    const away = m.renderer.trails.at(-1) as TrailGeometry;
    expect(away.pointCount).toBe(grown.points);
    expect(m.status().trace.active).toBe(true);
  });

  it('clears on request', async () => {
    const m = await mount();
    const target = chordTargetOn(createCamera(0, 0, 36));
    tap(m.host, target.x, target.y);
    await settle();
    expect(m.status().trace.active).toBe(true);

    act(() => m.api.current?.clearTrace());
    await settle();
    expect(m.status().trace.active).toBe(false);
    expect(m.status().trace.points).toBe(0);
    expect(m.renderer.trails.at(-1)).toBeNull();

    // And a second tap starts a fresh one rather than extending the old.
    tap(m.host, target.x, target.y);
    await settle();
    expect(m.status().trace.active).toBe(true);
  });
});
