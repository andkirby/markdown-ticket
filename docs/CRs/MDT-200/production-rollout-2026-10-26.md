# Production rollout and incident acceptance — 2026-10-26

## Verdict and scope

MDT-200's October collision correction is implemented, deployed and accepted.
The user authorized deployment, project repair, testing and completion in the
existing UAT round. This record supersedes the earlier local-only checkpoints;
it does not rewrite their RED evidence or accept MDT-261's concurrent changes.

General deployment applies to the shared coordination service. The reviewed
identity/projection repair below applies only to MDT project
`35863af3-8bca-4ceb-bc18-5c7bfb3e4188`. Legacy projects are not silently imported.

## Deployment and rollback evidence

| Item | Recorded value |
| --- | --- |
| Source baseline | `6c116ec4f20c2822ff54b94901cf4578d77d998e`, plus the ACK-delivery and disable-receiver corrections below |
| Corrective source commit | `2172a786` (ACK delivery and disable receiver); fixture commit `6d3e4bfb` |
| Previous Worker | `d0aad034-e406-417c-9d07-4eca1bcb0980` |
| Initial v2 rollout | `36419471-8cc1-42b7-b672-4093299c8050` |
| Accepted Worker | `88738304-310a-41fa-983c-1e2da8050153` |
| Production D1 | `02996cfe-a593-4650-8983-2caf53a02d55` |
| Migration | `0005_creation_identity.sql`, applied `2026-10-26 19:10:26` UTC |
| Pre-migration bookmark | `00001fa0-00000002-00005110-a9ce3d6d01c489b32a8b9058386ac7db` |
| Export size | 5,986,100 bytes |
| Plain export SHA-256 | `83357da416ff2c1edbbac733fe3d2fb5bbe5f00632e5702b24117914f106939d` |

The additive migration was tested on the production export in isolated SQLite
before production apply. The same export was restored into a separate temporary
remote D1; every exported user table's row count matched, foreign-key checks
returned no violations, and migration0005 applied there successfully. The
local restored database passed `integrity_check`; D1 rejected that PRAGMA as
unsupported, so no remote integrity-check result is claimed. The temporary D1
was removed after verification. Production was never restored or recreated.

The backup is encrypted with AES-256-CBC/PBKDF2 (200,000 iterations); successful
decryption reproduced the recorded plaintext digest. Its owner-only key is
outside Git. Raw exports, journals, credentials and principal claims are not
included in repository evidence. No Access policy or security boundary changed.
The existing Durable Object class/tag `v3`, binding and cron were retained.

## MDT incident reconciliation

Read-only production inspection found counter260 and revision166, with legacy
NULL creation identities and a pending old-Worker allocation at259. The eight
current canonical files below were reviewed; each received only its creationId
line, preserving existing content and unrelated MDT-261 edits.

| Canonical ticket | Reviewed creationId |
| --- | --- |
| MDT-255 | `5166dcc7-4add-4fb7-9c1b-3a109e986e4a` |
| MDT-257 | `601a945f-38fa-45ea-b258-cf32f0b0020c` |
| MDT-258 | `54f2a0ab-19e4-486f-ad83-c42e50d34afd` |
| MDT-259 | `91e05c98-ff7a-4406-99a4-ae7da3f669da` |
| MDT-260 | `b896f4d5-ceca-4472-871e-e56d5ad8fe52` |
| MDT-261 | `e464ccae-fef9-46c6-ade9-9b1e83e50e98` |
| MDT-262 | `707b5bda-b393-449e-9676-b39403a040c7` |
| MDT-263 | `c0a0ae20-9f9a-43c2-b530-f22767d81f44` |

The repair also retained obsolete reservation256 with a distinct historical
identity and subsequently tombstoned its projection; no canonical file256 was
fabricated. This accounts for the older cloud255 boundary-validation and
cloud256 global-only-list mismatches as well as cloud257/local261 and
cloud258/local262. Canonical255/257/258/259 retain their own correct content;
261/262/263 receive their correct independent associations.

Operator operation `d520cc6b-a586-45e7-a64f-2b946d08e118` was previewed read-only
and replayed against the restored export before apply. With MDT suspended and
exact counter/revision/row preconditions, production apply returned:

- counter260 →264; projection revision166 →175; nine reviewed mappings;
- identical operation retry returned `replayed:true`, with no repeated writes;
- obsolete256's normal lifecycle tombstone advanced revision175 →176;
- final MDT state: active, next number264, revision176, 59 retained reservations,
  highest occupied263, nine identified rows (eight canonical plus retired256).

All pre-existing reservation numbers and idempotency rows were retained,
including the old reservation259 and its original request hash. The immutable
reconciliation receipt records prior and reviewed associations and an audit
identifies the repair. VOC's existing counter76/revision3 remained unchanged.
No test reservation was created in the real MDT project.

### Explicit retirement of the incompatible pending intent

The old Worker had allocated259 for the later canonical263 CLI intent, but the
local v2 journal was still `pending`, without a held receipt. Normal resume or
receipt-based terminal reconciliation therefore cannot safely process it.
After the reviewed cloud repair, an explicit operator action preserved the
original bytes, decision and production proof under
`CONFIG_DIR/cloud-sync/incident-archives/MDT200-d520cc6b-a586-45e7-a64f-2b946d08e118/`.

The archive used the existing per-repository creation lock, checked the exact
original digest, fsynced evidence before moving the active file, and made the
archive immutable. Its original SHA-256 is
`f23eb816580fc01ab1e865aab38a2b622f048ef21a04d1d05ef8c3217e253cc4`.
Canonical263 retains that intent's original creationId. No retry intent, floor,
receipt or idempotency history was rewritten, and the journal was not deleted.
This is a reviewed incident operation, not a new general force-clear API.

An initial archive attempt failed before moving bytes because its parent
folder was absent. An intermediate resume was immediately reversed, the
archive was completed under lock, and coordination was resumed after checking
its proof. Audit and reservation queries confirm no intervening MDT allocation.

The real shared observation service verified all eight repaired canonical keys.
Both shared inspection and the reloaded backend's owner HTTP inspection reported
zero active creation-recovery entries. Ordinary legacy tickets outside this
review remain subject to the documented provenance/import rules.

## Defects found by deployed acceptance

### Creation ACK bypassed live delivery

Two already-connected real clients reached ready/ACK but saw no creation delta
for ten seconds. Worker acknowledgement had committed projectionv1 directly to
D1 without the project hub. This was a real integration defect, not an allocator
failure or a reason to add polling.

The ACK route now calls `ProjectProjectionHub.acknowledgeAndDeliver`. The
existing queue prearms recovery, runs the unchanged authorized acknowledgement
use case, reads committed reservation/projection data, and sends the complete
stored delta. Typed RPC failures and the public ACK DTO are preserved. D1
remains authoritative; the hub owns delivery only. Replay does not advance
revision twice, and acknowledged sockets do not receive duplicate delivery.

`cloud/test/ack.delivery.test.ts` proves alarm ordering/failure, real SQL commit
and rollback, identity and suspension rejection, replay, committed-row delivery
and actual Worker-route delegation. Its first assertion initially expected a
creationId in persisted stream headers; this was corrected to the existing
persisted header contract, with no production wire expansion. The historical
RED log and initial test digest were retained; no claim of byte-frozen tests
covers that correction. All seven final cases pass. Earlier sealed recovery,
journal and HTTP/auth assertions were untouched.

### Disable lost the credential resolver's receiver

The live CLI wrote disabled device state but left its cloud project active.
`(resolver.forDisable ?? resolver.forConnect)(origin)` detached the real
resolver method from its receiver; its exception was caught by best-effort
local disable. The call now preserves `resolver` in both branches. A regression
using the real factory, audience resolver, state store and coordinator failed
before the fix and now proves cloud suspend before local disabled persistence.
Offline best-effort local disable remains fail-closed; remote suspension must
still be verified before detach/local-numbering procedures.

## Validation and limits

| Check | Result |
| --- | --- |
| Full shared | 1,189 passed, 0 failed; includes repaired authenticated discovery fixture and real disable regression |
| Full server | 993 passed, 0 failed, eight existing skips; 81 suites |
| Full CLI | 245 passed, 0 failed; 32 files |
| Full MCP | 245 passed, 0 failed; 16 suites |
| Full cloud | 117 passed, 0 failed; 21 files |
| Builds | domain-contracts/shared/CLI/server/MCP/cloud pass |
| Static checks | scoped ESLint, whitespace, deployment dry-run and pinned-source knip pass |
| Trace | all five stages, zero issues; non-strict |
| Independent review | GLM bounded ACK-delivery/disable review PASS; no required fixes |
| Local backend | existing `mdt-be` configuration reloaded; health200 and owner recovery inspection200/empty |

Acceptance suites ran against an isolated clean source export of6c116ec4 plus
only the explicitly recorded rollout corrections. The concurrent MDT-261 tree
was excluded from those acceptance counts. A later local package build and
backend reload preserved its separately confirmed runtime-compatible work;
they do not accept or close MDT-261. Server tests used `--forceExit` for their
existing open-handle issue; no assertion or skip policy was bypassed. Earlier
15-server/3-shared failures are resolved through nine fixture corrections:
authenticated private-project/SSE reads, structured validation issue assertions,
complete router stubs, the actual DEV-log schema import, and the existing pin
service's legacy config-dir boundary. Product validation was not weakened.

The deployed proofs include concurrent reservations with differing floors,
stable replay and immutable-input rejection, legacy-writer rejection, wrong-
identity ACK rejection, SQL/audit agreement, real CLI creation above an existing
local high-water263, and creation plus status delivery to two already-connected
WebSocket clients. Both clients authenticate as the same human; no second-human
or rendered-browser SLO proof is claimed. CLI disable then produced cloud423,
local canonical reads/edits succeeded, and disabled creation made no new file.
Isolated test projects are suspended with history retained; their numbers are
never reused. See the linked operations records for exact summaries.

Service-token attribution remains explicitly owned by MDT-224. Broader browser
latency/idle/hibernation acceptance remains MDT-226 work. Those existing
follow-ups are not silently marked complete. The restore/concurrency/disable
execution evidence relevant to MDT-222 is recorded here without changing that
ticket's status or claiming its entire vendor-exit scope is complete.

Machine-local raw evidence is in the originating thread's private
`mdt200-production-rollout/` bundle. The durable values above suffice to identify
the deployment and repair when that bundle is unavailable.
