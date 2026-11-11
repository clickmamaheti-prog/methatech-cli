// FORK (MethaTech): the session path (Freebuff flow, panel as backend).
// A MethaTech panel model must call the panel relay at /v1/chat/completions
// on the login host (getWebsiteUrl()) with the login token as Bearer —
// never the MethaTech backend at /api/v1/chat/completions, never a BYOK
// connection. A non-panel model must NOT take this branch.
import { afterEach, describe, expect, test } from 'bun:test'

import { getWebsiteUrl } from '../../constants'
import { getModelForRequest } from '../model-provider'

import type { LanguageModelV2, LanguageModelV2CallOptions } from '@ai-sdk/provider'

const originalFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = originalFetch
})

const options: LanguageModelV2CallOptions = {
  prompt: [
    { role: 'user', content: [{ type: 'text', text: 'Reply with OK.' }] },
  ],
  maxOutputTokens: 4096,
}

async function request(model: string, apiKey: string) {
  let url = ''
  let headers = new Headers()
  let body: Record<string, unknown> = {}
  globalThis.fetch = (async (input, init) => {
    url = String(input)
    headers = new Headers(init?.headers)
    body = JSON.parse(String(init?.body))
    return Response.json({
      choices: [
        { message: { role: 'assistant', content: 'OK' }, finish_reason: 'stop' },
      ],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    })
  }) as typeof fetch
  const languageModel = getModelForRequest({ apiKey, model }) as LanguageModelV2
  const result = await languageModel.doGenerate(options)
  expect(result.content).toContainEqual({ type: 'text', text: 'OK' })
  return { url, headers, body }
}

describe('MethaTech session model', () => {
  test('panel model goes to the panel relay on the login host', async () => {
    const { url, headers, body } = await request(
      'deepseek-v4-flash',
      'session-token-test',
    )
    expect(url).toBe(`${getWebsiteUrl()}/v1/chat/completions`)
    expect(headers.get('authorization')).toBe('Bearer session-token-test')
    expect(body.model).toBe('deepseek-v4-flash')
  })

  test('non-panel model does not take the session branch', async () => {
    const { url } = await request('anthropic/claude-opus-5', 'session-token-test')
    expect(url).toBe(`${getWebsiteUrl()}/api/v1/chat/completions`)
  })
})
