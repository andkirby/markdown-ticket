/**
 * MDT-237: Inline-code .md references convert to clickable links
 *
 * Unit tests for the classify branch in protectInlineCode.
 * RED until implementation: qualifying spans convert; everything else
 * stays byte-identical to pre-MDT-237 behavior.
 *
 * @tags MDT-237
 */
import { describe, expect, it } from 'bun:test'

import { preprocessMarkdown } from './markdownPreprocessor'

const CFG = { enableAutoLinking: true, enableTicketLinks: true, enableDocumentLinks: true }
const CFG_NO_DOC = { enableAutoLinking: true, enableTicketLinks: true, enableDocumentLinks: false }

describe('MDT-237: inline-code .md reference conversion', () => {
  it('converts a bare inline-code .md ref in ticket context to a ticket subdoc link (BR-1.1)', () => {
    const md = 'See `architecture.md` for details.'
    const out = preprocessMarkdown(md, 'MDT', CFG, 'MDT-237/requirements.md', 'docs/CRs')
    expect(out).toContain('[`architecture.md`](/prj/MDT/ticket/MDT-237/architecture.md)')
  })

  it('carries anchor fragments into the resolved URL (C2)', () => {
    const md = 'See `architecture.md#decisions` for details.'
    const out = preprocessMarkdown(md, 'MDT', CFG, 'MDT-237/requirements.md', 'docs/CRs')
    expect(out).toContain('[`architecture.md#decisions`](/prj/MDT/ticket/MDT-237/architecture.md#decisions)')
  })

  it('resolves ../ refs that escape the ticket folder to the documents route (C3/C4)', () => {
    const md = 'See `../../CONTRIBUTING.md` for details.'
    const out = preprocessMarkdown(md, 'MDT', CFG, 'MDT-237/requirements.md', 'docs/CRs')
    expect(out).toMatch(/\[`\.\.\/\.\.\/CONTRIBUTING\.md`\]\(\/prj\/MDT\/documents\?file=/)
  })

  it('keeps genuine code spans verbatim (BR-3.2, Edge-1, C1)', () => {
    const md = 'Run `git mv old.md new.md` and `bun run build` now.'
    const out = preprocessMarkdown(md, 'MDT', CFG, 'MDT-237/requirements.md', 'docs/CRs')
    expect(out).toContain('`git mv old.md new.md`')
    expect(out).toContain('`bun run build`')
    expect(out).not.toContain('](/prj/')
  })

  it('keeps .md paths inside fenced code blocks verbatim (BR-3.1)', () => {
    const md = 'Example:\n\n\`\`\`bash\ncat docs/CRs/MDT-237.md\n\`\`\`\n'
    const out = preprocessMarkdown(md, 'MDT', CFG, 'MDT-237/requirements.md', 'docs/CRs')
    expect(out).toContain('cat docs/CRs/MDT-237.md')
    expect(out).not.toContain('](/prj/')
  })

  it('does not convert without resolution context (D4 fallback)', () => {
    const md = 'See `architecture.md` for details.'
    const out = preprocessMarkdown(md, 'MDT', CFG)
    expect(out).toBe(md)
  })

  it('does not convert when document links are disabled (D4)', () => {
    const md = 'See `architecture.md` for details.'
    const out = preprocessMarkdown(md, 'MDT', CFG_NO_DOC, 'MDT-237/requirements.md', 'docs/CRs')
    expect(out).toBe(md)
  })

  it('does not corrupt ticket-key refs inside converted spans (nested-link guard)', () => {
    const md = 'See `MDT-150.md` for the design.'
    const out = preprocessMarkdown(md, 'MDT', CFG, 'MDT-237/requirements.md', 'docs/CRs')
    // Converted once to a ticket link — no nested/double linkification
    expect(out).toContain('[`MDT-150.md`](/prj/MDT/ticket/MDT-150)')
    expect(out.match(/\]\(/g)?.length).toBe(1)
  })

  it('converts spans with spaces in path segments; bare multi-word spans stay verbatim (C4)', () => {
    const withSlash = 'See `docs/my file.md` for details.'
    const out = preprocessMarkdown(withSlash, 'MDT', CFG, 'MDT-237/requirements.md', 'docs/CRs')
    // Slash path in ticket context resolves under the ticket (MDT-150 semantics)
    expect(out).toContain('](/prj/MDT/ticket/MDT-237/docs/my file.md)')

    const bare = 'See `my file.md` for details.'
    const out2 = preprocessMarkdown(bare, 'MDT', CFG, 'MDT-237/requirements.md', 'docs/CRs')
    expect(out2).toBe(bare)
  })

  it('decodes percent-encoded spans before resolving (C4)', () => {
    const md = 'See `docs/my%20file.md` for details.'
    const out = preprocessMarkdown(md, 'MDT', CFG, 'MDT-237/requirements.md', 'docs/CRs')
    expect(out).toContain('](/prj/MDT/ticket/MDT-237/docs/my file.md)')
  })

  it('falls back to the project-root interpretation when the relative target is known-missing (src/THEME.md case)', () => {
    const md = 'See `src/THEME.md` for the inventory.'
    const oracle = (p: string) => p === 'src/THEME.md'
    const out = preprocessMarkdown(md, 'MDT', CFG, 'MDT-236/tasks.md', 'docs/CRs', oracle)
    expect(out).toContain('](/prj/MDT/documents?file=src%2FTHEME.md)')
  })

  it('keeps the relative resolution when no project-root file matches (ticket-relative intent)', () => {
    const md = 'See `requirements.md` for details.'
    const oracle = () => false
    const out = preprocessMarkdown(md, 'MDT', CFG, 'MDT-237/architecture.md', 'docs/CRs', oracle)
    expect(out).toContain('](/prj/MDT/ticket/MDT-237/requirements.md)')
  })

  it('never re-anchors explicitly relative (..) refs to the project root', () => {
    const md = 'See `../../does-not-exist.md` for details.'
    const oracle = p => p.endsWith('README.md') // root files exist; target does not
    const out = preprocessMarkdown(md, 'MDT', CFG, 'MDT-236/tasks.md', 'docs/CRs', oracle)
    // Escapes the tickets area -> documents URL (flaggable broken), not ?file=does-not-exist.md at root
    expect(out).toContain('documents?file=')
    expect(decodeURIComponent(out)).toContain('does-not-exist.md')
  })

  it('keeps pure path-math behavior when the existence oracle is unknown (null)', () => {
    const md = 'See `src/THEME.md` for the inventory.'
    const oracle = () => null
    const out = preprocessMarkdown(md, 'MDT', CFG, 'MDT-236/tasks.md', 'docs/CRs', oracle)
    expect(out).toContain('](/prj/MDT/ticket/MDT-236/src/THEME.md)')
  })

  it('falls back in documents-view mode too (source-relative missing, project-root exists)', () => {
    const md = 'See `src/THEME.md` for the inventory.'
    const oracle = (p: string) => p === 'src/THEME.md'
    const out = preprocessMarkdown(md, 'MDT', CFG, 'docs/architecture/aaaa.md', 'docs/CRs', oracle)
    expect(out).toContain('](/prj/MDT/documents?file=src%2FTHEME.md)')
  })

  it('resolves a bare filename with a unique project-file basename to that file (THEME.md case, D10)', () => {
    const md = 'See `THEME.md` for the inventory.'
    const oracle = () => false // no root THEME.md, no visible subdoc
    const byName = (name: string) => (name === 'THEME.md' ? 'src/THEME.md' : null)
    const out = preprocessMarkdown(md, 'MDT', CFG, 'MDT-236/architecture.md', 'docs/CRs', oracle, byName)
    expect(out).toContain('](/prj/MDT/documents?file=src%2FTHEME.md)')
  })

  it('keeps the relative resolution when the basename is ambiguous or unmatched', () => {
    const md = 'See `requirements.md` for details.'
    const oracle = () => false
    const byName = () => null
    const out = preprocessMarkdown(md, 'MDT', CFG, 'MDT-237/architecture.md', 'docs/CRs', oracle, byName)
    expect(out).toContain('](/prj/MDT/ticket/MDT-237/requirements.md)')
  })

  it('converts inline-code .html references like .md (root file exists)', () => {
    const md = 'Open `designs/board-zai/preview.html` for the mockup.'
    const oracle = (p: string) => p === 'designs/board-zai/preview.html'
    const out = preprocessMarkdown(md, 'MDT', CFG, 'MDT-236/architecture.md', 'docs/CRs', oracle)
    expect(out).toContain('](/prj/MDT/documents?file=designs%2Fboard-zai%2Fpreview.html)')
  })

  it('wraps the URL part in an anchor INSIDE the code span (D11)', () => {
    const md = 'Run `git clone https://git.example.com/some/path` first.'
    const out = preprocessMarkdown(md, 'MDT', CFG, 'MDT-237/requirements.md', 'docs/CRs')
    expect(out).toBe('Run <code>git clone <a href="https://git.example.com/some/path">https://git.example.com/some/path</a></code> first.')
  })

  it('keeps the code wrapper for a URL-only span', () => {
    const md = 'See `https://git.example.com` here.'
    const out = preprocessMarkdown(md, 'MDT', CFG, 'MDT-237/requirements.md', 'docs/CRs')
    expect(out).toBe('See <code><a href="https://git.example.com">https://git.example.com</a></code> here.')
  })

  it('escapes HTML special characters in the code text around the URL', () => {
    const md = 'Run `a<b & c https://git.example.com/x?q=1` now.'
    const out = preprocessMarkdown(md, 'MDT', CFG, 'MDT-237/requirements.md', 'docs/CRs')
    expect(out).toContain('&lt;b &amp; c')
    expect(out).toContain('href="https://git.example.com/x?q=1"')
  })

  it('does not link pseudo-URLs without a plausible domain host (https://… stays verbatim)', () => {
    const md = 'See `git clone https://…` in the docs.'
    const out = preprocessMarkdown(md, 'MDT', CFG, 'MDT-237/requirements.md', 'docs/CRs')
    expect(out).toContain('`git clone https://…`')
    expect(out).not.toContain('](https')
  })

  it('links URLs with port, query, or fragment but rejects bare scheme+non-domain', () => {
    const ok = 'See `http://localhost:3001/api?x=1#frag` here.'
    const out = preprocessMarkdown(ok, 'MDT', CFG, 'MDT-237/requirements.md', 'docs/CRs')
    expect(out).toContain('href="http://localhost:3001/api?x=1#frag"')

    const bad = 'See `https://…/docs` here.'
    const out2 = preprocessMarkdown(bad, 'MDT', CFG, 'MDT-237/requirements.md', 'docs/CRs')
    expect(out2).toContain('`https://…/docs`')
    expect(out2).not.toContain('](https')
  })

  it('keeps URL-less command spans verbatim even with .md words (regression guard)', () => {
    const md = 'Run `git mv old.md new.md` now.'
    const oracle = () => true // even with a fully-loaded index
    const out = preprocessMarkdown(md, 'MDT', CFG, 'MDT-237/requirements.md', 'docs/CRs', oracle)
    expect(out).toContain('`git mv old.md new.md`')
  })

  it('routes plain-text .md tokens to provably-existing project files (favor real files)', () => {
    const md = 'Theme rules live in THEME.md per surface.'
    const oracle = () => false
    const byName = (n: string) => (n === 'THEME.md' ? 'src/THEME.md' : null)
    const out = preprocessMarkdown(md, 'MDT', CFG, 'MDT-236/architecture.md', 'docs/CRs', oracle, byName)
    expect(out).toContain('[THEME.md](/prj/MDT/documents?file=src%2FTHEME.md)')
  })

  it('tokenizes possessive .md words (THEME.md\'s) so linkify never punycode-links them', () => {
    const md = 'authored links like THEME.md\'s badge stay in-app'
    const oracle = () => false
    const byName = (n: string) => (n === 'THEME.md' ? 'src/THEME.md' : null)
    const out = preprocessMarkdown(md, 'MDT', CFG, 'MDT-237/uat.md', 'docs/CRs', oracle, byName)
    expect(out).toContain('[THEME.md](/prj/MDT/documents?file=src%2FTHEME.md)\'s')
    expect(out).not.toContain('http://THEME.md')
  })

  it('plain-text .md token with no positive knowledge keeps legacy conversion', () => {
    const md = 'See requirements.md for details.'
    const oracle = () => false
    const byName = () => null
    const out = preprocessMarkdown(md, 'MDT', CFG, 'MDT-237/requirements.md', 'docs/CRs', oracle, byName)
    // Relative resolution still engages (subdoc URL) — unchanged behavior
    expect(out).toContain('[requirements.md](/prj/MDT/ticket/MDT-237/requirements.md)')
  })

  it('never builds a URL escaping the project scope for traversal-shaped refs (BR-2.2)', () => {
    const md = 'See `../../../../etc/passwd.md` for details.'
    const out = preprocessMarkdown(md, 'MDT', CFG, 'MDT-237/requirements.md', 'docs/CRs')
    // Any produced link must stay inside the app's project-scoped routes
    const hrefs = [...out.matchAll(/\]\(([^)]+)\)/g)].map(m => m[1])
    for (const href of hrefs) {
      expect(href.startsWith('/prj/MDT/')).toBe(true)
    }
    expect(out).not.toContain('](../')
    expect(out).not.toContain('](/etc/')
  })

  it('leaves existing markdown links and plain ticket refs unchanged (BR-4.1)', () => {
    const md = 'See [design](MDT-150.md) and MDT-151 too.'
    const out = preprocessMarkdown(md, 'MDT', CFG, 'MDT-237/requirements.md', 'docs/CRs')
    expect(out).toContain('[MDT-151](/prj/MDT/ticket/MDT-151)')
  })
})
