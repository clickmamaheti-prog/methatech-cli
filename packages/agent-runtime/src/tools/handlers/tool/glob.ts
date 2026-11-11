import type { MethaTechToolHandlerFunction } from '../handler-function-type'
import type {
  ClientToolCall,
  MethaTechToolCall,
  MethaTechToolOutput,
} from '@methatech/common/tools/list'
import type { AgentTemplate } from '@methatech/common/types/agent-template'

const WINDOWED_GLOB_RESULTS = 100

type ToolName = 'glob'
export const handleGlob = (async (params: {
  previousToolCallFinished: Promise<void>
  toolCall: MethaTechToolCall<ToolName>
  agentTemplate: AgentTemplate
  requestClientToolCall: (
    toolCall: ClientToolCall<ToolName>,
  ) => Promise<MethaTechToolOutput<ToolName>>
}): Promise<{
  output: MethaTechToolOutput<ToolName>
}> => {
  const { previousToolCallFinished, toolCall, agentTemplate, requestClientToolCall } =
    params

  await previousToolCallFinished
  const finalToolCall =
    agentTemplate.windowedFileReads === true &&
    toolCall.input.max_results === undefined
      ? {
          ...toolCall,
          input: { ...toolCall.input, max_results: WINDOWED_GLOB_RESULTS },
        }
      : toolCall
  return { output: await requestClientToolCall(finalToolCall) }
}) satisfies MethaTechToolHandlerFunction<ToolName>
