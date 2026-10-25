// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FaultLinesPage from '../FaultLinesPage';

describe('FaultLinesPage', () => {
  beforeEach(() => {
    // jsdom has no canvas; thumbnails and the matrix just need somewhere to draw.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((() => ({
      createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
      putImageData: () => {},
    })) as unknown as typeof HTMLCanvasElement.prototype.getContext);
    if (typeof globalThis.ImageData === 'undefined') {
      (globalThis as unknown as { ImageData: unknown }).ImageData = class {
        constructor(public data: Uint8ClampedArray, public width: number, public height: number) {}
      };
    }
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('places the chosen rules’ pairings, groups the alike ones, and lists the closest to a pick', async () => {
    render(<FaultLinesPage />);
    fireEvent.change(screen.getByTestId('faultlines-family'), { target: { value: 'hex' } });
    fireEvent.change(screen.getByTestId('faultlines-level'), { target: { value: '4' } });
    fireEvent.change(screen.getByTestId('faultlines-per-rule'), { target: { value: '12' } });
    // Hexagons have seven rules; keep two.
    const chips = screen.getByRole('group', { name: 'Rules' }).querySelectorAll('button');
    expect(chips.length).toBe(7);
    for (const chip of chips) if (!['15', '0136'].includes(chip.textContent!.split(' ')[0])) fireEvent.click(chip);
    const start = screen.getByTestId('faultlines-start');
    expect(start.textContent).toMatch(/^Compare \d+ pairings$/);
    const planned = Number(start.textContent!.match(/\d+/)![0]);
    fireEvent.click(start);
    await waitFor(() => expect(screen.getByTestId('faultlines-summary')).toBeTruthy(), { timeout: 20000 });
    expect(screen.getByTestId('faultlines-summary').textContent).toContain(`${planned} pairings at level 4`);

    // The 15 pairings are all bounded, so they group together.
    const groups = screen.getAllByTestId('faultlines-group');
    expect(groups.length).toBeGreaterThan(0);
    const bounded = groups.find((g) => g.textContent!.includes('No big strands'));
    expect(bounded).toBeTruthy();
    expect(within(bounded!).getByText('15')).toBeTruthy();

    // Raising the bar splits groups up, never merges them.
    const before = groups.length + screen.queryAllByTestId('faultlines-loners').length;
    fireEvent.change(screen.getByTestId('faultlines-threshold'), { target: { value: '0.95' } });
    expect(screen.getAllByTestId('faultlines-group').length + screen.queryAllByTestId('faultlines-loners').length).toBeGreaterThanOrEqual(before);

    // Picking a thumbnail lists its closest pairings, the pick first with an Explorer link.
    fireEvent.click(within(screen.getAllByTestId('faultlines-group')[0]).getAllByRole('button')[0]);
    const nearest = screen.getByTestId('faultlines-nearest');
    expect(nearest.querySelector('a')!.getAttribute('href')).toMatch(/#\/explorer\?v=1&f=hex/);
    expect(nearest.querySelectorAll('figure').length).toBeGreaterThan(1);
    expect(screen.getByTestId('faultlines-matrix')).toBeTruthy();
  }, 30000);
});
