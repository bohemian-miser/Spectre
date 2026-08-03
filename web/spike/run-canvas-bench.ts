/**
 * Canvas2D fallback benchmark runner (same harness as run-webgl-bench).
 * Run:  npx tsx spike/run-canvas-bench.ts
 */
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const MIME: Record<string, string> = { '.html': 'text/html', '.bin': 'application/octet-stream' };

const server = createServer((req, res) => {
  try {
    const path = join(here, (req.url ?? '/').split('?')[0].replace(/^\//, ''));
    const body = readFileSync(path);
    res.writeHead(200, { 'content-type': MIME[extname(path)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
});

async function main(): Promise<void> {
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const port = (server.address() as { port: number }).port;
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('console', (m) => console.log('[page]', m.text()));
  await page.goto(`http://127.0.0.1:${port}/canvas2d.html`);
  await page.waitForFunction(
    () => (window as never as { __RESULTS?: unknown; __ERROR?: string }).__RESULTS ||
          (window as never as { __ERROR?: string }).__ERROR,
    undefined,
    { timeout: 300_000 },
  );
  const out = await page.evaluate(() => ({
    results: (window as never as { __RESULTS?: unknown }).__RESULTS,
    error: (window as never as { __ERROR?: string }).__ERROR,
  }));
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
  server.close();
}
void main();
