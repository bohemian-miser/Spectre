/**
 * Enforces the DESIGN.md §1.2 layering rule for `core/`: pure TypeScript only —
 * no React, no p5, no DOM/window access, and no imports from the app layers.
 *
 * (The design doc suggests an ESLint `no-restricted-imports` rule; the repo has
 * no ESLint setup yet, so the constraint is enforced here where it runs in the
 * same `npm test` gate.)
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const CORE_DIR = new URL('..', import.meta.url).pathname;

function coreSources(): { file: string; text: string }[] {
  return readdirSync(CORE_DIR)
    .filter((f) => f.endsWith('.ts'))
    .map((f) => ({ file: f, text: readFileSync(join(CORE_DIR, f), 'utf8') }));
}

const FORBIDDEN_IMPORTS = /from\s+['"](p5|react|react-dom|react-router-dom|\.\.\/(components|pages|hooks|state|config|sketch|ui|tiles|analysis|utils))/;
const FORBIDDEN_GLOBALS = /\b(window|document|localStorage|navigator|HTMLElement|requestAnimationFrame)\b/;

describe('core layering', () => {
  const sources = coreSources();

  it('finds the core modules', () => {
    expect(sources.length).toBeGreaterThanOrEqual(11);
    expect(sources.map((s) => s.file)).toContain('index.ts');
  });

  it('imports nothing outside core/', () => {
    for (const { file, text } of sources) {
      expect(FORBIDDEN_IMPORTS.test(text), `${file} imports outside core/`).toBe(false);
    }
  });

  it('never touches the DOM or browser globals', () => {
    for (const { file, text } of sources) {
      expect(FORBIDDEN_GLOBALS.test(text), `${file} references a browser global`).toBe(false);
    }
  });

  it('is importable in a DOM-free environment', async () => {
    const core = await import('../index');
    expect(typeof core.buildSystem).toBe('function');
    expect(typeof core.analyze).toBe('function');
    expect(typeof core.validEdgeSubsets).toBe('function');
    expect(typeof core.encodeExplorerState).toBe('function');
  });
});
