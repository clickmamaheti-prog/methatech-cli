import type { MethaTechToolHandlerFunction } from '../handler-function-type'
import type {
  MethaTechToolCall,
  MethaTechToolOutput,
} from '@methatech/common/tools/list'

export const handleRenderUI = (async ({
  previousToolCallFinished,
}: {
  previousToolCallFinished: Promise<unknown>
  toolCall: MethaTechToolCall<'render_ui'>
}): Promise<{ output: MethaTechToolOutput<'render_ui'> }> => {
  await previousToolCallFinished
  return { output: [{ type: 'json', value: { message: 'UI rendered.' } }] }
}) satisfies MethaTechToolHandlerFunction<'render_ui'>
