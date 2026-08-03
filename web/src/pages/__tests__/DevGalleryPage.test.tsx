// @vitest-environment jsdom
/**
 * Smoke test for the dev harness: every widget of §6 mounts together, the
 * explorer store seeds from the URL, and edits flow back into the hash.
 */
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import DevGalleryPage from '../DevGalleryPage';
import { leafOrder } from '../../core';

afterEach(cleanup);
beforeEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('DevGalleryPage', () => {
  it('mounts every widget without throwing', () => {
    const { container } = render(<DevGalleryPage />);
    for (const id of [
      'tiling',
      'canvas',
      'tileview',
      'legend',
      'palette',
      'matchings',
      'seam',
    ]) {
      expect(container.querySelector(`#${id}`), id).not.toBeNull();
    }
    expect(container.querySelectorAll('.tile-view').length).toBeGreaterThan(0);
    expect(container.querySelector('.tiling-view')).not.toBeNull();
    expect(container.querySelector('.tiling-canvas')).not.toBeNull();
    expect(container.querySelector('.seam-view')).not.toBeNull();
    expect(container.querySelectorAll('.tile-palette-cell')).toHaveLength(
      leafOrder('spectre').length,
    );
  });

  it('seeds its state from the hash', () => {
    window.history.replaceState(null, '', '/#/dev?v=1&e=2578&lv=1');
    const { container } = render(<DevGalleryPage />);
    const svg = container.querySelector('.tiling-view');
    expect(svg?.getAttribute('data-level')).toBe('1');
    // Subset 2578 gives every leaf type connection dots, hence matching sliders.
    expect(container.querySelectorAll('.matching-slider').length).toBeGreaterThan(0);
  });

  it('mirrors edits back into the hash (debounced)', async () => {
    window.history.replaceState(null, '', '/#/dev?v=1');
    const { container } = render(<DevGalleryPage />);
    const chip = container.querySelector('.edge-legend .edge-chip[data-major="5"]');
    expect(chip).not.toBeNull();

    fireEvent.click(chip as Element);
    expect(container.querySelector('.gallery-header code')?.textContent).toContain('e=5');

    await act(async () => {
      await new Promise((r) => setTimeout(r, 400));
    });
    expect(window.location.hash).toContain('e=5');
  });

  it('switching family reshapes the palette (hex has 9 leaves)', () => {
    const { container } = render(<DevGalleryPage />);
    const select = container.querySelector('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'hex' } });
    expect(container.querySelectorAll('.tile-palette-cell')).toHaveLength(9);
  });
});
