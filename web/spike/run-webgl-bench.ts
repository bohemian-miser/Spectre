/**
 * Spike 3 runner — serves spike/ over http, opens the instanced-rendering page
 * in headless chromium (Playwright, PLAYWRIGHT_BROWSERS_PATH preinstalled),
 * waits for window.__RESULTS, prints them.
 *
 * NOTE this machine has no GPU: chromium falls back to SwiftShader (software
 * rasterization on 4 vcpus) — an extreme LOWER bound for real hardware.
 *
 * Run:  npx tsx spike/run-webgl-bench.ts
 */
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));

const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.bin': 'application/octet-stream',
  '.js': 'text/javascript',
};

const server = createServer((req, res) => {
  try {
    const path = join(here, (req.url ?? '/').split('?')[0].replace(/^\//, '') || 'webgl-instanced.html');
    const body = readFileSync(path);
    res.writeHead(200, { 'content-type': MIME[extname(path)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('nope');
  }
});

async function main(): Promise<void> {
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const port = (server.address() as { port: number }).port;

  const browser = await chromium.launch({
    headless: true,
    // /opt/pw-browsers ships revision 1194; the npm playwright pin expects
    // 1193 — point at the real binary instead of `playwright install`.
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: [
      '--enable-unsafe-swiftshader',
      '--use-angle=swiftshader',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--disable-gpu-sandbox',
    ],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('console', (m) => console.log('[page]', m.text()));
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));

  await page.goto(`http://127.0.0.1:${port}/webgl-instanced.html?bench`);
  const glOk = await page.evaluate(() => (window as never as { __GL_OK: boolean }).__GL_OK);
  if (!glOk) {
    console.log('WebGL2 context creation FAILED in headless chromium');
    await browser.close();
    server.close();
    process.exitCode = 1;
    return;
  }

  try {
    await page.waitForFunction(
      () => (window as never as { __RESULTS?: unknown; __ERROR?: string }).__RESULTS ||
            (window as never as { __ERROR?: string }).__ERROR,
      undefined,
      { timeout: 1_500_000 },
    );
  } catch {
    console.log('timed out waiting for full results; dumping partials');
  }
  const results = await page.evaluate(() => ({
    full: (window as never as { __RESULTS?: unknown }).__RESULTS,
    partial: (window as never as { __PARTIAL?: unknown }).__PARTIAL,
    error: (window as never as { __ERROR?: string }).__ERROR,
  }));
  if (results.error) console.log('page error:', results.error);
  console.log(JSON.stringify(results.full ?? { partial: results.partial }, null, 2));

  // screenshot proof
  await page.screenshot({ path: join(here, 'webgl-bench.png') });
  await browser.close();
  server.close();
}

void main();
