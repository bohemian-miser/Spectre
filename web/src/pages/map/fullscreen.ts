/**
 * Cross-engine Fullscreen API shims for the viewport tools — one place that
 * knows about the `webkit` prefixes (Safari before 16.4) so the component
 * code reads as if the standard API were universal.
 *
 * iPhone Safari supports fullscreen for `<video>` only, never for a div; on
 * that browser {@link fullscreenEnabled} answers false and the button simply
 * is not offered — an honest absence, like the Record button in browsers
 * without MediaRecorder.
 */

/** Event names that signal fullscreen entry/exit across engines. */
export const FULLSCREEN_EVENTS: readonly string[] = [
  'fullscreenchange',
  'webkitfullscreenchange',
];

type FsDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
  webkitExitFullscreen?: () => void;
};

type FsElement = HTMLElement & {
  webkitRequestFullscreen?: () => void;
};

/** The element currently fullscreen, or null (also null with no DOM at all). */
export function fullscreenElement(): Element | null {
  if (typeof document === 'undefined') return null;
  const doc = document as FsDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

/** True when this environment can put an arbitrary element fullscreen. */
export function fullscreenEnabled(): boolean {
  if (typeof document === 'undefined') return false;
  const doc = document as FsDocument;
  return (doc.fullscreenEnabled ?? doc.webkitFullscreenEnabled ?? false) === true;
}

/**
 * Ask for `el` to go fullscreen. Failure (user denial, policy) resolves to
 * false rather than throwing or leaving an unhandled rejection — the page
 * simply stays inline.
 */
export async function requestFullscreen(el: HTMLElement): Promise<boolean> {
  const fsEl = el as FsElement;
  try {
    if (typeof fsEl.requestFullscreen === 'function') {
      await fsEl.requestFullscreen();
      return true;
    }
    if (typeof fsEl.webkitRequestFullscreen === 'function') {
      fsEl.webkitRequestFullscreen();
      return true;
    }
  } catch {
    // fall through — refused is a normal outcome, not an error state
  }
  return false;
}

/** Leave fullscreen (no-op when not in it, or where the API is missing). */
export function exitFullscreen(): void {
  if (typeof document === 'undefined') return;
  const doc = document as FsDocument;
  if (fullscreenElement() === null) return;
  try {
    if (typeof doc.exitFullscreen === 'function') void doc.exitFullscreen().catch(() => {});
    else doc.webkitExitFullscreen?.();
  } catch {
    // already out — nothing to leave
  }
}
