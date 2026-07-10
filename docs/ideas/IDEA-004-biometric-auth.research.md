---
id: IDEA-004
research-date: 2026-06-12
status: research-complete
---

# IDEA-004 Biometric Auth — Feasibility Research Report

## Executive Summary

**Verdict: Implementable, recommended for promotion as a dedicated CR.**

Biometric unlock via WebAuthn/passkeys is technically feasible and maps cleanly onto the existing single-owner session architecture. The implementation shape is well-understood, the library ecosystem is mature (`@simplewebauthn`), and the effort aligns with the "M" estimate in the original idea doc. However, it requires HTTPS in production, introduces security-sensitive credential storage, and should wait until MDT-172 (sharing) and MDT-176 (owner session) are stable — exactly as the idea doc recommends.

---

## 1. Current Auth Architecture (Baseline)

### How it works today

| Layer | Implementation |
|-------|---------------|
| **Credential** | Single owner token set via `API_AUTH_TOKEN` env var |
| **Exchange** | `POST /api/auth/session` — token in body → HMAC-signed `HttpOnly; SameSite=Strict; Secure` cookie (`mdt_owner_session`) |
| **Session** | Stateless signed cookie, no server-side session store, max-age 14 days (configurable) |
| **Validation** | Every API request goes through `createApiAuthMiddleware` which checks cookie or `Authorization: Bearer` / `X-API-Key` headers |
| **CSRF** | `X-MDT-Owner-Intent: 1` header required for cookie-authenticated mutations |
| **Read access** | Separate read-token system (`read-access-tokens.json` in config dir) with scoped project visibility |
| **Logout** | `DELETE /api/auth/session` clears cookie, invalidates owner sessions |

### Key files

| File | Role |
|------|------|
| `server/routes/auth.ts` | Auth router: session CRUD, read-token exchange |
| `server/security/apiAuth.ts` | Middleware: credential extraction, token matching, access context |
| `server/security/apiSession.ts` | Cookie creation/verification, HMAC signing, payload encoding |
| `server/security/apiSession.ts` | `appendOwnerSessionCookie()`, `verifyOwnerSessionCookie()` |
| `server/config/runtimeConfig.ts` | Auth config from env, origin policy, session TTL |
| `src/auth/AuthSessionProvider.tsx` | Frontend: session state machine (locked → unlocking → unlocked) |
| `src/auth/authFetch.ts` | Frontend: fetch wrapper with CSRF intent header |

### Credential storage pattern

The project already has a precedent for file-based credential storage:
- **Location**: `~/.config/markdown-ticket/auth/read-access-tokens.json`
- **Pattern**: JSON file with hashed tokens, atomic writes, store versioning
- **This pattern can be extended** for passkey credential storage (e.g., `~/.config/markdown-ticket/auth/passkey-credentials.json`)

---

## 2. WebAuthn / Passkey Technology Assessment

### What WebAuthn actually is

WebAuthn does **not** expose biometric data to the application. The browser/platform mediates biometric verification locally and provides a **cryptographic assertion** (signature) to the app. Two flows:

1. **Registration (Attestation)**: Create a new passkey → store credential public key server-side
2. **Authentication (Assertion)**: Sign a challenge with existing passkey → verify signature server-side

### Library: @simplewebauthn

| Metric | Value |
|--------|-------|
| **Server package** | `@simplewebauthn/server` |
| **Browser package** | `@simplewebauthn/browser` |
| **Weekly downloads** | ~300K+ |
| **Last updated** | Actively maintained (v10+ / v11) |
| **Node.js support** | 18+ (project uses Bun, compatible) |
| **Browser support** | All modern browsers (see below) |
| **Bundle size (browser)** | ~15KB gzipped |
| **License** | MIT |

#### Key server functions

```typescript
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';

// Registration
const options = await generateRegistrationOptions({
  rpName: 'Markdown Ticket',
  rpID: hostname,            // e.g. 'mdt.example.com'
  userName: 'owner',
  // No user accounts — single owner, so userName is fixed
});

// Verify registration response
const verification = await verifyRegistrationResponse({
  response: clientResponse,
  expectedChallenge: storedChallenge,
  expectedOrigin: publicOrigin,
  expectedRPID: hostname,
});
// Store: verification.credentialInfo (id, publicKey, counter)

// Authentication
const authOptions = await generateAuthenticationOptions({
  rpID: hostname,
});

// Verify authentication response
const authVerification = await verifyAuthenticationResponse({
  response: clientResponse,
  expectedChallenge: storedChallenge,
  expectedOrigin: publicOrigin,
  expectedRPID: hostname,
  credential: storedCredential,  // from registration
});
```

### Browser support

| Browser | Platform Authenticator (biometric) | Security Key | Notes |
|---------|-----------------------------------|-------------|-------|
| Chrome 67+ | ✅ Touch ID / Windows Hello | ✅ | Full support |
| Firefox 60+ | ✅ Windows Hello | ✅ | Limited platform auth on macOS |
| Safari 14+ | ✅ Touch ID / Face ID | ✅ | Full support, iCloud Keychain sync |
| Edge 18+ | ✅ Windows Hello | ✅ | Full support |
| Chrome Android | ✅ Fingerprint / Face | ✅ | Full support |
| Safari iOS 14+ | ✅ Face ID / Touch ID | ✅ | Full support |

**Devices without biometrics**: WebAuthn falls back to PIN, password, or pattern. The user can also use a roaming security key (YubiKey, etc.). Passkeys can sync via iCloud Keychain or Google Password Manager.

---

## 3. Proposed Architecture

### Design principles (from IDEA-004)

> Extend the existing `/api/auth/session` boundary and `owner-admin` session cookie model instead of adding controller-level auth checks or a multi-user account system.

This means: **passkey authentication produces the same owner session cookie** as token exchange. No new session type, no new middleware.

### New endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/passkey/register-options` | `POST` | Generate WebAuthn registration challenge (requires existing owner session) |
| `/api/auth/passkey/register-verify` | `POST` | Verify registration response, store credential (requires existing owner session) |
| `/api/auth/passkey/auth-options` | `POST` | Generate WebAuthn authentication challenge (public) |
| `/api/auth/passkey/auth-verify` | `POST` | Verify authentication response → issue owner session cookie (public) |
| `/api/auth/passkey/credentials` | `GET` | List registered passkeys (requires owner session) |
| `/api/auth/passkey/credentials/:id` | `DELETE` | Remove a passkey (requires owner session) |

### Data model

```typescript
interface PasskeyCredential {
  id: string              // Base64URL-encoded credential ID
  publicKey: Uint8Array   // COSE public key
  counter: number          // Signature counter for clone detection
  transports?: string[]    // 'internal', 'hybrid', 'usb', 'ble', 'nfc'
  name: string             // User-assigned label e.g. "MacBook Touch ID"
  createdAt: string        // ISO timestamp
  aaguid?: string          // Authenticator Attestation GUID
}
```

**Storage**: `~/.config/markdown-ticket/auth/passkey-credentials.json`, following the existing `readTokenStore` pattern (atomic writes, versioned JSON).

### Challenge storage

Challenges are ephemeral (valid ~60 seconds). Options:
- **In-memory `Map`** (simplest, no persistence needed, lost on restart = fine)
- Matches the existing approach: the project has no session store, challenges are short-lived

### Registration flow

```
┌─────────┐                          ┌─────────┐
│ Browser │                          │  Server │
└────┬────┘                          └────┬────┘
     │  POST /passkey/register-options   │
     │  (owner cookie required)          │
     │──────────────────────────────────>│
     │  { challenge, rp, user }          │
     │<──────────────────────────────────│
     │                                   │
     │  navigator.credentials.create()   │
     │  (biometric prompt)               │
     │                                   │
     │  POST /passkey/register-verify    │
     │  (owner cookie + attestation)     │
     │──────────────────────────────────>│
     │  verifyRegistrationResponse()     │
     │  store credential                 │
     │<──────────────────────────────────│
     │  { success, credential id }       │
```

### Authentication (unlock) flow

```
┌─────────┐                          ┌─────────┐
│ Browser │                          │  Server │
└────┬────┘                          └────┬────┘
     │  POST /passkey/auth-options       │
     │──────────────────────────────────>│
     │  { challenge }                    │
     │<──────────────────────────────────│
     │                                   │
     │  navigator.credentials.get()      │
     │  (biometric prompt)               │
     │                                   │
     │  POST /passkey/auth-verify        │
     │  (assertion)                      │
     │──────────────────────────────────>│
     │  verifyAuthenticationResponse()   │
     │  issue owner session cookie       │
     │<──────────────────────────────────│
     │  Set-Cookie: mdt_owner_session    │
```

### Frontend changes

The `AuthUnlock` component currently shows a token input field. Changes:
1. Add "Unlock with passkey" button (shown when passkeys are registered)
2. Add passkey management section in `SettingsModal` (register/delete passkeys)
3. The `AuthSessionProvider.unlock()` callback gains a passkey path alongside the token path
4. On successful passkey auth, `markOwnerAdmin()` fires — same state transition as token unlock

---

## 4. Prerequisites and Dependencies

### HTTPS requirement

WebAuthn **requires a secure context**:
- ✅ `https://` in production
- ✅ `localhost` / `127.0.0.1` in development (browser exemption)
- ❌ `http://non-localhost` — WebAuthn API is undefined

**Current state**: The project uses Nginx as a reverse proxy for TLS termination. The Express backend itself is HTTP-only behind the proxy. This is compatible — WebAuthn checks the browser origin, which will be `https://` when served through Nginx.

**Required configuration**: `PUBLIC_ORIGIN` env var must be set correctly for `expectedOrigin` in WebAuthn verification. This already exists in the project for CORS/CSRF.

### Relying Party ID

The `rpID` must match the hostname (e.g., `mdt.example.com`). This is derivable from `PUBLIC_ORIGIN`.

---

## 5. Risks and Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Device loss** — owner loses all registered passkeys | High | Keep owner token as recovery fallback. Require at least one passkey registration while authenticated. Document recovery procedure. |
| **HTTPS misconfiguration** — WebAuthn silently unavailable | Medium | Detect `window.PublicKeyCredential` availability in frontend. Show clear message if unavailable. Development works on localhost. |
| **Credential storage compromise** | High | Store only public keys (by design). File permissions on `passkey-credentials.json`. Consider encrypting at rest with a server-side secret in future. |
| **Cross-device registration** | Low | Passkeys sync via iCloud Keychain / Google Password Manager. Users can also register multiple devices. |
| **Single-owner model ambiguity** | Low | `userName` is fixed as `'owner'`. No user account system needed. One set of credentials per deployment. |
| **Browser compatibility edge cases** | Low | ~97% browser support. Graceful fallback to token input always available. |
| **Clone detection** | Low | Signature counter tracking in `verifyAuthenticationResponse`. Store counter, reject on rollback. |

---

## 6. Effort Estimate

| Component | Effort | Notes |
|-----------|--------|-------|
| Server: new routes + service | 1–2 days | 6 endpoints, credential store, challenge management |
| Server: `@simplewebauthn/server` integration | 0.5 day | Well-documented API, ~100 lines of core logic |
| Frontend: passkey unlock UI | 1 day | AuthUnlock component changes, `@simplewebauthn/browser` |
| Frontend: passkey management in settings | 1 day | Register/delete/list passkeys |
| Frontend: availability detection + fallback | 0.5 day | Feature detection, graceful degradation |
| Testing: server unit + API tests | 1 day | Registration, authentication, edge cases |
| Testing: E2E (limited — needs HTTPS) | 0.5 day | Manual testing or Playwright with HTTPS proxy |
| Documentation | 0.5 day | Auth guide update, threat model |
| **Total** | **~6–7 days** | Consistent with "M" estimate |

---

## 7. Recommendation

### Promote as a dedicated CR

Per IDEA-004's own recommendation, this should be promoted as a separate authentication CR **after** MDT-172 (sharing) and MDT-176 (owner session) are stable. Current status:
- MDT-176: ✅ Implemented (auth session unlock is shipped)
- MDT-172: ✅ Implemented (public read-only sharing is shipped)

**The feature is ready for promotion now.**

### Suggested CR scope

1. Add `@simplewebauthn/server` (server) and `@simplewebauthn/browser` (frontend) dependencies
2. Create `server/security/passkeyAuth.ts` — registration options, verification, credential store
3. Add passkey routes under `server/routes/auth.ts` (or a new `server/routes/passkey.ts`)
4. Store credentials in `~/.config/markdown-ticket/auth/passkey-credentials.json`
5. Extend `AuthUnlock` component with passkey button
6. Add passkey management to `SettingsModal`
7. Always keep token input as fallback
8. Update `AUTH_SESSION_GUIDE.md` with passkey section
9. Include threat model document

### Out of scope for the CR

- Multi-user accounts or RBAC
- Passkey sync management (handled by OS/browser)
- FIDO2 device attestation policy enforcement
- Multiple passkey credential sets per deployment

---

## 8. References

- [WebAuthn spec (W3C)](https://www.w3.org/TR/webauthn/)
- [@simplewebauthn/server (npm)](https://www.npmjs.com/package/@simplewebauthn/server)
- [@simplewebauthn/browser (npm)](https://www.npmjs.com/package/@simplewebauthn/browser)
- [Passkeys.dev (Google)](https://passkeys.dev/)
- [Auth Session Guide](../AUTH_SESSION_GUIDE.md)
- [Authentication and Sharing Architecture](../architecture/auth-and-sharing-architecture.md)
- [MDT-176 Architecture](../CRs/MDT-176/browser-auth-session-unlock.md)
