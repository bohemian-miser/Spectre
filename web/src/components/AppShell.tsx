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
 * independently renderable in tests. The only state is layout: the links that
 * do not fit on the row move into a "More" dropdown at its end.
 */

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
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

type NavEntry = (typeof SITE_NAV)[number];

function NavLabel({ item }: { item: NavEntry }): JSX.Element {
  return (
    <>
      <span className="long">{item.label}</span>
      <span className="short">{item.short}</span>
      {item.status === 'planned' && <em>soon</em>}
    </>
  );
}

function NavEntryLink(props: {
  item: NavEntry;
  base: string;
  current: string | null;
}): JSX.Element {
  const { item, base, current } = props;
  if (item.status !== 'ready') {
    return (
      <span
        className="site-nav-link is-planned"
        title={`${item.blurb} (coming soon)`}
        aria-disabled="true"
        data-nav-id={item.id}
      >
        <NavLabel item={item} />
      </span>
    );
  }
  return (
    <a
      className={['site-nav-link', current === item.id ? 'is-active' : ''].filter(Boolean).join(' ')}
      href={navHref(item, base)}
      title={item.blurb}
      aria-current={current === item.id ? 'page' : undefined}
      data-nav-id={item.id}
    >
      <NavLabel item={item} />
    </a>
  );
}

/**
 * How many nav entries fit on the row, leaving room for the "More" button when
 * any do not. Widths come from an invisible copy of the row (`measureRef`), so
 * entries already moved into the menu can still be measured. Without
 * ResizeObserver (jsdom) everything stays on the row.
 */
function useNavFit(
  navRef: RefObject<HTMLElement>,
  measureRef: RefObject<HTMLUListElement>,
): number {
  const [fits, setFits] = useState(SITE_NAV.length);

  useLayoutEffect(() => {
    const nav = navRef.current;
    const measure = measureRef.current;
    if (!nav || !measure || typeof ResizeObserver === 'undefined') return;
    const fit = () => {
      const items = [...measure.children] as HTMLElement[];
      const more = items.pop();
      const gap = parseFloat(getComputedStyle(measure).columnGap) || 0;
      const avail = nav.clientWidth;
      const widths = items.map((i) => i.offsetWidth);
      if (widths.reduce((a, w) => a + w + gap, -gap) <= avail) {
        setFits(widths.length);
        return;
      }
      let used = more?.offsetWidth ?? 0;
      let n = 0;
      while (n < widths.length && used + gap + widths[n] <= avail) used += gap + widths[n++];
      setFits(n);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(nav);
    ro.observe(measure);
    return () => ro.disconnect();
  }, [navRef, measureRef]);

  return fits;
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
  const navRef = useRef<HTMLElement>(null);
  const measureRef = useRef<HTMLUListElement>(null);
  const moreRef = useRef<HTMLLIElement>(null);
  const fits = useNavFit(navRef, measureRef);
  const [open, setOpen] = useState(false);
  const shown = SITE_NAV.slice(0, fits);
  const overflow = SITE_NAV.slice(fits);
  const overflowActive = overflow.some((i) => i.id === current);

  // Close the menu on a click outside it or on Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!moreRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className={['site', wide ? 'is-wide' : '', className ?? ''].filter(Boolean).join(' ')}>
      <header className="site-header">
        <a className="site-brand" href={navHref(SITE_NAV[0], base)}>
          <svg className="site-brand-mark" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path
              d="M6.54 7.26 10.54 7.26 12.54 3.8 16 5.8 16 9.8 20 9.8 22 13.26 20 16.73 16 16.73 14 20.19 10 20.19 8 16.73 4 16.73 2 13.26Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
          <span className="site-brand-name">Spectre tiles</span>
        </a>

        <nav className="site-nav" aria-label="Primary" ref={navRef}>
          <ul>
            {shown.map((item) => (
              <li key={item.id}>
                <NavEntryLink item={item} base={base} current={current} />
              </li>
            ))}
            {overflow.length > 0 && (
              <li className="site-more" ref={moreRef}>
                <button
                  type="button"
                  className={['site-nav-link', overflowActive ? 'is-active' : '']
                    .filter(Boolean)
                    .join(' ')}
                  aria-haspopup="true"
                  aria-expanded={open}
                  onClick={() => setOpen((o) => !o)}
                >
                  More
                  <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
                    <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" />
                  </svg>
                </button>
                <ul className="site-more-menu" hidden={!open}>
                  {overflow.map((item) => (
                    <li key={item.id}>
                      <NavEntryLink item={item} base={base} current={current} />
                    </li>
                  ))}
                </ul>
              </li>
            )}
          </ul>
          {/* Invisible copy of the full row, measured to decide what fits. */}
          <ul className="site-nav-measure" ref={measureRef} aria-hidden="true">
            {SITE_NAV.map((item) => (
              <li key={item.id}>
                <span className="site-nav-link">
                  <NavLabel item={item} />
                </span>
              </li>
            ))}
            <li>
              <span className="site-nav-link">
                More
                <svg viewBox="0 0 12 12" width="10" height="10" />
              </span>
            </li>
          </ul>
        </nav>

        <a
          className="site-repo"
          href={REPO_URL}
          rel="noreferrer noopener"
          title="Source on GitHub"
          aria-label="Source on GitHub"
        >
          <svg viewBox="0 0 16 16" width="20" height="20" aria-hidden="true">
            <path
              fill="currentColor"
              d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
            />
          </svg>
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
