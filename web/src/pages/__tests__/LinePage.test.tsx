// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import LinePage from '../LinePage';

afterEach(cleanup);

describe('LinePage', () => {
  it('lays out the proof from its computations', () => {
    render(<LinePage />);
    expect(screen.getByTestId('ln-hero').textContent).toContain('496 tiles, 667 chords, one strand');
    expect(screen.getByTestId('ln-repeat-table').querySelectorAll('td.ln-same')).toHaveLength(9);
    expect(screen.getByTestId('ln-circuits-table').textContent).not.toMatch(/[1-9]\d*\s*$/);
    expect(screen.getByTestId('ln-psi-table').querySelectorAll('tbody tr')).toHaveLength(8);
    expect(screen.getByTestId('ln-nest-table').querySelectorAll('tbody tr')).toHaveLength(3);
    expect(screen.getByTestId('ln-chain-table').querySelectorAll('tbody tr')).toHaveLength(2);
    expect(screen.getByTestId('ln-pairs-table').textContent).not.toContain('yes');
    expect(screen.getByTestId('ln-barcode').querySelectorAll('button')).toHaveLength(179);
    expect(screen.getByTestId('ln-recipe-table').querySelectorAll('tbody tr')).toHaveLength(27);
    expect(screen.getByTestId('ln-recipe-fig').textContent).toContain('Psi 0–1: 179 steps');
    expect(screen.getByTestId('ln-stitch').querySelector('svg')).toBeTruthy();
  });
});
