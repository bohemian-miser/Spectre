// @vitest-environment jsdom
/**
 * `StatsSummary` length chips — the selection contract the Explorer relies on:
 * a plain click ISOLATES one length (and clicking the active one clears it),
 * while shift / ctrl / meta TOGGLES, so several lengths can be shown at once.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { StatsSummary } from '../controls/StatsSummary';
import type { AnalysisResponse, Path } from '../../core';

/** Two closed squares of length 4 and one triangle of length 3. */
const square = (dx: number): Path => ({
  points: [
    { x: dx, y: 0 },
    { x: dx + 1, y: 0 },
    { x: dx + 1, y: 1 },
    { x: dx, y: 1 },
  ],
  closed: true,
});
const triangle: Path = {
  points: [
    { x: 5, y: 0 },
    { x: 6, y: 0 },
    { x: 5.5, y: 1 },
  ],
  closed: true,
};

const result: AnalysisResponse = {
  circuits: [square(0), square(2), triangle],
  tails: [],
  circuitSummary: [
    { length: 3, count: 1 },
    { length: 4, count: 2 },
  ],
  tailSummary: [],
  circuitColors: [
    [3, '#ff0000'],
    [4, '#00ff00'],
  ],
  segmentColors: [],
  tileCount: 8,
  junctionCount: 0,
  elapsedMs: 1,
} as unknown as AnalysisResponse;

const chip = (label: string): HTMLElement =>
  screen.getByRole('button', { name: new RegExp(`^${label}`) });

afterEach(cleanup);

describe('StatsSummary length chips', () => {
  it('reports a plain click as non-additive and a modified click as additive', () => {
    const onSelectLength = vi.fn();
    render(<StatsSummary result={result} onSelectLength={onSelectLength} />);

    fireEvent.click(chip('4'));
    expect(onSelectLength).toHaveBeenLastCalledWith(4, false);

    fireEvent.click(chip('3'), { shiftKey: true });
    expect(onSelectLength).toHaveBeenLastCalledWith(3, true);

    fireEvent.click(chip('3'), { ctrlKey: true });
    expect(onSelectLength).toHaveBeenLastCalledWith(3, true);

    fireEvent.click(chip('3'), { metaKey: true });
    expect(onSelectLength).toHaveBeenLastCalledWith(3, true);
  });

  it('marks every selected chip pressed, not just one', () => {
    render(<StatsSummary result={result} highlightLengths={new Set([3, 4])} />);
    // jest-dom is not installed here, so assert the attribute directly.
    expect(chip('3').getAttribute('aria-pressed')).toBe('true');
    expect(chip('4').getAttribute('aria-pressed')).toBe('true');
  });

  it('offers "show all" only while something is selected', () => {
    const onClearLengths = vi.fn();
    const { rerender } = render(<StatsSummary result={result} />);
    expect(screen.queryByTestId('clear-lengths')).toBeNull();

    rerender(
      <StatsSummary
        result={result}
        highlightLengths={new Set([4])}
        onClearLengths={onClearLengths}
      />,
    );
    fireEvent.click(screen.getByTestId('clear-lengths'));
    expect(onClearLengths).toHaveBeenCalled();
  });
});
