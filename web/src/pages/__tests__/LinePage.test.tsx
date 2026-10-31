// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import LinePage from '../LinePage';

afterEach(cleanup);

describe('LinePage', () => {
  it('lays out the proof from its computations', () => {
    render(<LinePage />);
    expect(screen.getByTestId('ln-hero').textContent).toContain('496 tiles, one strand');
    expect(screen.getByTestId('ln-repeat-table').querySelectorAll('td.ln-same')).toHaveLength(9);
    expect(screen.getByText(/None closes at levels 1 to 3/)).toBeTruthy();
    expect(screen.queryByText(/not found here/)).toBeNull();
    expect(screen.getByTestId('ln-psi-table').querySelectorAll('tbody tr')).toHaveLength(6);
    expect(screen.getByTestId('ln-chain-table').querySelectorAll('tbody tr')).toHaveLength(2);
    expect(screen.getByTestId('ln-pairs-table').textContent).not.toContain('yes');
    expect(screen.getByTestId('ln-labels-anim').querySelector('canvas')).toBeTruthy();
    expect(screen.getByTestId('ln-stitch-anim').querySelector('canvas')).toBeTruthy();
  });
});
