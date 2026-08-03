/**
 * `AppShell` — the site-wide chrome (DESIGN.md §7.0).
 *
 * Every page entry wraps its page in this: a top nav across the four
 * destinations plus the repo link, and a footer with the repo and the
 * Smith–Myers–Kaplan–Goodman-Strauss paper. Pages that have not shipped yet are
 * listed but inert, so the nav is complete from day one and a new page becomes
 * reachable by flipping one field in `lib/siteNav.ts`.
 *
 * The shell is presentational only — no state, no data fetching — so pages stay
 * independently renderable in tests.
 */

import type { ReactNode } from 'react';
import {
  PAPER_TITLE,
  PAPER_URL,
  REPO_URL,
  SITE_NAV,
  activeNavId,
  navHref,
} from '../lib/siteNav';

export interface AppShellProps {
  /** Nav id to mark as current. Defaults to the current document path. */
  readonly active?: string | null;
  /** Deploy base; defaults to Vite's `BASE_URL` (`/Spectre/` in production). */
  readonly base?: string;
  /** Full-bleed pages (the explorer) opt out of the centered prose column. */
  readonly wide?: boolean;
  readonly children: ReactNode;
  readonly className?: string;
}

function defaultBase(): string {
  // `import.meta.env` is defined by Vite (and by vitest's vite pipeline).
  const env = (import.meta as unknown as { env?: { BASE_URL?: string } }).env;
  return env?.BASE_URL ?? '/';
}

export function AppShell(props: AppShellProps): JSX.Element {
  const { active, base = defaultBase(), wide = false, children, className } = props;
  const current =
    active ?? (typeof window !== 'undefined' ? activeNavId(window.location.pathname) : null);

  return (
    <div className={['site', wide ? 'is-wide' : '', className ?? ''].filter(Boolean).join(' ')}>
      <header className="site-header">
        <a className="site-brand" href={navHref(SITE_NAV[0], base)}>
          <span className="site-brand-mark" aria-hidden="true">
            ◆
          </span>
          Spectre tiles
        </a>

        <nav className="site-nav" aria-label="Primary">
          <ul>
            {SITE_NAV.map((item) =>
              item.status === 'ready' ? (
                <li key={item.id}>
                  <a
                    className={['site-nav-link', current === item.id ? 'is-active' : '']
                      .filter(Boolean)
                      .join(' ')}
                    href={navHref(item, base)}
                    title={item.blurb}
                    aria-current={current === item.id ? 'page' : undefined}
                    data-nav-id={item.id}
                  >
                    {item.label}
                  </a>
                </li>
              ) : (
                <li key={item.id}>
                  <span
                    className="site-nav-link is-planned"
                    title={`${item.blurb} (coming soon)`}
                    aria-disabled="true"
                    data-nav-id={item.id}
                  >
                    {item.label}
                    <em>soon</em>
                  </span>
                </li>
              ),
            )}
          </ul>
        </nav>

        <a className="site-nav-link site-repo" href={REPO_URL} rel="noreferrer noopener">
          GitHub
        </a>
      </header>

      <main className="site-main">{children}</main>

      <footer className="site-footer">
        <span>
          Spectre tiling explorer ·{' '}
          <a href={REPO_URL} rel="noreferrer noopener">
            source on GitHub
          </a>
        </span>
        <a href={PAPER_URL} rel="noreferrer noopener">
          {PAPER_TITLE}
        </a>
      </footer>
    </div>
  );
}

export default AppShell;
