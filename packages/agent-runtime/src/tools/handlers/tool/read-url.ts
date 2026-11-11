import type { MethaTechToolHandlerFunction } from '../handler-function-type'
import type {
  ClientToolCall,
  MethaTechToolCall,
  MethaTechToolOutput,
} from '@methatech/common/tools/list'

export const handleReadUrl = (async (params: {
  previousToolCallFinished: Promise<void>
  toolCall: MethaTechToolCall<'read_url'>
  requestClientToolCall: (
    toolCall: ClientToolCall<'read_url'>,
  ) => Promise<MethaTechToolOutput<'read_url'>>
}): Promise<{
  output: MethaTechToolOutput<'read_url'>
}> => {
  const { previousToolCallFinished, toolCall, requestClientToolCall } = params

  await previousToolCallFinished
  return { output: await requestClientToolCall(toolCall) }
}) satisfies MethaTechToolHandlerFunction<'read_url'>
