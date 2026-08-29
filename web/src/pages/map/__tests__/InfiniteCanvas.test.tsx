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

// Chase tests run the real engine synchronously in jsdom, and the follow
// feeder's head-centred cuts are deliberately large — on a slow CI runner a
// single test can pass 5s. A timed-out test also poisons the rest of the
// file (its still-running walk unmounts hosts under later tests), so the
// margin here is generous.
vi.setConfig({ testTimeout: 30_000 });

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
  readonly circuitSets: (readonly TrailGeometry[] | null)[];
  readonly cuts: ViewportCut[];
  frames: number;
}

function makeRenderer(): FakeRenderer {
  const trails: (TrailGeometry | null)[] = [];
  const circuitSets: (readonly TrailGeometry[] | null)[] = [];
  const cuts: ViewportCut[] = [];
  const r: FakeRenderer = {
    mode: 'webgl2',
    trails,
    circuitSets,
    cuts,
    frames: 0,
    setCut: (cut) => cuts.push(cut),
    setChords: (_t: LeafChordTable | null) => {},
    setTrail: (t) => trails.push(t),
    setCircuits: (c) => circuitSets.push(c),
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
function chordTargetOn(
  cam: MapCamera,
  table: LeafChordTable = chordsFor(),
  /** World point to aim at; the view centre by default. */
  at: { x: number; y: number } = { x: cam.cx, y: cam.cy },
): { x: number; y: number } {
  const cut = createUnrootedEngine(SEED).query(viewRectFor(cam, WIDTH, HEIGHT), BUDGET);
  const index = buildChordIndex(cut, table);
  if (!index) throw new Error('no walkable cut at this camera');
  const hit = hitTestChord(index, at, 5);
  if (!hit) throw new Error(`no chord near ${at.x},${at.y}`);
  const mid = { x: (hit.at.x + hit.to.x) / 2, y: (hit.at.y + hit.to.y) / 2 };
  return worldToScreen(cam, mid.x, mid.y, WIDTH, HEIGHT);
}

interface HarnessProps {
  readonly chords?: LeafChordTable | null;
  readonly trace?: boolean;
  readonly follow?: boolean;
  readonly followHold?: number | null;
  readonly keepCircuits?: boolean;
  readonly keepTails?: boolean;
  readonly findCircuits?: boolean;
  readonly persistFound?: boolean;
  readonly findCeiling?: number;
  readonly followPace?: number | null;
  readonly traceSeed?: readonly [number, number, number, number] | null;
  readonly onTraceSeed?: (seed: readonly [number, number, number, number] | null) => void;
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
      follow={props.follow ?? false}
      followHold={props.followHold ?? null}
      keepCircuits={props.keepCircuits ?? false}
      keepTails={props.keepTails ?? false}
      findCircuits={props.findCircuits ?? false}
      persistFound={props.persistFound ?? false}
      findCeiling={props.findCeiling}
      followPace={props.followPace ?? null}
      traceSeed={props.traceSeed ?? null}
      onTraceSeed={props.onTraceSeed}
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

/**
 * {@link settle} until `done()` holds, rather than for a fixed span of wall
 * clock. Re-cutting after a camera change is real engine work scheduled across
 * animation frames, so "80ms is surely enough" is a race that loses whenever
 * the machine is busy — CI runs the whole suite in parallel forks. The
 * condition is what these tests actually mean; the deadline only stops a
 * genuine hang from hanging the run.
 */
async function settleUntil(done: () => boolean, what: string): Promise<void> {
  const deadline = Date.now() + 10_000;
  for (;;) {
    await settle();
    if (done()) return;
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`);
  }
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

// ---------------------------------------------------------------------------

const loopTable = (): LeafChordTable =>
  buildLeafChordTable([1, 5], comboToMatchingIndices('spectre', [1, 5], '0000000000'));

describe('InfiniteCanvas — auto-follow', () => {
  it('chases the head itself and never touches the zoom', async () => {
    const m = await mount({ follow: true });
    const target = chordTargetOn(createCamera(0, 0, 36));
    tap(m.host, target.x, target.y);
    await settle();
    const early = m.status().trace.length;
    expect(early).toBeGreaterThan(0);

    // No user pans from here on: the camera must move on its own, and the
    // chase must keep feeding the walk.
    await settle();
    await settle();
    await settle();
    await settle();
    const cam = m.api.current!.getCamera();
    expect(Math.hypot(cam.cx, cam.cy)).toBeGreaterThan(0.05);
    expect(cam.scale).toBe(36);
    expect(m.status().trace.length).toBeGreaterThan(early);
  });

  it('keeps the wheel live while chasing', async () => {
    const m = await mount({ follow: true });
    const target = chordTargetOn(createCamera(0, 0, 36));
    tap(m.host, target.x, target.y);
    await settle();

    fireEvent.wheel(m.host, { deltaY: -400, clientX: WIDTH / 2, clientY: HEIGHT / 2 });
    await settle();
    expect(m.api.current!.getCamera().scale).toBeGreaterThan(36);
    // Still chasing after the zoom: the walk keeps growing.
    const len = m.status().trace.length;
    await settle();
    await settle();
    expect(m.status().trace.length).toBeGreaterThanOrEqual(len);
  });

  it('holds at most the configured window while following', async () => {
    const m = await mount({ follow: true, followHold: 20 });
    const target = chordTargetOn(createCamera(0, 0, 36));
    tap(m.host, target.x, target.y);
    for (let i = 0; i < 6; i++) await settle();

    const trace = m.status().trace;
    expect(trace.points).toBeLessThanOrEqual(20);
    // The odometer keeps the full distance even though the window let go.
    expect(trace.length).toBeGreaterThan(0);
    const trail = m.renderer.trails.at(-1)!;
    expect(trail.pointCount).toBe(trace.points);
    // The rainbow spans the window: rebased arc starts at zero.
    expect(trail.arc[0]).toBe(0);
    expect(trail.totalLength).toBeLessThanOrEqual(trace.length + 1e-6);
  });
});

describe('InfiniteCanvas — kept circuits', () => {
  /** A chord on a DIFFERENT loop from the one under the view centre. */
  const OTHER_TARGET = chordTargetOn(createCamera(0, 0, 36), loopTable(), { x: 4, y: 2.5 });

  it('archives a closed circuit on the next tap and clears on demand', async () => {
    const m = await mount({ chords: loopTable(), keepCircuits: true });
    const target = chordTargetOn(createCamera(0, 0, 36), loopTable());
    tap(m.host, target.x, target.y);
    await settle();
    expect(m.status().trace.status).toBe('closed');
    expect(m.status().trace.circuits).toBe(0); // still the live trail

    // A DIFFERENT circuit: re-tapping the same one is not a new strand, and
    // re-drawing the loop already on screen is the bug this file guards.
    tap(m.host, OTHER_TARGET.x, OTHER_TARGET.y);
    await settle();
    expect(m.status().trace.circuits).toBe(1);
    const kept = m.renderer.circuitSets.at(-1);
    expect(kept).not.toBeNull();
    expect(kept!.length).toBe(1);
    expect(kept![0].pointCount).toBeGreaterThan(2);

    act(() => m.api.current?.clearTrace());
    await settle();
    expect(m.status().trace.circuits).toBe(0);
    expect(m.renderer.circuitSets.at(-1)).toEqual([]);
  });

  /**
   * Reported: "if a circuit has just been highlighted and you click on the
   * circuit, a copy gets added on top but offset a bit". The copies are in
   * fact identical — same points, same length, same origin — so they stack,
   * and each trace's stroke caps land at whichever chord it started from,
   * which is what reads as an offset.
   */
  it('never draws the same circuit twice, however often it is re-tapped', async () => {
    const m = await mount({ chords: loopTable(), keepCircuits: true });
    const target = chordTargetOn(createCamera(0, 0, 36), loopTable());
    for (let i = 0; i < 4; i++) {
      tap(m.host, target.x, target.y);
      await settle();
    }
    const kept = m.renderer.circuitSets.at(-1)!;
    // One loop on screen, drawn once — plus the live trail tracing it, which
    // is not in this list.
    expect(kept.length).toBeLessThanOrEqual(1);
    const keys = new Set(kept.map((g) => `${g.totalLength.toFixed(3)}@${g.origin.x.toFixed(3)}`));
    expect(keys.size).toBe(kept.length);
  });

  it('colours a live circuit the same as find-all colours that very loop', async () => {
    // The live trail derives its colour from its own step count; find-all
    // derives it from the traced path's length. They are the same circuit, so
    // they have to agree — an off-by-one in either shows up as two colours for
    // one loop.
    const live = await mount({ chords: loopTable(), keepCircuits: true });
    const target = chordTargetOn(createCamera(0, 0, 36), loopTable());
    tap(live.host, target.x, target.y);
    await settleUntil(() => live.status().trace.status === 'closed', 'the circuit to close');
    const liveGeom = live.renderer.trails.at(-1)!;
    expect(liveGeom.color).toBeDefined();

    const all = await mount({ chords: loopTable(), findCircuits: true });
    await settleUntil(() => all.status().trace.found > 0, 'find-all to run');
    const found = all.renderer.circuitSets.at(-1)!;
    const match = found.find(
      (g) => Math.abs(g.totalLength - liveGeom.totalLength) < 1e-6,
    );
    expect(match, 'find-all found the same-length loop').toBeDefined();
    expect(liveGeom.color).toEqual(match!.color);
  });

  it('does not archive with the toggle off, and dropping the toggle drops the kept', async () => {
    const m = await mount({ chords: loopTable(), keepCircuits: false });
    const target = chordTargetOn(createCamera(0, 0, 36), loopTable());
    tap(m.host, target.x, target.y);
    await settle();
    tap(m.host, OTHER_TARGET.x, OTHER_TARGET.y);
    await settle();
    expect(m.status().trace.circuits).toBe(0);

    // Now with it on: the tap archives the closed trail still lit from above.
    await m.rerender({ keepCircuits: true });
    tap(m.host, target.x, target.y);
    await settle();
    expect(m.status().trace.circuits).toBe(1);
    await m.rerender({ keepCircuits: false });
    expect(m.status().trace.circuits).toBe(0);
    expect(m.renderer.circuitSets.at(-1)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------

describe('InfiniteCanvas — dead-end confirmation', () => {
  it('still reports a genuine end, via the head-centred confirmation', async () => {
    // Rule [2]: odd connection counts, tiles contribute no chords beyond the
    // strand fragments — walks genuinely end at tile granularity.
    const m = await mount({
      chords: buildLeafChordTable([2], comboToMatchingIndices('spectre', [2], '0000000000')),
    });
    const target = chordTargetOn(
      createCamera(0, 0, 36),
      buildLeafChordTable([2], comboToMatchingIndices('spectre', [2], '0000000000')),
    );
    tap(m.host, target.x, target.y);
    await settle();
    await settle();
    await settle();
    // The first 'end' is demoted and re-derived from a feed cut centred on
    // the head; the confirmation must arrive and stick.
    expect(m.status().trace.status).toBe('end');
  });
});

describe('InfiniteCanvas — pace limit', () => {
  it('walks at roughly the configured tiles/second instead of all at once', async () => {
    const m = await mount({ followPace: 5 });
    const target = chordTargetOn(createCamera(0, 0, 36));
    tap(m.host, target.x, target.y);
    await settle();
    await settle();
    await settle();
    await settle();
    await settle();
    const slow = m.status().trace;
    expect(slow.active).toBe(true);
    // ~0.5s at 5 tiles/s: a handful of points, not the hundreds full speed
    // reaches in the same wall time (see the tap test above).
    expect(slow.points).toBeGreaterThan(1);
    expect(slow.points).toBeLessThanOrEqual(12);
  });
});

describe('InfiniteCanvas — the chase feeds itself at any zoom', () => {
  it('keeps walking while the display sits at aggregate LOD', async () => {
    const m = await mount({ follow: true });
    const target = chordTargetOn(createCamera(0, 0, 36));
    tap(m.host, target.x, target.y);
    await settle();
    const before = m.status().trace.length;
    expect(before).toBeGreaterThan(0);

    // Zoom far out: the display cut turns aggregate (no leaf chords at all).
    act(() => m.api.current?.setCamera({ scale: 0.05 }));
    await settle();
    expect(m.status().cut?.cutLevel ?? 0).toBeGreaterThan(0);

    // The walk must keep growing anyway — fed by its own head-centred cuts.
    await settle();
    await settle();
    const after = m.status().trace;
    expect(after.active).toBe(true);
    expect(after.length).toBeGreaterThan(before);
  });
});

describe('InfiniteCanvas — shareable trace seed', () => {
  it('reports the tapped chord and replays it from the prop', async () => {
    const seeds: (readonly [number, number, number, number] | null)[] = [];
    const m = await mount({ onTraceSeed: (s) => seeds.push(s) });
    const target = chordTargetOn(createCamera(0, 0, 36));
    tap(m.host, target.x, target.y);
    await settle();
    expect(seeds.length).toBeGreaterThan(0);
    const seed = seeds.at(-1)!;
    expect(seed).not.toBeNull();
    expect(seed!.every((v) => Number.isFinite(v))).toBe(true);
    const firstLength = m.status().trace.length;

    // Clearing reports null…
    act(() => m.api.current?.clearTrace());
    await settle();
    expect(seeds.at(-1)).toBeNull();
    expect(m.status().trace.active).toBe(false);

    // …and a fresh mount given the seed replays the same chase untapped.
    const replayed: (readonly [number, number, number, number] | null)[] = [];
    const m2 = await mount({ traceSeed: seed, onTraceSeed: (s) => replayed.push(s) });
    await settle();
    await settle();
    const trace = m2.status().trace;
    expect(trace.active).toBe(true);
    expect(trace.length).toBeGreaterThan(0);
    // The replayed walk reports the same chord (to codec precision).
    expect(replayed.length).toBeGreaterThan(0);
    const echo = replayed.at(-1)!;
    expect(echo).not.toBeNull();
    for (let i = 0; i < 4; i++) expect(Math.abs(echo![i] - seed![i])).toBeLessThan(0.01);
    // And the camera jumped to the seed chord.
    const cam = m2.api.current!.getCamera();
    expect(Math.hypot(cam.cx - seed![0], cam.cy - seed![1])).toBeLessThan(30);
    void firstLength;
  });
});

describe('InfiniteCanvas — kept tails, circuit colour, find-all', () => {
  const oddTable = (): LeafChordTable =>
    buildLeafChordTable([2], comboToMatchingIndices('spectre', [2], '0000000000'));

  it('keeps a dead-ended strand under the keep-tails toggle', async () => {
    const m = await mount({ chords: oddTable(), keepTails: true });
    const target = chordTargetOn(createCamera(0, 0, 36), oddTable());
    tap(m.host, target.x, target.y);
    await settle();
    await settle();
    expect(m.status().trace.status).toBe('end');
    tap(m.host, target.x, target.y);
    await settle();
    expect(m.status().trace.circuits).toBe(1);
    // A kept tail keeps its rainbow: no solid colour on the geometry.
    expect(m.renderer.circuitSets.at(-1)![0].color).toBeUndefined();
  });

  it('does not keep tails with the toggle off', async () => {
    const m = await mount({ chords: oddTable(), keepTails: false });
    const target = chordTargetOn(createCamera(0, 0, 36), oddTable());
    tap(m.host, target.x, target.y);
    await settle();
    await settle();
    tap(m.host, target.x, target.y);
    await settle();
    expect(m.status().trace.circuits).toBe(0);
  });

  it('recolours a strand solid by length the moment it closes', async () => {
    const m = await mount({ chords: loopTable() });
    const target = chordTargetOn(createCamera(0, 0, 36), loopTable());
    tap(m.host, target.x, target.y);
    await settle();
    expect(m.status().trace.status).toBe('closed');
    const geom = m.renderer.trails.at(-1)!;
    expect(geom.color).toBeDefined();
    expect(geom.color!.length).toBe(3);
  });

  it('find-all colours every on-screen circuit and clears when toggled off', async () => {
    const m = await mount({ chords: loopTable(), findCircuits: true });
    await settle();
    const t = m.status().trace;
    expect(t.found).toBeGreaterThan(3);
    expect(t.foundSkipped).toBe(false);
    const overlays = m.renderer.circuitSets.at(-1)!;
    expect(overlays.length).toBe(t.found);
    expect(overlays.every((g) => g.color !== undefined)).toBe(true);
    // Same length ⇒ same colour; the loop rule's short circuits repeat.
    const keys = new Set(overlays.map((g) => g.color!.join(',')));
    expect(keys.size).toBeLessThan(overlays.length);

    await m.rerender({ findCircuits: false });
    expect(m.status().trace.found).toBe(0);
    expect(m.renderer.circuitSets.at(-1)!.length).toBe(0);
  });
});

describe('InfiniteCanvas — the tiles a chase crossed', () => {
  it('reports them with the trace, newest last, for the ticker', async () => {
    const m = await mount({});
    const target = chordTargetOn(createCamera(0, 0, 36));
    tap(m.host, target.x, target.y);
    await settle();

    const trace = m.status().trace;
    expect(trace.active).toBe(true);
    expect(trace.tiles.length).toBeGreaterThan(0);
    // One name per step walked, up to the ring's own window.
    expect(trace.tiles.length).toBeLessThanOrEqual(trace.length + 1);
    expect(trace.tiles.every((t) => Number.isInteger(t) && t >= 0 && t < 10)).toBe(true);

    // Walking further keeps the list growing from the same end.
    const before = [...trace.tiles];
    await settle();
    const after = m.status().trace.tiles;
    if (after.length > before.length) {
      expect(after.slice(0, before.length)).toEqual(before);
    }
  });

  it('has nothing to report before a strand is tapped', async () => {
    const m = await mount({});
    await settle();
    expect(m.status().trace.tiles).toEqual([]);
  });
});

describe('InfiniteCanvas — circuits past their own zoom', () => {
  it('drops found circuits when the view goes coarse, and holds them when asked', async () => {
    // Zoomed in far enough for a leaf cut, find-all finds circuits.
    const m = await mount({ chords: loopTable(), findCircuits: true });
    await settle();
    const found = m.status().trace.found;
    expect(found).toBeGreaterThan(3);

    // Zoom out past what find-all can analyse: without the toggle they go.
    act(() => m.api.current?.setCamera({ scale: 0.05 }));
    await settleUntil(() => (m.status().cut?.cutLevel ?? 0) > 0, 'the coarse cut');
    expect(m.status().trace.foundSkipped).toBe(true);
    expect(m.status().trace.found).toBe(0);
    expect(m.renderer.circuitSets.at(-1)!.length).toBe(0);

    // Back in, then out again with the toggle on: the same circuits stay lit.
    act(() => m.api.current?.setCamera({ scale: 36 }));
    await settleUntil(() => m.status().trace.found === found, 'the circuits to be found again');
    await m.rerender({ findCircuits: true, persistFound: true });
    act(() => m.api.current?.setCamera({ scale: 0.05 }));
    await settleUntil(() => (m.status().cut?.cutLevel ?? 0) > 0, 'the coarse cut');
    const held = m.status().trace;
    expect(held.found).toBe(found);
    expect(held.foundSkipped).toBe(false);
    // Held, and honest about it.
    expect(held.foundStale).toBe(true);
    expect(m.renderer.circuitSets.at(-1)!.length).toBe(found);
  });

  it('zooms to the widest view that still has individual tiles', async () => {
    const m = await mount({ chords: loopTable(), findCircuits: true });
    // Start far too far out for find-all.
    act(() => m.api.current?.setCamera({ scale: 0.05 }));
    await settleUntil(() => m.status().trace.foundSkipped, 'find-all to give up on the coarse view');
    const before = m.api.current!.getCamera();

    const scale = m.api.current!.zoomToCircuitView();
    expect(scale).not.toBeNull();
    await settleUntil(() => m.status().cut?.cutLevel === 0, 'the leaf cut it zoomed to');

    const after = m.api.current!.getCamera();
    // Only the zoom moved…
    expect(after.cx).toBeCloseTo(before.cx, 9);
    expect(after.cy).toBeCloseTo(before.cy, 9);
    expect(after.scale).toBeGreaterThan(before.scale);
    // …and it lands somewhere find-all can actually work.
    expect(m.status().cut?.cutLevel).toBe(0);
    expect(m.status().trace.foundSkipped).toBe(false);
    expect(m.status().trace.found).toBeGreaterThan(0);
  });
});

describe('InfiniteCanvas — "keep them" means keep them', () => {
  /**
   * The reported bug: with the toggle on, circuits survived a zoom OUT but
   * were thrown away the moment the camera came back to individual tiles,
   * because the find pass replaced the whole set with whatever this cut held.
   * Kept tails accumulate; found circuits have to as well.
   */
  it('accumulates circuits found in one place with those found in another', async () => {
    const m = await mount({ chords: loopTable(), findCircuits: true, persistFound: true });
    await settleUntil(() => m.status().trace.found > 0, 'the first circuits');
    const here = m.status().trace.found;

    // Somewhere else entirely, at the same (leaf) zoom.
    act(() => m.api.current?.setCamera({ cx: 600, cy: 400 }));
    await settleUntil(() => m.status().trace.found > here, 'circuits from the new neighbourhood');
    const both = m.status().trace.found;
    expect(both).toBeGreaterThan(here);
    expect(m.renderer.circuitSets.at(-1)!.length).toBe(both);

    // Coming back must not re-find the originals as duplicates, nor drop the
    // ones found while away.
    act(() => m.api.current?.setCamera({ cx: 0, cy: 0 }));
    await settle();
    await settle();
    expect(m.status().trace.found).toBe(both);
  });

  it('without the toggle it still shows only what is on screen', async () => {
    const m = await mount({ chords: loopTable(), findCircuits: true, persistFound: false });
    await settleUntil(() => m.status().trace.found > 0, 'the first circuits');
    const here = m.status().trace.found;

    act(() => m.api.current?.setCamera({ cx: 600, cy: 400 }));
    await settleUntil(() => m.status().trace.found > 0, 'circuits in the new view');
    // A viewport's worth, not two viewports' worth.
    expect(m.status().trace.found).toBeLessThan(here * 2);
  });

  /**
   * The regression the accumulation introduced: the trim kept the LONGEST
   * circuits, so once the set filled up every short circuit found afterwards
   * was evicted the instant it arrived — including ones in plain view. The
   * user saw small circuits stop being coloured at all.
   */
  it('never drops a circuit that is on screen, whatever its size', async () => {
    const m = await mount({ chords: loopTable(), findCircuits: true, persistFound: true });
    await settleUntil(() => m.status().trace.found > 0, 'the first circuits');

    // Wander, so the accumulated set grows well past what any one view holds.
    for (const [cx, cy] of [[500, 320], [-460, 280], [640, -400], [-700, -260]]) {
      act(() => m.api.current?.setCamera({ cx, cy }));
      await settle();
      await settle();
    }
    act(() => m.api.current?.setCamera({ cx: 0, cy: 0 }));
    await settleUntil(() => m.status().trace.found > 0, 'the circuits here again');

    // Everything the current cut can see must be drawn — including the short
    // ones, which is precisely what the length-ordered trim used to lose.
    const drawn = m.renderer.circuitSets.at(-1)!;
    const lengths = drawn.map((g) => g.totalLength);
    const shortest = Math.min(...lengths);
    const longest = Math.max(...lengths);
    expect(drawn.length).toBe(m.status().trace.found);
    // A length-ordered cull collapses the spread; an honest set keeps it.
    expect(longest).toBeGreaterThan(shortest);

    // And the same view with the toggle off — the ground truth for "on screen"
    // — must not contain a circuit the accumulated set is missing.
    const solo = await mount({ chords: loopTable(), findCircuits: true, persistFound: false });
    await settleUntil(() => solo.status().trace.found > 0, 'the same view alone');
    const soloShortest = Math.min(
      ...solo.renderer.circuitSets.at(-1)!.map((g) => g.totalLength),
    );
    expect(shortest).toBeLessThanOrEqual(soloShortest);
  });

  it('clearing lets go of the accumulated circuits', async () => {
    const m = await mount({ chords: loopTable(), findCircuits: true, persistFound: true });
    await settleUntil(() => m.status().trace.found > 0, 'the first circuits');
    act(() => m.api.current?.clearTrace());
    await settle();
    expect(m.renderer.circuitSets.at(-1)!.length).toBe(0);
  });
});

describe('InfiniteCanvas — the find ceiling is adjustable', () => {
  /**
   * A view wide enough to hold more than the low ceiling but still made of
   * individual tiles — so the only thing that can make find-all stand down is
   * the ceiling itself, not the LOD cut.
   */
  // Measured: at this zoom the engine emits 4809 individual tiles (cutLevel 0),
  // so it is comfortably over the low ceiling without tripping the LOD.
  const WIDE = 4;
  const LOW = 2000;

  it('a low ceiling makes a leaf cut too expensive to analyse, and says so', async () => {
    const m = await mount({ chords: loopTable(), findCircuits: true, findCeiling: LOW });
    act(() => m.api.current?.setCamera({ scale: WIDE }));
    await settleUntil(() => (m.status().cut?.count ?? 0) > LOW, 'a view wider than the ceiling');
    // The premise: real tiles, just too many of them.
    expect(m.status().cut?.cutLevel).toBe(0);
    expect(m.status().cut!.count).toBeGreaterThan(LOW);
    expect(m.status().trace.foundSkipped).toBe(true);
    expect(m.status().trace.found).toBe(0);
  });

  it('raising it lets the very same view be analysed', async () => {
    const m = await mount({ chords: loopTable(), findCircuits: true, findCeiling: 250_000 });
    act(() => m.api.current?.setCamera({ scale: WIDE }));
    await settleUntil(() => m.status().trace.found > 0, 'circuits under a high ceiling');
    expect(m.status().cut!.count).toBeGreaterThan(LOW);
    expect(m.status().trace.foundSkipped).toBe(false);
  });

  it('circuit zoom parks further out when the ceiling is higher', async () => {
    const low = await mount({ chords: loopTable(), findCircuits: true, findCeiling: 5000 });
    act(() => low.api.current?.setCamera({ scale: 0.05 }));
    await settle();
    const lowScale = low.api.current!.zoomToCircuitView();

    const high = await mount({ chords: loopTable(), findCircuits: true, findCeiling: 120_000 });
    act(() => high.api.current?.setCamera({ scale: 0.05 }));
    await settle();
    const highScale = high.api.current!.zoomToCircuitView();

    expect(lowScale).not.toBeNull();
    expect(highScale).not.toBeNull();
    // More tiles per pass = a wider view still qualifies = zoomed further out.
    expect(highScale!).toBeLessThan(lowScale!);
  });
});

describe('InfiniteCanvas — part-chased strands persist too', () => {
  it('keeps a frontier-stopped chase when the next strand is tapped', async () => {
    // OPEN rule: the walk runs to the edge of the tiles and waits (frontier).
    const m = await mount({ keepTails: true });
    const target = chordTargetOn(createCamera(0, 0, 36));
    tap(m.host, target.x, target.y);
    await settle();
    expect(m.status().trace.status).toBe('frontier');

    tap(m.host, target.x, target.y); // start a new chase mid-strand
    await settle();
    expect(m.status().trace.circuits).toBe(1); // the part-chase stayed lit
    expect(m.renderer.circuitSets.at(-1)![0].color).toBeUndefined(); // rainbow
  });
});
