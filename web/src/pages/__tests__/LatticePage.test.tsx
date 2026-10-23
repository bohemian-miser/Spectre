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

    // Clicking a lattice point puts the counters back on a circuit.
    fireEvent.click(screen.getByTestId('lattice-pt--1_0'));
    expect(screen.getByTestId('lattice-count-1').textContent).toBe('−1');
    expect(screen.getByTestId('lattice-count-5').textContent).toBe('−1');
    expect(screen.getByTestId('lattice-balance').textContent).toContain('Every tile balances');
    expect(patch.getAttribute('data-unbalanced')).toBe('0');
  });

  it('switches to meeting groups and its larger matrix', () => {
    render(<LatticePage />);
    fireEvent.change(screen.getByLabelText(/Unknowns/), { target: { value: 'groups' } });
    const head = screen.getByTestId('lattice-matrix').querySelectorAll('thead th');
    expect(head).toHaveLength(13);
    expect(screen.getByText(/The lattice has dimension 5/)).toBeTruthy();
  });
});
