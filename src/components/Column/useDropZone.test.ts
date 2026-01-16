import type { Ticket } from '../../types'
import { renderHook } from '@testing-library/react'
import { useDropZone } from './useDropZone'

// Mock react-dnd
jest.mock('react-dnd', () => ({
  useDrop: jest.fn(() => ({
    drop: jest.fn(),
    isOver: false,
    canDrop: true,
    draggedItem: null,
  })),
}))

/* eslint-disable ts/no-require-imports */
describe('useDropZone', () => {
  const mockTicket: Ticket = {
    code: 'MDT-001',
    title: 'Test Ticket',
    status: 'Proposed',
    type: 'Feature Enhancement',
    priority: 'Medium',
    dateCreated: null,
    lastModified: null,
    content: '',
    filePath: 'docs/CRs/MDT-001.md',
    relatedTickets: [],
    dependsOn: [],
    blocks: [],
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should provide drop zone API', () => {
    const onDrop = jest.fn()
    const { result } = renderHook(() => useDropZone({ onDrop }))

    expect(result.current).toHaveProperty('drop')
    expect(result.current).toHaveProperty('isOver')
    expect(result.current).toHaveProperty('canDrop')
    expect(result.current).toHaveProperty('draggedItem')
  })

  it('should use default accept type of "ticket"', () => {
    const onDrop = jest.fn()
    const useDrop = require('react-dnd').useDrop

    renderHook(() => useDropZone({ onDrop }))

    expect(useDrop).toHaveBeenCalledWith(
      expect.objectContaining({
        accept: 'ticket',
      }),
    )
  })

  it('should pass custom accept type', () => {
    const onDrop = jest.fn()
    const useDrop = require('react-dnd').useDrop

    renderHook(() => useDropZone({
      onDrop,
      accept: ['ticket', 'card'],
    }))

    expect(useDrop).toHaveBeenCalledWith(
      expect.objectContaining({
        accept: ['ticket', 'card'],
      }),
    )
  })

  it('should call onDrop when item is dropped', () => {
    const onDrop = jest.fn()
    const useDrop = require('react-dnd').useDrop

    // Get the drop function from the mock
    const dropFn = jest.fn().mockReturnValue({ handled: true })
    useDrop.mockReturnValue({
      drop: dropFn,
      isOver: false,
      canDrop: true,
      draggedItem: null,
    })

    renderHook(() => useDropZone({ onDrop }))

    // Get the drop handler that was passed to react-dnd's useDrop
    const dropHandler = useDrop.mock.calls[0][0].drop

    // Simulate a drop
    const mockItem = { ticket: mockTicket }
    dropHandler(mockItem)

    expect(onDrop).toHaveBeenCalledWith(mockItem)
  })

  it('should mark drop as handled when markHandled is true', () => {
    const onDrop = jest.fn()
    const useDrop = require('react-dnd').useDrop

    // Get the drop function from the mock
    const dropFn = jest.fn()
    useDrop.mockReturnValue({
      drop: dropFn,
      isOver: false,
      canDrop: true,
      draggedItem: null,
    })

    renderHook(() => useDropZone({
      onDrop,
      markHandled: true,
    }))

    // Get the drop handler that was passed to react-dnd's useDrop
    const dropHandler = useDrop.mock.calls[1][0].drop

    // Simulate a drop
    const mockItem = { ticket: mockTicket }
    const result = dropHandler(mockItem)

    expect(result).toEqual({ handled: true })
  })

  it('should preserve custom drop result', () => {
    const onDrop = jest.fn().mockReturnValue({ custom: 'data' })
    const useDrop = require('react-dnd').useDrop

    // Get the drop function from the mock
    const dropFn = jest.fn()
    useDrop.mockReturnValue({
      drop: dropFn,
      isOver: false,
      canDrop: true,
      draggedItem: null,
    })

    renderHook(() => useDropZone({
      onDrop,
      markHandled: true,
    }))

    // Get the drop handler that was passed to react-dnd's useDrop
    const dropHandler = useDrop.mock.calls[1][0].drop

    // Simulate a drop
    const mockItem = { ticket: mockTicket }
    const result = dropHandler(mockItem)

    expect(result).toEqual({ custom: 'data', handled: true })
  })
})
