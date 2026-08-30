import type { Project } from '@mdt/shared/models/Project'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { useState } from 'react'
import { ReadAccessTokens } from './ReadAccessTokens'

const fetchMock = mock(async () => new Response('{}'))

function createProject(): Project {
  return {
    id: 'MDT',
    project: {
      id: 'MDT',
      name: 'Markdown Ticket',
      code: 'MDT',
      path: '/tmp/markdown-ticket',
      configFile: '.mdt-config.toml',
      active: true,
      description: '',
      repository: '',
      ticketsPath: 'docs/CRs',
    },
    metadata: {
      dateRegistered: '2026-05-23',
      lastAccessed: '2026-05-23',
      version: '1.0.0',
      sharing: { mode: 'private' },
    },
  }
}

function ReadAccessHarness() {
  const [linkOrigin, setLinkOrigin] = useState('http://localhost:6173')

  return (
    <>
      <div data-testid="link-origin">{linkOrigin}</div>
      <ReadAccessTokens
        projects={[createProject()]}
        linkOrigin={linkOrigin}
        onLinkOriginChange={setLinkOrigin}
      />
    </>
  )
}

describe('ReadAccessTokens', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    fetchMock.mockImplementation(async (input) => {
      const url = String(input)
      if (url.endsWith('/invites')) {
        return new Response(JSON.stringify({
          inviteUrl: 'https://share.example.com/invite/invite-code',
        }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({
        tokens: [{
          id: 'read-token-1',
          name: 'Bob',
          projectRefs: ['MDT'],
          expiresAt: null,
          status: 'active',
        }],
        linkOrigins: {
          options: ['https://share.example.com'],
          selectedOrigin: 'https://share.example.com',
        },
      }), {
        headers: { 'Content-Type': 'application/json' },
      })
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch
  })

  afterEach(() => {
    cleanup()
    fetchMock.mockReset()
    globalThis.fetch = originalFetch
  })

  it('uses the server-selected origin without rendering an owner origin picker', async () => {
    render(<ReadAccessHarness />)

    await waitFor(() => {
      expect(screen.getByTestId('link-origin').textContent).toBe('https://share.example.com')
    })
    expect(screen.queryByTestId('sharing-link-origin-select')).toBeNull()

    fireEvent.click(await screen.findByTestId('sharing-generate-invite'))

    await waitFor(() => {
      expect(screen.getByTestId('sharing-invite-url')).toBeTruthy()
    })
    const inviteRequest = fetchMock.mock.calls.find(call => String(call[0]).endsWith('/invites'))
    expect(JSON.parse(String(inviteRequest?.[1]?.body))).toEqual({
      origin: 'https://share.example.com',
    })
  })
})
