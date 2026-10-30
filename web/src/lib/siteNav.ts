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
  /** Compact label the top bar switches to when the full row will not fit. */
  readonly short: string;
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
    short: 'Explorer',
    entry: '',
    status: 'ready',
    blurb: 'Build supertiles, pick an edge rule, watch the circuits appear.',
  },
  {
    id: 'tails',
    label: 'The Tails Problem',
    short: 'Tails',
    entry: 'tails.html',
    status: 'ready',
    blurb: 'Why only eight sets of seams close up — and what happens when they do not.',
  },
  {
    id: 'classifications',
    label: 'Classifications',
    short: 'Classes',
    entry: 'classifications.html',
    status: 'ready',
    blurb: 'Every combination of every rule, sorted into triangle fractals, infinite lines and the rest.',
  },
  {
    id: 'rules',
    label: 'Rules & isomorphism',
    short: 'Rules',
    entry: 'rules.html',
    status: 'ready',
    blurb: 'How the rules of Tile(1,1), the hexagons and the iso labels line up, and where their combinations agree.',
  },
  {
    id: 'map',
    label: 'Infinite Map',
    short: 'Map',
    entry: 'map.html',
    status: 'ready',
    blurb: 'Pan and zoom an endless spectre tiling, expanded on demand around the camera.',
  },
  {
    id: 'supertiles',
    label: 'Supertiles',
    short: 'Supertiles',
    entry: 'supertiles.html',
    status: 'ready',
    blurb: 'Push a supertile apart into the pieces it is made of, one substitution at a time.',
  },
  {
    id: 'topdown',
    label: 'Top-down',
    short: 'Top-down',
    entry: 'topdown.html',
    status: 'ready',
    blurb: 'Select an area and replace each tile by its supertile, one level deeper at a time.',
  },
  {
    id: 'machine',
    label: 'Strand machine',
    short: 'Machine',
    entry: 'machine.html',
    status: 'ready',
    blurb: 'Walk a strand by hand and see which joins the labels permit, which the tiling uses.',
  },
  {
    id: 'transducer',
    label: 'Neighbour machine',
    short: 'Neighbours',
    entry: 'transducer.html',
    status: 'ready',
    blurb: 'Cross an edge from a tile’s slot path alone, one lookup at a time, then walk a strand on the same machine.',
  },
  {
    id: 'walker',
    label: 'Circuit walker',
    short: 'Walker',
    entry: 'walker.html',
    status: 'ready',
    blurb: 'Walk a strand tile by tile, choose the ancestors it needs, and compare the three sides of the circuit it closes.',
  },
  {
    id: 'lattice',
    label: 'Flow lattice',
    short: 'Lattice',
    entry: 'lattice.html',
    status: 'ready',
    blurb: 'Give every edge a direction: the circuits form a lattice you can click through.',
  },
  {
    id: 'multiedge',
    label: 'Multi-edge',
    short: 'Multi-edge',
    entry: 'multiedge.html',
    status: 'ready',
    blurb: 'No directions, any number of strands per edge: a parity cube times stacks of pairs.',
  },
  {
    id: 'dimension',
    label: 'Dimension',
    short: 'Dimension',
    entry: 'dimension.html',
    status: 'ready',
    blurb: 'How each rule grows with the supertile level: bounded, curves, fractal or space-filling.',
  },
  {
    id: 'centremap',
    label: 'Centre map',
    short: 'Centres',
    entry: 'centremap.html',
    status: 'ready',
    blurb: 'Every pairing compared by where its circuit centres are: heatmap, UMAP and search.',
  },
  {
    id: 'circuits',
    label: 'Circuits',
    short: 'Circuits',
    entry: 'circuits.html',
    status: 'ready',
    blurb: 'Every circuit type of a rule: classes, families, growth and silhouettes of the giants.',
  },
  {
    id: 'corners',
    label: 'Corners',
    short: 'Corners',
    entry: 'corners.html',
    status: 'ready',
    blurb: 'How many sides a circuit has: corners walked round it, fitted polygons, and its Fourier series as epicycles.',
  },
  {
    id: 'shapes',
    label: 'Shapes',
    short: 'Shapes',
    entry: 'shapes.html',
    status: 'ready',
    blurb: 'Every circuit grouped by shape: Fourier terms compared over turn, start and mirror, clustered and mapped.',
  },
  {
    id: 'harmonics',
    label: 'Harmonics',
    short: 'Harmonics',
    entry: 'harmonics.html',
    status: 'ready',
    blurb: 'Which circuits are the same circuit two levels up: every circuit read at every level, and the lineages among them.',
  },
  {
    id: 'compare',
    label: 'Compare',
    short: 'Compare',
    entry: 'compare.html',
    status: 'ready',
    blurb: 'Two circuits side by side: drawn, compared through their Fourier terms, and read level by level.',
  },
  {
    id: 'buildup',
    label: 'Build-up',
    short: 'Build-up',
    entry: 'buildup.html',
    status: 'ready',
    blurb: "A combination's supertiles built level by level: every type's border table, and the circuits that close at each level.",
  },
  {
    id: 'period',
    label: 'Every other level',
    short: 'Period',
    entry: 'period.html',
    status: 'ready',
    blurb: 'Borders compared level by level: where they repeat every second level, and the infinite line that follows.',
  },
  {
    id: 'limit',
    label: 'Limit shape',
    short: 'Limit',
    entry: 'limit.html',
    status: 'ready',
    blurb: 'Supertile outlines scaled down level after level, from hexagons and from Spectres, and the shape both settle on.',
  },
  {
    id: 'legacy',
    label: 'Legacy p5 app',
    short: 'Legacy',
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
