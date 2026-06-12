# Rust Reference

Prefer project docs and manifest commands over these defaults.

## Detect

Use when the project has `Cargo.toml`, `Cargo.lock`, crates, or `.rs` sources.

## Discovery

- Inspect workspace layout in `Cargo.toml`.
- Check feature flags and target-specific instructions.
- Identify whether tests need external services or fixtures.

## Common Commands

Use exact project commands when available:

```bash
cargo test
cargo test --workspace
cargo check
cargo clippy --all-targets --all-features -- -D warnings
cargo fmt --check
```

## Review Focus

- Error handling semantics: avoid lossy `unwrap`/`expect` in production paths.
- Ownership and lifetime complexity hiding simpler design.
- Feature flag combinations and workspace crate boundaries.
- Async runtime misuse, blocking in async paths, and cancellation behavior.
- Serialization compatibility and migration risks.
