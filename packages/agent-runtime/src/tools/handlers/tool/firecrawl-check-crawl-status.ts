import { jsonToolResult } from '@codebuff/common/util/messages'

import { callFirecrawlCrawlStatus } from '../../../llm-api/web-intelligence-api'

import type { CodebuffToolHandlerFunction } from '../handler-function-type'
import type {
  CodebuffToolCall,
  CodebuffToolOutput,
} from '@codebuff/common/tools/list'
import type { Logger } from '@codebuff/common/types/contracts/logger'

export const handleFirecrawlCheckCrawlStatus = (async (params: {
  previousToolCallFinished: Promise<void>
  toolCall: CodebuffToolCall<'firecrawl_check_crawl_status'>
  logger: Logger
  fetch: typeof globalThis.fetch
  signal: AbortSignal
}): Promise<{
  output: CodebuffToolOutput<'firecrawl_check_crawl_status'>
}> => {
  const { previousToolCallFinished, toolCall, logger, signal } = params
  const { crawl_id } = toolCall.input

  await previousToolCallFinished

  try {
    const result = await callFirecrawlCrawlStatus({
      crawlId: crawl_id,
      // globalThis.fetch, not the injected fetch: the injected fetch is the
      // Codebuff hosted-services fetch, stubbed to throw in BYOK runs.
      fetch: globalThis.fetch,
      signal,
      logger,
    })
    return { output: jsonToolResult({ result }) }
  } catch (error) {
    const errorMessage = `Error checking Firecrawl crawl status: ${
      error instanceof Error ? error.message : 'Unknown error'
    }`
    logger.error({ error }, 'Firecrawl crawl status check failed')
    return { output: jsonToolResult({ errorMessage }) }
  }
}) satisfies CodebuffToolHandlerFunction<'firecrawl_check_crawl_status'>
