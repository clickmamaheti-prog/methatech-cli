import z from 'zod/v4'

import {
  $getNativeToolCallExampleString,
  jsonToolResultSchema,
  repairInput,
} from '../utils'

import type { $ToolParams } from '../../constants'

const toolName = 'sandbox_screenshot'
const endsAgentStep = true
const screenshotSchema = z
  .object({
    url: z
      .string()
      .trim()
      .min(1)
      .max(2000)
      .describe('Public http(s) URL of the page to screenshot.'),
    full_page: z
      .boolean()
      .optional()
      .describe('Capture the full scrollable page instead of just the viewport. Default false.'),
    width: z
      .number()
      .int()
      .min(320)
      .max(3840)
      .optional()
      .describe('Viewport width in pixels. Default 1280.'),
    height: z
      .number()
      .int()
      .min(240)
      .max(2160)
      .optional()
      .describe('Viewport height in pixels. Default 720.'),
  })
  .describe('Screenshot a web page inside a sandbox with Playwright.')
const inputSchema = repairInput((input: Record<string, unknown>) => input, screenshotSchema)
const description = `
Screenshot a web page inside a sandbox with Playwright (headless Chromium) and save the PNG locally under .methatech/sandbox-shots/ in the working directory. Use it when you need to see how a page actually renders — a landing page, a deployed site, a design check — without opening a browser on the user's own machine.

The sandbox is created on demand through the MethaTech panel (the panel holds the keys; the CLI never sees a key). If the sandbox has no Playwright yet, the tool installs it inside the sandbox on first use — that takes a few minutes, so prefer a Playwright template via sandbox start when you know screenshots are coming. The returned result names the local PNG path; read it back with read_files or hand it to the user when you need to show what the page looks like. Only public http(s) URLs are allowed.

Example:
${$getNativeToolCallExampleString({
  toolName,
  inputSchema,
  input: {
    url: 'https://methatech.eu.org',
    full_page: true,
  },
  endsAgentStep,
})}
`.trim()

export const sandboxScreenshotParams = {
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
