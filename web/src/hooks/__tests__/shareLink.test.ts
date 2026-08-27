// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { copyText, shareLinkBase } from '../shareLink';

afterEach(() => {
  vi.unstubAllGlobals();
  document.head.querySelectorAll('meta[name="spectre-share-base"]').forEach((m) => m.remove());
  // jsdom has no execCommand by default; drop any stub a test installed.
  delete (document as { execCommand?: unknown }).execCommand;
});

describe('copyText', () => {
  it('prefers the synchronous execCommand path (iframes deny the async API)', async () => {
    let copied = '';
    (document as { execCommand?: (cmd: string) => boolean }).execCommand = (cmd) => {
      expect(cmd).toBe('copy');
      copied = (document.activeElement as HTMLTextAreaElement | null)?.value ?? '';
      return true;
    };
    const writeText = vi.fn();
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    await expect(copyText('the-link')).resolves.toBe(true);
    expect(copied).toBe('the-link');
    expect(writeText).not.toHaveBeenCalled();
    // The scratch textarea does not linger.
    expect(document.querySelectorAll('textarea').length).toBe(0);
  });

  it('falls back to the async clipboard when execCommand refuses', async () => {
    (document as { execCommand?: (cmd: string) => boolean }).execCommand = () => false;
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    await expect(copyText('u')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('u');
  });

  it('reports failure when every path is denied, without throwing', async () => {
    (document as { execCommand?: (cmd: string) => boolean }).execCommand = () => false;
    const writeText = vi.fn().mockRejectedValue(new DOMException('nope', 'NotAllowedError'));
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    await expect(copyText('u')).resolves.toBe(false);
  });

  it('survives a browser with neither mechanism', async () => {
    vi.stubGlobal('navigator', {});
    await expect(copyText('u')).resolves.toBe(false);
  });
});

describe('shareLinkBase', () => {
  it('is the current location by default', () => {
    expect(shareLinkBase()).toBe(window.location.href);
  });

  it('honours the embedding page’s spectre-share-base meta', () => {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'spectre-share-base');
    meta.setAttribute('content', 'https://example.test/Spectre/');
    document.head.appendChild(meta);
    expect(shareLinkBase()).toBe('https://example.test/Spectre/');
  });
});
