# Deployed Revocation Evidence — MDT-226

Manual evidence target for `TEST-deployed-revocation` (Edge-4, C-10). This file
defines the production check; it does not claim the check has run.

## Requirement

If membership changes while a stream is open, the project hub SHALL exclude and
close unauthorized sockets before delivering a later projection (Edge-4). A
stream is authorized at handshake, re-authorized after Durable Object
hibernation before delivery, and reconnected no later than Access token expiry
(C-10).

## Procedure

1. Deploy the push path and connect a local server as a member with an active
   stream.
2. As an owner, revoke (or suspend) that membership via DELETE/PUT membership.
3. Confirm the member's project socket closes (1008 authorization_revoked) and
   no later projection is delivered through it.
4. Commit a projection mutation after the revocation and confirm it is NOT
   delivered to the revoked socket.
5. Confirm token-expiry reconnection: let the Access token approach expiry and
   confirm the stream reconnects before expiry.

## Required evidence

- [ ] Deployment version and timestamp recorded.
- [ ] Revoked socket closed before the next projection delivery.
- [ ] No projection delivered to the revoked principal after revocation.
- [ ] Close/error reasons carried a non-secret code only (no body/credential).

## Result

Not run against the reconciled deployment candidate. Requires the deployed
Access-protected Worker.
