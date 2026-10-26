# Working on this repository

## Vocabulary

Use the site's own words in prose, code and docs. When porting someone
else's idea, credit the source with one link and write the rest in these
terms; never adopt their notation.

- Tile types by name: Gamma, Delta, Theta, Lambda, Xi, Pi, Sigma, Phi, Psi
  (Gamma1 and Gamma2 on the Spectre). Never single letters.
- A **supertile** at a **level**; its **children** sit in numbered **slots**
  (0 to 7); a type's **substitution rule** lists the child type per slot.
- A tile's position is its **slot path** from the root, written `1.7.0`, the
  id the rest of the site uses.
- **Edge**, **seam**, **class** (0 to 8) and **crossing** as on the Explorer.
  A **rule** is a set of classes (`023468`); a **combination** is one digit
  per type choosing a non-crossing pairing (`111000100`).
- **Strand**, **circuit**, **open strand** (one that leaves the patch).

## Writing

Write for a reader who was not in the conversation. The request is the
brief, not material: do not quote it, paraphrase it, name the audience it
described, or react to it. "Explain it for someone who knows linear
algebra" sets the level; it never appears in the output.

Patterns to remove before committing:

- Adjectives from the request used as labels: a heading, identifier or
  comment called clean, generic, robust, comprehensive, seamless, modular.
  Satisfy the constraint silently and name the thing what it is.
- Marketing or security superlatives (bulletproof, airtight, tamper-proof)
  for things that are deterministic, reproducible or checked.
- Echoing the request or a correction back: restating what was asked,
  turning a conversational correction into a bolded bullet heading,
  "you may be thinking…", "yes, it is a…".
- Throat-clearing: explaining the reader's own project back to them, "this
  page covers…", "think of it as", "the key insight is", "in other words",
  "simply put", "let's".
- Asides or boxes that say the previous paragraph again in a second
  register, including ones addressed to a hypothetical reader.
- Session history in docs: what an earlier draft did, which idea was
  discarded, what the workspace used to contain. State the design.
- Box-drawing diagrams in text where a short code block or tree would do.
- Link text cluttered with paths, line numbers or ids; keep those in the
  URL and link plain words.
- Analogies that are not then used. One analogy, used once, is enough.
- Exclamation marks, rhetorical questions, "of course".
- Numbers in prose the reader cannot act on; put them in a table.
- Answering every reviewer question inside the document. The original
  request is the spec; park design questions as open questions or drop them.

Explain by showing the computed object (a trace, a table, a figure) and
saying what it is. One concrete sentence beats a paragraph of framing.

## Code

- Exact arithmetic where the site already uses it (`core/exact.ts`); no
  float tolerances in new core modules.
- Every page computes what it shows; nothing is hand-drawn or typed in
  from a result.
- Tests check against an independent source: geometry against tables, a new
  tracer against the strand graph.
