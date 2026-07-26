---
code: MDT-210
status: Proposed
dateCreated: 2026-07-26T09:29:09.633Z
type: Research
priority: Medium
relatedTickets: 211
---

# Full-text search discovery and alternatives analysis

## Context

Markdown-Ticket currently exposes only "surface" search: a case-insensitive
substring match over `title + code + description`. Ticket bodies are not
searchable. Users have asked for a full-text search path, gated behind an
explicit "Full" control to keep the default fast and predictable.

This ticket captures the discovery work behind that decision so future
maintainers can reconsider it when corpus scale or product expectations
shift. The implementation is tracked in **MDT-211**.

## Methodology

Two independent analyses were combined:

1. **In-repo audit** — located existing search surfaces, scanners, and data
   flow (see "Evidence" below).
2. **External consultation** — a constrained comparative analysis from a
   general-purpose LLM over the same problem shape (cross-platform,
   on-device, no daemon, no SaaS, no custom indexer).

Both analyses converged on the same primary recommendation.

## Current data flow (as of this ticket)

| Layer | Loaded into memory | Source |
|---|---|---|
| Server `TicketService.listCRs` | Full `Ticket[]` incl. `content` body | `getProjectCRs` → `scanMarkdownFiles` reads entire file |
| Server `MarkdownService.scanMarkdownFilesMetadata` | Frontmatter only, no content | Exists, **unused by `listCRs`** |
| Client `Ticket` type | Has `content: string` field | `shared/models/Ticket.ts:67` |
| Client `ProjectedStubTicket` | `content: ''` intentionally (BR-3.1) | `src/types/ticket.ts:39` |
| Client `matchesQuery` | title + code + description only | `src/utils/ticketFilters.ts:78` |
| Server `matchesFilters` | Facet fields only, **no free-text query** | `shared/services/TicketService.ts:988` |

**Key finding:** surface search is not actually saving disk I/O today — the
server reads full file bodies on every list call. The "lightweight" framing
was partly false. There is also already a metadata-only scanner that exists
for exactly this reason but is not being used by the list path.

## Alternatives considered

Six families, ordered roughly by least-overengineered first.

### Alt 1 — Extend the in-memory server filter

Add a `query` field to `TicketFilters`; one new branch in
`TicketService.matchesFilters` matching against `ticket.content`. Server
already has the strings.

- **Pros:** ~20 LOC. No deps. No platform branching. No index. Fresh by
  construction (content read on every list call).
- **Cons:** Linear scan per query. Felt at ~10k tickets × 10 KB bodies.

### Alt 2 — Client-side substring over `ticket.content`

If the list API already ships `content` to the client, `matchesQuery` adds
`ticket.content.includes(term)` for free.

- **Pros:** Instant feedback, no round-trip, reuses existing debounce.
- **Cons:** Depends on whether content is on the wire (verify via Network
  tab). UI-thread jank on large corpora unless moved to a Web Worker.

### Alt 3 — Metadata-fast default + opt-in content scan  ★ CHOSEN

- **Default (title search):** switch `listCRs` to `getProjectCRsMetadata`
  (frontmatter only). Faster than today, not slower.
- **"Full" button:** calls a variant endpoint that uses `scanMarkdownFiles`
  (full bodies) and runs Alt 1's substring match.

- **Pros:** Default path gets *cheaper*. Full search is opt-in and honest
  about its cost. Data structures already support it (`TicketMetadata` and
  the metadata scanner exist).
- **Cons:** Two code paths. The button must mean something visually.

### Alt 4 — Native CLI spawn (grep / ripgrep / ag)

Spawn a subprocess that recursively reads files and emits matches.

- **Pros:** Genuinely fast on huge corpora; well-tested native code.
- **Cons:** Platform-dependent (BSD grep ≠ GNU grep ≠ Windows findstr),
  shell escaping, double-reads files (server already has them in memory),
  breaks Windows unless `rg.exe` is bundled per OS.

**Verdict:** Rejected at this scale. Comes back into consideration only
when corpus crosses ~50k files AND in-process scan exceeds 200 ms
(measured, not guessed). "Native is faster" is not enough reason to
introduce subprocess lifecycle and distribution complexity for ~50 MB
of text.

### Alt 5 — In-process inverted index (MiniSearch / FlexSearch / Lunr)

~10–30 KB JS library, postings index in memory, sub-ms queries.

- **Pros:** Real relevance ranking (BM25-like), prefix search, fuzzy
  matching, term highlighting.
- **Cons:** Index build cost (50–200 ms for 1k docs), memory 2–8× corpus
  size, staleness plumbing (must invalidate + rebuild on every file
  change; chokidar makes this solvable but it is plumbing).
- **Semantic shift:** tokenized matching, not substring. `"auth_t"` in
  `auth_token` does not match by default — diverges from existing title
  search which is substring.

**Verdict:** Right answer when ranked / typo-tolerant full-text becomes
a *primary* interactive surface. Wrong answer today for an opt-in "Full"
button. If adopted later, title search must also migrate to keep
semantics consistent.

### Alt 6 — Platform-native indexed search (mdfind / tracker / Windows Search)

Delegate indexing and querying to the OS.

- **Pros:** Zero index build cost — OS already indexed the files.
- **Cons:** Different API on every OS; result attribution back to ticket
  code is fragile (file paths, not parsed tickets); freshness outside
  app control; privacy surfaces files the user did not expect.

**Verdict:** Rejected. Maintenance abomination. No useful corpus-size
inflection point for this case.

### Family F+ — LinearRAG (separate local project)

Graph + vector + LLM RAG (ICLR'26 paper, academic codebase). Evaluated
because the asset already exists locally.

| Property | LinearRAG | Markdown-Ticket need |
|---|---|---|
| Cold footprint | ~2.2 GB (418 MB model + 1.3 GB venv + Spacy + torch) | ~0 today |
| Warm start | ~5 s to load stores | <50 ms |
| External deps | `OPENAI_API_KEY` mandatory for `ask.py` | None |
| Designed for | Multi-hop QA over large research corpora | Literal substring over ~50 MB |

**Verdict:** Wrong by orders of magnitude. Belongs in a future "semantic
Q&A over tickets" feature, not this one. Different product, separate CR,
separate opt-in.

## Comparison matrix (external LLM analysis, ~5 KB avg doc, modern SSD)

Calibration points, not portable benchmark guarantees.

| Family | 1k docs | 10k docs | RAM | Freshness | XP risk | Deps | LOC |
|---|---:|---:|---|---|---|---|---:|
| A. Linear scan | 2–15 ms cached | 20–80 ms cached | ~0 | Immediate | Low | None | 30–100 |
| B. JS inverted index | 0.2–3 ms | 1–15 ms | 2–8× corpus | ms after update | Low | Small JS lib | 80–200 |
| C. SQLite FTS5 | 0.2–3 ms | 0.3–8 ms | 5–40 MB | <1 s | Medium | SQLite + db file | 120–250 |
| D. Native CLI | 5–25 ms | 15–80 ms warm | Transient | Immediate | Med-high | Bundled exe | 60–150 |
| E. OS-native | 5–50 ms | 5–50 ms | OS-controlled | Seconds–minutes | Extreme | 3 OS stacks | 200–500+ |
| F. Embedded store | 0.5–10 ms | 0.5–20 ms | Tens–hundreds MB | ms–seconds | High | Native SDK | 150–500 |

**Key result:** query latency is not the limiting factor at this corpus
size. The decision should be driven by query semantics, freshness
coordination, memory policy, packaging, and cold-start behavior.

## Substring vs tokenized — the load-bearing distinction

Substring search and tokenized full-text are different products. They
diverge on:

| Query | `String#includes` | MiniSearch default tokenizer |
|---|---|---|
| `"auth_t"` in `auth_token` | Match | No match (splits on `_`) |
| `"MDT-17"` in `MDT-179` | No match | Match with `prefix: true` |
| `"colour"` in `color` | No match | Match with `fuzzy: 1` |
| `"login"` in `sign-in flow` | No match | No match (different tokens) |

Existing title search uses substring. Switching only the body path to
tokenized would create user-visible inconsistency. Any future move to
MiniSearch must decide whether to migrate title search too.

## Decision

**Alt 3** — opt-in in-memory substring search over `ticket.content`.

Rationale:

1. Cheapest path consistent with existing title-search semantics.
2. Data structures already support it (metadata scanner exists, currently
   unused by the list path).
3. No new dependencies, no platform branching, no daemon, no index.
4. Honest about cost: "Full" button shows a loading state.
5. Default path gets *faster* than today (metadata-only scan), not slower.

## Upgrade triggers (measured, not guessed)

| Trigger | Action |
|---|---|
| Searchable text > ~500 MB | Swap `String#includes` for Rust regex via napi-rs (still in-process, no spawn) |
| Ranked / fuzzy / prefix becomes a primary UX | Add MiniSearch (Alt 5); migrate title search for consistency |
| Persistent index, snippets, or phrase queries wanted | SQLite FTS5 with `contentless_delete=1` table |
| Semantic Q&A over tickets becomes a feature | LinearRAG-tier (Family F+); separate CR; separate opt-in; user accepts resource contract |

## Evidence (file refs)

- `src/utils/ticketFilters.ts:78` — current client `matchesQuery` (title/code/description only)
- `shared/services/TicketService.ts:988` — current server `matchesFilters` (facets only, no query)
- `shared/services/MarkdownService.ts:256` — `scanMarkdownFiles` (full body read)
- `shared/services/MarkdownService.ts` — `scanMarkdownFilesMetadata` (frontmatter only, exists)
- `shared/services/ProjectService.ts:290` — `getProjectCRs` (uses full-body scanner)
- `shared/services/ProjectService.ts:348` — `getProjectCRsMetadata` (exists, unused by `listCRs`)
- `shared/models/Ticket.ts:67` — `Ticket.content` field
- `src/types/ticket.ts:39` — `ProjectedStubTicket.content` intentionally empty (BR-3.1)
- `docs/CRs/MDT-179-scoped-global-search.md` — prior scoped-search CR; explicitly deferred indexing/backend choice (this ticket picks up that deferral)
- LinearRAG (separate local project, not in this repo) — Family F+ asset; future semantic-Q&A candidate

## Related work

- **MDT-179** (scoped global search) — punted on indexing decision; this ticket resolves that deferral.
- **MDT-211** (Alt 3 implementation) — derived from this research.