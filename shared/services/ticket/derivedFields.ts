/**
 * Derived-field write guard (MDT-189).
 *
 * After the blocks migration, `blocks` is the sorted inverse of `dependsOn`
 * and must not be written directly. This helper is the single chokepoint
 * shared by every write surface (CLI attr, MCP update_cr_attrs, future HTTP);
 * it throws a `ServiceError.invalidOperation` that callers pass through to
 * the user with the canonical remediation hint.
 *
 * Kept as a standalone pure module so the MCP server and any future consumer
 * can import it without pulling all of TicketService. The `validateAttrOperations`
 * method on TicketService delegates here.
 */

import type { AttrOp } from './types.js'
import { ServiceError } from '../ServiceError.js'

/**
 * Field names that are derived from other fields and may not be written
 * directly. `blocks` is derived from `dependsOn` (MDT-189); future derived
 * fields should be added here.
 */
export const DERIVED_FIELDS = ['blocks'] as const

/**
 * Assert that the given field is not a derived field. Throws
 * `ServiceError.invalidOperation` (code `INVALID_OPERATION`) if it is.
 *
 * @param field - The attr field name about to be written.
 * @param op    - The operation kind (replace/add/remove), included in error
 *                details for traceability.
 */
export function assertNotDerivedField(field: string, op: AttrOp): void {
  if ((DERIVED_FIELDS as readonly string[]).includes(field)) {
    throw ServiceError.invalidOperation(
      `${field} is derived from dependsOn; edit dependsOn instead`,
      { field, op },
    )
  }
}
