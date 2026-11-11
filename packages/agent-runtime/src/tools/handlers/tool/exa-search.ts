import { jsonToolResult } from '@codebuff/common/util/messages'

import { callExaSearch } from '../../../llm-api/web-intelligence-api'

import type { CodebuffToolHandlerFunction } from '../handler-function-type'
import type {
  CodebuffToolCall,
  CodebuffToolOutput,
} from '@codebuff/common/tools/list'
import type { Logger } from '@codebuff/common/types/contracts/logger'

export const handleExaSearch = (async (params: {
  previousToolCallFinished: Promise<void>
  toolCall: CodebuffToolCall<'exa_search'>
  logger: Logger
  fetch: typeof globalThis.fetch
  signal: AbortSignal
}): Promise<{
  output: CodebuffToolOutput<'exa_search'>
}> => {
  const { previousToolCallFinished, toolCall, logger, signal } = params
  const { query, num_results, search_type } = toolCall.input

  await previousToolCallFinished

  try {
    const result = await callExaSearch({
      query,
      numResults: num_results,
      searchType: search_type,
      // globalThis.fetch, not the injected fetch: the injected fetch is the
      // Codebuff hosted-services fetch, stubbed to throw in BYOK runs.
      fetch: globalThis.fetch,
      signal,
      logger,
    })
    return { output: jsonToolResult({ result }) }
  } catch (error) {
    const errorMessage = `Error performing Exa search: ${
      error instanceof Error ? error.message : 'Unknown error'
    }`
    logger.error({ error }, 'Exa search failed')
    return { output: jsonToolResult({ errorMessage }) }
  }
}) satisfies CodebuffToolHandlerFunction<'exa_search'>
