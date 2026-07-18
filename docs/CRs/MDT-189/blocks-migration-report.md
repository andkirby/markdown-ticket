# blocks migration report (MDT-189)

> **Real write DEFERRED.** This is the dry-run report only. The actual data
> rewrite across `docs/CRs/**/*.md` is intentionally **not** performed in the
> session that produced this report (the branch had concurrent agents in
> flight on unrelated tickets, and the migration rewrites frontmatter on every
> ticket file — a one-way door that must run from a clean session the operator
> controls, not a session racing other work).
>
> The dry-run report itself is the committed acceptance artifact. When the
> operator is ready to run the real migration:
>
> 1. Confirm no concurrent agents are editing `docs/CRs/`.
> 2. Review this report end to end — especially the contradiction below.
> 3. Run `bun scripts/migrate-blocks.ts --write` (interactive) or
>    `bun scripts/migrate-blocks.ts --write --yes` (CI) from a clean worktree.
> 4. Commit the resulting data diff as its own commit
>    (`chore(MDT-189): migrate blocks to derived inverse of dependsOn`).
> 5. Re-run `bun scripts/migrate-blocks.ts` (dry-run) to confirm the
>    "Files changed: 0" invariant.
>
> See `docs/CRs/MDT-189.pipeline-state.json` → `milestonePlan` for the
> recorded skip/defer rationale.

Mode: DRY RUN
Run at: 2026-07-18T10:56:53.286Z
Aborted: false

## Totals

- Files changed: 31
- Contradictions: 1
- Files unchanged: 436

## Per-project detail

## Project VOC

- Total tickets: 58
- Changed: 16
- Contradictions: 0
- Unchanged: 42

- VOC-018: add blocks [VOC-022]
- VOC-007: add blocks [VOC-009]
- VOC-036: add blocks [VOC-049]
- VOC-015: add blocks [VOC-019]
- VOC-006: add blocks [VOC-007, VOC-010, VOC-017]
- VOC-020: remove blocks [VOC-007]
- VOC-046: add blocks [VOC-034, VOC-047]
- VOC-053: add blocks [VOC-054]
- VOC-010: add blocks [VOC-006, VOC-013]
- VOC-050: add blocks [VOC-051, VOC-053]
- VOC-037: add blocks [VOC-049]
- VOC-027: add blocks [VOC-042]
- VOC-051: add blocks [VOC-053]
- VOC-043: add blocks [VOC-044, VOC-045]
- VOC-013: add blocks [VOC-018]
- VOC-049: add blocks [VOC-051, VOC-053]

### VOC invariant (pre-write)
Invariant satisfied for 42/58 (72%) of tickets.
Violating: VOC-018, VOC-007, VOC-036, VOC-015, VOC-006, VOC-020, VOC-046, VOC-053, VOC-010, VOC-050, VOC-037, VOC-027, VOC-051, VOC-043, VOC-013, VOC-049

## Project N8TS

- Total tickets: 19
- Changed: 0
- Contradictions: 0
- Unchanged: 19


### N8TS invariant (pre-write)
Invariant satisfied for 19/19 (100%) of tickets.

## Project WF0

- Total tickets: 10
- Changed: 0
- Contradictions: 0
- Unchanged: 10


### WF0 invariant (pre-write)
Invariant satisfied for 10/10 (100%) of tickets.

## Project OFF

- Total tickets: 30
- Changed: 0
- Contradictions: 0
- Unchanged: 30


### OFF invariant (pre-write)
Invariant satisfied for 30/30 (100%) of tickets.

## Project DEVPT

- Total tickets: 20
- Changed: 0
- Contradictions: 0
- Unchanged: 20


### DEVPT invariant (pre-write)
Invariant satisfied for 20/20 (100%) of tickets.

## Project MDT

- Total tickets: 173
- Changed: 13
- Contradictions: 1
- Unchanged: 160

- MDT-029: add blocks [MDT-031]
- MDT-059: add blocks [MDT-065]
- MDT-017: add blocks [MDT-059]
- MDT-067: add blocks [MDT-069]
- MDT-189: add blocks [MDT-192]
- MDT-082: remove blocks [MDT-071]
- MDT-082: CONTRADICTION with MDT-071 — dry-run, would default to keeping dependsOn, dropping blocks
- MDT-071: add blocks [MDT-082]
- MDT-157: add blocks [MDT-156, MDT-172]
- MDT-074: add blocks [MDT-055]
- MDT-096: remove blocks [MDT-095]
- MDT-025: remove blocks [MDT-026, MDT-027]
- MDT-006: add blocks [MDT-028]
- MDT-091: add blocks [MDT-097, MDT-107]

### MDT invariant (pre-write)
Invariant satisfied for 160/173 (92%) of tickets.
Violating: MDT-029, MDT-059, MDT-017, MDT-067, MDT-189, MDT-082, MDT-071, MDT-157, MDT-074, MDT-096, MDT-025, MDT-006, MDT-091

## Project SUML

- Total tickets: 24
- Changed: 0
- Contradictions: 0
- Unchanged: 24


### SUML invariant (pre-write)
Invariant satisfied for 24/24 (100%) of tickets.

## Project MCL

- Total tickets: 2
- Changed: 0
- Contradictions: 0
- Unchanged: 2


### MCL invariant (pre-write)
Invariant satisfied for 2/2 (100%) of tickets.

## Project AY

- Total tickets: 9
- Changed: 0
- Contradictions: 0
- Unchanged: 9


### AY invariant (pre-write)
Invariant satisfied for 9/9 (100%) of tickets.

## Project PO

- Total tickets: 1
- Changed: 0
- Contradictions: 0
- Unchanged: 1


### PO invariant (pre-write)
Invariant satisfied for 1/1 (100%) of tickets.

## Project GT

- Total tickets: 4
- Changed: 0
- Contradictions: 0
- Unchanged: 4


### GT invariant (pre-write)
Invariant satisfied for 4/4 (100%) of tickets.

## Project CRP

- Total tickets: 1
- Changed: 0
- Contradictions: 0
- Unchanged: 1


### CRP invariant (pre-write)
Invariant satisfied for 1/1 (100%) of tickets.

## Project SEB

- Total tickets: 10
- Changed: 0
- Contradictions: 0
- Unchanged: 10


### SEB invariant (pre-write)
Invariant satisfied for 10/10 (100%) of tickets.

## Project TSM

- Total tickets: 3
- Changed: 0
- Contradictions: 0
- Unchanged: 3


### TSM invariant (pre-write)
Invariant satisfied for 3/3 (100%) of tickets.

## Project TTS

- Total tickets: 4
- Changed: 0
- Contradictions: 0
- Unchanged: 4


### TTS invariant (pre-write)
Invariant satisfied for 4/4 (100%) of tickets.

## Project OPU

- Total tickets: 2
- Changed: 0
- Contradictions: 0
- Unchanged: 2


### OPU invariant (pre-write)
Invariant satisfied for 2/2 (100%) of tickets.

## Project TGMD

- Total tickets: 2
- Changed: 0
- Contradictions: 0
- Unchanged: 2


### TGMD invariant (pre-write)
Invariant satisfied for 2/2 (100%) of tickets.

## Project AC

- Total tickets: 1
- Changed: 0
- Contradictions: 0
- Unchanged: 1


### AC invariant (pre-write)
Invariant satisfied for 1/1 (100%) of tickets.

## Project UXM

- Total tickets: 0
- Changed: 0
- Contradictions: 0
- Unchanged: 0


### UXM invariant (pre-write)
Invariant satisfied for 0/0 (100%) of tickets.

## Project CR

- Total tickets: 38
- Changed: 1
- Contradictions: 0
- Unchanged: 37

- CR-A017: add blocks [CR-A020]

### CR invariant (pre-write)
Invariant satisfied for 37/38 (97%) of tickets.
Violating: CR-A017

## Project SUD

- Total tickets: 0
- Changed: 0
- Contradictions: 0
- Unchanged: 0


### SUD invariant (pre-write)
Invariant satisfied for 0/0 (100%) of tickets.

## Project OSC

- Total tickets: 2
- Changed: 0
- Contradictions: 0
- Unchanged: 2


### OSC invariant (pre-write)
Invariant satisfied for 2/2 (100%) of tickets.

## Project SCF

- Total tickets: 6
- Changed: 1
- Contradictions: 0
- Unchanged: 5

- SCF-003: add blocks [SCF-004]

### SCF invariant (pre-write)
Invariant satisfied for 5/6 (83%) of tickets.
Violating: SCF-003

## Project MDOP

- Total tickets: 1
- Changed: 0
- Contradictions: 0
- Unchanged: 1


### MDOP invariant (pre-write)
Invariant satisfied for 1/1 (100%) of tickets.

## Project PITM

- Total tickets: 1
- Changed: 0
- Contradictions: 0
- Unchanged: 1


### PITM invariant (pre-write)
Invariant satisfied for 1/1 (100%) of tickets.

## Project MYPL

- Total tickets: 1
- Changed: 0
- Contradictions: 0
- Unchanged: 1


### MYPL invariant (pre-write)
Invariant satisfied for 1/1 (100%) of tickets.

## Project WTA

- Total tickets: 4
- Changed: 0
- Contradictions: 0
- Unchanged: 4


### WTA invariant (pre-write)
Invariant satisfied for 4/4 (100%) of tickets.

## Project WFAP

- Total tickets: 3
- Changed: 0
- Contradictions: 0
- Unchanged: 3


### WFAP invariant (pre-write)
Invariant satisfied for 3/3 (100%) of tickets.

## Project CAL

- Total tickets: 6
- Changed: 0
- Contradictions: 0
- Unchanged: 6


### CAL invariant (pre-write)
Invariant satisfied for 6/6 (100%) of tickets.

## Project SNK

- Total tickets: 1
- Changed: 0
- Contradictions: 0
- Unchanged: 1


### SNK invariant (pre-write)
Invariant satisfied for 1/1 (100%) of tickets.

## Project ASP

- Total tickets: 1
- Changed: 0
- Contradictions: 0
- Unchanged: 1


### ASP invariant (pre-write)
Invariant satisfied for 1/1 (100%) of tickets.

## Project T2V

- Total tickets: 1
- Changed: 0
- Contradictions: 0
- Unchanged: 1


### T2V invariant (pre-write)
Invariant satisfied for 1/1 (100%) of tickets.

## Project WSP

- Total tickets: 1
- Changed: 0
- Contradictions: 0
- Unchanged: 1


### WSP invariant (pre-write)
Invariant satisfied for 1/1 (100%) of tickets.

## Project TRANC

- Total tickets: 1
- Changed: 0
- Contradictions: 0
- Unchanged: 1


### TRANC invariant (pre-write)
Invariant satisfied for 1/1 (100%) of tickets.

## Project CV

- Total tickets: 27
- Changed: 0
- Contradictions: 0
- Unchanged: 27


### CV invariant (pre-write)
Invariant satisfied for 27/27 (100%) of tickets.

