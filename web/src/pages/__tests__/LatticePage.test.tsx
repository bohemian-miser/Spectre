// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import LatticePage from '../LatticePage';

describe('LatticePage', () => {
  afterEach(cleanup);

  it('plots the labels lattice and draws the picked circuit', () => {
    const { container } = render(<LatticePage />);
    expect(screen.getByRole('heading', { name: 'Flow lattice' })).toBeTruthy();
    expect(container.querySelectorAll('.lattice-pt')).toHaveLength(49);
    // The one-line points form a hexagon: the origin and six neighbours.
    expect(screen.getByTestId('lattice-counts').textContent).toContain('7 circuits with one line per edge');
    expect(screen.getByTestId('lattice-readout').textContent).toContain('1: +1, 5: +1');
    const patch = container.querySelector('svg.lattice-patch')!;
    const single = Number(patch.getAttribute('data-strands'));
    expect(single).toBeGreaterThan(0);

    // a = b = 1 doubles class 1: mod 2 only sees 258.
    fireEvent.click(screen.getByTestId('lattice-pt-1_1'));
    const readout = screen.getByTestId('lattice-readout').textContent!;
    expect(readout).toContain('1: +2');
    expect(readout).toContain('2 5 8');
    expect(Number(patch.getAttribute('data-strands'))).toBeGreaterThan(single);
  });

  it('counters set any flow, and say which tiles stop balancing', () => {
    const { container } = render(<LatticePage />);
    const patch = container.querySelector('svg.lattice-patch')!;
    // Start on 15: clear it, then push two strands backwards through class 3.
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getByTestId('lattice-balance').textContent).toContain('Every tile balances');
    fireEvent.click(screen.getByRole('button', { name: 'Less flow on 3' }));
    fireEvent.click(screen.getByRole('button', { name: 'Less flow on 3' }));
    expect(screen.getByTestId('lattice-count-3').textContent).toBe('−2');
    expect(screen.getByTestId('lattice-readout').textContent).toContain('3: −2');
    const balance = screen.getByTestId('lattice-balance').textContent!;
    expect(balance).toContain('Not a circuit');
    expect(balance).toContain('Phi has 2 more in');
    expect(Number(patch.getAttribute('data-unbalanced'))).toBeGreaterThan(0);
    expect(screen.getByTestId('lattice-readout').textContent).toContain('off this slice');
    // The matrix shows each term: Phi's class-3 entry is +1, times −2.
    expect(screen.getByTestId('lattice-cell-Phi-3').textContent).toBe('−2');
    expect(screen.getByTestId('lattice-cell-Phi-3').getAttribute('title')).toBe('+1 × −2');
    expect(screen.getByTestId('lattice-net-Phi').textContent).toBe('−2');
    expect(screen.getByTestId('lattice-strip-Phi').textContent).toContain('2 more in');
    // Delta meets class 3 once each way, so it still balances.
    expect(screen.getByTestId('lattice-net-Delta').textContent).toBe('0');

    // Clicking a lattice point puts the counters back on a circuit.
    fireEvent.click(screen.getByTestId('lattice-pt--1_0'));
    expect(screen.getByTestId('lattice-count-1').textContent).toBe('−1');
    expect(screen.getByTestId('lattice-count-5').textContent).toBe('−1');
    expect(screen.getByTestId('lattice-balance').textContent).toContain('Every tile balances');
    expect(patch.getAttribute('data-unbalanced')).toBe('0');
  });

  it('arrow keys pick a column and step its flow', () => {
    const { container } = render(<LatticePage />);
    const editor = screen.getByTestId('lattice-editor');
    const selectedHead = () => container.querySelector('.lattice-editor thead th.is-selected')?.textContent;
    expect(selectedHead()).toBe('1');
    fireEvent.keyDown(editor, { key: 'ArrowLeft' }); // already at the first column
    expect(selectedHead()).toBe('1');
    fireEvent.keyDown(editor, { key: 'ArrowRight' });
    fireEvent.keyDown(editor, { key: 'ArrowRight' });
    expect(selectedHead()).toBe('3');
    fireEvent.keyDown(editor, { key: 'ArrowDown' });
    fireEvent.keyDown(editor, { key: 'ArrowDown' });
    expect(screen.getByTestId('lattice-count-3').textContent).toBe('−2');
    fireEvent.keyDown(editor, { key: 'ArrowUp' });
    expect(screen.getByTestId('lattice-count-3').textContent).toBe('−1');
    // Clicking a column selects it for the keys too.
    fireEvent.click(screen.getByTestId('lattice-cell-Theta-8'));
    expect(selectedHead()).toBe('8');
    fireEvent.keyDown(editor, { key: 'ArrowRight' }); // already at the last column
    expect(selectedHead()).toBe('8');
  });

  it('the tile strip steps through each tile\'s in→out pairings', () => {
    const { container } = render(<LatticePage />);
    const strip = screen.getByTestId('lattice-strip');
    const patch = () => container.querySelector('svg.lattice-patch')!.innerHTML;
    // The 15 loop crosses Pi twice each way, so Pi has two pairings.
    for (let i = 0; i < 4; i++) fireEvent.keyDown(strip, { key: 'ArrowRight' });
    expect(screen.getByTestId('lattice-gallery').textContent).toContain('Pi: 2 ways to join its entries to its exits');
    expect(screen.getByTestId('lattice-combo-Pi').textContent).toContain('combo 1 of 2');
    const before = patch();
    fireEvent.keyDown(strip, { key: 'ArrowUp' });
    expect(screen.getByTestId('lattice-combo-Pi').textContent).toContain('combo 2 of 2');
    expect(patch()).not.toBe(before);
    fireEvent.keyDown(strip, { key: 'ArrowUp' }); // wraps round
    expect(screen.getByTestId('lattice-combo-Pi').textContent).toContain('combo 1 of 2');
    expect(patch()).toBe(before);
    // The gallery picks directly.
    fireEvent.click(screen.getByRole('button', { name: 'Pi combination 2' }));
    expect(screen.getByTestId('lattice-combo-Pi').textContent).toContain('combo 2 of 2');
    // Delta has only one way, so no counter.
    expect(screen.queryByTestId('lattice-combo-Delta')).toBeNull();
  });

  it('colours closed loops by turn, and reversing the flow swaps the counts', () => {
    const { container } = render(<LatticePage />);
    const patch = container.querySelector('svg.lattice-patch')!;
    const counts = () => ['cw', 'ccw', 'open'].map((k) => Number(patch.getAttribute(`data-${k}`)));
    const [cw, ccw, open] = counts();
    expect(cw + ccw).toBeGreaterThan(0);
    // Every drawn strand belongs to exactly one classified path.
    expect(patch.querySelectorAll('.lattice-strand.is-cw, .lattice-strand.is-ccw, .lattice-strand.is-open')).toHaveLength(
      Number(patch.getAttribute('data-strands')),
    );
    expect(screen.getByTestId('lattice-turns').textContent).toContain(`${cw} clockwise`);
    fireEvent.click(screen.getByTestId('lattice-pt--1_0'));
    expect(counts()).toEqual([ccw, cw, open]);
  });

  it('arrow keys move around the lattice slice, picking each point', () => {
    render(<LatticePage />);
    const plot = screen.getByTestId('lattice-plot');
    const readout = () => screen.getByTestId('lattice-readout').textContent!;
    expect(readout()).toContain('a = 1, b = 0');
    fireEvent.keyDown(plot, { key: 'ArrowUp' });
    expect(readout()).toContain('a = 1, b = 1');
    expect(readout()).toContain('1: +2');
    fireEvent.keyDown(plot, { key: 'ArrowLeft' });
    fireEvent.keyDown(plot, { key: 'ArrowDown' });
    expect(readout()).toContain('a = 0, b = 0');
    // The slice ends at ±3.
    for (let i = 0; i < 6; i++) fireEvent.keyDown(plot, { key: 'ArrowRight' });
    expect(readout()).toContain('a = 3, b = 0');
    // Off the slice (class 3 alone), the keys carry on from the last point.
    fireEvent.click(screen.getByRole('button', { name: 'More flow on 3' }));
    expect(readout()).toContain('off this slice');
    fireEvent.keyDown(plot, { key: 'ArrowLeft' });
    expect(readout()).toContain('a = 2, b = 0');
  });

  it('switches to meeting groups and its larger matrix', () => {
    render(<LatticePage />);
    fireEvent.change(screen.getByLabelText(/Unknowns/), { target: { value: 'groups' } });
    // Tile, twelve groups, Net.
    const head = screen.getByTestId('lattice-matrix').querySelectorAll('thead tr:first-child th');
    expect(head).toHaveLength(14);
    expect(screen.getByText(/The lattice has dimension 5/)).toBeTruthy();
  });

  it('class 0 either way: a 0 counter whose ± spreads to the class-0 tiles, and an axis that uses it', () => {
    const { container } = render(<LatticePage />);
    fireEvent.change(screen.getByLabelText(/Unknowns/), { target: { value: 'groups' } });
    fireEvent.click(screen.getByTestId('lattice-zero-toggle'));
    expect(screen.getByTestId('lattice-zero-note').textContent).toContain('dimension 8');
    // Tile, 0, twelve groups, Net.
    expect(screen.getByTestId('lattice-matrix').querySelectorAll('thead tr:first-child th')).toHaveLength(15);
    // Axis b starts on a loop that needs class 0.
    const axisB = screen.getByLabelText(/Axis b/) as HTMLSelectElement;
    expect(axisB.selectedOptions[0].textContent).toContain('0: ±');
    fireEvent.click(screen.getByTestId('lattice-pt-0_1'));
    const n = Number(screen.getByTestId('lattice-count-0').textContent!.replace('±', ''));
    expect(n).toBeGreaterThan(0);
    expect(screen.getByTestId('lattice-cell-Psi-0').textContent).toBe(`±${n}`);
    expect(screen.getByTestId('lattice-cell-Delta-0').textContent).toBe('·');
    // The ± carries through to the Net column: the row's directed sum, ± the class-0 lines.
    const psiNet = screen.getByTestId('lattice-net-Psi');
    expect(psiNet.textContent).toMatch(new RegExp(`^(0|[+−]\\d+) ±${n}$`));
    expect(psiNet.className).toContain('is-good');
    expect(screen.getByTestId('lattice-net-Delta').textContent).toBe('0');
    expect(screen.getByTestId('lattice-balance').textContent).toContain('Every tile balances');
    expect(container.querySelector('svg.lattice-patch')!.getAttribute('data-unbalanced')).toBe('0');
    // One more line breaks the parity; one more again restores it.
    fireEvent.click(screen.getByLabelText('More flow on 0'));
    expect(screen.getByTestId('lattice-count-0').textContent).toBe(`±${n + 1}`);
    expect(screen.getByTestId('lattice-net-Psi').textContent).toMatch(new RegExp(`±${n + 1}$`));
    expect(screen.getByTestId('lattice-net-Psi').className).toContain('is-bad');
    expect(screen.getByTestId('lattice-balance').textContent).toContain('Not a circuit');
    fireEvent.click(screen.getByLabelText('More flow on 0'));
    expect(screen.getByTestId('lattice-balance').textContent).toContain('Every tile balances');
    // Editing another column never moves the class-0 count, even when a tile then needs more lines.
    const before = screen.getByTestId('lattice-count-0').textContent;
    for (let i = 0; i < 4; i++) fireEvent.click(screen.getByLabelText('More flow on 8a'));
    expect(screen.getByTestId('lattice-count-0').textContent).toBe(before);
  });

  it('row echelon form: reduced rows, the ± carried along, and nets that follow the counters', () => {
    render(<LatticePage />);
    fireEvent.click(screen.getByTestId('lattice-zero-toggle'));
    fireEvent.click(screen.getByTestId('lattice-echelon-toggle'));
    const body = screen.getByTestId('lattice-echelon');
    expect(body.querySelectorAll('tr').length).toBeGreaterThan(0);
    // The default point is a circuit, so every reduced row balances.
    expect(body.querySelectorAll('.lattice-net.is-bad')).toHaveLength(0);
    // Set class 0 to one line by hand: rows carrying a ± now show it, and the ones with an odd ± can't reach 0.
    fireEvent.click(screen.getByLabelText('More flow on 0'));
    expect(screen.getByTestId('lattice-count-0').textContent).toBe('±1');
    const nets = [...body.querySelectorAll('.lattice-net')].map((c) => c.textContent);
    expect(nets.some((t) => t!.includes('±'))).toBe(true);
    expect(body.querySelectorAll('.lattice-net.is-bad').length).toBeGreaterThan(0);
    // Back to the tile rows.
    fireEvent.click(screen.getByTestId('lattice-echelon-toggle'));
    expect(screen.queryByTestId('lattice-echelon')).toBeNull();
    expect(screen.getByTestId('lattice-net-Delta')).toBeTruthy();
  });

  it('labels mode with class 0 either way gains just the in-and-out pair', () => {
    render(<LatticePage />);
    fireEvent.click(screen.getByTestId('lattice-zero-toggle'));
    expect(screen.getByTestId('lattice-zero-note').textContent).toContain('dimension 3');
    expect((screen.getByLabelText(/Axis b/) as HTMLSelectElement).selectedOptions[0].textContent).toBe('0: ±2');
  });
});
