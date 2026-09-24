/**
 * MDT-248 UAT r9: useToast returns a referentially stable api.
 *
 * The pane's fetch effect keeps the toast api in its deps; a fresh object
 * literal per render re-triggered the effect on every state flip — a failing
 * fetch then looped forever, spamming "Couldn't load …" toasts.
 *
 * @tags MDT-248
 */
import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it } from 'bun:test'
import { useState } from 'react'
import { useToast } from './useToast'

describe('useToast stability (MDT-248 UAT r9)', () => {
  it('returns the same object reference across re-renders', () => {
    const captured: unknown[] = []
    function Probe() {
      const [tick, setTick] = useState(0)
      captured.push(useToast())
      return <button type="button" onClick={() => setTick(tick + 1)}>{tick}</button>
    }
    const { getByRole } = render(<Probe />)
    fireEvent.click(getByRole('button'))
    expect(getByRole('button').textContent).toBe('1') // re-render happened
    expect(captured).toHaveLength(2)
    expect(captured[1]).toBe(captured[0]) // same reference after re-render
  })
})
