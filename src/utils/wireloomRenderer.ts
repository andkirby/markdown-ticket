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
import type { RenderResult, Document as WireloomDocument } from 'wireloom'
import { addWireloomFullscreenButtons } from './wireloomFullscreen'

export const WIRELOOM_RENDER_THEME = {
  LIGHT: 'default',
  DARK: 'dark',
} as const

export const WIRELOOM_ANNOTATION_MAX_LINE_CHARS = 28

export type WireloomRenderTheme = typeof WIRELOOM_RENDER_THEME[keyof typeof WIRELOOM_RENDER_THEME]

export interface WireloomRenderOptions {
  theme: WireloomRenderTheme
}

/** Cache: source+theme → rendered SVG */
const cache = new Map<string, string>()

export interface WireloomModule {
  default: {
    parse?: (source: string) => WireloomDocument
    render: (id: string, source: string, options: WireloomRenderOptions) => Promise<RenderResult>
    serialize?: (doc: WireloomDocument) => string
  }
}

export interface RenderWireloomElementsOptions {
  loadWireloom?: () => Promise<WireloomModule | null>
  now?: () => number
}

/** Lazy-loaded wireloom module (null = not loaded yet) */
let wireloomModule: WireloomModule | null | undefined

/**
 * Try to dynamically import wireloom. Returns null if not installed.
 */
async function loadWireloom(): Promise<WireloomModule | null> {
  if (wireloomModule !== undefined)
    return wireloomModule
  try {
    wireloomModule = await import('wireloom') as unknown as WireloomModule
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
  return `${theme}:${WIRELOOM_ANNOTATION_MAX_LINE_CHARS}:${source}`
}

function isDarkMode(): boolean {
  return typeof document !== 'undefined'
    && document.documentElement.classList.contains('dark')
}

export function getWireloomRenderOptions(): WireloomRenderOptions {
  return {
    theme: isDarkMode() ? WIRELOOM_RENDER_THEME.DARK : WIRELOOM_RENDER_THEME.LIGHT,
  }
}

function wrapAnnotationLine(line: string, maxLineChars: number): string {
  const words = line.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0)
    return ''

  const lines: string[] = []
  let current = ''

  for (const word of words) {
    if (current === '') {
      current = word
    }
    else if (`${current} ${word}`.length <= maxLineChars) {
      current = `${current} ${word}`
    }
    else {
      lines.push(current)
      current = word
    }
  }

  if (current)
    lines.push(current)

  return lines.join('\n')
}

function wrapAnnotationBody(body: string, maxLineChars: number): string {
  return body
    .split('\n')
    .map(line => line.length > maxLineChars ? wrapAnnotationLine(line, maxLineChars) : line)
    .join('\n')
}

export function compactWireloomAnnotations(
  source: string,
  mod: WireloomModule,
  maxLineChars = WIRELOOM_ANNOTATION_MAX_LINE_CHARS,
): string {
  if (!mod.default.parse || !mod.default.serialize)
    return source

  const doc = mod.default.parse(source)
  if (!doc.annotations || doc.annotations.length === 0)
    return source

  let changed = false
  for (const annotation of doc.annotations) {
    const compactBody = wrapAnnotationBody(annotation.body, maxLineChars)
    if (compactBody !== annotation.body) {
      annotation.body = compactBody
      changed = true
    }
  }

  return changed ? mod.default.serialize(doc) : source
}

function decodeSource(encoded: string): string {
  return decodeURIComponent(escape(atob(encoded)))
}

function createWireloomWrapper(encoded: string, svg: string): HTMLDivElement {
  const wrapper = document.createElement('div')
  const diagram = document.createElement('div')

  wrapper.className = 'wireloom'
  wrapper.setAttribute('data-source-encoded', encoded)
  diagram.className = 'wireloom__diagram'
  diagram.innerHTML = svg
  wrapper.appendChild(diagram)

  return wrapper
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error)
    return err.message

  if (err && typeof err === 'object' && 'message' in err) {
    const message = (err as Record<string, unknown>).message
    if (typeof message === 'string')
      return message
  }

  return String(err)
}

function getErrorNumberProperty(err: unknown, property: 'line' | 'column'): number | undefined {
  if (!err || typeof err !== 'object' || !Object.prototype.propertyIsEnumerable.call(err, property))
    return undefined

  const value = (err as Record<string, unknown>)[property]
  return typeof value === 'number' ? value : undefined
}

export function formatWireloomError(err: unknown): string {
  const message = getErrorMessage(err)
  const line = getErrorNumberProperty(err, 'line')
  const column = getErrorNumberProperty(err, 'column')

  if (line !== undefined && column !== undefined)
    return `Wireloom line ${line}, column ${column}: ${message}`

  if (line !== undefined)
    return `Wireloom line ${line}: ${message}`

  return message
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
export async function renderWireloomElements(
  container: HTMLElement,
  options: RenderWireloomElementsOptions = {},
): Promise<void> {
  const pending = container.querySelectorAll('.wireloom-pending')
  const rendered = container.querySelectorAll('.wireloom[data-source-encoded]')
  const allTargets = [...Array.from(pending), ...Array.from(rendered)]

  if (allTargets.length === 0)
    return

  const renderOptions = getWireloomRenderOptions()
  const mod = await (options.loadWireloom ?? loadWireloom)()

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
    const key = getCacheKey(source, renderOptions.theme)

    // Use cache if available (avoids re-rendering on every theme toggle)
    const cached = cache.get(key)
    if (cached !== undefined) {
      const wrapper = createWireloomWrapper(encoded, cached)
      el.replaceWith(wrapper)
      continue
    }

    try {
      const compactSource = compactWireloomAnnotations(source, mod)
      const { svg } = await mod.default.render(`wireloom-${i++}-${options.now?.() ?? Date.now()}`, compactSource, renderOptions)
      cache.set(key, svg)
      const wrapper = createWireloomWrapper(encoded, svg)
      el.replaceWith(wrapper)
    }
    catch (err) {
      const errorDiv = document.createElement('div')
      errorDiv.className = 'wireloom-error'
      errorDiv.textContent = formatWireloomError(err)
      el.replaceWith(errorDiv)
    }
  }

  addWireloomFullscreenButtons(container)
}
