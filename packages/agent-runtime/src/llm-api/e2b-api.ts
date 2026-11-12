/**
 * E2B sandbox transport for the MethaTech fork.
 *
 * PANEL FIRST (Freebuff flow): when the CLI is logged in to the panel
 * (device-code session), these functions call the panel's E2B proxy
 * (`/api/v1/e2b/*` on the panel, authenticated with the login token)
 * and the panel calls the E2B management API and the per-sandbox envd
 * service with its own server keys (E2B_API_KEY + E2B_API_KEY_FALLBACK,
 * env-only on the panel) — the user never exports a key, and the CLI
 * never sees an E2B key or an envd access token. There is NO direct
 * E2B fallback with a user env key, by design: the binding architecture
 * from Reza keeps ALL keys in the backend panel. When the panel cannot
 * serve a call, the caller falls back to LOCAL execution (for shell
 * commands) or reports the sandbox as unavailable (for the sandbox
 * lifecycle and screenshot tools) — and says so in the result.
 *
 * NOTE ON FETCH: the `fetch` parameter is dependency-injected for
 * tests, but the handlers pass `globalThis.fetch`, NOT the
 * runtime-injected `fetch`. The injected fetch is the MethaTech
 * hosted-services fetch, which is stubbed to throw in BYOK runs
 * (sdk/src/impl/agent-runtime.ts:171-177). The panel proxy is a
 * MethaTech hosted service in spirit, but the same process-fetch
 * precedent applies as in llm-api/web-intelligence-api.ts (the panel
 * proxy call there also uses the process fetch with the login token
 * as Bearer auth), so this transport follows it.
 */

import { BYOK_LOCAL_USER_ID } from '@methatech/common/constants/byok'
import type { ClientEnv } from '@methatech/common/types/contracts/env'
import type { Logger } from '@methatech/common/types/contracts/logger'

const FETCH_TIMEOUT_MS = 30_000
const MAX_RESULT_CHARS = 20_000
/** Ceiling for one command run through the panel (matches the panel cap). */
export const E2B_MAX_COMMAND_TIMEOUT_MS = 120_000
export const E2B_DEFAULT_COMMAND_TIMEOUT_MS = 60_000

export const E2B_NOT_CONFIGURED_MESSAGE = `Sandboxes are not available through the panel (not logged in, or the panel proxy did not answer). Log in to the panel (device-code login) so the CLI can use the panel's keys. There is no local key fallback: keys stay in the backend panel by design and are never exported to the CLI.`

/** Panel E2B proxy path (panel router/api-router.go, /v1/e2b group). */
const PANEL_E2B_PATH = '/api/v1/e2b'

/**
 * What a call needs to reach the panel proxy: the login token (apiKey)
 * plus the panel base URL, which comes from the runtime client env
 * (`NEXT_PUBLIC_METHATECH_APP_URL`, the console host) or an explicit
 * override (tests). Same precedent as llm-api/methatech-web-api.ts
 * and llm-api/web-intelligence-api.ts.
 */
export type PanelE2BOpts = {
  apiKey?: string
  clientEnv?: ClientEnv
  baseUrl?: string
}

type PanelE2BResult =
  | { json: Record<string, unknown> }
  | { bytes: Uint8Array }
  | { fallback: true }
  | { error: string }

/**
 * Call the panel E2B proxy. Returns `{json}` (or `{bytes}` for file
 * downloads) when the panel answered, `{fallback: true}` when the panel
 * cannot serve this call at all — no login token, no panel base URL,
 * panel unreachable, route missing (404), upstream unreachable (502),
 * or proxy not configured on the panel (503) — so the caller falls back
 * to local execution or reports the sandbox as unavailable, and
 * `{error}` when the panel answered with a real failure (bad token
 * 401/403, bad request 400, upstream quota 402, rate limit 429, ...),
 * which must be surfaced, not silently worked around.
 */
async function callPanelE2B(params: {
  endpoint: string
  body?: Record<string, unknown>
  method?: 'POST' | 'GET' | 'DELETE'
  responseKind?: 'json' | 'bytes'
  timeoutMs?: number
  fetch: typeof globalThis.fetch
  signal: AbortSignal
  logger: Logger
  label: string
} & PanelE2BOpts): Promise<PanelE2BResult> {
  const {
    endpoint,
    body,
    method = 'POST',
    responseKind = 'json',
    timeoutMs = FETCH_TIMEOUT_MS,
    apiKey,
    baseUrl,
    clientEnv,
    fetch,
    signal,
    logger,
    label,
  } = params
  const panelBase = baseUrl ?? clientEnv?.NEXT_PUBLIC_METHATECH_APP_URL
  // A BYOK run carries the placeholder 'byok-local' as its apiKey: it has
  // no panel login token. Never call the panel with it, and never send the
  // placeholder out as a Bearer token — the caller falls back to local
  // execution (or reports the sandbox as unavailable) instead.
  if (!apiKey || apiKey === BYOK_LOCAL_USER_ID || !panelBase)
    return { fallback: true }
  const url = `${panelBase.replace(/\/$/, '')}${PANEL_E2B_PATH}${endpoint}`
  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]),
    })
  } catch (error) {
    logger.warn(
      { label, error: error instanceof Error ? error.message : 'Unknown error' },
      'Panel sandbox proxy unreachable, falling back',
    )
    return { fallback: true }
  }
  if (
    response.status === 404 ||
    response.status === 502 ||
    response.status === 503
  ) {
    logger.warn(
      { label, status: response.status },
      'Panel sandbox proxy unavailable, falling back',
    )
    return { fallback: true }
  }
  if (!response.ok) {
    const text = await response.text()
    const snippet = text.slice(0, 500)
    return {
      error: `${label} via panel returned HTTP ${response.status}${snippet ? `: ${snippet}` : ''}`,
    }
  }
  if (responseKind === 'bytes') {
    const buffer = await response.arrayBuffer()
    return { bytes: new Uint8Array(buffer) }
  }
  const text = await response.text()
  try {
    const parsed: unknown = JSON.parse(text)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { error: `${label} via panel returned a response that is not JSON` }
    }
    return { json: parsed as Record<string, unknown> }
  } catch {
    return { error: `${label} via panel returned a response that is not JSON` }
  }
}

export type E2BSandboxInfo = {
  sandboxId: string
  domain?: string
  envdVersion?: string
  keyUsed?: string
}

function asSandboxInfo(json: Record<string, unknown>): E2BSandboxInfo {
  return {
    sandboxId: typeof json.sandboxId === 'string' ? json.sandboxId : '',
    domain: typeof json.domain === 'string' ? json.domain : undefined,
    envdVersion:
      typeof json.envdVersion === 'string' ? json.envdVersion : undefined,
    keyUsed: typeof json.keyUsed === 'string' ? json.keyUsed : undefined,
  }
}

export type E2BCommandResult = {
  sandboxId: string
  pid: number
  stdout: string
  stderr: string
  exitCode: number
}

function asCommandResult(json: Record<string, unknown>): E2BCommandResult {
  return {
    sandboxId: typeof json.sandboxId === 'string' ? json.sandboxId : '',
    pid: typeof json.pid === 'number' ? json.pid : 0,
    stdout: typeof json.stdout === 'string' ? json.stdout : '',
    stderr: typeof json.stderr === 'string' ? json.stderr : '',
    exitCode: typeof json.exitCode === 'number' ? json.exitCode : 0,
  }
}

function truncateResult(text: string): string {
  if (text.length <= MAX_RESULT_CHARS) return text
  return `${text.slice(0, MAX_RESULT_CHARS)}\n\n[Result truncated to ${MAX_RESULT_CHARS} characters.]`
}

/**
 * The fallback error: the panel cannot serve this call at all, so the
 * caller falls back (local execution, or an "unavailable" message) and
 * says so. Flagged with `isE2BFallback` so callers can tell it apart
 * from a real panel failure — every transport function that can return
 * `{fallback: true}` throws this, never a plain Error.
 */
function fallbackError(): Error & { isE2BFallback: boolean } {
  const error = new Error(E2B_NOT_CONFIGURED_MESSAGE) as Error & {
    isE2BFallback: boolean
  }
  error.isE2BFallback = true
  return error
}

export function truncateCommandOutput(text: string): string {
  return truncateResult(text)
}

/** Create a sandbox through the panel. Throws when the panel cannot serve it. */
export async function createE2BSandbox(params: {
  template?: string
  timeoutMs?: number
  /** HTTP budget for the panel call (default 30s). Lazy-create callers pass a short budget. */
  fetchTimeoutMs?: number
  fetch: typeof globalThis.fetch
  signal: AbortSignal
  logger: Logger
} & PanelE2BOpts): Promise<E2BSandboxInfo> {
  const {
    template = 'base',
    timeoutMs,
    fetchTimeoutMs = FETCH_TIMEOUT_MS,
    fetch,
    signal,
    logger,
  } = params
  const panel = await callPanelE2B({
    endpoint: '/sandboxes',
    body: { template, timeoutMs },
    timeoutMs: fetchTimeoutMs,
    apiKey: params.apiKey,
    baseUrl: params.baseUrl,
    clientEnv: params.clientEnv,
    fetch,
    signal,
    logger,
    label: 'create sandbox',
  })
  if ('json' in panel) return asSandboxInfo(panel.json)
  if ('error' in panel) throw new Error(panel.error)
  throw fallbackError()
}

/** List sandboxes through the panel (passthrough of the E2B list). */
export async function listE2BSandboxes(params: {
  fetch: typeof globalThis.fetch
  signal: AbortSignal
  logger: Logger
} & PanelE2BOpts): Promise<Record<string, unknown>> {
  const { fetch, signal, logger } = params
  const panel = await callPanelE2B({
    endpoint: '/sandboxes',
    method: 'GET',
    apiKey: params.apiKey,
    baseUrl: params.baseUrl,
    clientEnv: params.clientEnv,
    fetch,
    signal,
    logger,
    label: 'E2B list sandboxes',
  })
  if ('json' in panel) return panel.json
  if ('error' in panel) throw new Error(panel.error)
  throw new Error(E2B_NOT_CONFIGURED_MESSAGE)
}

/** Get one sandbox through the panel. */
export async function getE2BSandbox(params: {
  sandboxId: string
  fetch: typeof globalThis.fetch
  signal: AbortSignal
  logger: Logger
} & PanelE2BOpts): Promise<Record<string, unknown>> {
  const { sandboxId, fetch, signal, logger } = params
  const panel = await callPanelE2B({
    endpoint: `/sandboxes/${encodeURIComponent(sandboxId)}`,
    method: 'GET',
    apiKey: params.apiKey,
    baseUrl: params.baseUrl,
    clientEnv: params.clientEnv,
    fetch,
    signal,
    logger,
    label: 'E2B get sandbox',
  })
  if ('json' in panel) return panel.json
  if ('error' in panel) throw new Error(panel.error)
  throw new Error(E2B_NOT_CONFIGURED_MESSAGE)
}

/** Kill a sandbox through the panel. */
export async function killE2BSandbox(params: {
  sandboxId: string
  fetch: typeof globalThis.fetch
  signal: AbortSignal
  logger: Logger
} & PanelE2BOpts): Promise<Record<string, unknown>> {
  const { sandboxId, fetch, signal, logger } = params
  const panel = await callPanelE2B({
    endpoint: `/sandboxes/${encodeURIComponent(sandboxId)}`,
    method: 'DELETE',
    apiKey: params.apiKey,
    baseUrl: params.baseUrl,
    clientEnv: params.clientEnv,
    fetch,
    signal,
    logger,
    label: 'E2B kill sandbox',
  })
  if ('json' in panel) return panel.json
  if ('error' in panel) throw new Error(panel.error)
  throw new Error(E2B_NOT_CONFIGURED_MESSAGE)
}

/**
 * Run one command in a sandbox through the panel. Returns the command
 * result on success. Throws `{ fallback: true }` (as an Error with
 * `isE2BFallback` set) when the panel cannot serve the call, so the
 * caller can fall back to local execution and say so; throws a plain
 * Error for real panel failures, which must be surfaced.
 */
export async function runE2BCommand(params: {
  sandboxId: string
  command: string
  cwd?: string
  envs?: Record<string, string>
  timeoutMs?: number
  fetch: typeof globalThis.fetch
  signal: AbortSignal
  logger: Logger
} & PanelE2BOpts): Promise<E2BCommandResult> {
  const {
    sandboxId,
    command,
    cwd,
    envs,
    timeoutMs = E2B_DEFAULT_COMMAND_TIMEOUT_MS,
    fetch,
    signal,
    logger,
  } = params
  const clampedTimeout = Math.min(
    Math.max(timeoutMs, 1000),
    E2B_MAX_COMMAND_TIMEOUT_MS,
  )
  const panel = await callPanelE2B({
    endpoint: `/sandboxes/${encodeURIComponent(sandboxId)}/commands`,
    body: { command, cwd, envs, timeoutMs: clampedTimeout },
    timeoutMs: clampedTimeout + 30_000,
    apiKey: params.apiKey,
    baseUrl: params.baseUrl,
    clientEnv: params.clientEnv,
    fetch,
    signal,
    logger,
    label: 'E2B run command',
  })
  if ('json' in panel) return asCommandResult(panel.json)
  if ('error' in panel) throw new Error(panel.error)
  throw fallbackError()
}

/** Returns true when an error thrown by runE2BCommand means "panel cannot serve it". */
export function isE2BFallbackError(error: unknown): boolean {
  return (
    !!error &&
    typeof error === 'object' &&
    (error as { isE2BFallback?: unknown }).isE2BFallback === true
  )
}

/** Download a file out of a sandbox through the panel (raw bytes). */
export async function downloadE2BFile(params: {
  sandboxId: string
  path: string
  fetch: typeof globalThis.fetch
  signal: AbortSignal
  logger: Logger
} & PanelE2BOpts): Promise<Uint8Array> {
  const { sandboxId, path, fetch, signal, logger } = params
  const panel = await callPanelE2B({
    endpoint: `/sandboxes/${encodeURIComponent(sandboxId)}/files?path=${encodeURIComponent(path)}`,
    method: 'GET',
    responseKind: 'bytes',
    apiKey: params.apiKey,
    baseUrl: params.baseUrl,
    clientEnv: params.clientEnv,
    fetch,
    signal,
    logger,
    label: 'E2B download file',
  })
  if ('bytes' in panel) return panel.bytes
  if ('error' in panel) throw new Error(panel.error)
  throw fallbackError()
}
