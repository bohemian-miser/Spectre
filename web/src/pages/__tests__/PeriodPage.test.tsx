// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import PeriodPage from '../PeriodPage';

afterEach(cleanup);

describe('PeriodPage', () => {
  it('finds the period of the line combination and lays out the line', () => {
    render(<PeriodPage />);
    expect(screen.getByTestId('pd-summary').textContent).toContain('the borders at level 3 are the borders at level 1, so they repeat every 2 levels from level 1 on');
    expect(screen.getByTestId('pd-grid').querySelectorAll('tbody tr')).toHaveLength(9);
    expect(screen.getByTestId('pd-step-circuits').textContent).toContain('so no circuit closes at any level');
    expect(screen.getByTestId('pd-line-slots').textContent).toContain('slots 0, 2, 5');
    expect(screen.getByTestId('pd-line-chain').textContent).toContain('at slots 0, 5 in turn');
    expect(screen.getByTestId('pd-line-chain').textContent).toContain('the Psi 5 levels up');
    expect(screen.getByTestId('pd-canvas')).toBeTruthy();
  });
});
