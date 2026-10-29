// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import HarmonicsPage from '../HarmonicsPage';

describe('HarmonicsPage', () => {
  afterEach(cleanup);

  it('reads the default combination to level 6 into its lineages and lines a harmonic up with its fundamental', async () => {
    render(<HarmonicsPage forceSync />);
    await waitFor(() => expect(screen.getByTestId('harm-summary').textContent).toMatch(/^11 distinct circuits in 5 lineages: 4 with harmonics, 1 alone/), { timeout: 60000 });
    expect(screen.getByTestId('harm-summary').textContent).toMatch(/Level 2: 3 born, 3 new; Level 4: 4 born, 2 new; Level 6: 4 born, 0 new/);
    const chains = screen.getByTestId('harm-chains');
    expect(chains.textContent).toMatch(/18 L2→ ×24\.5\*441 L4→ ×19\.9\*8,784 L6/);
    expect(chains.textContent).toMatch(/15 L4→ ×18\.4276 L6/);
    // The biggest circuit is picked first: its readings from level 2 up are the 441's from level 0 up.
    const detail = screen.getByTestId('harm-detail');
    expect(detail.querySelector('h2')!.textContent).toBe('8,784 tiles at level 6 is 441 at level 4, two levels up');
    const rows = [...screen.getByTestId('harm-readings').querySelectorAll('tbody tr')].map((r) => r.textContent!);
    expect(rows[0]).toMatch(/^5183 → 3/);
    expect(rows[1]).toMatch(/^3 of the fundamental33 → 3/);
    expect(rows.filter((r) => r.includes('the same'))).toHaveLength(3);
    expect(rows.filter((r) => r.includes('differs'))).toHaveLength(1);
    expect(screen.getByTestId('harm-extras').textContent).toMatch(/24 extra runs of visits and misses 0 of the fundamental's tiles/);
    // A fundamental has no partner.
    fireEvent.click(screen.getAllByRole('button', { name: /^18/ })[0]);
    expect(screen.getByTestId('harm-detail').querySelector('h2')!.textContent).toBe('18 tiles at level 2, a fundamental');
    // One level more adds nothing new at level 7, and the chosen circuit stays chosen.
    fireEvent.click(screen.getByTestId('harm-next'));
    await waitFor(() => expect(screen.getByTestId('harm-summary').textContent).toMatch(/Level 6: 4 born, 0 new\.$/), { timeout: 60000 });
    expect(screen.getByText(/Lineages of 023468 · 000100000 to level 7/)).toBeTruthy();
    expect(screen.getByTestId('harm-detail').querySelector('h2')!.textContent).toBe('18 tiles at level 2, a fundamental');
  });
});
