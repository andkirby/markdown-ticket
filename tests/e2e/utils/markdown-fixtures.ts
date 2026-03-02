export const markdownRenderingDocumentPath = 'docs/markdown-rendering.md'

export const markdownRenderingFixture = `
# Markdown Rendering Fixture

## Nested List
- one
  - inside of one
- two

## Mermaid
\`\`\`mermaid
graph TD
    A[Start] --> B[Render]
\`\`\`

## Table
| Name | Value |
| --- | --- |
| alpha | 1 |
| beta | 2 |

## Blockquote
> Rendered quote line

## Code Block
\`\`\`ts
const total = 1 + 2
\`\`\`
`.trim()
