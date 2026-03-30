import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, setSystemTime } from 'bun:test'
import { formatFullDateTime } from '../../utils/dateFormat'
import { RelativeTimestamp } from './RelativeTimestamp'

const REAL_NOW = new Date()
const FIXED_NOW = new Date('2026-03-23T12:00:00Z')

describe('RelativeTimestamp', () => {
  beforeEach(() => {
    setSystemTime(FIXED_NOW)
  })

  afterEach(() => {
    cleanup()
    setSystemTime(REAL_NOW)
  })

  it('renders updated time by default when updatedAt exists', () => {
    render(
      <RelativeTimestamp
        createdAt="2026-03-20T12:00:00Z"
        updatedAt="2026-03-21T12:00:00Z"
      />,
    )

    expect(screen.getByRole('button')).toHaveTextContent('Updated 2 days ago')
  })

  it('falls back to created time when updatedAt is unavailable', () => {
    render(
      <RelativeTimestamp createdAt="2026-03-20T12:00:00Z" />,
    )

    const button = screen.getByRole('button')
    expect(button).toHaveTextContent('Created 3 days ago')
    expect(button).toHaveClass('cursor-default')
  })

  it('toggles between updated and created when both timestamps exist', () => {
    render(
      <RelativeTimestamp
        createdAt="2026-03-20T12:00:00Z"
        updatedAt="2026-03-21T12:00:00Z"
      />,
    )

    const button = screen.getByRole('button')
    expect(button).toHaveTextContent('Updated 2 days ago')

    fireEvent.click(button)
    expect(button).toHaveTextContent('Created 3 days ago')

    fireEvent.click(button)
    expect(button).toHaveTextContent('Updated 2 days ago')
  })

  it('does not toggle when only one timestamp exists', () => {
    render(
      <RelativeTimestamp createdAt="2026-03-20T12:00:00Z" />,
    )

    const button = screen.getByRole('button')
    fireEvent.click(button)

    expect(button).toHaveTextContent('Created 3 days ago')
  })

  it('shows a tooltip with the full localized datetime for the active timestamp', async () => {
    const updatedAt = '2026-03-21T12:00:00Z'

    render(
      <RelativeTimestamp
        createdAt="2026-03-20T12:00:00Z"
        updatedAt={updatedAt}
      />,
    )

    fireEvent.focus(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toHaveTextContent(formatFullDateTime(updatedAt))
    })
  })

  it('shows the toggled timestamp value in the tooltip', async () => {
    const createdAt = '2026-03-20T12:00:00Z'
    const updatedAt = '2026-03-21T12:00:00Z'

    render(
      <RelativeTimestamp
        createdAt={createdAt}
        updatedAt={updatedAt}
      />,
    )

    const button = screen.getByRole('button')
    fireEvent.click(button)
    fireEvent.blur(button)
    fireEvent.focus(button)

    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toHaveTextContent(formatFullDateTime(createdAt))
    })
  })

  it('renders nothing when no timestamps are available', () => {
    const { container } = render(<RelativeTimestamp />)

    expect(container).toBeEmptyDOMElement()
  })
})
