import { afterEach, beforeEach, describe, expect, it } from 'bun:test'

import {
  createE2BSandbox,
  downloadE2BFile,
  getE2BSandbox,
  isE2BFallbackError,
  killE2BSandbox,
  listE2BSandboxes,
  runE2BCommand,
} from '../e2b-api'

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

function captureFetch(
  respond: (url: string, init?: RequestInit) => Response,
): { fetch: typeof globalThis.fetch; calls: { url: string; init?: RequestInit }[] } {
  const calls: { url: string; init?: RequestInit }[] = []
  const fetch = (async (url: any, init?: RequestInit) => {
    calls.push({ url: String(url), init })
    return respond(String(url), init)
  }) as typeof globalThis.fetch
  return { fetch, calls }
}

const PANEL_BASE = 'https://console.methatech.eu.org'
const TOKEN = 'test-login-token'

describe('e2b-api', () => {
  it('createE2BSandbox posts to the panel proxy with the login token', async () => {
    const { fetch, calls } = captureFetch(() =>
      jsonResponse({
        sandboxId: 'sbx-1',
        domain: 'e2b.app',
        envdVersion: '0.1.0',
        keyUsed: 'primary',
      }),
    )
    const info = await createE2BSandbox({
      template: 'base',
      timeoutMs: 3_600_000,
      fetch,
      signal: new AbortController().signal,
      logger,
      apiKey: TOKEN,
      baseUrl: PANEL_BASE,
    })
    expect(info.sandboxId).toBe('sbx-1')
    expect(info.keyUsed).toBe('primary')
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe(`${PANEL_BASE}/api/v1/e2b/sandboxes`)
    expect(calls[0].init?.method).toBe('POST')
    expect((calls[0].init?.headers as Record<string, string>).Authorization).toBe(
      `Bearer ${TOKEN}`,
    )
    const body = JSON.parse(String(calls[0].init?.body))
    expect(body.template).toBe('base')
    expect(body.timeoutMs).toBe(3_600_000)
  })

  it('createE2BSandbox throws the not-configured message when the panel has no key (503)', async () => {
    const { fetch } = captureFetch(() => jsonResponse({ error: 'E2B is not configured on this server' }, 503))
    await expect(
      createE2BSandbox({
        fetch,
        signal: new AbortController().signal,
        logger,
        apiKey: TOKEN,
        baseUrl: PANEL_BASE,
      }),
    ).rejects.toThrow('not available through the panel')
  })

  it('createE2BSandbox throws the not-configured message when not logged in', async () => {
    const { fetch, calls } = captureFetch(() => jsonResponse({ sandboxId: 'sbx-1' }))
    await expect(
      createE2BSandbox({
        fetch,
        signal: new AbortController().signal,
        logger,
        baseUrl: PANEL_BASE,
      }),
    ).rejects.toThrow('not available through the panel')
    expect(calls).toHaveLength(0)
  })

  it('createE2BSandbox surfaces a real panel failure (429) instead of falling back', async () => {
    const { fetch } = captureFetch(() => jsonResponse({ error: 'rate limited' }, 429))
    await expect(
      createE2BSandbox({
        fetch,
        signal: new AbortController().signal,
        logger,
        apiKey: TOKEN,
        baseUrl: PANEL_BASE,
      }),
    ).rejects.toThrow('429')
  })

  it('runE2BCommand returns stdout/stderr/exitCode/pid', async () => {
    const { fetch, calls } = captureFetch(() =>
      jsonResponse({
        sandboxId: 'sbx-1',
        pid: 42,
        stdout: 'hello sandbox\n',
        stderr: '',
        exitCode: 0,
      }),
    )
    const result = await runE2BCommand({
      sandboxId: 'sbx-1',
      command: 'echo hi',
      timeoutMs: 5000,
      fetch,
      signal: new AbortController().signal,
      logger,
      apiKey: TOKEN,
      baseUrl: PANEL_BASE,
    })
    expect(result.stdout).toBe('hello sandbox\n')
    expect(result.exitCode).toBe(0)
    expect(result.pid).toBe(42)
    expect(calls[0].url).toBe(`${PANEL_BASE}/api/v1/e2b/sandboxes/sbx-1/commands`)
    const body = JSON.parse(String(calls[0].init?.body))
    expect(body.command).toBe('echo hi')
    expect(body.timeoutMs).toBe(5000)
  })

  it('runE2BCommand throws a fallback error when the panel cannot serve it (503)', async () => {
    const { fetch } = captureFetch(() => jsonResponse({ error: 'not configured' }, 503))
    let caught: unknown
    try {
      await runE2BCommand({
        sandboxId: 'sbx-1',
        command: 'echo hi',
        fetch,
        signal: new AbortController().signal,
        logger,
        apiKey: TOKEN,
        baseUrl: PANEL_BASE,
      })
    } catch (error) {
      caught = error
    }
    expect(caught).toBeDefined()
    expect(isE2BFallbackError(caught)).toBe(true)
  })

  it('runE2BCommand throws a plain error on a real panel failure (401)', async () => {
    const { fetch } = captureFetch(() => jsonResponse({ error: 'bad token' }, 401))
    let caught: unknown
    try {
      await runE2BCommand({
        sandboxId: 'sbx-1',
        command: 'echo hi',
        fetch,
        signal: new AbortController().signal,
        logger,
        apiKey: TOKEN,
        baseUrl: PANEL_BASE,
      })
    } catch (error) {
      caught = error
    }
    expect(caught).toBeDefined()
    expect(isE2BFallbackError(caught)).toBe(false)
    expect((caught as Error).message).toContain('401')
  })

  it('killE2BSandbox sends DELETE and list/get pass through', async () => {
    const { fetch, calls } = captureFetch((url) => {
      if (url.endsWith('/sandboxes')) return jsonResponse({ sandboxes: [{ sandboxID: 'sbx-1' }] })
      if (url.endsWith('/sandboxes/sbx-1')) return jsonResponse({ sandboxID: 'sbx-1', state: 'running' })
      return jsonResponse({})
    })
    await killE2BSandbox({
      sandboxId: 'sbx-1',
      fetch,
      signal: new AbortController().signal,
      logger,
      apiKey: TOKEN,
      baseUrl: PANEL_BASE,
    })
    expect(calls[0].init?.method).toBe('DELETE')
    const list = await listE2BSandboxes({
      fetch,
      signal: new AbortController().signal,
      logger,
      apiKey: TOKEN,
      baseUrl: PANEL_BASE,
    })
    expect(Array.isArray((list as any).sandboxes)).toBe(true)
    const one = await getE2BSandbox({
      sandboxId: 'sbx-1',
      fetch,
      signal: new AbortController().signal,
      logger,
      apiKey: TOKEN,
      baseUrl: PANEL_BASE,
    })
    expect(one.sandboxID).toBe('sbx-1')
  })

  it('downloadE2BFile returns raw bytes', async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2])
    const { fetch, calls } = captureFetch(
      () =>
        new Response(png as unknown as BodyInit, {
          status: 200,
          headers: { 'Content-Type': 'image/png' },
        }),
    )
    const bytes = await downloadE2BFile({
      sandboxId: 'sbx-1',
      path: '/home/user/shot.png',
      fetch,
      signal: new AbortController().signal,
      logger,
      apiKey: TOKEN,
      baseUrl: PANEL_BASE,
    })
    expect(bytes).toEqual(png)
    expect(calls[0].url).toContain('/api/v1/e2b/sandboxes/sbx-1/files?path=')
    expect(calls[0].init?.method).toBe('GET')
  })
})
