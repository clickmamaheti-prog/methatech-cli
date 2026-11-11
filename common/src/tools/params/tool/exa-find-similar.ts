import z from 'zod/v4'

import {
  $getNativeToolCallExampleString,
  jsonToolResultSchema,
  repairInput,
} from '../utils'

import type { $ToolParams } from '../../constants'

const toolName = 'exa_find_similar'
const endsAgentStep = true
const searchSchema = z
  .object({
    url: z
      .string()
      .trim()
      .min(1)
      .max(2048)
      .describe(
        'A public http(s) URL of a page you already have. The tool finds pages similar to it.',
      ),
    num_results: z
      .number()
      .int()
      .min(1)
      .max(10)
      .optional()
      .describe('How many similar pages to return. Default 5.'),
  })
  .describe('Find pages similar to a given URL, with page text and highlights.')
const inputSchema = repairInput((input: Record<string, unknown>) => input, searchSchema)
const description = `
Find pages similar to a URL you already have — useful for finding competitors, related papers, or alternative sources for a topic. Requires EXA_API_KEY to be set in the shell before the CLI starts; if it is missing the tool tells you so instead of failing silently.

Note: Exa marks its findSimilar endpoint deprecated in favor of exa_search with a query describing the source page. Prefer exa_search for a fresh question; use this tool when you already have one good example page and want more of the same.

Example:
${$getNativeToolCallExampleString({
  toolName,
  inputSchema,
  input: {
    url: 'https://tanstack.com/query/latest/docs/framework/react/reference/useQuery',
    num_results: 5,
  },
  endsAgentStep,
})}
`.trim()

export const exaFindSimilarParams = {
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
