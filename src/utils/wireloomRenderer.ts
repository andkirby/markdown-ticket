/**
 * Optional Wireloom renderer — dynamic import with graceful fallback.
 *
 * If `wireloom` is not installed, all calls are no-ops and wireloom
 * code blocks render as plain `<pre><code>` blocks.
 *
 * Pattern:
 * 1. Fence plugin emits `<div class="wireloom-pending">` placeholders.
 * 2. Post-render hook calls renderWireloomElements() to async-render.
 * 3. On theme-change, already-rendered `.wireloom` divs are re-rendered.
 */

/** Cache: source+theme → rendered SVG or error HTML */
const cache = new Map<string, string>()

/** Lazy-loaded wireloom module (null = not loaded yet) */
let wireloomModule: typeof import('wireloom') | null | undefined

/**
 * Try to dynamically import wireloom. Returns null if not installed.
 */
async function loadWireloom(): Promise<typeof import('wireloom') | null> {
  if (wireloomModule !== undefined)
    return wireloomModule
  try {
    wireloomModule = await import('wireloom')
    return wireloomModule
  }
  catch {
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

function getCacheKey(source: string, theme: string): string {
  return `${theme}:${source}`
}

function isDarkMode(): boolean {
  return typeof document !== 'undefined'
    && document.documentElement.classList.contains('dark')
}

function decodeSource(encoded: string): string {
  return decodeURIComponent(escape(atob(encoded)))
}

/**
 * Render Wireloom elements in a container.
 *
 * Handles two cases:
 * 1. `.wireloom-pending` — initial render of placeholders
 * 2. `.wireloom[data-source-encoded]` — re-render on theme change
 *
 * Falls back to plain code blocks when wireloom is not installed.
 */
export async function renderWireloomElements(container: HTMLElement): Promise<void> {
  const pending = container.querySelectorAll('.wireloom-pending')
  const rendered = container.querySelectorAll('.wireloom[data-source-encoded]')
  const allTargets = [...Array.from(pending), ...Array.from(rendered)]

  if (allTargets.length === 0)
    return

  const theme = isDarkMode() ? 'dark' : 'default'
  const mod = await loadWireloom()

  if (!mod) {
    // Wireloom not installed — replace pending placeholders with plain code blocks
    // (already-rendered divs are left as-is since they show the source)
    pending.forEach((el) => {
      const source = decodeSource(el.getAttribute('data-source-encoded') ?? '')
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
  for (const el of allTargets) {
    const encoded = el.getAttribute('data-source-encoded') ?? ''
    const source = decodeSource(encoded)
    const key = getCacheKey(source, theme)

    // Use cache if available (avoids re-rendering on every theme toggle)
    const cached = cache.get(key)
    if (cached !== undefined) {
      const wrapper = document.createElement('div')
      wrapper.className = 'wireloom'
      wrapper.setAttribute('data-source-encoded', encoded)
      wrapper.innerHTML = cached
      el.replaceWith(wrapper)
      continue
    }

    try {
      const { svg } = await mod.default.render(`wireloom-${i++}-${Date.now()}`, source, { theme })
      cache.set(key, svg)
      const wrapper = document.createElement('div')
      wrapper.className = 'wireloom'
      wrapper.setAttribute('data-source-encoded', encoded)
      wrapper.innerHTML = svg
      el.replaceWith(wrapper)
    }
    catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const errorDiv = document.createElement('div')
      errorDiv.className = 'wireloom-error'
      errorDiv.textContent = msg
      el.replaceWith(errorDiv)
    }
  }
}
