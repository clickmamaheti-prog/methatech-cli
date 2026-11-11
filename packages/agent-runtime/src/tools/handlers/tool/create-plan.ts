import { postStreamProcessing } from './write-file'

import type { MethaTechToolHandlerFunction } from '../handler-function-type'
import type { FileProcessingState } from './write-file'
import type {
  ClientToolCall,
  MethaTechToolCall,
  MethaTechToolOutput,
} from '@methatech/common/tools/list'
import type { Logger } from '@methatech/common/types/contracts/logger'

export const handleCreatePlan = (async (params: {
  previousToolCallFinished: Promise<void>
  toolCall: MethaTechToolCall<'create_plan'>

  fileProcessingState: FileProcessingState
  logger: Logger

  requestClientToolCall: (
    toolCall: ClientToolCall<'create_plan'>,
  ) => Promise<MethaTechToolOutput<'create_plan'>>
  writeToClient: (chunk: string) => void
}): Promise<{
  output: MethaTechToolOutput<'create_plan'>
}> => {
  const {
    fileProcessingState,
    logger,
    previousToolCallFinished,
    toolCall,
    requestClientToolCall,
    writeToClient,
  } = params
  const { path, plan } = toolCall.input

  logger.debug(
    {
      path,
      plan,
    },
    'Create plan',
  )
  // Add the plan file to the processing queue
  const change = {
    tool: 'create_plan' as const,
    path,
    content: plan,
    messages: [],
    toolCallId: toolCall.toolCallId,
  }
  fileProcessingState.promisesByPath[path].push(Promise.resolve(change))
  fileProcessingState.allPromises.push(Promise.resolve(change))

  await previousToolCallFinished
  return {
    output: await postStreamProcessing<'create_plan'>(
      change,
      fileProcessingState,
      writeToClient,
      requestClientToolCall,
    ),
  }
}) satisfies MethaTechToolHandlerFunction<'create_plan'>
