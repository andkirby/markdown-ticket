# BDD: MDT-178

**Source**: [MDT-178](../MDT-178-runtime-configuration.md)
**Framework**: Playwright browser E2E plus server Jest API coverage
**Executable gate**: required

## Feature: Runtime-configured sharing links

As an MDT owner, I want share and invite links to use deployment-configured public origins so generated links work outside localhost.

### Scenario: Runtime config is parsed once at startup

Given the backend process has runtime environment variables
When the server app is created
Then routes and middleware use the app runtime config instead of reading env during request handling

### Scenario: Configured public origin is used

Given `PUBLIC_ORIGIN` contains a full origin
When an owner opens sharing settings
Then generated invite links use that origin

### Scenario: Current origin fallback remains safe and visible

Given no configured public origin is available
When an owner lists read-access link options or creates an invite from an allowed current origin
Then the generated public link origin is the allowed current origin

### Scenario: Missing safe origin blocks invite links

Given no configured public link origin is available
When an owner opens sharing settings from a rejected current origin
Then the UI reports that no safe generated-link origin exists

## E2E Targets

- `tests/e2e/sharing/read-access-journey.spec.ts` covers owner-facing invite generation with `PUBLIC_ORIGIN`.
- Server API tests cover startup/runtime-config parsing, fallback ordering, and request-level invite URL construction.

---
Use `bdd.trace.md` for canonical scenario coverage.
