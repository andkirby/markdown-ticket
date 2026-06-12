/**
 * MDT-184: Backward-compatible re-exports from routes.ts.
 *
 * Consumers that already import { buildTicketLink, buildDocumentLink }
 * from this module continue to work. New code should import from routes.ts.
 *
 * @deprecated Import from '../routes' instead.
 */

export {
  buildDocumentPath as buildDocumentLink,
  buildProjectPath as buildProjectLink,
  buildTicketPath as buildTicketLink,
} from '../routes'
