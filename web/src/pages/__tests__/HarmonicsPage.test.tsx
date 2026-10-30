// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import HarmonicsPage from '../HarmonicsPage';

describe('HarmonicsPage', () => {
  afterEach(cleanup);

  it('lists the default combination to level 6 by family and chain, and lines the chosen chain up', async () => {
    render(<HarmonicsPage forceSync />);
    await waitFor(() => expect(screen.getByTestId('harm-summary').textContent).toMatch(/^11 distinct circuits in 5 families; 4 chains of two or more/), { timeout: 60000 });
    expect(screen.getByTestId('harm-summary').textContent).toMatch(/Level 2: 3 born, 3 new; Level 4: 4 born, 3 new; Level 6: 4 born, 0 new/);
    const families = screen.getByTestId('harm-families');
    expect(families.textContent).toMatch(/Family 147 4 circuits through children 1, 4, 7Chain9 L2→ ×18\.0162 L4→ ×20\.13,258 L6In no chain18 L2/);
    expect(families.textContent).toMatch(/Family 013467 2 circuits through children 0, 1, 3, 4, 6, 7Chain441 L4→ ×19\.98,784 L6/);
    // The biggest circuit is picked first, with its chain; its readings from level 2 up are the 441's from level 0 up.
    const detail = screen.getByTestId('harm-detail');
    expect(detail.querySelector('h2')!.textContent).toBe('A chain of family 013467: 441 L4 → 8,784 L6');
    await waitFor(() => expect(screen.getByTestId('harm-readings').textContent).toContain('the same'), { timeout: 60000 });
    const rows = [...screen.getByTestId('harm-readings').querySelectorAll('tbody tr')].map((r) => r.textContent!);
    expect(rows[0]).toMatch(/^5183 → 3/);
    expect(rows[1]).toMatch(/^3 of the other33 → 3/);
    expect(rows.filter((r) => r.includes('the same'))).toHaveLength(3);
    expect(rows.filter((r) => r.includes('differs'))).toHaveLength(1);
    expect(screen.getByTestId('harm-extras').textContent).toMatch(/24 extra runs of visits and misses 0 of the 441's tiles/);
    // The chain over its supertiles: at the top levels the members agree; at the tiles the bigger one's extra visits are marked.
    await waitFor(() => expect(screen.getAllByTestId('harm-side')).toHaveLength(2), { timeout: 10000 });
    expect(screen.getAllByTestId('harm-side')[1].textContent).toMatch(/8,784 L6 at level 5: 183 visits through 6 supertiles/);
    expect(screen.getAllByTestId('harm-step')[0].textContent).toBe('=');
    fireEvent.change(screen.getByTestId('harm-k'), { target: { value: '0' } });
    await waitFor(() => expect(screen.getAllByTestId('harm-side')[1].textContent).toMatch(/at level 2: 1,395 visits through 441 supertiles; 72 hold visits its neighbour lacks/), { timeout: 10000 });
    expect(screen.getAllByTestId('harm-side')[1].querySelectorAll('.harm-st-unshared')).toHaveLength(72);
    expect(screen.getAllByTestId('harm-step')[0].textContent).toBe('≠');
    // Chips across the chain: the birth supertiles' children, the back-and-forth runs as one chip each.
    await waitFor(() => expect(screen.getAllByTestId('harm-row')).toHaveLength(2), { timeout: 10000 });
    expect(screen.getAllByTestId('harm-row')[1].textContent).toMatch(/^183 visits at level 5; 180 back and forth across seams, in 4 runs the reading cancels/);
    // Hovering the 8,784's Delta previews it; clicking pins it and the 441's Delta paired with it, and both open a level further.
    const delta = screen.getAllByTestId('harm-row')[1].querySelector('[data-testid="harm-item"]')!;
    fireEvent.mouseEnter(delta);
    await waitFor(() => expect(screen.getByTestId('harm-pop').textContent).toMatch(/^106 visits at level 4/), { timeout: 10000 });
    fireEvent.mouseLeave(delta);
    fireEvent.click(delta);
    await waitFor(() => expect(screen.getAllByTestId('harm-row')[0].querySelector('.harm-chip-picked')?.textContent).toBe('Delta 1'), { timeout: 10000 });
    expect(screen.getAllByTestId('harm-row')[1].querySelector('.harm-chip-picked')!.textContent).toBe('Delta 1');
    await waitFor(() => expect(screen.getAllByTestId('harm-children').map((c) => c.textContent!.split(';')[0])).toEqual(['17 visits at level 2', '106 visits at level 4']), { timeout: 10000 });
    // Any other circuit can be lined up with the picked one.
    fireEvent.change(screen.getByTestId('harm-partner'), { target: { value: '5' } });
    await waitFor(() => expect(screen.getByTestId('harm-readings').textContent).toMatch(/differs/), { timeout: 10000 });
    fireEvent.click(screen.getAllByRole('button', { name: /^18/ })[0]);
    expect(screen.getByTestId('harm-detail').querySelector('h2')!.textContent).toBe('18 tiles at level 2, in no chain');
    // One level more adds nothing new at level 7, and the chosen circuit stays chosen.
    fireEvent.click(screen.getByTestId('harm-next'));
    await waitFor(() => expect(screen.getByTestId('harm-summary').textContent).toMatch(/Level 6: 4 born, 0 new\.$/), { timeout: 60000 });
    expect(screen.getByText(/Families and chains of 023468 · 000100000 to level 7/)).toBeTruthy();
    expect(screen.getByTestId('harm-detail').querySelector('h2')!.textContent).toBe('18 tiles at level 2, in no chain');
  }, 60000);

  it('keeps a family member in no chain with the others apart, with how many top levels it agrees at', async () => {
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
    await waitFor(() => expect(screen.getByText(/Families and chains of 023468 · 140000001 to level 6/)).toBeTruthy(), { timeout: 60000 });
    await waitFor(() => expect(screen.getByTestId('harm-summary').textContent).toMatch(/^6 distinct circuits in 2 families; 1 chains of two or more/), { timeout: 60000 });
    // 14,679 at level 6 is the 303's harmonic from level 2 up; the 60 agrees with the 2,079 at the top level only.
    const families = screen.getByTestId('harm-families').textContent!;
    expect(families).toMatch(/Chain303 L4→ ×48\.414,679 L6/);
    expect(families).toMatch(/60 L3agrees with the 2,079 L5 at the top level/);
    fireEvent.click(screen.getAllByRole('button', { name: /^14,679/ })[0]);
    await waitFor(() => expect(screen.getByTestId('harm-detail').querySelector('h2')!.textContent).toBe('A chain of family 147: 303 L4 → 14,679 L6'), { timeout: 10000 });
    await waitFor(() => expect(screen.getByTestId('harm-readings').textContent).toMatch(/the same/), { timeout: 30000 });
    const rows = [...screen.getByTestId('harm-readings').querySelectorAll('tbody tr')].map((r) => r.textContent!);
    expect(rows.filter((r) => r.includes('the same'))).toHaveLength(2);
    expect(rows.filter((r) => r.includes('differs'))).toHaveLength(2);
  }, 60000);
});
