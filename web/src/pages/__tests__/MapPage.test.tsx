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

  it('draws strand lines as a third instanced pass when they are switched on', async () => {
    // Lines default OFF, so the map opens as bare tiles (2 calls at this zoom).
    const gl = makeFakeGl();
    stubContexts(gl, null);
    const { container } = render(<MapPage forceSyncClient />);
    await settle();
    expect(container.querySelector('[data-testid="hud-lines"]')?.textContent).toBe('lines: off');
    expect(container.querySelector('[data-testid="hud-draw-ms"]')?.textContent).toContain(
      '2 calls',
    );

    const toggle = container.querySelector(
      'input[aria-label="Show strand lines"]',
    ) as HTMLInputElement;
    fireEvent.click(toggle);
    await settle();

    // Third draw call, and the HUD reports real chords for the default rule.
    expect(container.querySelector('[data-testid="hud-draw-ms"]')?.textContent).toContain(
      '3 calls',
    );
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
    expect(container.querySelector('[data-testid="hud-draw-ms"]')?.textContent).toContain(
      '3 calls',
    );

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
