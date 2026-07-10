---
id: IDEA-004
status: triage
date: 2026-06-11
resolution-date:
promoted-to:
---

# Biometric Auth

## Idea
Add biometric authentication so the owner can unlock Markdown Ticket with a device-native gesture such as Touch ID, Face ID, Windows Hello, or a security key.

## Investigation
This should be designed as WebAuthn/passkey support, not as direct biometric handling. Browsers do not expose fingerprints or face data to the app; they expose a cryptographic assertion from a platform authenticator or security key.

The existing auth architecture is a single-owner token-to-cookie browser session. Biometric/passkey unlock should extend the existing `/api/auth/session` boundary and `owner-admin` session cookie model instead of adding controller-level auth checks or a multi-user account system.

Likely shape:

- Add owner passkey registration while already authenticated as owner.
- Store passkey credential public keys server-side under the existing auth config area, not in project `.mdt-config.toml`.
- Add a challenge endpoint and an assertion endpoint under `/api/auth`.
- On successful assertion, issue the same owner session cookie used today.
- Keep the existing owner token as setup/recovery fallback.

Important dependency: production deployments need HTTPS and stable origin configuration for WebAuthn. Local development can use localhost.

Effort: M. Value is good for public-domain owner access, but it is security-sensitive and should be a separate CR with architecture and threat-model coverage.

## Decision
Recommendation: promote later as a dedicated authentication CR when owner-session/sharing work is stable. Do not fold it into routine auth UI polish.

## References
- [Auth Session Guide](../AUTH_SESSION_GUIDE.md)
- [Authentication and Sharing Architecture](../architecture/auth-and-sharing-architecture.md)
- [MDT-176 Architecture](../CRs/MDT-176/architecture.md)
