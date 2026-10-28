/**
 * A corner's key: every place it sits in the supertile hierarchy, over all
 * copies of its circuit at one level, as one canonical string.
 *
 * Each copy gives the corner tile's chain, read upward: its type, then for
 * each level the slot it sits in and that parent's type (`Ph`, `6Pi`, `0G`,
 * ...). The set of chains is stored as the smallest graph that spells
 * exactly those chains (identical upper parts merged), so equal sets of
 * chains give the same graph. Where the chains above some point are every
 * chain the substitution rules allow from that type, that part is cut to
 * `*`.
 *
 * Written out, upward, with `<` between levels:
 *  - `{a|b}`: the copies split, some continuing as `a`, some as `b`;
 *  - `[6D/6L]`: links that lead to the same continuation;
 *  - `*`: any ancestors the rules allow, from here up;
 *  - `@1`: a part used more than once, written out after the key as `@1=...`.
 * `Ph<6Pi<0G<{7Pi<*|7Ps<*}`: a Phi in slot 6 of a Pi, in slot 0 of a Gamma,
 * which is slot 7 of a Pi or of a Psi, with anything above.
 *
 * The prefix-suffix automaton of a substitution has these links as its
 * transitions (Canterini and Siegel, https://www.numdam.org/item/JTNB_2001__13_2_353_0/).
 */
import { HEX_TYPES, childType, type Address, type HexType } from '../src/core';
import { addressOf } from './board';
import { copyTile, type Copy } from './circuits';
import { TYPE_PREFIX, canonicalWord, wordOrder } from './keys';

type Token = string;
interface Node { readonly final: boolean; readonly out: readonly (readonly [Token, number])[] }

const nodes: Node[] = [];
const nodeIds = new Map<string, number>();
function node(final: boolean, out: (readonly [Token, number])[]): number {
  out.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const k = `${final ? 1 : 0}|${out.map(([t, n]) => `${t}>${n}`).join(',')}`;
  let id = nodeIds.get(k);
  if (id === undefined) { id = nodes.length; nodes.push({ final, out }); nodeIds.set(k, id); }
  return id;
}
const END = node(true, []);
/** Any ancestors from here up. */
const ANY = node(false, [['*', END]]);

const TYPE_OF = new Map<string, HexType>(HEX_TYPES.map((t) => [TYPE_PREFIX[t], t]));
const linkToken = (slot: number, parent: HexType): Token => `${slot}${TYPE_PREFIX[parent]}`;
const parentOf = (t: Token): HexType => TYPE_OF.get(t.replace(/^\d/, ''))!;

/** The tile's chain, upward. */
const chainOf = (a: Address): Token[] => [TYPE_PREFIX[a.leaf], ...a.path.map((l) => linkToken(l.slot, l.parent))];

/** The smallest graph spelling exactly these chains. */
function graphOf(chains: readonly Token[][], i = 0): number {
  const groups = new Map<Token, Token[][]>();
  let final = false;
  for (const c of chains) {
    if (c.length === i) final = true;
    else (groups.get(c[i]) ?? groups.set(c[i], []).get(c[i])!).push(c);
  }
  return node(final, [...groups].map(([t, cs]) => [t, graphOf(cs, i + 1)] as const));
}

const anyMemo = new Map<string, number>();
/** Every chain of `d` links upward from a tile of type `t`. */
function everything(t: HexType, d: number): number {
  if (d === 0) return END;
  const k = `${t}:${d}`;
  let id = anyMemo.get(k);
  if (id === undefined) {
    const out: [Token, number][] = [];
    for (const p of HEX_TYPES) for (let s = 0; s < 8; s++) if (childType(p, s) === t) out.push([linkToken(s, p), everything(p, d - 1)]);
    id = node(false, out);
    anyMemo.set(k, id);
  }
  return id;
}

const cutMemo = new Map<string, number>();
/** The graph with every unconstrained upper part cut to `*`; `t` is the type of the tile just read, `d` the levels left. */
function cut(n: number, t: HexType | null, d: number): number {
  if (t && d > 0 && n === everything(t, d)) return ANY;
  const k = `${n}|${t}|${d}`;
  let id = cutMemo.get(k);
  if (id === undefined) {
    id = node(nodes[n].final, nodes[n].out.map(([tok, m]) => [tok, t === null ? cut(m, TYPE_OF.get(tok)!, d) : cut(m, parentOf(tok), d - 1)] as const));
    cutMemo.set(k, id);
  }
  return id;
}

/** The graph written out, upward. */
function render(root: number): string {
  const into = new Map<number, number>();
  const seen = new Set<number>();
  const walk = (n: number): void => {
    if (seen.has(n)) return;
    seen.add(n);
    for (const [, m] of nodes[n].out) { into.set(m, (into.get(m) ?? 0) + 1); walk(m); }
  };
  walk(root);
  const names = new Map<number, string>();
  const defs: string[] = [];
  const ref = (n: number): string => {
    if (n === END) return '';
    if (n === ANY) return '*';
    if ((into.get(n) ?? 0) > 1 && nodes[n].out.length > 1) {
      let name = names.get(n);
      if (!name) { name = `@${names.size + 1}`; names.set(n, name); defs.push(`${name}=${body(n)}`); }
      return name;
    }
    return body(n);
  };
  const body = (n: number): string => {
    const byNext = new Map<number, Token[]>();
    for (const [t, m] of nodes[n].out) (byNext.get(m) ?? byNext.set(m, []).get(m)!).push(t);
    const alts = [...byNext].map(([m, ts]) => {
      const head = ts.length > 1 ? `[${ts.join('/')}]` : ts[0];
      const rest = ref(m);
      return rest ? `${head}<${rest}` : head;
    });
    if (nodes[n].final && alts.length) alts.push('');
    return alts.length > 1 ? `{${alts.join('|')}}` : (alts[0] ?? '');
  };
  return [ref(root), ...defs].join(' ');
}

/**
 * The keys of a circuit's corners (positions in its canonical word) over the
 * given copies, all at one level. Positions one period of the word apart are
 * the same corner turned, so their chains are pooled.
 */
export function cornerKeys(word: readonly string[], corners: readonly number[], copies: readonly Copy[]): string[] {
  if (!copies.length) return corners.map(() => '');
  const level = copies[0].board.level;
  const period = word.length / wordOrder(canonicalWord(word).word);
  return corners.map((p) => {
    const same = corners.filter((q) => (q - p) % period === 0);
    const chains = copies.flatMap((c) => same.map((q) => chainOf(addressOf(c.board, copyTile(c, q)))));
    return render(cut(graphOf(chains), null, level));
  });
}

/** How many nodes the shared tables hold (they are kept across calls). */
export const tableSize = (): number => nodes.length;
