import type { MethaTechToolHandlerFunction } from '../handler-function-type'
import type {
  MethaTechToolCall,
  MethaTechToolOutput,
} from '@methatech/common/tools/list'
import type { Logger } from '@methatech/common/types/contracts/logger'

export const handleSuggestFollowups = (async (params: {
  previousToolCallFinished: Promise<unknown>
  toolCall: MethaTechToolCall<'suggest_followups'>
  logger: Logger
}): Promise<{ output: MethaTechToolOutput<'suggest_followups'> }> => {
  const { previousToolCallFinished, toolCall } = params
  const { followups: _followups } = toolCall.input

  await previousToolCallFinished
  return { output: [{ type: 'json', value: { message: 'Followups suggested!' } }] }
}) satisfies MethaTechToolHandlerFunction<'suggest_followups'>
