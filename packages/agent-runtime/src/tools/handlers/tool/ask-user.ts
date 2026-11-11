import type { MethaTechToolHandlerFunction } from '../handler-function-type'
import type {
  MethaTechToolCall,
  MethaTechToolOutput,
} from '@methatech/common/tools/list'

type ToolName = 'ask_user'

// Handler for ask_user - delegates to client
export const handleAskUser = (async (params: {
  previousToolCallFinished: Promise<void>
  toolCall: MethaTechToolCall<ToolName>
  requestClientToolCall: (toolCall: any) => Promise<any>
}): Promise<{ output: MethaTechToolOutput<ToolName> }> => {
  const { previousToolCallFinished, toolCall, requestClientToolCall } = params

  await previousToolCallFinished

  const result = await requestClientToolCall(toolCall as any)
  return {
    output: result,
  }
}) satisfies MethaTechToolHandlerFunction<ToolName>
