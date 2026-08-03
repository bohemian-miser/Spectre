// @vitest-environment jsdom
/**
 * Stats page contract (DESIGN.md §7.3). Structural tests over the *real*
 * dataset served through a mocked `fetch`: the page loads it, tells the
 * verified stories with real numbers, lets all 270 configurations be filtered,
 * sorted and opened, links back into the explorer, and degrades to a message
 * (never a blank page) when the fetch fails.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StatsPage from '../StatsPage';

// jsdom gives `import.meta.url` an http scheme, so resolve from the project root.
const DATASET: unknown = JSON.parse(
  readFileSync(resolve(process.cwd(), 'public/data/circuit_stats.json'), 'utf8'),
);

function mockFetch(impl?: () => Promise<unknown>): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      if (impl) return impl();
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => DATASET,
      } as unknown as Response;
    }),
  );
}

async function renderPage(props: Record<string, unknown> = {}) {
  const utils = render(<StatsPage syncUrl={false} base="/Spectre/" {...props} />);
  await waitFor(() => expect(screen.queryByText(/Loading the circuit dataset/)).toBeNull());
  return utils;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
beforeEach(() => {
  window.history.replaceState(null, '', '/stats.html');
  mockFetch();
});

describe('StatsPage — loading', () => {
  it('shows a loading state, then the page', async () => {
    const { container } = render(<StatsPage syncUrl={false} />);
    expect(container.textContent).toContain('Loading the circuit dataset');
    await waitFor(() => expect(container.querySelector('.stats-browse')).not.toBeNull());
    expect(container.querySelector('h1')?.textContent).toContain('Circuits');
  });

  it('fetches the dataset from the deploy base', async () => {
    await renderPage();
    expect(fetch).toHaveBeenCalledWith('/Spectre/data/circuit_stats.json', expect.anything());
  });

  it('explains a failed fetch instead of rendering nothing', async () => {
    mockFetch(async () => ({ ok: false, status: 404, statusText: 'Not Found' }) as Response);
    const { container } = render(<StatsPage syncUrl={false} />);
    await waitFor(() => expect(container.querySelector('.stats-error-panel')).not.toBeNull());
    const panel = container.querySelector('.stats-error-panel');
    expect(panel?.textContent).toContain('could not be loaded');
    expect(panel?.textContent).toContain('404');
    expect(container.querySelector('.stats-retry')).not.toBeNull();
  });

  it('reports a malformed dataset as an error, not a crash', async () => {
    mockFetch(async () => ({ ok: true, status: 200, json: async () => ({ meta: {} }) }) as Response);
    const { container } = render(<StatsPage syncUrl={false} />);
    await waitFor(() => expect(container.querySelector('.stats-error-panel')).not.toBeNull());
    expect(container.querySelector('.stats-error-panel')?.textContent).toContain(
      'circuit_stats.json',
    );
  });
});

describe('StatsPage — overview and findings', () => {
  it('states what was analysed, with the coverage caveat', async () => {
    const { container } = render(<StatsPage syncUrl={false} />);
    await waitFor(() => expect(container.querySelector('.stats-overview')).not.toBeNull());
    const overview = container.querySelector('.stats-overview')!;
    expect(overview.textContent).toContain('270');
    expect(overview.textContent).toContain('6 of 8');
    expect(overview.textContent).toContain('8,315,567');

    const caveat = container.querySelector('.stats-caveat')!;
    expect(caveat.textContent).toContain('Coverage caveat');
    expect(caveat.textContent).toContain('01235678');
    expect(caveat.textContent).toContain('023678 ×160');
    expect(caveat.textContent).toContain('summed across combos');
  });

  it('renders the featured findings with their verified numbers', async () => {
    const { container } = render(<StatsPage syncUrl={false} />);
    await waitFor(() => expect(container.querySelector('.stats-findings')).not.toBeNull());
    const text = container.querySelector('.stats-findings')!.textContent ?? '';

    expect(text).toContain('4 configurations with no circuits');
    expect(text).toContain('248,348');
    expect(text).toContain('610');
    expect(text).toContain('10,946');
    expect(text).toContain('27,621');
    expect(text).toContain('×62.0');
    expect(text).toContain('×140'); // ×139.68 rounds to a whole number in prose
    expect(text).toContain('88 of 270');
    expect(text).toMatch(/space-filling-curve candidate/i);

    // Five cards, each with at least one hand-rolled SVG figure between them.
    expect(container.querySelectorAll('.stats-card').length).toBe(5);
    expect(container.querySelectorAll('.stats-findings svg.stats-chart').length).toBe(4);
    // The scatter draws one point per circuit-bearing configuration.
    expect(container.querySelectorAll('circle.stats-point').length).toBe(266);
  });
});

describe('StatsPage — the configuration table', () => {
  it('lists all 270 configurations', async () => {
    const { container } = await renderPage();
    expect(container.querySelectorAll('tr.stats-row')).toHaveLength(270);
    expect(container.querySelector('[data-testid="stats-row-count"]')?.textContent).toBe(
      '270 configurations',
    );
  });

  it('filters by edge selection chip', async () => {
    const { container } = await renderPage();
    const chip = container.querySelector('.stats-sel-chip[data-selection="15"]')!;
    fireEvent.click(chip);
    expect(container.querySelectorAll('tr.stats-row')).toHaveLength(4);
    expect(container.querySelector('[data-testid="stats-row-count"]')?.textContent).toBe(
      '4 of 270 configurations',
    );
    fireEvent.click(chip);
    expect(container.querySelectorAll('tr.stats-row')).toHaveLength(270);
  });

  it('filters by combo search', async () => {
    const { container } = await renderPage();
    fireEvent.change(container.querySelector('#stats-search')!, {
      target: { value: '023678-0311000000' },
    });
    const rows = container.querySelectorAll('tr.stats-row');
    expect(rows).toHaveLength(1);
    expect(rows[0].getAttribute('data-row-id')).toBe('023678-0311000000');
  });

  it('sorts by a numeric column at the active level', async () => {
    const { container } = await renderPage();
    const header = [...container.querySelectorAll('.stats-sort')].find((b) =>
      b.textContent?.includes('Max circuit'),
    )!;
    fireEvent.click(header); // first click on a numeric column sorts descending
    expect(container.querySelector('tr.stats-row')?.getAttribute('data-row-id')).toBe(
      '023678-0311000000',
    );
    fireEvent.click(header); // ascending
    const first = container.querySelector('tr.stats-row')!;
    expect(first.textContent).toContain('0');
  });

  it('re-sorts when the level toggle changes', async () => {
    const { container } = await renderPage();
    const tails = [...container.querySelectorAll('.stats-sort')].find((b) =>
      b.textContent?.includes('Tails'),
    )!;
    fireEvent.click(tails);
    const topAtLvl6 = container.querySelector('tr.stats-row')?.getAttribute('data-row-id');
    const lvl4Button = [...container.querySelectorAll('.stats-seg')].find(
      (b) => b.textContent === 'level 4',
    )!;
    fireEvent.click(lvl4Button);
    expect(lvl4Button.getAttribute('aria-pressed')).toBe('true');
    // 2578 has the most tails at both depths, but the values shown change.
    expect(container.querySelector('tr.stats-row')?.getAttribute('data-row-id')).toBe(topAtLvl6);
    expect(container.querySelector('.stats-cell-primary')).not.toBeNull();
  });
});

describe('StatsPage — the detail panel', () => {
  it('opens on row click with lengths, histogram and explorer links', async () => {
    const { container } = await renderPage();
    expect(container.querySelector('.stats-detail')).toBeNull();

    const row = container.querySelector('tr[data-row-id="023678-0311000000"] .stats-row-open')!;
    fireEvent.click(row);

    const detail = container.querySelector('.stats-detail')!;
    expect(detail).not.toBeNull();
    expect(detail.textContent).toContain('023678-0311000000');
    expect(detail.textContent).toContain('27,621');
    // Unique circuit lengths, a spectrum, and the complete tail census.
    expect(detail.querySelectorAll('.length-chip').length).toBeGreaterThan(0);
    expect(detail.querySelectorAll('svg.stats-chart').length).toBeGreaterThanOrEqual(2);
    expect(detail.textContent).toMatch(/how many circuits share a length is not recorded/i);

    const links = [...detail.querySelectorAll('a.stats-explorer-link')];
    expect(links.map((a) => a.getAttribute('data-level'))).toEqual(['2', '4', '6']);
    const href = links[1].getAttribute('href')!;
    expect(href.startsWith('/Spectre/#/explorer?')).toBe(true);
    const q = new URLSearchParams(href.slice(href.indexOf('?') + 1));
    expect(q.get('e')).toBe('023678');
    expect(q.get('c')).toBe('0311000000');
    expect(q.get('lv')).toBe('4');
  });

  it('says the circuit-free rows have no circuits at all', async () => {
    const { container } = await renderPage();
    fireEvent.click(container.querySelector('tr[data-row-id="1278-0100100000"] .stats-row-open')!);
    const detail = container.querySelector('.stats-detail')!;
    expect(detail.textContent).toMatch(/No circuits at either depth/i);
    expect(detail.textContent).toContain('248,348');
  });

  it('closes again', async () => {
    const { container } = await renderPage();
    fireEvent.click(container.querySelector('tr[data-row-id="15-0000000100"] .stats-row-open')!);
    expect(container.querySelector('.stats-detail')).not.toBeNull();
    fireEvent.click(container.querySelector('.stats-close')!);
    expect(container.querySelector('.stats-detail')).toBeNull();
  });

  it('opens from a findings card link', async () => {
    const { container } = await renderPage();
    const link = container.querySelector('.stats-findings .stats-rowlink')!;
    const label = link.textContent ?? '';
    fireEvent.click(link);
    expect(container.querySelector('.stats-detail')?.textContent).toContain(label.trim());
  });
});

describe('StatsPage — shareable hash', () => {
  it('restores the level and open row from the hash', async () => {
    window.history.replaceState(null, '', '/stats.html#/stats?ds=lvl4&sel=15&combo=0000000100');
    const { container } = render(<StatsPage base="/Spectre/" />);
    await waitFor(() => expect(container.querySelector('.stats-detail')).not.toBeNull());
    expect(container.querySelector('.stats-detail')?.textContent).toContain('15-0000000100');
    const active = [...container.querySelectorAll('.stats-seg')].find(
      (b) => b.getAttribute('aria-pressed') === 'true',
    );
    expect(active?.textContent).toBe('level 4');
  });

  it('mirrors the open row back into the hash', async () => {
    const { container } = render(<StatsPage base="/Spectre/" />);
    await waitFor(() => expect(container.querySelector('.stats-browse')).not.toBeNull());
    await act(async () => {
      fireEvent.click(container.querySelector('tr[data-row-id="2578-0000001100"] .stats-row-open')!);
    });
    expect(window.location.hash).toBe('#/stats?ds=lvl6&sel=2578&combo=0000001100');
  });
});
