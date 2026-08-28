/**
 * Copying a share link has to work in more places than the async Clipboard
 * API does. Embedded previews and sandboxed iframes routinely deny the
 * `clipboard-write` permission, so `navigator.clipboard.writeText` rejects
 * with NotAllowedError even inside a click handler. The synchronous
 * selection + `execCommand('copy')` path needs only the click's transient
 * activation and still works in those frames, so it goes FIRST; the async
 * API covers browsers that dropped execCommand. Callers get a boolean and
 * surface the URL for manual copying when both paths fail.
 */
export function copyText(text: string): Promise<boolean> {
  if (typeof document !== 'undefined' && document.body) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      if (ok) return Promise.resolve(true);
    } catch {
      // execCommand gone (or the DOM refused) — try the async API.
    }
  }
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    return navigator.clipboard.writeText(text).then(
      () => true,
      () => false,
    );
  }
  return Promise.resolve(false);
}

/**
 * Base URL for share links. An embedding page (the PR-preview artifact, a
 * demo iframe) can name the canonical site with
 * `<meta name="spectre-share-base" content="https://…/">` so a link copied
 * inside it opens the real site rather than the embed's own URL; without
 * the meta, the current location IS the site.
 */
export function shareLinkBase(): string {
  if (typeof document !== 'undefined') {
    const content = document
      .querySelector('meta[name="spectre-share-base"]')
      ?.getAttribute('content')
      ?.trim();
    if (content) return content;
  }
  return typeof window !== 'undefined' ? window.location.href : '';
}
