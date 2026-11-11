import type { MethaTechToolHandlerFunction } from '../handler-function-type'
import type {
  ClientToolCall,
  MethaTechToolCall,
  MethaTechToolOutput,
} from '@methatech/common/tools/list'

export const handleBrowserLogs = (async (params: {
  previousToolCallFinished: Promise<void>
  toolCall: MethaTechToolCall<'browser_logs'>
  requestClientToolCall: (
    toolCall: ClientToolCall<'browser_logs'>,
  ) => Promise<MethaTechToolOutput<'browser_logs'>>
}): Promise<{
  output: MethaTechToolOutput<'browser_logs'>
}> => {
  const { previousToolCallFinished, toolCall, requestClientToolCall } = params

  await previousToolCallFinished
  return { output: await requestClientToolCall(toolCall) }
}) satisfies MethaTechToolHandlerFunction<'browser_logs'>
