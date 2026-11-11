import type { MethaTechToolHandlerFunction } from '../handler-function-type'
import type {
  ClientToolCall,
  MethaTechToolCall,
  MethaTechToolOutput,
} from '@methatech/common/tools/list'

export const handleCodeSearch = (async (params: {
  previousToolCallFinished: Promise<void>
  toolCall: MethaTechToolCall<'code_search'>
  requestClientToolCall: (
    toolCall: ClientToolCall<'code_search'>,
  ) => Promise<MethaTechToolOutput<'code_search'>>
}): Promise<{
  output: MethaTechToolOutput<'code_search'>
}> => {
  const { previousToolCallFinished, toolCall, requestClientToolCall } = params

  await previousToolCallFinished
  return { output: await requestClientToolCall(toolCall) }
}) satisfies MethaTechToolHandlerFunction<'code_search'>
