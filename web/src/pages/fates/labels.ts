/**
 * What a tail can become, as labels: a circuit by its bucket in the shares
 * (`comboAnalysis.bucketOf`: chain, class and harmonic order), or still open
 * at the top level built, on a certified infinite line or not. Sets of
 * labels are kept once each and named by number.
 */

/** Open at the top level built. */
export const OPEN = 'open';
/** Open at the top, on an arc certified as an infinite line (`lines.ts`). */
export const LINE = 'line';

/** A label's class: the chain (any member) or nugget it closes into, `unseen`, or open or line. */
export function classOf(label: string): string {
  if (label === OPEN || label === LINE || label === 'unseen' || label === 'unclassified') return label;
  const [root, cls] = label.split('|');
  return cls === 'nugget' ? `nugget ${root}` : `chain ${root}`;
}

/** Whether a label is a closing (not open at the top). */
export const closes = (label: string): boolean => label !== OPEN && label !== LINE;

/** Labels and sets of labels, each numbered once. */
export class LabelSets {
  readonly labels: string[] = [];
  private readonly labelId = new Map<string, number>();
  readonly sets: (readonly number[])[] = [];
  private readonly setId = new Map<string, number>();
  private readonly unions = new Map<number, number>();

  label(name: string): number {
    let id = this.labelId.get(name);
    if (id === undefined) this.labelId.set(name, (id = this.labels.push(name) - 1));
    return id;
  }

  /** The set holding one label. */
  single(name: string): number {
    return this.of([this.label(name)]);
  }

  of(ids: readonly number[]): number {
    const sorted = [...new Set(ids)].sort((a, b) => a - b);
    const key = sorted.join(',');
    let id = this.setId.get(key);
    if (id === undefined) this.setId.set(key, (id = this.sets.push(sorted) - 1));
    return id;
  }

  union(a: number, b: number): number {
    if (a === b || b < 0) return a;
    if (a < 0) return b;
    const key = a < b ? a * 1048576 + b : b * 1048576 + a;
    let id = this.unions.get(key);
    if (id === undefined) this.unions.set(key, (id = this.of([...this.sets[a], ...this.sets[b]])));
    return id;
  }

  names(set: number): string[] {
    return this.sets[set].map((i) => this.labels[i]);
  }

  /** The classes of a set's labels, each once. */
  classes(set: number): string[] {
    return [...new Set(this.names(set).map(classOf))];
  }
}
