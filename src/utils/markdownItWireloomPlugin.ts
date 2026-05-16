/**
 * Custom markdown-it fence renderer for Wireloom code blocks.
 *
 * Detects `wireloom` fenced code blocks and emits a placeholder div.
 * The placeholder is replaced with rendered SVG in the post-render hook
 * (renderWireloomElements), which handles async rendering and theme detection.
 *
 * If wireloom is not installed, placeholders fall back to plain code blocks.
 */
import type MarkdownIt from 'markdown-it'

const WIRELOOM_LANG = 'wireloom'

/**
 * markdown-it plugin that adds Wireloom wireframe rendering.
 * wireloom is an optionalDependency — gracefully degrades.
 */
export function markdownItWireloomPlugin(md: MarkdownIt): void {
  const defaultFence = md.renderer.rules.fence

  // eslint-disable-next-line ts/no-explicit-any
  md.renderer.rules.fence = (tokens: any, idx: number, options: any, env: any, self: any) => {
    const token = tokens[idx]
    const info = token.info?.trim() ?? ''

    if (info === WIRELOOM_LANG || info.startsWith(`${WIRELOOM_LANG} `)) {
      const source = token.content ?? ''

      // Emit placeholder for post-render async rendering.
      // Encode source in data attribute using base64 to avoid HTML injection.
      const encoded = btoa(unescape(encodeURIComponent(source)))
      return `<div class="wireloom-pending" data-source-encoded="${encoded}"></div>`
    }

    return defaultFence
      ? defaultFence(tokens, idx, options, env, self)
      : self.renderToken(tokens, idx, options)
  }
}
