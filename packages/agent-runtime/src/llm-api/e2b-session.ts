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
