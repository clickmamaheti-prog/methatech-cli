import { jsonToolResult } from '@codebuff/common/util/messages'

import { callExaFindSimilar } from '../../../llm-api/web-intelligence-api'

import type { CodebuffToolHandlerFunction } from '../handler-function-type'
import type {
  CodebuffToolCall,
  CodebuffToolOutput,
} from '@codebuff/common/tools/list'
import type { Logger } from '@codebuff/common/types/contracts/logger'

export const handleExaFindSimilar = (async (params: {
  previousToolCallFinished: Promise<void>
  toolCall: CodebuffToolCall<'exa_find_similar'>
  logger: Logger
  fetch: typeof globalThis.fetch
  signal: AbortSignal
}): Promise<{
  output: CodebuffToolOutput<'exa_find_similar'>
}> => {
  const { previousToolCallFinished, toolCall, logger, signal } = params
  const { url, num_results } = toolCall.input

  await previousToolCallFinished

  try {
    const result = await callExaFindSimilar({
      url,
      numResults: num_results,
      // globalThis.fetch, not the injected fetch: the injected fetch is the
      // Codebuff hosted-services fetch, stubbed to throw in BYOK runs.
      fetch: globalThis.fetch,
      signal,
      logger,
    })
    return { output: jsonToolResult({ result }) }
  } catch (error) {
    const errorMessage = `Error finding similar pages with Exa: ${
      error instanceof Error ? error.message : 'Unknown error'
    }`
    logger.error({ error }, 'Exa findSimilar failed')
    return { output: jsonToolResult({ errorMessage }) }
  }
}) satisfies CodebuffToolHandlerFunction<'exa_find_similar'>
