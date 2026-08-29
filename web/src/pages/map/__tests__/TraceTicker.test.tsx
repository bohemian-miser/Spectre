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
