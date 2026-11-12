import { clampTerminalTimeoutSeconds } from '@methatech/common/tools/params/tool/run-terminal-command'
import { jsonToolResult } from '@methatech/common/util/messages'

import {
  E2B_DEFAULT_COMMAND_TIMEOUT_MS,
  E2B_MAX_COMMAND_TIMEOUT_MS,
  isE2BFallbackError,
  runE2BCommand,
  truncateCommandOutput,
} from '../../../llm-api/e2b-api'
import {
  ensureE2BSandboxSession,
  getE2BSandboxSession,
} from '../../../llm-api/e2b-session'

import type { MethaTechToolHandlerFunction } from '../handler-function-type'
import type {
  ClientToolCall,
  MethaTechToolCall,
  MethaTechToolOutput,
} from '@methatech/common/tools/list'
import type { ClientEnv } from '@methatech/common/types/contracts/env'
import type { Logger } from '@methatech/common/types/contracts/logger'

type ToolName = 'run_terminal_command'

/**
 * Annotate a local tool result with a note that it ran locally, not in
 * the sandbox. Results that are not plain success objects pass through
 * unchanged.
 */
function annotateLocalFallback(
  output: MethaTechToolOutput<ToolName>,
  message: string,
): MethaTechToolOutput<ToolName> {
  const inner = (output as unknown as Array<{ value?: unknown }>)[0]?.value
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
    return jsonToolResult({
      command: success.command,
      ...(success.startingCwd !== undefined
        ? { startingCwd: success.startingCwd }
        : {}),
      ...(success.stdout !== undefined ? { stdout: success.stdout } : {}),
      ...(success.stderr !== undefined ? { stderr: success.stderr } : {}),
      ...(success.exitCode !== undefined
        ? { exitCode: success.exitCode }
        : {}),
      ...(success.hint !== undefined ? { hint: success.hint } : {}),
      message,
    })
  }
  return output
}
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

  // Sandbox routing: while a sandbox is active for this run, SYNC commands
  // run inside the sandbox through the panel (the panel holds the
  // keys; the CLI never sees a key). BACKGROUND commands stay local —
  // dev servers and watchers need this machine, not a throwaway box.
  // The sandbox has its own working directory: the local cwd is not
  // passed through (it does not exist in the sandbox).
  //
  // No session yet? Lazily create a fresh one: the previous sandbox died
  // with the previous run (auto-kill at run end), so the first SYNC
  // command of a run that needs a sandbox just gets a new one — the
  // agent never starts a sandbox by hand.
  let session = getE2BSandboxSession(runId)
  if (toolCall.input.process_type !== 'BACKGROUND' && !session) {
    try {
      session = await ensureE2BSandboxSession(runId, {
        // globalThis.fetch, not the injected fetch: the injected fetch is
        // the MethaTech hosted-services fetch, stubbed to throw in BYOK
        // runs (same precedent as the sandbox command call below).
        fetch: globalThis.fetch,
        signal,
        logger,
        apiKey,
        clientEnv,
      })
    } catch (error) {
      if (!isE2BFallbackError(error)) {
        // A real panel failure (bad token, bad request, quota, rate
        // limit) must surface, not silently run locally.
        logger.error({ error }, 'sandbox create failed')
        return {
          output: jsonToolResult({
            command: toolCall.input.command,
            errorMessage: `Error creating sandbox: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          }),
        }
      }
      // Panel unreachable (not logged in, proxy down): run locally and
      // say so, exactly like the mid-run fallback below.
      const output = await requestClientToolCall(clientToolCall)
      return {
        output: annotateLocalFallback(
          output,
          'The sandbox was unavailable through the panel, so this command ran LOCALLY instead.',
        ),
      }
    }
  }

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
          message: `Ran in the sandbox ${session.sandboxId} via the panel (sandbox working directory, not the local project directory).`,
        }),
      }
    } catch (error) {
      if (!isE2BFallbackError(error)) {
        // A real panel failure (bad token, bad request, quota, rate
        // limit) must surface, not silently run locally.
        logger.error({ error }, 'terminal command failed')
        return {
          output: jsonToolResult({
            command: toolCall.input.command,
            errorMessage: `Error running command in the sandbox: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          }),
        }
      }
      // Panel unreachable (not logged in, proxy down): fall through to
      // local execution — and say so in the result, so the agent and
      // the user know the command did NOT run in the sandbox.
      const output = await requestClientToolCall(clientToolCall)
      return {
        output: annotateLocalFallback(
          output,
          `The sandbox ${session.sandboxId} was unreachable through the panel, so this command ran LOCALLY instead.`,
        ),
      }
    }
  }

  return { output: await requestClientToolCall(clientToolCall) }
}) satisfies MethaTechToolHandlerFunction<ToolName>
