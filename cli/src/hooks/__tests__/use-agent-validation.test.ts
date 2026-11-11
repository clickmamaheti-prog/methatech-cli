import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, expect, mock, spyOn, test } from 'bun:test'

import { useByokSelectionStore } from '../../utils/byok'
import { useFreebuffModelStore } from '../../state/freebuff-model-store'
import * as authModule from '../../utils/auth'
import { saveUserCredentials } from '../../utils/auth'
import {
  hasMethatechSession,
  shouldValidateAgentsRemotely,
  validateSelectedAgentDefinitions,
} from '../use-agent-validation'

import type { User } from '../../utils/auth'

const originalFetch = globalThis.fetch

const recordingFetch = (calls: string[]): typeof fetch =>
  Object.assign(
    async (input: URL | RequestInfo) => {
      calls.push(String(input))
      return new Response(JSON.stringify({ validationErrors: [] }))
    },
    { preconnect: originalFetch.preconnect },
  ) as typeof fetch

afterEach(() => {
  useByokSelectionStore.getState().setSelected(undefined)
  globalThis.fetch = originalFetch
  mock.restore()
})

test('uses local agent validation without a hosted request while BYOK is selected', async () => {
  useByokSelectionStore.getState().setSelected({
    id: 'byok-connection',
    revision: 1,
    provider: 'openai-compatible',
    model: 'gpt-oss:120b',
  })
  const calls: string[] = []
  globalThis.fetch = recordingFetch(calls)

  const result = await validateSelectedAgentDefinitions([], {
    isFreebuff: true,
  })

  expect(shouldValidateAgentsRemotely(true)).toBe(false)
  expect(result.success).toBe(true)
  expect(calls).toEqual([])
})

test('uses the hosted validator after switching back to Freebuff', async () => {
  const calls: string[] = []
  globalThis.fetch = recordingFetch(calls)

  const result = await validateSelectedAgentDefinitions([], {
    isFreebuff: true,
  })

  expect(shouldValidateAgentsRemotely(true)).toBe(true)
  expect(result.success).toBe(true)
  expect(calls).toHaveLength(1)
  expect(new URL(calls[0]).pathname).toBe('/api/agents/validate')
})

test('keeps remote validation in a non-Freebuff CLI even with a stale BYOK selection', () => {
  useByokSelectionStore.getState().setSelected({
    id: 'stale-byok-connection',
    revision: 1,
  })

  expect(shouldValidateAgentsRemotely(false)).toBe(true)
})

const TEST_SESSION_USER: User = {
  id: 'test-user-123',
  name: 'Test User',
  email: 'test@example.com',
  authToken: 'test-session-token-abc',
  fingerprintId: 'test-fingerprint',
  fingerprintHash: 'test-hash',
}

test('uses local agent validation on the MethaTech panel session (no hosted request)', async () => {
  const tempConfigDir = fs.mkdtempSync(path.join(os.tmpdir(), 'metatech-test-'))
  const previousModel = useFreebuffModelStore.getState().selectedModel
  try {
    spyOn(authModule, 'getConfigDir').mockReturnValue(tempConfigDir)
    spyOn(authModule, 'getCredentialsPath').mockReturnValue(
      path.join(tempConfigDir, 'credentials.json'),
    )
    saveUserCredentials(TEST_SESSION_USER)
    useFreebuffModelStore.getState().setSelectedModel('deepseek-v4-flash')

    expect(hasMethatechSession(true)).toBe(true)
    expect(shouldValidateAgentsRemotely(true)).toBe(false)

    const calls: string[] = []
    globalThis.fetch = recordingFetch(calls)
    const result = await validateSelectedAgentDefinitions([], {
      isFreebuff: true,
    })
    expect(result.success).toBe(true)
    expect(calls).toEqual([])
  } finally {
    useFreebuffModelStore.getState().setSelectedModel(previousModel)
    fs.rmSync(tempConfigDir, { recursive: true, force: true })
  }
})

test('keeps remote validation for a panel model when not logged in', () => {
  const previousModel = useFreebuffModelStore.getState().selectedModel
  try {
    useFreebuffModelStore.getState().setSelectedModel('deepseek-v4-flash')
    expect(hasMethatechSession(true)).toBe(false)
    expect(shouldValidateAgentsRemotely(true)).toBe(true)
  } finally {
    useFreebuffModelStore.getState().setSelectedModel(previousModel)
  }
})
