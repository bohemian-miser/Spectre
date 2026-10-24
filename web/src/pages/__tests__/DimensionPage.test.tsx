// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import DimensionPage from '../DimensionPage';

describe('DimensionPage', () => {
  afterEach(cleanup);

  it('measures pairings one by one, tabulates them by rule, and links each into the Explorer', async () => {
    render(<DimensionPage />);
    fireEvent.change(screen.getByTestId('dimension-family'), { target: { value: 'hex' } });
    const start = screen.getByTestId('dimension-start');
    // Hexagons: every pairing of the five smaller rules (124), and 200 each of 023468 and "everything on".
    expect(start.textContent).toBe('Measure 524 pairings');
    fireEvent.click(start);
    await waitFor(() => expect(screen.getByTestId('dimension-rows').querySelectorAll('tbody tr').length).toBeGreaterThanOrEqual(6), { timeout: 20000 });
    fireEvent.click(screen.getByText('Stop'));
    const rules = screen.getByTestId('dimension-rules');
    expect(rules.textContent).toContain('15');
    const link = screen.getByTestId('dimension-rows').querySelector('a')!;
    expect(link.getAttribute('href')).toMatch(/#\/explorer\?v=1&f=hex/);
    expect(screen.getByTestId('dimension-progress').textContent).toMatch(/of 524 measured/);
  }, 30000);
});
