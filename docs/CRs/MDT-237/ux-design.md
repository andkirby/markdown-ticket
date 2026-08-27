# UX Design: MDT-237 — Inline-code .md references

## Scope of UX change

Minimal, reuse-first. This feature introduces **no new visual language**:

1. **Converted references keep the inline-code visual affordance.** The emitted
   link is `[`file.md`](url)` — markdown-it renders a monospace code span
   *inside* an anchor. The reader sees the familiar code-styled text, now
   clickable. No new CSS classes, no icon changes (SmartLink's existing `FileText`
   icon behavior applies as for other document links).
2. **Broken references reuse the existing broken state.** `data-link-type="broken"`
   span styling (SmartLink L92-98) with `title="Document not found"` — same
   treatment normalization failures already get. Color/contrast inherit from
   existing `smart-link` styles.
3. **Navigation feedback is unchanged** — react-router client-side transition,
   no reload flash.

## Interaction states

| State | Rendering | Interaction |
|-------|-----------|-------------|
| Existing document | code-styled SmartLink (`document` type) | click → client-side nav |
| Unknown (index loading) | same as existing | click → client-side nav (destination handles 404) |
| Known missing | broken span + tooltip | no navigation; tooltip explains |
| Genuine code | plain `<code>` | none (unchanged) |

## Durable design docs

No durable design-doc updates required: STYLING.md patterns are untouched (no
new classes), and the interaction reuses established SmartLink states. Final
visual confirmation happens in the user-review milestone alongside the E2E run.

**Decision**: proceed — all visuals are reuses of existing components; the only
new signal (known-missing) maps onto an existing state.
