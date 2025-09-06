import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { DEFAULT_SORT_ATTRIBUTES, SortPreferences } from '../config/sorting';

interface SortControlsProps {
  preferences: SortPreferences;
  onPreferencesChange: (preferences: SortPreferences) => void;
}

export const SortControls: React.FC<SortControlsProps> = ({
  preferences,
  onPreferencesChange,
}) => {
  const handleAttributeChange = (attribute: string) => {
    const sortAttribute = DEFAULT_SORT_ATTRIBUTES.find(attr => attr.name === attribute);
    const newPreferences = {
      selectedAttribute: attribute,
      selectedDirection: sortAttribute?.defaultDirection || 'desc',
    };
    onPreferencesChange(newPreferences);
  };

  const handleDirectionToggle = () => {
    const newDirection = preferences.selectedDirection === 'asc' ? 'desc' : 'asc';
    onPreferencesChange({
      ...preferences,
      selectedDirection: newDirection,
    });
  };

  const selectedAttribute = DEFAULT_SORT_ATTRIBUTES.find(
    attr => attr.name === preferences.selectedAttribute
  );

  return (
    <div className="flex items-center space-x-2">
      <select
        value={preferences.selectedAttribute}
        onChange={(e) => handleAttributeChange(e.target.value)}
        className="border border-border rounded-md px-3 py-1 pr-8 text-sm bg-background shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-border appearance-none"
      >
        {DEFAULT_SORT_ATTRIBUTES.map((attr) => (
          <option key={attr.name} value={attr.name}>
            {attr.label}
          </option>
        ))}
      </select>
      <button
        onClick={handleDirectionToggle}
        className="p-1 border border-border rounded-md bg-background hover:bg-muted transition-colors"
        title={`Sort ${preferences.selectedDirection === 'asc' ? 'ascending' : 'descending'}`}
      >
        {preferences.selectedDirection === 'asc' ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>
    </div>
  );
};
