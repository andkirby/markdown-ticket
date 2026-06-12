# Go Reference

Prefer project docs and manifest commands over these defaults.

## Detect

Use when the project has `go.mod`, `go.sum`, Go workspaces, or `.go` sources.

## Discovery

- Inspect `go.mod` and `go.work`.
- Check Makefile, Taskfile, Magefile, or CI config for canonical commands.
- Identify external services required by integration tests.

## Common Commands

Use exact project commands when available:

```bash
go test ./...
go test -race ./...
go vet ./...
gofmt -w <files>
gofmt -l .
```

## Review Focus

- Context propagation and cancellation.
- Goroutine leaks, channel deadlocks, and data races.
- Error wrapping and caller-visible error semantics.
- Interface placement and over-abstraction.
- Table-driven tests for edge cases and API behavior.
