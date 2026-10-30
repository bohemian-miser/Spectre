// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FoundationsPage from '../FoundationsPage';

const dir = resolve(__dirname, '../../../public/data/foundations/hex-023468');

describe('FoundationsPage', () => {
  beforeEach(() => {
    history.replaceState(null, '', '/Spectre/foundations.html');
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => new Response(readFileSync(resolve(dir, url.split('/').pop()!), 'utf8'))),
    );
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows a combination, its summary and a card per foundational circuit, drawn', async () => {
    render(<FoundationsPage forceSync />);
    await waitFor(() => expect(screen.getByTestId('fd-summary').textContent).toMatch(/Floor 2.*Last foundational level 6.*5 foundational circuits: 4 chains, 1 nugget.*Tails at level 9: 56\.4%/));
    expect(screen.getByTestId('fd-note').textContent).toMatch(/Nothing foundational first closes at levels 7 to 9 \(built to 9\); not proven beyond\./);
    const cards = screen.getAllByTestId('fd-card');
    expect(cards).toHaveLength(5);
    // the 303 at level 4 and its chain, each harmonic predicted, then built, and the next predicted above the build
    const c303 = cards.find((c) => c.textContent!.startsWith('303 tiles'))!;
    const row303 = c303.closest('[data-testid="fd-chain"]') as HTMLElement;
    expect([...row303.querySelectorAll('.fd-harm')].map((h) => h.textContent)).toEqual([
      '14,679 tileslevel 6 · 1 place ✓',
      '734,256 tileslevel 8 · 1 place ✓',
      '?36,701,253 tileslevel 10 · predicted',
    ]);
    // the 447 at level 6 is one circuit, in eight places there, and late
    const c447 = cards.find((c) => c.textContent!.startsWith('447 tiles'))!;
    expect(c447.textContent).toMatch(/late/);
    expect(c447.textContent).toMatch(/closes in 47 places from level 6, children 07, 12, 13, 14, …/);
    // the 60 is a nugget
    expect(cards.find((c) => c.textContent!.startsWith('60 tiles'))!.textContent).toMatch(/nugget: no harmonic/);
    await waitFor(() => expect(c303.querySelector('svg polygon')).not.toBeNull(), { timeout: 30000 });
    expect(within(c303).getByText('Build-up').getAttribute('href')).toBe(`${import.meta.env.BASE_URL}buildup.html?rule=023468&combo=140000001&level=4&circuit=303`);
    expect(within(c303).getByText('Explorer').getAttribute('href')).toMatch(/#\/explorer\?/);
    expect(within(c303).getByText('Harmonics').getAttribute('href')).toBe(`${import.meta.env.BASE_URL}harmonics.html?rule=023468&combo=140000001&level=8&c=4-303`);
    // choosing a card puts it in the address
    fireEvent.click(c303);
    expect(location.search).toBe('?combo=140000001&circuit=1');
  }, 60000);

  it('lists the monsters and opens one in its combination', async () => {
    history.replaceState(null, '', '/Spectre/foundations.html?view=monsters');
    render(<FoundationsPage forceSync />);
    const table = await screen.findByTestId('fd-monsters');
    expect(table.textContent).toMatch(/41 monsters in 29 combinations: 24 late .*, 19 giant/);
    const first = table.querySelector('tbody tr')!;
    expect(first.textContent).toMatch(/^031001001\s*47170,976/);
    fireEvent.click(first);
    await waitFor(() => expect(screen.getByTestId('fd-summary').textContent).toMatch(/Floor 4/));
    expect(location.search).toMatch(/^\?combo=031001001&circuit=\d+$/);
    expect(screen.getAllByTestId('fd-card').find((c) => c.className.includes('fd-card-on'))!.textContent).toMatch(/^170,976 tiles/);
  }, 60000);

  it('analyses a rule with no precomputed data live, and sweeps it', async () => {
    history.replaceState(null, '', '/Spectre/foundations.html?rule=15&level=6');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })));
    render(<FoundationsPage forceSync />);
    await waitFor(() => expect(screen.getByTestId('fd-summary').textContent).toMatch(/Floor \d/), { timeout: 60000 });
    expect(screen.getByTestId('fd-live').textContent).toMatch(/Rule 15: \d+ combinations · level 6, analysed here/);
    fireEvent.click(screen.getByTestId('fd-sweep'));
    await waitFor(() => expect(screen.getByTestId('fd-rows').textContent).toMatch(/\d{9}/), { timeout: 120000 });
    expect(location.search).toMatch(/rule=15/);
  }, 180000);
});
