import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdtemp, readFile, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { jsonToolResult } from '@methatech/common/util/messages'

import { handleE2BSandbox } from '../e2b-sandbox'
import { handleE2BScreenshot } from '../e2b-screenshot'
import { handleRunTerminalCommand } from '../run-terminal-command'
import {
  clearE2BSandboxSession,
  getE2BSandboxSession,
  setE2BSandboxSession,
} from '../../../../llm-api/e2b-session'

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

function outputValue(output: unknown): Record<string, unknown> {
  return (output as any)[0].value as Record<string, unknown>
}

const PANEL_BASE = 'https://console.methatech.eu.org'
const TOKEN = 'test-login-token'
const signal = new AbortController().signal

let runCounter = 0
function freshRunId(): string {
  runCounter += 1
  return `run-e2b-test-${runCounter}`
}

describe('e2b handlers', () => {
  const realFetch = globalThis.fetch
  let stubbedFetch: typeof globalThis.fetch
  let stubCalls: { url: string; init?: RequestInit }[] = []

  function stubFetchWith(
    respond: (url: string, init?: RequestInit) => Response,
  ): void {
    stubCalls = []
    stubbedFetch = (async (url: any, init?: RequestInit) => {
      stubCalls.push({ url: String(url), init })
      return respond(String(url), init)
    }) as typeof globalThis.fetch
    globalThis.fetch = stubbedFetch
  }

  beforeEach(() => {
    stubCalls = []
  })

  afterEach(() => {
    globalThis.fetch = realFetch
  })

  it('e2b_sandbox start creates a sandbox through the panel and records the session', async () => {
    const runId = freshRunId()
    stubFetchWith(() =>
      jsonResponse({
        sandboxId: 'sbx-1',
        domain: 'e2b.app',
        envdVersion: '0.1.0',
        keyUsed: 'primary',
      }),
    )
    const { output } = await handleE2BSandbox({
      previousToolCallFinished: Promise.resolve(),
      toolCall: { toolName: 'e2b_sandbox', input: { action: 'start' } } as any,
      logger,
      fetch: stubbedFetch,
      signal,
      apiKey: TOKEN,
      clientEnv: { NEXT_PUBLIC_METHATECH_APP_URL: PANEL_BASE } as any,
      runId,
    })
    expect(outputValue(output).result).toContain('sbx-1')
    expect(getE2BSandboxSession(runId)?.sandboxId).toBe('sbx-1')
    expect(stubCalls[0].url).toBe(`${PANEL_BASE}/api/v1/e2b/sandboxes`)
    clearE2BSandboxSession(runId)
  })

  it('e2b_sandbox start reports the panel as unavailable instead of failing silently', async () => {
    const runId = freshRunId()
    stubFetchWith(() => jsonResponse({ error: 'not configured' }, 503))
    const { output } = await handleE2BSandbox({
      previousToolCallFinished: Promise.resolve(),
      toolCall: { toolName: 'e2b_sandbox', input: { action: 'start' } } as any,
      logger,
      fetch: stubbedFetch,
      signal,
      apiKey: TOKEN,
      clientEnv: { NEXT_PUBLIC_METHATECH_APP_URL: PANEL_BASE } as any,
      runId,
    })
    expect(outputValue(output).errorMessage).toContain('not available through the panel')
    expect(getE2BSandboxSession(runId)).toBeUndefined()
  })

  it('e2b_sandbox stop kills the run sandbox and clears the session', async () => {
    const runId = freshRunId()
    setE2BSandboxSession(runId, {
      sandboxId: 'sbx-1',
      template: 'base',
      createdAt: Date.now(),
    })
    stubFetchWith(() => jsonResponse({}))
    const { output } = await handleE2BSandbox({
      previousToolCallFinished: Promise.resolve(),
      toolCall: { toolName: 'e2b_sandbox', input: { action: 'stop' } } as any,
      logger,
      fetch: stubbedFetch,
      signal,
      apiKey: TOKEN,
      clientEnv: { NEXT_PUBLIC_METHATECH_APP_URL: PANEL_BASE } as any,
      runId,
    })
    expect(outputValue(output).result).toContain('sbx-1')
    expect(stubCalls[0].init?.method).toBe('DELETE')
    expect(getE2BSandboxSession(runId)).toBeUndefined()
  })

  it('run_terminal_command routes SYNC commands to the sandbox while a session is active', async () => {
    const runId = freshRunId()
    setE2BSandboxSession(runId, {
      sandboxId: 'sbx-1',
      template: 'base',
      createdAt: Date.now(),
    })
    stubFetchWith(() =>
      jsonResponse({
        sandboxId: 'sbx-1',
        pid: 42,
        stdout: 'hello sandbox\n',
        stderr: '',
        exitCode: 0,
      }),
    )
    let localCalled = false
    const { output } = await handleRunTerminalCommand({
      previousToolCallFinished: Promise.resolve(),
      toolCall: {
        toolName: 'run_terminal_command',
        toolCallId: 'tc-1',
        input: { command: 'echo hi', process_type: 'SYNC', timeout_seconds: 30 },
      } as any,
      requestClientToolCall: (async () => {
        localCalled = true
        return jsonToolResult({ command: 'echo hi', stdout: 'local\n', stderr: '', exitCode: 0 })
      }) as any,
      logger,
      apiKey: TOKEN,
      clientEnv: { NEXT_PUBLIC_METHATECH_APP_URL: PANEL_BASE } as any,
      runId,
      signal,
    })
    expect(localCalled).toBe(false)
    const value = outputValue(output)
    expect(value.stdout).toBe('hello sandbox\n')
    expect(value.exitCode).toBe(0)
    expect(String(value.message)).toContain('E2B sandbox sbx-1')
    expect(stubCalls[0].url).toBe(
      `${PANEL_BASE}/api/v1/e2b/sandboxes/sbx-1/commands`,
    )
    clearE2BSandboxSession(runId)
  })

  it('run_terminal_command falls back to local execution (and says so) when the panel is unreachable', async () => {
    const runId = freshRunId()
    setE2BSandboxSession(runId, {
      sandboxId: 'sbx-1',
      template: 'base',
      createdAt: Date.now(),
    })
    stubFetchWith(() => {
      throw new Error('network down')
    })
    let localCalled = false
    const { output } = await handleRunTerminalCommand({
      previousToolCallFinished: Promise.resolve(),
      toolCall: {
        toolName: 'run_terminal_command',
        toolCallId: 'tc-2',
        input: { command: 'echo hi', process_type: 'SYNC', timeout_seconds: 30 },
      } as any,
      requestClientToolCall: (async () => {
        localCalled = true
        return jsonToolResult({ command: 'echo hi', stdout: 'local\n', stderr: '', exitCode: 0 })
      }) as any,
      logger,
      apiKey: TOKEN,
      clientEnv: { NEXT_PUBLIC_METHATECH_APP_URL: PANEL_BASE } as any,
      runId,
      signal,
    })
    expect(localCalled).toBe(true)
    const value = outputValue(output)
    expect(value.stdout).toBe('local\n')
    expect(String(value.message)).toContain('ran LOCALLY')
    clearE2BSandboxSession(runId)
  })

  it('run_terminal_command surfaces a real panel failure (429) instead of running locally', async () => {
    const runId = freshRunId()
    setE2BSandboxSession(runId, {
      sandboxId: 'sbx-1',
      template: 'base',
      createdAt: Date.now(),
    })
    stubFetchWith(() => jsonResponse({ error: 'rate limited' }, 429))
    let localCalled = false
    const { output } = await handleRunTerminalCommand({
      previousToolCallFinished: Promise.resolve(),
      toolCall: {
        toolName: 'run_terminal_command',
        toolCallId: 'tc-3',
        input: { command: 'echo hi', process_type: 'SYNC', timeout_seconds: 30 },
      } as any,
      requestClientToolCall: (async () => {
        localCalled = true
        return jsonToolResult({ command: 'echo hi', stdout: 'local\n', stderr: '', exitCode: 0 })
      }) as any,
      logger,
      apiKey: TOKEN,
      clientEnv: { NEXT_PUBLIC_METHATECH_APP_URL: PANEL_BASE } as any,
      runId,
      signal,
    })
    expect(localCalled).toBe(false)
    const value = outputValue(output)
    expect(String(value.errorMessage)).toContain('429')
    clearE2BSandboxSession(runId)
  })

  it('run_terminal_command stays local for BACKGROUND commands and when no session is active', async () => {
    const runId = freshRunId()
    setE2BSandboxSession(runId, {
      sandboxId: 'sbx-1',
      template: 'base',
      createdAt: Date.now(),
    })
    stubFetchWith(() => jsonResponse({}))
    let localCalls = 0
    const localStub = (async () => {
      localCalls += 1
      return jsonToolResult({ command: 'echo hi', stdout: 'local\n', stderr: '', exitCode: 0 })
    }) as any
    await handleRunTerminalCommand({
      previousToolCallFinished: Promise.resolve(),
      toolCall: {
        toolName: 'run_terminal_command',
        toolCallId: 'tc-4',
        input: { command: 'npm run dev', process_type: 'BACKGROUND', timeout_seconds: 30 },
      } as any,
      requestClientToolCall: localStub,
      logger,
      apiKey: TOKEN,
      clientEnv: { NEXT_PUBLIC_METHATECH_APP_URL: PANEL_BASE } as any,
      runId,
      signal,
    })
    expect(localCalls).toBe(1)
    expect(stubCalls).toHaveLength(0)
    clearE2BSandboxSession(runId)

    const runId2 = freshRunId()
    await handleRunTerminalCommand({
      previousToolCallFinished: Promise.resolve(),
      toolCall: {
        toolName: 'run_terminal_command',
        toolCallId: 'tc-5',
        input: { command: 'echo hi', process_type: 'SYNC', timeout_seconds: 30 },
      } as any,
      requestClientToolCall: localStub,
      logger,
      apiKey: TOKEN,
      clientEnv: { NEXT_PUBLIC_METHATECH_APP_URL: PANEL_BASE } as any,
      runId: runId2,
      signal,
    })
    expect(localCalls).toBe(2)
    expect(stubCalls).toHaveLength(0)
  })

  it('e2b_screenshot runs Playwright in the sandbox and saves the PNG locally', async () => {
    const runId = freshRunId()
    const cwd = await mkdtemp(path.join(tmpdir(), 'e2b-shot-test-'))
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3])
    stubFetchWith((url, init) => {
      if (url.endsWith('/sandboxes') && init?.method === 'POST') {
        return jsonResponse({ sandboxId: 'sbx-shot', domain: 'e2b.app', keyUsed: 'primary' })
      }
      if (url.includes('/commands')) {
        const body = JSON.parse(String(init?.body ?? '{}'))
        const command = String(body.command ?? '')
        if (command.includes("require.resolve('playwright')")) {
          return jsonResponse({ sandboxId: 'sbx-shot', pid: 1, stdout: '', stderr: '', exitCode: 0 })
        }
        if (command.includes('shot.mjs')) {
          return jsonResponse({ sandboxId: 'sbx-shot', pid: 2, stdout: 'saved /home/user/shot.png\n', stderr: '', exitCode: 0 })
        }
        return jsonResponse({ sandboxId: 'sbx-shot', pid: 3, stdout: '', stderr: '', exitCode: 0 })
      }
      if (url.includes('/files')) {
        return new Response(png as unknown as BodyInit, {
          status: 200,
          headers: { 'Content-Type': 'image/png' },
        })
      }
      return jsonResponse({})
    })
    const { output } = await handleE2BScreenshot({
      previousToolCallFinished: Promise.resolve(),
      toolCall: {
        toolName: 'e2b_screenshot',
        input: { url: 'https://example.com', full_page: true, width: 1280, height: 720 },
      } as any,
      logger,
      fetch: stubbedFetch,
      signal,
      apiKey: TOKEN,
      clientEnv: { NEXT_PUBLIC_METHATECH_APP_URL: PANEL_BASE } as any,
      runId,
      fileContext: { cwd } as any,
    })
    const result = String(outputValue(output).result ?? '')
    expect(result).toContain('Screenshot saved:')
    expect(result).toContain('.methatech/e2b-shots/shot-')
    const dir = path.join(cwd, '.methatech', 'e2b-shots')
    const files = await readdir(dir)
    expect(files).toHaveLength(1)
    const saved = await readFile(path.join(dir, files[0]))
    expect(new Uint8Array(saved)).toEqual(png)
    expect(getE2BSandboxSession(runId)?.sandboxId).toBe('sbx-shot')
    clearE2BSandboxSession(runId)
  })

  it('e2b_screenshot installs Playwright when the sandbox check fails, then proceeds', async () => {
    const runId = freshRunId()
    const cwd = await mkdtemp(path.join(tmpdir(), 'e2b-shot-test-'))
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
    let installRan = false
    stubFetchWith((url, init) => {
      if (url.endsWith('/sandboxes') && init?.method === 'POST') {
        return jsonResponse({ sandboxId: 'sbx-shot', domain: 'e2b.app', keyUsed: 'primary' })
      }
      if (url.includes('/commands')) {
        const body = JSON.parse(String(init?.body ?? '{}'))
        const command = String(body.command ?? '')
        if (command.includes("require.resolve('playwright')")) {
          return jsonResponse({ sandboxId: 'sbx-shot', pid: 1, stdout: '', stderr: '', exitCode: 1 })
        }
        if (command.includes('npm install playwright')) {
          installRan = true
          return jsonResponse({ sandboxId: 'sbx-shot', pid: 2, stdout: 'installed', stderr: '', exitCode: 0 })
        }
        return jsonResponse({ sandboxId: 'sbx-shot', pid: 3, stdout: '', stderr: '', exitCode: 0 })
      }
      if (url.includes('/files')) {
        return new Response(png as unknown as BodyInit, {
          status: 200,
          headers: { 'Content-Type': 'image/png' },
        })
      }
      return jsonResponse({})
    })
    const { output } = await handleE2BScreenshot({
      previousToolCallFinished: Promise.resolve(),
      toolCall: {
        toolName: 'e2b_screenshot',
        input: { url: 'https://example.com' },
      } as any,
      logger,
      fetch: stubbedFetch,
      signal,
      apiKey: TOKEN,
      clientEnv: { NEXT_PUBLIC_METHATECH_APP_URL: PANEL_BASE } as any,
      runId,
      fileContext: { cwd } as any,
    })
    expect(installRan).toBe(true)
    expect(String(outputValue(output).result ?? '')).toContain('Screenshot saved:')
    clearE2BSandboxSession(runId)
  })
})
