# Disable and Markdown continuity evidence — MDT-200

## Current contract

`mdt-cli cloud disable --yes` attempts project suspension using the coordination
Access audience, then retains the installation's CONFIG_DIR connection as
`disabled`. It does not silently resume local numbering. If credentials or the
coordinator are unavailable, local state is still disabled and creation remains
blocked; confirm remote suspended state separately before any detach procedure.
A device-local disabled connection alone cannot prove project-wide suspension.

The connection lives at CONFIG_DIR/projects/{localProjectId}/cloud-sync.toml.
Repository `[project.cloudSync]` is legacy migration input, not the current
binding or an instruction to delete configuration. Follow the authoritative
[disable procedure](../../../docs/CLOUD_COORDINATION_GUIDE.md#disable-a-project).

## Executed drill — 2026-10-26

On an isolated cloud project through Access and the accepted Worker:

- [x] The pinned CLI with the real audience resolver requested cloud suspension
  and retained disabled device state.
- [x] A subsequent valid cloud reservation request returned423.
- [x] Reading and editing an existing canonical Markdown ticket succeeded.
- [x] Disabled CLI creation failed with no new local ticket file; no local
  fallback number was assigned.
- [x] The test project remains suspended, with history retained.

The initial drill exposed a real defect: extracting the resolver method lost
its receiver, threw before credential resolution and was silently caught as a
best-effort disable failure. The corrected bound call and real-factory regression
now prove suspension before disabled-state persistence. Ordinary offline
best-effort behavior remains unchanged.

No binding was removed and no irreversible vendor-exit/local-numbering
resumption was performed on the real MDT project. Those actions are outside
this drill; MDT-222 remains separately owned.
[Deployment and acceptance evidence](../../../docs/CRs/MDT-200/production-rollout-2026-10-26.md).
