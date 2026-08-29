// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { LEAF_ORDER } from '../../../core';
import { TraceTicker } from '../TraceTicker';

const colors = LEAF_ORDER.map((_, i) => `rgb(${i}, ${i}, ${i})`);
const indexOf = (name: string): number => LEAF_ORDER.indexOf(name as never);

afterEach(() => {
  cleanup();
});

describe('TraceTicker', () => {
  // The strip is right-aligned, so a chip appearing at full width shoves the
  // row sideways in one jump. The fix is per-chip entry animation, which only
  // works if React keeps the chips that were already there — i.e. if a chip's
  // key is its own step, not its index in a sliding window.
  it('keeps a chip identity as the window slides past it', () => {
    const tiles = [0, 1, 2, 3];
    const { container, rerender } = render(
      <TraceTicker tiles={tiles} colors={colors} steps={4} limit={4} />,
    );
    const before = [...container.querySelectorAll('.trace-tile')];
    // One more step: the window drops the oldest and gains one at the right.
    rerender(<TraceTicker tiles={[1, 2, 3, 4]} colors={colors} steps={5} limit={4} />);
    const after = [...container.querySelectorAll('.trace-tile')];

    expect(after).toHaveLength(4);
    // The three that survived are the SAME DOM nodes, shifted along — so they
    // do not re-run the entry animation.
    expect(after[0]).toBe(before[1]);
    expect(after[1]).toBe(before[2]);
    expect(after[2]).toBe(before[3]);
    // Only the arriving chip is new.
    expect(before).not.toContain(after[3]);
    expect(after[3].textContent).toBe(LEAF_ORDER[4]);
  });

  it('still renders without an odometer', () => {
    const { container } = render(<TraceTicker tiles={[0, 1]} colors={colors} />);
    expect(container.querySelectorAll('.trace-tile')).toHaveLength(2);
  });

  it('names each tile the walk crossed, in order', () => {
    const tiles = ['Delta', 'Psi', 'Gamma2'].map(indexOf);
    const { container } = render(<TraceTicker tiles={tiles} colors={colors} />);
    const chips = [...container.querySelectorAll('.trace-tile')];
    expect(chips.map((c) => c.textContent)).toEqual(['Delta', 'Psi', 'Gamma2']);
  });

  it('paints each name in its own tile colour', () => {
    const tiles = [indexOf('Delta'), indexOf('Psi')];
    const { container } = render(<TraceTicker tiles={tiles} colors={colors} />);
    const chips = [...container.querySelectorAll<HTMLElement>('.trace-tile')];
    expect(chips[0].style.background).toBe(colors[indexOf('Delta')]);
    expect(chips[1].style.background).toBe(colors[indexOf('Psi')]);
  });

  it('marks the newest tile — the one the walk is on', () => {
    const { container } = render(
      <TraceTicker tiles={[0, 1, 2]} colors={colors} />,
    );
    const chips = [...container.querySelectorAll('.trace-tile')];
    expect(chips.at(-1)!.className).toContain('is-newest');
    expect(chips[0].className).not.toContain('is-newest');
  });

  it('shows the NEWEST names when there are more than fit', () => {
    const tiles = Array.from({ length: 200 }, (_, i) => i % LEAF_ORDER.length);
    const { container } = render(<TraceTicker tiles={tiles} colors={colors} limit={10} />);
    const chips = [...container.querySelectorAll('.trace-tile')];
    expect(chips).toHaveLength(10);
    expect(chips.map((c) => c.textContent)).toEqual(
      tiles.slice(-10).map((t) => LEAF_ORDER[t]),
    );
  });

  it('renders nothing at all before the walk has crossed a tile', () => {
    const { container } = render(<TraceTicker tiles={[]} colors={colors} />);
    expect(container.querySelector('.trace-ticker')).toBeNull();
  });

  it('survives a colour table that does not cover the type', () => {
    const { container } = render(<TraceTicker tiles={[0]} colors={[]} />);
    expect(container.querySelectorAll('.trace-tile')).toHaveLength(1);
  });
});
