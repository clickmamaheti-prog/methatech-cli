/**
 * Integration Test: Connection Check
 *
 * Tests the checkConnection() method of MethaTechClient.
 */

import { describe, test, expect, beforeAll } from 'bun:test'

import { MethaTechClient } from '../../src/client'
import { getApiKey, skipIfNoApiKey } from '../utils'

describe('Integration: Connection Check', () => {
  let client: MethaTechClient

  beforeAll(() => {
    if (skipIfNoApiKey()) return
    client = new MethaTechClient({ apiKey: getApiKey() })
  })

  test('checkConnection returns true when backend is reachable', async () => {
    if (skipIfNoApiKey()) return

    const isConnected = await client.checkConnection()
    expect(isConnected).toBe(true)
  })

  test('checkConnection returns boolean', async () => {
    if (skipIfNoApiKey()) return

    const result = await client.checkConnection()
    expect(typeof result).toBe('boolean')
  })
})
