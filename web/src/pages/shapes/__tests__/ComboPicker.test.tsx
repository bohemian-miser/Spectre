// @vitest-environment jsdom
/**
 * The level box accepts any typed level: it can be emptied and retyped, and
 * the level it hands on is the last whole number from 1 up.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ComboPicker } from '../ComboPicker';

afterEach(cleanup);

describe('ComboPicker level box', () => {
  it('can be cleared and retyped', () => {
    const onAdd = vi.fn();
    render(<ComboPicker busy={false} levels="any" initialLevel={4} onAdd={onAdd} />);
    const box = screen.getByTestId('shapes-combo-level') as HTMLInputElement;
    fireEvent.change(box, { target: { value: '' } });
    expect(box.value).toBe('');
    fireEvent.change(box, { target: { value: '2' } });
    expect(box.value).toBe('2');
    fireEvent.click(screen.getByTestId('shapes-combo-add'));
    expect(onAdd.mock.calls[0][0].level).toBe(2);
  });

  it('keeps the last valid level when left empty or below 1', () => {
    const onAdd = vi.fn();
    render(<ComboPicker busy={false} levels="any" initialLevel={4} onAdd={onAdd} />);
    const box = screen.getByTestId('shapes-combo-level') as HTMLInputElement;
    fireEvent.change(box, { target: { value: '0' } });
    fireEvent.blur(box);
    expect(box.value).toBe('4');
    fireEvent.change(box, { target: { value: '' } });
    fireEvent.click(screen.getByTestId('shapes-combo-add'));
    expect(onAdd.mock.calls[0][0].level).toBe(4);
  });
});
