import { clampTerminalTimeoutSeconds } from '@methatech/common/tools/params/tool/run-terminal-command'
import { jsonToolResult } from '@methatech/common/util/messages'

import {
  E2B_DEFAULT_COMMAND_TIMEOUT_MS,
  E2B_MAX_COMMAND_TIMEOUT_MS,
  isE2BFallbackError,
  runE2BCommand,
  truncateCommandOutput,
} from '../../../llm-api/e2b-api'
import { getE2BSandboxSession } from '../../../llm-api/e2b-session'

import type { MethaTechToolHandlerFunction } from '../handler-function-type'
import type {
  ClientToolCall,
  MethaTechToolCall,
  MethaTechToolOutput,
} from '@methatech/common/tools/list'
import type { ClientEnv } from '@methatech/common/types/contracts/env'
import type { Logger } from '@methatech/common/types/contracts/logger'

type ToolName = 'run_terminal_command'
export const handleRunTerminalCommand = (async ({
  previousToolCallFinished,
  toolCall,
  requestClientToolCall,
  apiKey,
  clientEnv,
  logger,
  runId,
  signal,
}: {
  previousToolCallFinished: Promise<void>
  toolCall: MethaTechToolCall<ToolName>
  requestClientToolCall: (
    toolCall: ClientToolCall<ToolName>,
  ) => Promise<MethaTechToolOutput<ToolName>>
  apiKey?: string | undefined
  clientEnv?: ClientEnv
  logger: Logger
  runId: string
  signal: AbortSignal
}): Promise<{ output: MethaTechToolOutput<ToolName> }> => {
  const clientToolCall: ClientToolCall<ToolName> = {
    toolName: 'run_terminal_command',
    toolCallId: toolCall.toolCallId,
    input: {
      command: toolCall.input.command,
      mode: 'assistant',
      process_type: toolCall.input.process_type,
      timeout_seconds: toolCall.input.timeout_seconds,
      cwd: toolCall.input.cwd,
    },
  }
  await previousToolCallFinished

  // E2B routing: while a sandbox is active for this run, SYNC commands
  // run inside the sandbox through the panel (the panel holds the E2B
  // keys; the CLI never sees a key). BACKGROUND commands stay local —
  // dev servers and watchers need this machine, not a throwaway box.
  // The sandbox has its own working directory: the local cwd is not
  // passed through (it does not exist in the sandbox).
  const session = getE2BSandboxSession(runId)
  if (session && toolCall.input.process_type !== 'BACKGROUND') {
    const seconds = toolCall.input.timeout_seconds ?? 30
    const timeoutMs =
      seconds === -1
        ? E2B_DEFAULT_COMMAND_TIMEOUT_MS
        : Math.min(
            (clampTerminalTimeoutSeconds(seconds) ?? 30) * 1000,
            E2B_MAX_COMMAND_TIMEOUT_MS,
          )
    try {
      const result = await runE2BCommand({
        sandboxId: session.sandboxId,
        command: toolCall.input.command,
        timeoutMs,
        // globalThis.fetch, not the injected fetch: the injected fetch
        // is the MethaTech hosted-services fetch, stubbed to throw in
        // BYOK runs (same precedent as the web-intelligence handlers).
        fetch: globalThis.fetch,
        signal,
        logger,
        apiKey,
        clientEnv,
      })
      return {
        output: jsonToolResult({
          command: toolCall.input.command,
          stdout: truncateCommandOutput(result.stdout),
          stderr: truncateCommandOutput(result.stderr),
          exitCode: result.exitCode,
          message: `Ran in the E2B sandbox ${session.sandboxId} via the panel (sandbox working directory, not the local project directory).`,
        }),
      }
    } catch (error) {
      if (!isE2BFallbackError(error)) {
        // A real panel failure (bad token, bad request, quota, rate
        // limit) must surface, not silently run locally.
        logger.error({ error }, 'E2B terminal command failed')
        return {
          output: jsonToolResult({
            command: toolCall.input.command,
            errorMessage: `Error running command in the E2B sandbox: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          }),
        }
      }
      // Panel unreachable (not logged in, proxy down): fall through to
      // local execution — and say so in the result, so the agent and
      // the user know the command did NOT run in the sandbox.
      const output = await requestClientToolCall(clientToolCall)
      const inner = output[0]?.value
      if (
        inner &&
        typeof inner === 'object' &&
        'command' in inner &&
        !('errorMessage' in inner)
      ) {
        const success = inner as {
          command: string
          startingCwd?: string
          stdout?: string
          stderr?: string
          exitCode?: number
          hint?: string
        }
        return {
          output: jsonToolResult({
            command: success.command,
            ...(success.startingCwd !== undefined
              ? { startingCwd: success.startingCwd }
              : {}),
            ...(success.stdout !== undefined
              ? { stdout: success.stdout }
              : {}),
            ...(success.stderr !== undefined
              ? { stderr: success.stderr }
              : {}),
            ...(success.exitCode !== undefined
              ? { exitCode: success.exitCode }
              : {}),
            ...(success.hint !== undefined ? { hint: success.hint } : {}),
            message: `The E2B sandbox ${session.sandboxId} was unreachable through the panel, so this command ran LOCALLY instead.`,
          }),
        }
      }
      return { output }
    }
  }

  return { output: await requestClientToolCall(clientToolCall) }
}) satisfies MethaTechToolHandlerFunction<ToolName>
