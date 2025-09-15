/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FRONTEND_LOGGING_AUTOSTART: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}