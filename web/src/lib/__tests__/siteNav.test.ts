/**
 * The nav model is the contract future pages register against, so it is worth
 * pinning: ids are unique, hrefs respect the deploy base, and the active-entry
 * resolution matches how the built site is served (`/Spectre/legacy.html`).
 */
import { describe, expect, it } from 'vitest';
import {
  PAPER_URL,
  REPO_URL,
  SITE_NAV,
  activeNavId,
  navHref,
  navItem,
  normalizeBase,
  readyNav,
} from '../siteNav';

describe('siteNav', () => {
  it('lists the four destinations with unique ids', () => {
    expect(SITE_NAV.map((i) => i.id)).toEqual(['explorer', 'tails', 'stats', 'legacy']);
    expect(new Set(SITE_NAV.map((i) => i.id)).size).toBe(SITE_NAV.length);
  });

  it('ships all four destinations', () => {
    expect(readyNav().map((i) => i.id)).toEqual(['explorer', 'tails', 'stats', 'legacy']);
  });

  it('builds hrefs under the deploy base', () => {
    expect(normalizeBase('/Spectre')).toBe('/Spectre/');
    expect(normalizeBase('')).toBe('/');
    expect(navHref(navItem('explorer')!, '/Spectre/')).toBe('/Spectre/');
    expect(navHref(navItem('legacy')!, '/Spectre/')).toBe('/Spectre/legacy.html');
    expect(navHref(navItem('legacy')!, '/')).toBe('/legacy.html');
    // Missing trailing slash must not concatenate into `/Spectrelegacy.html`.
    expect(navHref(navItem('legacy')!, '/Spectre')).toBe('/Spectre/legacy.html');
  });

  it('resolves the active entry from a document path', () => {
    expect(activeNavId('/Spectre/')).toBe('explorer');
    expect(activeNavId('/')).toBe('explorer');
    expect(activeNavId('/Spectre/index.html')).toBe('explorer');
    expect(activeNavId('/Spectre/legacy.html')).toBe('legacy');
    expect(activeNavId('/Spectre/widgets.html')).toBeNull();
  });

  it('points at the real repo and paper', () => {
    expect(REPO_URL).toMatch(/^https:\/\/github\.com\//);
    expect(PAPER_URL).toMatch(/^https:\/\//);
  });
});
