/**
 * Visual check: zoomed screenshot of the instanced renderer — spectres must
 * interlock with no gaps/overlaps (validates the 10-byte rot/mirror encoding).
 * Run:  npx tsx spike/screenshot-zoom.ts
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
    const p = join(here, (req.url ?? '/').split('?')[0].replace(/^\//, ''));
    const body = readFileSync(p);
    res.writeHead(200, { 'content-type': MIME[extname(p)] ?? 'application/octet-stream' });
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
    args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--enable-webgl'],
  });
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  // draw only 60k instances around the first DFS cluster + zoom to tile scale
  // so the software rasterizer renders frames in bounded time.
  await page.goto(`http://127.0.0.1:${port}/webgl-instanced.html?draw=60000&focus&scale=0.12`);
  await page.waitForFunction(() => (window as never as { __GL_OK: boolean }).__GL_OK);
  await page.waitForTimeout(12_000); // tiles.bin load + a few frames
  await page.screenshot({ path: join(here, 'webgl-zoom.png') });
  await browser.close();
  server.close();
  console.log('wrote spike/webgl-zoom.png');
}
void main();
