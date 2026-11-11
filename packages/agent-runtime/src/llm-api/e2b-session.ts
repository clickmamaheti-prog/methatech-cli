import { createE2BSandbox, killE2BSandbox } from './e2b-api'

import type { ClientEnv } from '@methatech/common/types/contracts/env'
import type { Logger } from '@methatech/common/types/contracts/logger'

/**
 * Store for the active E2B sandbox session, keyed by agent runId.
 * One sandbox per agent run: it is created on first use (e2b_sandbox
 * start, or the first sandboxed command / screenshot) and killed when
 * the run ends or when the agent calls e2b_sandbox stop. Same
 * module-level Map pattern as the proposed-content store
 * (tools/handlers/tool/proposed-content-store.ts): the runtime is one
 * CLI process, so a module-level store is the session. The sandbox ID
 * is the only thing stored here — the envd access token never leaves
 * the panel.
 */

export type E2BSandboxSession = {
  sandboxId: string
  template: string
  createdAt: number
}

const sessionsByRunId = new Map<string, E2BSandboxSession>()

/** Get the active sandbox session for a run, if any. */
export function getE2BSandboxSession(runId: string): E2BSandboxSession | undefined {
  return sessionsByRunId.get(runId)
}

/** Set (or replace) the active sandbox session for a run. */
export function setE2BSandboxSession(runId: string, session: E2BSandboxSession): void {
  sessionsByRunId.set(runId, session)
}

/** Clear the active sandbox session for a run (after kill, or at run end). */
export function clearE2BSandboxSession(runId: string): void {
  sessionsByRunId.delete(runId)
}

/** Budget for the run-end kill call: short, so run end never hangs on a dead panel. */
export const E2B_KILL_TIMEOUT_MS = 10_000

/** HTTP budget for a lazy-create probe: a dead panel must not stall the first command. */
export const E2B_LAZY_CREATE_TIMEOUT_MS = 5_000

export type E2BSandboxKillResult =
  | { killed: true; sandboxId: string }
  | { killed: false; sandboxId?: string; error?: string }

/**
 * Kill the run's sandbox through the panel and clear the session.
 * Idempotent: a second call — or a call with no session — is a no-op
 * that never touches the panel. Never throws: a failed kill is reported
 * in the result and logged, never raised — run end must not fail because
 * the sandbox could not be killed (the panel/E2B timeout reaps the
 * sandbox anyway). The session is cleared BEFORE the panel call, so a
 * concurrent second call cannot double-kill. Uses a fresh timeout
 * signal, never the run's signal: the run may be ending because it was
 * aborted, and an aborted signal would cancel the kill itself.
 */
export async function killE2BSandboxSession(
  runId: string,
  opts: {
    apiKey?: string
    clientEnv?: ClientEnv
    fetch: typeof globalThis.fetch
    logger: Logger
  },
): Promise<E2BSandboxKillResult> {
  const session = getE2BSandboxSession(runId)
  if (!session) return { killed: false }
  // Clear first: this call owns the kill, and any concurrent second call
  // sees no session and becomes a no-op.
  clearE2BSandboxSession(runId)
  try {
    await killE2BSandbox({
      sandboxId: session.sandboxId,
      fetch: opts.fetch,
      // Fresh signal: the run's own signal may already be aborted (that
      // is often WHY the run is ending), which would cancel the kill.
      signal: AbortSignal.timeout(E2B_KILL_TIMEOUT_MS),
      logger: opts.logger,
      apiKey: opts.apiKey,
      clientEnv: opts.clientEnv,
    })
    return { killed: true, sandboxId: session.sandboxId }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    opts.logger.warn(
      { runId, sandboxId: session.sandboxId, error: message },
      'E2B sandbox auto-kill failed (session cleared; the sandbox will time out on the panel side)',
    )
    return { killed: false, sandboxId: session.sandboxId, error: message }
  }
}

/**
 * Return the run's sandbox session, creating a fresh sandbox through the
 * panel when none is active (lazy create). One creation path shared by
 * the terminal-command routing, the screenshot tool, and the manual
 * start — so a run that needs a sandbox after its previous one died
 * (auto-kill at run end, or a manual stop) just gets a new one, with no
 * manual start step. Throws on real panel failures; throws the fallback
 * error (see isE2BFallbackError) when the panel cannot serve the call,
 * so the caller can fall back to local execution and say so.
 */
export async function ensureE2BSandboxSession(
  runId: string,
  opts: {
    template?: string
    apiKey?: string
    clientEnv?: ClientEnv
    fetch: typeof globalThis.fetch
    signal: AbortSignal
    logger: Logger
  },
): Promise<E2BSandboxSession> {
  const existing = getE2BSandboxSession(runId)
  if (existing) return existing
  const info = await createE2BSandbox({
    template: opts.template ?? 'base',
    // Short probe budget: a dead panel must not stall the first command
    // of a run (a manual start keeps the full 30s budget).
    fetchTimeoutMs: E2B_LAZY_CREATE_TIMEOUT_MS,
    fetch: opts.fetch,
    signal: opts.signal,
    logger: opts.logger,
    apiKey: opts.apiKey,
    clientEnv: opts.clientEnv,
  })
  const session: E2BSandboxSession = {
    sandboxId: info.sandboxId,
    template: opts.template ?? 'base',
    createdAt: Date.now(),
  }
  setE2BSandboxSession(runId, session)
  return session
}
