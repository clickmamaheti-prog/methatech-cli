import { jsonToolResult } from '@methatech/common/util/messages'

import {
  createE2BSandbox,
  listE2BSandboxes,
} from '../../../llm-api/e2b-api'
import {
  getE2BSandboxSession,
  killE2BSandboxSession,
  setE2BSandboxSession,
} from '../../../llm-api/e2b-session'

import type { MethaTechToolHandlerFunction } from '../handler-function-type'
import type {
  MethaTechToolCall,
  MethaTechToolOutput,
} from '@methatech/common/tools/list'
import type { ClientEnv } from '@methatech/common/types/contracts/env'
import type { Logger } from '@methatech/common/types/contracts/logger'

export const handleSandbox = (async (params: {
  previousToolCallFinished: Promise<void>
  toolCall: MethaTechToolCall<'sandbox'>
  logger: Logger
  apiKey?: string | undefined
  fetch: typeof globalThis.fetch
  signal: AbortSignal
  clientEnv?: ClientEnv
  runId: string
}): Promise<{
  output: MethaTechToolOutput<'sandbox'>
}> => {
  const {
    previousToolCallFinished,
    toolCall,
    logger,
    signal,
    apiKey,
    clientEnv,
    runId,
  } = params
  const { action, template, timeout_ms } = toolCall.input

  await previousToolCallFinished

  try {
    if (action === 'start') {
      // A re-start replaces the run's sandbox: kill the old one first so
      // it does not leak (the kill helper is idempotent and never throws).
      await killE2BSandboxSession(runId, {
        fetch: globalThis.fetch,
        logger,
        apiKey,
        clientEnv,
      })
      const info = await createE2BSandbox({
        template,
        timeoutMs: timeout_ms,
        // globalThis.fetch, not the injected fetch: the injected fetch is
        // the MethaTech hosted-services fetch, stubbed to throw in BYOK
        // runs (same precedent as the web-intelligence handlers).
        fetch: globalThis.fetch,
        signal,
        logger,
        apiKey,
        clientEnv,
      })
      setE2BSandboxSession(runId, {
        sandboxId: info.sandboxId,
        template: template ?? 'base',
        createdAt: Date.now(),
      })
      return {
        output: jsonToolResult({
          result: `Sandbox started: ${info.sandboxId} (template ${template ?? 'base'}, panel key used: ${info.keyUsed ?? 'primary'}). SYNC shell commands (run_terminal_command) and browser screenshots (sandbox_screenshot) in this run now execute inside this sandbox. It dies automatically when this run ends, and a fresh one is created automatically the next time the agent needs a sandbox — stop it early with sandbox stop if the sandbox work is done (sandboxes bill by lifetime).`,
        }),
      }
    }

    if (action === 'stop') {
      const session = getE2BSandboxSession(runId)
      if (!session) {
        return {
          output: jsonToolResult({
            result: 'No active sandbox for this run.',
          }),
        }
      }
      const killed = await killE2BSandboxSession(runId, {
        fetch: globalThis.fetch,
        logger,
        apiKey,
        clientEnv,
      })
      if (!killed.killed && killed.error) {
        return {
          output: jsonToolResult({
            errorMessage: `Could not stop sandbox ${session.sandboxId}: ${killed.error}`,
          }),
        }
      }
      return {
        output: jsonToolResult({
          result: `Sandbox stopped: ${session.sandboxId}. Shell commands now run locally again.`,
        }),
      }
    }

    // status
    const session = getE2BSandboxSession(runId)
    const list = await listE2BSandboxes({
      fetch: globalThis.fetch,
      signal,
      logger,
      apiKey,
      clientEnv,
    })
    const sandboxes = Array.isArray(
      (list as Record<string, unknown>).sandboxes,
    )
      ? ((list as Record<string, unknown>).sandboxes as Record<string, unknown>[])
      : []
    const lines = [
      `Run sandbox: ${session ? `${session.sandboxId} (template ${session.template}, started ${new Date(session.createdAt).toISOString()})` : 'none'}.`,
      `Panel sandboxes: ${sandboxes.length > 0 ? sandboxes.map((s) => (typeof s.sandboxID === 'string' ? s.sandboxID : typeof s.sandboxId === 'string' ? s.sandboxId : JSON.stringify(s))).join(', ') : 'none'}.`,
    ]
    return { output: jsonToolResult({ result: lines.join('\n') }) }
  } catch (error) {
    const errorMessage = `Error managing sandbox: ${
      error instanceof Error ? error.message : 'Unknown error'
    }`
    logger.error({ error }, 'sandbox failed')
    return { output: jsonToolResult({ errorMessage }) }
  }
}) satisfies MethaTechToolHandlerFunction<'sandbox'>
