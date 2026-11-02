/**
 * A brute force drawn (`searchPicture.ts`): the supertile and its children
 * outlined, the windows looked through shaded, every arc followed as a line
 * through the child crossings it enters, coloured by how it ended, and the
 * one being followed on top. Redrawn with each progress report, so a search
 * can be watched as it goes.
 */
import { useEffect, useRef } from 'react';
import { describeArcs, type ArcEnd, type SearchPicture } from './searchPicture';

const nf = (n: number) => n.toLocaleString('en-US');

/** The colour of an arc by how it ended: the page's palette through its CSS variables, read from the canvas. */
const VAR: Record<ArcEnd, string> = { following: '--g1', open: '--muted', ends: '--muted', closed: '--g7', other: '--g4', differs: '--g8', harmonic: '--g3' };
const FALLBACK: Record<ArcEnd, string> = { following: '#2a78d6', open: '#7a8494', ends: '#7a8494', closed: '#6250d6', other: '#eda100', differs: '#e34948', harmonic: '#1baf7a' };
const WIDTH: Record<ArcEnd, number> = { following: 1.6, open: 0.7, ends: 0.7, closed: 1.4, other: 1.2, differs: 1.4, harmonic: 2.2 };
const ALPHA: Record<ArcEnd, number> = { following: 1, open: 0.45, ends: 0.45, closed: 0.9, other: 0.9, differs: 0.9, harmonic: 1 };
/** Arcs that came back to their start are drawn closed. */
const CLOSED = new Set<ArcEnd>(['closed', 'other', 'differs', 'harmonic']);

export const LEGEND: readonly { readonly end: ArcEnd; readonly label: string }[] = [
  { end: 'following', label: 'being followed' },
  { end: 'open', label: 'leaves the supertile' },
  { end: 'other', label: 'closes in another family' },
  { end: 'differs', label: 'closes reading differently' },
  { end: 'harmonic', label: 'the harmonic' },
];

const rgba = (css: string, a: number): string => {
  const hex = css.trim();
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex || '#888';
  const v = parseInt(hex.slice(1), 16);
  return `rgba(${v >> 16},${(v >> 8) & 255},${v & 255},${a})`;
};

/** A picture drawn on a canvas `size` pixels square, the supertile fitted. */
export function drawSearch(cv: HTMLCanvasElement, p: SearchPicture, size: number): void {
  const dpr = Math.min(3, (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1);
  cv.width = Math.round(size * dpr);
  cv.height = Math.round(size * dpr);
  const g = cv.getContext('2d');
  if (!g) return;
  const style = typeof getComputedStyle === 'function' ? getComputedStyle(cv) : null;
  const colour = (end: ArcEnd, a: number) => rgba(style?.getPropertyValue(VAR[end]) || FALLBACK[end], a);
  const line = style?.getPropertyValue('--line').trim() || '#8884';
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < p.outline.length; i += 2) {
    x0 = Math.min(x0, p.outline[i]);
    x1 = Math.max(x1, p.outline[i]);
    y0 = Math.min(y0, p.outline[i + 1]);
    y1 = Math.max(y1, p.outline[i + 1]);
  }
  const span = Math.max(x1 - x0, y1 - y0) || 1;
  const k = ((size - 8) * dpr) / span;
  const ox = (cv.width - (x1 - x0) * k) / 2, oy = (cv.height - (y1 - y0) * k) / 2;
  const path = (pts: Float64Array, close: boolean) => {
    g.beginPath();
    for (let i = 0; i + 1 < pts.length; i += 2) {
      const x = ox + (pts[i] - x0) * k, y = cv.height - oy - (pts[i + 1] - y0) * k;
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    }
    if (close) g.closePath();
  };
  g.clearRect(0, 0, cv.width, cv.height);
  g.lineJoin = 'round';
  g.lineCap = 'round';
  // the children, then the supertile
  g.lineWidth = 0.6 * dpr;
  g.strokeStyle = line;
  for (const ch of p.children) {
    path(ch.outline, true);
    g.stroke();
  }
  g.lineWidth = 1.2 * dpr;
  path(p.outline, true);
  g.stroke();
  // the windows looked through, the current one darker
  p.windows.forEach((w, i) => {
    path(w.outline, true);
    g.fillStyle = colour('following', i === p.windows.length - 1 ? 0.35 : 0.12);
    g.fill();
  });
  // the arcs, the one being followed and the harmonic last
  const order: ArcEnd[] = ['open', 'ends', 'closed', 'other', 'differs', 'harmonic', 'following'];
  for (const end of order) {
    g.strokeStyle = colour(end, ALPHA[end]);
    g.lineWidth = WIDTH[end] * dpr;
    for (const a of p.arcs) {
      if (a.end !== end || a.pts.length < 2) continue;
      path(a.pts, CLOSED.has(end));
      if (a.pts.length === 2) {
        g.fillStyle = g.strokeStyle;
        g.fillRect(ox + (a.pts[0] - x0) * k - dpr, cv.height - oy - (a.pts[1] - y0) * k - dpr, 2 * dpr, 2 * dpr);
      } else g.stroke();
    }
  }
}

/** What a picture shows, in a sentence: the supertile, the windows and the arcs. */
export function describePicture(p: SearchPicture): string {
  const w = p.windows[p.windows.length - 1];
  const windows = p.windowCount ? `${p.windowCount === 1 ? 'one' : nf(p.windowCount)} level-${w?.level ?? '?'} window${p.windowCount === 1 ? '' : 's'} looked through` : 'no window yet';
  return `Level ${p.level} ${p.type}: ${windows}; ${describeArcs(p.counts)}.`;
}

export function SearchView(props: { picture: SearchPicture; size: number; caption: string; testId?: string }): JSX.Element {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const { picture, size } = props;
  useEffect(() => {
    if (ref.current) drawSearch(ref.current, picture, size);
  }, [picture, size]);
  return (
    <figure className="harm-search" data-testid={props.testId ?? 'harm-search'}>
      <canvas ref={ref} style={{ width: size, height: size }} role="img" aria-label={describePicture(picture)} />
      <figcaption>
        {props.caption}
        <span className="harm-search-legend">
          {LEGEND.filter((l) => picture.counts[l.end] > 0 || l.end === 'following').map((l) => (
            <span key={l.end} className={`harm-search-key is-${l.end}`}>
              {l.label}
            </span>
          ))}
        </span>
      </figcaption>
    </figure>
  );
}

/** A strip of small pictures, one per level climbed. */
export function ClimbStrip(props: { pictures: readonly SearchPicture[]; size: number }): JSX.Element | null {
  if (!props.pictures.length) return null;
  return (
    <div className="harm-climb-strip" data-testid="harm-climb-strip">
      {props.pictures.map((p, i) => (
        <SearchView key={`${p.level}-${i}`} picture={p} size={props.size} caption={`L${p.level} ${p.type}`} testId="harm-climb-picture" />
      ))}
    </div>
  );
}
