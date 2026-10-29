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
    await waitFor(() => expect(screen.getByTestId('harm-readings').textContent).toContain('the same'), { timeout: 60000 });
    const rows = [...screen.getByTestId('harm-readings').querySelectorAll('tbody tr')].map((r) => r.textContent!);
    expect(rows[0]).toMatch(/^5183 → 3/);
    expect(rows[1]).toMatch(/^3 of the other33 → 3/);
    expect(rows.filter((r) => r.includes('the same'))).toHaveLength(3);
    expect(rows.filter((r) => r.includes('differs'))).toHaveLength(1);
    // At level 2 the harmonic's extra visits are outlined: 72 tokens of its 513 are unshared, none of the 441's.
    const level2 = screen.getByTestId('harm-readings').querySelectorAll('tbody tr')[6];
    expect(level2.textContent).toMatch(/^21,395 → 513/);
    expect(level2.querySelectorAll('.harm-token-differs').length).toBeGreaterThan(0);
    expect(screen.getByTestId('harm-partner')).toHaveProperty('value', String(2 + 5));
    expect(screen.getByTestId('harm-extras').textContent).toMatch(/24 extra runs of visits and misses 0 of the fundamental's tiles/);
    // A fundamental has no partner.
    // Any other circuit can be lined up with the picked one.
    fireEvent.change(screen.getByTestId('harm-partner'), { target: { value: '5' } });
    await waitFor(() => expect(screen.getByTestId('harm-detail').querySelector('h2')!.textContent).toBe('8,784 tiles at level 6 against 162 at level 4'), { timeout: 10000 });
    await waitFor(() => expect(screen.getByTestId('harm-readings').textContent).toMatch(/differs/), { timeout: 10000 });
    fireEvent.click(screen.getAllByRole('button', { name: /^18/ })[0]);
    expect(screen.getByTestId('harm-detail').querySelector('h2')!.textContent).toBe('18 tiles at level 2, a fundamental');
    // One level more adds nothing new at level 7, and the chosen circuit stays chosen.
    fireEvent.click(screen.getByTestId('harm-next'));
    await waitFor(() => expect(screen.getByTestId('harm-summary').textContent).toMatch(/Level 6: 4 born, 0 new\.$/), { timeout: 60000 });
    expect(screen.getByText(/Lineages of 023468 · 000100000 to level 7/)).toBeTruthy();
    expect(screen.getByTestId('harm-detail').querySelector('h2')!.textContent).toBe('18 tiles at level 2, a fundamental');
  });

  it('shows near-lineages, pairs that read the same at the top levels only, and lines them up', async () => {
    render(<HarmonicsPage forceSync />);
    await waitFor(() => expect(screen.getByTestId('harm-summary').textContent).toMatch(/^11 distinct circuits/), { timeout: 60000 });
    // 023468-140000001: Delta 1, Theta 4, Gamma 1.
    fireEvent.change(screen.getByTestId('shapes-combo-Delta'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('shapes-combo-Theta'), { target: { value: '4' } });
    fireEvent.change(screen.getByTestId('shapes-combo-Gamma'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('shapes-combo-Xi'), { target: { value: '0' } });
    fireEvent.change(screen.getByTestId('shapes-combo-level'), { target: { value: '6' } });
    expect(screen.getByTestId('shapes-combo-add').textContent).toBe('Read 023468 · 140000001');
    fireEvent.click(screen.getByTestId('shapes-combo-add'));
    await waitFor(() => expect(screen.getByText(/Lineages of 023468 · 140000001 to level 6/)).toBeTruthy(), { timeout: 60000 });
    await waitFor(() => expect(screen.getByTestId('harm-summary').textContent).toMatch(/^6 distinct circuits in 6 lineages/), { timeout: 60000 });
    // 14,679 at level 6 reads as the 303 at its top two levels and differs below.
    const near = screen.getAllByTestId('harm-near');
    expect(near.map((b) => b.textContent)).toContain('14,679 L6');
    fireEvent.click(near.find((b) => b.textContent === '14,679 L6')!);
    await waitFor(() => expect(screen.getByTestId('harm-detail').querySelector('h2')!.textContent).toBe('14,679 tiles at level 6 against 303 at level 4'), { timeout: 10000 });
    await waitFor(() => expect(screen.getByTestId('harm-readings').textContent).toMatch(/the same/), { timeout: 30000 });
    const rows = [...screen.getByTestId('harm-readings').querySelectorAll('tbody tr')].map((r) => r.textContent!);
    expect(rows.filter((r) => r.includes('the same'))).toHaveLength(2);
    expect(rows.filter((r) => r.includes('differs'))).toHaveLength(2);
    // The family through children 1, 4 and 7 runs one level at a time, growing by about the area factor.
    expect(screen.getByTestId('harm-families').textContent).toMatch(/through children 147:60 L3→ ×5\.0303 L4→ ×6\.92,079 L5→ ×7\.114,679 L6/);
  });
});
