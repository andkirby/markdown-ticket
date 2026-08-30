#!/usr/bin/env node
//
// parse-css.mjs — parse-only CSS gate
//
// Catches syntax errors (orphaned braces, malformed nesting, broken @layer,
// unclosed blocks) that a nightly LLM agent can introduce when editing CSS.
// Enforces NO style rules — it either parses or it doesn't. Style/architecture
// enforcement lives in the nightly ITCSS task (frontend/src/ITCSS.md) + the
// enforce-semantic-classes lefthook hook.
//
// Why postcss, not lightningcss: lightningcss auto-closes unclosed braces
// (lenient parser), so it silently accepts the most common agent-breakage mode.
// postcss.parse rejects unclosed blocks, missing colons, and extra braces —
// the actual failure surface — while accepting @apply, @layer, @tailwind,
// and @import as unknown at-rules.
//
// Usage:
//   node scripts/parse-css.mjs <file.css> [<file.css> ...]
//   find src -name '*.css' | xargs node scripts/parse-css.mjs
//
// Exit codes: 0 = all parsed, 1 = at least one parse error.

import { readFileSync } from 'node:fs'
import process from 'node:process'
import postcss from 'postcss'

const files = process.argv.slice(2)

if (files.length === 0) {
  console.error('usage: parse-css.mjs <file.css> [...]')
  process.exit(2)
}

let failures = 0

for (const file of files) {
  let css
  try {
    css = readFileSync(file, 'utf8')
  }
  catch (e) {
    console.error(`✗ ${file}: cannot read (${e.code})`)
    failures++
    continue
  }

  try {
    postcss.parse(css)
  }
  catch (e) {
    const where = e.line ? `:${e.line}:${e.column || 1}` : ''
    console.error(`✗ ${file}${where}: ${e.message.split('\n')[0]}`)
    failures++
  }
}

if (failures > 0) {
  console.error(`\n${failures} CSS file(s) failed to parse.`)
  process.exit(1)
}

console.log(`✓ ${files.length} CSS file(s) parsed cleanly.`)
