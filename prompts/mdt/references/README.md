# MDT Language References

This directory contains language-specific patterns for MDT workflows. These files are **loaded on demand** by commands when generating executable code.

## Available References

| File | Language/Ecosystem | Load When |
|------|-------------------|-----------|
| `typescript.md` | TypeScript, JavaScript, Node.js | Project has `package.json` or `tsconfig.json` |
| `python.md` | Python | Project has `pyproject.toml`, `setup.py`, or `requirements.txt` |

## What References Contain

Each reference file includes:

- **Detection** — How to identify the ecosystem
- **Test frameworks** — Common frameworks and their config files
- **Test file naming** — Conventions for that ecosystem
- **BDD/Gherkin examples** — Executable test code patterns
- **Selector patterns** — Stable vs brittle UI selectors
- **Environment variables** — How to read and mock env vars
- **Common assertions** — Framework-specific assertion syntax
- **Filter commands** — How to run specific tests

## Usage in Commands

Commands reference these files when generating executable tests:

```markdown
**Language reference** (load if generating executable tests):
- TypeScript/Node.js: `mdt/references/typescript.md`
- Python: `mdt/references/python.md`
```

The command should:
1. Detect the project's language/ecosystem
2. Load the appropriate reference file
3. Follow patterns from that file for test generation

## Adding New Languages

To add support for a new language:

1. Create `{language}.md` following the existing structure
2. Include all standard sections (detection, frameworks, naming, examples, etc.)
3. Update command files to reference the new file
4. Update this README

## Design Principle

References are **separated from commands** to:
- Keep commands language-agnostic
- Allow easy updates to language-specific patterns
- Enable adding new languages without modifying core workflow logic
