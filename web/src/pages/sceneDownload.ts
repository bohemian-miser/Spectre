/**
 * Browser half of the scene export (DESIGN.md §6.4): hand a serialized SVG to
 * the user as a file, or rasterise it to PNG.
 *
 * Lives in `pages/` because it touches `document`/`URL`, which `lib/` forbids
 * (see `lib/__tests__/layering.test.ts`); the pure serializer is
 * `lib/exportScene.ts`.
 */

/** Trigger a browser download for arbitrary text (no-op outside a document). */
export function downloadText(text: string, filename: string, type = 'image/svg+xml'): void {
  downloadBlob(new Blob([text], { type }), filename);
}

export function downloadBlob(blob: Blob, filename: string): void {
  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on a later turn so slower browsers have time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Rasterise serialized SVG through an `Image` + `<canvas>`. Rejects when the
 * environment cannot do it (jsdom, blocked canvas), which callers surface as a
 * status message rather than a crash.
 */
export function svgTextToPngBlob(
  svgText: string,
  width: number,
  height: number,
  scale = 2,
): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    if (typeof document === 'undefined' || typeof Image === 'undefined') {
      reject(new Error('PNG export needs a browser'));
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('canvas 2d context unavailable'));
      return;
    }
    const url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' }));
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      if (typeof canvas.toBlob === 'function') {
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('PNG encoding failed'))),
          'image/png',
        );
      } else {
        reject(new Error('canvas.toBlob unavailable'));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('could not rasterise the scene'));
    };
    img.src = url;
  });
}
