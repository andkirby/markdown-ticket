/**
 * Configuration management contracts (MDT-168).
 *
 * Pure contract layer: default-deny selector allowlist, exposure metadata,
 * strict mutation patch schemas, and canonical configuration defaults.
 *
 * No filesystem, controller, or UI behavior lives here.
 */
export * from './defaults'
export * from './patch-schemas'
export * from './selectors'
