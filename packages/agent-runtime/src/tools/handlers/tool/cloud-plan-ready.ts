import type { MethaTechToolHandlerFunction } from '../handler-function-type'
import type {
  MethaTechToolCall,
  MethaTechToolOutput,
} from '@methatech/common/tools/list'

export const handleCloudPlanReady = (async (params: {
  previousToolCallFinished: Promise<unknown>
  toolCall: MethaTechToolCall<'cloud_plan_ready'>
}): Promise<{ output: MethaTechToolOutput<'cloud_plan_ready'> }> => {
  await params.previousToolCallFinished
  return {
    output: [
      {
        type: 'json',
        value: { message: 'The project plan is ready for approval.' },
      },
    ],
  }
}) satisfies MethaTechToolHandlerFunction<'cloud_plan_ready'>
