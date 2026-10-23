// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import MultiEdgePage from '../MultiEdgePage';

describe('MultiEdgePage', () => {
  afterEach(cleanup);

  it('arrow keys edit counts; pairs keep the parity, odd counts leave the cube', () => {
    render(<MultiEdgePage />);
    const editor = screen.getByTestId('multiedge-editor');
    const where = () => screen.getByTestId('multiedge-where').textContent!;
    expect(where()).toContain('Parity pattern 15');
    // Class 8 is the last column.
    for (let i = 0; i < 9; i++) fireEvent.keyDown(editor, { key: 'ArrowRight' });
    fireEvent.keyDown(editor, { key: 'ArrowUp' });
    fireEvent.keyDown(editor, { key: 'ArrowUp' });
    expect(screen.getByTestId('multiedge-count-8').textContent).toBe('2');
    expect(where()).toContain('Parity pattern 15');
    expect(where()).toContain('plus 1 extra pair');
    expect(screen.getByTestId('multiedge-stack-8').querySelectorAll('.multiedge-pair')).toHaveLength(1);
    fireEvent.keyDown(editor, { key: 'ArrowUp' });
    expect(where()).toContain('Off the cube');
    expect(screen.getByTestId('multiedge-ends-Pi').textContent).toContain('odd');
    // Clicking a corner sets the parity and keeps the pair on 8: 3 → 1 + 2 → 128 gives 8 odd again.
    fireEvent.click(screen.getByTestId('multiedge-corner-128'));
    expect(where()).toContain('Parity pattern 128');
    expect(screen.getByTestId('multiedge-count-8').textContent).toBe('3');
    expect(screen.getByTestId('multiedge-count-5').textContent).toBe('0');
  });

  it('shows the matrix row reduced mod 2, with the tiles behind each row', () => {
    render(<MultiEdgePage />);
    fireEvent.click(screen.getByTestId('multiedge-rref'));
    const table = screen.getByTestId('multiedge-matrix');
    expect(table.querySelectorAll('tbody tr')).toHaveLength(5);
    expect(table.textContent).toContain('pivot');
    expect(table.textContent).toContain('free');
    expect(table.querySelector('tbody th')!.getAttribute('title')).toMatch(/\(mod 2\)$/);
    // A valid choice keeps every reduced row even too.
    for (let i = 1; i <= 5; i++) expect(screen.getByTestId(`multiedge-ends-R${i}`).textContent).toContain('even');
  });

  it('the strip steps through a tile\'s pairings and the patch colours closed loops', () => {
    const { container } = render(<MultiEdgePage />);
    const strip = screen.getByTestId('multiedge-strip');
    for (let i = 0; i < 4; i++) fireEvent.keyDown(strip, { key: 'ArrowRight' });
    expect(screen.getByTestId('multiedge-gallery').textContent).toContain('Pi: 2 ways to pair its 4 ends');
    const patch = () => container.querySelector('svg.lattice-patch')!.innerHTML;
    const before = patch();
    fireEvent.keyDown(strip, { key: 'ArrowUp' });
    expect(screen.getByTestId('multiedge-combo-Pi').textContent).toContain('2 of 2');
    expect(patch()).not.toBe(before);
    const svg = container.querySelector('svg.lattice-patch')!;
    expect(Number(svg.getAttribute('data-closed')) + Number(svg.getAttribute('data-open'))).toBeGreaterThan(0);
    expect(svg.getAttribute('data-odd')).toBe('0');
  });
});
