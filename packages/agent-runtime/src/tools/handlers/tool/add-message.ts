import { assistantMessage, userMessage } from '@methatech/common/util/messages'

import type { MethaTechToolHandlerFunction } from '../handler-function-type'
import type {
  MethaTechToolCall,
  MethaTechToolOutput,
} from '@methatech/common/tools/list'
import type { AgentState } from '@methatech/common/types/session-state'

export const handleAddMessage = (async (params: {
  previousToolCallFinished: Promise<void>
  toolCall: MethaTechToolCall<'add_message'>

  agentState: AgentState
}): Promise<{
  output: MethaTechToolOutput<'add_message'>
}> => {
  const {
    previousToolCallFinished,
    toolCall,

    agentState,
  } = params

  await previousToolCallFinished

  agentState.messageHistory.push(
    toolCall.input.role === 'user'
      ? userMessage(toolCall.input.content)
      : assistantMessage(toolCall.input.content),
  )

  return { output: [{ type: 'json', value: { message: 'Message added.' } }] }
}) satisfies MethaTechToolHandlerFunction<'add_message'>
