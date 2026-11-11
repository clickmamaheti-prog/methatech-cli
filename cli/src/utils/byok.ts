import {
  ByokCredentialError,
  METHATECH_BYOK_BASE_URL,
  createBunByokConnectionStore,
  withByokReasoningEffort,
  withEffectiveByokLimits,
} from '@methatech/sdk'
import { create } from 'zustand'

import { loadSettings, saveSettings } from './settings'

import type {
  ByokConnection,
  ByokConnectionStore,
  ResolvedByokConnection,
} from '@methatech/sdk'

type SelectedByokConnection =
  Pick<ByokConnection, 'id' | 'revision'> &
  Partial<Pick<ByokConnection, 'provider' | 'model'>>

let store: ByokConnectionStore | undefined

type ByokSelectionStore = {
  selected: SelectedByokConnection | undefined
  /**
   * The user asked, from a Freebuff wall, to set up BYOK. `/byok` is a chat
   * command, and a user whose Freebucks are spent never reaches the chat: the
   * landing screen's refusal has no input. This opens the chat WITHOUT a
   * Freebuff session so the command can run; nothing but slash commands can
   * be sent until a connection is selected.
   */
  setupOpen: boolean
  setSelected: (connection: SelectedByokConnection | undefined) => void
  setSetupOpen: (open: boolean) => void
}

/** React-visible selection, initialized once from the non-secret settings file. */
export const useByokSelectionStore = create<ByokSelectionStore>((set) => ({
  selected: loadSettings().byokConnection,
  setupOpen: false,
  setSelected: (selected) => set({ selected }),
  setSetupOpen: (setupOpen) => set({ setupOpen }),
}))

export function openByokSetup(): void {
  useByokSelectionStore.getState().setSetupOpen(true)
}

export function closeByokSetup(): void {
  useByokSelectionStore.getState().setSetupOpen(false)
}

export function isByokSetupOpen(): boolean {
  return useByokSelectionStore.getState().setupOpen
}

/**
 * CLI keys are deliberately environment references. A command may name an
 * environment variable, but it can never receive, echo, or persist its value.
 * The shared store keeps Desktop and CLI connection metadata together, while
 * the CLI's explicit `env:NAME` reference remains portable in SSH and
 * headless shells.
 */
export function getCliByokStore(): ByokConnectionStore {
  if (!store) {
    store = createBunByokConnectionStore()
  }
  return store
}

export function selectedByokConnection(): SelectedByokConnection | undefined {
  return useByokSelectionStore.getState().selected
}

export function hasSelectedByokConnection(): boolean {
  return selectedByokConnection() !== undefined
}

export function saveSelectedByokConnection(
  connection: ByokConnection | undefined,
): void {
  saveSettings(
    connection
      ? {
          byokConnection: {
            id: connection.id,
            revision: connection.revision,
            provider: connection.provider,
            model: connection.model,
          },
        }
      : { byokConnection: undefined },
  )
  // Selecting ends setup; turning BYOK off (or removing the selected
  // connection) returns the user to the Freebuff landing screen.
  closeByokSetup()
  useByokSelectionStore.getState().setSelected(
    connection
      ? {
          id: connection.id,
          revision: connection.revision,
          provider: connection.provider,
          model: connection.model,
        }
      : undefined,
  )
}

/** Resolve only at run start so the secret never reaches chat state or logs.
 *  Untouched default limits become the provider-reported window (see
 *  withEffectiveByokLimits), so a run does not compact every few tool calls.
 *  The `/byok effort` pick rides along; none sends no reasoning field. */
export async function resolveByokConnection(
  selected: SelectedByokConnection,
): Promise<ResolvedByokConnection> {
  return withByokReasoningEffort(
    await withEffectiveByokLimits(await getCliByokStore().resolve(selected)),
    loadSettings().byokReasoningEffort,
  )
}

/**
 * What a run start shows when the selected connection cannot be loaded. A
 * credential failure says exactly what is wrong (e.g. which environment
 * variable is unset in this process); its text is the store's own and never
 * carries a key. Anything else keeps the generic line.
 */
export function byokLoadFailureMessage(error: unknown): string {
  return error instanceof ByokCredentialError ||
    (error instanceof Error && error.name === 'ByokCredentialError')
    ? `⚠️ Unable to load the selected BYOK connection: ${error.message}`
    : '⚠️ Unable to load the selected BYOK connection. Check its credential and select it again.'
}

export function describeByokConnection(connection: Pick<ByokConnection, 'name' | 'provider' | 'model'>): string {
  const provider = connection.provider === 'openrouter'
    ? 'OpenRouter'
    : connection.provider === 'chatgpt'
      ? 'ChatGPT plan'
      : 'OpenAI-compatible'
  return `${connection.name} (${provider} · ${connection.model})`
}

export function isByokEnvironmentVariableName(value: string): boolean {
  return /^[A-Z_][A-Z0-9_]*$/.test(value)
}

/**
 * FORK (MethaTech): the stored BYOK connection for panel models — now the
 * FALLBACK/ALTERNATIVE, not the main path. The main path is the panel
 * session (Freebuff flow): a logged-in user runs panel models with the
 * login token, no BYOK connection involved (cli/src/hooks/use-send-message.ts
 * only calls this when there is no login credential). A single connection
 * named `methatech`, fixed to the panel's OpenAI-compatible API
 * (METHATECH_BYOK_BASE_URL) with the panel key read from the
 * METHATECH_API_KEY environment variable at send time — never stored,
 * never echoed. Existing users who already have this connection keep it
 * working as the alternative: when logged in, the session path takes
 * precedence; when logged out, this connection runs (same account's key
 * if the env key belongs to that account).
 *
 * Get-or-create for a panel model id: an existing `methatech` connection
 * keeps its own credential reference (a user who pointed it at their own
 * env var keeps it) and only has its model updated; a missing one is
 * created. The returned selection is ALSO saved as the selected
 * connection, so the send path, the status bar and `/byok list` all agree
 * on what is running. Callers that already hold a selection for another
 * provider must not call this — it deliberately switches to MethaTech.
 */
export const METHATECH_BYOK_CONNECTION_NAME = 'methatech'
export const METHATECH_BYOK_CREDENTIAL_VARIABLE = 'METHATECH_API_KEY'

export async function ensureMethatechByokConnection(
  model: string,
): Promise<SelectedByokConnection> {
  const byokStore = getCliByokStore()
  const existing = (await byokStore.list()).find(
    (connection) => connection.name === METHATECH_BYOK_CONNECTION_NAME,
  )
  const connection =
    existing && existing.model === model
      ? existing
      : existing
        ? await byokStore.update({
            id: existing.id,
            revision: existing.revision,
            patch: { model },
          })
        : await byokStore.create({
            name: METHATECH_BYOK_CONNECTION_NAME,
            provider: 'openai-compatible',
            model,
            baseUrl: METHATECH_BYOK_BASE_URL,
            credentialRef: `env:${METHATECH_BYOK_CREDENTIAL_VARIABLE}`,
          })
  const selection: SelectedByokConnection = {
    id: connection.id,
    revision: connection.revision,
    provider: connection.provider,
    model: connection.model,
  }
  saveSelectedByokConnection(connection)
  return selection
}

export function resetCliByokStoreForTests(): void {
  store = undefined
}

export function setCliByokStoreForTests(value: ByokConnectionStore | undefined): void {
  store = value
}
