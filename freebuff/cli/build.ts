#!/usr/bin/env bun

/**
 * MethaTech CLI build script.
 *
 * Wraps the existing CLI build-binary.ts with FREEBUFF_MODE=true
 * to produce the MethaTech variant of the MethaTech CLI.
 *
 * Usage:
 *   bun freebuff/cli/build.ts <version>
 *
 * Example:
 *   bun freebuff/cli/build.ts 1.0.0
 */

import { spawnSync } from 'child_process'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..', '..')

const version = process.argv[2]
if (!version) {
  console.error('Usage: bun freebuff/cli/build.ts <version>')
  process.exit(1)
}

console.log(`Building MethaTech v${version}...`)

const result = spawnSync(
  'bun',
  ['cli/scripts/build-binary.ts', 'methatech', version],
  {
    cwd: repoRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      FREEBUFF_MODE: 'true',
    },
  },
)

if (result.status !== 0) {
  console.error('MethaTech build failed')
  process.exit(result.status ?? 1)
}

console.log(`✅ MethaTech v${version} built successfully`)
