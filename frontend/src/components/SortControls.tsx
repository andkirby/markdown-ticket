import type { SortPreferences } from '../config/sorting'
import * as React from 'react'
import { DEFAULT_SORT_ATTRIBUTES } from '../config/sorting'
import { SortMenu } from './SortMenu'

interface SortControlsProps {
  preferences: SortPreferences
  onPreferencesChange: (preferences: SortPreferences) => void
}

/**
 * Board/list sort controls — the shared collapsed SortMenu in the app header.
 * Variant is viewport-driven (spec: sort-menu.spec.md): icon-only below md,
 * icon + label at md+. Below sm this component is hidden (`hidden sm:flex`);
 * mobile sorting lives in the Hamburger Menu full-label list.
 *
 * @testid sort-controls — Sort controls container
 */
export const SortControls: React.FC<SortControlsProps> = ({
  preferences,
  onPreferencesChange,
}) => {
  const handleChange = (attribute: string, direction: 'asc' | 'desc') => {
    onPreferencesChange({
      selectedAttribute: attribute,
      selectedDirection: direction,
    })
  }

  return (
    <div data-testid="sort-controls" className="hidden sm:flex">
      <SortMenu
        attributes={DEFAULT_SORT_ATTRIBUTES}
        value={preferences.selectedAttribute}
        direction={preferences.selectedDirection}
        onChange={handleChange}
        variant="a"
        collapseLabelBelowMd
      />
    </div>
  )
}
