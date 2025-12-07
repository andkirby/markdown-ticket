import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Types of button modes for StatusToggle component
 */
export type ButtonMode = 'normal' | 'switch' | 'merge';

/**
 * Interface for button state configuration
 */
export interface ButtonState {
  /** Whether the button is in switch mode (orange background/border/number) */
  viewMode: boolean;
  /** Whether the button is in merge mode (checkbox shown) */
  mergeMode: boolean;
  /** Current active state derived from viewMode and mergeMode */
  activeState: ButtonMode;
}

/**
 * Interface for hover state management
 */
export interface HoverState {
  /** Whether the checkbox area is being hovered */
  isHovering: boolean;
  /** Whether to show checkbox instead of ticket count */
  showCheckbox: boolean;
}

/**
 * Interface for actions that can be performed on button modes
 */
export interface ButtonModeActions {
  /** Toggle between normal and switch mode */
  toggleViewMode: () => void;
  /** Set merge mode on/off */
  setMergeMode: (enabled: boolean) => void;
  /** Reset all modes to default state */
  resetModes: () => void;
  /** Handle mouse enter on checkbox area */
  handleMouseEnter: () => void;
  /** Handle mouse leave from checkbox area */
  handleMouseLeave: () => void;
  /** Get appropriate CSS classes based on current state */
  getButtonClasses: (isActive?: boolean, isOver?: boolean) => string;
  /** Determine if checkbox should be shown based on ticket count and state */
  shouldShowCheckbox: (ticketCount: number) => boolean;
}

/**
 * Return type for useButtonModes hook
 */
export type useButtonModesReturn = ButtonState & HoverState & ButtonModeActions;

/**
 * Hook for managing button modes and hover states in StatusToggle component.
 * Provides comprehensive state management for switch mode, merge mode, and hover interactions.
 */
export const useButtonModes = (): useButtonModesReturn => {
  // State management for button modes
  const [viewMode, setViewMode] = useState<boolean>(false);
  const [mergeMode, setMergeModeState] = useState<boolean>(false);

  // State management for hover interactions
  const [isHovering, setIsHovering] = useState<boolean>(false);

  // Use ref to track hover state and prevent stale closures
  const isHoveringRef = useRef<boolean>(isHovering);

  useEffect(() => {
    isHoveringRef.current = isHovering;
  }, [isHovering]);

  // Derive activeState from viewMode and mergeMode
  const getActiveState = useCallback((): ButtonMode => {
    if (mergeMode) {
      return 'merge';
    }
    if (viewMode) {
      return 'switch';
    }
    return 'normal';
  }, [viewMode, mergeMode]);

  const activeState = getActiveState();

  // Derive whether checkbox should be shown
  const showCheckbox = isHovering || mergeMode;

  /**
   * Toggle between normal and switch mode
   */
  const toggleViewMode = useCallback(() => {
    setViewMode(prev => !prev);
  }, []);

  /**
   * Set merge mode state
   */
  const setMergeMode = useCallback((enabled: boolean) => {
    setMergeModeState(enabled);
  }, []);

  /**
   * Reset all modes to default state
   */
  const resetModes = useCallback(() => {
    setViewMode(false);
    setMergeModeState(false);
    setIsHovering(false);
  }, []);

  /**
   * Handle mouse enter on checkbox area
   */
  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
  }, []);

  /**
   * Handle mouse leave from checkbox area
   */
  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
  }, []);

  /**
   * Get CSS classes based on current button state
   */
  const getButtonClasses = useCallback((isActive?: boolean, isOver?: boolean): string => {
    const baseClasses = 'flex items-center justify-between px-3 py-2 text-sm rounded-md border transition-all';

    // Determine background and border colors based on mode
    let modeClasses = '';
    if (viewMode) {
      modeClasses = 'bg-orange-100 border-orange-300 text-orange-800 dark:bg-orange-900/20 dark:border-orange-700 dark:text-orange-300';
    } else if (mergeMode) {
      modeClasses = 'border-orange-300 text-gray-600 dark:border-orange-700 dark:text-gray-400';
    } else {
      modeClasses = 'bg-gray-100 border-gray-300 text-gray-600 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400';
    }

    // Add drop zone highlight if applicable
    const dropZoneClass = isOver ? 'ring-2 ring-blue-400 bg-blue-50 dark:bg-blue-950/20' : '';

    // Add hover effect
    const hoverClass = 'hover:bg-opacity-80';

    return [baseClasses, modeClasses, dropZoneClass, hoverClass].filter(Boolean).join(' ');
  }, [viewMode, mergeMode]);

  /**
   * Determine if checkbox should be shown based on ticket count and state
   */
  const shouldShowCheckbox = useCallback((ticketCount: number): boolean => {
    return ticketCount > 0 && (isHoveringRef.current || mergeMode);
  }, [mergeMode]);

  return {
    // State
    viewMode,
    mergeMode,
    activeState,
    isHovering,
    showCheckbox,

    // Actions
    toggleViewMode,
    setMergeMode,
    resetModes,
    handleMouseEnter,
    handleMouseLeave,
    getButtonClasses,
    shouldShowCheckbox
  };
};

export default useButtonModes;