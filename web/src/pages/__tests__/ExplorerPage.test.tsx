// @vitest-environment jsdom
/**
 * Explorer page contract (DESIGN.md §7.1). These are structural smoke tests:
 * the scene renders, every §7.1 control is present and wired to the reducer,
 * deep links reproduce the scene, and edits mirror back into the hash.
 *
 * Geometry, matching and circuit correctness are covered by the core/lib
 * suites; what can only break here is the wiring.
 */
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import ExplorerPage from '../ExplorerPage';
import { leafOrder } from '../../core';

afterEach(cleanup);
beforeEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('ExplorerPage', () => {
  it('renders the sidebar controls and a tiling SVG', () => {
    const { container } = render(<ExplorerPage />);

    expect(container.querySelector('.explorer-sidebar')).not.toBeNull();
    const svg = container.querySelector('svg.tiling-view');
    expect(svg).not.toBeNull();
    // Default state is spectre / Delta / level 2 = 71 tiles (§5.3).
    expect(svg?.getAttribute('data-level')).toBe('2');
    expect(svg?.getAttribute('data-tile-count')).toBe('71');

    // §7.1 controls: family, root tile, level stepper, edge rule, display,
    // colours, share, analysis.
    expect(container.querySelector('select[aria-label="Tile family"]')).not.toBeNull();
    expect(container.querySelector('select[aria-label="Root tile"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="level-value"]')?.textContent).toBe('2');
    expect(container.querySelector('.edge-subset-picker')).not.toBeNull();
    expect(container.querySelector('.display-toggles')).not.toBeNull();
    expect(container.querySelector('.color-scheme-picker')).not.toBeNull();
    expect(container.querySelector('.share-panel')).not.toBeNull();
    expect(container.querySelector('.stats-summary')).not.toBeNull();
    expect(container.querySelector('.explorer-advanced')).not.toBeNull();
  });

  it('steps the supertile level and re-renders the patch', () => {
    const { container } = render(<ExplorerPage />);
    fireEvent.click(container.querySelector('button[aria-label="More supertiles"]') as Element);
    const svg = container.querySelector('svg.tiling-view');
    expect(svg?.getAttribute('data-level')).toBe('3');
    expect(svg?.getAttribute('data-tile-count')).toBe('559');
  });

  it('reproduces a deep-linked scene, including per-tile matchings', () => {
    // §9.2 wire format: rule 2578, level 1, hex-free spectre combo.
    window.history.replaceState(null, '', '/#/explorer?v=1&f=spectre&lv=1&e=2578&c=0100000000');
    const { container } = render(<ExplorerPage />);

    expect(container.querySelector('svg.tiling-view')?.getAttribute('data-level')).toBe('1');
    // Every leaf type has connection points under 2578, so every editor shows.
    expect(container.querySelectorAll('.matching-slider')).toHaveLength(
      leafOrder('spectre').length,
    );
    expect(container.querySelector('.combo-readout code')?.textContent).toBe('2578-0100000000');
  });

  it('mirrors edits into the hash after the debounce', async () => {
    window.history.replaceState(null, '', '/#/explorer?v=1');
    const { container } = render(<ExplorerPage />);

    const chip = container.querySelector('.edge-legend .edge-chip[data-major="5"]');
    fireEvent.click(chip as Element);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 400));
    });
    expect(window.location.hash).toContain('#/explorer');
    expect(window.location.hash).toContain('e=5');
  });

  it('switches renderer above the SVG budget', () => {
    window.history.replaceState(null, '', '/#/explorer?v=1&lv=5');
    const { container } = render(<ExplorerPage />);
    expect(container.querySelector('svg.tiling-view')).toBeNull();
    expect(container.querySelector('.tiling-canvas')).not.toBeNull();
    expect(container.querySelector('.warning-badge')?.textContent).toContain('canvas');
  });

  it('switching family reshapes the matching editors (hex has 9 leaves)', () => {
    window.history.replaceState(null, '', '/#/explorer?v=1&e=15');
    const { container } = render(<ExplorerPage />);
    const before = container.querySelectorAll('.matching-slider').length;
    expect(before).toBeGreaterThan(0);

    fireEvent.change(container.querySelector('select[aria-label="Tile family"]') as Element, {
      target: { value: 'hex' },
    });
    expect(container.querySelector('select[aria-label="Tile family"]')).toHaveProperty(
      'value',
      'hex',
    );
    // Hex tiles carry different classes, so the editor set changes shape.
    expect(container.querySelectorAll('.matching-slider').length).toBeLessThanOrEqual(9);
  });

  it('draws overlay chords on every instance of a tile type', () => {
    // `ov=Delta:0-2` — one chord between Delta's first and third seams (§9.2).
    window.history.replaceState(null, '', '/#/explorer?v=1&lv=1&ov=Delta:0-2');
    const { container } = render(<ExplorerPage />);

    const layer = container.querySelector('.tiling-overlays');
    expect(layer).not.toBeNull();
    expect(layer?.querySelector('defs path')?.getAttribute('d')).toMatch(/^M .* L /);
    // Level 1 has one Delta per supertile child slot; each gets a <use>.
    expect(layer?.querySelectorAll('use').length).toBeGreaterThan(0);
  });

  it('offers the overlay tools and mounts the drawing palette on demand', () => {
    const { container } = render(<ExplorerPage />);
    expect(container.querySelector('.tile-palette')).toBeNull();
    const line = [...container.querySelectorAll('.tool-row button')].find(
      (b) => b.textContent === 'Straight line',
    );
    fireEvent.click(line as Element);
    expect(container.querySelector('.tile-palette')).not.toBeNull();
  });

  it('analyses the patch and reports circuits for a valid rule', () => {
    // Level 1 runs synchronously (below the worker threshold), so the result is
    // available on the first render pass.
    window.history.replaceState(null, '', '/#/explorer?v=1&lv=1&e=15');
    const { container } = render(<ExplorerPage />);
    const figures = container.querySelector('.stats-figures')?.textContent ?? '';
    expect(figures).toContain('Circuits');
    expect(container.querySelectorAll('.circuit-path').length).toBeGreaterThan(0);
  });
});

/**
 * Infinite mode (BIGMAP stage 3): the un-rooted engine + map renderer embedded
 * in the Explorer viewport. jsdom has no GL and no layout, so what is asserted
 * here is the WIRING — mode in the URL, the rooted patch gone, analysis
 * honestly unavailable, the family restriction — not pixels.
 */
describe('ExplorerPage — infinite mode', () => {
  it('swaps the rooted patch for the un-rooted viewport', () => {
    window.history.replaceState(null, '', '/#/explorer?v=1&lv=3&e=2578&md=infinite');
    const { container } = render(<ExplorerPage />);

    expect(container.querySelector('.explorer-infinite')).not.toBeNull();
    expect(container.querySelector('[data-testid="explorer-infinite-hud"]')).not.toBeNull();
    // No rooted patch is built at all.
    expect(container.querySelector('svg.tiling-view')).toBeNull();
    expect(container.querySelector('.tiling-canvas')).toBeNull();
    // Root tile is meaningless without a root.
    expect(container.querySelector('select[aria-label="Root tile"]')).toHaveProperty(
      'disabled',
      true,
    );
    expect(container.querySelector('.viewport-caption')?.textContent).toContain('infinite plane');
  });

  it('says analysis needs a rooted patch, and offers the way back', () => {
    window.history.replaceState(null, '', '/#/explorer?v=1&e=2578&md=infinite');
    const { container } = render(<ExplorerPage />);

    const note = container.querySelector('[data-testid="analysis-unavailable"]');
    expect(note?.textContent).toContain('needs a rooted patch');
    expect(container.querySelector('.stats-summary')).toBeNull();

    fireEvent.click(note?.querySelector('button') as Element);
    expect(container.querySelector('.explorer-infinite')).toBeNull();
    expect(container.querySelector('svg.tiling-view')).not.toBeNull();
    expect(container.querySelector('.stats-summary')).not.toBeNull();
  });

  it('keeps the mode in the hash', async () => {
    window.history.replaceState(null, '', '/#/explorer?v=1&e=2578');
    const { container } = render(<ExplorerPage />);
    fireEvent.click(container.querySelector('[data-testid="mode-infinite"]') as Element);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 400));
    });
    expect(window.location.hash).toContain('md=infinite');
  });

  it('offers tap-to-trace in infinite mode only, and keeps the choice in the hash', async () => {
    window.history.replaceState(null, '', '/#/explorer?v=1&e=2578&md=infinite');
    const { container } = render(<ExplorerPage />);

    const toggle = container.querySelector('[data-testid="trace-toggle"]') as HTMLInputElement;
    expect(toggle.checked).toBe(true); // default ON — tapping is the gesture
    expect(toggle.disabled).toBe(false);
    expect(container.querySelector('[data-testid="trace-clear"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="inf-trace"]')?.textContent).toBe(
      'traced: tap a strand',
    );

    fireEvent.click(toggle);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 400));
    });
    expect(window.location.hash).toContain('tc=0');
    expect(container.querySelector('[data-testid="inf-trace"]')?.textContent).toBe('traced: off');
  });

  it('explains that tracing belongs to the infinite view, not the rooted patch', () => {
    window.history.replaceState(null, '', '/#/explorer?v=1&e=2578');
    const { container } = render(<ExplorerPage />);

    expect(container.querySelector('[data-testid="trace-toggle"]')).toHaveProperty(
      'disabled',
      true,
    );
    expect(container.querySelector('[data-testid="trace-clear"]')).toBeNull();
    expect(container.querySelector('#explorer-sidebar')?.textContent).toContain(
      'belongs to infinite mode',
    );
  });

  it('goes past the rooted materialize ceiling without clamping or building', () => {
    // Level 9 is 133M tiles; the rooted view clamps to 7 and says so, while
    // infinite mode simply zooms there. (Deliberately NOT exercising the
    // rooted lv>7 path in jsdom: materializing a 2.1M-tile patch is what the
    // ceiling exists to warn about.)
    window.history.replaceState(null, '', '/#/explorer?v=1&lv=9&e=2578&md=infinite');
    const { container } = render(<ExplorerPage />);
    expect(container.querySelector('[data-testid="level-value"]')?.textContent).toBe('9');
    expect(container.querySelector('.explorer-infinite')).not.toBeNull();
    expect(container.querySelector('svg.tiling-view')).toBeNull();
    expect(container.querySelector('.tiling-canvas')).toBeNull();
    expect(container.querySelector('[data-testid="switch-to-infinite"]')).toBeNull();
    expect(container.querySelector('#explorer-sidebar')?.textContent).toContain(
      'zoom preset',
    );
  });

  it('is unavailable for families the un-rooted engine cannot generate', () => {
    window.history.replaceState(null, '', '/#/explorer?v=1&f=hex');
    const { container } = render(<ExplorerPage />);
    expect(container.querySelector('[data-testid="mode-infinite"]')).toHaveProperty(
      'disabled',
      true,
    );
    expect(container.querySelector('#explorer-sidebar')?.textContent).toContain(
      'only generates',
    );
  });
});
