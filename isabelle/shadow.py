#!/usr/bin/env python3
"""
A line-by-line shadow of the executable definitions of FASS_Core.thy, run on the
data theories, so that every `by eval` statement of FASS_Hex.thy / FASS_Spectre.thy
is known to be a true closed computation before Isabelle checks it.

This is deliberately a transliteration of the Isabelle definitions (same indexing,
same list conventions), not of the TypeScript scripts, so it is a third independent
implementation of the checks.

Run: python3 isabelle/shadow.py
"""
import ast
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent


def load(thy: str, prefix: str) -> dict:
    text = (HERE / thy).read_text()
    out = {}
    for m in re.finditer(r'definition (\w+) :: "[^"]*" where\n  "\1 = (.*?)"\n', text, re.S):
        name, body = m.group(1), m.group(2)
        if name.endswith("_tables"):
            continue
        body = body.replace("True", "True").replace("False", "False")
        out[name[len(prefix):]] = ast.literal_eval(body)
    return out


def table(d):
    return dict(classes=d["classes"], rules=d["rules"], B=d["B"], G=d["G"], Q=d["Q"], Q1=d["Q1"], linear=d["linear"])


ALL_TYPES = list(range(9))
ALL_SLOTS = list(range(8))
ALL_EDGES = list(range(6))
SUPERQUAD = [(6, 2), (5, 1), (3, 2), (0, 1)]
T_FROM = [3, 2, 3, 3, 2, 3, 3]
T_TO = [1, 0, 1, 1, 0, 1, 3]


def child(t, T, s):
    return t["rules"][T][s]


def hasChild(t, T, s):
    return child(t, T, s) != 9


def slotsOf(t, T):
    return [s for s in ALL_SLOTS if hasChild(t, T, s)]


def CT(t, T, j):
    s, e = t["B"][T][j][0]
    return (s, (e + 1) % 6)


# direction maps
def dapply(f, x):
    return (f[0] * x + f[1]) % 12


def dcomp(f, g):
    return (f[0] * g[0], (f[0] * g[1] + f[1]) % 12)


def dinv(f):
    return (f[0], (-(f[0] * f[1])) % 12)


DNEG = (1, 6)


def Lmap(t, s):
    return tuple(t["linear"][s])


def phi(t, s):
    return dcomp(DNEG, Lmap(t, s))


def mapw(f, w):
    return [dapply(f, x) for x in w]


def negw(w):
    return [(x + 6) % 12 for x in w]


def revneg(w):
    return list(reversed(negw(w)))


def validm(f):
    return f[0] in (1, -1)


# words
def stepW(t, W):
    def new(a, e):
        out = []
        for (s, x) in t["B"][a][e]:
            out += list(reversed(mapw(phi(t, s), W(child(t, a, s), x))))
        return out
    return new


def wordsOf(L):
    return lambda a, e: L[a][e]


def holds(W, c):
    (a, e), (b, f), g = c
    return mapw(g, W(a, e)) == revneg(W(b, f))


def subclaims(t, c):
    (a, e), (b, f), g = c
    Ba = t["B"][a][e]
    Bb = list(reversed(t["B"][b][f]))
    out = []
    for (s, x), (u, y) in zip(Ba, Bb):
        out.append(((child(t, a, s), x), (child(t, b, u), y), dcomp(dinv(phi(t, u)), dcomp(g, phi(t, s)))))
    return out


def expandable(t, c):
    (a, e), (b, f), g = c
    return len(t["B"][a][e]) == len(t["B"][b][f])


def slotsOk(t, c):
    (a, e), (b, f), g = c
    return all(p[0] < 8 for p in t["B"][a][e]) and all(p[0] < 8 for p in t["B"][b][f])


def remdups(xs):
    seen, out = set(), []
    for x in xs:
        if x not in seen:
            seen.add(x)
            out.append(x)
    return out


def closureIter(t, n, S):
    for _ in range(n):
        S = remdups(S + [c2 for c in S for c2 in subclaims(t, c)])
    return S


def symc(c):
    return (c[1], c[0], dinv(c[2]))


def seeds(t):
    out = []
    for T in ALL_TYPES:
        for (a, b) in t["G"][T]:
            c = ((child(t, T, a[0]), a[1]), (child(t, T, b[0]), b[1]), dcomp(dinv(Lmap(t, b[0])), Lmap(t, a[0])))
            out += [c, symc(c)]
    return remdups(out)


def closedSet(t, S):
    Sset = set(S)
    return all(validm(c[2]) and expandable(t, c) and slotsOk(t, c) and set(subclaims(t, c)) <= Sset for c in S)


def validData(L):
    return len(L) == 9 and all(len(ws) == 6 and all(0 <= x < 12 for w in ws for x in w) for ws in L)


def validL(t):
    return all(validm(Lmap(t, s)) for s in ALL_SLOTS)


# labels
def flipLab(zl, l):
    sg, major, minor = l
    if major == 0:
        return (sg, 0, zl - 1 - minor)
    return (-sg, major, minor)


def holdsL(zl, Lw, c):
    (a, e), (b, f), g = c
    return Lw(a, e) == list(reversed([flipLab(zl, l) for l in Lw(b, f)]))


# C1
def edgesInB(t, T):
    return [p for arc in t["B"][T] for p in arc]


def edgesInG(t, T):
    return [p for gp in t["G"][T] for p in gp]


def allChildEdges(t, T):
    return [(s, e) for s in slotsOf(t, T) for e in ALL_EDGES]


def c1_ok(t):
    for T in ALL_TYPES:
        used = edgesInB(t, T) + edgesInG(t, T)
        if len(set(used)) != len(used) or set(used) != set(allChildEdges(t, T)):
            return False
        if any(not t["B"][T][j] for j in ALL_EDGES):
            return False
    return True


# corner classes
def findClass(P, x):
    for c in P:
        if x in c:
            return c
    return [x]


def sameClass(P, x, y):
    return y in findClass(P, x)


def mergeClass(P, x, y):
    if sameClass(P, x, y):
        return P
    cx, cy = findClass(P, x), findClass(P, y)
    return [cx + cy] + [c for c in P if c != cx and c != cy]


def initialClasses(t, T):
    return [[(s, c)] for s in slotsOf(t, T) for c in ALL_EDGES]


def cornerIdents(t, T):
    out = []
    for (a, b) in t["G"][T]:
        out.append(((a[0], a[1]), (b[0], (b[1] + 1) % 6)))
        out.append(((a[0], (a[1] + 1) % 6), (b[0], b[1])))
    outer = edgesInB(t, T)
    n = len(outer)
    for i in range(n):
        x, y = outer[i], outer[(i + 1) % n]
        out.append(((x[0], x[1]), (y[0], (y[1] + 1) % 6)))
    return out


def cornerClasses(t, T):
    P = initialClasses(t, T)
    for (x, y) in cornerIdents(t, T):
        P = mergeClass(P, x, y)
    return P


def ctChains(t):
    for T in ALL_TYPES:
        P = cornerClasses(t, T)
        for j in ALL_EDGES:
            lastPrev = t["B"][T][(j + 5) % 6][-1]
            if not sameClass(P, CT(t, T, j), (lastPrev[0], lastPrev[1])):
                return False
    return True


# C3
def qc(Qt, T, i):
    return Qt[T][i]


def chainSeeds(t, Qt, T):
    ss = [s for s in range(1, 8) if hasChild(t, T, s) and hasChild(t, T, s - 1)]
    for s in ss:
        if qc(Qt, child(t, T, s), T_TO[s - 1]) < 0 or qc(Qt, child(t, T, s - 1), T_FROM[s - 1]) < 0:
            return None
    return [((s, qc(Qt, child(t, T, s), T_TO[s - 1])), (s - 1, qc(Qt, child(t, T, s - 1), T_FROM[s - 1]))) for s in ss]


def propagate1(t, T, P):
    for (a, b) in t["G"][T]:
        s, e, u, f = a[0], a[1], b[0], b[1]
        s1, e1, s2, e2 = (s, e), (s, (e + 1) % 6), (u, (f + 1) % 6), (u, f)
        if sameClass(P, s1, s2):
            P = mergeClass(P, e1, e2)
        elif sameClass(P, e1, e2):
            P = mergeClass(P, s1, s2)
    return P


def propagateN(t, T, n, P):
    for _ in range(n):
        P = propagate1(t, T, P)
    return P


def refines(K, A):
    return all(sameClass(K, x, y) for c in A for x in c for y in c)


def nonGammaTypes(t):
    return [T for T in ALL_TYPES if all(hasChild(t, T, s) for s in ALL_SLOTS)]


def scStart(t):
    ng = nonGammaTypes(t)
    return [((a, c), (b, d)) for a in ng for b in ng for c in ALL_EDGES for d in ALL_EDGES if CT(t, a, c) == CT(t, b, d)]


def scRefine(t, S):
    Sset = set(S)
    out = []
    for p in S:
        (a, c), (b, d) = p
        s, e = CT(t, a, c)
        if ((child(t, a, s), e), (child(t, b, s), e)) in Sset:
            out.append(p)
    return out


def sameCorner(t):
    S = scStart(t)
    for _ in range(20):
        S = scRefine(t, S)
    return S


def sameCornerClosed(t):
    return scRefine(t, sameCorner(t)) == sameCorner(t)


def sameCornerBase(t, corners1):
    return all(corners1[a][c] == corners1[b][d] for (a, c), (b, d) in sameCorner(t))


def transferSeeds(t, T):
    if all(hasChild(t, T, s) for s in ALL_SLOTS):
        return []
    sc = set(sameCorner(t))
    out = []
    for P in nonGammaTypes(t):
        for cls in cornerClasses(t, P):
            here = [(sp, c) for sp in [q[0] for q in cls] for c in ALL_EDGES if hasChild(t, T, sp)
                    and any(q[0] == sp and ((child(t, T, sp), c), (child(t, P, sp), q[1])) in sc for q in cls)]
            if here:
                out += [(here[0], h) for h in here[1:]]
    return out


def c3_ok(t, Qt):
    for T in ALL_TYPES:
        seedsT = chainSeeds(t, Qt, T)
        if seedsT is None:
            return False
        A = cornerClasses(t, T)
        if not all(sameClass(A, x, y) for (x, y) in seedsT):
            return False
        K = initialClasses(t, T)
        for (x, y) in seedsT + transferSeeds(t, T):
            K = mergeClass(K, x, y)
        K = propagateN(t, T, 20, K)
        if not refines(K, A):
            return False
    return True


# C4
def gluedTo(t, T, x):
    for gp in t["G"][T]:
        if gp[0] == x:
            return gp[1]
        if gp[1] == x:
            return gp[0]
    return None


def pairLess(x, y):
    return x[0] < y[0] or (x[0] == y[0] and x[1] < y[1])


def edgeNode(t, T, x):
    y = gluedTo(t, T, x)
    if y is None:
        return x
    return y if pairLess(y, x) else x


def cornerEdges(t, T, x):
    return [edgeNode(t, T, (x[0], (x[1] + 5) % 6)), edgeNode(t, T, (x[0], x[1]))]


def linkOk(t, T, cls):
    nodes = remdups([n for x in cls for n in cornerEdges(t, T, x)])

    def deg(n):
        return len([x for x in cls if n in cornerEdges(t, T, x)])
    ends = [n for n in nodes if deg(n) == 1]

    def adj(n):
        return [m for x in cls if n in cornerEdges(t, T, x) for m in cornerEdges(t, T, x) if m != n]
    reach = [nodes[0]]
    for _ in range(len(cls)):
        reach = remdups(reach + [m for n in reach for m in adj(n)])
    return (all(deg(n) <= 2 for n in nodes) and len(ends) in (0, 2)
            and all(gluedTo(t, T, n) is None for n in ends)
            and len(nodes) == len(cls) + (0 if not ends else 1)
            and set(nodes) <= set(reach))


def connectedChildren(t, T):
    ss = slotsOf(t, T)

    def adj(s):
        return remdups([b[0] for a, b in t["G"][T] if a[0] == s] + [a[0] for a, b in t["G"][T] if b[0] == s])
    reach = [ss[0]]
    for _ in range(8):
        reach = remdups(reach + [m for s in reach for m in adj(s)])
    return set(ss) <= set(reach)


def c4_ok(t):
    for T in ALL_TYPES:
        nF = len(slotsOf(t, T))
        nE = len(t["G"][T]) + len(edgesInB(t, T))
        P = cornerClasses(t, T)
        if len(P) - nE + nF != 1 or not connectedChildren(t, T) or not all(linkOk(t, T, cls) for cls in P):
            return False
    return True


# C5
def flOf(L):
    return [[(w[0], w[-1]) for w in ws] for ws in L]


def flStep(t, st):
    out = []
    for T in ALL_TYPES:
        row = []
        for arc in t["B"][T]:
            f, l = arc[0], arc[-1]
            row.append((dapply(phi(t, f[0]), st[child(t, T, f[0])][f[1]][1]),
                        dapply(phi(t, l[0]), st[child(t, T, l[0])][l[1]][0])))
        out.append(row)
    return out


def turnAt(st, T, c):
    d = (st[T][c][0] - st[T][(c + 5) % 6][1]) % 12
    return d - 12 if d > 6 else d


def isCycleClass(t, T, cls):
    nodes = remdups([n for x in cls for n in cornerEdges(t, T, x)])
    return all(len([x for x in cls if n in cornerEdges(t, T, x)]) == 2 for n in nodes)


def parentCornerOf(t, T, cls):
    for j in ALL_EDGES:
        if CT(t, T, j) in cls:
            return j
    return None


def anglesOk(t, st):
    nxt = flStep(t, st)
    for T in ALL_TYPES:
        for cls in cornerClasses(t, T):
            n = len(cls)
            turns = [turnAt(st, child(t, T, x[0]), x[1]) for x in cls]
            if any(tt == 6 for tt in turns):
                return False
            tot = sum(turns)
            if isCycleClass(t, T, cls):
                if tot != 6 * (n - 2):
                    return False
            else:
                if not (tot > 6 * (n - 2) and tot < 6 * n):
                    return False
                j = parentCornerOf(t, T, cls)
                if j is not None and turnAt(nxt, T, j) != tot - 6 * (n - 1):
                    return False
    return True


# C6
def neededBase(t):
    out = []
    for P in ALL_TYPES:
        for s in ALL_SLOTS:
            if hasChild(t, P, s) and s >= 1 and hasChild(t, P, s - 1):
                out.append((child(t, P, s), T_TO[s - 1]))
            if hasChild(t, P, s) and s <= 6 and hasChild(t, P, s + 1):
                out.append((child(t, P, s), T_FROM[s]))
    return remdups(out)


def neededStep(t, N):
    return remdups(N + [(child(t, P, SUPERQUAD[i][0]), SUPERQUAD[i][1]) for P in ALL_TYPES for i in range(4) if (P, i) in N])


def needed(t):
    N = neededBase(t)
    for _ in range(10):
        N = neededStep(t, N)
    return N


def c6_ok(t, Qt):
    N = needed(t)
    if not all(qc(Qt, T, i) >= 0 for (T, i) in N):
        return False
    for (T, i) in N:
        s, j = SUPERQUAD[i]
        cj = qc(Qt, child(t, T, s), j)
        A = cornerClasses(t, T)
        if cj < 0 or not sameClass(A, (s, cj), CT(t, T, qc(Qt, T, i))):
            return False
    return True


# C7
def exposed(t, T, ex, addr):
    for s in addr:
        ex = remdups([p[1] for j in ex for p in t["B"][T][j] if p[0] == s])
        T = child(t, T, s)
    return ex


def buried(t, T, addr):
    return exposed(t, T, list(ALL_EDGES), addr) == []


# routing
def dotsStep(t, D):
    return [[sum(D[child(t, T, s)][e] for (s, e) in arc) for arc in t["B"][T]] for T in ALL_TYPES]


def countsOf(P):
    return [[sum(1 for b in w if b) for w in ws] for ws in P]


def ndots(D, T, e):
    return D[T][e]


def dotIndex(D, T, e, i):
    return sum(ndots(D, T, j) for j in range(e)) + i


def outerNodes(t, D, T):
    out = []
    for (s, e) in edgesInB(t, T):
        n = ndots(D, child(t, T, s), e)
        out += [(s, dotIndex(D, child(t, T, s), e, n - 1 - i)) for i in range(n)]
    return out


def linkEdges(t, D, S, T):
    E = [((s, a), (s, b)) for s in slotsOf(t, T) for (a, b) in S[child(t, T, s)][0]]
    for (a, b) in t["G"][T]:
        s, e, u, f = a[0], a[1], b[0], b[1]
        n = ndots(D, child(t, T, s), e)
        E += [((s, dotIndex(D, child(t, T, s), e, i)), (u, dotIndex(D, child(t, T, u), f, n - 1 - i))) for i in range(n)]
    return E


def neighbours(E, x):
    return [ed[1] if ed[0] == x else ed[0] for ed in E if ed[0] == x or ed[1] == x]


def walk(E, outer, fuel, prev, cur, acc):
    while True:
        if fuel == 0:
            return list(reversed([cur] + acc))
        if cur in outer and acc:
            return list(reversed([cur] + acc))
        nxt = [y for y in neighbours(E, cur) if y != prev]
        if not nxt:
            return list(reversed([cur] + acc))
        fuel -= 1
        prev, cur, acc = cur, nxt[0], [cur] + acc


def arcFrom(E, outer, x):
    return walk(E, outer, 2 * len(E) + 2, x, x, [])


def indexOf(xs, x):
    return xs.index(x) if x in xs else len(xs)


def degreesOk(E, outer):
    nodes = remdups([n for ed in E for n in ed])
    return all(len(neighbours(E, x)) == (1 if x in outer else 2) for x in nodes)


def Fpairs(E, outer):
    out = []
    for x in outer:
        y = arcFrom(E, outer, x)[-1]
        out.append((min(indexOf(outer, x), indexOf(outer, y)), max(indexOf(outer, x), indexOf(outer, y))))
    return remdups(out)


def onArcs(E, outer):
    return [n for x in outer for n in arcFrom(E, outer, x)]


def newCircuits(E, outer):
    nodes = remdups([n for ed in E for n in ed])
    on = set(onArcs(E, outer))
    rest = [x for x in nodes if x not in on]
    return len([x for x in rest if all(not pairLess(y, x) for y in walk(E, [], 2 * len(E) + 2, x, x, []))])


def Fstep(t, D, S):
    out = []
    for T in ALL_TYPES:
        E = linkEdges(t, D, S, T)
        outer = outerNodes(t, D, T)
        out.append((Fpairs(E, outer), sum(S[child(t, T, s)][1] for s in slotsOf(t, T)) + newCircuits(E, outer)))
    return out


def degreesAllOk(t, D, S):
    return all(degreesOk(linkEdges(t, D, S, T), outerNodes(t, D, T)) for T in ALL_TYPES)


def Phi(t, x):
    return (dotsStep(t, x[0]), Fstep(t, x[0], x[1]))


def orbit(t, x, k):
    for _ in range(k):
        x = Phi(t, x)
    return x


def state1(P, S):
    return (countsOf(P), [(ps, 0) for ps in S])


def zeroCircuits(x):
    return all(x[1][T][1] == 0 for T in ALL_TYPES)


def psiOneArc(x):
    return x[1][8][0] == [(0, 1)]


def dotCounts(D):
    return [sum(ndots(D, T, e) for e in ALL_EDGES) for T in ALL_TYPES]


def run(thy, prefix, zl):
    d = load(thy, prefix)
    t = table(d)
    fails = []

    def check(name, ok):
        print(f"  [{'OK' if ok else 'FAIL'}] {name}")
        if not ok:
            fails.append(name)
    print(f"== {thy}")
    check("c1_ok", c1_ok(t))
    check("ctChains", ctChains(t))
    check("validL", validL(t))
    check("validData dir1", validData(d["dir1"]))
    S = closureIter(t, 5, seeds(t))
    check(f"closedSet (closure has {len(S)} statements)", closedSet(t, S))
    W1 = wordsOf(d["dir1"])
    check("base holds (directions)", all(holds(W1, c) for c in S))
    L1 = wordsOf([[[tuple(l) for l in w] for w in ws] for ws in d["lab1"]])
    check(f"base holdsL zl={zl} (labels)", all(holdsL(zl, L1, c) for c in S))
    check("seeds in closure", set(seeds(t)) <= set(S))
    check("sameCornerClosed", sameCornerClosed(t))
    check("sameCornerBase", sameCornerBase(t, d["corners1"]))
    check("c3_ok Q", c3_ok(t, d["Q"]))
    check("c3_ok Q1", c3_ok(t, d["Q1"]))
    check("c4_ok", c4_ok(t))
    fl = flOf(d["dir1"])
    check("flStep period 2", flStep(t, flStep(t, fl)) == fl)
    check("anglesOk level 1", anglesOk(t, fl))
    check("anglesOk level 2", anglesOk(t, flStep(t, fl)))
    check("c6_ok", c6_ok(t, d["Q"]))
    check("buried 0.0.5.0", buried(t, 8, [0, 0, 5, 0]))
    check("not buried 0.0.5", not buried(t, 8, [0, 0, 5]))
    x1 = state1(d["dots1"], [[tuple(p) for p in ps] for ps in d["state1"]])
    check("degreesAllOk level 1", degreesAllOk(t, x1[0], x1[1]))
    x2 = orbit(t, x1, 1)
    check("degreesAllOk level 2", degreesAllOk(t, x2[0], x2[1]))
    check("orbit period 2", orbit(t, x1, 2) == x1)
    check("zeroCircuits 1,2", zeroCircuits(x1) and zeroCircuits(x2))
    check("psiOneArc 1,2", psiOneArc(x1) and psiOneArc(x2))
    check("dotCounts", dotCounts(x1[0]) == [10, 8, 6, 6, 4, 4, 10, 4, 2] and dotCounts(x2[0]) == [10, 8, 6, 6, 4, 4, 10, 4, 2])
    print(f"  level-2 states: {[ps for ps, _ in x2[1]]}")
    return fails


if __name__ == "__main__":
    fails = run("FASS_Data_Hex.thy", "fass_data_hex_", 1) + run("FASS_Data_Spectre.thy", "fass_data_spectre_", 2)
    print("ALL EVAL STATEMENTS TRUE" if not fails else f"FAILED: {fails}")
    sys.exit(1 if fails else 0)
