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
    await waitFor(() => expect(screen.getByTestId('fd-summary').textContent).toMatch(/Floor 2.*Last foundational level 6.*19 foundational circuits, 18 with harmonics.*Tails at level 10: 50\.8%/));
    expect(screen.getByTestId('fd-note').textContent).toMatch(/Nothing foundational closes at levels 7 to 10 \(built to 10\); not proven beyond\./);
    const cards = screen.getAllByTestId('fd-card');
    expect(cards).toHaveLength(19);
    // the 303 at level 4 and its chain, each harmonic predicted, then built
    const c303 = cards.find((c) => c.textContent!.startsWith('303 tiles'))!;
    expect(within(c303).getByTestId('fd-chain').textContent).toBe('→14.7k L6 ✓ →734k L8 ✓ →36.7M L10 ✓');
    // the eight 447s at level 6 are late
    expect(cards.filter((c) => c.textContent!.includes('447 tiles') && c.textContent!.includes('late'))).toHaveLength(8);
    await waitFor(() => expect(c303.querySelector('svg polygon')).not.toBeNull(), { timeout: 30000 });
    expect(within(c303).getByText('Build-up').getAttribute('href')).toBe(`${import.meta.env.BASE_URL}buildup.html?rule=023468&combo=140000001&level=4&circuit=303`);
    expect(within(c303).getByText('Explorer').getAttribute('href')).toMatch(/#\/explorer\?/);
    // choosing a card puts it in the address
    fireEvent.click(c303);
    expect(location.search).toBe('?combo=140000001&circuit=1');
  }, 60000);

  it('lists the monsters and opens one in its combination', async () => {
    history.replaceState(null, '', '/Spectre/foundations.html?view=monsters');
    render(<FoundationsPage forceSync />);
    const table = await screen.findByTestId('fd-monsters');
    expect(table.textContent).toMatch(/239 monsters in 56 combinations: 222 late .*, 19 giant/);
    const first = table.querySelector('tbody tr')!;
    expect(first.textContent).toMatch(/^031001001\s*47170,976/);
    fireEvent.click(first);
    await waitFor(() => expect(screen.getByTestId('fd-summary').textContent).toMatch(/Floor 4/));
    expect(location.search).toMatch(/^\?combo=031001001&circuit=\d+$/);
    expect(screen.getAllByTestId('fd-card').find((c) => c.className.includes('fd-card-on'))!.textContent).toMatch(/^170,976 tiles/);
  }, 60000);
});
