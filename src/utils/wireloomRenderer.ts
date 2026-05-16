/**
 * Optional Wireloom renderer — dynamic import with graceful fallback.
 *
 * If `wireloom` is not installed, all calls are no-ops and wireloom
 * code blocks render as plain `<pre><code>` blocks.
 *
 * Pattern: module-level cache persists across renders.
 * 1. Fence plugin emits `<div class="wireloom-pending">` placeholders.
 * 2. Post-render hook calls renderWireloomBlocks() to async-render.
 * 3. Placeholder divs are replaced with rendered SVGs.
 */

/** Cache: source hash → rendered SVG or error HTML */
const cache = new Map<string, string>()

/** Lazy-loaded wireloom module (null = not loaded yet) */
let wireloomModule: typeof import('wireloom') | null | undefined = undefined

/**
 * Try to dynamically import wireloom. Returns null if not installed.
 */
async function loadWireloom(): Promise<typeof import('wireloom') | null> {
  if (wireloomModule !== undefined) return wireloomModule
  try {
    wireloomModule = await import('wireloom')
    return wireloomModule
  } catch {
    wireloomModule = null
    return null
  }
}

/**
 * Check if wireloom is available (triggers load if not yet attempted).
 */
export async function isWireloomAvailable(): Promise<boolean> {
  const mod = await loadWireloom()
  return mod !== null
}

/**
 * Pre-render wireloom blocks and populate cache.
 * Called before markdown-it render so the fence plugin can use cached results.
 *
 * This is a no-op if wireloom is not installed.
 */
export async function prepareWireloomBlocks(markdown: string): Promise<void> {
  // Quick check: any wireloom blocks at all?
  if (!markdown.includes('```wireloom')) return

  const mod = await loadWireloom()
  if (!mod) return

  const fenceRe = /```wireloom(?:\s.*?)?\n([\s\S]*?)```/g
  const matches = [...markdown.matchAll(fenceRe)]

  await Promise.all(matches.map(async (match, i) => {
    const source = match[1]!
    const key = source

    if (cache.has(key)) return

    try {
      const { svg } = await mod.default.render(`wireloom-${i}-${Date.now()}`, source)
      cache.set(key, svg)
    } catch (err) {
      const msg = err instanceof Error
        ? err.message
        : String(err)
      cache.set(key, `<div class="wireloom-error">${escapeForAttribute(msg)}</div>`)
    }
  }))
}

/**
 * Look up a pre-rendered wireloom SVG from cache.
 * Returns undefined if not cached (renders as plain code block).
 */
export function getWireloomSvg(source: string): string | undefined {
  return cache.get(source)
}

/**
 * Render all `.wireloom-pending` placeholders in a container element.
 * Called from post-render hook after the HTML is mounted to the DOM.
 *
 * This handles the async case where wireloom wasn't cached during
 * the initial markdown-it render.
 */
export async function renderWireloomElements(container: HTMLElement): Promise<void> {
  const pending = container.querySelectorAll('.wireloom-pending')
  if (pending.length === 0) return

  const mod = await loadWireloom()
  if (!mod) {
    // Wireloom not installed — replace placeholders with plain code blocks
    pending.forEach((el) => {
      const encoded = el.getAttribute('data-source-encoded') ?? ''
      const source = decodeURIComponent(escape(atob(encoded)))
      const pre = document.createElement('pre')
      const code = document.createElement('code')
      code.className = 'language-wireloom'
      code.textContent = source
      pre.appendChild(code)
      el.replaceWith(pre)
    })
    return
  }

  let i = 0
  for (const el of pending) {
    const encoded = el.getAttribute('data-source-encoded') ?? ''
    const source = decodeURIComponent(escape(atob(encoded)))
    try {
      const { svg } = await mod.default.render(`wireloom-pr-${i++}`, source)
      const wrapper = document.createElement('div')
      wrapper.className = 'wireloom'
      wrapper.innerHTML = svg
      el.replaceWith(wrapper)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const errorDiv = document.createElement('div')
      errorDiv.className = 'wireloom-error'
      errorDiv.textContent = msg
      el.replaceWith(errorDiv)
    }
  }
}

function escapeForAttribute(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
