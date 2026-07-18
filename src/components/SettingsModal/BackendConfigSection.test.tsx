import type { ConfigSelectorDescriptor } from '../../config/configApiClient'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'

// Mock the hook so the section never reaches the network.
const stageEdit = mock((_selector: string, _value: unknown) => {})
const applyOne = mock(async (_selector: string) => true)
const useBackendConfig = mock(() => ({
  selectors: [] as ConfigSelectorDescriptor[],
  loading: false,
  loadError: null,
  pendingEdits: {},
  saveStatus: 'idle' as const,
  fieldErrors: {},
  stageEdit,
  discardEdits: mock(() => {}),
  applyOne,
  reload: mock(async () => {}),
}))

mock.module('../../hooks/useBackendConfig', () => ({ useBackendConfig }))

// eslint-disable-next-line import/first
import { BackendConfigSection } from './BackendConfigSection'

describe('BackendConfigSection', () => {
  beforeEach(() => {
    useBackendConfig.mockClear()
    stageEdit.mockClear()
    applyOne.mockClear()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders nothing when disabled (read-only visitor)', () => {
    const { container } = render(<BackendConfigSection enabled={false} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders editable backend selectors when enabled', async () => {
    useBackendConfig.mockReturnValue({
      selectors: [
        {
          selector: 'links.enableTicketLinks',
          scope: 'global',
          exposure: 'editable',
          ownerSurface: 'settings',
          validation: 'Boolean.',
          value: true,
        },
      ],
      loading: false,
      loadError: null,
      pendingEdits: {},
      saveStatus: 'idle',
      fieldErrors: {},
      stageEdit,
      discardEdits: () => {},
      applyOne,
      reload: async () => {},
    })
    render(<BackendConfigSection enabled={true} />)
    await waitFor(() => {
      expect(screen.getByTestId('backend-config-section')).toBeDefined()
    })
    expect(screen.getByText('links.enableTicketLinks')).toBeDefined()
  })

  it('stages an edit on input change', async () => {
    useBackendConfig.mockReturnValue({
      selectors: [
        {
          selector: 'links.enableTicketLinks',
          scope: 'global',
          exposure: 'editable',
          ownerSurface: 'settings',
          validation: 'Boolean.',
          value: true,
        },
      ],
      loading: false,
      loadError: null,
      pendingEdits: {},
      saveStatus: 'idle',
      fieldErrors: {},
      stageEdit,
      discardEdits: () => {},
      applyOne,
      reload: async () => {},
    })
    render(<BackendConfigSection enabled={true} />)
    await waitFor(() => {
      expect(screen.getByTestId('backend-config-section')).toBeDefined()
    })
    // Toggle the checkbox — use click which is the canonical checkbox toggle.
    const input = screen.getByTestId(
      'backend-cfg-input-links.enableTicketLinks',
    ) as HTMLInputElement
    fireEvent.click(input)
    expect(stageEdit).toHaveBeenCalledWith('links.enableTicketLinks', false)
  })

  it('shows a field error when present', async () => {
    useBackendConfig.mockReturnValue({
      selectors: [
        {
          selector: 'links.enableTicketLinks',
          scope: 'global',
          exposure: 'editable',
          ownerSurface: 'settings',
          validation: 'Boolean.',
          value: true,
        },
      ],
      loading: false,
      loadError: null,
      pendingEdits: {},
      saveStatus: 'error',
      fieldErrors: { 'links.enableTicketLinks': 'Invalid value.' },
      stageEdit,
      discardEdits: () => {},
      applyOne,
      reload: async () => {},
    })
    render(<BackendConfigSection enabled={true} />)
    await waitFor(() => {
      expect(
        screen.getByTestId('backend-cfg-error-links.enableTicketLinks'),
      ).toBeDefined()
    })
  })

  it('omits guarded selectors (only editable shown)', async () => {
    useBackendConfig.mockReturnValue({
      selectors: [
        {
          selector: 'links.enableTicketLinks',
          scope: 'global',
          exposure: 'editable',
          ownerSurface: 'settings',
          validation: 'Boolean.',
          value: true,
        },
        {
          selector: 'discovery.maxDepth',
          scope: 'global',
          exposure: 'guarded',
          ownerSurface: 'settings',
          validation: '1-50',
          value: 3,
        },
      ],
      loading: false,
      loadError: null,
      pendingEdits: {},
      saveStatus: 'idle',
      fieldErrors: {},
      stageEdit,
      discardEdits: () => {},
      applyOne,
      reload: async () => {},
    })
    render(<BackendConfigSection enabled={true} />)
    await waitFor(() => {
      expect(screen.getByText('links.enableTicketLinks')).toBeDefined()
    })
    expect(screen.queryByText('discovery.maxDepth')).toBeNull()
  })
})
