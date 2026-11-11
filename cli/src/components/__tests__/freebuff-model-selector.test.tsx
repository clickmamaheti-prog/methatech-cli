// FORK (MethaTech): rewritten for the panel catalog.
//
// The original 1986-line file pinned Freebuff-picker behavior that does not
// exist in this fork and is therefore NOT ported — each group removed for a
// stated reason, not silently:
// - Peak/off-peak windows, legacy priceNotices/peak copy, price multipliers,
//   solo-session discounts, Freebucks meter sections and pool counts:
//   the Freebucks wallet/meter has no counterpart in the fork (the panel
//   bills balance server-side).
// - Tier layout (limited grid, plan locks, MiMo/Solar/Fable/Luna rows,
//   NEW pills, reasoning-effort badges, multimodal Images badges):
//   Freebuff rows, tiers and plans. The panel has no tiers or plans, and
//   every panel row is pressable.
// - Limited-model offers, referral banner reward rows, limited upgrade
//   CTAs, plan lines: server-driven Freebuff offers. The panel sends none.
// - "Multi-day sleep" clock tests: DeepSeek peak windows. Panel rows are
//   always available.
//
// What this file locks down instead: the picker renders the panel catalog,
// focuses the saved pick, and picking a row switches the MethaTech BYOK
// connection (never a Freebuff session, never a plans page).
import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { createTestRenderer } from '@opentui/core/testing'
import { createRoot, flushSync } from '@opentui/react'
import React from 'react'

import { FreebuffModelSelector } from '../freebuff-model-selector'
import {
  METHATECH_DEFAULT_MODEL_ID,
  METHATECH_MODELS,
} from '@codebuff/common/constants/methatech-models'

import { initializeThemeStore } from '../../hooks/use-theme'
import {
  getSelectedFreebuffModel,
  useFreebuffModelStore,
} from '../../state/freebuff-model-store'
import { useFreebuffSessionStore } from '../../state/freebuff-session-store'
import {
  loadFreebuffModelPreference,
  saveFreebuffModelPreference,
} from '../../utils/settings'
import {
  ensureMethatechByokConnection,
  resetCliByokStoreForTests,
  setCliByokStoreForTests,
  useByokSelectionStore,
} from '../../utils/byok'

import type { ByokConnection, ByokConnectionStore } from '@codebuff/sdk'

let cleanupRenderer: (() => void) | undefined

const FIXED_NOW_MS = Date.UTC(2026, 7, 20, 19, 0, 0)

beforeAll(() => {
  initializeThemeStore()
})

afterEach(() => {
  cleanupRenderer?.()
  cleanupRenderer = undefined
  useFreebuffSessionStore.getState().setSession(null)
  useFreebuffSessionStore.getState().setFailure(null)
  useFreebuffModelStore.getState().setSelectedModel(METHATECH_DEFAULT_MODEL_ID)
  saveFreebuffModelPreference(METHATECH_DEFAULT_MODEL_ID)
  resetCliByokStoreForTests()
  useByokSelectionStore.setState({ selected: undefined, setupOpen: false })
})

const renderSelector = async (
  maxHeight = 40,
  startSession?: (model: string) => Promise<void>,
  width = 100,
  nowMs = FIXED_NOW_MS,
  onSelectModel?: (model: string) => void,
  initialView: 'model' | 'reasoning' = 'model',
) => {
  cleanupRenderer?.()
  cleanupRenderer = undefined
  const setup = await createTestRenderer({ width, height: Math.max(40, maxHeight), kittyKeyboard: true })
  const root = createRoot(setup.renderer)
  cleanupRenderer = () => {
    flushSync(() => root.unmount())
    setup.renderer.destroy()
  }
  flushSync(() =>
    root.render(
      <FreebuffModelSelector
        maxHeight={maxHeight}
        nowMs={nowMs}
        startSession={startSession}
        onSelectModel={onSelectModel}
        initialView={initialView}
      />,
    ),
  )
  await setup.renderOnce()
  return setup
}

function createFakeStore(): {
  store: ByokConnectionStore
  connections: ByokConnection[]
  calls: { create: number; update: number }
} {
  const connections: ByokConnection[] = []
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

async function tick(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

describe('MethaTech picker', () => {
  test('hero shows the panel default and offers all 27 models', async () => {
    useFreebuffSessionStore.getState().setSession({
      status: 'none',
      accessTier: 'full',
    })
    useFreebuffModelStore.getState().setSelectedModel(METHATECH_DEFAULT_MODEL_ID)
    const setup = await renderSelector(40)
    const frame = setup.captureCharFrame()
    expect(frame).toContain('DeepSeek V4 Flash')
    expect(frame).toContain('Smart & fast · Free')
    expect(frame).toContain('See all 27 models')
  })

  test('expanded list shows every panel row, free first', async () => {
    useFreebuffSessionStore.getState().setSession({
      status: 'none',
      accessTier: 'full',
    })
    // A non-hero pick opens the picker expanded. Height 100 fits all 27
    // three-line cards plus the two section labels in one frame.
    useFreebuffModelStore.getState().setSelectedModel('gpt-6-luna')
    const setup = await renderSelector(100)
    const frame = setup.captureCharFrame()
    for (const model of METHATECH_MODELS) {
      expect(frame).toContain(model.displayName)
    }
    // Free rows lead; the dearest paid row is last.
    const lines = frame.split('\n')
    const indexOf = (name: string) =>
      lines.findIndex((line) => line.includes(name))
    expect(indexOf('DeepSeek V4 Flash')).toBeLessThan(
      indexOf('Claude Opus 4.6 Thinking'),
    )
    expect(indexOf('MethaTech Uncensored')).toBeGreaterThan(-1)
  })

  test('focuses the saved pick, not the hero', async () => {
    useFreebuffSessionStore.getState().setSession({
      status: 'none',
      accessTier: 'full',
    })
    useFreebuffModelStore.getState().setSelectedModel('glm-5.3-flash')
    const setup = await renderSelector(40)
    await tick()
    await setup.renderOnce()
    const frame = setup.captureCharFrame()
    expect(frame).toContain('› GLM 5.3 Flash')
  })

  test('Enter on the hero picks through BYOK, never a Freebuff session', async () => {
    const { store, connections, calls } = createFakeStore()
    setCliByokStoreForTests(store)
    useFreebuffSessionStore.getState().setSession({
      status: 'none',
      accessTier: 'full',
    })
    useFreebuffModelStore.getState().setSelectedModel(METHATECH_DEFAULT_MODEL_ID)
    const requested: string[] = []
    const setup = await renderSelector(40, async (model) => {
      requested.push(model)
    })
    flushSync(() => setup.mockInput.pressEnter())
    await tick()
    await setup.renderOnce()

    expect(requested).toEqual([])
    expect(calls.create).toBe(1)
    expect(connections).toHaveLength(1)
    expect(connections[0].name).toBe('methatech')
    expect(connections[0].model).toBe('deepseek-v4-flash')
    expect(getSelectedFreebuffModel()).toBe('deepseek-v4-flash')
    expect(loadFreebuffModelPreference()).toBe('deepseek-v4-flash')
    expect(useByokSelectionStore.getState().selected?.model).toBe(
      'deepseek-v4-flash',
    )
  })

  test('Enter on a paid row picks through BYOK too — no plan lock', async () => {
    const { store, connections, calls } = createFakeStore()
    setCliByokStoreForTests(store)
    useFreebuffSessionStore.getState().setSession({
      status: 'none',
      accessTier: 'full',
    })
    useFreebuffModelStore.getState().setSelectedModel('claude-sonnet-4-6')
    const requested: string[] = []
    const setup = await renderSelector(40, async (model) => {
      requested.push(model)
    })
    flushSync(() => setup.mockInput.pressEnter())
    await tick()
    await setup.renderOnce()

    expect(requested).toEqual([])
    expect(calls.create).toBe(1)
    expect(connections[0].model).toBe('claude-sonnet-4-6')
    expect(getSelectedFreebuffModel()).toBe('claude-sonnet-4-6')
    expect(loadFreebuffModelPreference()).toBe('claude-sonnet-4-6')
  })

  test('picking a second row updates the same connection model', async () => {
    const { store, connections, calls } = createFakeStore()
    setCliByokStoreForTests(store)
    // First pick through the helper directly (as the picker does).
    await ensureMethatechByokConnection('deepseek-v4-flash')
    expect(connections).toHaveLength(1)
    await ensureMethatechByokConnection('gpt-6-luna')
    expect(calls.create).toBe(1)
    expect(calls.update).toBe(1)
    expect(connections).toHaveLength(1)
    expect(connections[0].model).toBe('gpt-6-luna')
    expect(useByokSelectionStore.getState().selected?.model).toBe('gpt-6-luna')
  })

  test('paid rows show their panel price in the tagline', async () => {
    useFreebuffSessionStore.getState().setSession({
      status: 'none',
      accessTier: 'full',
    })
    useFreebuffModelStore.getState().setSelectedModel('claude-sonnet-4-6')
    const setup = await renderSelector(80)
    const frame = setup.captureCharFrame()
    expect(frame).toContain('Claude Sonnet 4.6')
    expect(frame).toContain('$5.00/$25.00 per 1M')
    expect(frame).toContain('MethaTech Uncensored')
  })
})
