/**
 * MDT-244: ticketKeyConfig store unit tests
 *
 * The shared store backs the two app-configuration display options
 * (ui.ticketKey.typeIconNearKey / ui.ticketKey.typeIconInBadge).
 * Delivery through the real config API is covered by the E2E suite
 * (TEST-type-icon-key-options); these tests lock pure store behavior.
 */

import { afterEach, describe, expect, it } from 'bun:test'
import { getTicketKeyOptions, setTicketKeyOptions, subscribeTicketKeyOptions } from './ticketKeyConfig'

const DEFAULTS = { typeIconNearKey: false, typeIconInBadge: false }

afterEach(() => {
  setTicketKeyOptions(DEFAULTS)
})

describe('ticketKeyConfig store', () => {
  it('defaults both options to off (absent config keys fall through)', () => {
    expect(getTicketKeyOptions()).toEqual(DEFAULTS)
  })

  it('setTicketKeyOptions updates the store and notifies subscribers', () => {
    let notifications = 0
    const unsubscribe = subscribeTicketKeyOptions(() => {
      notifications += 1
    })

    setTicketKeyOptions({ typeIconNearKey: true, typeIconInBadge: false })
    unsubscribe()

    expect(getTicketKeyOptions().typeIconNearKey).toBe(true)
    expect(getTicketKeyOptions().typeIconInBadge).toBe(false)
    expect(notifications).toBe(1)
  })

  it('stops notifying after unsubscribe', () => {
    let notifications = 0
    const unsubscribe = subscribeTicketKeyOptions(() => {
      notifications += 1
    })
    unsubscribe()
    setTicketKeyOptions({ typeIconNearKey: true, typeIconInBadge: true })
    expect(notifications).toBe(0)
  })

  it('applies refreshed config values to subsequent reads (Edge-1: staleness bounded to the refresh)', () => {
    setTicketKeyOptions({ typeIconNearKey: false, typeIconInBadge: false })
    setTicketKeyOptions({ typeIconNearKey: true, typeIconInBadge: true })
    expect(getTicketKeyOptions()).toEqual({ typeIconNearKey: true, typeIconInBadge: true })
  })
})
