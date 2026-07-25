/**
 * Cloud Sync Coordination Worker — `src/cloudflare/` barrel.
 *
 * Re-exports the Worker entry handler. Subpackages (http, access, application,
 * d1, rate-limit, scheduled) are owned by their own modules once MDT-200
 * Slice 1+ lands them.
 */

export { default } from './worker'
