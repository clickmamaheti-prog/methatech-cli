import type { MethaTechToolHandlerFunction } from '../handler-function-type'
import type {
  ClientToolCall,
  MethaTechToolCall,
  MethaTechToolOutput,
} from '@methatech/common/tools/list'

type ToolName = 'list_directory'
export const handleListDirectory = (async (params: {
  previousToolCallFinished: Promise<void>
  toolCall: MethaTechToolCall<ToolName>
  requestClientToolCall: (
    toolCall: ClientToolCall<ToolName>,
  ) => Promise<MethaTechToolOutput<ToolName>>
}): Promise<{
  output: MethaTechToolOutput<ToolName>
}> => {
  const { previousToolCallFinished, toolCall, requestClientToolCall } = params

  await previousToolCallFinished
  return { output: await requestClientToolCall(toolCall) }
}) satisfies MethaTechToolHandlerFunction<ToolName>
