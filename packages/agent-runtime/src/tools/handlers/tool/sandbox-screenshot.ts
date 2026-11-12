import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { jsonToolResult } from '@methatech/common/util/messages'

import {
  downloadE2BFile,
  isE2BFallbackError,
  runE2BCommand,
  truncateCommandOutput,
} from '../../../llm-api/e2b-api'
import { ensureE2BSandboxSession } from '../../../llm-api/e2b-session'
import { assertPublicHttpUrl } from '../../../llm-api/web-intelligence-api'

import type { MethaTechToolHandlerFunction } from '../handler-function-type'
import type {
  MethaTechToolCall,
  MethaTechToolOutput,
} from '@methatech/common/tools/list'
import type { ClientEnv } from '@methatech/common/types/contracts/env'
import type { Logger } from '@methatech/common/types/contracts/logger'
import type { ProjectFileContext } from '@methatech/common/util/file'

/** Sandbox home: the writable directory E2B documents for outputs. */
const SANDBOX_HOME = '/home/user'
const SANDBOX_SCRIPT_PATH = '/home/user/shot.mjs'
const SANDBOX_PNG_PATH = '/home/user/shot.png'

/**
 * The Playwright script that runs inside the sandbox. It takes
 * (url, output path, fullPage, width, height) as argv. No template
 * literals or `$` inside, so it survives the heredoc write unchanged.
 */
function buildShotScript(): string {
  return `import { chromium } from 'playwright'
const [, , url, out, fullPage, width, height] = process.argv
const browser = await chromium.launch({ args: ['--no-sandbox'] })
const page = await browser.newPage({ viewport: { width: Number(width), height: Number(height) } })
await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
await page.screenshot({ path: out, fullPage: fullPage === 'true' })
await browser.close()
console.log('saved ' + out)
`
}

export const handleSandboxScreenshot = (async (params: {
  previousToolCallFinished: Promise<void>
  toolCall: MethaTechToolCall<'sandbox_screenshot'>
  logger: Logger
  apiKey?: string | undefined
  fetch: typeof globalThis.fetch
  signal: AbortSignal
  clientEnv?: ClientEnv
  runId: string
  fileContext: ProjectFileContext
}): Promise<{
  output: MethaTechToolOutput<'sandbox_screenshot'>
}> => {
  const {
    previousToolCallFinished,
    toolCall,
    logger,
    signal,
    apiKey,
    clientEnv,
    runId,
    fileContext,
  } = params
  const { url, full_page, width = 1280, height = 720 } = toolCall.input

  await previousToolCallFinished

  try {
    assertPublicHttpUrl(url)
  } catch (error) {
    return {
      output: jsonToolResult({
        errorMessage: `Invalid URL for screenshot: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }),
    }
  }

  try {
    // Ensure a sandbox for this run (creates one through the panel when
    // none is active — same lazy-create as the terminal-command routing).
    const session = await ensureE2BSandboxSession(runId, {
      template: 'base',
      fetch: globalThis.fetch,
      signal,
      logger,
      apiKey,
      clientEnv,
    })
    const e2b = {
      sandboxId: session.sandboxId,
      fetch: globalThis.fetch,
      signal,
      logger,
      apiKey,
      clientEnv,
    }

    // 1. Playwright present? The base template has none; install it on
    // first use (slow, a few minutes — prefer a Playwright template via
    // sandbox start when screenshots are planned).
    const check = await runE2BCommand({
      ...e2b,
      command: `node -e "try{require.resolve('playwright')}catch(e){process.exit(1)}"`,
      cwd: SANDBOX_HOME,
    })
    if (check.exitCode !== 0) {
      const install = await runE2BCommand({
        ...e2b,
        command:
          'npm init -y >/dev/null 2>&1; npm install playwright && npx playwright install chromium',
        cwd: SANDBOX_HOME,
        timeoutMs: 120_000,
      })
      if (install.exitCode !== 0) {
        return {
          output: jsonToolResult({
            errorMessage: `Playwright is not installed in sandbox ${session.sandboxId} and the install failed (exit ${install.exitCode}): ${truncateCommandOutput(install.stderr || install.stdout)}. Start a sandbox from a Playwright template with sandbox start instead.`,
          }),
        }
      }
    }

    // 2. Write the screenshot script, then run it.
    const written = await runE2BCommand({
      ...e2b,
      command: `cat > ${SANDBOX_SCRIPT_PATH} <<'METHATECH_SHOT_EOF'\n${buildShotScript()}METHATECH_SHOT_EOF`,
      cwd: SANDBOX_HOME,
    })
    if (written.exitCode !== 0) {
      return {
        output: jsonToolResult({
          errorMessage: `Could not write the screenshot script in sandbox ${session.sandboxId} (exit ${written.exitCode}): ${truncateCommandOutput(written.stderr || written.stdout)}`,
        }),
      }
    }
    const shot = await runE2BCommand({
      ...e2b,
      command: `node ${SANDBOX_SCRIPT_PATH} ${JSON.stringify(url)} ${SANDBOX_PNG_PATH} ${full_page ? 'true' : 'false'} ${width} ${height}`,
      cwd: SANDBOX_HOME,
      timeoutMs: 60_000,
    })
    if (shot.exitCode !== 0) {
      return {
        output: jsonToolResult({
          errorMessage: `Screenshot failed in sandbox ${session.sandboxId} (exit ${shot.exitCode}): ${truncateCommandOutput(shot.stderr || shot.stdout)}`,
        }),
      }
    }

    // 3. Download the PNG through the panel and save it locally. The
    // write goes through node:fs, not the write_file client tool: the
    // client tool carries text only, and a PNG is binary. The file
    // lands in the CLI's own .methatech scratch directory, never in
    // user source files.
    const bytes = await downloadE2BFile({
      ...e2b,
      path: SANDBOX_PNG_PATH,
    })
    const dir = path.join(fileContext.cwd, '.methatech', 'sandbox-shots')
    await mkdir(dir, { recursive: true })
    const localPath = path.join(dir, `shot-${Date.now()}.png`)
    await writeFile(localPath, bytes)
    return {
      output: jsonToolResult({
        result: `Screenshot saved: ${localPath} (${width}x${height}${full_page ? ', full page' : ''}). Source: ${url}. Sandbox: ${session.sandboxId}.`,
      }),
    }
  } catch (error) {
    if (isE2BFallbackError(error)) {
      return {
        output: jsonToolResult({
          errorMessage:
            'Screenshot is not available: the panel proxy did not answer (not logged in?). Log in to the panel so the CLI can use the panel\u2019s keys. There is no local key fallback.',
        }),
      }
    }
    logger.error({ error }, 'screenshot failed')
    return {
      output: jsonToolResult({
        errorMessage: `Error taking screenshot: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }),
    }
  }
}) satisfies MethaTechToolHandlerFunction<'sandbox_screenshot'>
