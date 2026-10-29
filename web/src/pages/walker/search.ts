/**
 * The breadth-first search over the tree of choices, split so that the
 * ancestor stacks never leave the thread that walks them.
 *
 * A `Subtrees` holds a queue of branches not yet walked, each with its stage.
 * Walking one (`walkOn`) ends it, or opens a fork whose landings join the
 * back of the queue; once walked, a branch keeps no stacks. What comes out is
 * a `Walked` record per branch: its fork's landings and the handles given to
 * them, or how it ended, with the tiles of a circuit it closes on. The page
 * builds its tree from the records (`SearchTree`), and walks the stacks of
 * one branch again only when it is looked at (`followKeys`).
 *
 * Handles are `worker:index`, so records from several workers can be put in
 * one tree; the root is `0`.
 */
import { chooseIn, forkOf, reducePossible, walkOn, type Fork, type PossibleWalk, type Seen, type Stage, type Status, type Walker } from './possible';

export type Handle = string;

/** A branch handed to a walker of subtrees: its handle and the stage it starts from. */
export interface Branch { readonly handle: Handle; readonly stage: Stage }

/** What walking a branch found. */
export interface Walked {
  readonly handle: Handle;
  /** Tiles walked before the branch's fork or end. */
  readonly tiles: number;
  /** Its fork, and the handle of the branch along each landing. */
  readonly fork?: { readonly fork: Fork; readonly children: readonly { readonly handle: Handle; readonly key: string }[] };
  /** Where it ended: closed (with the circuit's tiles), open, stuck, or still walking after the tile limit. */
  readonly end?: { readonly status: Status; readonly seen?: readonly Seen[] };
}

/** The branches one thread walks: a queue, nearest first, and the records of the branches walked. */
export class Subtrees {
  private readonly queue: Branch[] = [];
  private head = 0;
  private made = 0;

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

  private walk(b: Branch): Walked {
    const st = walkOn(this.walker, b.stage, this.tiles);
    if (st.status !== 'choice') return { handle: b.handle, tiles: st.seen.length, end: { status: st.status, seen: st.status === 'closed' ? st.seen : undefined } };
    const fork = forkOf(this.walker, st);
    const children = st.pending.map((o) => {
      const handle = `${this.tag}:${this.made++}`;
      this.queue.push({ handle, stage: chooseIn(this.walker, st, o.key) });
      return { handle, key: o.key };
    });
    return { handle: b.handle, tiles: st.seen.length, fork: { fork, children } };
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
  end?: { readonly status: Status; readonly seen?: readonly Seen[] };
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
