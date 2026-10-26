# Deployed concurrency evidence — MDT-200

## Accepted run — 2026-10-26

Executed against Worker `88738304-310a-41fa-983c-1e2da8050153` through real
Cloudflare Access and D1, using an isolated test project (not MDT's UUID).

| Check | Result |
| --- | --- |
| Unique requests / concurrency | 12 / 6 |
| Requested minimums | 1000,1020,1005,1040, rotated across clients |
| Successful unique reservations | 12 distinct numbers, all above their own minimum |
| Allocated numbers | 1040, 1041, 1042, 1043, 1044, 1045, 1046, 1047, 1048, 1049, 1050, 1051 |
| Latency p50 / p95 / max | 526 / 1114 / 1114 ms (nearest rank) |
| Replay | Same reservation/number, replayed:true, no extra counter advance |
| Changed immutable input | 409 |
| Legacy writer without floor/identity | 400 |
| Wrong identity ACK / correct ACK | 409 / 200 |
| D1 agreement | Counter = highest retained number+1; distinct rows and audits agree |

The project also retains twelve reservations from the earlier deployment
checkpoint, for24 distinct total rows. Different-floor allocation legitimately
jumps the counter; it need not equal starting counter plus request count. The
final counter1052 matches highest1051+1 despite the additional replay.
The project is suspended after the drill, with reservation and audit history
retained. Test numbers are never reused; no production MDT ticket was created.

Two real WebSocket clients on another isolated project, both already connected,
received a pinned CLI create above local high-water263 and its later Approved
status change. This accepted run followed the live ACK-delivery fix; both
clients used the same authenticated human. Browser rendering and second-human
acceptance are not inferred from this proof.

See [production acceptance](../../../docs/CRs/MDT-200/production-rollout-2026-10-26.md)
for deployment/source binding, live RED/GREEN and retained evidence.
