import { renderHook, act } from '@testing-library/react';
import { useButtonModes } from './useButtonModes';

describe('useButtonModes', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useButtonModes());

    expect(result.current.viewMode).toBe(false);
    expect(result.current.mergeMode).toBe(false);
    expect(result.current.activeState).toBe('normal');
  });

  it('should toggle view mode', () => {
    const { result } = renderHook(() => useButtonModes());

    act(() => {
      result.current.toggleViewMode();
    });

    expect(result.current.viewMode).toBe(true);
    expect(result.current.mergeMode).toBe(false);
    expect(result.current.activeState).toBe('switch');

    act(() => {
      result.current.toggleViewMode();
    });

    expect(result.current.viewMode).toBe(false);
    expect(result.current.activeState).toBe('normal');
  });

  it('should set merge mode', () => {
    const { result } = renderHook(() => useButtonModes());

    act(() => {
      result.current.setMergeMode(true);
    });

    expect(result.current.viewMode).toBe(false);
    expect(result.current.mergeMode).toBe(true);
    expect(result.current.activeState).toBe('merge');

    act(() => {
      result.current.setMergeMode(false);
    });

    expect(result.current.mergeMode).toBe(false);
    expect(result.current.activeState).toBe('normal');
  });

  it('should handle both modes active simultaneously', () => {
    const { result } = renderHook(() => useButtonModes());

    act(() => {
      result.current.toggleViewMode();
    });

    act(() => {
      result.current.setMergeMode(true);
    });

    expect(result.current.viewMode).toBe(true);
    expect(result.current.mergeMode).toBe(true);
    expect(result.current.activeState).toBe('merge'); // merge takes priority
  });

  it('should reset all modes', () => {
    const { result } = renderHook(() => useButtonModes());

    act(() => {
      result.current.toggleViewMode();
    });

    act(() => {
      result.current.setMergeMode(true);
    });

    act(() => {
      result.current.resetModes();
    });

    expect(result.current.viewMode).toBe(false);
    expect(result.current.mergeMode).toBe(false);
    expect(result.current.activeState).toBe('normal');
  });

  it('should prioritize merge mode over view mode for activeState', () => {
    const { result } = renderHook(() => useButtonModes());

    // Enable view mode first
    act(() => {
      result.current.toggleViewMode();
    });
    expect(result.current.activeState).toBe('switch');

    // Then enable merge mode
    act(() => {
      result.current.setMergeMode(true);
    });
    // Merge mode should take priority
    expect(result.current.activeState).toBe('merge');

    // Disable merge mode, should revert to switch
    act(() => {
      result.current.setMergeMode(false);
    });
    expect(result.current.activeState).toBe('switch');
  });
});