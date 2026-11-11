import { describe, expect, it } from 'bun:test'

import { getProviderOptions } from '../llm'

describe('getProviderOptions — methatech_metadata', () => {
  const baseParams = {
    model: 'openrouter/anthropic/claude-sonnet-4-5',
    runId: 'run-1',
    clientSessionId: 'session-1',
  }

  it('includes run_id and client_id in methatech_metadata', () => {
    const opts = getProviderOptions(baseParams)
    const meta = (opts.methatech as any).methatech_metadata
    expect(meta).toMatchObject({
      run_id: 'run-1',
      client_id: 'session-1',
    })
  })

  it('merges extraMethaTechMetadata into methatech_metadata', () => {
    const opts = getProviderOptions({
      ...baseParams,
      extraMethaTechMetadata: { freebuff_instance_id: 'abc-123' },
    })
    const meta = (opts.methatech as any).methatech_metadata
    expect(meta).toMatchObject({
      run_id: 'run-1',
      client_id: 'session-1',
      freebuff_instance_id: 'abc-123',
    })
  })

  it('omits extra keys when extraMethaTechMetadata is undefined', () => {
    const opts = getProviderOptions(baseParams)
    const meta = (opts.methatech as any).methatech_metadata
    expect(Object.keys(meta)).toEqual(
      expect.arrayContaining(['run_id', 'client_id']),
    )
    expect(meta.freebuff_instance_id).toBeUndefined()
  })

  it('cost_mode passes through alongside extra metadata', () => {
    const opts = getProviderOptions({
      ...baseParams,
      costMode: 'free',
      extraMethaTechMetadata: { freebuff_instance_id: 'uuid-xyz' },
    })
    const meta = (opts.methatech as any).methatech_metadata
    expect(meta).toMatchObject({
      cost_mode: 'free',
      freebuff_instance_id: 'uuid-xyz',
    })
  })

  it('client descriptors pass through without displacing reserved keys', () => {
    const opts = getProviderOptions({
      ...baseParams,
      costMode: 'free',
      extraMethaTechMetadata: {
        freebuff_client_env: 'v1;in=1',
        freebuff_input_profile: 'v1;tc=3',
        client_id: 'evil-client',
        cost_mode: 'normal',
      },
    })
    const meta = (opts.methatech as any).methatech_metadata
    expect(meta.freebuff_client_env).toBe('v1;in=1')
    expect(meta.freebuff_input_profile).toBe('v1;tc=3')
    expect(meta.client_id).toBe('session-1')
    expect(meta.cost_mode).toBe('free')
  })

  it('extraMethaTechMetadata does not overwrite reserved keys', () => {
    const opts = getProviderOptions({
      ...baseParams,
      costMode: 'free',
      extraMethaTechMetadata: {
        // These are intentionally the same keys the function already sets —
        // make sure a misuse doesn't let callers override server-trusted
        // identifiers. The spread currently puts caller keys last, which
        // means it WOULD override. If that's ever intentional, change this
        // test; for now, lock it down.
        run_id: 'evil-override',
      },
    })
    const meta = (opts.methatech as any).methatech_metadata
    expect(meta.run_id).toBe('run-1')
  })
})
