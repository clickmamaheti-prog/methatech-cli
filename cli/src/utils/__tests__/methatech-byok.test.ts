// FORK (MethaTech): the one stored BYOK connection panel models run
// through. ensureMethatechByokConnection get-or-creates a connection named
// `methatech` (openai-compatible, panel base URL, key from METHATECH_API_KEY)
// for the requested model and selects it.
import { afterEach, describe, expect, test } from 'bun:test'

import { METHATECH_BYOK_BASE_URL } from '@methatech/sdk'

import {
  ensureMethatechByokConnection,
  METHATECH_BYOK_CONNECTION_NAME,
  METHATECH_BYOK_CREDENTIAL_VARIABLE,
  resetCliByokStoreForTests,
  selectedByokConnection,
  setCliByokStoreForTests,
  useByokSelectionStore,
} from '../byok'

import type { ByokConnection, ByokConnectionStore } from '@methatech/sdk'

function createFakeStore(
  initial: ByokConnection[] = [],
): {
  store: ByokConnectionStore
  connections: ByokConnection[]
  calls: { create: number; update: number }
} {
  const connections = [...initial]
  const calls = { create: 0, update: 0 }
  const store = {
    list: async () => [...connections],
    create: async (input: {
      name: string
      provider: 'openai-compatible'
      model: string
      baseUrl?: string
      credentialRef: string
    }) => {
      calls.create += 1
      const now = new Date().toISOString()
      const connection: ByokConnection = {
        id: '11111111-1111-4111-8111-111111111111',
        revision: 1,
        name: input.name,
        provider: input.provider,
        model: input.model,
        ...(input.baseUrl ? { baseUrl: input.baseUrl } : {}),
        credentialRef: input.credentialRef,
        createdAt: now,
        updatedAt: now,
      }
      connections.push(connection)
      return connection
    },
    update: async (input: {
      id: string
      revision: number
      patch: { model?: string }
    }) => {
      calls.update += 1
      const found = connections.find((c) => c.id === input.id)
      if (!found) throw new Error('not found')
      const updated: ByokConnection = {
        ...found,
        ...(input.patch.model ? { model: input.patch.model } : {}),
        revision: found.revision + 1,
        updatedAt: new Date().toISOString(),
      }
      connections.splice(connections.indexOf(found), 1, updated)
      return updated
    },
  } as unknown as ByokConnectionStore
  return { store, connections, calls }
}

function existingMethatechConnection(
  model: string,
  credentialRef = `env:${METHATECH_BYOK_CREDENTIAL_VARIABLE}`,
): ByokConnection {
  return {
    id: '22222222-2222-4222-8222-222222222222',
    revision: 3,
    name: METHATECH_BYOK_CONNECTION_NAME,
    provider: 'openai-compatible',
    model,
    baseUrl: METHATECH_BYOK_BASE_URL,
    credentialRef,
    createdAt: '2026-11-10T00:00:00.000Z',
    updatedAt: '2026-11-10T00:00:00.000Z',
  }
}

afterEach(() => {
  resetCliByokStoreForTests()
  useByokSelectionStore.setState({ selected: undefined, setupOpen: false })
})

describe('ensureMethatechByokConnection', () => {
  test('creates the methatech connection when none exists and selects it', async () => {
    const { store, connections, calls } = createFakeStore()
    setCliByokStoreForTests(store)

    const selected = await ensureMethatechByokConnection('deepseek-v4-flash')

    expect(calls.create).toBe(1)
    expect(calls.update).toBe(0)
    expect(connections).toHaveLength(1)
    const connection = connections[0]
    expect(connection.name).toBe(METHATECH_BYOK_CONNECTION_NAME)
    expect(connection.provider).toBe('openai-compatible')
    expect(connection.model).toBe('deepseek-v4-flash')
    expect(connection.baseUrl).toBe(METHATECH_BYOK_BASE_URL)
    expect(connection.credentialRef).toBe(
      `env:${METHATECH_BYOK_CREDENTIAL_VARIABLE}`,
    )
    expect(selected).toEqual({
      id: connection.id,
      revision: connection.revision,
      provider: connection.provider,
      model: connection.model,
    })
    expect(selectedByokConnection()).toEqual(selected)
  })

  test('reuses the connection when it already has the requested model', async () => {
    const { store, calls } = createFakeStore([
      existingMethatechConnection('glm-5.3-flash'),
    ])
    setCliByokStoreForTests(store)

    const selected = await ensureMethatechByokConnection('glm-5.3-flash')

    expect(calls.create).toBe(0)
    expect(calls.update).toBe(0)
    expect(selected.model).toBe('glm-5.3-flash')
    expect(selected.id).toBe('22222222-2222-4222-8222-222222222222')
    expect(selected.revision).toBe(3)
  })

  test('updates only the model when the connection has another model', async () => {
    const { store, connections, calls } = createFakeStore([
      existingMethatechConnection('deepseek-v4-flash'),
    ])
    setCliByokStoreForTests(store)

    const selected = await ensureMethatechByokConnection('gpt-6-luna')

    expect(calls.create).toBe(0)
    expect(calls.update).toBe(1)
    expect(connections).toHaveLength(1)
    expect(connections[0].model).toBe('gpt-6-luna')
    // Same connection, kept credential: only the model moves.
    expect(connections[0].id).toBe('22222222-2222-4222-8222-222222222222')
    expect(connections[0].credentialRef).toBe(
      `env:${METHATECH_BYOK_CREDENTIAL_VARIABLE}`,
    )
    expect(selected.model).toBe('gpt-6-luna')
    expect(selected.revision).toBe(4)
  })

  test('keeps a custom credential reference when updating the model', async () => {
    const { store, connections } = createFakeStore([
      existingMethatechConnection('deepseek-v4-flash', 'env:MY_PANEL_KEY'),
    ])
    setCliByokStoreForTests(store)

    await ensureMethatechByokConnection('qwen3.8-flash')

    expect(connections[0].credentialRef).toBe('env:MY_PANEL_KEY')
    expect(connections[0].model).toBe('qwen3.8-flash')
  })

  test('ignores other providers’ connections', async () => {
    const other: ByokConnection = {
      id: '33333333-3333-4333-8333-333333333333',
      revision: 1,
      name: 'router',
      provider: 'openrouter',
      model: 'openai/gpt-5',
      credentialRef: 'env:OPENROUTER_API_KEY',
      createdAt: '2026-11-10T00:00:00.000Z',
      updatedAt: '2026-11-10T00:00:00.000Z',
    }
    const { store, connections, calls } = createFakeStore([other])
    setCliByokStoreForTests(store)

    await ensureMethatechByokConnection('deepseek-v4-flash')

    expect(calls.create).toBe(1)
    expect(connections).toHaveLength(2)
    expect(connections[1].name).toBe(METHATECH_BYOK_CONNECTION_NAME)
  })
})
