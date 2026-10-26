# Requirements: MDT-262

Current UAT scope: In This Ticket. Canonical IDs and relationships are in [requirements.trace.md](requirements.trace.md).

## Semantic Decisions

- Expose every non-cloud MDT command through native tools. CLI aliases reuse one tool; output-format switches map to native JSON, except ticket rename which keeps CLI text.
- Expose ticket list pagination/output selectors and create content. Optional content is delivered to CLI stdin, never interpolated into command text.
- Expose operational spec-trace commands including lock; fragment migration stubs and help/version remain CLI utilities.
- Ticket delete follows the CLI's current-workspace semantics. Rename accepts qualified keys but no fabricated project/JSON flags.
- Skills provide on-demand procedural guidance. Tool descriptions and schemas explain individual calls. MDT workflow skills continue to own ticket lifecycle decisions.
- Document capability availability separately from automated and live verification. Cloud commands remain CLI-only; do not expose a generic arbitrary-command escape hatch.

## Durable Documentation

`plugins/README.md` owns layout, entry links and maintenance rules; `plugins/docs/coverage.md` owns the capability/verification matrix; `plugins/docs/usage.md` owns setup and tool examples. Plugin `skills/mdt-tools/SKILL.md` ships agent guidance. Root README links to the plugin entry point.
