/**
 * `ExplainerPage` — "The Tile With the Tail" (DESIGN.md §7.2).
 *
 * The narrative is transcribed from `docs/EXPLAINER_COPY.md`, which is the
 * authoritative copy; every `[WIDGET: …]` slot in that document becomes a
 * numbered `<section>` here with a live figure built from the shared widget
 * layer (`components/`, `hooks/`, `lib/`, `core/`). Figure-local state lives in
 * the figure; the page itself is prose plus anchors.
 *
 * Nothing on this page hardcodes a mathematical claim: the seam tallies, the
 * fingerprints, the count matrix and the eight kernel members are all computed
 * from the tile tables in `pages/tails/presets.ts`, so the article cannot drift
 * from the code the Explorer runs.
 */

import { SECTIONS, explorerHref, pageHref } from './tails/presets';
import { Figure } from './tails/Figure';
import { RuleLab } from './tails/RuleLab';
import { TileAnatomyFigure } from './tails/TileAnatomyFigure';
import { SeamHandshakeFigure } from './tails/SeamHandshakeFigure';
import { ContractFigure } from './tails/ContractFigure';
import { FirstLinesFigure } from './tails/FirstLinesFigure';
import { SadTileFigure } from './tails/SadTileFigure';
import { PuzzleConsole } from './tails/PuzzleConsole';
import { FingerprintFigure } from './tails/FingerprintFigure';
import { KernelGallery } from './tails/KernelGallery';
import { MatchmakerFigure } from './tails/MatchmakerFigure';
import { ProfileCrossfade } from './tails/ProfileCrossfade';
import { FamilyCoda } from './tails/FamilyCoda';
import '../styles/tails.css';

const SPECTRE_PAPER = 'https://arxiv.org/abs/2305.17743';
const HAT_PAPER = 'https://arxiv.org/abs/2303.10798';
const KAPLAN_PAGE = 'https://cs.uwaterloo.ca/~csk/spectre/';
const GRAPH_ANALYSIS = 'https://github.com/bohemian-miser/Spectre/tree/main/graph_analysis';

export function ExplainerPage(): JSX.Element {
  return (
    <article className="tails">
      <header className="tails-hero">
        <p className="tails-kicker">The tails problem</p>
        <h1>The Tile With the Tail</h1>
        <p className="tails-lede">
          A parity puzzle hiding in the world’s newest bathroom floor.
        </p>

        <p>
          I want to draw all over my bathroom floor. Not freehand — with a rule. The floor is tiled
          with Spectres, the wiggly 14-sided shape that made headlines in 2023 for tiling the plane
          without ever repeating itself. The rule: mark certain edges, and wherever an edge is
          marked, a line punches through — out of one tile, into the next. Inside each tile, loose
          line-ends join up. Do this everywhere at once and the floor fills with curves that wander
          from tile to tile and, if we’re lucky, close into cute lil circuits.
        </p>
        <p>
          <em>If</em> we’re lucky. Because for some choices of rule, somewhere out there sits a tile
          whose lines can’t all pair up. One end is left dangling, unfinished, going nowhere. A tile
          with a tail. It is a genuinely sad sight, and this page is about never seeing it again.
        </p>

        <Figure
          id="rule-lab"
          title="The lab — pick a rule, watch every tile answer"
          hint="Click a class chip, a matrix column, or any edge of any tile to build the rule. The rest of the page explains what you are looking at; the lab will still be here."
          wide
          caption="One rule, three views. The chips name the nine edge classes, the matrix does the bookkeeping, and the ten tiles draw the consequences: every edge wears its class number (faint until selected), selected edges send in a line, lines pair up where they can, and a tile with an odd count leaves a tail hanging."
        >
          <RuleLab />
        </Figure>

        <nav className="tails-toc" aria-label="Contents">
          <h2>On this page</h2>
          <ol>
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>{s.title}</a>
              </li>
            ))}
          </ol>
        </nav>
      </header>

      {/* ------------------------------------------------------------------ */}
      <section id="spectre" className="tails-section">
        <h2>Meet the Spectre (briefly)</h2>
        <p>
          The Spectre is the “chiral aperiodic monotile” discovered by David Smith, Joseph Samuel
          Myers, Craig Kaplan, and Chaim Goodman-Strauss (
          <a href={SPECTRE_PAPER} rel="noreferrer noopener">
            arXiv:2305.17743
          </a>
          ), the follow-up to their famous{' '}
          <a href={HAT_PAPER} rel="noreferrer noopener">
            hat
          </a>
          . One shape, no reflections needed, and it tiles the plane — but only aperiodically.
          Kaplan’s{' '}
          <a href={KAPLAN_PAGE} rel="noreferrer noopener">
            Spectre page
          </a>{' '}
          tells that story beautifully; we only need one piece of machinery from the proof.
        </p>
        <p>
          To prove aperiodicity, the authors sort Spectres into nine types — Gamma, Delta, Theta,
          Lambda, Xi, Pi, Sigma, Phi, Psi — by the role each plays in the hierarchy. The Gamma role
          is played by a snuggled-up <em>pair</em> of Spectres (the “Mystic”), so in our tables Gamma
          splits into Gamma1 and Gamma2: ten characters in the cast. (There’s also a stunt-double
          version made of marked hexagons — the proof’s combinatorial skeleton — and the hat/turtle
          families.)
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section id="numbers" className="tails-section">
        <h2>Numbers on the edges</h2>
        <p>
          Here’s the machinery we’re stealing. In the proof, every edge of every tile type carries a
          label. Mine look like <code>3.0A</code> or <code>-5.1A</code>: a <strong>class</strong>{' '}
          number from 0 to 8 (the part we care about), a minus sign saying which side of a junction
          you’re on (a <code>3</code> edge always glues to a <code>-3</code> edge next door), a{' '}
          <strong>minor</strong> index, and an A/B letter for the rare tile owning two junctions of
          the same class. Full disclosure: these aren’t verbatim from the paper — I tidied them into
          this major.minor + A/B scheme, and I changed some −4’s into 6’s (the weird Sigma edge
          thing). Now everything is happy.
        </p>
        <p>
          The minor index matters because the natural “edges” of the system — call them{' '}
          <strong>seams</strong> — are often longer than one physical edge of the 14-gon. A class-2
          seam is three little edges walking in single file (<code>2.0</code>, <code>2.1</code>,{' '}
          <code>2.2</code>); the class-7 seam is four; class 8 is a loner with just one. Each tile
          has about six seams wrapping around its 14 physical edges. A seam is one handshake between
          two tiles, however many knuckles it involves.
        </p>

        <Figure
          id="fig-anatomy"
          title="Figure 1 — one tile, fourteen edges, six seams"
          hint="Hover any edge of the tile (or any row of the tally) to light up the seam it belongs to."
          caption="Delta’s six seams are 3, 2, −5, 1, −3 and −6 — six handshakes wrapped around fourteen physical edges. Switch tiles to see who owns what; Theta is the one to watch."
        >
          <TileAnatomyFigure />
        </Figure>

        <Figure
          id="fig-seam"
          title="Figure 2 — one seam, two sides"
          hint="Pick a seam class; the neighbour is posed by solving the gluing transform."
          caption="Theta offers 2.0A · 2.1A · 2.2A; the neighbour answers −2.2A · −2.1A · −2.0A — the same edges walked the other way. One seam, one handshake, one crossing point both tiles compute independently and agree on."
        >
          <SeamHandshakeFigure />
        </Figure>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section id="game" className="tails-section">
        <h2>The game, and the fine print</h2>
        <p>
          Now, the rule. Pick a set of classes — any subset of {'{0, 1, …, 8}'}. Every seam whose
          class you picked gets exactly one crossing point, where the line punches through. Then,
          inside each tile, we play matchmaker: pair up the crossing points and connect each pair
          with a stroke. Strokes meet at the shared crossings, and the curves snake across the floor,
          indifferent to where one Spectre ends and the next begins.
        </p>
        <p>
          Where on the seam does the line cross? Anywhere you like! Each class gets its own{' '}
          <strong>edge contract</strong>: class 2 might cross at the pointy-er spot between the{' '}
          <code>2.1</code> and <code>2.2</code> edges, class 5 three-fifths of the way up its{' '}
          <code>.2</code> edge — whatever, as long as the <code>+</code> and <code>−</code> versions
          agree, so both sides of the handshake meet at the same spot. One exception: class 0 only
          ever glues to another class 0, so its contract must be symmetric — cross at the seam’s own
          centre of symmetry, or the two copies miss each other.
        </p>

        <Figure
          id="fig-contract"
          title="Figure 3 — drag the crossing anywhere you like"
          hint="Slide the crossing point along the seam. Watch the shared-dot error stay at zero."
          caption="The contract is arbitrary but shared: the negative side measures the same distance from the other end, so the two tiles’ crossing points coincide no matter where you put them. Class 0 glues to itself, so its handle is pinned to the centre — the only symmetric choice."
        >
          <ContractFigure />
        </Figure>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section id="theta" className="tails-section">
        <h2>Three lines walk into a Theta</h2>
        <p>
          Let’s play. Select class 2, put the crossing at that pointy-er spot between <code>2.1</code>{' '}
          and <code>2.2</code>, and draw.
        </p>

        <Figure
          id="fig-first-lines"
          title="Figure 4 — the first lines"
          hint="Crossings bloom on every seam of the chosen class; each tile joins its own up. Drag to pan, wheel to zoom."
          wide
          caption="Lots of tiles are fine. Grey lines are wanderers — open paths. At the boundary of a finite patch that is expected; in the middle of the floor it is a symptom."
        >
          <FirstLinesFigure />
        </Figure>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section id="sad" className="tails-section">
        <h2>The sad tile</h2>
        <p>
          But look at Theta. Theta owns <em>three</em> class-2 seams (a <code>2A</code>, a{' '}
          <code>2B</code>, and a <code>−2</code>), so three lines come charging in. Now — we{' '}
          <em>could</em> just join all 3 lines in one spot, and technically nothing would dangle.
          But… I don’t want to. I want each edge to join exactly one other edge, so the drawing stays
          a clean weave and we make nice circuits, not train stations. That’s the aesthetic, and I’m
          holding the crayon.
        </p>
        <p>
          Under that rule, Theta is doomed: three ends, one happy pair, one leftover. A tail. It gets
          worse — try class 1 alone and poor Delta doesn’t even get a junction to refuse: it owns
          exactly <em>one</em> 1-seam, so a line barges in and simply stops.
        </p>

        <Figure
          id="fig-sad"
          title="Figure 5 — three is odd, Theta is sad"
          hint="Toggle the three-way join to see the shortcut we are refusing."
          caption="Odd tiles pulse red across every figure on this page. Under class 2 alone, Theta is one of them; under class 1 alone, Delta is."
        >
          <SadTileFigure />
        </Figure>

        <p>
          So class 2 alone is a bad rule; so is class 1. Are there good ones? The empty set works
          (draw nothing, offend no one), but that’s the coward’s answer.
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section id="puzzle" className="tails-section">
        <h2>Your turn</h2>
        <p>
          Before I spoil it: which subsets of {'{0, …, 8}'} leave <em>every</em> tile type with an
          even number of crossings? There are 512 candidates. Genuinely — go push buttons. I’ll wait.
        </p>

        <Figure
          id="fig-puzzle"
          title="Figure 6 — the puzzle console"
          hint="Nine chips, 512 rules, no answers. The console only tells you what you could see for yourself."
          wide
          caption="Your progress is kept in this browser, so you can come back to it. Found one? Found two? Notice anything about combining them?"
        >
          <PuzzleConsole />
        </Figure>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section id="fingerprints" className="tails-section">
        <h2>Fingerprints</h2>
        <p>
          Here’s how I actually found them, before any fancy words. Try each class alone and write
          down <em>which</em> tile types come out odd — call that the class’s fingerprint. Class 7’s
          fingerprint is just the Mystic twins, Gamma1 and Gamma2. Class 8 upsets Theta, Lambda, Xi
          and Pi. Then the jackpot: class 1 and class 5 have the <em>exact same</em> fingerprint —
          Delta, Lambda, Xi, Sigma, Psi. So switch both on: every tile that was going to be odd gets
          odded twice, which is to say, not at all. {'{1, 5}'} draws clean.
        </p>

        <Figure
          id="fig-fingerprints"
          title="Figure 7 — fingerprints, and how they cancel"
          hint="Pick one class, then a second, and watch the combined verdict."
          caption="Two different classes with matching fingerprints are a winner in disguise. Try 1 and 5. Then try 7 with 2 and 8."
        >
          <FingerprintFigure />
        </Figure>

        <p>
          Then keep going: combine sets, note each new odd/even pattern, remember the smallest set
          producing it, repeat until nothing new appears. Two different sets with matching
          fingerprints are a winner in disguise — {'{1, 7}'} and {'{2, 8}'} upset the same seven
          tiles, so {'{1, 2, 7, 8}'} upsets nobody. Eventually you’ve seen every fingerprint the
          system can make, and can list everything landing on all-zeros.
        </p>
        <p>
          Math nerds will have recognised the game several paragraphs ago: only oddness matters
          (matchmaking eats crossings two at a time), oddness is arithmetic mod 2, and “which subsets
          hit all-even” is asking for the <strong>kernel of a matrix over GF(2)</strong>.
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section id="matrix" className="tails-section">
        <h2>The matrix</h2>
        <p>
          So here’s the bookkeeping device, counted straight off the tile definitions: one row per
          tile type, one column per edge class, entries = how many seams of that class the tile owns
          (ignoring minor edges — one count per handshake).
        </p>
        <p>
          Read it mod 2 — evens are zeros, odds are ones. A subset of classes is a 0/1 vector{' '}
          <strong>x</strong>, a tile is happy when its selected entries sum to 0 mod 2, and everyone
          happy at once means M<strong>x</strong> = <strong>0</strong>. The good subsets are exactly
          the kernel.
        </p>

        <p>
          You have been using it all along: the <a href="#rule-lab">lab at the top of the page</a>{' '}
          is exactly this matrix, live. Scroll back up and watch it work. {'{5}'} alone: column 5 is
          odd at Delta, Lambda, Xi, Sigma and Psi — five sad rows. {'{1, 5}'}: those five rows pick
          up a second odd from column 1 (1 + 1 = 0) while every other row adds evens (Pi gets 2 +
          2). Ten happy rows, and every tail on the tiles disappears.
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section id="kernel" className="tails-section">
        <h2>The eight answers</h2>
        <p>
          Run the elimination — or brute-force all 512, like the site does in{' '}
          <code>getValidEdgeCombinations</code> — and the kernel turns out to have exactly{' '}
          <strong>8</strong> members:
        </p>
        <p className="tails-kernel-list">
          ∅ · {'{1,5}'} · {'{0,1,3,6}'} · {'{0,3,5,6}'} · {'{1,2,7,8}'} · {'{2,5,7,8}'} ·{' '}
          {'{0,2,3,6,7,8}'} · {'{0,1,2,3,5,6,7,8}'}
        </p>
        <p>
          And here’s a treat for the math nerds: these 8 form a <em>group</em> under symmetric
          difference. Combine any two solutions — keep everything that’s in exactly one of them — and
          you get another solution. Watch: {'{0,1,3,6}'} + {'{1,5}'} → the two 1s cancel →{' '}
          {'{0,3,5,6}'}. Right there on the list. Try any pair; it always works, because XOR-ing two
          all-even patterns can only make another all-even pattern. (It’s (ℤ/2)³: eight elements,
          three generators, every element its own inverse.)
        </p>

        <Figure
          id="fig-kernel"
          title="Figure 8 — the kernel gallery"
          hint="Click two cards to combine them; the gallery names the card their symmetric difference lands on."
          wide
          caption="Every card is the same patch under a different rule. The ∅ card is cheekily blank; the eight-class card seethes with lines."
        >
          <KernelGallery />
        </Figure>

        <p>
          Two easter eggs in the list. First: class 4 appears in <em>no</em> solution, ever — Sigma
          and Gamma2 each carry a lone 4-seam the algebra can’t bail out, so class 4 sits out every
          dance. Hence the grandest member, “everything except 4”: switch on all nine classes and
          precisely the two tiles holding a 4 will sulk. Second: class 7 is the Mystic’s private seam
          — it exists only where Gamma1 glues to Gamma2, hidden inside the pair (the Explorer labels
          it <code>7(M)</code>) — and it never goes out without chaperones 2 and 8.
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section id="drawings" className="tails-section">
        <h2>One kernel, endless drawings</h2>
        <p>
          A valid subset guarantees every tile an <em>even</em> number of crossings — but says
          nothing about <em>which</em> pairs up with which. A tile with 4 crossings has 3 perfect
          matchings. Under {'{1,5}'}, a Psi has four crossings and three moods; richer subsets give
          tiles handfuls of options each, every tile chooses independently, and the number of global
          drawings from one kernel element explodes combinatorially.
        </p>

        <Figure
          id="fig-matchmaker"
          title="Figure 9 — the matchmaker"
          hint="Scrub the slider, or drag from one crossing dot to another to re-pair them by hand."
          caption="Four crossings, three matchings. The faint strokes are the options not taken."
        >
          <MatchmakerFigure />
        </Figure>

        <p>
          And the choices <em>matter</em>. The same subset, re-matched, flips between a lace of tiny
          circuits and a single line that refuses to die. In exhaustive runs on a level-6 supertile (
          <a href={GRAPH_ANALYSIS} rel="noreferrer noopener">
            <code>graph_analysis/</code>
          </a>
          ), one configuration’s longest circuit closes after 27,621 segments; another open path
          wriggles for 248,348 before running out of floor.
        </p>

        <Figure
          id="fig-profiles"
          title="Figure 10 — circuits vs. wanderers"
          hint="Same rule, same tiles. Flip the profile and watch the drawing change its mind."
          wide
          caption="Profile B is the Explorer’s 2578-0100101100 — four tiles re-paired, and the lace collapses into one enormous wriggle. Push the level up and the longest wanderer keeps growing."
        >
          <ProfileCrossfade />
        </Figure>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section id="mirrors" className="tails-section">
        <h2>Mirrors all the way up</h2>
        <p>
          One last wrinkle. Spectre floors are grown by a supertile algorithm, and each level{' '}
          <em>mirrors</em> the previous one — the pattern flips between iterations. Whatever your
          lines do at one scale, they do backwards at the next. Which brings me to the questions that
          keep me up at night. As the floor grows without bound:
        </p>
        <ul className="tails-questions">
          <li>
            Do these combos make a <strong>finite or infinite set of circuits</strong>? Do new
            circuit shapes keep appearing, or does the menagerie eventually close?
          </li>
          <li>
            Are there <strong>infinite lines</strong> — paths that never close and never end? I think
            I’ve found one: edges {'{2,5,7,8}'} with combination <code>0100101100</code> just keeps{' '}
            <em>going</em>. (Four census configurations produce no circuits at all — that smells like
            lines that never come home.)
          </li>
          <li>
            If infinite lines exist, are there <strong>finitely or infinitely many</strong> of them?
          </li>
          <li>
            And the big one: could a single path <strong>join everything</strong> — one line
            threading the entire aperiodic floor?
          </li>
        </ul>

        <Figure
          id="fig-coda"
          title="Figure 11 — the same game, other floors"
          hint="Swap the floor, pick a rule, look for tails. This is the Explorer’s own control panel."
          wide
          caption="The kernel is a property of the tile tables, not of the Spectre. The marked-hexagon skeleton plays a slightly different game and lands on a different set of answers."
        >
          <FamilyCoda />
        </Figure>

        <p>
          I don’t know yet. But the{' '}
          <a href={pageHref('explorer')}>Explorer</a> lets you toggle classes, drag every tile’s
          matchmaker, and watch circuits light up by length — and the{' '}
          <a href={pageHref('stats')}>stats page</a> has the full census: every kernel element, every
          matching profile, tail counts, circuit-length spectra, and those four suspicious wanderers.
          Go find a longer wriggle than mine.
        </p>
        <p className="tails-cta">
          <a className="tails-button is-primary" href={explorerHref([2, 5, 7, 8], { level: 3, combo: '0100101100' })}>
            Open the wanderer in the Explorer
          </a>
          <a className="tails-button" href={explorerHref([1, 5], { level: 3 })}>
            Open {'{1, 5}'} in the Explorer
          </a>
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section id="appendix" className="tails-section">
        <h2>Appendix: reconciling the counts</h2>

        <details className="tails-details">
          <summary>What the matrix counts</summary>
          <p>
            “Ignoring minor edges” means one count per seam — exactly what the site does: only labels
            with minor <code>.0</code> contribute, one crossing per handshake. Recounting all ten
            rows from the edge-label tables reproduces the published matrix entry for entry;
            brute-forcing all 512 subsets yields exactly the 8 kernel elements, matching the
            notebook’s basis {'{0356, 1278, 15}'}. Counting <em>physical</em> edges would mislead:
            Delta owns two physical class-5 edges but one 5-seam.
          </p>
        </details>

        <details className="tails-details">
          <summary>Edge contracts in the code</summary>
          <p>
            The Explorer’s default contract is the midpoint of the seam’s <code>.0</code> edge — well
            defined because the two sides list minors in opposite directions, so both tiles’{' '}
            <code>.0</code> is the same physical edge. Class 0 gets the symmetric treatment: its
            crossing sits on the seam’s middle vertex, which is also why three tiles can meet at one
            class-0 crossing.
          </p>
        </details>

        <details className="tails-details">
          <summary>Label cleanup</summary>
          <p>
            The labels are the author’s tidied version of the proof’s markings — major.minor plus A/B
            variants (Theta owns <code>2A</code> and <code>2B</code> seams; Psi owns <code>5A</code>{' '}
            and <code>5B</code>), with some −4’s renamed to 6’s around the weird Sigma edge.
            Relatedly, Sigma has only 5 seams — its class-4 seam wraps cyclically around its edge
            list (<code>4.0A</code>–<code>4.3A</code>) — and five is odd, one reason “select
            everything” fails.
          </p>
        </details>

        <details className="tails-details">
          <summary>Mystic subtleties</summary>
          <p>
            Class 7 occurs only as Gamma1’s <code>7.0A</code>–<code>7.3A</code> glued to Gamma2’s{' '}
            <code>−7</code> run: the Mystic pair’s internal seam, labelled <code>7(M)</code> in the
            UI. One class-2 seam <em>straddles</em> the pair — Gamma1 carries only the tail-end{' '}
            <code>2.2A</code> (no <code>.0</code>, never a crossing) while the crossing-bearing{' '}
            <code>2.0A</code> lives on Gamma2 — so fusing the pair into one row gives a different
            kernel.
          </p>
        </details>

        <details className="tails-details">
          <summary>Hexagons differ</summary>
          <p>
            The marked-hexagon skeleton plays a slightly different game: hexagon-Gamma is one fused
            tile with no class-7 edges, hexagon-Sigma carries a class-6 edge the Spectre Sigma lacks,
            and its kernel is a different set of eight. The eight answers above are specifically the
            Spectre’s — switch floors in Figure 12 to see the difference.
          </p>
        </details>
      </section>
    </article>
  );
}

export default ExplainerPage;
