/**
 * The row of a chain's views: every member side by side, as wide as the
 * row allows down to a minimum (the row scrolls sideways past it), and,
 * once the page is scrolled past the row's top, held at the top of the
 * screen and shrunk with the scroll down to a share of the screen's height,
 * so the rows of visits below can be read beside it. A spacer under the row
 * takes up what the row gives back, so nothing below moves.
 */
import { useEffect, useLayoutEffect, useState, type RefObject } from 'react';

/** Narrowest a member's view gets before the row scrolls sideways. */
export const MIN_WIDTH = 220;
/** Space between members. */
export const GAP = 12;
/** The views' height while the row is held at the top, as a share of the screen's height (less the captions). */
export const STUCK_SHARE = 0.38;

/** Each member's width for a row `available` pixels wide: the row shared out, never under `min`; and whether the row then scrolls. */
export function memberWidth(available: number, n: number, min = MIN_WIDTH, gap = GAP): { width: number; scrolls: boolean } {
  const share = (available - gap * (n - 1)) / n;
  const width = Math.max(min, Math.floor(share));
  return { width, scrolls: width * n + gap * (n - 1) > available };
}

/** The views' height `past` pixels after the row's top reached the top of the screen (negative before): full until then, then shrinking with the scroll to `min`. */
export function stickyHeight(past: number, full: number, min: number): number {
  if (past <= 0) return full;
  return Math.max(Math.min(min, full), full - past);
}

/** The views' full height for a screen `vh` pixels high. */
export const fullHeight = (vh: number): number => Math.round(Math.min(0.6 * vh, 520));

/** The views' height when shrunk, for a screen `vh` pixels high, `caption` pixels of captions above them. */
export const stuckHeight = (vh: number, caption: number): number => Math.max(120, Math.round(STUCK_SHARE * vh - caption));

/**
 * Keeps the row's views sized to the scroll: `marker` sits where the row
 * starts, `row` is the held row (its views sized by `--view-h`), `spacer`
 * follows it. The site's header, when it stays on screen, is allowed for.
 */
export function useStickyRow(marker: RefObject<HTMLElement | null>, row: RefObject<HTMLElement | null>, spacer: RefObject<HTMLElement | null>, on: boolean): void {
  useLayoutEffect(() => {
    if (!on) return;
    let frame = 0;
    const header = (): number => {
      const h = document.querySelector('header');
      if (!h) return 0;
      const pos = getComputedStyle(h).position;
      return pos === 'sticky' || pos === 'fixed' ? h.getBoundingClientRect().height : 0;
    };
    const update = (): void => {
      frame = 0;
      const m = marker.current, r = row.current, s = spacer.current;
      if (!m || !r || !s) return;
      const top = header();
      const vh = window.innerHeight;
      const caption = (r.querySelector('figcaption') as HTMLElement | null)?.offsetHeight ?? 40;
      const full = fullHeight(vh);
      const past = top - m.getBoundingClientRect().top;
      const h = stickyHeight(past, full, stuckHeight(vh, caption + 8));
      r.style.top = `${top}px`;
      r.style.setProperty('--view-h', `${h}px`);
      s.style.height = `${full - h}px`;
      r.classList.toggle('is-stuck', past > 0);
    };
    const ask = (): void => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', ask, { passive: true });
    window.addEventListener('resize', ask);
    return () => {
      window.removeEventListener('scroll', ask);
      window.removeEventListener('resize', ask);
      cancelAnimationFrame(frame);
    };
  }, [marker, row, spacer, on]);
}

/** An element's width, updated only when the width changes (its height changes with the scroll). */
export function useWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setWidth((w) => (w === el.clientWidth ? w : el.clientWidth)));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}
