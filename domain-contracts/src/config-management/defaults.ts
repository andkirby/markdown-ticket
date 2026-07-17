/**
 * Canonical configuration-contract defaults (MDT-168).
 *
 * Aggregation point for the fallback values of persisted configuration fields.
 * These defaults describe the shape/fallback value of persisted config fields,
 * so they belong in the contract layer: runtime, API metadata, UI reset/display
 * logic, registry creation, tests, and docs all consume the identical value.
 * Runtime-only filesystem/environment defaults (CONFIG_DIR resolution, etc.) do
 * NOT belong here.
 *
 * Architectural rule: if a default describes the shape or fallback value of a
 * persisted configuration field, it belongs with the schema that validates it.
 *
 * `PROJECT_DOCUMENT_CONFIG_DEFAULTS` is defined in `project/schema.ts`
 * (co-located with `DocumentConfigObjectSchema`) and re-exported here as the
 * canonical contract default. This keeps one definition and avoids a circular
 * import, since `patch-schemas.ts` imports patterns from `project/schema`.
 */
export { PROJECT_DOCUMENT_CONFIG_DEFAULTS } from '../project/schema'
