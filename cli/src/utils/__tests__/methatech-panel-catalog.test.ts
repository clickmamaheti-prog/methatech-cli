import { freebuffLegacyModelDigest } from '@methatech/common/types/freebuff-model-catalog'
import { describe, expect, test } from 'bun:test'

import {
  methatechPanelModelDisplayName,
  methatechPanelModelTagline,
  parseMethatechPanelCatalog,
} from '../methatech-panel-catalog'

/** A small /api/available_model answer, shaped like the panel's. */
const PANEL_BODY = {
  success: true,
  message: '',
  data: {
    'deepseek-v4-flash': {
      groups: ['default'],
      owned_by: 'Deepseek',
      price: {
        model: 'deepseek-v4-flash',
        type: 'tokens',
        channel_type: 28,
        input: 0.25,
        output: 1,
        locked: false,
      },
    },
    'glm-5.3-flash': {
      groups: ['default'],
      owned_by: 'Zhipu',
      price: {
        model: 'glm-5.3-flash',
        type: 'tokens',
        channel_type: 16,
        input: 0.15,
        output: 0.6,
        locked: false,
      },
    },
    'claude-sonnet-5': {
      groups: ['default'],
      owned_by: 'Anthropic',
      price: {
        model: 'claude-sonnet-5',
        type: 'tokens',
        channel_type: 14,
        input: 1.5,
        output: 7.5,
        locked: false,
      },
    },
    'meituan/longcat-2.5:free': {
      groups: ['default'],
      owned_by: 'AriaSeta',
      price: {
        model: 'meituan/longcat-2.5:free',
        type: 'tokens',
        channel_type: 57,
        input: 0,
        output: 0,
        locked: false,
      },
    },
    'deepseek-v4.1-flash:fast': {
      groups: ['default'],
      owned_by: 'Deepseek',
      price: {
        model: 'deepseek-v4.1-flash:fast',
        type: 'tokens',
        channel_type: 28,
        input: 0.3,
        output: 1.2,
        locked: false,
      },
    },
    'old-locked-model': {
      groups: ['default'],
      owned_by: 'Deepseek',
      price: {
        model: 'old-locked-model',
        type: 'tokens',
        channel_type: 28,
        input: 1,
        output: 2,
        locked: true,
      },
    },
  },
}

describe('parseMethatechPanelCatalog', () => {
  test('converts the panel answer into a catalog', () => {
    const now = 1_700_000_000_000
    const catalog = parseMethatechPanelCatalog(PANEL_BODY, now)
    expect(catalog).not.toBeNull()
    if (!catalog) return
    expect(catalog.protocol).toBe(1)
    expect(catalog.issuedAt).toBe(now)
    expect(catalog.refreshAt).toBe(now + 10 * 60 * 1000)
    expect(catalog.recommendedKey).toBe('deepseek-v4-flash')
    expect(catalog.fallbackKey).toBe('deepseek-v4-flash')
    // The locked row is dropped; the other five are listed.
    expect(catalog.rows.map((row) => row.key)).toEqual([
      'deepseek-v4-flash',
      'glm-5.3-flash',
      'meituan/longcat-2.5:free',
      'deepseek-v4.1-flash:fast',
      'claude-sonnet-5',
    ])
    // sortOrder is the picker order.
    catalog.rows.forEach((row, index) => {
      expect(row.sortOrder).toBe(index)
    })
    // A row's key and handle are both the plain panel id: the panel relay
    // resolves that id, so nothing is minted or opaque.
    for (const row of catalog.rows) {
      expect(row.handle).toBe(row.key)
      expect(row.access).toBe('open')
      expect(row.dataUse).toBe('service')
      expect(row.multimodal).toBe(false)
      expect(row.badges).toEqual([])
      expect(row.legacyDigests).toEqual([
        freebuffLegacyModelDigest(row.key),
      ])
    }
  })

  test('free rows are the panel free list and the zero-price rows', () => {
    const catalog = parseMethatechPanelCatalog(PANEL_BODY)
    expect(catalog).not.toBeNull()
    if (!catalog) return
    const byKey = new Map(catalog.rows.map((row) => [row.key, row]))
    // The 9 compiled free models stay free even though they carry a price.
    expect(byKey.get('deepseek-v4-flash')!.premium).toBe(false)
    expect(byKey.get('glm-5.3-flash')!.premium).toBe(false)
    // A zero-price row is free.
    expect(byKey.get('meituan/longcat-2.5:free')!.premium).toBe(false)
    // Priced rows are premium.
    expect(byKey.get('claude-sonnet-5')!.premium).toBe(true)
    expect(byKey.get('deepseek-v4.1-flash:fast')!.premium).toBe(true)
  })

  test('taglines are Free or the dollar price per 1M', () => {
    const catalog = parseMethatechPanelCatalog(PANEL_BODY)
    expect(catalog).not.toBeNull()
    if (!catalog) return
    const byKey = new Map(catalog.rows.map((row) => [row.key, row]))
    expect(byKey.get('deepseek-v4-flash')!.tagline).toBe('Free')
    expect(byKey.get('meituan/longcat-2.5:free')!.tagline).toBe('Free')
    // Ratio x 2 is the panel's dollar rule ($1 = 500,000 quota).
    expect(byKey.get('claude-sonnet-5')!.tagline).toBe('$3.00/$15.00 per 1M')
    expect(byKey.get('deepseek-v4.1-flash:fast')!.tagline).toBe(
      '$0.60/$2.40 per 1M',
    )
  })

  test('a body that is not a panel answer is null', () => {
    expect(parseMethatechPanelCatalog(null)).toBeNull()
    expect(parseMethatechPanelCatalog('nope')).toBeNull()
    expect(parseMethatechPanelCatalog({ protocol: 2, rows: 'nope' })).toBeNull()
    expect(parseMethatechPanelCatalog({ data: {} })).toBeNull()
    expect(parseMethatechPanelCatalog({})).toBeNull()
  })

  test('a bare map (no data envelope) is accepted', () => {
    const catalog = parseMethatechPanelCatalog({
      'deepseek-v4-flash': PANEL_BODY.data['deepseek-v4-flash'],
    })
    expect(catalog).not.toBeNull()
    expect(catalog!.rows.map((row) => row.key)).toEqual([
      'deepseek-v4-flash',
    ])
  })

  test('the version only moves when the model list does', () => {
    const first = parseMethatechPanelCatalog(PANEL_BODY, 1000)
    const same = parseMethatechPanelCatalog(PANEL_BODY, 2000)
    expect(first!.version).toBe(same!.version)
    const changed = parseMethatechPanelCatalog(
      {
        data: {
          ...PANEL_BODY.data,
          'claude-sonnet-5': {
            ...PANEL_BODY.data['claude-sonnet-5'],
            price: {
              ...PANEL_BODY.data['claude-sonnet-5'].price,
              input: 2,
            },
          },
        },
      },
      3000,
    )
    expect(changed!.version).not.toBe(first!.version)
  })
})

describe('methatechPanelModelDisplayName', () => {
  test('a compiled id keeps its compiled name', () => {
    expect(methatechPanelModelDisplayName('deepseek-v4-flash')).toBe(
      'DeepSeek V4 Flash',
    )
    expect(methatechPanelModelDisplayName('cbai/glm-5.2')).toBe(
      'GLM 5.2 (CodeBuddy)',
    )
  })

  test('a new id is prettified from the id', () => {
    expect(methatechPanelModelDisplayName('claude-sonnet-5')).toBe(
      'Claude Sonnet 5',
    )
    expect(methatechPanelModelDisplayName('gpt-5.4-mini')).toBe('GPT 5.4 Mini')
    expect(methatechPanelModelDisplayName('qwen3.8-max')).toBe('Qwen 3.8 Max')
    expect(methatechPanelModelDisplayName('MiniMax-M3.1-Flash')).toBe(
      'MiniMax M3.1 Flash',
    )
    expect(methatechPanelModelDisplayName('seed-2-0-code')).toBe(
      'Seed 2.0 Code',
    )
    expect(methatechPanelModelDisplayName('mimo-v2.6-pro-ultraspeed')).toBe(
      'MiMo V2.6 Pro Ultraspeed',
    )
    expect(methatechPanelModelDisplayName('hy3')).toBe('HY3')
  })

  test('a variant suffix becomes a parenthetical, never a shared name', () => {
    expect(methatechPanelModelDisplayName('deepseek-v4.1-flash:fast')).toBe(
      'DeepSeek V4.1 Flash (Fast)',
    )
    expect(methatechPanelModelDisplayName('meituan/longcat-2.5:free')).toBe(
      'Longcat 2.5 (Free)',
    )
  })

  test('a prefixed id names its owner', () => {
    expect(
      methatechPanelModelDisplayName(
        'gemini/gemini-3.5-flash',
        'Google Gemini',
      ),
    ).toBe('Gemini 3.5 Flash (Google Gemini)')
  })
})

describe('methatechPanelModelTagline', () => {
  test('free is Free, paid is the dollar price', () => {
    expect(methatechPanelModelTagline(0.25, 1, true)).toBe('Free')
    expect(methatechPanelModelTagline(0, 0, false)).toBe('$0.00/$0.00 per 1M')
    expect(methatechPanelModelTagline(1.5, 7.5, false)).toBe(
      '$3.00/$15.00 per 1M',
    )
  })
})
