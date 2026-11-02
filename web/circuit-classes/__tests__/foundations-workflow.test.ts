/**
 * The Foundations sweep workflow (`.github/workflows/foundations-sweep.yml`)
 * parses as YAML, is started by hand with a rule, level and shard count,
 * offers every hexagon rule, and writes only from its gather job.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { validRules } from '../../src/pages/foundations/data';

interface Workflow {
  on: { workflow_dispatch: { inputs: Record<string, { type: string; default?: unknown; options?: string[] }> } };
  permissions: Record<string, string>;
  jobs: Record<string, { needs?: string | string[]; permissions?: Record<string, string>; 'timeout-minutes'?: number; steps?: { run?: string }[] }>;
}

const wf = parse(readFileSync(resolve(__dirname, '../../../.github/workflows/foundations-sweep.yml'), 'utf8')) as Workflow;

describe('the Foundations sweep workflow', () => {
  const inputs = wf.on.workflow_dispatch.inputs;

  it('takes a rule, a level and a shard count', () => {
    expect(inputs.rule.type).toBe('choice');
    expect([...inputs.rule.options!].sort()).toEqual([...validRules()].sort());
    expect(inputs.level.type).toBe('string');
    expect(inputs.shards.type).toBe('string');
    expect(Number(inputs.shards.default)).toBeGreaterThan(0);
  });

  it('sweeps in shards, then gathers with the index and the page cut', () => {
    expect(wf.jobs.gather.needs).toBe('sweep');
    const runs = (job: string): string => (wf.jobs[job].steps ?? []).map((s) => s.run ?? '').join('\n');
    expect(runs('sweep')).toContain('circuit-classes/foundations-sweep.ts');
    expect(runs('gather')).toContain('circuit-classes/foundations-index.ts');
    expect(runs('gather')).toContain('circuit-classes/foundations-page.ts');
    expect(runs('gather')).toContain('foundations-data/$RULE-$LEVEL');
    expect(wf.jobs.sweep['timeout-minutes']).toBeLessThanOrEqual(360);
  });

  it('can write contents from the gather job only', () => {
    expect(wf.permissions).toEqual({ contents: 'read' });
    for (const [name, job] of Object.entries(wf.jobs)) expect(job.permissions?.contents === 'write').toBe(name === 'gather');
  });
});
