// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import HarmonicsPage from '../HarmonicsPage';
import { HarmonicsEngine } from '../harmonics/harmonicsJob';

describe('HarmonicsPage', () => {
  afterEach(cleanup);

  it('puts every circuit once in a table, a column per level and a row per chain, and opens the chosen row', async () => {
    render(<HarmonicsPage forceSync />);
    await waitFor(() => expect(screen.getByTestId('harm-summary').textContent).toMatch(/^11 distinct circuits in 5 families; 4 chains of two or more/), { timeout: 60000 });
    expect(screen.getByTestId('harm-summary').textContent).toMatch(/Level 2: 3 born, 3 new; Level 4: 4 born, 3 new; Level 6: 4 born, 0 new/);
    // Every circuit once, in the column of its level; the rows are the chains, those of one circuit included.
    const r = new HarmonicsEngine({ family: 'hex', subset: [0, 2, 3, 4, 6, 8], combo: '000100000', level: 6 }).result();
    const cells = screen.getAllByTestId('harm-cell');
    expect(cells.map((c) => Number(c.dataset.circuit)).sort((a, b) => a - b)).toEqual(r.circuits.map((_, i) => i));
    for (const c of cells) {
      const i = Number(c.dataset.circuit);
      expect(Number(c.dataset.level)).toBe(r.circuits[i].level);
      const td = c.closest('td')!;
      expect([...td.parentElement!.children].indexOf(td) - 1).toBe(r.circuits[i].level);
    }
    const rows = screen.getAllByTestId('harm-table-row').map((row) => row.dataset.members);
    expect(rows.sort()).toEqual(r.chains.map((ch) => ch.members.join(' ')).sort());
    // The biggest circuit is chosen first, with its chain; its readings from level 2 up are the 441's from level 0 up.
    const detail = screen.getByTestId('harm-detail');
    expect(detail.querySelector('h2')!.textContent).toBe('A chain of family 013467: 441 L4 → 8,784 L6');
    await waitFor(() => expect(screen.getByTestId('harm-readings').textContent).toContain('the same'), { timeout: 60000 });
    const lines = [...screen.getByTestId('harm-readings').querySelectorAll('tbody tr')].map((row) => row.textContent!);
    expect(lines.filter((x) => x.includes('the same'))).toHaveLength(3);
    expect(lines.filter((x) => x.includes('differs'))).toHaveLength(1);
    expect(screen.getByTestId('harm-extras').textContent).toMatch(/24 extra runs of visits and misses 0 of the 441's tiles/);
    // The chain over its supertiles: the members agree at the top levels.
    await waitFor(() => expect(screen.getAllByTestId('harm-side')).toHaveLength(2), { timeout: 10000 });
    expect(screen.getAllByTestId('harm-side')[1].textContent).toMatch(/8,784 L6 at level 5: 183 visits through 6 supertiles/);
    expect(screen.getAllByTestId('harm-step')[0].textContent).toBe('=');
    // The rows of visits: hovering the 8,784's Delta lights its run below and, through the readings, the 441's Delta and its run.
    fireEvent.change(screen.getByTestId('harm-k'), { target: { value: '2' } });
    await waitFor(() => expect(screen.getAllByTestId('harm-row')).toHaveLength(4), { timeout: 10000 });
    const [top441, low441, top8784, low8784] = [0, 2, 1, 3].map((q) => screen.getAllByTestId('harm-row')[q]);
    expect(top8784.textContent).toMatch(/^level 5 · 183 visits, 180 back and forth/);
    const delta = [...top8784.querySelectorAll('[data-testid="harm-item"]')].find((x) => x.textContent === 'Delta 1')!;
    fireEvent.mouseEnter(delta);
    await waitFor(() => expect(top441.querySelector('.is-lit')?.textContent).toBe('Delta 1'), { timeout: 10000 });
    expect(low8784.querySelectorAll('.is-lit').length).toBeGreaterThan(0);
    expect(low441.querySelectorAll('.is-lit').length).toBeGreaterThan(0);
    // Shift-click: exactly two circuits compared, and back to the chain.
    const cellOf = (len: string) => screen.getAllByTestId('harm-cell').find((c) => c.textContent === len)!;
    fireEvent.click(cellOf('8,784'));
    fireEvent.click(cellOf('162'), { shiftKey: true });
    await waitFor(() => expect(screen.getByTestId('harm-pairbar').textContent).toMatch(/^Comparing 162 L4 and 8,784 L6/), { timeout: 10000 });
    expect(screen.getAllByTestId('harm-cell').filter((c) => c.classList.contains('is-selected')).map((c) => c.textContent)).toEqual(['162', '8,784']);
    await waitFor(() => expect(screen.getAllByTestId('harm-side')).toHaveLength(2), { timeout: 10000 });
    fireEvent.click(screen.getByTestId('harm-back'));
    expect(screen.getByTestId('harm-detail').querySelector('h2')!.textContent).toBe('A chain of family 013467: 441 L4 → 8,784 L6');
    // A circuit in no chain.
    fireEvent.click(cellOf('18'));
    expect(screen.getByTestId('harm-detail').querySelector('h2')!.textContent).toBe('18 tiles at level 2, in no chain');
    // One level more adds nothing new at level 7, and the chosen circuit stays chosen.
    fireEvent.click(screen.getByTestId('harm-next'));
    await waitFor(() => expect(screen.getByTestId('harm-summary').textContent).toMatch(/Level 6: 4 born, 0 new\.$/), { timeout: 60000 });
    expect(screen.getByText(/Families and chains of 023468 · 000100000 to level 7/)).toBeTruthy();
    expect(screen.getByTestId('harm-detail').querySelector('h2')!.textContent).toBe('18 tiles at level 2, in no chain');
  }, 120000);

  it('keeps a family member in no chain with the others in a row of its own', async () => {
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
    const rows = screen.getAllByTestId('harm-table-row');
    expect(rows.map((r) => r.querySelector('th')!.textContent)).toContain('alone · top 1');
    const chainRow = rows.find((r) => r.textContent!.includes('303') && r.textContent!.includes('14,679'))!;
    expect(chainRow.querySelector('th')!.textContent).toBe('chain');
    fireEvent.click(screen.getAllByTestId('harm-cell').find((c) => c.textContent === '14,679')!);
    await waitFor(() => expect(screen.getByTestId('harm-detail').querySelector('h2')!.textContent).toBe('A chain of family 147: 303 L4 → 14,679 L6'), { timeout: 10000 });
    await waitFor(() => expect(screen.getByTestId('harm-readings').textContent).toMatch(/the same/), { timeout: 30000 });
    const lines = [...screen.getByTestId('harm-readings').querySelectorAll('tbody tr')].map((r) => r.textContent!);
    expect(lines.filter((r) => r.includes('the same'))).toHaveLength(2);
    expect(lines.filter((r) => r.includes('differs'))).toHaveLength(2);
  }, 120000);

  it('brute-forces a chain’s next member past the level built, and climbs a strand', async () => {
    history.replaceState(null, '', '?rule=023468&combo=000100000&level=6');
    render(<HarmonicsPage forceSync />);
    await waitFor(() => expect(screen.getByTestId('harm-summary').textContent).toMatch(/^11 distinct circuits/), { timeout: 60000 });
    // the 441 → 8,784 chain: a ? at level 8, in the column of level 8
    const row = screen.getAllByTestId('harm-table-row').find((r) => r.textContent!.includes('441') && r.textContent!.includes('8,784'))!;
    const go = row.querySelector<HTMLButtonElement>('[data-testid="harm-brute"]')!;
    const td = go.closest('td')!;
    expect([...row.children].indexOf(td) - 1).toBe(8);
    fireEvent.click(go);
    // the member found takes the cell like a built one: drawn, with its tiles; how it was found on hover
    await waitFor(() => expect(row.querySelector('[data-testid="harm-brute-done"]')?.textContent).toBe('175,221'), { timeout: 60000 });
    const done = row.querySelector<HTMLButtonElement>('[data-testid="harm-brute-done"]')!;
    expect(done.querySelector('canvas')).toBeTruthy();
    expect(done.title).toMatch(/Level 8: a 175,221-tile circuit of family 013467 closes in the Delta, reading as the 8,784 two levels down from level 1 up; word key/);
    expect([...row.children].indexOf(done.closest('td')!) - 1).toBe(8);
    // the next one along, two levels further
    const next = row.querySelector<HTMLButtonElement>('[data-testid="harm-brute"]')!;
    expect([...row.children].indexOf(next.closest('td')!) - 1).toBe(10);
    // clicking it opens its chain, the member found after the built ones
    await waitFor(() => expect(done.disabled).toBe(false), { timeout: 30000 });
    fireEvent.click(done);
    await waitFor(() => expect(screen.getByTestId('harm-detail').querySelector('h2')!.textContent).toBe('A chain of family 013467: 441 L4 → 8,784 L6 → 175,221 L8'), { timeout: 30000 });
    await waitFor(() => expect(screen.getAllByTestId('harm-side')).toHaveLength(3), { timeout: 30000 });
    expect(screen.getAllByTestId('harm-side')[2].textContent).toMatch(/^=?175,221 L8 at level 7: [\d,]+ visits through/);
    expect(screen.getAllByTestId('harm-step')[1].textContent).toBe('=');
    await waitFor(() => expect(screen.getByTestId('harm-readings').textContent).toContain('the same'), { timeout: 30000 });
    // the address names it, and a page opened there finds it again
    expect(location.search).toMatch(/&c=8-175221&bf=6-8784\.8-175221$/);
    const address = location.search;
    fireEvent.click(screen.getByTestId('harm-climb-go'));
    await waitFor(() => expect(screen.getByTestId('harm-climb-result').textContent).toMatch(/^ L6 [\d,]+ → L7 /), { timeout: 60000 });
    cleanup();
    history.replaceState(null, '', address);
    render(<HarmonicsPage forceSync />);
    await waitFor(() => expect(screen.getByTestId('harm-detail').querySelector('h2')!.textContent).toBe('A chain of family 013467: 441 L4 → 8,784 L6 → 175,221 L8'), { timeout: 60000 });
    expect(screen.getAllByTestId('harm-brute-done').map((c) => c.textContent)).toEqual(['175,221']);
    expect(screen.getAllByTestId('harm-brute-done')[0].classList.contains('is-selected')).toBe(true);
    expect(location.search).toBe(address);
  }, 180000);
});
