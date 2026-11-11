// FORK (MethaTech): the fork's default catalog is the panel catalog, not
// the Freebuff one. These pin the snapshot taken from the live
// GET https://console.methatech.eu.org/api/available_model on 2026-11-12
// (~03:46 UTC, 34 active models: 27 + the 7 CodeBuddy cbai/ rows).
// Re-sync by re-fetching that endpoint;
// do not edit prices or ids from memory.
import { describe, expect, test } from 'bun:test'

import {
  getMethatechModel,
  isMethatechFreeModelId,
  isMethatechModelId,
  isMethatechPremiumModelId,
  METHATECH_DEFAULT_CONTEXT_WINDOW,
  METHATECH_DEFAULT_MODEL_ID,
  METHATECH_FALLBACK_MODEL_ID,
  METHATECH_FREE_MODEL_IDS,
  METHATECH_MODEL_CONTEXT_WINDOWS,
  METHATECH_MODEL_PRICES,
  METHATECH_MODELS,
  methatechModelContextWindow,
  resolveMethatechModel,
} from '../methatech-models'

describe('MethaTech panel catalog', () => {
  test('holds all 34 live panel models, ids unique', () => {
    expect(METHATECH_MODELS).toHaveLength(34)
    const ids = METHATECH_MODELS.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('leads with the 9 live free models, in panel order', () => {
    expect(METHATECH_FREE_MODEL_IDS).toEqual([
      'deepseek-v4-flash',
      'glm-5.3-flash',
      'gpt-6-luna',
      'gemini-3.8-flash',
      'gpt-6-astra',
      'gemini-3.1-pro',
      'qwen3.8-flash',
      'qwen3.7-max',
      'deepseek-v4.1-flash',
    ])
    expect(METHATECH_MODELS.slice(0, 9).map((m) => m.id)).toEqual(
      METHATECH_FREE_MODEL_IDS,
    )
    for (const id of METHATECH_FREE_MODEL_IDS) {
      expect(isMethatechFreeModelId(id)).toBe(true)
      expect(isMethatechPremiumModelId(id)).toBe(false)
    }
  })

  test('excludes the retired free model kimi-k2.7-code', () => {
    // In the panel free allowlist but NOT in the live /api/available_model
    // list any more (provider retired it). A row for it would offer a
    // model the panel cannot serve.
    expect(isMethatechModelId('kimi-k2.7-code')).toBe(false)
    expect(METHATECH_MODELS.some((m) => m.id === 'kimi-k2.7-code')).toBe(
      false,
    )
  })

  test('defaults and falls back to deepseek-v4-flash', () => {
    expect(METHATECH_DEFAULT_MODEL_ID).toBe('deepseek-v4-flash')
    expect(METHATECH_FALLBACK_MODEL_ID).toBe('deepseek-v4-flash')
    expect(isMethatechModelId(METHATECH_DEFAULT_MODEL_ID)).toBe(true)
    expect(isMethatechFreeModelId(METHATECH_DEFAULT_MODEL_ID)).toBe(true)
  })

  test('every row has a panel list price (display $ = ratio x 2)', () => {
    for (const model of METHATECH_MODELS) {
      const price = METHATECH_MODEL_PRICES[model.id]
      expect(price).toBeDefined()
      expect(price.input).toBeGreaterThan(0)
      expect(price.output).toBeGreaterThan(0)
    }
    // Spot-checks against the live snapshot (ratios halved here already):
    // deepseek-v4-flash 0.25/1, glm-5.3-flash 0.125/0.425,
    // claude-sonnet-4-6 2.5/12.5, methatech/uncensored 0.1/0.3.
    expect(METHATECH_MODEL_PRICES['deepseek-v4-flash']).toEqual({
      input: 0.5,
      output: 2,
    })
    expect(METHATECH_MODEL_PRICES['glm-5.3-flash']).toEqual({
      input: 0.25,
      output: 0.85,
    })
    expect(METHATECH_MODEL_PRICES['claude-sonnet-4-6']).toEqual({
      input: 5,
      output: 25,
    })
    expect(METHATECH_MODEL_PRICES['methatech/uncensored']).toEqual({
      input: 0.2,
      output: 0.6,
    })
  })

  test('taglines name the price for paid rows and Free for free rows', () => {
    for (const model of METHATECH_MODELS) {
      if (model.premium) {
        expect(model.tagline).toContain('$')
        expect(model.tagline).toContain('per 1M')
      } else {
        expect(model.tagline).toContain('Free')
      }
    }
  })

  test('every row is always available, service data-use, not multimodal', () => {
    for (const model of METHATECH_MODELS) {
      expect(model.availability).toBe('always')
      expect(model.dataUse).toBe('service')
      expect(model.multimodal).toBe(false)
    }
  })

  test('paid rows are the 25 non-free live models', () => {
    const paid = METHATECH_MODELS.filter((m) => m.premium)
    expect(paid).toHaveLength(25)
    for (const model of paid) {
      expect(isMethatechPremiumModelId(model.id)).toBe(true)
      expect(isMethatechFreeModelId(model.id)).toBe(false)
    }
  })

  test('context windows: mapped rows beat the default, unmapped fall back', () => {
    expect(METHATECH_MODEL_CONTEXT_WINDOWS['deepseek-v4-flash']).toBe(
      1_048_576,
    )
    expect(METHATECH_MODEL_CONTEXT_WINDOWS['glm-5.3-flash']).toBe(1_000_000)
    for (const [id, window] of Object.entries(
      METHATECH_MODEL_CONTEXT_WINDOWS,
    )) {
      expect(isMethatechModelId(id)).toBe(true)
      expect(window).toBeGreaterThan(METHATECH_DEFAULT_CONTEXT_WINDOW)
      expect(methatechModelContextWindow(id)).toBe(window)
    }
    // No verified window: the safe default, never a guess.
    expect(methatechModelContextWindow('claude-sonnet-4-6')).toBe(
      METHATECH_DEFAULT_CONTEXT_WINDOW,
    )
    expect(methatechModelContextWindow('methatech/uncensored')).toBe(
      METHATECH_DEFAULT_CONTEXT_WINDOW,
    )
    expect(methatechModelContextWindow(undefined)).toBe(
      METHATECH_DEFAULT_CONTEXT_WINDOW,
    )
  })

  test('resolveMethatechModel keeps known ids and coerces the rest', () => {
    expect(resolveMethatechModel('glm-5.3-flash')).toBe('glm-5.3-flash')
    expect(resolveMethatechModel('claude-opus-4-6-thinking')).toBe(
      'claude-opus-4-6-thinking',
    )
    // Old Freebuff wire ids are not panel ids.
    expect(resolveMethatechModel('deepseek/deepseek-v4-flash')).toBe(
      METHATECH_DEFAULT_MODEL_ID,
    )
    expect(resolveMethatechModel('no-such-model')).toBe(
      METHATECH_DEFAULT_MODEL_ID,
    )
    expect(resolveMethatechModel(undefined)).toBe(METHATECH_DEFAULT_MODEL_ID)
    expect(resolveMethatechModel(null)).toBe(METHATECH_DEFAULT_MODEL_ID)
  })

  test('getMethatechModel returns a best-effort row for unknown ids', () => {
    const known = getMethatechModel('gpt-6-luna')
    expect(known.displayName).toBe('GPT-6 Luna')
    const unknown = getMethatechModel('no-such-model')
    expect(unknown.id).toBe('no-such-model')
    expect(unknown.displayName).toBe('no-such-model')
  })
})
