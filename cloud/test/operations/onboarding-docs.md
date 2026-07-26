# Onboarding Documentation Review — MDT-201 (TEST-onboarding-docs)

Manual doc-review gate for `TEST-onboarding-docs` (BR-4.3, C9, Edge-7).
Verifies the durable onboarding documentation presents cloud membership and
Git repository access as **separate** prerequisites, and names the explicit
connect, CONFIG_DIR credential installation, disable, legacy migration, and
permanent-detach procedures.

## Status

**PASS** — the durable docs reconcile with the implemented MDT-201 behavior.

## Reviewed documents

| Document | Owner | Reconciled |
| --- | --- | --- |
| `docs/CLOUD_COORDINATION_GUIDE.md` | ART-cloud-coordination-guide | ✅ |
| `docs/architecture/cloud-sync/README.md` | ART-arch-cloud-sync | ✅ |
| `docs/CRs/MDT-201/architecture.md` | ART-arch-md | ✅ |
| `docs/CONFIG_SPECIFICATION.md` | ART-config-spec | ✅ |

## Review checklist

### Cloud membership and Git repository access are separate prerequisites (BR-4.3, C9)

- [x] `CLOUD_COORDINATION_GUIDE.md` states connecting "never calls the operator
      provisioning endpoint" and that "Cloud membership and Git repository
      access remain separate prerequisites."
- [x] `CONFIG_SPECIFICATION.md` states no cloud enablement, UUID, origin, or
      credential is permitted in `.mdt-config.toml` or the registry.
- [x] A teammate with cloud membership but no Git repository access completes
      cloud operations while Markdown/Git collaboration is surfaced as a
      separately documented prerequisite (Edge-7).

### Explicit connect (BR-2.2, BR-2.6)

- [x] `CLOUD_COORDINATION_GUIDE.md` § "Connect an existing clone or teammate"
      documents the connect procedure: obtain the non-secret UUID, validate the
      origin, authenticate personally, verify membership, write CONFIG_DIR
      commit-last, never provision.

### CONFIG_DIR credential installation (BR-2.3, C6, C8)

- [x] `CLOUD_COORDINATION_GUIDE.md` § "Credentials" documents the owner-only
      `CONFIG_DIR/cloud-sync/credentials/{credentialRef}.toml` install path for
      machine runtimes, atomic writes, and the human-token `cloudflared` path.
- [x] `CONFIG_SPECIFICATION.md` documents the credential file location and that
      human Access tokens are not persisted by MDT.

### Disable (BR-4.2)

- [x] `CLOUD_COORDINATION_GUIDE.md` § "Disable a project" documents that
      disable suspends coordination, retains `state = "disabled"`, and never
      silently resumes local numbering.

### Legacy migration (BR-1.8, Edge-9)

- [x] `CLOUD_COORDINATION_GUIDE.md` § "Legacy repository binding migration"
      documents the explicit, conflict-safe migration that never silently edits
      repository files.

### Permanent detach

- [x] `CLOUD_COORDINATION_GUIDE.md` § "Permanent detach" documents the
      separately-acknowledged procedure to return to local numbering, including
      counter reconciliation and connection removal.

## Reconciliation notes

- The implemented `CloudProjectManagementService` lifecycle (enable, connect,
  disable, migrateLegacyBinding) matches the documented procedures.
- The CONFIG_DIR connection record fields (`version`, `state`, `cloudProjectId`,
  `serviceOrigin`, `pollIntervalSeconds`) match `ProjectStateStore` and the
  `CloudSyncConnection` contract exactly.
- The `project.cloudSync.*` configuration selectors are removed from the normal
  allowlist (`selectors.ts`); the docs correctly state legacy
  `[project.cloudSync]` is migration input only.
- The trusted service profile (distribution defaults + operator exact-HTTPS
  extensions) matches `resolveTrustedServiceProfile` and the documented
  effective trusted-origin set.
