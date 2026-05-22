import type { SubDocument } from '@mdt/shared/models/SubDocument'
import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, mock } from 'bun:test'
import { TicketDocumentTabs } from './TicketDocumentTabs'

const subdocuments: SubDocument[] = [
  {
    name: 'prep',
    kind: 'folder',
    children: [
      {
        name: 'requirements',
        kind: 'file',
        filePath: 'MDT-093/prep/requirements.md',
        children: [],
      },
    ],
  },
]

describe('TicketDocumentTabs', () => {
  afterEach(() => {
    cleanup()
  })

  it('reports the rendered tab navigation height for anchor offsets', async () => {
    const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect
    HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
      if ((this as HTMLElement).dataset.testid === 'subdoc-tabs') {
        return {
          bottom: 72,
          height: 72,
          left: 0,
          right: 0,
          top: 0,
          width: 320,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }
      }

      return originalGetBoundingClientRect.call(this)
    }

    const onHeightChange = mock(() => undefined)

    try {
      render(
        <TicketDocumentTabs
          subdocuments={subdocuments}
          selectedPath="prep/requirements"
          folderStack={['prep']}
          onSelect={mock(() => undefined)}
          ticketCode="MDT-093"
          onHeightChange={onHeightChange}
        />,
      )

      await waitFor(() => {
        expect(onHeightChange).toHaveBeenCalledWith(72)
      })
    }
    finally {
      HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect
    }
  })
})
