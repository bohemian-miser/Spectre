// @vitest-environment jsdom
/**
 * Contract slider contract: the track spans the whole seam in edge units, a
 * notch marks every internal vertex, inactive classes grey out, and class 0
 * is pinned to the seam centre.
 */
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ContractSlider, contractToU, uToContract } from '../controls/ContractSlider';

afterEach(cleanup);

describe('uToContract / contractToU', () => {
  it('splits a seam position into {minor, t} and round-trips', () => {
    expect(uToContract(0, 3)).toEqual({ minor: 0, t: 0 });
    expect(uToContract(2.35, 3)).toEqual({ minor: 2, t: expect.closeTo(0.35, 10) });
    expect(contractToU({ minor: 2, t: 0.35 })).toBeCloseTo(2.35);
  });

  it('lands u = minorCount on the last minor at t = 1, and clamps out-of-range', () => {
    expect(uToContract(3, 3)).toEqual({ minor: 2, t: 1 });
    expect(uToContract(-1, 3)).toEqual({ minor: 0, t: 0 });
    expect(uToContract(99, 4)).toEqual({ minor: 3, t: 1 });
  });
});

describe('ContractSlider', () => {
  it('spans all minors with a notch per crossed vertex', () => {
    const { container } = render(
      <ContractSlider major={7} minorCount={4} value={{ minor: 1, t: 0.5 }} onChange={() => {}} />,
    );
    const input = container.querySelector('input[type="range"]') as HTMLInputElement;
    expect(input.min).toBe('0');
    expect(input.max).toBe('4');
    expect(input.value).toBe('1.5');
    // 4 physical edges → 3 internal vertices → 3 notches.
    expect(container.querySelectorAll('.contract-notch')).toHaveLength(3);
  });

  it('emits decomposed contracts on change', () => {
    const onChange = vi.fn();
    const { container } = render(
      <ContractSlider major={2} minorCount={3} value={{ minor: 0, t: 0.5 }} onChange={onChange} />,
    );
    fireEvent.change(container.querySelector('input') as HTMLInputElement, {
      target: { value: '2.4' },
    });
    expect(onChange).toHaveBeenCalledWith({ minor: 2, t: expect.closeTo(0.4, 10) });
  });

  it('greys out inactive classes but keeps them adjustable', () => {
    const onChange = vi.fn();
    const { container } = render(
      <ContractSlider
        major={5}
        minorCount={2}
        value={{ minor: 0, t: 0.5 }}
        onChange={onChange}
        active={false}
      />,
    );
    const host = container.querySelector('.contract-slider') as HTMLElement;
    expect(host.classList.contains('is-inactive')).toBe(true);
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.disabled).toBe(false);
    fireEvent.change(input, { target: { value: '1' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('pins class 0 to the seam centre and disables input', () => {
    const { container } = render(
      <ContractSlider
        major={0}
        minorCount={2}
        value={{ minor: 0, t: 0.1 }}
        onChange={() => {}}
        pinned
      />,
    );
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.disabled).toBe(true);
    expect(input.value).toBe('1'); // centre of a 2-edge seam
  });
});
