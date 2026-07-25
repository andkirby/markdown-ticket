import { CoordinationError, CoordinatorError } from './errors'

describe('cloud coordination errors', () => {
  it('exports one canonical error class for Worker and local consumers', () => {
    const error = new CoordinatorError('forbidden', {
      requestId: 'request-1',
      message: 'denied',
    })

    expect(error).toBeInstanceOf(CoordinationError)
    expect(error.code).toBe('forbidden')
    expect(error.status).toBe(403)
    expect(error.requestId).toBe('request-1')
    expect(error.message).toBe('denied')
  })
})
