// @vitest-environment jsdom
/**
 * Shell contract: every destination is present, live ones are links, unbuilt
 * ones are inert placeholders, and the current page is marked for a11y.
 */
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AppShell } from '../AppShell';
import { REPO_URL } from '../../lib/siteNav';

afterEach(cleanup);

describe('AppShell', () => {
  it('renders the whole nav, linking only the pages that exist', () => {
    const { container } = render(
      <AppShell active="explorer" base="/Spectre/">
        <p>page</p>
      </AppShell>,
    );

    const ids = [...container.querySelectorAll('[data-nav-id]')].map((n) =>
      n.getAttribute('data-nav-id'),
    );
    expect(ids).toEqual(['explorer', 'tails', 'stats', 'legacy']);

    const legacy = container.querySelector('a[data-nav-id="legacy"]');
    expect(legacy?.getAttribute('href')).toBe('/Spectre/legacy.html');

    // All four destinations are live links now that tails/stats shipped.
    const tails = container.querySelector('a[data-nav-id="tails"]');
    expect(tails?.getAttribute('href')).toBe('/Spectre/tails.html');
    const stats = container.querySelector('a[data-nav-id="stats"]');
    expect(stats?.getAttribute('href')).toBe('/Spectre/stats.html');
  });

  it('marks the active entry and keeps the repo + paper links', () => {
    const { container } = render(
      <AppShell active="legacy" base="/Spectre/">
        <p>page</p>
      </AppShell>,
    );
    expect(
      container.querySelector('[data-nav-id="legacy"]')?.getAttribute('aria-current'),
    ).toBe('page');
    expect(container.querySelector('[data-nav-id="explorer"]')?.getAttribute('aria-current')).toBe(
      null,
    );
    const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toContain(REPO_URL);
    expect(hrefs.some((h) => h?.includes('arxiv'))).toBe(true);
  });

  it('renders its children inside <main>', () => {
    const { container } = render(
      <AppShell active="explorer">
        <p id="child">page</p>
      </AppShell>,
    );
    expect(container.querySelector('main#child, main #child')).not.toBeNull();
  });
});
