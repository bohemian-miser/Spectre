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

  it('lists the factors, steps through the pairings and reaches every split of 1155', () => {
    const { container } = render(<MultiEdgePage />);
    const split = () => screen.getByTestId('multiedge-split').textContent!;
    expect(split()).toBe('15 = 15');
    expect(screen.getByTestId('multiedge-factor-0').textContent).toContain('no: an atom');
    // 15 → 1155: one more strand on 1 and on 5.
    const editor = screen.getByTestId('multiedge-editor');
    fireEvent.keyDown(editor, { key: 'ArrowRight' });
    fireEvent.keyDown(editor, { key: 'ArrowUp' });
    for (let i = 0; i < 4; i++) fireEvent.keyDown(editor, { key: 'ArrowRight' });
    fireEvent.keyDown(editor, { key: 'ArrowUp' });
    const splits = screen.getByTestId('multiedge-splits');
    const names = [...splits.querySelectorAll('button .mono')].map((b) => b.textContent).sort();
    expect(names).toEqual(['11 + 55', '1155', '15 + 15']);
    // Jump to 15 + 15: two factors, and the patch colours strands by them.
    const target = [...splits.querySelectorAll('button')].find((b) => b.textContent!.startsWith('15 + 15'))!;
    fireEvent.click(target);
    expect(split()).toBe('1155 = 15 + 15');
    expect(target.getAttribute('aria-pressed')).toBe('true');
    const factorsSeen = () => new Set([...container.querySelectorAll('svg.lattice-patch path[data-factor]')].map((p) => p.getAttribute('data-factor')));
    expect(factorsSeen()).toEqual(new Set(['0', '1']));
    // Arrow keys step the combination; "next different split" always changes it.
    const panel = screen.getByTestId('multiedge-factors');
    const combo = () => screen.getByTestId('multiedge-combo-all').textContent!;
    const before = combo();
    fireEvent.keyDown(panel, { key: 'ArrowRight' });
    expect(combo()).not.toBe(before);
    const now = split();
    fireEvent.click(screen.getByTestId('multiedge-next-split'));
    expect(split()).not.toBe(now);
    // Up/down picks out a factor; the rest fade.
    fireEvent.click(target);
    fireEvent.keyDown(panel, { key: 'ArrowDown' });
    expect(container.querySelectorAll('svg.lattice-patch path.is-dim').length).toBeGreaterThan(0);
    expect(screen.getByTestId('multiedge-factor-0').className).toBe('is-selected');
  });
});
