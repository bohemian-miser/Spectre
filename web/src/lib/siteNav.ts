/**
 * Site navigation model (DESIGN.md §7.0 "Shell & navigation").
 *
 * Pure data + string helpers so the shell can be rendered and tested without a
 * DOM, and so a page that does not exist yet can still declare itself.
 *
 * DEVIATION FROM DESIGN.md §8.1 (documented in the stage-3 report): the site is
 * built as multiple Vite HTML entries rather than a `createHashRouter`, which
 * is why nav targets are `.html` files instead of `#/route` paths. The URL
 * *state* codec (§9.2) is untouched: the explorer still owns
 * `#/explorer?v=1&…` inside whichever document it is served from.
 */

export type NavStatus = 'ready' | 'planned';

export interface NavItem {
  /** Stable id; also what `AppShell active=` takes. */
  readonly id: string;
  readonly label: string;
  /**
   * Vite HTML entry, relative to the deploy base. `''` is the base itself
   * (`index.html`), which is the Explorer.
   */
  readonly entry: string;
  /** `planned` renders as a non-link placeholder until the page ships. */
  readonly status: NavStatus;
  readonly blurb: string;
}

/**
 * The nav. A future page registers itself by flipping `status` to `'ready'`
 * (one line) once its `<entry>.html` exists and is listed in `vite.config.ts`.
 */
export const SITE_NAV: readonly NavItem[] = Object.freeze([
  {
    id: 'explorer',
    label: 'Explorer',
    entry: '',
    status: 'ready',
    blurb: 'Build supertiles, pick an edge rule, watch the circuits appear.',
  },
  {
    id: 'tails',
    label: 'The Tails Problem',
    entry: 'tails.html',
    status: 'planned',
    blurb: 'Why only eight sets of seams close up — and what happens when they do not.',
  },
  {
    id: 'stats',
    label: 'Circuits & Stats',
    entry: 'stats.html',
    status: 'planned',
    blurb: 'Every analysed combination, its circuits, its wanderers.',
  },
  {
    id: 'legacy',
    label: 'Legacy p5 app',
    entry: 'legacy.html',
    status: 'ready',
    blurb: 'The original canvas app, kept working while the rebuild lands.',
  },
] as const);

export const REPO_URL = 'https://github.com/bohemian-miser/Spectre';

/** Smith, Myers, Kaplan & Goodman-Strauss, "A chiral aperiodic monotile". */
export const PAPER_URL = 'https://arxiv.org/abs/2305.17743';
export const PAPER_TITLE = 'Smith, Myers, Kaplan & Goodman-Strauss — “A chiral aperiodic monotile”';

/** Normalize a deploy base (`import.meta.env.BASE_URL`) to a trailing slash. */
export function normalizeBase(base: string): string {
  if (!base) return '/';
  return base.endsWith('/') ? base : `${base}/`;
}

/** Absolute href for a nav item under a deploy base (`/Spectre/` in prod). */
export function navHref(item: NavItem, base = '/'): string {
  return `${normalizeBase(base)}${item.entry}`;
}

export function navItem(id: string): NavItem | undefined {
  return SITE_NAV.find((i) => i.id === id);
}

/**
 * Which nav entry a document path belongs to. `/Spectre/`, `/Spectre/index.html`
 * and `/` all resolve to the explorer; unknown paths return `null` so the shell
 * simply highlights nothing (the dev gallery, for instance).
 */
export function activeNavId(pathname: string): string | null {
  const file = pathname.split('/').pop() ?? '';
  if (file === '' || file === 'index.html') return 'explorer';
  const hit = SITE_NAV.find((i) => i.entry !== '' && i.entry === file);
  return hit ? hit.id : null;
}

/** Nav entries that are live, in nav order — what the shell links to. */
export function readyNav(): readonly NavItem[] {
  return SITE_NAV.filter((i) => i.status === 'ready');
}
