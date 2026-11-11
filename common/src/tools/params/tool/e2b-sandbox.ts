import z from 'zod/v4'

import {
  $getNativeToolCallExampleString,
  jsonToolResultSchema,
  repairInput,
} from '../utils'

import type { $ToolParams } from '../../constants'

const toolName = 'e2b_sandbox'
const endsAgentStep = true
const sandboxSchema = z
  .object({
    action: z
      .enum(['start', 'stop', 'status'])
      .describe(
        'What to do with the sandbox: start creates one for this agent run, stop kills the run sandbox, status reports the run sandbox and the panel list.',
      ),
    template: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .optional()
      .describe(
        'E2B template for start. Default "base". Use a Playwright template (one with Playwright + Chromium pre-installed) when the next step is a browser screenshot; otherwise the screenshot tool installs Playwright on first use, which is slow.',
      ),
    timeout_ms: z
      .number()
      .int()
      .min(60_000)
      .max(86_400_000)
      .optional()
      .describe('Sandbox lifetime in milliseconds for start. Default 3600000 (1 hour).'),
  })
  .describe('Manage the E2B sandbox for this agent run.')
const inputSchema = repairInput((input: Record<string, unknown>) => input, sandboxSchema)
const description = `
Manage the E2B sandbox for this agent run. The sandbox is a throwaway Linux machine in the cloud where the agent can run shell commands (run_terminal_command routes there while a sandbox is active) and browser work (e2b_screenshot) without touching the user's own machine.

- start: creates a sandbox through the MethaTech panel (the panel holds the E2B keys; the CLI never sees a key). One sandbox per agent run; starting again replaces the run sandbox.
- stop: kills the run sandbox. Always stop it when the sandbox work is done — sandboxes bill by lifetime.
- status: reports the run sandbox and the panel sandbox list.

The sandbox is created on demand: run_terminal_command and e2b_screenshot start one automatically when none is active, so call this only when you need to control the lifecycle explicitly (a specific template, or an early stop). If the panel cannot serve the call (not logged in), the tool tells you so instead of failing silently — there is no local E2B key fallback.

Example:
${$getNativeToolCallExampleString({
  toolName,
  inputSchema,
  input: {
    action: 'start',
  },
  endsAgentStep,
})}
`.trim()

export const e2bSandboxParams = {
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
