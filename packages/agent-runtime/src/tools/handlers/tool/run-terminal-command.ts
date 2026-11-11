import type { MethaTechToolHandlerFunction } from '../handler-function-type'
import type {
  ClientToolCall,
  MethaTechToolCall,
  MethaTechToolOutput,
} from '@methatech/common/tools/list'

type ToolName = 'run_terminal_command'
export const handleRunTerminalCommand = (async ({
  previousToolCallFinished,
  toolCall,
  requestClientToolCall,
}: {
  previousToolCallFinished: Promise<void>
  toolCall: MethaTechToolCall<ToolName>
  requestClientToolCall: (
    toolCall: ClientToolCall<ToolName>,
  ) => Promise<MethaTechToolOutput<ToolName>>
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
  return { output: await requestClientToolCall(clientToolCall) }
}) satisfies MethaTechToolHandlerFunction<ToolName>
