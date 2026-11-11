import type { MethaTechToolHandlerFunction } from '../handler-function-type'
import type {
  MethaTechToolCall,
  MethaTechToolOutput,
} from '@methatech/common/tools/list'

export const handleTaskCompleted = (async ({
  previousToolCallFinished,
}: {
  previousToolCallFinished: Promise<any>
  toolCall: MethaTechToolCall<'task_completed'>
}): Promise<{ output: MethaTechToolOutput<'task_completed'> }> => {
  await previousToolCallFinished
  return { output: [{ type: 'json', value: { message: 'Task completed.' } }] }
}) satisfies MethaTechToolHandlerFunction<'task_completed'>
