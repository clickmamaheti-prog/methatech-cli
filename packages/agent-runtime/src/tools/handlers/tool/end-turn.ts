import type { MethaTechToolHandlerFunction } from '../handler-function-type'
import type {
  MethaTechToolCall,
  MethaTechToolOutput,
} from '@methatech/common/tools/list'

export const handleEndTurn = (async (params: {
  previousToolCallFinished: Promise<any>
  toolCall: MethaTechToolCall<'end_turn'>
}): Promise<{ output: MethaTechToolOutput<'end_turn'> }> => {
  const { previousToolCallFinished } = params

  await previousToolCallFinished
  return { output: [{ type: 'json', value: { message: 'Turn ended.' } }] }
}) satisfies MethaTechToolHandlerFunction<'end_turn'>
