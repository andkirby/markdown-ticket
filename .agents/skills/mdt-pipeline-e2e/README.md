# Ticket Pipeline E2E

Project-agnostic ticket lifecycle skill for taking one ticket from discovery to
reviewed implementation and user-approved close.

## Workflow

```mermaid
flowchart TD
    A["Input: ticket key, issue URL, file path, or task"] --> B["Pre-flight"]
    B --> B1["Read project instructions"]
    B --> B2["Read docs/SKILLS.md if present"]
    B --> B3["Detect language and tools"]
    B --> B4["Create or update pipeline state"]
    B --> B5["Record baseline verification"]

    B5 --> C["Assess"]
    C --> D["Requirements"]
    D --> E["Scenarios"]
    E --> F["Architecture"]
    F --> G{"UI or interaction change?"}
    G -->|Yes| H["UX draft in ticket"]
    H --> HR{"UX reviewer approves?"}
    HR -->|Revise| H
    HR -->|Approved| H1["Update durable design docs"]
    H1 --> I
    G -->|No| I["Tests"]
    I --> J["Tasks"]
    J --> K{"Proceed to implementation?"}
    K -->|Revise| C
    K -->|Proceed| K1["Set ticket status to in progress"]
    K1 --> L["Implement"]

    L --> M["Hard gates"]
    M --> M1{"Build/typecheck pass?"}
    M1 -->|No| L
    M1 -->|Yes| M2{"Tests pass?"}
    M2 -->|No| L
    M2 -->|Yes| M3{"Lint/static checks pass?"}
    M3 -->|No| L
    M3 -->|Yes| N["Review"]

    N --> O{"Blocking issue?"}
    O -->|Yes| L
    O -->|No| P["Debt scan"]
    P --> Q["Close report"]
    Q --> R{"User approves?"}
    R -->|Changes requested| L
    R -->|Approved| S["Project status transition"]
    S --> T["Done"]

    B4 -. resume .-> U["--from STAGE"]
    U --> V["Validate prior artifacts and state"]
    V --> C

    B -. optional .-> W["Ralph loop reference"]
    W -. tools exist .-> X["ralph_start / ralph_done"]
    W -. no tools .-> Y["plain milestone wording"]
```

## Reference Loading

`SKILL.md` stays lean and loads focused references only when needed:

- `references/ralph-loop.md` for agentic apps with Ralph tooling.
- `references/language-typescript.md` for TypeScript/JavaScript projects.
- `references/language-python.md` for Python projects.
- `references/language-rust.md` for Rust projects.
- `references/language-go.md` for Go projects.

Project docs always win over generic language references.
