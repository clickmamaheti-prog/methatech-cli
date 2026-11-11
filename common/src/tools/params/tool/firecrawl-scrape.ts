import z from 'zod/v4'

import {
  $getNativeToolCallExampleString,
  jsonToolResultSchema,
  repairInput,
} from '../utils'

import type { $ToolParams } from '../../constants'

const toolName = 'firecrawl_scrape'
const endsAgentStep = true
const searchSchema = z
  .object({
    url: z
      .string()
      .trim()
      .min(1)
      .max(2048)
      .describe('A public http(s) URL of the page to scrape.'),
    only_main_content: z
      .boolean()
      .optional()
      .describe(
        'Return only the main article content, dropping navigation, headers, and footers. Default true.',
      ),
  })
  .describe('Scrape one page into clean markdown with Firecrawl.')
const inputSchema = repairInput((input: Record<string, unknown>) => input, searchSchema)
const description = `
Scrape a single known URL into clean markdown with Firecrawl. Use it when read_url returns a blocked or empty page, when the page needs JavaScript rendering, or when you need the full page text rather than an excerpt. Requires FIRECRAWL_API_KEY to be set in the shell before the CLI starts; if it is missing the tool tells you so instead of failing silently.

Example:
${$getNativeToolCallExampleString({
  toolName,
  inputSchema,
  input: {
    url: 'https://docs.firecrawl.dev/features/scrape',
  },
  endsAgentStep,
})}
`.trim()

export const firecrawlScrapeParams = {
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
