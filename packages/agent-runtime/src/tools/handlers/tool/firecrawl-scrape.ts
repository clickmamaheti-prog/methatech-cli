import { jsonToolResult } from '@codebuff/common/util/messages'

import { callFirecrawlScrape } from '../../../llm-api/web-intelligence-api'

import type { CodebuffToolHandlerFunction } from '../handler-function-type'
import type {
  CodebuffToolCall,
  CodebuffToolOutput,
} from '@codebuff/common/tools/list'
import type { Logger } from '@codebuff/common/types/contracts/logger'

export const handleFirecrawlScrape = (async (params: {
  previousToolCallFinished: Promise<void>
  toolCall: CodebuffToolCall<'firecrawl_scrape'>
  logger: Logger
  fetch: typeof globalThis.fetch
  signal: AbortSignal
}): Promise<{
  output: CodebuffToolOutput<'firecrawl_scrape'>
}> => {
  const { previousToolCallFinished, toolCall, logger, signal } = params
  const { url, only_main_content } = toolCall.input

  await previousToolCallFinished

  try {
    const result = await callFirecrawlScrape({
      url,
      onlyMainContent: only_main_content,
      // globalThis.fetch, not the injected fetch: the injected fetch is the
      // Codebuff hosted-services fetch, stubbed to throw in BYOK runs.
      fetch: globalThis.fetch,
      signal,
      logger,
    })
    return { output: jsonToolResult({ result }) }
  } catch (error) {
    const errorMessage = `Error scraping with Firecrawl: ${
      error instanceof Error ? error.message : 'Unknown error'
    }`
    logger.error({ error }, 'Firecrawl scrape failed')
    return { output: jsonToolResult({ errorMessage }) }
  }
}) satisfies CodebuffToolHandlerFunction<'firecrawl_scrape'>
