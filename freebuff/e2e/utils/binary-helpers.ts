import { existsSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const REPO_ROOT = resolve(__dirname, '../../..')

export function getMethatechBinaryPath(): string {
  if (process.env.METHATECH_BINARY) {
    return resolve(process.env.METHATECH_BINARY)
  }
  return resolve(REPO_ROOT, 'cli/bin/methatech')
}

export function requireMethatechBinary(): string {
  const binaryPath = getMethatechBinaryPath()
  if (!existsSync(binaryPath)) {
    throw new Error(
      `MethaTech binary not found at ${binaryPath}. ` +
        'Build with: bun freebuff/cli/build.ts <version>',
    )
  }
  return binaryPath
}
