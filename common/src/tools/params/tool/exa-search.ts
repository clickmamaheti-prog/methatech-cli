import z from 'zod/v4'

import {
  $getNativeToolCallExampleString,
  jsonToolResultSchema,
  repairInput,
} from '../utils'

import type { $ToolParams } from '../../constants'

const toolName = 'exa_search'
const endsAgentStep = true
const searchSchema = z
  .object({
    query: z
      .string()
      .trim()
      .min(1)
      .max(500)
      .describe(
        'Semantic search query. Phrase it as the question you want answered, not just keywords.',
      ),
    num_results: z
      .number()
      .int()
      .min(1)
      .max(10)
      .optional()
      .describe('How many results to return. Default 5.'),
    search_type: z
      .enum(['auto', 'fast', 'deep'])
      .optional()
      .describe(
        'Search depth: auto (default, balanced), fast (cheaper, quicker), deep (thorough, slower and more expensive).',
      ),
  })
  .describe('Search the web with Exa and get ranked results with page text and highlights.')
const inputSchema = repairInput((input: Record<string, unknown>) => input, searchSchema)
const description = `
Search the web with Exa, a semantic search API. Use it when web_search excerpts are too thin, when you need ranked results with page text and highlights, or when the question needs semantic matching rather than keyword matching. Requires EXA_API_KEY to be set in the shell before the CLI starts; if it is missing the tool tells you so instead of failing silently.

Read the returned results first. Answer with their source URLs when they provide the evidence you need. Use firecrawl_scrape for a known URL when a result lacks necessary detail.

Example:
${$getNativeToolCallExampleString({
  toolName,
  inputSchema,
  input: {
    query: 'What is the default staleTime in TanStack Query v5?',
    num_results: 5,
  },
  endsAgentStep,
})}
`.trim()

export const exaSearchParams = {
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
