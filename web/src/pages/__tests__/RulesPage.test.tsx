// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import RulesPage from '../RulesPage';

describe('RulesPage', () => {
  afterEach(cleanup);

  it('lines up every rule with its counts and links to Classifications', () => {
    render(<RulesPage base="/Spectre/" />);
    expect(screen.getByRole('heading', { name: 'Rules & isomorphism' })).toBeTruthy();
    const full = screen.getByTestId('rules-row-012345678');
    expect(full.textContent).toContain('625,000');
    expect(full.textContent).toContain('1,953,125');
    expect(full.textContent).toContain('3,906,250');
    const link = full.querySelector('a[href*="r=spectre-01235678"]');
    expect(link?.getAttribute('href')).toBe('/Spectre/classifications.html#/classifications?r=spectre-01235678');
    expect(screen.getByTestId('rules-row-15').textContent).toContain('Identical in all three');
  });
});
