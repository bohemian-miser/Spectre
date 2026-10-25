// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { comboOptionCounts, validEdgeSubsets } from '../../core';
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
    // Every rule is measured in full; only the all-edges rule, on request, is sampled to a cap.
    expect(screen.queryByTestId('centremap-max')).toBeNull();
    fireEvent.click(screen.getByTestId('centremap-all-edges'));
    expect(start.textContent).toBe('Compare 470 pairings'); // 270 + 200 of the all-edges rule
    fireEvent.change(screen.getByTestId('centremap-max'), { target: { value: '20' } });
    expect(start.textContent).toBe('Compare 290 pairings');
    expect(screen.getByText(/01235678 \(20 of 625,000, sampled\)/)).toBeTruthy();
    fireEvent.click(screen.getByTestId('centremap-all-edges'));
    expect(screen.queryByTestId('centremap-max')).toBeNull();
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
    // The patch shows everything overlaid, or one pairing at a time; arrows flick through, round again.
    const shown = () => screen.getByTestId('centremap-overlay-label').textContent;
    expect(shown()).toBe('all 270');
    const chords = () => [...screen.getByTestId('centremap-tiles').querySelectorAll('line')].map((l) => l.textContent);
    const allChords = chords().length;
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(shown()).toMatch(/^1 \/ 270 · \d+ · [0-9a-z]{10}$/);
    // The tiles follow: only that pairing's chords, each drawn by 1 of 1.
    expect(chords().length).toBeLessThan(allChords);
    expect(chords().every((t) => t === '1 of 1')).toBe(true);
    // The pairing on show is marked on both charts: a ring on the UMAP, its row and column on the heatmap.
    expect(screen.getByTestId('centremap-umap-shown')).toBeTruthy();
    expect(screen.getByTestId('centremap-heat-shown-row')).toBeTruthy();
    expect(screen.getByTestId('centremap-heat-shown-col')).toBeTruthy();
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(shown()).toMatch(/^270 \/ 270 · /);
    fireEvent.click(screen.getByTestId('centremap-overlay-all'));
    expect(shown()).toBe('all 270');
    expect(screen.queryByTestId('centremap-umap-shown')).toBeNull();
    expect(screen.queryByTestId('centremap-heat-shown-row')).toBeNull();
    fireEvent.click(screen.getByTestId('centremap-overlay-one'));
    expect(shown()).toMatch(/^1 \/ 270/);
    expect(screen.getByTestId('centremap-tiles').querySelectorAll('figure')).toHaveLength(10);
    // The pairing on show opens in the Explorer.
    expect(screen.getByTestId('centremap-overlay-explorer').getAttribute('href')).toMatch(/#\/explorer\?v=1/);
    // Esc clears the selection.
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('centremap-picked')).toBeNull();
    // A smaller selection while the board shows a late pairing of the old one starts afresh, not past its end.
    fireEvent.pointerDown(box, { clientX: 0, clientY: 0 });
    fireEvent.pointerMove(box, { clientX: 600, clientY: 600 });
    fireEvent.pointerUp(box, { clientX: 600, clientY: 600 });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(shown()).toMatch(/^270 \/ 270 · /);
    // While a search is on, a box picks only its matches.
    fireEvent.change(screen.getByTestId('centremap-rule'), { target: { value: '0356' } });
    fireEvent.pointerDown(box, { clientX: 0, clientY: 0 });
    fireEvent.pointerMove(box, { clientX: 600, clientY: 600 });
    fireEvent.pointerUp(box, { clientX: 600, clientY: 600 });
    expect(screen.getByTestId('centremap-picked').textContent).toMatch(/^8 pairings selected/);
    fireEvent.click(screen.getByLabelText('Clear selection'));
    // The search's matches open in the selection view, to flick through.
    const matching = Number(/^(\d+) of/.exec(screen.getByTestId('centremap-matches').textContent!)![1]);
    fireEvent.click(screen.getByTestId('centremap-matches-open'));
    expect(screen.getByTestId('centremap-picked').textContent).toMatch(new RegExp(`^${matching} pairings selected`));
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByTestId('centremap-overlay-label').textContent).toMatch(new RegExp(`^1 / ${matching} · 0356 · `));
    fireEvent.keyDown(window, { key: 'Escape' });
    // On the heatmap a search only filters the box's rows: a box along one row keeps every column it covers.
    const heat = screen.getByTestId('centremap-heatmap');
    heat.getBoundingClientRect = () => ({ left: 0, top: 0, width: 270, height: 270, right: 270, bottom: 270, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
    const heatBox = screen.getByTestId('centremap-heat-box');
    fireEvent.pointerDown(heatBox, { clientX: 10, clientY: 100 });
    fireEvent.pointerMove(heatBox, { clientX: 59, clientY: 100.5 });
    fireEvent.pointerUp(heatBox, { clientX: 59, clientY: 100.5 });
    expect(Number(/^(\d+) pairings selected/.exec(screen.getByTestId('centremap-picked').textContent!)![1])).toBeGreaterThanOrEqual(50);
    fireEvent.keyDown(window, { key: 'Escape' });
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

  it('shows the precomputed hexagon map: searches it digit by digit', async () => {
    let offset = 0;
    const rules = validEdgeSubsets('hex')
      .filter((r) => r.edges.length)
      .slice(0, 2)
      .map((r) => {
        const optionCounts = comboOptionCounts('hex', r.edges);
        const total = optionCounts.reduce((a, b) => a * b, 1);
        const out = { subset: r.edges, optionCounts, offset, total };
        offset += total;
        return out;
      });
    const meta = { family: 'hex', level: 5, total: offset, rules, landmarks: [0], distinct: offset, bounds: { min: [0, 0], max: [1, 1] }, files: { xy: 'xy.i16', longest: 'longest.u16' } };
    const body = (url: string) =>
      url.endsWith('meta.json') ? JSON.stringify(meta) : url.endsWith('xy.i16') ? new Int16Array(2 * offset).buffer : new Uint16Array(offset).buffer;
    vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(body(String(url)))));
    render(<CentreMapPage />);
    fireEvent.click(screen.getByTestId('centremap-source-atlas'));
    await waitFor(() => expect(screen.getByTestId('centremap-atlas-summary').textContent).toMatch(new RegExp(`^${offset} pairings at level 5`)));
    expect(screen.getByTestId('centremap-atlas-matches').textContent).toBe('Showing all');
    fireEvent.change(screen.getByTestId('centremap-atlas-rule'), { target: { value: rules[1].subset.join('') } });
    expect(screen.getByTestId('centremap-atlas-matches').textContent).toBe(`${rules[1].total} of ${offset} match`);
    fireEvent.click(screen.getByTestId('centremap-atlas-matches-open'));
    expect(screen.getByTestId('centremap-picked').textContent).toMatch(new RegExp(`^${rules[1].total} pairings? selected`));
    vi.unstubAllGlobals();
  });
});
