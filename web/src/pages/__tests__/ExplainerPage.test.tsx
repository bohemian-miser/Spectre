// @vitest-environment jsdom
/**
 * Explainer page contract (DESIGN.md §7.2). Structural smoke tests: the whole
 * article mounts, every copy beat has its live figure, and the interactive
 * claims the prose makes actually hold when you click them.
 *
 * The maths lives in `pages/tails/__tests__/presets.test.ts` and in the
 * core/lib suites; what can only break here is the wiring.
 */
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import ExplainerPage from '../ExplainerPage';
import { SECTIONS, maskDigits, maskOf } from '../tails/presets';

afterEach(cleanup);

/** Mount and let the synchronous analyses settle (no Worker in jsdom). */
async function renderPage() {
  let result!: ReturnType<typeof render>;
  await act(async () => {
    result = render(<ExplainerPage />);
  });
  await act(async () => {
    await Promise.resolve();
  });
  return result;
}

const FIGURE_IDS = [
  'fig-anatomy',
  'fig-seam',
  'fig-contract',
  'fig-first-lines',
  'fig-sad',
  'fig-puzzle',
  'fig-fingerprints',
  'fig-matrix',
  'fig-kernel',
  'fig-matchmaker',
  'fig-profiles',
  'fig-coda',
];

describe('ExplainerPage', () => {
  it('renders the article, its sections and every figure', async () => {
    const { container } = await renderPage();

    expect(container.querySelector('h1')?.textContent).toContain('The Tile With the Tail');
    for (const section of SECTIONS) {
      expect(container.querySelector(`section#${section.id}`), section.id).not.toBeNull();
    }
    for (const id of FIGURE_IDS) {
      expect(container.querySelector(`figure#${id}`), id).not.toBeNull();
    }
    // Every figure is labelled by its own heading (a11y contract of `Figure`).
    expect(container.querySelectorAll('figure.tails-figure')).toHaveLength(FIGURE_IDS.length);
  });

  it('mounts live tilings, single-tile widgets and a seam view', async () => {
    const { container } = await renderPage();

    // Hero patch is a level-3, 559-tile Spectre patch.
    const hero = container.querySelector('.tails-hero-patch svg.tiling-view');
    expect(hero?.getAttribute('data-level')).toBe('3');
    expect(hero?.getAttribute('data-tile-count')).toBe('559');

    // Kernel gallery: one patch per valid subset, plus the other figures'.
    expect(container.querySelectorAll('.tails-gallery-grid .tails-card')).toHaveLength(8);
    expect(container.querySelectorAll('svg.tiling-view').length).toBeGreaterThanOrEqual(12);
    expect(container.querySelectorAll('svg.tile-view').length).toBeGreaterThan(10);
    expect(container.querySelector('svg.seam-view')).not.toBeNull();
    // Lines are actually traced somewhere on the page.
    expect(container.querySelectorAll('.circuit-path').length).toBeGreaterThan(0);
  });

  it('shows Theta’s three class-2 crossings and the pairing that strands one', async () => {
    const { container } = await renderPage();
    const sad = container.querySelector('figure#fig-sad') as HTMLElement;

    const theta = sad.querySelector('svg[data-tile-type="Theta"]') as SVGElement;
    expect(theta.querySelectorAll('.edge-dot')).toHaveLength(3);
    // One chord drawn: two crossings paired, one left dangling.
    expect(theta.querySelectorAll('.overlay-chord')).toHaveLength(1);

    fireEvent.click(sad.querySelector('button.tails-chip') as Element);
    expect(theta.querySelectorAll('.overlay-chord')).toHaveLength(3); // the rejected junction

    // Delta under class 1 gets exactly one crossing and can never pair it.
    const delta = sad.querySelector('svg[data-tile-type="Delta"]') as SVGElement;
    expect(delta.querySelectorAll('.edge-dot')).toHaveLength(1);
  });

  it('runs the matrix: {5} leaves five odd rows, {1,5} leaves none', async () => {
    const { container } = await renderPage();
    const matrix = container.querySelector('figure#fig-matrix') as HTMLElement;

    const parityCells = () => [...matrix.querySelectorAll('.tails-parity-cell')];
    expect(parityCells()).toHaveLength(10);
    expect(parityCells().filter((c) => c.textContent === '1')).toHaveLength(5);

    // Clicking column 1 adds class 1 to the rule — every row goes even.
    const header = matrix.querySelector('thead th:nth-child(3) button') as Element;
    expect(header.textContent).toBe('1');
    fireEvent.click(header);
    expect(parityCells().filter((c) => c.textContent === '1')).toHaveLength(0);
    expect(matrix.textContent).toContain('yes');
  });

  it('lets the puzzle console discover a clean rule without ever listing them', async () => {
    const { container } = await renderPage();
    const puzzle = container.querySelector('figure#fig-puzzle') as HTMLElement;

    expect(puzzle.textContent).toContain('coward');
    fireEvent.click(puzzle.querySelector('.edge-chip[data-major="2"]') as Element);
    expect(puzzle.querySelector('.tails-note.is-sad')).not.toBeNull();

    fireEvent.click(puzzle.querySelector('.edge-chip[data-major="2"]') as Element);
    fireEvent.click(puzzle.querySelector('.edge-chip[data-major="1"]') as Element);
    fireEvent.click(puzzle.querySelector('.edge-chip[data-major="5"]') as Element);
    const solved = puzzle.querySelector('.tails-note.is-solved');
    expect(solved?.textContent).toContain('{1, 5}');
    expect(puzzle.textContent).toContain('Your finds (1)');
  });

  it('combines two kernel cards into a third (the group, by clicking)', async () => {
    const { container } = await renderPage();
    const gallery = container.querySelector('figure#fig-kernel') as HTMLElement;

    const card = (edges: readonly number[]): HTMLElement =>
      gallery.querySelector(`.tails-card[data-rule="${maskDigits(maskOf(edges))}"]`) as HTMLElement;

    fireEvent.click(card([0, 1, 3, 6]).querySelector('.tails-card-title') as Element);
    fireEvent.click(card([1, 5]).querySelector('.tails-card-title') as Element);

    expect(gallery.querySelector('.tails-note')?.textContent).toContain('{0, 3, 5, 6}');
    expect(card([0, 3, 5, 6]).className).toContain('is-result');
  });

  it('offers both matching profiles and reports their circuits and wanderers', async () => {
    const { container } = await renderPage();
    const profiles = container.querySelector('figure#fig-profiles') as HTMLElement;

    expect(profiles.querySelectorAll('.tails-crossfade-layer')).toHaveLength(2);
    expect(profiles.querySelector('.tails-crossfade-layer.is-active')).not.toBeNull();
    expect(profiles.textContent).toContain('2578-0000000000');

    const chips = [...profiles.querySelectorAll('.tails-controls .tails-chip')];
    const wanderer = chips.find((c) => c.textContent?.includes('0100101100')) as Element;
    await act(async () => {
      fireEvent.click(wanderer);
    });
    expect(profiles.querySelector('.tails-readouts')?.textContent).toContain('longest wanderer');
    expect(profiles.querySelector('a[href*="c=0100101100"]')).not.toBeNull();
  });

  it('hovers a seam and reports which handshake it belongs to', async () => {
    const { container } = await renderPage();
    const anatomy = container.querySelector('figure#fig-anatomy') as HTMLElement;

    const row = anatomy.querySelector('.tails-seam[data-seam-id="Delta/2A"]') as Element;
    fireEvent.pointerEnter(row);
    expect(anatomy.textContent).toContain('2.0A, 2.1A, 2.2A');
    expect(anatomy.querySelector('.tails-seam.is-hovered')).not.toBeNull();
  });

  it('pins the class-0 contract to the seam centre', async () => {
    const { container } = await renderPage();
    const fig = container.querySelector('figure#fig-contract') as HTMLElement;

    const slider = () => fig.querySelector('input[type="range"]') as HTMLInputElement;
    expect(slider().disabled).toBe(false);

    const zero = [...fig.querySelectorAll('.tails-chip')].find(
      (c) => c.textContent === 'class 0',
    ) as Element;
    fireEvent.click(zero);
    expect(slider().disabled).toBe(true);
    expect(fig.textContent).toContain('symmetric contracts only');
  });
});
