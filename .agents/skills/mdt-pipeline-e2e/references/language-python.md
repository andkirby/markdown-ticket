# Python Reference

Prefer project docs and manifest commands over these defaults.

## Detect

Use when the project has `pyproject.toml`, `requirements.txt`, `setup.py`,
`pytest.ini`, `tox.ini`, `uv.lock`, `poetry.lock`, or Python packages.

## Discovery

- Inspect `pyproject.toml` for tools: pytest, ruff, mypy, pyright, hatch, poetry.
- Check virtual environment or runner guidance in project docs.
- Prefer `uv run`, `poetry run`, `hatch run`, or documented wrappers when present.

## Common Commands

Use exact project commands when available:

```bash
python -m pytest
uv run pytest
poetry run pytest
ruff check .
mypy .
pyright
python -m build
```

## Review Focus

- Missing tests for branchy business logic and error paths.
- Import-time side effects, global mutable state, and fixture leakage.
- Async/sync boundary errors in web frameworks.
- Path, encoding, timezone, and environment-variable assumptions.
- Type coverage for public service boundaries.
