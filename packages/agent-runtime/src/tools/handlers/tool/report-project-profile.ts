import type { MethaTechToolHandlerFunction } from '../handler-function-type'
import type {
  MethaTechToolCall,
  MethaTechToolOutput,
} from '@methatech/common/tools/list'

export const handleReportProjectProfile = (async (params: {
  previousToolCallFinished: Promise<any>
  toolCall: MethaTechToolCall<'report_project_profile'>
}): Promise<{ output: MethaTechToolOutput<'report_project_profile'> }> => {
  await params.previousToolCallFinished
  return {
    output: [
      {
        type: 'json',
        value: {
          message:
            'Not requested. Do not call this tool unless explicitly asked.',
        },
      },
    ],
  }
}) satisfies MethaTechToolHandlerFunction<'report_project_profile'>
