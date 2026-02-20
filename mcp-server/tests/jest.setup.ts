/**
 * Jest setup file that runs BEFORE module loading.
 * This is required to set CONFIG_DIR before @mdt/shared/utils/constants.js
 * is imported (which happens at module load time).
 */

/* eslint-disable node/prefer-global/process -- process is a legitimate global in Jest setup files */

import * as os from 'node:os'
import * as path from 'node:path'

// Set CONFIG_DIR to a temporary directory BEFORE any modules are imported
// This prevents @mdt/shared/utils/constants.js from touching the production
// config directory at ~/.config/markdown-ticket
process.env.CONFIG_DIR = path.join(os.tmpdir(), `mdt-test-${Date.now()}`)

// Set test environment
process.env.NODE_ENV = 'test'
