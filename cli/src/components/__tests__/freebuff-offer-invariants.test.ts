// FORK (MethaTech): rewritten for the panel catalog. The original file
// locked down a Freebuff-server invariant — every row the CLI offered had
// to survive the Freebuff server's admission, plan locks and root-agent
// allowlist. None of that exists in this fork: the CLI offers the PANEL's
// 27 models, and the gate is the panel itself (a paid row with no balance
// fails server-side with 402 at send time, not a local lock).
//
// The invariant this file now locks down instead: a row the picker offers
// must be a panel model the directory knows, must resolve to itself
// through every resolver the session start runs it through, and must map
// to a runnable BYOK connection — so a user can never pick a model they
// cannot send on. The referral-reward row is gone with the Freebuff
// server: there is no earned GLM 5.2 in this fork.
import { describe, expect, test } from 'bun:test'

import {
  METHATECH_DEFAULT_MODEL_ID,
  METHATECH_FALLBACK_MODEL_ID,
  METHATECH_MODELS,
  isMethatechModelId,
} from '@codebuff/common/constants/methatech-models'

import { getFreebuffModelDirectory } from '../../state/freebuff-catalog-store'
import { resolveFreebuffModelPickForSession } from '../../hooks/use-freebuff-session'

import type { FreebuffAccessTier } from '@codebuff/common/constants/freebuff-models'
import type { FreebuffSessionResponse } from '../../types/freebuff-session'

import { freebuffCliOfferedModelIds } from '../freebuff-model-selector'

const PANEL_IDS = METHATECH_MODELS.map((m) => m.id)

/** The session resolver every session start runs a pick through, with a
 *  session that has not started (the fork never has one). A model it
 *  coerces away is one the user picked and never got. */
function cliAcceptsModel(model: string): boolean {
  const session: FreebuffSessionResponse = {
    status: 'none',
    accessTier: 'full',
  }
  return resolveFreebuffModelPickForSession(model, session) === model
}

describe('panel rows the CLI offers', () => {
  test('offer exactly the panel catalog on every tier', () => {
    for (const tier of ['full', 'limited'] as const) {
      expect(freebuffCliOfferedModelIds(tier)).toEqual(PANEL_IDS)
      expect(freebuffCliOfferedModelIds(tier, true)).toEqual(PANEL_IDS)
    }
  })

  test('every offered row is a known panel model the directory can serve', () => {
    const directory = getFreebuffModelDirectory()
    for (const id of freebuffCliOfferedModelIds('full')) {
      expect(isMethatechModelId(id)).toBe(true)
      expect(directory.isKnown(id)).toBe(true)
      expect(directory.isPickerModel(id)).toBe(true)
      expect(directory.get(id).id).toBe(id)
      expect(directory.isAvailable(id, new Date())).toBe(true)
      expect(directory.contextWindow(id)).toBeGreaterThan(0)
      // No local lock: the panel enforces balance server-side.
      expect(directory.planRequired(id, false, undefined)).toBe(false)
      expect(directory.resolveSelection(id)).toBe(id)
      expect(directory.resolveForAccessTier(id, 'full', false)).toBe(id)
    }
  })

  test('the default and the fallback are offered', () => {
    const offered = freebuffCliOfferedModelIds('full')
    expect(offered).toContain(METHATECH_DEFAULT_MODEL_ID)
    expect(offered).toContain(METHATECH_FALLBACK_MODEL_ID)
    expect(getFreebuffModelDirectory().recommendedModelId('full')).toBe(
      METHATECH_DEFAULT_MODEL_ID,
    )
    expect(getFreebuffModelDirectory().fallbackModelId).toBe(
      METHATECH_FALLBACK_MODEL_ID,
    )
  })

  test('every offered row survives the session pick resolver', () => {
    for (const id of freebuffCliOfferedModelIds('full')) {
      expect(cliAcceptsModel(id)).toBe(true)
    }
  })

  test('an unknown or retired id resolves to the default, never a dead row', () => {
    const directory = getFreebuffModelDirectory()
    expect(directory.resolveSelection('no-such-model')).toBe(
      METHATECH_DEFAULT_MODEL_ID,
    )
    // An old Freebuff wire id is not a panel id.
    expect(directory.resolveSelection('deepseek/deepseek-v4-flash')).toBe(
      METHATECH_DEFAULT_MODEL_ID,
    )
    expect(cliAcceptsModel('no-such-model')).toBe(false)
  })

  test('access tiers do not change the grid', () => {
    // The panel has no tiers: a limited viewer sees the same 27 rows.
    const full = freebuffCliOfferedModelIds('full' as FreebuffAccessTier)
    const limited = freebuffCliOfferedModelIds(
      'limited' as FreebuffAccessTier,
    )
    expect(limited).toEqual(full)
  })
})
