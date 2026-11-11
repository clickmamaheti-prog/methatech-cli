import { jsonToolResult } from '@codebuff/common/util/messages'

import { callFirecrawlCrawl } from '../../../llm-api/web-intelligence-api'

import type { CodebuffToolHandlerFunction } from '../handler-function-type'
import type {
  CodebuffToolCall,
  CodebuffToolOutput,
} from '@codebuff/common/tools/list'
import type { Logger } from '@codebuff/common/types/contracts/logger'

export const handleFirecrawlCrawl = (async (params: {
  previousToolCallFinished: Promise<void>
  toolCall: CodebuffToolCall<'firecrawl_crawl'>
  logger: Logger
  fetch: typeof globalThis.fetch
  signal: AbortSignal
}): Promise<{
  output: CodebuffToolOutput<'firecrawl_crawl'>
}> => {
  const { previousToolCallFinished, toolCall, logger, signal } = params
  const { url, limit } = toolCall.input

  await previousToolCallFinished

  try {
    const result = await callFirecrawlCrawl({
      url,
      limit,
      // globalThis.fetch, not the injected fetch: the injected fetch is the
      // Codebuff hosted-services fetch, stubbed to throw in BYOK runs.
      fetch: globalThis.fetch,
      signal,
      logger,
    })
    return { output: jsonToolResult({ result }) }
  } catch (error) {
    const errorMessage = `Error starting Firecrawl crawl: ${
      error instanceof Error ? error.message : 'Unknown error'
    }`
    logger.error({ error }, 'Firecrawl crawl failed')
    return { output: jsonToolResult({ errorMessage }) }
  }
}) satisfies CodebuffToolHandlerFunction<'firecrawl_crawl'>
