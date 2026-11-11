import type { MethaTechToolHandlerFunction } from '../handler-function-type'
import type {
  MethaTechToolCall,
  MethaTechToolOutput,
} from '@methatech/common/tools/list'
import type { Logger } from '@methatech/common/types/contracts/logger'

export const handleThinkDeeply = (async (params: {
  previousToolCallFinished: Promise<any>
  toolCall: MethaTechToolCall<'think_deeply'>
  logger: Logger
}): Promise<{ output: MethaTechToolOutput<'think_deeply'> }> => {
  const { previousToolCallFinished, toolCall, logger } = params
  const { thought } = toolCall.input

  logger.debug(
    {
      thought,
    },
    'Thought deeply',
  )

  await previousToolCallFinished
  return { output: [{ type: 'json', value: { message: 'Thought logged.' } }] }
}) satisfies MethaTechToolHandlerFunction<'think_deeply'>
