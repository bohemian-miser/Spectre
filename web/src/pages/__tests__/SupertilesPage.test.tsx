// @vitest-environment jsdom
/**
 * The Supertiles page. jsdom has no layout, so what is asserted here is the
 * WIRING — controls change the scene, the scene reports what it drew, the hash
 * round-trips — not pixels.
 */
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import SupertilesPage from '../SupertilesPage';

const hash = (): string => window.location.hash;

/** The page defers its layout, so let React flush the deferred pass. */
const settle = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve();
  });
};

beforeEach(() => {
  window.history.replaceState(null, '', '/');
});

afterEach(() => {
  cleanup();
});

describe('SupertilesPage', () => {
  it('takes the default supertile apart into the pieces its rule names', async () => {
    const { container } = render(<SupertilesPage />);
    await settle();

    const svg = container.querySelector('.supertile-view') as SVGElement;
    expect(svg).not.toBeNull();
    // Delta has eight slots, and every one of them is drawn.
    expect(svg.getAttribute('data-piece-count')).toBe('8');
    expect(container.querySelectorAll('.supertile-island')).toHaveLength(8);
    // The rule is spelled out next to the picture.
    const rule = container.querySelector('[data-testid="st-rule"]')?.textContent ?? '';
    expect(rule).toContain('Delta');
    expect(rule).toContain('Sigma');
  });

  it('reports the piece and tile counts it actually drew', async () => {
    const { container } = render(<SupertilesPage />);
    await settle();
    expect(container.querySelector('[data-testid="st-pieces"]')?.textContent).toBe('8 pieces');
    // A level-3 Delta supertile is 559 spectres.
    expect(container.querySelector('[data-testid="st-tiles-count"]')?.textContent).toBe('559 tiles');
    expect(container.querySelector('[data-testid="st-detail"]')?.textContent).toContain(
      'every tile',
    );
  });

  it('changes level, and one step is one substitution round', async () => {
    const { container } = render(<SupertilesPage />);
    await settle();
    const before = Number(
      (container.querySelector('.supertile-view') as SVGElement).getAttribute('data-tile-count'),
    );

    fireEvent.change(container.querySelector('[data-testid="st-level"]') as Element, {
      target: { value: '4' },
    });
    await settle();

    const after = Number(
      (container.querySelector('.supertile-view') as SVGElement).getAttribute('data-tile-count'),
    );
    expect(before).toBe(559);
    expect(after).toBe(4401); // the next substitution round
    expect(container.querySelector('[data-testid="st-level-value"]')?.textContent).toBe('4');
  });

  it('drops to outlines when the tile count outruns the drawing budget', async () => {
    window.history.replaceState(null, '', '/#/supertiles?lv=5');
    const { container } = render(<SupertilesPage />);
    await settle();

    const svg = container.querySelector('.supertile-view') as SVGElement;
    expect(svg.getAttribute('data-tiles-drawn')).toBe('no');
    expect(container.querySelector('[data-testid="st-detail"]')?.textContent).toContain(
      'outlines only',
    );
    // The pieces are still there — only the spectres inside them are not.
    expect(container.querySelectorAll('.supertile-island')).toHaveLength(8);
    expect(container.querySelectorAll('.supertile-island use')).toHaveLength(0);
  });

  it('separates the pieces of the pieces as nesting deepens', async () => {
    const { container } = render(<SupertilesPage />);
    await settle();
    expect(container.querySelectorAll('.supertile-island')).toHaveLength(8);

    fireEvent.change(container.querySelector('[data-testid="st-depth"]') as Element, {
      target: { value: '2' },
    });
    await settle();
    expect(container.querySelectorAll('.supertile-island').length).toBeGreaterThan(50);
  });

  it('switches flavour, and Gamma shows its seven pieces', async () => {
    const { container } = render(<SupertilesPage />);
    await settle();

    fireEvent.change(container.querySelector('[data-testid="st-flavour"]') as Element, {
      target: { value: 'Gamma' },
    });
    await settle();
    expect(container.querySelectorAll('.supertile-island')).toHaveLength(7);
  });

  it('reproduces a deep link and mirrors changes back into the hash', async () => {
    window.history.replaceState(null, '', '/#/supertiles?t=Psi&lv=2&gap=0.9&d=1&lb=0');
    const { container } = render(<SupertilesPage />);
    await settle();

    expect((container.querySelector('[data-testid="st-flavour"]') as HTMLSelectElement).value).toBe(
      'Psi',
    );
    expect(container.querySelector('[data-testid="st-gap-value"]')?.textContent).toBe('0.90');
    expect(container.querySelector('.supertile-labels')).toBeNull();

    fireEvent.change(container.querySelector('[data-testid="st-gap"]') as Element, {
      target: { value: '0.5' },
    });
    await settle();
    // The write is debounced; wait it out.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 600));
    });
    expect(hash()).toContain('gap=0.5');
    expect(hash()).toContain('t=Psi');
  });

  it('says nothing in the URL while everything is at its default', async () => {
    render(<SupertilesPage />);
    await settle();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 600));
    });
    expect(hash()).toBe('#/supertiles');
  });
});
