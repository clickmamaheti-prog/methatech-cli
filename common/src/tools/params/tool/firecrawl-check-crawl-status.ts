import z from 'zod/v4'

import {
  $getNativeToolCallExampleString,
  jsonToolResultSchema,
  repairInput,
} from '../utils'

import type { $ToolParams } from '../../constants'

const toolName = 'firecrawl_check_crawl_status'
const endsAgentStep = true
const searchSchema = z
  .object({
    crawl_id: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .describe(
        'The job ID returned by firecrawl_crawl.',
      ),
  })
  .describe('Check the status of a Firecrawl crawl job and get its pages so far.')
const inputSchema = repairInput((input: Record<string, unknown>) => input, searchSchema)
const description = `
Check a Firecrawl crawl job started by firecrawl_crawl. Returns the job status (scraping, completed, failed) with the pages collected so far. If the status is still scraping, wait before polling again — do not poll in a tight loop. Requires FIRECRAWL_API_KEY to be set in the shell before the CLI starts; if it is missing the tool tells you so instead of failing silently.

Example:
${$getNativeToolCallExampleString({
  toolName,
  inputSchema,
  input: {
    crawl_id: '12345678-1234-1234-1234-123456789abc',
  },
  endsAgentStep,
})}
`.trim()

export const firecrawlCheckCrawlStatusParams = {
  toolName,
  endsAgentStep,
  description,
  inputSchema,
  outputSchema: jsonToolResultSchema(
    z.union([
      z.object({
        result: z.string(),
      }),
      z.object({
        errorMessage: z.string(),
      }),
    ]),
  ),
} satisfies $ToolParams
