// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CentreMapPage from '../CentreMapPage';

describe('CentreMapPage', () => {
  beforeEach(() => {
    localStorage.clear();
    // jsdom has no canvas; the heatmap and thumbnails just need somewhere to draw.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((() => ({
      createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
      putImageData: () => {},
      clearRect: () => {},
    })) as unknown as typeof HTMLCanvasElement.prototype.getContext);
    if (typeof globalThis.PointerEvent === 'undefined') {
      (globalThis as unknown as { PointerEvent: unknown }).PointerEvent = class extends MouseEvent {
        pointerId = 1;
      };
    }
    if (typeof globalThis.ImageData === 'undefined') {
      (globalThis as unknown as { ImageData: unknown }).ImageData = class {
        constructor(public data: Uint8ClampedArray, public width: number, public height: number) {}
      };
    }
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('compares all 270 Spectre pairings, lays them out, and searches them', async () => {
    render(<CentreMapPage />);
    fireEvent.change(screen.getByTestId('centremap-level'), { target: { value: '4' } });
    const start = screen.getByTestId('centremap-start');
    expect(start.textContent).toBe('Compare 270 pairings');
    // A cap per rule samples the big rules; the all-edges rule joins only on request.
    fireEvent.change(screen.getByTestId('centremap-max'), { target: { value: '20' } });
    expect(start.textContent).toBe('Compare 74 pairings'); // 4 + 2 + 8 + 20 + 20 + 20
    fireEvent.click(screen.getByTestId('centremap-all-edges'));
    expect(start.textContent).toBe('Compare 94 pairings');
    expect(screen.getByText(/01235678 \(20 of 625,000, sampled\)/)).toBeTruthy();
    fireEvent.click(screen.getByTestId('centremap-all-edges'));
    fireEvent.change(screen.getByTestId('centremap-max'), { target: { value: '200' } });
    expect(start.textContent).toBe('Compare 270 pairings');
    fireEvent.click(start);
    await waitFor(() => expect(screen.getByTestId('centremap-summary')).toBeTruthy(), { timeout: 60000 });
    expect(screen.getByTestId('centremap-summary').textContent).toMatch(/^270 pairings at level 4/);

    const dots = screen.getByTestId('centremap-umap').querySelectorAll('circle');
    expect(dots).toHaveLength(270);
    // Hovering a dot names its pairing.
    fireEvent.mouseEnter(dots[0]);
    expect(screen.getByTestId('centremap-hover').textContent).toMatch(/^\d+ · [0-9a-z]{10}$/);

    // Rule plus wildcard pattern.
    fireEvent.change(screen.getByTestId('centremap-rule'), { target: { value: '0356' } });
    expect(screen.getByTestId('centremap-matches').textContent).toBe('8 of 270 match');
    fireEvent.change(screen.getByTestId('centremap-pattern'), { target: { value: '1' } });
    expect(screen.getByTestId('centremap-matches').textContent).toBe('4 of 270 match');
    fireEvent.change(screen.getByTestId('centremap-rule'), { target: { value: '' } });
    fireEvent.change(screen.getByTestId('centremap-pattern'), { target: { value: '' } });
    expect(screen.getByTestId('centremap-matches').textContent).toBe('Showing all');

    // A join: Theta, its edges 9 and 10 are both class 0, so only rules with class 0 can match.
    fireEvent.click(screen.getByLabelText('Next tile'));
    expect(screen.getByTestId('join-picker-type').textContent).toBe('Theta');
    const edges = screen.getByTestId('join-picker').querySelectorAll('.join-picker-edge');
    const classOf = (i: number) => edges[i].getAttribute('data-major');
    const zeros = [...edges].map((_, i) => i).filter((i) => classOf(i) === '0');
    const threes = [...edges].map((_, i) => i).filter((i) => classOf(i) === '3');
    fireEvent.click(edges[zeros[0]]);
    fireEvent.click(edges[threes[0]]);
    expect(screen.getByTestId('join-picker-joins').textContent).toMatch(/Theta [03]–[03]/);
    const m = screen.getByTestId('centremap-matches').textContent!.match(/^(\d+) of 270 match$/);
    expect(m).not.toBeNull();
    expect(Number(m![1])).toBeGreaterThan(0);
    expect(Number(m![1])).toBeLessThan(270);

    // The heatmap can be reordered: similar rows together (the default), by group, or rule by rule.
    expect((screen.getByTestId('centremap-order') as HTMLSelectElement).value).toBe('similar');
    fireEvent.change(screen.getByTestId('centremap-order'), { target: { value: 'rule' } });
    fireEvent.change(screen.getByTestId('centremap-order'), { target: { value: 'groups' } });
    // Columns sort on their own, e.g. by combination string.
    fireEvent.change(screen.getByTestId('centremap-col-order'), { target: { value: 'combo' } });
    expect((screen.getByTestId('centremap-col-order') as HTMLSelectElement).value).toBe('combo');
    expect(screen.getByTestId('centremap-heatmap')).toBeTruthy();

    // Clear the join search first, so a box picks from everything.
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getByTestId('centremap-matches').textContent).toBe('Showing all');

    // Select mode: a box on the UMAP picks the pairings inside it, summed up per rule.
    fireEvent.click(screen.getByTestId('centremap-drag-select'));
    const box = screen.getByTestId('centremap-umap-box');
    fireEvent.pointerDown(box, { clientX: 0, clientY: 0 });
    fireEvent.pointerMove(box, { clientX: 600, clientY: 600 });
    fireEvent.pointerUp(box, { clientX: 600, clientY: 600 });
    const picked = screen.getByTestId('centremap-picked');
    expect(picked.textContent).toMatch(/^270 pairings selected/);
    const patterns = screen.getByTestId('centremap-patterns').querySelectorAll('li');
    expect(patterns).toHaveLength(6);
    expect(patterns[0].textContent).toMatch(/^15/);
    fireEvent.mouseEnter(patterns[5].querySelectorAll('[data-position]')[1]);
    expect(screen.getByTestId('centremap-spread').textContent).toMatch(/^023678, digit 2 \(\w+\): \d ×\d+/);
    expect(screen.getByTestId('centremap-overlay')).toBeTruthy();
    expect(screen.getByTestId('centremap-tiles').querySelectorAll('figure')).toHaveLength(10);
    fireEvent.click(screen.getByLabelText('Clear selection'));
    expect(screen.queryByTestId('centremap-picked')).toBeNull();
    // While a search is on, a box picks only its matches.
    fireEvent.change(screen.getByTestId('centremap-rule'), { target: { value: '0356' } });
    fireEvent.pointerDown(box, { clientX: 0, clientY: 0 });
    fireEvent.pointerMove(box, { clientX: 600, clientY: 600 });
    fireEvent.pointerUp(box, { clientX: 600, clientY: 600 });
    expect(screen.getByTestId('centremap-picked').textContent).toMatch(/^8 pairings selected/);
    fireEvent.click(screen.getByLabelText('Clear selection'));
    fireEvent.change(screen.getByTestId('centremap-rule'), { target: { value: '' } });
    fireEvent.click(screen.getByTestId('centremap-drag-pan'));

    // Picking a dot opens it, with its closest pairings and an Explorer link.
    fireEvent.click(dots[0]);
    const sel = screen.getByTestId('centremap-selected');
    expect(sel.querySelector('a')!.getAttribute('href')).toMatch(/#\/explorer\?v=1/);
    expect(sel.querySelectorAll('figure').length).toBe(2 + 8);

    // A thumbnail opens magnified; arrows step through the pick and its closest, V switches the view, Esc closes.
    fireEvent.click(sel.querySelectorAll('figure button')[2]);
    const mag = screen.getByTestId('centremap-magnifier');
    expect(screen.getByTestId('centremap-magnifier-position').textContent).toMatch(/^2 \/ 9 · /);
    const first = screen.getByTestId('centremap-magnifier-label').textContent;
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByTestId('centremap-magnifier-position').textContent).toMatch(/^3 \/ 9 · /);
    expect(screen.getByTestId('centremap-magnifier-label').textContent).not.toBe(first);
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByTestId('centremap-magnifier-position').textContent).toMatch(/^1 \/ 9 · the selected pairing/);
    const pressed = () => mag.querySelector('[aria-pressed="true"]')!.textContent;
    expect(pressed()).toBe('centres');
    fireEvent.keyDown(window, { key: 'v' });
    expect(pressed()).toBe('strands');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('centremap-magnifier')).toBeNull();

    // The survey was saved; a fresh visit with the same settings shows it without recomputing.
    expect(screen.getByTestId('centremap-saved').textContent).toMatch(/^Saved .*, kept until /);
    cleanup();
    render(<CentreMapPage />);
    fireEvent.change(screen.getByTestId('centremap-level'), { target: { value: '4' } });
    expect(screen.getByTestId('centremap-summary').textContent).toMatch(/^270 pairings at level 4/);
    expect(screen.getByTestId('centremap-recompute')).toBeTruthy();
  }, 90000);
});
