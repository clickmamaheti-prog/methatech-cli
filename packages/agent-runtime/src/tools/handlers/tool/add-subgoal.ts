import { buildArray } from '@methatech/common/util/array'
import { jsonToolResult } from '@methatech/common/util/messages'

import type { MethaTechToolHandlerFunction } from '../handler-function-type'
import type {
  MethaTechToolCall,
  MethaTechToolOutput,
} from '@methatech/common/tools/list'
import type { Subgoal } from '@methatech/common/types/session-state'

export const handleAddSubgoal = (async (params: {
  previousToolCallFinished: Promise<void>
  toolCall: MethaTechToolCall<'add_subgoal'>

  agentContext: Record<string, Subgoal>
}): Promise<{
  output: MethaTechToolOutput<'add_subgoal'>
}> => {
  const { previousToolCallFinished, toolCall, agentContext } = params

  agentContext[toolCall.input.id] = {
    objective: toolCall.input.objective,
    status: toolCall.input.status,
    plan: toolCall.input.plan,
    logs: buildArray([toolCall.input.log]),
  }

  await previousToolCallFinished
  return { output: jsonToolResult({ message: 'Successfully added subgoal' }) }
}) satisfies MethaTechToolHandlerFunction<'add_subgoal'>
