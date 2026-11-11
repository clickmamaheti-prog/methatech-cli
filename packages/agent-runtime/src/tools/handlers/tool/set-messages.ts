import type { MethaTechToolHandlerFunction } from '../handler-function-type'
import type {
  MethaTechToolCall,
  MethaTechToolOutput,
} from '@methatech/common/tools/list'
import type { AgentState } from '@methatech/common/types/session-state'

export const handleSetMessages = (async (params: {
  previousToolCallFinished: Promise<void>
  toolCall: MethaTechToolCall<'set_messages'>

  agentState: AgentState
}): Promise<{ output: MethaTechToolOutput<'set_messages'> }> => {
  const { previousToolCallFinished, toolCall, agentState } = params

  await previousToolCallFinished
  agentState.messageHistory = toolCall.input.messages
  agentState.contextTokenBaseline = undefined
  return { output: [{ type: 'json', value: { message: 'Messages set.' } }] }
}) satisfies MethaTechToolHandlerFunction<'set_messages'>
