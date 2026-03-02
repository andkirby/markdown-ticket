/**
 * SSE Helper Utilities for E2E Testing - MDT-128 Task 11
 *
 * This module provides utilities for testing Server-Sent Events (SSE)
 * functionality using file system modifications.
 *
 * @see tests/e2e/sse/updates.spec.ts for usage examples
 * @see docs/CRs/MDT-106*.md for SSE architecture
 */

import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { promises as fs } from 'fs'
import { join as pathJoin } from 'path'

export interface TicketModification {
  title?: string
  status?: string
  priority?: string
  type?: string
  content?: string
}

export interface SSEEvent {
  type: string
  data: Record<string, unknown>
}

const SSE_TIMEOUT_MS = 5000
const POLL_INTERVAL_MS = 100

/**
 * Modify ticket file on disk
 *
 * Parses YAML frontmatter from the ticket file, applies modifications,
 * and writes the file back to disk. This triggers the file watcher
 * which broadcasts SSE events.
 *
 * @param projectDir - Project directory path
 * @param ticketCode - Ticket code (e.g., 'TABC-1')
 * @param modifications - Fields to modify
 * @returns Promise that resolves when file is written
 */
export async function modifyTicketFile(
  projectDir: string,
  ticketCode: string,
  modifications: TicketModification,
): Promise<void> {
  const ticketsPath = pathJoin(projectDir, 'docs', 'CRs', `${ticketCode}.md`)

  // Read existing file
  const content = await fs.readFile(ticketsPath, 'utf-8')

  // Parse frontmatter and content
  const frontmatterMatch = content.match(/^---\n([\s\S]+?)\n---/)
  if (!frontmatterMatch) {
    throw new Error(`Invalid ticket file format: ${ticketsPath}`)
  }

  const frontmatter = frontmatterMatch[1]
  const bodyContent = content.slice(frontmatterMatch[0].length).trimStart()

  // Apply modifications to frontmatter using simple regex replacement
  let updatedFrontmatter = frontmatter

  if (modifications.title !== undefined) {
    updatedFrontmatter = replaceYamlField(updatedFrontmatter, 'title', modifications.title)
  }

  if (modifications.status !== undefined) {
    updatedFrontmatter = replaceYamlField(updatedFrontmatter, 'status', modifications.status)
  }

  if (modifications.priority !== undefined) {
    updatedFrontmatter = replaceYamlField(updatedFrontmatter, 'priority', modifications.priority)
  }

  if (modifications.type !== undefined) {
    updatedFrontmatter = replaceYamlField(updatedFrontmatter, 'type', modifications.type)
  }

  // Determine body content
  const updatedBody = modifications.content !== undefined
    ? modifications.content
    : bodyContent

  // Reconstruct file with modified frontmatter
  const updatedContent = `---\n${updatedFrontmatter}\n---\n\n${updatedBody}`

  // Write back to disk (this triggers the file watcher)
  await fs.writeFile(ticketsPath, updatedContent, 'utf-8')
}

/**
 * Replace a YAML field value using regex
 *
 * Handles both quoted and unquoted values.
 */
function replaceYamlField(frontmatter: string, field: string, value: string): string {
  // Match field with quoted value: field: "value" or field: 'value'
  const quotedPattern = new RegExp(`^${field}: ["'](.+?)["']$`, 'm')
  // Match field with unquoted value: field: value
  const unquotedPattern = new RegExp(`^${field}: (.+?)$`, 'm')

  if (quotedPattern.test(frontmatter)) {
    return frontmatter.replace(quotedPattern, `${field}: "${value}"`)
  }

  if (unquotedPattern.test(frontmatter)) {
    return frontmatter.replace(unquotedPattern, `${field}: "${value}"`)
  }

  // Field doesn't exist, append it
  return `${frontmatter}\n${field}: "${value}"`
}

/**
 * Set up SSE event capture on the page
 *
 * Injects a script that creates an EventSource listener and stores
 * all received events in window.__sseEvents.
 */
async function setupSSECapture(page: Page): Promise<void> {
  await page.evaluate(() => {
    // Initialize event storage if not exists
    if (!window.__sseEvents) {
      window.__sseEvents = []
    }

    // Only set up listener once
    if (window.__sseListenerActive) {
      return
    }

    // Create EventSource connection
    const eventSource = new EventSource('/api/events')

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        window.__sseEvents.push({
          type: data.type,
          data: data.data,
        })
      } catch {
        // Ignore parse errors
      }
    }

    eventSource.onerror = () => {
      // Connection errors are expected during tests
    }

    window.__sseListenerActive = true
    window.__sseEventSource = eventSource
  })
}

/**
 * Wait for SSE event on page
 *
 * Sets up SSE capture if not already active, then polls for an event
 * matching the specified type and optional matcher criteria.
 *
 * @param page - Playwright page instance
 * @param eventType - Expected event type (e.g., 'file-change')
 * @param matcher - Optional matcher for event data
 * @returns Promise that resolves when matching event is received
 */
export async function waitForSSEEvent(
  page: Page,
  eventType: string,
  matcher?: Record<string, unknown>,
): Promise<void> {
  await setupSSECapture(page)

  const startTime = Date.now()

  while (Date.now() - startTime < SSE_TIMEOUT_MS) {
    const found = await page.evaluate(
      ({ eventType: type, matcher: match }) => {
        const events = window.__sseEvents || []

        for (const event of events) {
          if (event.type !== type) {
            continue
          }

          // If no matcher, any event of this type matches
          if (!match) {
            return true
          }

          // Check if all matcher criteria match
          const data = event.data as Record<string, unknown>
          const matches = Object.entries(match).every(([key, value]) => {
            return data[key] === value
          })

          if (matches) {
            return true
          }
        }

        return false
      },
      { eventType, matcher },
    )

    if (found) {
      return
    }

    // Wait before polling again
    await page.waitForTimeout(POLL_INTERVAL_MS)
  }

  // Timeout - build helpful error message
  const capturedEvents = await captureSSEEvents(page)
  const eventSummary = capturedEvents.length > 0
    ? JSON.stringify(capturedEvents, null, 2)
    : 'No events captured'

  throw new Error(
    `Timeout waiting for SSE event type "${eventType}"${matcher ? ` with matcher ${JSON.stringify(matcher)}` : ''}.\nCaptured events:\n${eventSummary}`,
  )
}

/**
 * Assert that SSE event was received
 *
 * Checks captured events for a match and throws an assertion error
 * if not found. Uses Playwright's expect() pattern for consistency.
 *
 * @param page - Playwright page instance
 * @param eventType - Expected event type
 * @param matcher - Optional matcher for event data
 */
export async function assertSSEReceived(
  page: Page,
  eventType: string,
  matcher?: Record<string, unknown>,
): Promise<void> {
  await setupSSECapture(page)

  const events = await captureSSEEvents(page)

  const found = events.some((event) => {
    if (!isSSEEvent(event) || event.type !== eventType) {
      return false
    }

    // If no matcher, any event of this type matches
    if (!matcher) {
      return true
    }

    // Check if all matcher criteria match
    return Object.entries(matcher).every(([key, value]) => {
      return event.data[key] === value
    })
  })

  const matcherDesc = matcher ? ` with matcher ${JSON.stringify(matcher)}` : ''
  const eventSummary = events.length > 0
    ? JSON.stringify(events, null, 2)
    : 'No events captured'

  expect(found, `Expected SSE event "${eventType}"${matcherDesc} to be received.\nCaptured events:\n${eventSummary}`).toBe(true)
}

/**
 * Type guard for SSEEvent
 */
function isSSEEvent(value: unknown): value is SSEEvent {
  return (
    value !== null
    && typeof value === 'object'
    && 'type' in value
    && 'data' in value
    && typeof (value as SSEEvent).type === 'string'
    && typeof (value as SSEEvent).data === 'object'
  )
}

/**
 * Capture all SSE events for inspection
 *
 * Returns a copy of all captured SSE events and clears the buffer.
 *
 * @param page - Playwright page instance
 * @returns Promise resolving to array of captured events
 */
export async function captureSSEEvents(page: Page): Promise<unknown[]> {
  await setupSSECapture(page)

  const events = await page.evaluate(() => {
    const captured = [...(window.__sseEvents || [])]
    // Clear buffer after reading
    window.__sseEvents = []
    return captured
  })

  return events
}
