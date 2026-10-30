/**
 * The breadth-first search over the tree of choices, split so that the
 * ancestor stacks never leave the thread that walks them.
 *
 * A `Subtrees` holds a queue of branches not yet walked, each with its
 * stacks. Walking one ends it, or opens a fork whose landings join the back
 * of the queue; once walked, a branch keeps no stacks. What comes out is a
 * `Walked` record per branch: its fork's landings and the handles given to
 * them, or how it ended, with the tiles of a circuit it closes on. The page
 * builds its tree from the records (`SearchTree`), and walks the stacks of
 * one branch again only when it is looked at (`followKeys`).
 *
 * A branch keeps the tiles walked to it as a `Path`, one byte per tile
 * (`tileCode`) after the path of the branch it forks from, so the landings
 * of a fork share the tiles before it.
 *
 * A branch that carries a `Reading` is cut as soon as it cannot be the first
 * reading of a circuit (`canon.ts`), so each circuit is closed on by one
 * branch; its record says it was cut.
 *
 * Handles are `worker:index`, so records from several workers can be put in
 * one tree; the root is `0`.
 */
import { firstReading, seenOf, stillFirst, tileCode, type Reading } from './canon';
import { forkAt, reducePossible, stepAll, type Fork, type Outcome, type PossibleWalk, type Seen, type Stage, type Status, type Walker, type World } from './possible';

export type Handle = string;

/** The tiles walked to a branch: the codes walked since `parent`'s path, `length` in all. */
export interface Path { readonly parent: Path | null; readonly length: number; readonly codes: Uint8Array }

/** A branch handed to a walker of subtrees: its handle, its stacks and how it stands, and the tiles walked to it. */
export interface Branch {
  readonly handle: Handle;
  readonly worlds: readonly World[];
  readonly status: Status;
  readonly path: Path;
  readonly reading?: Reading;
}

/** The branch that starts from a stage. */
export function branchOf(handle: Handle, stage: Stage, reading?: Reading): Branch {
  const codes = Uint8Array.from(stage.seen, (s) => tileCode(s.type, s.entry));
  // a stage stopped at a choice is walked to it again
  const status = stage.status === 'choice' ? 'walking' : stage.status;
  return { handle, worlds: stage.worlds, status, path: { parent: null, length: codes.length, codes }, ...(reading ? { reading } : {}) };
}

/** Writes a path's codes, in order, into the first `path.length` places of `into`. */
function spell(path: Path, into: Uint8Array): void {
  for (let p: Path | null = path; p; p = p.parent) into.set(p.codes, p.length - p.codes.length);
}

const statusAfter = (o: Outcome): Status => (o.key === 'closes' ? 'closed' : o.key === 'open' ? 'open' : 'walking');

/** How a branch ended: as the walk does, or cut as not the first reading of anything it closes on. */
export type Ending = Status | 'cut';

/** What walking a branch found. */
export interface Walked {
  readonly handle: Handle;
  /** Tiles walked before the branch's fork or end. */
  readonly tiles: number;
  /** Its fork, and the handle of the branch along each landing. */
  readonly fork?: { readonly fork: Fork; readonly children: readonly { readonly handle: Handle; readonly key: string }[] };
  /** Where it ended: closed (with the circuit's tiles), open, stuck, still walking after the tile limit, or cut. */
  readonly end?: { readonly status: Ending; readonly seen?: readonly Seen[] };
}

/** The branches one thread walks: a queue, nearest first, and the records of the branches walked. */
export class Subtrees {
  private readonly queue: Branch[] = [];
  private head = 0;
  private made = 0;
  /** The codes of the branch being walked. */
  private codes = new Uint8Array(1024);

  constructor(private readonly walker: Walker, private readonly tag: string, private readonly tiles: number) {}

  get waiting(): number { return this.queue.length - this.head; }

  add(branches: readonly Branch[]): void { this.queue.push(...branches); }

  /** Up to `n` branches from the back of the queue (the farthest), for another thread to walk. */
  give(n: number): Branch[] {
    const k = Math.min(n, Math.floor(this.waiting / 2));
    return k > 0 ? this.queue.splice(this.queue.length - k, k) : [];
  }

  /** Walks branches for about `budgetMs`, nearest first. */
  run(budgetMs: number): Walked[] {
    const out: Walked[] = [];
    const t0 = Date.now();
    while (this.head < this.queue.length && Date.now() - t0 < budgetMs) {
      const b = this.queue[this.head];
      // a walked branch keeps no stacks
      (this.queue as (Branch | undefined)[])[this.head++] = undefined;
      out.push(this.walk(b));
    }
    if (this.head > 4096 && this.head * 2 > this.queue.length) { this.queue.splice(0, this.head); this.head = 0; }
    return out;
  }

  /** The codes buffer with room for `n` codes, keeping the first `keep`. */
  private room(n: number, keep: number): Uint8Array {
    if (n > this.codes.length) {
      const grown = new Uint8Array(Math.max(n, this.codes.length * 2));
      grown.set(this.codes.subarray(0, keep));
      this.codes = grown;
    }
    return this.codes;
  }

  private walk(b: Branch): Walked {
    const wk = this.walker;
    const from = b.path.length;
    let codes = this.room(from + 1, 0);
    spell(b.path, codes);
    let n = from;
    let worlds = b.worlds;
    let status = b.status;
    let pending: readonly Outcome[] = [];
    let reading = b.reading;
    while (status === 'walking' && n < this.tiles) {
      const { outcomes, corner } = stepAll(wk, worlds);
      if (outcomes.length === 0) { status = corner.stacks ? 'open' : 'stuck'; break; }
      if (outcomes.length > 1) { status = 'choice'; pending = outcomes; break; }
      codes = this.room(n + 1, n);
      codes[n++] = tileCode(worlds[0].at.leaf, worlds[0].entry);
      worlds = outcomes[0].worlds;
      status = statusAfter(outcomes[0]);
      if (reading) {
        const next = stillFirst(wk, codes, n, reading);
        if (!next) return { handle: b.handle, tiles: n, end: { status: 'cut' } };
        reading = next;
      }
    }
    if (status === 'closed' && reading && !firstReading(wk, codes, n)) return { handle: b.handle, tiles: n, end: { status: 'cut' } };
    if (status !== 'choice') {
      const seen = status === 'closed' ? Array.from(codes.subarray(0, n), (c) => seenOf(wk, c)) : undefined;
      return { handle: b.handle, tiles: n, end: { status, seen } };
    }
    const fork = forkAt(wk, worlds, pending, n + 1);
    // every landing leaves the same tile, so the path through it is shared
    codes = this.room(n + 1, n);
    codes[n] = tileCode(worlds[0].at.leaf, worlds[0].entry);
    const children: { handle: Handle; key: string }[] = [];
    // landings that cannot start a first reading are not walked
    const next = reading ? stillFirst(wk, codes, n + 1, reading) : undefined;
    if (next === null) return { handle: b.handle, tiles: n, fork: { fork, children } };
    const path: Path = { parent: b.path, length: n + 1, codes: codes.slice(from, n + 1) };
    for (const o of pending) {
      const handle = `${this.tag}:${this.made++}`;
      this.queue.push({ handle, worlds: o.worlds, status: statusAfter(o), path, ...(next ? { reading: next } : {}) });
      children.push({ handle, key: o.key });
    }
    return { handle: b.handle, tiles: n, fork: { fork, children } };
  }
}

/** The search's tree, as the records come in: a node per branch, by handle. */
export interface SearchNode {
  readonly id: number;
  readonly handle: Handle;
  readonly parent: number | null;
  readonly key: string | null;
  readonly children: number[];
  depth: number;
  tiles?: number;
  fork?: Fork;
  end?: { readonly status: Ending; readonly seen?: readonly Seen[] };
}

export class SearchTreeData {
  readonly nodes: SearchNode[] = [{ id: 0, handle: '0', parent: null, key: null, children: [], depth: 0 }];
  private readonly byHandle = new Map<Handle, number>([['0', 0]]);
  /** Bumped on every change, so a page can tell the tree has grown. */
  version = 0;

  put(records: readonly Walked[]): void {
    for (const r of records) {
      const id = this.byHandle.get(r.handle);
      if (id === undefined) continue;
      const n = this.nodes[id];
      n.tiles = r.tiles;
      if (r.end) n.end = r.end;
      if (r.fork) {
        n.fork = r.fork.fork;
        for (const c of r.fork.children) {
          const child: SearchNode = { id: this.nodes.length, handle: c.handle, parent: id, key: c.key, children: [], depth: n.depth + 1 };
          this.nodes.push(child);
          this.byHandle.set(c.handle, child.id);
          n.children.push(child.id);
        }
      }
    }
    this.version++;
  }

  idOf(h: Handle): number | undefined { return this.byHandle.get(h); }

  /** The landings taken from the root to a node. */
  keysTo(id: number): string[] {
    const out: string[] = [];
    for (let at: number | null = id; at !== null && this.nodes[at].parent !== null; at = this.nodes[at].parent) out.unshift(this.nodes[at].key!);
    return out;
  }
}

/** Walks the stacks to a node of the search again: from the start, taking each landing in turn. */
export const followKeys = (pw: PossibleWalk, keys: readonly string[], cap: number): PossibleWalk => reducePossible(pw, { type: 'follow', keys, cap });
