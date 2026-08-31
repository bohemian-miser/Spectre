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
import { MATRIX_ROWS, SECTIONS, fingerprint, maskDigits, maskOf } from '../tails/presets';

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
  'rule-lab',
  'fig-anatomy',
  'fig-seam',
  'fig-contract',
  'fig-first-lines',
  'fig-sad',
  'fig-puzzle',
  'fig-fingerprints',
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

    // Kernel gallery: one patch per valid subset, plus the other figures'.
    expect(container.querySelectorAll('.tails-gallery-grid .tails-card')).toHaveLength(8);
    expect(container.querySelectorAll('svg.tiling-view').length).toBeGreaterThanOrEqual(12);
    expect(container.querySelectorAll('svg.tile-view').length).toBeGreaterThan(10);
    expect(container.querySelector('svg.seam-view')).not.toBeNull();
    // Lines are actually traced somewhere on the page.
    expect(container.querySelectorAll('.circuit-path').length).toBeGreaterThan(0);
  });

  it('opens with the lab: all ten tiles wearing major numbers, faint until selected', async () => {
    const { container } = await renderPage();
    const lab = container.querySelector('figure#rule-lab') as HTMLElement;
    expect(lab).not.toBeNull();

    // The full cast, in matrix-row order, each with its parity badge.
    const tiles = [...lab.querySelectorAll('svg.tile-view')];
    expect(tiles.map((t) => t.getAttribute('data-tile-type'))).toEqual([...MATRIX_ROWS]);
    expect(lab.querySelectorAll('.tails-parity')).toHaveLength(MATRIX_ROWS.length);

    // Every seam wears its bare major number once; under the opening rule
    // {2} the 2s are on and everything else is greyed out.
    const nums = [...lab.querySelectorAll('[data-major-number]')];
    expect(nums.length).toBeGreaterThan(50);
    expect(nums.length).toBeLessThan(100); // one per seam, not per physical edge
    const on = nums.filter((t) => t.getAttribute('data-major-on') === '1');
    expect(on.length).toBeGreaterThan(0);
    expect(on.every((t) => t.textContent === '2')).toBe(true);
    expect(nums.some((t) => t.getAttribute('data-major-on') === '0')).toBe(true);

    // Theta's three class-2 crossings: one pair joined, one tail hanging.
    const theta = lab.querySelector('svg[data-tile-type="Theta"]') as SVGElement;
    expect(theta.querySelectorAll('circle.edge-dot')).toHaveLength(3);
    expect(theta.querySelectorAll('.matching-chords line')).toHaveLength(1);
    expect(theta.querySelectorAll('.chord-tail')).toHaveLength(1);
  });

  it('toggles a class from a tile edge in the lab', async () => {
    const { container } = await renderPage();
    const lab = container.querySelector('figure#rule-lab') as HTMLElement;

    // Clicking Theta's 2A seam switches class 2 off everywhere in the lab.
    fireEvent.click(lab.querySelector('[data-edge-id="Theta/2A"]') as Element);
    expect(lab.querySelector('.tails-table')?.getAttribute('data-mask')).toBe('0');
    expect(lab.querySelectorAll('circle.edge-dot')).toHaveLength(0);
    expect(lab.querySelectorAll('.chord-tail')).toHaveLength(0);
  });

  it('shows Theta’s three class-2 crossings and the pairing that strands one', async () => {
    const { container } = await renderPage();
    const sad = container.querySelector('figure#fig-sad') as HTMLElement;

    const theta = sad.querySelector('svg[data-tile-type="Theta"]') as SVGElement;
    expect(theta.querySelectorAll('.edge-dot')).toHaveLength(3);
    // Honest matchmaking: two crossings paired, one left dangling as a tail.
    expect(theta.querySelectorAll('.matching-chords line')).toHaveLength(1);
    expect(theta.querySelectorAll('.chord-tail')).toHaveLength(1);
    expect(theta.querySelectorAll('.overlay-chord')).toHaveLength(0);

    fireEvent.click(sad.querySelector('button.tails-chip') as Element);
    expect(theta.querySelectorAll('.overlay-chord')).toHaveLength(3); // the rejected junction
    expect(theta.querySelectorAll('.chord-tail')).toHaveLength(0); // nothing dangles at a station

    // Delta under class 1 gets exactly one crossing and can never pair it.
    const delta = sad.querySelector('svg[data-tile-type="Delta"]') as SVGElement;
    expect(delta.querySelectorAll('.edge-dot')).toHaveLength(1);
    expect(delta.querySelectorAll('.chord-tail')).toHaveLength(1);
  });

  it('runs the matrix in the lab: {2} upsets its fingerprint, {1,5} upsets nobody', async () => {
    const { container } = await renderPage();
    const lab = container.querySelector('figure#rule-lab') as HTMLElement;

    const parityCells = () => [...lab.querySelectorAll('.tails-parity-cell')];
    expect(parityCells()).toHaveLength(10);
    // The opening rule {2} leaves exactly class 2's fingerprint odd.
    expect(parityCells().filter((c) => c.textContent === '1')).toHaveLength(
      fingerprint(2).length,
    );

    // Column headers toggle classes: swap {2} for {1, 5} — every row goes even
    // and every hanging tail on the tiles disappears.
    const header = (major: number) =>
      lab.querySelector(`thead th:nth-child(${major + 2}) button`) as Element;
    expect(header(2).textContent).toBe('2');
    fireEvent.click(header(2));
    fireEvent.click(header(1));
    fireEvent.click(header(5));
    expect(parityCells().filter((c) => c.textContent === '1')).toHaveLength(0);
    expect(lab.textContent).toContain('yes');
    expect(lab.querySelectorAll('.chord-tail')).toHaveLength(0);
    expect(lab.querySelectorAll('.matching-chords line').length).toBeGreaterThan(0);
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

  it('gives every class a full-seam notched slider and pins class 0 to the centre', async () => {
    const { container } = await renderPage();
    const fig = container.querySelector('figure#fig-contract') as HTMLElement;

    // One slider per class on offer, each spanning ALL its minors.
    const sliders = [...fig.querySelectorAll<HTMLInputElement>('input[type="range"]')];
    expect(sliders).toHaveLength(4);
    const two = fig.querySelector('.contract-slider[data-major="2"]') as HTMLElement;
    expect((two.querySelector('input') as HTMLInputElement).max).toBe('3');
    // A notch per vertex the seam crosses: 3 physical edges → 2 internal vertices.
    expect(two.querySelectorAll('.contract-notch')).toHaveLength(2);

    // Class 2 starts active; the others are greyed out.
    expect(two.classList.contains('is-inactive')).toBe(false);
    expect(
      fig.querySelector('.contract-slider[data-major="5"]')?.classList.contains('is-inactive'),
    ).toBe(true);

    // Class 0 glues to itself: always disabled, pinned to the seam centre.
    const zeroInput = fig.querySelector(
      '.contract-slider[data-major="0"] input',
    ) as HTMLInputElement;
    expect(zeroInput.disabled).toBe(true);
    expect(Number.parseFloat(zeroInput.value)).toBeCloseTo(Number.parseFloat(zeroInput.max) / 2);

    // Selecting class 0 surfaces the symmetric-only note.
    const zero = [...fig.querySelectorAll('.tails-chip')].find(
      (c) => c.textContent === 'class 0',
    ) as Element;
    fireEvent.click(zero);
    expect(fig.textContent).toContain('symmetric contracts only');
  });
});
