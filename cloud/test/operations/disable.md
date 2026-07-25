# Disable Evidence — MDT-200

Manual evidence for `TEST-disable-markdown` (BR-4.2). Disabling cloud binding
leaves all durable ticket content usable from Markdown/Git.

## Procedure (operations.md § Disable and Vendor Exit)

Disabling one client does not stop cloud allocations by other clients. The
project-wide suspend + detach sequence must complete before resuming local
numbering.

### Local-only continuity (verified by design)

The cloud binding is opt-in and additive (C4). The local allocation path
(`TicketService.getNextCRNumber`, the `highest + 1` scan wrapped by
`LocalTicketNumberAllocator`) is unchanged when no `[project.cloudSync]` binding
is present (BR-1.7, covered by `shared/services/cloud-sync/__tests__/no-fallback.test.ts`).

Therefore removing a cloud binding (or never enabling one) cannot affect ticket
file readability or editability:

- Ticket bodies and headers live in Markdown/Git (C2 — the cloud is never a
  content authority).
- The operation journal holds no secrets and no ticket content.
- Removing `[project.cloudSync]` reverts allocation to the local scan.

### Project-wide disable (operator)

1. Suspend the cloud project (coordination_state = `suspended`) via the
   operator procedure — blocks new allocations from all clients.
2. Drain or retire reservations; synchronize canonical Git repositories.
3. Remove `[project.cloudSync]` from each client's `.mdt-config.toml`.
4. Resume local numbering (the local scan picks up from the highest existing
   number; cloud-allocated numbers are never reused — C3).

### Verification

- [x] Local-only allocation preserved without a binding (unit-tested).
- [ ] Live disable drill against a provisioned project (operator step; record
      the suspended-state allocation denial + local resumption).

## Notes

- Tombstones for deleted tickets are retained while the cloud project exists so
  ticket numbers cannot be mistaken for reusable.
- A disabled client's stale projected stubs disappear from the board on the next
  poll (they were derived).
