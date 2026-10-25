// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { leafOrder } from '../../core';
import { QuickBar, type QuickBarProps } from '../controls/QuickBar';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

function setup(over: Partial<QuickBarProps> = {}) {
  const props: QuickBarProps = {
    family: 'spectre',
    subset: [2, 5, 7, 8],
    matching: leafOrder('spectre').map(() => 0),
    onToggleMajor: vi.fn(),
    onSubsetChange: vi.fn(),
    onStrands: vi.fn(),
    onMatchingVectorChange: vi.fn(),
    onCycleTile: vi.fn(),
    onOpenTile: vi.fn(),
    ...over,
  };
  return { props, ...render(<QuickBar {...props} />) };
}

describe('QuickBar', () => {
  it('shows one tile per leaf and opens a big tile in the editor', () => {
    const { container, props } = setup();
    const tiles = container.querySelectorAll('[data-tile]');
    expect([...tiles].map((t) => t.getAttribute('data-tile'))).toEqual([...leafOrder('spectre')]);
    fireEvent.click(tiles[1]);
    expect(props.onOpenTile).toHaveBeenCalledWith(leafOrder('spectre')[1]);
  });

  it('marks 2578 tail-free and steps through its pairings', () => {
    const { container, getByText, props } = setup();
    expect(container.querySelector('[data-testid="quick-tail-free"]')?.className).toContain('good');
    fireEvent.click(getByText('Next pairing ›'));
    expect(props.onMatchingVectorChange).toHaveBeenCalledTimes(1);
  });

  it('cycles a selected class through its strand counts', () => {
    const { container, props } = setup({ contracts: { 5: { minor: 0, t: 0.5, count: 3 } } });
    fireEvent.click(container.querySelector('[data-testid="quick-strands-2"]')!);
    expect(props.onStrands).toHaveBeenCalledWith(2, 2);
    fireEvent.click(container.querySelector('[data-testid="quick-strands-5"]')!);
    expect(props.onStrands).toHaveBeenCalledWith(5, 1);
    // Unselected classes have no strand button.
    expect(container.querySelector('[data-testid="quick-strands-3"]')).toBeNull();
  });

  it('XORs a basis group into the rule', () => {
    const { container, getByText, props } = setup();
    fireEvent.click(getByText(/groups/));
    const groups = container.querySelectorAll('[data-testid="quick-basis"] button');
    expect(groups.length).toBe(3);
    // 2578 is itself made of basis groups, so some are lit.
    expect([...groups].some((g) => g.getAttribute('aria-pressed') === 'true')).toBe(true);
    fireEvent.click(groups[0]);
    expect(props.onSubsetChange).toHaveBeenCalledTimes(1);
  });
});
