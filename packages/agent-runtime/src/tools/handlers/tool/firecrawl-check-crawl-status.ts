import { jsonToolResult } from '@methatech/common/util/messages'

import { callFirecrawlCrawlStatus } from '../../../llm-api/web-intelligence-api'

import type { MethaTechToolHandlerFunction } from '../handler-function-type'
import type {
  MethaTechToolCall,
  MethaTechToolOutput,
} from '@methatech/common/tools/list'
import type { ClientEnv } from '@methatech/common/types/contracts/env'
import type { Logger } from '@methatech/common/types/contracts/logger'

export const handleFirecrawlCheckCrawlStatus = (async (params: {
  previousToolCallFinished: Promise<void>
  toolCall: MethaTechToolCall<'firecrawl_check_crawl_status'>
  logger: Logger
  apiKey?: string | undefined
  fetch: typeof globalThis.fetch
  signal: AbortSignal
  clientEnv?: ClientEnv
}): Promise<{
  output: MethaTechToolOutput<'firecrawl_check_crawl_status'>
}> => {
  const { previousToolCallFinished, toolCall, logger, signal, apiKey, clientEnv } = params
  const { crawl_id } = toolCall.input

  await previousToolCallFinished

  try {
    const result = await callFirecrawlCrawlStatus({
      crawlId: crawl_id,
      // globalThis.fetch, not the injected fetch: the injected fetch is the
      // MethaTech hosted-services fetch, stubbed to throw in BYOK runs.
      fetch: globalThis.fetch,
      signal,
      logger,
      // Panel-first: the login token + panel base URL let the transport
      // call the panel proxy (keys in the backend); without them it falls
      // back to the direct env-key call.
      apiKey,
      clientEnv,
    })
    return { output: jsonToolResult({ result }) }
  } catch (error) {
    const errorMessage = `Error checking Firecrawl crawl status: ${
      error instanceof Error ? error.message : 'Unknown error'
    }`
    logger.error({ error }, 'Firecrawl crawl status check failed')
    return { output: jsonToolResult({ errorMessage }) }
  }
}) satisfies MethaTechToolHandlerFunction<'firecrawl_check_crawl_status'>
