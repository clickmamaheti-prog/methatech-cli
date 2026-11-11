import z from 'zod/v4'

import {
  $getNativeToolCallExampleString,
  jsonToolResultSchema,
  repairInput,
} from '../utils'

import type { $ToolParams } from '../../constants'

const toolName = 'firecrawl_crawl'
const endsAgentStep = true
const searchSchema = z
  .object({
    url: z
      .string()
      .trim()
      .min(1)
      .max(2048)
      .describe('A public http(s) URL to start the crawl from.'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe(
        'Maximum number of pages to crawl. Default 10. Each page costs Firecrawl credits, so keep this small.',
      ),
  })
  .describe('Start a Firecrawl crawl of a whole site. Returns a job ID to poll with firecrawl_check_crawl_status.')
const inputSchema = repairInput((input: Record<string, unknown>) => input, searchSchema)
const description = `
Start a crawl of a whole site with Firecrawl: it discovers and scrapes every reachable subpage from the starting URL. This only STARTS the job — it returns a job ID. Poll the job with firecrawl_check_crawl_status using that ID; do not call this tool again for the same site. Requires FIRECRAWL_API_KEY to be set in the shell before the CLI starts; if it is missing the tool tells you so instead of failing silently.

Example:
${$getNativeToolCallExampleString({
  toolName,
  inputSchema,
  input: {
    url: 'https://docs.firecrawl.dev',
    limit: 10,
  },
  endsAgentStep,
})}
`.trim()

export const firecrawlCrawlParams = {
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
