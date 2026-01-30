# Quality Rules

Critical rules for CR content (LLM often violates these):

| Rule | Why |
|------|-----|
| NO YAML frontmatter | MCP auto-generates it |
| NO prose paragraphs | Use bullets/tables only |
| NO `**Bold**` as headers | Use `###` markdown headers |
| NO fabricated metrics | Only if baseline exists + verifiable |
| NO generic adjectives | "robust", "scalable" without specifics |
| NO code blocks for lists | Lists stay as plain markdown |
| ONE `#` H1 only | Document title, nothing else |
| NO duplicate headers | Each section name unique |

**Quick test**: Can every statement be verified by checking a file/test/endpoint? If not, remove it.
