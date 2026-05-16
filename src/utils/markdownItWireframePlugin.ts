/**
 * Custom markdown-it fence renderer for wireframe code blocks with metadata labels.
 *
 * When a fenced code block uses `wireframe` as the language and has additional
 * metadata in the info string (e.g., ```wireframe state:surface empty), this
 * plugin renders a label div above the code block containing the escaped metadata.
 *
 * Plain ```wireframe blocks (no metadata) render as normal code blocks.
 */
import type MarkdownIt from 'markdown-it'
import { escapeHtml, unescapeAll } from 'markdown-it/lib/common/utils.mjs'

const WIREFRAME_LANG = 'wireframe'

/**
 * Extracts the metadata portion of a wireframe info string.
 * Returns the trimmed metadata after "wireframe", or empty string if none.
 */
function extractMetadata(info: string): string {
  const trimmed = info.trim()
  if (!trimmed.startsWith(WIREFRAME_LANG))
    return ''
  const remainder = trimmed.slice(WIREFRAME_LANG.length).trim()
  return remainder
}


/**
 * markdown-it plugin that adds labeled wireframe fence rendering.
 */
export function markdownItWireframePlugin(md: MarkdownIt): void {
  const defaultFence = md.renderer.rules.fence

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  md.renderer.rules.fence = (tokens: any, idx: number, options: any, env: any, self: any) => {
    const token = tokens[idx]
    const info = token.info ? unescapeAll(token.info.trim()) : ''

    if (info.startsWith(WIREFRAME_LANG) && extractMetadata(info)) {
      const codeBlock = defaultFence
        ? defaultFence(tokens, idx, options, env, self)
        : self.renderToken(tokens, idx, options)

      const metadata = extractMetadata(info)
      const label = `<div class="code-block-label wireframe-label">${escapeHtml(metadata)}</div>`
      return label + codeBlock
    }

    return defaultFence
      ? defaultFence(tokens, idx, options, env, self)
      : self.renderToken(tokens, idx, options)
  }
}
