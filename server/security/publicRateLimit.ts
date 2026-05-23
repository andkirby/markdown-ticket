import rateLimit from 'express-rate-limit'

export const publicTokenExchangeRateLimit = rateLimit({
  legacyHeaders: false,
  limit: 30,
  message: { error: 'Too many requests' },
  standardHeaders: 'draft-7',
  windowMs: 15 * 60 * 1000,
})
