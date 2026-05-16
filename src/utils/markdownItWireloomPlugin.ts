/**
 * Custom markdown-it fence renderer for Wireloom code blocks.
 *
 * Detects `wireloom` fenced code blocks and replaces them with either:
 * - A cached SVG (if pre-rendered by prepareWireloomBlocks)
 * - A `<div class="wireloom-pending">` placeholder (rendered async post-mount)
 *
 * If wireloom is not installed, blocks fall through to default code rendering.
 */
import type MarkdownIt from 'markdown-it'
import { getWireloomSvg } from './wireloomRenderer'

const WIRELOOM_LANG = 'wireloom'

/**
 * markdown-it plugin that adds Wireloom wireframe rendering.
 * Requires wireloom to be optionalDependency — gracefully degrades.
 */
export function markdownItWireloomPlugin(md: MarkdownIt): void {
  const defaultFence = md.renderer.rules.fence

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  md.renderer.rules.fence = (tokens: any, idx: number, options: any, env: any, self: any) => {
    const token = tokens[idx]
    const info = token.info?.trim() ?? ''

    if (info === WIRELOOM_LANG || info.startsWith(`${WIRELOOM_LANG} `)) {
      const source = token.content ?? ''

      // Check cache first (populated by prepareWireloomBlocks)
      const cached = getWireloomSvg(source)
      if (cached !== undefined) {
        return `<div class="wireloom">${cached}</div>`
      }

      // No cache — emit placeholder for post-render async rendering
      // Encode source in data attribute using base64 to avoid HTML injection
      const encoded = btoa(unescape(encodeURIComponent(source)))
      return `<div class="wireloom-pending" data-source-encoded="${encoded}"></div>`
    }

    return defaultFence
      ? defaultFence(tokens, idx, options, env, self)
      : self.renderToken(tokens, idx, options)
  }
}
