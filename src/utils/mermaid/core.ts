import mermaid from 'mermaid'
import { THEME_CONFIG } from './constants'

function decodeHtmlEntities(content: string): string {
  return content
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, '\'')
    .replace(/&apos;/g, '\'')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
}

function escapeHtml(content: string): string {
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Initialize mermaid with theme-aware configuration
 */
export function initMermaid(isDark: boolean): void {
  mermaid.initialize({
    startOnLoad: false,
    theme: isDark ? 'dark' : 'default',
    themeVariables: {
      ...THEME_CONFIG,
      primaryColor: isDark ? '#1f2937' : '#f9fafb',
      primaryTextColor: isDark ? '#f9fafb' : '#1f2937',
    },
  })
}

/**
 * Process HTML to transform mermaid code blocks into renderable containers
 */
export function processMermaidBlocks(html: string): string {
  let counter = 0
  return html.replace(
    /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
    (_match, content) => {
      const decoded = decodeHtmlEntities(content)
      const id = `mermaid-diagram-${++counter}`
      return `<div class="mermaid-container"><div class="mermaid" id="${id}" data-source-encoded="${encodeURIComponent(decoded)}">${escapeHtml(decoded)}</div></div>`
    },
  )
}
