/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FRONTEND_LOGGING_AUTOSTART: string
  // MDT-117: complete typings for the live Vite vars. Optional vars are
  // `string | undefined` so runtime guards (`|| ''`) stay type-honest.
  /** Backend URL for direct SSE/API connections; empty = same-origin proxy. */
  readonly VITE_BACKEND_URL: string | undefined
  /** Resolved backend port, injected at build time by vite.config.ts `define`. */
  readonly VITE_BACKEND_PORT: string | undefined
  /** Set to any value to silence EventBus debug logging in development. */
  readonly VITE_DISABLE_EVENTBUS_LOGS: string | undefined
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}