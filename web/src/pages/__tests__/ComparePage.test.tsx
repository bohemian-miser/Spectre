// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ComparePage from '../ComparePage';

describe('ComparePage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('draws two circuits of one combination, compares their terms and lines their readings up', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    render(<ComparePage forceSync hash="#a=023468-140000001:4:303&b=023468-140000001:6:14679" />);
    await waitFor(() => expect(screen.getByTestId('compare-title').textContent).toBe('A: 303 tiles at level 4 of 023468-140000001; B: 14,679 tiles at level 6'), { timeout: 60000 });
    expect(screen.getByTestId('compare-summary').textContent).toMatch(/^B's level k \+ 2 is lined up with A's level k: the same at 2 of the 4 levels compared, 2, 3\./);
    // The terms: B is 48 times longer and about seven times wider.
    expect(screen.getByTestId('corners-compare-gap').textContent).toMatch(/B has 14,679 tiles to A’s 303 and a radius of gyration \d\.\d{3} times A’s/);
    expect(screen.getByTestId('corners-compare-terms')).toBeTruthy();
    const rows = [...screen.getByTestId('compare-readings').querySelectorAll('tbody tr')].map((r) => r.textContent!);
    expect(rows.filter((r) => r.includes('the same'))).toHaveLength(2);
    expect(rows.filter((r) => r.includes('differs'))).toHaveLength(2);
  }, 90000);

  it('says what is wrong with a name that fits no circuit', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    render(<ComparePage forceSync hash="#a=023468-140000001:4:304&b=023468-140000001:6:14679" />);
    await waitFor(() => expect(screen.getByText(/Could not compute: no circuit of 304 tiles born at level 4/)).toBeTruthy(), { timeout: 60000 });
  }, 90000);
});
