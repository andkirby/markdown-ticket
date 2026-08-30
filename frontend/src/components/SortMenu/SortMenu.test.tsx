import type { SortMenuAttribute } from './index'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, mock } from 'bun:test'
import { Calendar1, FileText, Ticket } from 'lucide-react'
import { SortMenu } from './index'

const attributes: SortMenuAttribute[] = [
  { name: 'code', label: 'Key', icon: Ticket, defaultDirection: 'desc' },
  { name: 'created', label: 'Created', icon: Calendar1, defaultDirection: 'desc' },
  { name: 'name', label: 'Filename', icon: FileText, defaultDirection: 'asc' },
]

function setup(overrides: Partial<Parameters<typeof SortMenu>[0]> = {}) {
  const onChange = mock(() => {})
  const props = {
    attributes,
    value: 'code',
    direction: 'desc' as const,
    onChange,
    ...overrides,
  }
  return { props, ...render(<SortMenu {...props} />) }
}

describe('SortMenu', () => {
  afterEach(cleanup)

  it('renders the selected attribute label in variant a', () => {
    setup()
    const trigger = screen.getByTestId('sort-menu-trigger')
    expect(trigger.textContent).toBe('Key')
  })

  it('hides the label and direction stays a segment in variant b', () => {
    setup({ variant: 'b' })
    const trigger = screen.getByTestId('sort-menu-trigger')
    expect(trigger.textContent).toBe('')
    expect(screen.getByTestId('sort-menu-direction')).toBeTruthy()
  })

  it('variant c drops the direction segment and puts direction rows in the menu', () => {
    setup({ variant: 'c' })
    expect(screen.queryByTestId('sort-menu-direction')).toBeNull()

    fireEvent.click(screen.getByTestId('sort-menu-trigger'))
    const options = screen.getAllByTestId('sort-menu-option').map(o => o.dataset.value)
    expect(options).toEqual(['code', 'created', 'name', 'asc', 'desc'])
  })

  it('selecting an attribute applies its defaultDirection and closes', () => {
    const { props } = setup()
    fireEvent.click(screen.getByTestId('sort-menu-trigger'))
    fireEvent.click(screen.getAllByTestId('sort-menu-option').find(o => o.dataset.value === 'name')!)

    expect(props.onChange).toHaveBeenCalledWith('name', 'asc')
    expect(screen.queryByTestId('sort-menu-option')).toBeNull()
  })

  it('direction segment flips without opening the menu', () => {
    const { props } = setup({ direction: 'asc' })
    fireEvent.click(screen.getByTestId('sort-menu-direction'))

    expect(props.onChange).toHaveBeenCalledWith('code', 'desc')
    expect(screen.queryByTestId('sort-menu-option')).toBeNull()
  })

  it('variant c direction row sets direction', () => {
    const { props } = setup({ variant: 'c' })
    fireEvent.click(screen.getByTestId('sort-menu-trigger'))
    fireEvent.click(screen.getAllByTestId('sort-menu-option').find(o => o.dataset.value === 'asc')!)

    expect(props.onChange).toHaveBeenCalledWith('code', 'asc')
  })

  it('closes on Escape and outside pointerdown', () => {
    setup()
    fireEvent.click(screen.getByTestId('sort-menu-trigger'))
    expect(screen.getAllByTestId('sort-menu-option').length).toBe(attributes.length)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByTestId('sort-menu-option')).toBeNull()

    fireEvent.click(screen.getByTestId('sort-menu-trigger'))
    fireEvent.pointerDown(document.body)
    expect(screen.queryByTestId('sort-menu-option')).toBeNull()
  })

  it('marks the selected option aria-selected', () => {
    setup()
    fireEvent.click(screen.getByTestId('sort-menu-trigger'))
    const selected = screen
      .getAllByTestId('sort-menu-option')
      .find(o => o.getAttribute('aria-selected') === 'true')
    expect(selected?.dataset.value).toBe('code')
  })
})
