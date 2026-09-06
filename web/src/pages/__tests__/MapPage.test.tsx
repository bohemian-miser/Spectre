// @vitest-environment jsdom
/**
 * MapPage contract (BIGMAP stage 2): the page boots with the forceSync tiling
 * client, feeds real engine cuts into whichever renderer the environment
 * affords, and degrades gracefully — WebGL2 mock → instanced draw calls with
 * the cut's exact instance count; 2D-only → Canvas2D fallback with the capped
 * budget notice; neither → a static unsupported message. Deep links through
 * the hash reproduce seed/budget. Geometry correctness is covered by the map unit
 * suites and core's oracle tests; what can only break here is the wiring.
 */
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MapPage from '../MapPage';

// ---------------------------------------------------------------------------
// Environment shims (jsdom has no layout, no GL, no Path2D)
// ---------------------------------------------------------------------------

const RECT = {
  x: 0,
  y: 0,
  top: 0,
  left: 0,
  right: 800,
  bottom: 520,
  width: 800,
  height: 520,
  toJSON: () => ({}),
} as DOMRect;

beforeEach(() => {
  window.history.replaceState(null, '', '/map.html');
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(RECT);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  delete (globalThis as Record<string, unknown>).Path2D;
});

/** Minimal WebGL2 stand-in: no-op calls, truthy statuses, recorded draws. */
interface FakeGL {
  drawElementsInstanced: ReturnType<typeof vi.fn>;
  drawArraysInstanced: ReturnType<typeof vi.fn>;
  bufferData: ReturnType<typeof vi.fn>;
  [key: string]: unknown;
}

function makeFakeGl(): FakeGL {
  const explicit: Record<string, unknown> = {
    getShaderParameter: () => true,
    getProgramParameter: () => true,
    getShaderInfoLog: () => '',
    getProgramInfoLog: () => '',
    getUniformLocation: () => ({}),
    getError: () => 0,
    createShader: () => ({}),
    createProgram: () => ({}),
    createBuffer: () => ({}),
    createTexture: () => ({}),
    createVertexArray: () => ({}),
    drawElementsInstanced: vi.fn(),
    drawArraysInstanced: vi.fn(),
    bufferData: vi.fn(),
  };
  return new Proxy(explicit, {
    get(target, prop: string) {
      if (prop in target) return target[prop];
      if (/^[A-Z][A-Z0-9_]*$/.test(prop)) return 0x1f01; // any GL enum
      const fn = vi.fn();
      target[prop] = fn; // stable identity per method
      return fn;
    },
  }) as unknown as FakeGL;
}

function stubContexts(gl: FakeGL | null, ctx2d: Record<string, unknown> | null): void {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(((kind: string) => {
    if (kind === 'webgl2') return gl as unknown as RenderingContext | null;
    if (kind === '2d') return ctx2d as unknown as RenderingContext | null;
    return null;
  }) as never);
}

function make2dStub(): Record<string, unknown> {
  return {
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
  };
}

class FakePath2D {
  moveTo(): void {}
  lineTo(): void {}
  closePath(): void {}
}

/** Flush effects, the sync query promise, and a couple of rAF frames. */
async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 80));
  });
}

const hudNumber = (container: HTMLElement, testId: string): number => {
  const text = container.querySelector(`[data-testid="${testId}"]`)?.textContent ?? '';
  return Number((text.match(/[\d,]+/) ?? ['0'])[0].replace(/,/g, ''));
};

// ---------------------------------------------------------------------------

describe('MapPage', () => {
  it('renders instanced draws through a WebGL2 context with the cut count', async () => {
    const gl = makeFakeGl();
    stubContexts(gl, null);
    const { container } = render(<MapPage forceSyncClient />);
    await settle();

    expect(container.querySelector('[data-testid="hud-mode"]')?.textContent).toBe('webgl2');
    const instances = hudNumber(container, 'hud-instances');
    expect(instances).toBeGreaterThan(0);

    // The engine cut is uploaded verbatim (3 instance buffers) and drawn as
    // ONE instanced call whose instanceCount is exactly the cut count. The
    // leaf pass vertex-pulls its per-type mesh, so it is drawArraysInstanced.
    expect(gl.bufferData).toHaveBeenCalled();
    expect(gl.drawArraysInstanced).toHaveBeenCalled();
    const lastDraw = gl.drawArraysInstanced.mock.calls.at(-1) as unknown[];
    expect(lastDraw[3]).toBe(instances);

    // Default zoom (36 px/unit) is past the outline threshold → 2 draw calls.
    expect(container.querySelector('[data-testid="hud-draw-ms"]')?.textContent).toContain(
      '2 calls',
    );
    // Depth indicator reflects the engine's ancestor level.
    expect(
      container.querySelector('[data-testid="hud-depth"]')?.textContent,
    ).toMatch(/depth ~\d+/u);
    expect(container.querySelector('[data-testid="map-unsupported"]')).toBeNull();
    expect(container.querySelector('[data-testid="map-fallback-note"]')).toBeNull();
  });

  it('draws far-zoom aggregates as glyphs in a single vertex-pulled call', async () => {
    window.history.replaceState(null, '', '/map.html#/map?seed=1&cx=0&cy=0&z=0.05&budget=50000');
    const gl = makeFakeGl();
    stubContexts(gl, null);
    const { container } = render(<MapPage forceSyncClient />);
    await settle();

    const instances = hudNumber(container, 'hud-instances');
    expect(instances).toBeGreaterThan(0);
    expect(container.querySelector('[data-testid="hud-cut"]')?.textContent).toContain('glyphs');
    expect(gl.drawArraysInstanced).toHaveBeenCalled();
    const lastDraw = gl.drawArraysInstanced.mock.calls.at(-1) as unknown[];
    expect(lastDraw[3]).toBe(instances); // instanceCount
    expect(container.querySelector('[data-testid="hud-draw-ms"]')?.textContent).toContain(
      '1 call',
    );
  });

  it('falls back to Canvas2D (with the cap notice) when WebGL2 is unavailable', async () => {
    (globalThis as Record<string, unknown>).Path2D = FakePath2D;
    const ctx2d = make2dStub();
    stubContexts(null, ctx2d);
    const { container } = render(<MapPage forceSyncClient />);
    await settle();

    expect(container.querySelector('[data-testid="hud-mode"]')?.textContent).toBe('canvas2d');
    expect(hudNumber(container, 'hud-instances')).toBeGreaterThan(0);
    const note = container.querySelector('[data-testid="map-fallback-note"]');
    expect(note?.textContent).toContain('Canvas2D');
    expect(note?.textContent).toContain('50,000');
    expect(ctx2d.fill).toHaveBeenCalled();
  });

  it('shows a static message when neither context exists', async () => {
    stubContexts(null, null);
    const { container } = render(<MapPage forceSyncClient />);
    await settle();

    expect(container.querySelector('[data-testid="map-unsupported"]')?.textContent).toContain(
      'WebGL2',
    );
    expect(container.querySelector('[data-testid="map-hud"]')).toBeNull();
    // Controls stay usable (the page renders, no crash).
    expect(container.querySelector('input[aria-label="World seed"]')).not.toBeNull();
    expect(container.querySelector('select[aria-label="Instance budget"]')).not.toBeNull();
  });

  it('refuses to record honestly where the browser cannot', async () => {
    // Bare jsdom: no MediaRecorder, no captureStream. The button must say why
    // instead of throwing or pretending.
    const gl = makeFakeGl();
    stubContexts(gl, null);
    const { container } = render(<MapPage forceSyncClient />);
    await settle();

    const button = container.querySelector('[data-testid="map-record"]') as HTMLButtonElement;
    expect(button.textContent).toContain('Record video');
    fireEvent.click(button);
    await settle();
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(
      container.querySelector('[data-testid="map-record-note"]')?.textContent,
    ).toContain('Recording unavailable');
  });

  it('records the canvas and saves a named movie on stop', async () => {
    // The recording pipeline, with the two browser pieces stood in for:
    // captureStream hands out a stub track, MediaRecorder emits one chunk on
    // stop. What is really under test is the wiring — negotiate, start, timer
    // state, stop, blob → named download.
    class FakeRecorder {
      static isTypeSupported = (t: string): boolean => t === 'video/webm;codecs=vp9';
      state = 'recording';
      ondataavailable: ((e: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      onerror: ((e: unknown) => void) | null = null;
      constructor(
        public stream: unknown,
        public options: { mimeType: string; videoBitsPerSecond: number },
      ) {}
      start(): void {}
      stop(): void {
        this.state = 'inactive';
        this.ondataavailable?.({ data: new Blob(['movie-bytes'], { type: 'video/webm' }) });
        this.onstop?.();
      }
    }
    (globalThis as Record<string, unknown>).MediaRecorder = FakeRecorder;
    const track = { stop: vi.fn() };
    (HTMLCanvasElement.prototype as unknown as Record<string, unknown>).captureStream = vi
      .fn()
      .mockReturnValue({ getTracks: () => [track] });
    const urls: string[] = [];
    URL.createObjectURL = vi.fn((blob: Blob | MediaSource) => {
      urls.push(String((blob as Blob).size));
      return 'blob:fake';
    });
    URL.revokeObjectURL = vi.fn();
    try {
      const gl = makeFakeGl();
      stubContexts(gl, null);
      const { container } = render(<MapPage forceSyncClient />);
      await settle();

      const button = container.querySelector('[data-testid="map-record"]') as HTMLButtonElement;
      fireEvent.click(button);
      await settle();
      expect(button.getAttribute('aria-pressed')).toBe('true');
      expect(button.textContent).toContain('Stop & save');

      fireEvent.click(button);
      await settle();
      expect(button.getAttribute('aria-pressed')).toBe('false');
      const note = container.querySelector('[data-testid="map-record-note"]')?.textContent ?? '';
      // Named by family, seed and stamp, with the negotiated extension.
      expect(note).toMatch(/Saved spectre-map-seed1-\d{8}-\d{6}\.webm/u);
      // The movie really went to the browser's download machinery…
      expect(urls.length).toBe(1);
      // …and the capture stream was released.
      expect(track.stop).toHaveBeenCalled();
      // downloadBlob revokes its object URL on a 1 s timer; let that fire
      // while the stub still exists, or the revoke crashes a later test.
      await act(async () => {
        await new Promise((r) => setTimeout(r, 1100));
      });
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake');
    } finally {
      delete (globalThis as Record<string, unknown>).MediaRecorder;
      delete (HTMLCanvasElement.prototype as unknown as Record<string, unknown>).captureStream;
      delete (URL as unknown as Record<string, unknown>).createObjectURL;
      delete (URL as unknown as Record<string, unknown>).revokeObjectURL;
    }
  });

  it('reproduces a deep link and mirrors reseeding back into the hash', async () => {
    window.history.replaceState(
      null,
      '',
      '/map.html#/map?seed=7&cx=120.5&cy=-33.25&z=12&budget=250000',
    );
    const gl = makeFakeGl();
    stubContexts(gl, null);
    const { container } = render(<MapPage forceSyncClient />);
    await settle();

    const seedInput = container.querySelector(
      'input[aria-label="World seed"]',
    ) as HTMLInputElement;
    expect(seedInput.value).toBe('7');
    const budgetSelect = container.querySelector(
      'select[aria-label="Instance budget"]',
    ) as HTMLSelectElement;
    expect(budgetSelect.value).toBe('250000');
    // The 250k+ caution note is visible.
    expect(container.querySelector('.map-caution')).not.toBeNull();
    expect(hudNumber(container, 'hud-instances')).toBeGreaterThan(0);

    // Reseed → world regenerates and the hash follows (debounced).
    fireEvent.change(seedInput, { target: { value: '42' } });
    fireEvent.submit(seedInput.closest('form') as HTMLFormElement);
    await settle();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 450));
    });
    expect(window.location.hash).toContain('seed=42');
    expect(window.location.hash).toContain('#/map');
    expect(hudNumber(container, 'hud-instances')).toBeGreaterThan(0);
  });

  /** Draw calls the HUD reports, e.g. `draw 0.2 ms · 5 calls` -> 5. */
  const drawCalls = (container: HTMLElement): number => {
    const text = container.querySelector('[data-testid="hud-draw-ms"]')?.textContent ?? '';
    return Number((text.match(/(\d+) calls/u) ?? ['', '0'])[1]);
  };

  it('draws strand lines as an extra instanced pass when they are switched on', async () => {
    // Lines default OFF, so the map opens as bare tiles (2 calls at this zoom).
    const gl = makeFakeGl();
    stubContexts(gl, null);
    const { container } = render(<MapPage forceSyncClient />);
    await settle();
    expect(container.querySelector('[data-testid="hud-lines"]')?.textContent).toBe('lines: off');
    const bare = drawCalls(container);
    expect(bare).toBe(2);

    const toggle = container.querySelector(
      'input[aria-label="Show strand lines"]',
    ) as HTMLInputElement;
    fireEvent.click(toggle);
    await settle();

    // At least one more pass for the chords (find-all, on by default, adds its
    // own on top), and the HUD reports real chords for the default rule.
    expect(drawCalls(container)).toBeGreaterThan(bare);
    const lines = container.querySelector('[data-testid="hud-lines"]')?.textContent ?? '';
    expect(lines).toMatch(/lines: [\d,]+ chords \(\d+\/tile\)/u);
    expect(Number((lines.match(/[\d,]+/) ?? ['0'])[0].replace(/,/g, ''))).toBeGreaterThan(0);
    // …and the chord table went to the GPU as a float texture.
    expect(gl.texImage2D).toHaveBeenCalled();
  });

  it('hides lines (honestly) at an aggregate LOD cut', async () => {
    window.history.replaceState(
      null,
      '',
      '/map.html#/map?seed=1&cx=0&cy=0&z=0.05&budget=50000&ln=1&e=2578&c=0100101100',
    );
    const gl = makeFakeGl();
    stubContexts(gl, null);
    const { container } = render(<MapPage forceSyncClient />);
    await settle();

    expect(container.querySelector('[data-testid="hud-cut"]')?.textContent).toContain('glyphs');
    expect(container.querySelector('[data-testid="hud-lines"]')?.textContent).toContain(
      'hidden (aggregate LOD',
    );
    expect(container.querySelector('[data-testid="hud-draw-ms"]')?.textContent).toContain(
      '1 call',
    );
  });

  it('mirrors the strand rule into the hash and reads it back', async () => {
    window.history.replaceState(
      null,
      '',
      '/map.html#/map?seed=1&cx=0&cy=0&z=36&budget=100000&ln=1&e=023678&c=0001000010',
    );
    const gl = makeFakeGl();
    stubContexts(gl, null);
    const { container } = render(<MapPage forceSyncClient />);
    await settle();

    expect(
      (container.querySelector('input[aria-label="Show strand lines"]') as HTMLInputElement)
        .checked,
    ).toBe(true);
    expect(
      (container.querySelector('input[aria-label="Combination string"]') as HTMLInputElement).value,
    ).toBe('0001000010');
    expect(drawCalls(container)).toBeGreaterThan(2); // the chords are drawing

    fireEvent.change(
      container.querySelector('input[aria-label="Combination string"]') as HTMLInputElement,
      { target: { value: '1410001000' } },
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 500));
    });
    expect(window.location.hash).toContain('c=1410001000');
    expect(window.location.hash).toContain('ln=1');
  });

  it('offers tap-to-trace alongside the lines, and remembers switching it off', async () => {
    window.history.replaceState(
      null,
      '',
      '/map.html#/map?seed=1&cx=0&cy=0&z=36&budget=100000&ln=1&e=2578&c=0100101100',
    );
    const gl = makeFakeGl();
    stubContexts(gl, null);
    const { container } = render(<MapPage forceSyncClient />);
    await settle();

    const toggle = container.querySelector('[data-testid="map-trace"]') as HTMLInputElement;
    expect(toggle.checked).toBe(true); // on by default: a tap is the whole gesture
    expect(toggle.disabled).toBe(false);
    expect(container.querySelector('[data-testid="hud-trace"]')?.textContent).toBe(
      'traced: tap a strand',
    );
    // Nothing traced yet, so there is nothing to clear.
    expect(container.querySelector('[data-testid="map-trace-clear"]')).toHaveProperty(
      'disabled',
      true,
    );

    fireEvent.click(toggle);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 500));
    });
    expect(container.querySelector('[data-testid="hud-trace"]')?.textContent).toBe('traced: off');
    expect(window.location.hash).toContain('tr=0');
  });

  it('has nothing to trace while the lines are off', async () => {
    const gl = makeFakeGl();
    stubContexts(gl, null);
    const { container } = render(<MapPage forceSyncClient />);
    await settle();

    expect(container.querySelector('[data-testid="map-trace"]')).toHaveProperty('disabled', true);
    expect(container.querySelector('[data-testid="hud-trace"]')?.textContent).toBe('traced: off');
    // Default links stay byte-identical: the default is ON, so nothing is written.
    expect(window.location.hash).not.toContain('tr=');
  });

  it('applies external hash changes (back/forward) to seed and camera', async () => {
    const gl = makeFakeGl();
    stubContexts(gl, null);
    const { container } = render(<MapPage forceSyncClient />);
    await settle();

    await act(async () => {
      window.location.hash = '#/map?seed=9&cx=50&cy=60&z=20&budget=100000';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      await new Promise((r) => setTimeout(r, 80));
    });
    const seedInput = container.querySelector(
      'input[aria-label="World seed"]',
    ) as HTMLInputElement;
    expect(seedInput.value).toBe('9');
    const api = (
      window as unknown as {
        __SPECTRE_MAP?: { getCamera(): { cx: number; cy: number; scale: number } };
      }
    ).__SPECTRE_MAP;
    expect(api).toBeDefined();
    expect(api?.getCamera().cx).toBeCloseTo(50, 6);
    expect(api?.getCamera().scale).toBeCloseTo(20, 6);
  });
});

describe('MapPage — tile families', () => {
  it('reproduces an f=hex deep link: hex world, hex selector, hex help text', async () => {
    window.history.replaceState(null, '', '/map.html#/map?seed=1&f=hex&cx=0&cy=0&z=36');
    const gl = makeFakeGl();
    stubContexts(gl, null);
    const { container } = render(<MapPage forceSyncClient />);
    await settle();

    const select = container.querySelector('[data-testid="map-family"]') as HTMLSelectElement;
    expect(select.value).toBe('hex');
    expect(hudNumber(container, 'hud-instances')).toBeGreaterThan(0);
    // The combo input speaks 9 digits for hex (single Gamma, no Gamma1/2).
    const comboInput = container.querySelector('.map-combo-input') as HTMLInputElement;
    expect(comboInput.maxLength).toBe(9);
    expect(comboInput.value).toHaveLength(9);
    expect(container.textContent).toContain('Hexagons');
  });

  it('switching family updates the URL and requeries the new world', async () => {
    const gl = makeFakeGl();
    stubContexts(gl, null);
    const { container } = render(<MapPage forceSyncClient />);
    await settle();
    const before = hudNumber(container, 'hud-instances');
    expect(before).toBeGreaterThan(0);

    const select = container.querySelector('[data-testid="map-family"]') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'turtle' } });
    await settle();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 450)); // the debounced URL write
    });

    expect(window.location.hash).toContain('f=turtle');
    // Turtle tiles are larger, so the same viewport holds fewer of them.
    const after = hudNumber(container, 'hud-instances');
    expect(after).toBeGreaterThan(0);
    expect(after).not.toBe(before);
  });
});

describe('MapPage — viewport tools (stats toggle, fullscreen)', () => {
  it('hides the stats overlay from the in-viewport toggle and remembers it in the URL', async () => {
    const gl = makeFakeGl();
    stubContexts(gl, null);
    const { container } = render(<MapPage forceSyncClient />);
    await settle();

    expect(container.querySelector('[data-testid="map-hud"]')).not.toBeNull();
    const toggle = container.querySelector('[data-testid="tools-stats"]') as HTMLButtonElement;
    expect(toggle.textContent).toBe('Hide stats');

    fireEvent.click(toggle);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 500)); // the debounced URL write
    });
    expect(container.querySelector('[data-testid="map-hud"]')).toBeNull();
    expect(toggle.textContent).toBe('Show stats');
    expect(window.location.hash).toContain('hd=0');

    fireEvent.click(toggle);
    await settle();
    expect(container.querySelector('[data-testid="map-hud"]')).not.toBeNull();
  });

  it('reproduces an hd=0 deep link with the overlay hidden', async () => {
    window.history.replaceState(null, '', '/map.html#/map?seed=1&cx=0&cy=0&z=36&hd=0');
    const gl = makeFakeGl();
    stubContexts(gl, null);
    const { container } = render(<MapPage forceSyncClient />);
    await settle();

    expect(container.querySelector('[data-testid="map-hud"]')).toBeNull();
    expect(hudNumber(container, 'hud-instances')).toBe(0); // truly not rendered
    expect(
      (container.querySelector('[data-testid="tools-stats"]') as HTMLButtonElement).textContent,
    ).toBe('Show stats');
  });

  it('offers no fullscreen button where the API cannot fullscreen a div', async () => {
    // Bare jsdom: no document.fullscreenEnabled. An inert button would lie.
    const gl = makeFakeGl();
    stubContexts(gl, null);
    const { container } = render(<MapPage forceSyncClient />);
    await settle();
    expect(container.querySelector('[data-testid="tools-fullscreen"]')).toBeNull();
  });

  it('fullscreens the viewport host and follows entry/exit through the events', async () => {
    const requested = vi.fn(() => Promise.resolve());
    const exited = vi.fn(() => Promise.resolve());
    Object.defineProperty(document, 'fullscreenEnabled', { value: true, configurable: true });
    let fsElement: Element | null = null;
    Object.defineProperty(document, 'fullscreenElement', {
      get: () => fsElement,
      configurable: true,
    });
    (document as unknown as Record<string, unknown>).exitFullscreen = exited;
    (HTMLElement.prototype as unknown as Record<string, unknown>).requestFullscreen = requested;
    try {
      const gl = makeFakeGl();
      stubContexts(gl, null);
      const { container } = render(<MapPage forceSyncClient />);
      await settle();

      const button = container.querySelector(
        '[data-testid="tools-fullscreen"]',
      ) as HTMLButtonElement;
      expect(button.textContent).toContain('Full screen');

      fireEvent.click(button);
      expect(requested).toHaveBeenCalledTimes(1);
      // The element asked to fill the screen is the canvas host itself.
      expect(requested.mock.contexts[0]).toBe(container.querySelector('.map-viewport'));

      // The browser says we are in: the button becomes the way back out.
      fsElement = container.querySelector('.map-viewport');
      await act(async () => {
        document.dispatchEvent(new Event('fullscreenchange'));
      });
      expect(button.textContent).toBe('Exit full screen');
      fireEvent.click(button);
      expect(exited).toHaveBeenCalledTimes(1);

      fsElement = null;
      await act(async () => {
        document.dispatchEvent(new Event('fullscreenchange'));
      });
      expect(button.textContent).toContain('Full screen');
    } finally {
      delete (document as unknown as Record<string, unknown>).exitFullscreen;
      delete (HTMLElement.prototype as unknown as Record<string, unknown>).requestFullscreen;
      Reflect.deleteProperty(document, 'fullscreenEnabled');
      Reflect.deleteProperty(document, 'fullscreenElement');
    }
  });

  it('mirrors Record in the cluster, honest about an environment that cannot', async () => {
    const gl = makeFakeGl();
    stubContexts(gl, null);
    const { container } = render(<MapPage forceSyncClient />);
    await settle();

    const button = container.querySelector('[data-testid="tools-record"]') as HTMLButtonElement;
    expect(button.textContent).toBe('● Rec');
    fireEvent.click(button); // same control as the header button — same refusal
    await settle();
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(
      container.querySelector('[data-testid="map-record-note"]')?.textContent,
    ).toContain('Recording unavailable');
  });
});
