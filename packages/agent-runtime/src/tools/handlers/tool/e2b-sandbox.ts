import { jsonToolResult } from '@methatech/common/util/messages'

import {
  createE2BSandbox,
  killE2BSandbox,
  listE2BSandboxes,
} from '../../../llm-api/e2b-api'
import {
  clearE2BSandboxSession,
  getE2BSandboxSession,
  setE2BSandboxSession,
} from '../../../llm-api/e2b-session'

import type { MethaTechToolHandlerFunction } from '../handler-function-type'
import type {
  MethaTechToolCall,
  MethaTechToolOutput,
} from '@methatech/common/tools/list'
import type { ClientEnv } from '@methatech/common/types/contracts/env'
import type { Logger } from '@methatech/common/types/contracts/logger'

export const handleE2BSandbox = (async (params: {
  previousToolCallFinished: Promise<void>
  toolCall: MethaTechToolCall<'e2b_sandbox'>
  logger: Logger
  apiKey?: string | undefined
  fetch: typeof globalThis.fetch
  signal: AbortSignal
  clientEnv?: ClientEnv
  runId: string
}): Promise<{
  output: MethaTechToolOutput<'e2b_sandbox'>
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
          result: `Sandbox started: ${info.sandboxId} (template ${template ?? 'base'}, panel key used: ${info.keyUsed ?? 'primary'}). SYNC shell commands (run_terminal_command) and browser screenshots (e2b_screenshot) in this run now execute inside this sandbox. Stop it with e2b_sandbox stop when the sandbox work is done — sandboxes bill by lifetime.`,
        }),
      }
    }

    if (action === 'stop') {
      const session = getE2BSandboxSession(runId)
      if (!session) {
        return {
          output: jsonToolResult({
            result: 'No active E2B sandbox for this run.',
          }),
        }
      }
      await killE2BSandbox({
        sandboxId: session.sandboxId,
        fetch: globalThis.fetch,
        signal,
        logger,
        apiKey,
        clientEnv,
      })
      clearE2BSandboxSession(runId)
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
    const errorMessage = `Error managing E2B sandbox: ${
      error instanceof Error ? error.message : 'Unknown error'
    }`
    logger.error({ error }, 'E2B sandbox failed')
    return { output: jsonToolResult({ errorMessage }) }
  }
}) satisfies MethaTechToolHandlerFunction<'e2b_sandbox'>
