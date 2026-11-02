// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { comboToMatchingIndices, leafOrder, matchingIndicesToCombo, nonCrossingForTile, type TileFamilyId } from '../../core';
import { ComboBar, type ComboChange } from '../controls/ComboBar';

afterEach(cleanup);

/** The bar on a page that keeps its state, as the Explorer does; `seen` is every change it was given. */
function Page(props: { family: TileFamilyId; code: string; families?: readonly TileFamilyId[]; seen: ComboChange[] }) {
  const [rule, digits] = props.code.split('-');
  const subset = [...rule].map(Number);
  const [state, setState] = useState<ComboChange>({ family: props.family, subset, matching: comboToMatchingIndices(props.family, subset, digits) });
  return (
    <ComboBar
      family={state.family}
      subset={state.subset}
      matching={state.matching}
      families={props.families}
      onChange={(next) => {
        props.seen.push(next);
        setState(next);
      }}
    />
  );
}

const codeText = () => screen.getByTestId('combo-code').textContent!.replace('▾', '');
const codeOf = (c: ComboChange) => `${c.subset.join('')}-${matchingIndicesToCombo(c.family, c.subset, c.matching)}`;

describe('ComboBar', () => {
  it('shows the code with one digit per tile, and where the combination sits', () => {
    render(<Page family="spectre" code="2578-0100101100" seen={[]} />);
    expect(codeText()).toBe('2578-0100101100');
    expect(screen.getByTestId('combo-count').textContent).toBe('58/64');
    expect(screen.getAllByRole('button', { name: /^Open .* to draw its lines$/ })).toHaveLength(10);
  });

  it('tapping a digit steps that tile; a tile with one pairing cannot be tapped', () => {
    const seen: ComboChange[] = [];
    render(<Page family="spectre" code="2578-0100101100" seen={seen} />);
    fireEvent.click(screen.getByTestId('combo-digit-Theta'));
    expect(codeOf(seen[0])).toBe('2578-0000101100');
    expect((screen.getByTestId('combo-digit-Delta') as HTMLButtonElement).disabled).toBe(true);
  });

  it('the arrows step the whole combination, first tile fastest', () => {
    const seen: ComboChange[] = [];
    render(<Page family="hex" code="023468-000000000" seen={seen} />);
    fireEvent.click(screen.getByLabelText('Next combination'));
    expect(codeOf(seen[0])).toBe('023468-100000000');
    fireEvent.click(screen.getByLabelText('Previous combination'));
    fireEvent.click(screen.getByLabelText('Previous combination'));
    expect(codeOf(seen[2])).toBe('023468-141101101');
  });

  it('the rule opens the tail-free edge sets with their counts, and picking one starts its combinations at zero', () => {
    const seen: ComboChange[] = [];
    render(<Page family="hex" code="023468-140000001" seen={seen} />);
    fireEvent.click(screen.getByTestId('combo-rule'));
    const menu = screen.getByTestId('combo-menu');
    expect(menu.querySelectorAll('[data-rule]')).toHaveLength(8);
    expect(menu.querySelector('[data-rule="023468"]')!.textContent).toContain('320 combinations');
    fireEvent.click(menu.querySelector('[data-rule="128"]')!);
    expect(codeOf(seen[0])).toBe('128-000000000');
    expect(screen.queryByTestId('combo-menu')).toBeNull();
  });

  it('pastes a link from another page, and says what it read', () => {
    const seen: ComboChange[] = [];
    render(<Page family="spectre" code="2578-0100101100" families={['spectre', 'hex']} seen={seen} />);
    fireEvent.click(screen.getByTestId('combo-paste'));
    fireEvent.change(screen.getByTestId('combo-paste-text'), { target: { value: 'https://bohemian-miser.github.io/Spectre/harmonics.html?rule=023468&combo=140000001' } });
    expect(screen.getByTestId('combo-paste-read').textContent).toBe('Hexagons 023468-140000001, read from rule= and combo=.');
    fireEvent.click(screen.getByTestId('combo-paste-use'));
    expect(seen[0].family).toBe('hex');
    expect(codeOf(seen[0])).toBe('023468-140000001');
    expect(screen.getByTestId('combo-status').textContent).toMatch(/^Read Hexagons 023468-140000001/);
  });

  it('refuses a code for a family the page does not take', () => {
    render(<Page family="hex" code="023468-140000001" seen={[]} />);
    fireEvent.click(screen.getByTestId('combo-paste'));
    fireEvent.change(screen.getByTestId('combo-paste-text'), { target: { value: '2578-0100101100' } });
    expect(screen.getByTestId('combo-paste-read').textContent).toMatch(/this page takes Hexagons/);
    expect((screen.getByTestId('combo-paste-use') as HTMLButtonElement).disabled).toBe(true);
  });

  it('clear empties the rule and zeroes the combination', () => {
    const seen: ComboChange[] = [];
    render(<Page family="hex" code="023468-140000001" seen={seen} />);
    fireEvent.click(screen.getByTestId('combo-clear'));
    expect(codeOf(seen[0])).toBe('-000000000');
    expect(codeText()).toBe('∅-000000000');
  });

  it('a pairing whose lines cross has no digit, and there is no code to copy', () => {
    const family = 'hex';
    const subset = [0, 2, 3, 4, 6, 8];
    const order = leafOrder(family);
    const matching = comboToMatchingIndices(family, subset, '000000000').slice();
    // Theta has five non-crossing pairings of its six points; any other index crosses.
    const nc = nonCrossingForTile(family, 'Theta', new Set(subset));
    matching[order.indexOf('Theta')] = [...Array(15).keys()].find((k) => !nc.includes(k))!;
    render(<ComboBar family={family} subset={subset} matching={matching} onChange={() => {}} />);
    expect(codeText()).toBe('023468-0?0000000');
    expect((screen.getByTestId('combo-copy') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId('combo-status').textContent).toMatch(/^Theta: the lines cross/);
  });

  it('a rule with tails marks the odd tiles', () => {
    const family = 'spectre';
    render(<ComboBar family={family} subset={[2]} matching={leafOrder(family).map(() => 0)} onChange={() => {}} />);
    expect(screen.getByTestId('combo-status').textContent).toMatch(/^Tails on /);
    act(() => {
      fireEvent.click(screen.getByTestId('combo-rule'));
    });
    expect(screen.getByTestId('combo-menu').textContent).toContain('now, with tails');
  });

  it('a tile’s slider and arrows step its pairing, and tapping the tile opens it to draw', () => {
    const seen: ComboChange[] = [];
    render(<Page family="hex" code="023468-140000001" seen={seen} />);
    fireEvent.change(screen.getByLabelText('Theta pairing'), { target: { value: '2' } });
    expect(codeOf(seen[0])).toBe('023468-120000001');
    fireEvent.click(screen.getByLabelText('Theta: next pairing'));
    expect(codeOf(seen[1])).toBe('023468-130000001');
    fireEvent.click(screen.getByRole('button', { name: 'Open Theta to draw its lines' }));
    expect(screen.getByTestId('tile-editor')).toBeTruthy();
  });
});
