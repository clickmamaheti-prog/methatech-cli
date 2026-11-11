import { afterEach, beforeEach, describe, expect, it } from 'bun:test'

import {
  clearE2BSandboxSession,
  ensureE2BSandboxSession,
  getE2BSandboxSession,
  killE2BSandboxSession,
  setE2BSandboxSession,
} from '../e2b-session'

const logger: any = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const PANEL_BASE = 'https://console.methatech.eu.org'
const TOKEN = 'test-login-token'
const signal = new AbortController().signal

let runCounter = 0
function freshRunId(): string {
  runCounter += 1
  return `run-e2b-session-test-${runCounter}`
}

function panelOpts() {
  return {
    fetch: globalThis.fetch,
    logger,
    apiKey: TOKEN,
    clientEnv: { NEXT_PUBLIC_METHATECH_APP_URL: PANEL_BASE } as any,
  }
}

describe('e2b sandbox session lifecycle', () => {
  const realFetch = globalThis.fetch
  let stubCalls: { url: string; init?: RequestInit }[] = []

  function stubFetchWith(
    respond: (url: string, init?: RequestInit) => Response,
  ): void {
    stubCalls = []
    globalThis.fetch = (async (url: any, init?: RequestInit) => {
      stubCalls.push({ url: String(url), init })
      return respond(String(url), init)
    }) as typeof globalThis.fetch
  }

  beforeEach(() => {
    stubCalls = []
  })

  afterEach(() => {
    globalThis.fetch = realFetch
  })

  it('kill is a no-op (no panel call) when the run has no sandbox session', async () => {
    const runId = freshRunId()
    stubFetchWith(() => jsonResponse({}))
    const result = await killE2BSandboxSession(runId, panelOpts())
    expect(result).toEqual({ killed: false })
    expect(stubCalls).toHaveLength(0)
  })

  it('kill sends one DELETE through the panel, clears the session, and reports the sandbox', async () => {
    const runId = freshRunId()
    setE2BSandboxSession(runId, {
      sandboxId: 'sbx-1',
      template: 'base',
      createdAt: Date.now(),
    })
    stubFetchWith(() => jsonResponse({}))
    const result = await killE2BSandboxSession(runId, panelOpts())
    expect(result).toEqual({ killed: true, sandboxId: 'sbx-1' })
    expect(stubCalls).toHaveLength(1)
    expect(stubCalls[0].url).toBe(
      `${PANEL_BASE}/api/v1/e2b/sandboxes/sbx-1`,
    )
    expect(stubCalls[0].init?.method).toBe('DELETE')
    expect(getE2BSandboxSession(runId)).toBeUndefined()
  })

  it('kill is idempotent: a second kill never touches the panel again', async () => {
    const runId = freshRunId()
    setE2BSandboxSession(runId, {
      sandboxId: 'sbx-1',
      template: 'base',
      createdAt: Date.now(),
    })
    stubFetchWith(() => jsonResponse({}))
    const first = await killE2BSandboxSession(runId, panelOpts())
    const second = await killE2BSandboxSession(runId, panelOpts())
    expect(first).toEqual({ killed: true, sandboxId: 'sbx-1' })
    expect(second).toEqual({ killed: false })
    expect(stubCalls).toHaveLength(1)
  })

  it('kill never throws: a dead panel still clears the session and reports the failure', async () => {
    const runId = freshRunId()
    setE2BSandboxSession(runId, {
      sandboxId: 'sbx-1',
      template: 'base',
      createdAt: Date.now(),
    })
    stubFetchWith(() => {
      throw new Error('network down')
    })
    const result = await killE2BSandboxSession(runId, panelOpts())
    expect(result.killed).toBe(false)
    expect(result.sandboxId).toBe('sbx-1')
    if (!result.killed) {
      expect(result.error).toBeTruthy()
    }
    expect(getE2BSandboxSession(runId)).toBeUndefined()
  })

  it('kill never throws when the panel answers 503 (proxy not configured)', async () => {
    const runId = freshRunId()
    setE2BSandboxSession(runId, {
      sandboxId: 'sbx-1',
      template: 'base',
      createdAt: Date.now(),
    })
    stubFetchWith(() => jsonResponse({ error: 'not configured' }, 503))
    const result = await killE2BSandboxSession(runId, panelOpts())
    expect(result.killed).toBe(false)
    expect(result.sandboxId).toBe('sbx-1')
    if (!result.killed) {
      expect(result.error).toContain('not available through the panel')
    }
    expect(getE2BSandboxSession(runId)).toBeUndefined()
  })

  it('ensure returns the existing session without touching the panel', async () => {
    const runId = freshRunId()
    setE2BSandboxSession(runId, {
      sandboxId: 'sbx-1',
      template: 'base',
      createdAt: 123,
    })
    stubFetchWith(() => jsonResponse({}))
    const session = await ensureE2BSandboxSession(runId, {
      ...panelOpts(),
      signal,
    })
    expect(session.sandboxId).toBe('sbx-1')
    expect(session.createdAt).toBe(123)
    expect(stubCalls).toHaveLength(0)
    clearE2BSandboxSession(runId)
  })

  it('ensure creates a fresh sandbox through the panel when none is active', async () => {
    const runId = freshRunId()
    stubFetchWith(() => jsonResponse({ sandboxId: 'sbx-new', keyUsed: 'primary' }))
    const session = await ensureE2BSandboxSession(runId, {
      ...panelOpts(),
      signal,
    })
    expect(session.sandboxId).toBe('sbx-new')
    expect(session.template).toBe('base')
    expect(stubCalls).toHaveLength(1)
    expect(stubCalls[0].url).toBe(`${PANEL_BASE}/api/v1/e2b/sandboxes`)
    expect(stubCalls[0].init?.method).toBe('POST')
    expect(getE2BSandboxSession(runId)?.sandboxId).toBe('sbx-new')
    clearE2BSandboxSession(runId)
  })

  it('ensure throws a real panel failure (402) and stores no session', async () => {
    const runId = freshRunId()
    stubFetchWith(() => jsonResponse({ error: 'no credit' }, 402))
    await expect(
      ensureE2BSandboxSession(runId, { ...panelOpts(), signal }),
    ).rejects.toThrow('402')
    expect(getE2BSandboxSession(runId)).toBeUndefined()
  })
})
